import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import {
  REMINDER_QUEUE_NAME,
  ReminderWebhookJobPayload,
} from "./queue.constants";

// BullMQ ships with its own ioredis types and we re-pull ioredis directly for
// the worker; pnpm sometimes resolves them to two different versions. The
// public API is identical, so cast through `unknown` at the construction
// boundary to keep TypeScript happy.
type AnyConnection = ConstructorParameters<typeof Queue>[1] extends { connection: infer C }
  ? C
  : never;

/**
 * Dispatches reminder events to a downstream webhook. Behaviour:
 *
 * - REDIS_URL + QUEUE_ENABLED=true: enqueue a BullMQ job; a separate worker
 *   (see ReminderWebhookWorker) consumes it and posts to the webhook.
 * - Otherwise: synchronously fetch the family's webhook url and post inline
 *   with a best-effort fire-and-forget. Logs but never throws so producers
 *   (scheduler, services) aren't blocked by webhook outages.
 */
@Injectable()
export class NotificationDispatcher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationDispatcher.name);
  private queue: Queue | null = null;
  private fallbackWebhookUrl: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.fallbackWebhookUrl = this.config.get<string>("NOTIFICATION_WEBHOOK_URL") || undefined;
  }

  async onModuleInit(): Promise<void> {
    const redisUrl = this.config.get<string>("REDIS_URL");
    const enabled = this.config.get<string>("QUEUE_ENABLED") !== "false";

    if (!redisUrl || !enabled) {
      this.logger.log(
        redisUrl
          ? "QUEUE_ENABLED=false; reminder dispatch runs synchronously"
          : "REDIS_URL not set; reminder dispatch runs synchronously",
      );
      return;
    }

    try {
      const [{ Queue }, { default: IORedis }] = await Promise.all([
        import("bullmq"),
        import("ioredis"),
      ]);

      const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
      this.queue = new Queue(REMINDER_QUEUE_NAME, {
        connection: connection as unknown as AnyConnection,
      });
      this.logger.log(`Reminder webhook queue connected (${REMINDER_QUEUE_NAME})`);
    } catch (error) {
      this.logger.warn(
        `Could not initialize BullMQ queue (${(error as Error).message}); reminder dispatch will run synchronously`,
      );
      this.queue = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close().catch(() => undefined);
      this.queue = null;
    }
  }

  /**
   * Dispatch a batch of reminder ids for the given family. Returns the job id
   * when enqueued, or null when the call was handled synchronously.
   */
  async dispatchReminderUpdate(
    payload: ReminderWebhookJobPayload,
  ): Promise<string | null> {
    if (payload.reminderIds.length === 0) return null;

    if (this.queue) {
      const job = await this.queue.add("reminders.refreshed", payload, {
        attempts: 5,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 1000 },
      });
      return job.id ?? null;
    }

    await this.deliverSync(payload).catch((error) => {
      this.logger.warn(
        `Inline webhook delivery failed for family ${payload.familyId}: ${(error as Error).message}`,
      );
    });
    return null;
  }

  async deliverSync(payload: ReminderWebhookJobPayload): Promise<void> {
    const target = await this.resolveWebhookUrl(payload.familyId);
    if (!target) return;

    const reminders = await this.prisma.reminder.findMany({
      where: { id: { in: payload.reminderIds }, familyId: payload.familyId },
    });

    if (reminders.length === 0) return;

    const body = JSON.stringify({
      familyId: payload.familyId,
      reminders,
      dispatchedAt: new Date().toISOString(),
    });

    const response = await fetch(target, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });

    if (!response.ok) {
      throw new Error(`Webhook ${target} responded with ${response.status}`);
    }
  }

  async resolveWebhookUrl(familyId: string): Promise<string | undefined> {
    const settings = await this.prisma.notificationSettings.findUnique({
      where: { familyId },
      select: { webhookUrl: true },
    });
    return settings?.webhookUrl?.trim() || this.fallbackWebhookUrl;
  }

  /** Test seam — gives the inline path direct access without an env round-trip. */
  setFallbackWebhookUrl(url: string | undefined): void {
    this.fallbackWebhookUrl = url;
  }
}

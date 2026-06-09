import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Worker } from "bullmq";
import { NotificationDispatcher } from "./notification.dispatcher";
import {
  REMINDER_QUEUE_NAME,
  ReminderWebhookJobPayload,
} from "./queue.constants";

// See note in notification.dispatcher.ts: dual ioredis versions can resolve.
type AnyConnection = ConstructorParameters<typeof Worker>[2] extends { connection: infer C }
  ? C
  : never;

/**
 * Consumes reminder webhook jobs produced by the dispatcher. Runs in the same
 * Nest process for now; can be extracted to a dedicated worker entrypoint
 * (`node dist/main.js --worker`) when traffic grows.
 */
@Injectable()
export class ReminderWebhookWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReminderWebhookWorker.name);
  private worker: Worker | null = null;

  constructor(
    private readonly dispatcher: NotificationDispatcher,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const redisUrl = this.config.get<string>("REDIS_URL");
    const enabled = this.config.get<string>("QUEUE_ENABLED") !== "false";
    const inProcess = this.config.get<string>("WORKER_INPROCESS") !== "false";
    if (!redisUrl || !enabled || !inProcess) {
      this.logger.log(
        !inProcess
          ? "WORKER_INPROCESS=false; in-process worker disabled (run `node dist/worker.js` separately)"
          : "Reminder webhook worker disabled (no REDIS_URL or QUEUE_ENABLED=false)",
      );
      return;
    }

    try {
      const [{ Worker }, { default: IORedis }] = await Promise.all([
        import("bullmq"),
        import("ioredis"),
      ]);

      const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
      this.worker = new Worker<ReminderWebhookJobPayload>(
        REMINDER_QUEUE_NAME,
        async (job) => this.dispatcher.deliverSync(job.data),
        { connection: connection as unknown as AnyConnection, concurrency: 4 },
      );

      this.worker.on("failed", (job, error) => {
        this.logger.warn(
          `Job ${job?.id ?? "?"} failed: ${error.message} (attempts=${job?.attemptsMade ?? 0})`,
        );
      });
      this.worker.on("completed", (job) => {
        this.logger.log(`Delivered reminder webhook for family ${job.data.familyId}`);
      });

      this.logger.log(`Reminder webhook worker listening on ${REMINDER_QUEUE_NAME}`);
    } catch (error) {
      this.logger.warn(
        `Could not start BullMQ worker (${(error as Error).message}); webhooks will run inline`,
      );
      this.worker = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close().catch(() => undefined);
      this.worker = null;
    }
  }
}

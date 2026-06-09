import {
  Injectable,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { Product, ProductBatch, ReminderCategory, ReminderTone } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../common/cache.service";
import { NotificationDispatcher } from "../notifications/notification.dispatcher";

const SCAN_BATCH_SIZE = 200;

interface ReminderDraft {
  familyId: string;
  productId: string | null;
  category: ReminderCategory;
  tone: ReminderTone;
  title: string;
  description: string;
  badgeText: string;
  timeText: string;
  primaryActionText: string;
  secondaryActionText?: string;
  /**
   * Stable key derived from the source (product or batch). Lets us upsert
   * one reminder per problem instead of writing a new row on every scan.
   */
  externalKey: string;
}

/**
 * Periodically scans the inventory for products that need attention and
 * upserts one Reminder per (family, externalKey). Soft-deleted (dismissed)
 * reminders for a key are reactivated when the underlying issue persists,
 * so dismissing a reminder doesn't suppress the next scan's signal.
 */
@Injectable()
export class ReminderScheduler implements OnModuleInit {
  private readonly logger = new Logger(ReminderScheduler.name);
  private readonly enabled: boolean;
  private readonly stockThreshold: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly config: ConfigService,
    private readonly dispatcher: NotificationDispatcher,
  ) {
    this.enabled = this.config.get<string>("SCHEDULE_ENABLED") !== "false";
    const raw = Number.parseInt(this.config.get<string>("STOCK_LOW_THRESHOLD") ?? "3", 10);
    this.stockThreshold = Number.isFinite(raw) && raw > 0 ? raw : 3;
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      this.logger.log("SCHEDULE_ENABLED=false; reminder scan disabled");
    }
  }

  @Cron(process.env.REMINDER_SCAN_CRON ?? "0 */30 * * * *", { name: "reminder-scan" })
  async runScheduledScan(): Promise<void> {
    if (!this.enabled) return;
    await this.scanAllFamilies();
  }

  /**
   * Public entry-point used by tests and admin tooling.
   * Returns the number of reminders created or refreshed.
   */
  async scanAllFamilies(): Promise<number> {
    const families = await this.prisma.family.findMany({
      where: { archived: false },
      select: { id: true },
    });

    let total = 0;
    for (const family of families) {
      total += await this.scanFamily(family.id);
    }
    return total;
  }

  async scanFamily(familyId: string): Promise<number> {
    const drafts = await this.collectDrafts(familyId);
    if (drafts.length === 0) return 0;

    const upsertedIds = await this.applyDrafts(drafts);
    if (upsertedIds.length > 0) {
      await this.cache.invalidateFamilyAggregates(familyId);
      this.logger.log(`Refreshed ${upsertedIds.length} reminders for family ${familyId}`);
      await this.dispatcher
        .dispatchReminderUpdate({ familyId, reminderIds: upsertedIds })
        .catch((error) => {
          this.logger.warn(
            `Failed to dispatch reminder webhook for family ${familyId}: ${(error as Error).message}`,
          );
        });
    }
    return upsertedIds.length;
  }

  private async collectDrafts(familyId: string): Promise<ReminderDraft[]> {
    const drafts: ReminderDraft[] = [];
    const now = new Date();

    let cursor: string | undefined;
    do {
      const products: Product[] = await this.prisma.product.findMany({
        where: { familyId, archived: false },
        orderBy: { id: "asc" },
        take: SCAN_BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });

      for (const product of products) {
        const stockDraft = this.buildStockDraft(product);
        if (stockDraft) drafts.push(stockDraft);
      }

      cursor = products.length === SCAN_BATCH_SIZE ? products[products.length - 1].id : undefined;
    } while (cursor);

    const batches: ProductBatch[] = await this.prisma.productBatch.findMany({
      where: {
        product: { familyId, archived: false },
        expiryDate: { not: null },
      },
      include: { product: true } as never,
    });

    for (const batch of batches) {
      const expiryDraft = this.buildExpiryDraft(batch as ProductBatch & { product: Product }, now);
      if (expiryDraft) drafts.push(expiryDraft);
    }

    return drafts;
  }

  private buildStockDraft(product: Product): ReminderDraft | null {
    const quantity = Number(product.quantity);
    if (quantity > this.stockThreshold) return null;

    const tone: ReminderTone = quantity <= 0 ? "DANGER" : "WARNING";
    const remaining = `剩余 ${quantity} ${product.unit}`;

    return {
      familyId: product.familyId,
      productId: product.id,
      category: "STOCK",
      tone,
      title: product.name,
      description: `${product.brand ?? "未填写品牌"} · ${remaining}`,
      badgeText: quantity <= 0 ? "已耗尽" : "库存告急",
      timeText: this.formatTimeText(new Date()),
      primaryActionText: "加入补货",
      secondaryActionText: "稍后处理",
      externalKey: `stock:${product.id}`,
    };
  }

  private buildExpiryDraft(
    batch: ProductBatch & { product: Product },
    now: Date,
  ): ReminderDraft | null {
    if (!batch.expiryDate) return null;
    const expiry = new Date(batch.expiryDate);
    const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (days > 14) return null;

    const expired = days <= 0;
    const category: ReminderCategory = expired ? "EXPIRED" : "SOON";
    const tone: ReminderTone = expired ? "DANGER" : "WARNING";
    const badge = expired ? "已过期" : `${days}天后过期`;
    const remaining = `批次: ${batch.batchNo ?? "—"} · 剩余 ${Number(batch.quantity)} ${batch.product.unit}`;

    return {
      familyId: batch.product.familyId,
      productId: batch.product.id,
      category,
      tone,
      title: batch.product.name,
      description: remaining,
      badgeText: badge,
      timeText: this.formatTimeText(now),
      primaryActionText: expired ? "报废处理" : "立即处理",
      externalKey: `expiry:${batch.id}`,
    };
  }

  private async applyDrafts(drafts: ReminderDraft[]): Promise<string[]> {
    const touchedIds: string[] = [];
    for (const draft of drafts) {
      const existing = await this.prisma.reminder.findFirst({
        where: { familyId: draft.familyId, externalKey: draft.externalKey },
      });

      if (existing) {
        const updated = await this.prisma.reminder.update({
          where: { id: existing.id },
          data: {
            tone: draft.tone,
            title: draft.title,
            description: draft.description,
            badgeText: draft.badgeText,
            timeText: draft.timeText,
            primaryActionText: draft.primaryActionText,
            secondaryActionText: draft.secondaryActionText,
            dismissed: false,
          },
        });
        touchedIds.push(updated.id);
      } else {
        const created = await this.prisma.reminder.create({
          data: {
            familyId: draft.familyId,
            productId: draft.productId ?? undefined,
            category: draft.category,
            tone: draft.tone,
            title: draft.title,
            description: draft.description,
            badgeText: draft.badgeText,
            timeText: draft.timeText,
            primaryActionText: draft.primaryActionText,
            secondaryActionText: draft.secondaryActionText,
            externalKey: draft.externalKey,
          },
        });
        touchedIds.push(created.id);
      }
    }
    return touchedIds;
  }

  private formatTimeText(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `${month}-${day} ${hour}:${minute}`;
  }
}

import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, ReminderCategory, ReminderTone } from "@prisma/client";
import type {
  DismissReminderResponse,
  ReadAllRemindersResponse,
  ReminderItem,
  ReminderListResponse,
} from "@family-inventory/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { FamilyContextService } from "../common/family-context.service";

const TONE_MAP: Record<ReminderTone, ReminderItem["tone"]> = {
  WARNING: "warning",
  DANGER: "danger",
  INFO: "info",
};

const CATEGORY_MAP: Record<ReminderCategory, ReminderItem["category"]> = {
  SOON: "soon",
  EXPIRED: "expired",
  STOCK: "stock",
};

@Injectable()
export class RemindersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: FamilyContextService,
  ) {}

  async list(): Promise<ReminderListResponse> {
    const familyId = await this.context.resolveFamilyId();
    const settings = await this.prisma.notificationSettings.findUnique({ where: { familyId } });
    const reminders = await this.prisma.reminder.findMany({
      where: { familyId, dismissed: false },
      orderBy: { createdAt: "desc" },
    });

    const allowedCategories = new Set<ReminderCategory>();
    if (settings?.expiryReminderEnabled !== false) {
      allowedCategories.add("SOON");
      allowedCategories.add("EXPIRED");
    }
    if (settings?.stockWarningEnabled !== false) {
      allowedCategories.add("STOCK");
    }

    const filtered = reminders.filter((reminder) => allowedCategories.has(reminder.category));
    const items = filtered.map((reminder) => this.toSummary(reminder));

    return { items, summary: this.summarize(items) };
  }

  async dismiss(itemId: string): Promise<DismissReminderResponse> {
    const familyId = await this.context.resolveFamilyId();
    const reminder = await this.prisma.reminder.findFirst({ where: { id: itemId, familyId } });

    if (!reminder) throw new NotFoundException("Reminder not found");

    await this.prisma.reminder.update({
      where: { id: itemId },
      data: { dismissed: true },
    });

    return {
      dismissedItemIds: [itemId],
      reminders: await this.list(),
    };
  }

  async readAll(): Promise<ReadAllRemindersResponse> {
    const familyId = await this.context.resolveFamilyId();
    const active = await this.prisma.reminder.findMany({
      where: { familyId, dismissed: false },
      select: { id: true },
    });

    await this.prisma.reminder.updateMany({
      where: { familyId, dismissed: false },
      data: { dismissed: true },
    });

    return {
      dismissedItemIds: active.map((reminder) => reminder.id),
      reminders: await this.list(),
    };
  }

  private toSummary(
    reminder: Prisma.ReminderGetPayload<Record<string, never>>,
  ): ReminderItem {
    return {
      id: reminder.id,
      category: CATEGORY_MAP[reminder.category],
      title: reminder.title,
      description: reminder.description,
      badgeText: reminder.badgeText,
      timeText: reminder.timeText,
      productId: reminder.productId ?? undefined,
      tone: TONE_MAP[reminder.tone],
      primaryActionText: reminder.primaryActionText,
      secondaryActionText: reminder.secondaryActionText ?? undefined,
    };
  }

  private summarize(items: ReminderItem[]): ReminderListResponse["summary"] {
    return {
      total: items.length,
      soon: items.filter((item) => item.category === "soon").length,
      expired: items.filter((item) => item.category === "expired").length,
      stock: items.filter((item) => item.category === "stock").length,
    };
  }
}

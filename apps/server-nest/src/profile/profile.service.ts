import { Injectable } from "@nestjs/common";
import type {
  NotificationSettings,
  ProfileSummary,
  UpdateNotificationSettingsResponse,
  UpdateProfileResponse,
} from "@family-inventory/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { FamilyContextService } from "../common/family-context.service";
import {
  UpdateNotificationSettingsDto,
  UpdateProfileDto,
} from "./profile.dto";

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: FamilyContextService,
  ) {}

  async getProfile(): Promise<ProfileSummary> {
    const familyId = await this.context.resolveFamilyId();
    const [profile, family, petCount, reminderCount] = await Promise.all([
      this.prisma.userProfile.findFirst(),
      this.prisma.family.findUnique({ where: { id: familyId }, select: { name: true, createdAt: true } }),
      this.prisma.pet.count({ where: { familyId } }),
      this.prisma.reminder.count({ where: { familyId, dismissed: false } }),
    ]);

    const bookkeepingDays = family
      ? Math.max(
          1,
          Math.floor((Date.now() - family.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
        )
      : 0;

    return {
      id: profile?.id ?? "user_demo",
      name: profile?.name ?? "成员",
      familyName: profile?.familyName ?? family?.name ?? "我的家庭",
      avatar: profile?.avatar ?? "/static/family/zhangsan.png",
      stats: {
        petCount,
        bookkeepingDays: profile?.bookkeepingDays ?? bookkeepingDays,
        reminderCount,
      },
    };
  }

  async updateProfile(payload: UpdateProfileDto): Promise<UpdateProfileResponse> {
    const existing = await this.prisma.userProfile.findFirst();

    if (!existing) {
      const created = await this.prisma.userProfile.create({
        data: {
          name: payload.name ?? "成员",
          familyName: "我的家庭",
          avatar: payload.avatar ?? null,
        },
      });
      return { profile: this.summarize(created) };
    }

    const updated = await this.prisma.userProfile.update({
      where: { id: existing.id },
      data: {
        name: payload.name ?? existing.name,
        avatar: payload.avatar ?? existing.avatar,
      },
    });

    return { profile: this.summarize(updated) };
  }

  async getNotificationSettings(): Promise<NotificationSettings> {
    const familyId = await this.context.resolveFamilyId();
    const settings = await this.prisma.notificationSettings.findUnique({ where: { familyId } });

    if (settings) {
      return {
        stockWarningEnabled: settings.stockWarningEnabled,
        expiryReminderEnabled: settings.expiryReminderEnabled,
        updatedAt: settings.updatedAt.toISOString(),
      };
    }

    return {
      stockWarningEnabled: true,
      expiryReminderEnabled: true,
      updatedAt: new Date().toISOString(),
    };
  }

  async updateNotificationSettings(
    payload: UpdateNotificationSettingsDto,
  ): Promise<UpdateNotificationSettingsResponse> {
    const familyId = await this.context.resolveFamilyId();
    const existing = await this.prisma.notificationSettings.findUnique({ where: { familyId } });

    const next = await this.prisma.notificationSettings.upsert({
      where: { familyId },
      create: {
        familyId,
        stockWarningEnabled: payload.stockWarningEnabled ?? true,
        expiryReminderEnabled: payload.expiryReminderEnabled ?? true,
        webhookUrl: payload.webhookUrl ?? null,
      },
      update: {
        stockWarningEnabled: payload.stockWarningEnabled ?? existing?.stockWarningEnabled ?? true,
        expiryReminderEnabled:
          payload.expiryReminderEnabled ?? existing?.expiryReminderEnabled ?? true,
        webhookUrl:
          payload.webhookUrl !== undefined
            ? payload.webhookUrl || null
            : existing?.webhookUrl ?? null,
      },
    });

    return {
      settings: {
        stockWarningEnabled: next.stockWarningEnabled,
        expiryReminderEnabled: next.expiryReminderEnabled,
        updatedAt: next.updatedAt.toISOString(),
      },
    };
  }

  private summarize(profile: {
    id: string;
    name: string;
    familyName: string;
    avatar: string | null;
    petCount: number;
    bookkeepingDays: number;
    reminderCount: number;
  }): ProfileSummary {
    return {
      id: profile.id,
      name: profile.name,
      familyName: profile.familyName,
      avatar: profile.avatar ?? "/static/family/zhangsan.png",
      stats: {
        petCount: profile.petCount,
        bookkeepingDays: profile.bookkeepingDays,
        reminderCount: profile.reminderCount,
      },
    };
  }
}

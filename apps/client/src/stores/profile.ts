import { defineStore } from "pinia";
import type {
  NotificationSettings,
  ProfileSummary,
  UpdateNotificationSettingsRequest,
  UpdateProfileRequest,
} from "@family-inventory/shared-types";
import {
  fetchNotificationSettings,
  fetchProfile,
  updateNotificationSettings as updateNotificationSettingsApi,
  updateProfile as updateProfileApi,
} from "@/services/inventoryApi";
import { fallbackProfile } from "@/services/fallbackData";

interface State {
  profile: ProfileSummary;
  notificationSettings: NotificationSettings;
  isLoading: boolean;
  lastFetchedAt: number | null;
}

const defaultNotificationSettings: NotificationSettings = {
  stockWarningEnabled: true,
  expiryReminderEnabled: true,
  updatedAt: "2026-01-01T00:00:00.000Z",
};

export const useProfileStore = defineStore("profile", {
  state: (): State => ({
    profile: fallbackProfile,
    notificationSettings: defaultNotificationSettings,
    isLoading: false,
    lastFetchedAt: null,
  }),

  actions: {
    async refresh(): Promise<void> {
      this.isLoading = true;
      try {
        const [profile, settings] = await Promise.all([
          fetchProfile(),
          fetchNotificationSettings(),
        ]);
        this.profile = profile;
        this.notificationSettings = settings;
        this.lastFetchedAt = Date.now();
      } finally {
        this.isLoading = false;
      }
    },

    async updateProfile(payload: UpdateProfileRequest): Promise<void> {
      const response = await updateProfileApi(payload);
      this.profile = response.profile;
    },

    async updateNotificationSettings(
      payload: UpdateNotificationSettingsRequest,
    ): Promise<void> {
      const response = await updateNotificationSettingsApi(payload);
      this.notificationSettings = response.settings;
    },
  },
});

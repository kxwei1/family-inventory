import { defineStore } from "pinia";
import type {
  DismissReminderRequest,
  ReminderItem,
  ReminderListResponse,
} from "@family-inventory/shared-types";
import {
  dismissReminder as dismissReminderApi,
  fetchReminders,
  readAllReminders as readAllRemindersApi,
} from "@/services/inventoryApi";
import { fallbackReminders } from "@/services/fallbackData";

interface State {
  items: ReminderItem[];
  summary: ReminderListResponse["summary"];
  isLoading: boolean;
  lastFetchedAt: number | null;
}

const emptySummary: ReminderListResponse["summary"] = {
  total: fallbackReminders.length,
  soon: fallbackReminders.filter((item) => item.category === "soon").length,
  expired: fallbackReminders.filter((item) => item.category === "expired").length,
  stock: fallbackReminders.filter((item) => item.category === "stock").length,
};

export const useRemindersStore = defineStore("reminders", {
  state: (): State => ({
    items: fallbackReminders,
    summary: emptySummary,
    isLoading: false,
    lastFetchedAt: null,
  }),

  getters: {
    byCategory:
      (state) =>
      (category: ReminderItem["category"] | "all"): ReminderItem[] =>
        category === "all"
          ? state.items
          : state.items.filter((item) => item.category === category),
  },

  actions: {
    async refresh(): Promise<void> {
      this.isLoading = true;
      try {
        const response = await fetchReminders();
        this.items = response.items;
        this.summary = response.summary;
        this.lastFetchedAt = Date.now();
      } finally {
        this.isLoading = false;
      }
    },

    async dismiss(payload: DismissReminderRequest): Promise<void> {
      const response = await dismissReminderApi(payload);
      this.items = response.reminders.items;
      this.summary = response.reminders.summary;
    },

    async readAll(): Promise<void> {
      const response = await readAllRemindersApi();
      this.items = response.reminders.items;
      this.summary = response.reminders.summary;
    },
  },
});

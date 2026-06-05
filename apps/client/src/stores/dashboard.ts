import { defineStore } from "pinia";
import type { DashboardSummary } from "@family-inventory/shared-types";
import { fetchDashboard } from "@/services/inventoryApi";
import { fallbackDashboard } from "@/services/fallbackData";

interface State {
  dashboard: DashboardSummary;
  isLoading: boolean;
  lastFetchedAt: number | null;
}

export const useDashboardStore = defineStore("dashboard", {
  state: (): State => ({
    dashboard: fallbackDashboard,
    isLoading: false,
    lastFetchedAt: null,
  }),

  actions: {
    async refresh(): Promise<void> {
      this.isLoading = true;
      try {
        this.dashboard = await fetchDashboard();
        this.lastFetchedAt = Date.now();
      } finally {
        this.isLoading = false;
      }
    },
  },
});

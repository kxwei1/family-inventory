import { defineStore } from "pinia";
import type {
  StatisticsRange,
  StatisticsSummary,
} from "@family-inventory/shared-types";
import { fetchStatistics } from "@/services/inventoryApi";
import { fallbackStatistics } from "@/services/fallbackData";
import { persistedStorage } from "./persistedStorage";

interface State {
  byRange: Partial<Record<StatisticsRange, StatisticsSummary>>;
  activeRange: StatisticsRange;
  isLoading: boolean;
}

export const useStatisticsStore = defineStore("statistics", {
  state: (): State => ({
    byRange: { month: fallbackStatistics },
    activeRange: "month",
    isLoading: false,
  }),

  getters: {
    current(state): StatisticsSummary | null {
      return state.byRange[state.activeRange] ?? null;
    },
  },

  actions: {
    setRange(range: StatisticsRange) {
      this.activeRange = range;
    },

    async refresh(range?: StatisticsRange): Promise<void> {
      this.isLoading = true;
      const target = range ?? this.activeRange;
      try {
        const summary = await fetchStatistics(target);
        this.byRange[target] = summary;
        this.activeRange = target;
      } finally {
        this.isLoading = false;
      }
    },
  },

  persist: {
    storage: persistedStorage,
    key: "fi:store:statistics",
    paths: ["activeRange"],
  },
});

import { defineStore } from "pinia";
import type {
  AddRestockProductRequest,
  AddRestockRecommendationRequest,
  CompleteRestockRequest,
  RemoveRestockItemRequest,
  RestockPlan,
} from "@family-inventory/shared-types";
import {
  addRestockProduct as addRestockProductApi,
  addRestockRecommendation as addRestockRecommendationApi,
  completeRestock as completeRestockApi,
  fetchRestockPlan,
  removeRestockItem as removeRestockItemApi,
} from "@/services/inventoryApi";
import { fallbackRestockPlan } from "@/services/fallbackData";

interface State {
  plan: RestockPlan;
  isLoading: boolean;
  lastFetchedAt: number | null;
}

export const useRestockStore = defineStore("restock", {
  state: (): State => ({
    plan: fallbackRestockPlan,
    isLoading: false,
    lastFetchedAt: null,
  }),

  getters: {
    totalItems(state): number {
      return state.plan.groups.reduce((sum, group) => sum + group.items.length, 0);
    },
    selectedItemIds(state): string[] {
      return state.plan.groups
        .flatMap((group) => group.items)
        .filter((item) => item.selected)
        .map((item) => item.id);
    },
  },

  actions: {
    async refresh(): Promise<void> {
      this.isLoading = true;
      try {
        this.plan = await fetchRestockPlan();
        this.lastFetchedAt = Date.now();
      } finally {
        this.isLoading = false;
      }
    },

    toggleItem(itemId: string, selected: boolean) {
      this.plan = {
        ...this.plan,
        groups: this.plan.groups.map((group) => ({
          ...group,
          items: group.items.map((item) =>
            item.id === itemId ? { ...item, selected } : item,
          ),
        })),
      };
    },

    async complete(payload: CompleteRestockRequest): Promise<void> {
      const response = await completeRestockApi(payload);
      this.plan = response.restockPlan;
    },

    async remove(payload: RemoveRestockItemRequest): Promise<void> {
      const response = await removeRestockItemApi(payload);
      this.plan = response.restockPlan;
    },

    async addRecommendation(
      payload: AddRestockRecommendationRequest,
    ): Promise<string> {
      const response = await addRestockRecommendationApi(payload);
      this.plan = response.restockPlan;
      return response.itemId;
    },

    async addProduct(payload: AddRestockProductRequest): Promise<string> {
      const response = await addRestockProductApi(payload);
      this.plan = response.restockPlan;
      return response.itemId;
    },
  },
});

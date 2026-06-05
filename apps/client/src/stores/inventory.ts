import { defineStore } from "pinia";
import type {
  InventoryProductSummary,
  InventoryStockStatus,
  ProductListFilters,
} from "@family-inventory/shared-types";
import { fetchProducts } from "@/services/inventoryApi";
import { fallbackProducts } from "@/services/fallbackData";
import { persistedStorage } from "./persistedStorage";

interface State {
  products: InventoryProductSummary[];
  isLoading: boolean;
  lastFetchedAt: number | null;
  searchQuery: string;
  activeCategory: string;
  activeStatus: InventoryStockStatus | "all";
}

export const useInventoryStore = defineStore("inventory", {
  state: (): State => ({
    products: fallbackProducts,
    isLoading: false,
    lastFetchedAt: null,
    searchQuery: "",
    activeCategory: "all",
    activeStatus: "all",
  }),

  getters: {
    hasActiveFilters(state): boolean {
      return (
        Boolean(state.searchQuery.trim()) ||
        state.activeCategory !== "all" ||
        state.activeStatus !== "all"
      );
    },
    currentFilters(state): ProductListFilters {
      return {
        query: state.searchQuery,
        category: state.activeCategory === "all" ? undefined : state.activeCategory,
        status: state.activeStatus,
      };
    },
  },

  actions: {
    async refresh(filters?: ProductListFilters): Promise<void> {
      this.isLoading = true;
      try {
        const response = await fetchProducts(filters ?? this.currentFilters);
        this.products = response.items;
        this.lastFetchedAt = Date.now();
      } finally {
        this.isLoading = false;
      }
    },

    setSearchQuery(value: string) {
      this.searchQuery = value;
    },

    setCategory(value: string) {
      this.activeCategory = value;
    },

    setStatus(value: InventoryStockStatus | "all") {
      this.activeStatus = value;
    },

    resetFilters() {
      this.searchQuery = "";
      this.activeCategory = "all";
      this.activeStatus = "all";
    },

    replaceProducts(items: InventoryProductSummary[]) {
      this.products = items;
      this.lastFetchedAt = Date.now();
    },
  },

  persist: {
    storage: persistedStorage,
    key: "fi:store:inventory",
    paths: ["searchQuery", "activeCategory", "activeStatus"],
  },
});

import { defineStore } from "pinia";
import type {
  ConsumeProductRequest,
  ProductDetailResponse,
  UpdateProductRequest,
} from "@family-inventory/shared-types";
import {
  consumeProduct as consumeProductApi,
  fetchProductDetail,
  updateProduct as updateProductApi,
} from "@/services/inventoryApi";

interface State {
  cache: Record<string, ProductDetailResponse>;
  loadingId: string | null;
  loadErrorId: string | null;
}

export const useProductDetailStore = defineStore("productDetail", {
  state: (): State => ({
    cache: {},
    loadingId: null,
    loadErrorId: null,
  }),

  getters: {
    detailById:
      (state) =>
      (id: string): ProductDetailResponse | null =>
        state.cache[id] ?? null,
  },

  actions: {
    async refresh(id: string): Promise<ProductDetailResponse | null> {
      this.loadingId = id;
      this.loadErrorId = null;
      try {
        const detail = await fetchProductDetail(id);
        this.cache[id] = detail;
        return detail;
      } catch {
        this.loadErrorId = id;
        delete this.cache[id];
        return null;
      } finally {
        if (this.loadingId === id) this.loadingId = null;
      }
    },

    async consume(id: string, payload: ConsumeProductRequest): Promise<ProductDetailResponse> {
      const response = await consumeProductApi(id, payload);
      this.cache[id] = response.detail;
      return response.detail;
    },

    async update(id: string, payload: UpdateProductRequest): Promise<ProductDetailResponse> {
      const response = await updateProductApi(id, payload);
      this.cache[id] = response.detail;
      return response.detail;
    },

    drop(id: string) {
      delete this.cache[id];
    },
  },
});

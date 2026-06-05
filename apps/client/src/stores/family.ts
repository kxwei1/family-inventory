import { defineStore } from "pinia";
import type {
  FamilyOverview,
  RemoveFamilyMemberRequest,
  RenameFamilyRequest,
  UpdateFamilyAddressRequest,
  UpdateFamilyMemberRoleRequest,
} from "@family-inventory/shared-types";
import {
  dissolveFamily as dissolveFamilyApi,
  fetchFamily,
  removeFamilyMember as removeFamilyMemberApi,
  renameFamily as renameFamilyApi,
  updateFamilyAddress as updateFamilyAddressApi,
  updateFamilyMemberRole as updateFamilyMemberRoleApi,
} from "@/services/inventoryApi";
import { fallbackFamily } from "@/services/fallbackData";

interface State {
  family: FamilyOverview;
  isLoading: boolean;
  lastFetchedAt: number | null;
}

export const useFamilyStore = defineStore("family", {
  state: (): State => ({
    family: fallbackFamily,
    isLoading: false,
    lastFetchedAt: null,
  }),

  getters: {
    isCurrentUserAdmin(state): boolean {
      // First admin is the current user in the mock layer; replace with auth-driven check
      // once the auth flow is in place.
      return state.family.members.some((member) => member.role === "admin");
    },
  },

  actions: {
    async refresh(): Promise<void> {
      this.isLoading = true;
      try {
        this.family = await fetchFamily();
        this.lastFetchedAt = Date.now();
      } finally {
        this.isLoading = false;
      }
    },

    async rename(payload: RenameFamilyRequest): Promise<void> {
      const response = await renameFamilyApi(payload);
      this.family = response.family;
    },

    async updateAddress(payload: UpdateFamilyAddressRequest): Promise<void> {
      const response = await updateFamilyAddressApi(payload);
      this.family = response.family;
    },

    async updateMemberRole(payload: UpdateFamilyMemberRoleRequest): Promise<void> {
      const response = await updateFamilyMemberRoleApi(payload);
      this.family = response.family;
    },

    async removeMember(payload: RemoveFamilyMemberRequest): Promise<void> {
      const response = await removeFamilyMemberApi(payload);
      this.family = response.family;
    },

    async dissolve(): Promise<void> {
      const response = await dissolveFamilyApi();
      this.family = response.family;
    },
  },
});

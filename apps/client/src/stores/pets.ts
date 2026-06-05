import { defineStore } from "pinia";
import type {
  AddPetAlbumPhotoRequest,
  CreatePetRequest,
  PetProfileSummary,
  UpdatePetRequest,
} from "@family-inventory/shared-types";
import {
  addPetAlbumPhoto as addPetAlbumPhotoApi,
  createPet as createPetApi,
  fetchPets,
  updatePet as updatePetApi,
} from "@/services/inventoryApi";
import { fallbackPets } from "@/services/fallbackData";
import { persistedStorage } from "./persistedStorage";

interface State {
  pets: PetProfileSummary[];
  selectedPetId: string;
  isLoading: boolean;
  lastFetchedAt: number | null;
}

export const usePetsStore = defineStore("pets", {
  state: (): State => ({
    pets: fallbackPets,
    selectedPetId: fallbackPets[0]?.id ?? "",
    isLoading: false,
    lastFetchedAt: null,
  }),

  getters: {
    selectedPet(state): PetProfileSummary | null {
      return state.pets.find((pet) => pet.id === state.selectedPetId) ?? state.pets[0] ?? null;
    },
  },

  actions: {
    async refresh(): Promise<void> {
      this.isLoading = true;
      try {
        const response = await fetchPets();
        this.pets = response.items;
        if (response.selectedPetId) {
          this.selectedPetId = response.selectedPetId;
        } else if (!this.pets.find((pet) => pet.id === this.selectedPetId)) {
          this.selectedPetId = this.pets[0]?.id ?? "";
        }
        this.lastFetchedAt = Date.now();
      } finally {
        this.isLoading = false;
      }
    },

    selectPet(id: string) {
      if (this.pets.find((pet) => pet.id === id)) {
        this.selectedPetId = id;
      }
    },

    async create(payload: CreatePetRequest): Promise<PetProfileSummary> {
      const response = await createPetApi(payload);
      this.pets = response.pets.items;
      if (response.pets.selectedPetId) {
        this.selectedPetId = response.pets.selectedPetId;
      } else {
        this.selectedPetId = response.item.id;
      }
      return response.item;
    },

    async update(id: string, payload: UpdatePetRequest): Promise<PetProfileSummary> {
      const response = await updatePetApi(id, payload);
      this.pets = response.pets.items;
      if (response.pets.selectedPetId) {
        this.selectedPetId = response.pets.selectedPetId;
      }
      return response.item;
    },

    async addAlbumPhoto(id: string, payload: AddPetAlbumPhotoRequest): Promise<PetProfileSummary> {
      const response = await addPetAlbumPhotoApi(id, payload);
      this.pets = response.pets.items;
      if (response.pets.selectedPetId) {
        this.selectedPetId = response.pets.selectedPetId;
      }
      return response.item;
    },
  },

  persist: {
    storage: persistedStorage,
    key: "fi:store:pets",
    paths: ["selectedPetId"],
  },
});

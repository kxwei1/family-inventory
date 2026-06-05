import { Injectable, NotFoundException } from "@nestjs/common";
import { Pet } from "@prisma/client";
import type {
  AddPetAlbumPhotoResponse,
  AddPetAlbumPhotosResponse,
  CreatePetResponse,
  PetListResponse,
  PetProfileSummary,
  RemovePetAlbumPhotoResponse,
  UpdatePetResponse,
} from "@family-inventory/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { FamilyContextService } from "../common/family-context.service";
import {
  AddPetAlbumPhotoDto,
  AddPetAlbumPhotosDto,
  CreatePetDto,
  UpdatePetDto,
} from "./pets.dto";

const ALBUM_LIMIT = 24;

@Injectable()
export class PetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: FamilyContextService,
  ) {}

  async list(): Promise<PetListResponse> {
    const familyId = await this.context.resolveFamilyId();
    const pets = await this.prisma.pet.findMany({
      where: { familyId },
      orderBy: { createdAt: "asc" },
    });

    return {
      items: pets.map((pet) => this.toSummary(pet)),
      selectedPetId: pets[0]?.id,
    };
  }

  async create(payload: CreatePetDto): Promise<CreatePetResponse> {
    const familyId = await this.context.resolveFamilyId();
    const tags = this.normalizeTags(payload.tags);

    const pet = await this.prisma.pet.create({
      data: {
        familyId,
        name: payload.name,
        species: payload.species ?? "宠物",
        breed: payload.breed ?? "未知品种",
        ageText: payload.ageText ?? "未填写",
        weightKg: payload.weightKg ?? 0,
        colorTone: this.pickColorTone(payload.species),
        tags,
        dietStaple: payload.diet?.staple,
        dietSnack: payload.diet?.snack,
        estimateFoodDays: 0,
        estimateLitterDays: 0,
        weightTrend: [],
        albumPhotos: [],
      },
    });

    return { item: this.toSummary(pet), pets: await this.list() };
  }

  async update(id: string, payload: UpdatePetDto): Promise<UpdatePetResponse> {
    const familyId = await this.context.resolveFamilyId();
    const existing = await this.findOwned(id, familyId);
    const tags = payload.tags ? this.normalizeTags(payload.tags) : (existing.tags as string[]);

    const pet = await this.prisma.pet.update({
      where: { id },
      data: {
        name: payload.name ?? existing.name,
        species: payload.species ?? existing.species,
        breed: payload.breed ?? existing.breed,
        ageText: payload.ageText ?? existing.ageText ?? undefined,
        weightKg: payload.weightKg ?? Number(existing.weightKg),
        tags,
        dietStaple: payload.diet?.staple ?? existing.dietStaple ?? undefined,
        dietSnack: payload.diet?.snack ?? existing.dietSnack ?? undefined,
      },
    });

    return { item: this.toSummary(pet), pets: await this.list() };
  }

  async addAlbumPhoto(id: string, payload: AddPetAlbumPhotoDto): Promise<AddPetAlbumPhotoResponse> {
    const familyId = await this.context.resolveFamilyId();
    const pet = await this.findOwned(id, familyId);
    const existing = (pet.albumPhotos as string[]) ?? [];
    const next = [payload.image, ...existing.filter((item) => item !== payload.image)].slice(
      0,
      ALBUM_LIMIT,
    );

    const updated = await this.prisma.pet.update({
      where: { id },
      data: { albumPhotos: next },
    });

    return { item: this.toSummary(updated), pets: await this.list() };
  }

  async addAlbumPhotos(id: string, payload: AddPetAlbumPhotosDto): Promise<AddPetAlbumPhotosResponse> {
    const familyId = await this.context.resolveFamilyId();
    const pet = await this.findOwned(id, familyId);
    const existing = (pet.albumPhotos as string[]) ?? [];
    const seen = new Set(existing);
    const addedImages: string[] = [];

    for (const image of payload.images) {
      if (typeof image !== "string" || !image.trim() || seen.has(image)) continue;
      seen.add(image);
      addedImages.push(image);
    }

    const next = [...addedImages, ...existing].slice(0, ALBUM_LIMIT);

    const updated = await this.prisma.pet.update({
      where: { id },
      data: { albumPhotos: next },
    });

    return {
      item: this.toSummary(updated),
      pets: await this.list(),
      addedImages,
    };
  }

  async removeAlbumPhoto(id: string, image: string): Promise<RemovePetAlbumPhotoResponse> {
    const familyId = await this.context.resolveFamilyId();
    const pet = await this.findOwned(id, familyId);
    const existing = (pet.albumPhotos as string[]) ?? [];
    const next = existing.filter((item) => item !== image);

    const updated = await this.prisma.pet.update({
      where: { id },
      data: { albumPhotos: next },
    });

    return { item: this.toSummary(updated), pets: await this.list() };
  }

  private async findOwned(id: string, familyId: string): Promise<Pet> {
    const pet = await this.prisma.pet.findFirst({ where: { id, familyId } });
    if (!pet) throw new NotFoundException("Pet Not Found");
    return pet;
  }

  private toSummary(pet: Pet): PetProfileSummary {
    const albumPhotos = (pet.albumPhotos as string[]) ?? [];

    return {
      id: pet.id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      ageText: pet.ageText ?? "未填写",
      weightKg: Number(pet.weightKg),
      avatar: pet.avatar ?? undefined,
      colorTone: this.coerceColorTone(pet.colorTone),
      tags: (pet.tags as string[]) ?? [],
      diet: {
        staple: pet.dietStaple ?? "暂未设置",
        snack: pet.dietSnack ?? "暂未设置",
      },
      inventoryEstimate: {
        foodDays: pet.estimateFoodDays,
        litterDays: pet.estimateLitterDays,
      },
      weightTrend: ((pet.weightTrend as Array<{ label: string; value: number }>) ?? []).map(
        (point) => ({ label: point.label, value: point.value }),
      ),
      albumCount: albumPhotos.length,
      albumPhotos,
    };
  }

  private normalizeTags(tags?: string[]): string[] {
    return [
      ...new Set(
        (tags ?? [])
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    ].slice(0, 5);
  }

  private pickColorTone(species?: string): string {
    if (!species) return "neutral";
    if (species.includes("猫")) return "orange";
    if (species.includes("狗")) return "white";
    return "mint";
  }

  private coerceColorTone(value: string): PetProfileSummary["colorTone"] {
    const allowed: PetProfileSummary["colorTone"][] = [
      "orange",
      "white",
      "mint",
      "lake",
      "neutral",
    ];
    return (allowed as string[]).includes(value)
      ? (value as PetProfileSummary["colorTone"])
      : "neutral";
  }
}

import { PetsService } from "./pets.service";
import { createPrismaMock, PrismaMock } from "../../test/prisma.mock";
import { FamilyContextService } from "../common/family-context.service";

const FAMILY_ID = "fam_demo";

function buildContext(): FamilyContextService {
  return {
    resolveFamilyId: jest.fn().mockResolvedValue(FAMILY_ID),
  } as unknown as FamilyContextService;
}

function seedPet(prisma: PrismaMock, overrides: Record<string, unknown> = {}) {
  prisma.pet.rows.push({
    id: "pet_1",
    familyId: FAMILY_ID,
    name: "橘座",
    species: "猫",
    breed: "中华田园猫",
    ageText: "3岁",
    weightKg: 5.2,
    avatar: null,
    colorTone: "orange",
    tags: ["贪吃"],
    dietStaple: "皇家",
    dietSnack: "冻干",
    estimateFoodDays: 12,
    estimateLitterDays: 5,
    weightTrend: [],
    albumPhotos: [],
    ...overrides,
  });
}

describe("PetsService", () => {
  let prisma: PrismaMock;
  let service: PetsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new PetsService(
      prisma as unknown as ConstructorParameters<typeof PetsService>[0],
      buildContext(),
    );
  });

  it("dedupes and prepends batch album additions", async () => {
    seedPet(prisma, { albumPhotos: ["a.jpg", "b.jpg"] });

    const response = await service.addAlbumPhotos("pet_1", {
      images: ["a.jpg", "c.jpg", "d.jpg"],
    });

    expect(response.addedImages).toEqual(["c.jpg", "d.jpg"]);
    expect(response.item.albumPhotos.slice(0, 4)).toEqual([
      "c.jpg",
      "d.jpg",
      "a.jpg",
      "b.jpg",
    ]);
  });

  it("caps the album at 24 photos when growing", async () => {
    const existing = Array.from({ length: 20 }, (_, idx) => `old_${idx}.jpg`);
    seedPet(prisma, { albumPhotos: existing });

    const response = await service.addAlbumPhotos("pet_1", {
      images: ["new_1.jpg", "new_2.jpg", "new_3.jpg", "new_4.jpg", "new_5.jpg", "new_6.jpg"],
    });

    expect(response.item.albumPhotos).toHaveLength(24);
    expect(response.item.albumPhotos[0]).toBe("new_1.jpg");
  });

  it("removes a single album photo", async () => {
    seedPet(prisma, { albumPhotos: ["a.jpg", "b.jpg", "c.jpg"] });

    const response = await service.removeAlbumPhoto("pet_1", "b.jpg");

    expect(response.item.albumPhotos).toEqual(["a.jpg", "c.jpg"]);
  });

  it("normalizes tags on update (trim + dedupe + cap at 5)", async () => {
    seedPet(prisma);

    const response = await service.update("pet_1", {
      tags: [" 贪吃 ", "亲人", "贪吃", "粘人", "可爱", "活泼", "懒"],
    });

    expect(response.item.tags).toEqual(["贪吃", "亲人", "粘人", "可爱", "活泼"]);
  });
});

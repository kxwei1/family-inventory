import { BadRequestException } from "@nestjs/common";
import { FamilyService } from "./family.service";
import { createPrismaMock, PrismaMock } from "../../test/prisma.mock";
import { FamilyContextService } from "../common/family-context.service";

const FAMILY_ID = "fam_demo";

function buildContext(): FamilyContextService {
  return {
    resolveFamilyId: jest.fn().mockResolvedValue(FAMILY_ID),
  } as unknown as FamilyContextService;
}

function seedFamily(prisma: PrismaMock) {
  prisma.family.rows.push({
    id: FAMILY_ID,
    name: "幸福的小窝",
    archived: false,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  });
  prisma.familyMember.rows.push(
    {
      id: "m_admin",
      familyId: FAMILY_ID,
      name: "张三",
      subtitle: "owner",
      avatar: null,
      role: "ADMIN",
      isOwner: true,
      createdAt: new Date("2024-01-01"),
    },
    {
      id: "m_member",
      familyId: FAMILY_ID,
      name: "李四",
      subtitle: "member",
      avatar: null,
      role: "MEMBER",
      isOwner: false,
      createdAt: new Date("2024-01-02"),
    },
  );
}

describe("FamilyService", () => {
  let prisma: PrismaMock;
  let service: FamilyService;

  beforeEach(() => {
    prisma = createPrismaMock();
    seedFamily(prisma);
    service = new FamilyService(
      prisma as unknown as ConstructorParameters<typeof FamilyService>[0],
      buildContext(),
    );
  });

  it("returns an overview with mapped roles", async () => {
    const overview = await service.getOverview();

    expect(overview.id).toBe(FAMILY_ID);
    expect(overview.memberCount).toBe(2);
    expect(overview.members.map((m) => m.role)).toEqual(["admin", "member"]);
    expect(overview.settings).toHaveLength(3);
  });

  it("refuses to demote the last admin", async () => {
    await expect(
      service.updateMemberRole({ memberId: "m_admin", role: "member" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("refuses to remove the last admin", async () => {
    await expect(
      service.removeMember({ memberId: "m_admin" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("allows demoting an admin when another admin exists", async () => {
    prisma.familyMember.rows.push({
      id: "m_admin2",
      familyId: FAMILY_ID,
      name: "王五",
      subtitle: "co-admin",
      avatar: null,
      role: "ADMIN",
      isOwner: false,
      createdAt: new Date("2024-01-03"),
    });

    const response = await service.updateMemberRole({ memberId: "m_admin", role: "member" });
    expect(response.family.members.find((m) => m.id === "m_admin")?.role).toBe("member");
  });

  it("dissolve keeps the owner and promotes it to admin", async () => {
    // Demote owner first to verify the promotion step.
    prisma.familyMember.rows[0].role = "MEMBER";

    const response = await service.dissolve();

    expect(response.family.members).toHaveLength(1);
    expect(response.family.members[0].id).toBe("m_admin");
    expect(response.family.members[0].role).toBe("admin");
  });
});

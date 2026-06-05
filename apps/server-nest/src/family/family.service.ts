import { Injectable, NotFoundException } from "@nestjs/common";
import { FamilyMember, FamilyRole, Prisma } from "@prisma/client";
import type { FamilyMemberSummary, FamilyOverview } from "@family-inventory/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { FamilyContextService } from "../common/family-context.service";

const familyInclude = {
  members: { orderBy: { createdAt: "asc" as Prisma.SortOrder } },
  address: true,
} satisfies Prisma.FamilyInclude;

type FamilyWithRelations = Prisma.FamilyGetPayload<{ include: typeof familyInclude }>;

@Injectable()
export class FamilyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: FamilyContextService,
  ) {}

  async getOverview(): Promise<FamilyOverview> {
    const familyId = await this.context.resolveFamilyId();
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      include: familyInclude,
    });

    if (!family) {
      throw new NotFoundException("Family not found");
    }

    return this.toOverview(family);
  }

  private toOverview(family: FamilyWithRelations): FamilyOverview {
    return {
      id: family.id,
      name: family.name,
      createdAt: family.createdAt.toISOString().slice(0, 10),
      memberCount: family.members.length,
      address: family.address
        ? {
            contactName: family.address.contactName,
            phone: family.address.phone,
            region: family.address.region,
            detail: family.address.detail,
            notes: family.address.notes ?? undefined,
            updatedAt: family.address.updatedAt.toISOString(),
          }
        : {
            contactName: "",
            phone: "",
            region: "",
            detail: "",
            updatedAt: family.updatedAt.toISOString(),
          },
      members: family.members.map((member) => this.toMemberSummary(member)),
      settings: [
        { id: "rename", label: "修改家庭名称" },
        { id: "address", label: "家庭地址管理" },
        { id: "permissions", label: "权限与分享设置" },
      ],
    };
  }

  private toMemberSummary(member: FamilyMember): FamilyMemberSummary {
    return {
      id: member.id,
      name: member.name,
      subtitle: member.subtitle ?? "",
      avatar: member.avatar ?? undefined,
      role: this.toApiRole(member.role),
      roleText: this.roleText(member.role),
    };
  }

  private toApiRole(role: FamilyRole): FamilyMemberSummary["role"] {
    if (role === FamilyRole.ADMIN) return "admin";
    if (role === FamilyRole.GUEST) return "guest";
    return "member";
  }

  private roleText(role: FamilyRole): string {
    if (role === FamilyRole.ADMIN) return "管理员";
    if (role === FamilyRole.GUEST) return "访客";
    return "成员";
  }
}

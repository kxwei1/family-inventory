import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { FamilyMember, FamilyRole, Prisma } from "@prisma/client";
import type {
  DissolveFamilyResponse,
  FamilyMemberSummary,
  FamilyOverview,
  RemoveFamilyMemberResponse,
  RenameFamilyResponse,
  UpdateFamilyAddressResponse,
  UpdateFamilyMemberRoleResponse,
} from "@family-inventory/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { FamilyContextService } from "../common/family-context.service";
import {
  RemoveFamilyMemberDto,
  RenameFamilyDto,
  UpdateFamilyAddressDto,
  UpdateFamilyMemberRoleDto,
} from "./family.dto";

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
    return this.loadOverview();
  }

  async rename(payload: RenameFamilyDto): Promise<RenameFamilyResponse> {
    const familyId = await this.context.resolveFamilyId();
    await this.prisma.family.update({ where: { id: familyId }, data: { name: payload.name } });
    return { family: await this.loadOverview() };
  }

  async updateAddress(payload: UpdateFamilyAddressDto): Promise<UpdateFamilyAddressResponse> {
    const familyId = await this.context.resolveFamilyId();
    await this.prisma.familyAddress.upsert({
      where: { familyId },
      create: { ...payload, notes: payload.notes ?? null, familyId },
      update: { ...payload, notes: payload.notes ?? null },
    });
    return { family: await this.loadOverview() };
  }

  async updateMemberRole(
    payload: UpdateFamilyMemberRoleDto,
  ): Promise<UpdateFamilyMemberRoleResponse> {
    const familyId = await this.context.resolveFamilyId();
    const member = await this.prisma.familyMember.findFirst({
      where: { id: payload.memberId, familyId },
    });
    if (!member) throw new NotFoundException("Member not found");

    if (member.role === FamilyRole.ADMIN && payload.role !== "admin") {
      const adminCount = await this.prisma.familyMember.count({
        where: { familyId, role: FamilyRole.ADMIN },
      });
      if (adminCount <= 1) {
        throw new BadRequestException("At least one admin is required");
      }
    }

    await this.prisma.familyMember.update({
      where: { id: member.id },
      data: { role: this.toDbRole(payload.role) },
    });

    return { family: await this.loadOverview() };
  }

  async removeMember(payload: RemoveFamilyMemberDto): Promise<RemoveFamilyMemberResponse> {
    const familyId = await this.context.resolveFamilyId();
    const member = await this.prisma.familyMember.findFirst({
      where: { id: payload.memberId, familyId },
    });
    if (!member) throw new NotFoundException("Member not found");

    if (member.role === FamilyRole.ADMIN) {
      const adminCount = await this.prisma.familyMember.count({
        where: { familyId, role: FamilyRole.ADMIN },
      });
      if (adminCount <= 1) {
        throw new BadRequestException("At least one admin is required");
      }
    }

    await this.prisma.familyMember.delete({ where: { id: member.id } });
    return { family: await this.loadOverview() };
  }

  async dissolve(): Promise<DissolveFamilyResponse> {
    const familyId = await this.context.resolveFamilyId();
    const owner = await this.prisma.familyMember.findFirst({
      where: { familyId, isOwner: true },
    });

    await this.prisma.familyMember.deleteMany({
      where: { familyId, NOT: owner ? { id: owner.id } : undefined },
    });

    if (owner && owner.role !== FamilyRole.ADMIN) {
      await this.prisma.familyMember.update({
        where: { id: owner.id },
        data: { role: FamilyRole.ADMIN },
      });
    }

    return { family: await this.loadOverview() };
  }

  private async loadOverview(): Promise<FamilyOverview> {
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

  private toDbRole(role: "admin" | "member" | "guest"): FamilyRole {
    if (role === "admin") return FamilyRole.ADMIN;
    if (role === "guest") return FamilyRole.GUEST;
    return FamilyRole.MEMBER;
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

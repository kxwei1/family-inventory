import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { FamilyRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "./current-user.decorator";

export interface LoginResult {
  token: string;
  expiresIn: string;
  user: AuthUser;
}

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async loginWithPassword(email: string, password: string): Promise<LoginResult> {
    const credential = await this.prisma.credential.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { member: { include: { family: { select: { id: true, archived: true } } } } },
    });

    if (!credential || credential.member.family.archived) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const ok = await bcrypt.compare(password, credential.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("Invalid email or password");
    }

    return this.signFor(credential.member);
  }

  /** Dev-mode fallback: log in by raw member id. Rejected when AUTH_REQUIRED=true. */
  async loginAsMember(memberId: string, expectedFamilyId?: string): Promise<LoginResult> {
    if (this.isAuthRequired()) {
      throw new UnauthorizedException("memberId login is disabled when AUTH_REQUIRED=true");
    }

    const member = await this.prisma.familyMember.findUnique({
      where: { id: memberId },
      include: { family: { select: { id: true, archived: true } } },
    });

    if (!member || member.family.archived) {
      throw new UnauthorizedException("Member not found");
    }

    if (expectedFamilyId && member.familyId !== expectedFamilyId) {
      throw new UnauthorizedException("Member does not belong to the requested family");
    }

    return this.signFor(member);
  }

  async register(payload: {
    email: string;
    password: string;
    name: string;
    inviteCode?: string;
    familyName?: string;
  }): Promise<LoginResult> {
    const email = payload.email.trim().toLowerCase();
    const existing = await this.prisma.credential.findUnique({ where: { email } });
    if (existing) throw new ConflictException("Email already registered");

    const passwordHash = await bcrypt.hash(payload.password, BCRYPT_ROUNDS);

    let familyId: string;
    let role: FamilyRole = FamilyRole.ADMIN;
    let isOwner = true;

    if (payload.inviteCode) {
      const invite = await this.consumeInvite(payload.inviteCode);
      familyId = invite.familyId;
      role = invite.role;
      isOwner = false;
    } else {
      const family = await this.prisma.family.create({
        data: { name: payload.familyName?.trim() || `${payload.name}的家` },
      });
      familyId = family.id;
    }

    const member = await this.prisma.familyMember.create({
      data: {
        familyId,
        name: payload.name,
        subtitle: email,
        role,
        isOwner,
      },
      include: { family: { select: { id: true, archived: true } } },
    });

    await this.prisma.credential.create({
      data: { memberId: member.id, email, passwordHash },
    });

    if (payload.inviteCode) {
      await this.prisma.inviteCode.update({
        where: { code: payload.inviteCode },
        data: { redeemedBy: member.id, redeemedAt: new Date() },
      });
    }

    return this.signFor(member);
  }

  async peekInvite(code: string): Promise<{
    code: string;
    familyId: string;
    familyName: string;
    role: "admin" | "member" | "guest";
    expiresAt: Date | null;
  }> {
    const invite = await this.prisma.inviteCode.findUnique({
      where: { code },
      include: { family: { select: { name: true } } },
    });
    if (!invite) throw new BadRequestException("Invalid invite code");
    if (invite.redeemedAt) throw new BadRequestException("Invite code already used");
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException("Invite code expired");
    }

    return {
      code: invite.code,
      familyId: invite.familyId,
      familyName: invite.family.name,
      role: this.toApiRole(invite.role),
      expiresAt: invite.expiresAt,
    };
  }

  async createInviteCode(
    user: AuthUser,
    role: "admin" | "member" | "guest" = "member",
    expiresInHours = 72,
  ): Promise<{ code: string; expiresAt: Date }> {
    if (user.role !== "admin") {
      throw new UnauthorizedException("Only admins can create invite codes");
    }

    const code = randomBytes(6).toString("hex").toUpperCase();
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    await this.prisma.inviteCode.create({
      data: {
        code,
        familyId: user.familyId,
        inviterId: user.memberId,
        role: this.toDbRole(role),
        expiresAt,
      },
    });

    return { code, expiresAt };
  }

  async verify(token: string): Promise<AuthUser> {
    try {
      const payload = await this.jwtService.verifyAsync<AuthUser & { iat: number; exp: number }>(
        token,
      );
      return {
        memberId: payload.memberId,
        familyId: payload.familyId,
        role: payload.role,
        name: payload.name,
      };
    } catch (error) {
      throw new UnauthorizedException(
        error instanceof Error ? error.message : "Invalid token",
      );
    }
  }

  isAuthRequired(): boolean {
    return this.config.get<string>("AUTH_REQUIRED") === "true";
  }

  private async consumeInvite(code: string): Promise<{ familyId: string; role: FamilyRole }> {
    const invite = await this.prisma.inviteCode.findUnique({ where: { code } });
    if (!invite) throw new BadRequestException("Invalid invite code");
    if (invite.redeemedAt) throw new BadRequestException("Invite code already used");
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException("Invite code expired");
    }
    return { familyId: invite.familyId, role: invite.role };
  }

  private async signFor(member: {
    id: string;
    familyId: string;
    name: string;
    role: FamilyRole;
  }): Promise<LoginResult> {
    const user: AuthUser = {
      memberId: member.id,
      familyId: member.familyId,
      role: this.toApiRole(member.role),
      name: member.name,
    };

    const expiresIn = this.config.get<string>("JWT_EXPIRES_IN") ?? "7d";
    const token = await this.jwtService.signAsync(user, { expiresIn });

    return { token, expiresIn, user };
  }

  private toApiRole(role: FamilyRole): AuthUser["role"] {
    if (role === FamilyRole.ADMIN) return "admin";
    if (role === FamilyRole.GUEST) return "guest";
    return "member";
  }

  private toDbRole(role: "admin" | "member" | "guest"): FamilyRole {
    if (role === "admin") return FamilyRole.ADMIN;
    if (role === "guest") return FamilyRole.GUEST;
    return FamilyRole.MEMBER;
  }
}

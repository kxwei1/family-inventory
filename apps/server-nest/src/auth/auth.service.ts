import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { FamilyRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUser } from "./current-user.decorator";

export interface LoginResult {
  token: string;
  expiresIn: string;
  user: AuthUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(memberId: string, expectedFamilyId?: string): Promise<LoginResult> {
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

  private toApiRole(role: FamilyRole): AuthUser["role"] {
    if (role === FamilyRole.ADMIN) return "admin";
    if (role === FamilyRole.GUEST) return "guest";
    return "member";
  }
}

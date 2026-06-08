import { Inject, Injectable, NotFoundException, Scope } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { Request } from "express";
import { AuthUser } from "../auth/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Resolves the "current" family. When the request carries a JWT (req.user is
 * populated by JwtAuthGuard), we trust the embedded familyId. When no user is
 * attached (AUTH_REQUIRED=false dev mode), we fall back to the first
 * non-archived family — same behaviour as the legacy scaffold.
 *
 * REQUEST scope is required so different concurrent requests don't share a
 * cached id. NestJS will cascade the scope to every singleton that injects
 * this service, which is the intended trade-off for per-request isolation.
 */
@Injectable({ scope: Scope.REQUEST })
export class FamilyContextService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) private readonly request: Request & { user?: AuthUser },
  ) {}

  async resolveFamilyId(): Promise<string> {
    const user = this.request.user;
    if (user?.familyId) {
      return user.familyId;
    }

    const family = await this.prisma.family.findFirst({
      where: { archived: false },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (!family) {
      throw new NotFoundException("No active family found. Run prisma seed first.");
    }

    return family.id;
  }

  /**
   * Returns the authenticated user attached to this request, or `null` when
   * the request is unauthenticated (dev mode).
   */
  currentUser(): AuthUser | null {
    return this.request.user ?? null;
  }
}

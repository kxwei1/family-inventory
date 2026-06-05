import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Resolves the "current" family. Until auth ships, every request is scoped to
 * the first non-archived family, which matches the legacy single-tenant
 * scaffold behaviour. Swap this with a request-scoped resolver once auth is in
 * place.
 */
@Injectable()
export class FamilyContextService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveFamilyId(): Promise<string> {
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
}

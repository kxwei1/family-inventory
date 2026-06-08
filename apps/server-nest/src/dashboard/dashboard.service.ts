import { Injectable } from "@nestjs/common";
import type { DashboardSummary } from "@family-inventory/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { FamilyContextService } from "../common/family-context.service";
import { CacheService } from "../common/cache.service";

const DASHBOARD_TTL_SECONDS = 30;

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: FamilyContextService,
    private readonly cache: CacheService,
  ) {}

  async getSummary(): Promise<DashboardSummary> {
    const familyId = await this.context.resolveFamilyId();
    return this.cache.wrap(`dashboard:${familyId}`, DASHBOARD_TTL_SECONDS, () =>
      this.buildSummary(familyId),
    );
  }

  private async buildSummary(familyId: string): Promise<DashboardSummary> {
    const [family, profile, products, reminders, restockCount] = await Promise.all([
      this.prisma.family.findUnique({ where: { id: familyId }, select: { name: true } }),
      this.prisma.userProfile.findFirst(),
      this.prisma.product.findMany({ where: { familyId, archived: false } }),
      this.prisma.reminder.findMany({ where: { familyId, dismissed: false } }),
      this.prisma.restockItem.count({ where: { familyId, completed: false } }),
    ]);

    const expiring = reminders.filter((reminder) => reminder.category === "SOON").length;
    const warningStock = products.filter((product) => product.status === "LOW").length;

    const categories = this.buildCategorySummaries(products);

    return {
      familyName: profile?.familyName ?? family?.name ?? "我的家庭",
      greeting: this.buildGreeting(),
      avatar: profile?.avatar ?? "/static/profile/cat-avatar.png",
      alerts: [
        { id: "expiring", title: "即将过期", count: expiring, icon: "calendar", tone: "danger" },
        { id: "warning", title: "库存告急", count: warningStock, icon: "warning", tone: "warning" },
        { id: "restock", title: "待补货", count: restockCount, icon: "cart", tone: "info" },
      ],
      categories,
    };
  }

  private buildCategorySummaries(
    products: Array<{ category: string; quantity: unknown; unit: string }>,
  ): DashboardSummary["categories"] {
    const grouped = new Map<string, { total: number; unit: string }>();

    for (const product of products) {
      const key = product.category;
      const entry = grouped.get(key);
      const quantity = Number(product.quantity);

      if (entry) {
        entry.total += quantity;
      } else {
        grouped.set(key, { total: quantity, unit: product.unit });
      }
    }

    const tones: Array<DashboardSummary["categories"][number]["tone"]> = ["mint", "lake", "yellow"];
    const iconByCategory = (category: string) => {
      if (category.includes("罐")) return "goods";
      if (category.includes("砂")) return "layers";
      return "shop";
    };

    return [...grouped.entries()].slice(0, 3).map(([name, { total, unit }], index) => ({
      id: this.slug(name) || `category_${index}`,
      name,
      icon: iconByCategory(name),
      total: Math.round(total),
      unit,
      days: total > 0 ? `约${Math.max(1, Math.round(total * 5))}天` : "0天",
      tone: tones[index] ?? "mint",
    }));
  }

  private slug(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  private buildGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 6) return "凌晨好，主人";
    if (hour < 12) return "上午好，主人";
    if (hour < 18) return "下午好，主人";
    return "晚上好，主人";
  }
}

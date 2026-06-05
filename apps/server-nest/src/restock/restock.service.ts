import { Injectable, NotFoundException } from "@nestjs/common";
import { RestockItem } from "@prisma/client";
import type {
  AddRestockProductResponse,
  AddRestockRecommendationResponse,
  CompleteRestockResponse,
  InventoryProductSummary,
  RemoveRestockItemResponse,
  RestockItem as RestockItemDto,
  RestockPlan,
} from "@family-inventory/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { FamilyContextService } from "../common/family-context.service";

const STATIC_RECOMMENDATIONS: RestockPlan["recommendations"] = [
  {
    id: "shampoo",
    name: "温和沐浴露",
    reason: "上次购买3个月前",
    image: "/static/products/litter.png",
  },
  {
    id: "insect_repellent",
    name: "内外驱虫滴剂",
    reason: "即将到期",
    icon: "warning",
  },
];

@Injectable()
export class RestockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: FamilyContextService,
  ) {}

  async getPlan(): Promise<RestockPlan> {
    const familyId = await this.context.resolveFamilyId();
    const items = await this.prisma.restockItem.findMany({
      where: { familyId, completed: false },
      orderBy: { createdAt: "asc" },
    });

    const groups = this.groupItems(items);
    const estimatedCost = items.reduce((sum, item) => {
      const quantity = item.suggestedQuantity ? Number(item.suggestedQuantity) : 1;
      const price = item.image ? 35 : 28; // rough heuristic until prices are stored on the row
      return sum + quantity * price;
    }, 0);

    return {
      estimatedCost: Math.round(estimatedCost * 10) / 10,
      lastRestockedText: await this.lastRestockedText(familyId),
      groups,
      recommendations: STATIC_RECOMMENDATIONS,
    };
  }

  async complete(itemIds: string[]): Promise<CompleteRestockResponse> {
    const familyId = await this.context.resolveFamilyId();
    const items = await this.prisma.restockItem.findMany({
      where: { id: { in: itemIds }, familyId, completed: false },
    });

    if (items.length === 0) {
      return {
        completedItemIds: [],
        items: await this.productSummaries(familyId),
        restockPlan: await this.getPlan(),
      };
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.restockItem.update({
          where: { id: item.id },
          data: { completed: true },
        });

        if (!item.productId) continue;

        const product = await tx.product.findFirst({
          where: { id: item.productId, familyId },
        });

        if (!product) continue;

        const restockQuantity = item.suggestedQuantity ? Number(item.suggestedQuantity) : 1;
        const nextQuantity = Number(product.quantity) + restockQuantity;
        const nextStatus = this.classify(nextQuantity);

        await tx.product.update({
          where: { id: product.id },
          data: {
            quantity: nextQuantity,
            status: nextStatus,
            statusText: this.statusText(nextStatus),
          },
        });

        await tx.stockLog.create({
          data: {
            familyId,
            productId: product.id,
            operatorName: "系统",
            action: "STOCK_IN",
            actionText: "补货入库",
            quantity: restockQuantity,
            unit: product.unit,
          },
        });
      }
    });

    return {
      completedItemIds: items.map((item) => item.id),
      items: await this.productSummaries(familyId),
      restockPlan: await this.getPlan(),
    };
  }

  async remove(itemId: string): Promise<RemoveRestockItemResponse> {
    const familyId = await this.context.resolveFamilyId();
    const item = await this.prisma.restockItem.findFirst({ where: { id: itemId, familyId } });
    if (!item) throw new NotFoundException("Restock item not found");

    await this.prisma.restockItem.delete({ where: { id: itemId } });

    return {
      removedItemIds: [itemId],
      restockPlan: await this.getPlan(),
    };
  }

  async addRecommendation(
    recommendationId: string,
  ): Promise<AddRestockRecommendationResponse> {
    const familyId = await this.context.resolveFamilyId();
    const recommendation = STATIC_RECOMMENDATIONS.find((rec) => rec.id === recommendationId);
    if (!recommendation) throw new NotFoundException("Recommendation not found");

    const existing = await this.prisma.restockItem.findFirst({
      where: { familyId, sourceRecommendationId: recommendationId, completed: false },
    });

    if (existing) {
      return { itemId: existing.id, restockPlan: await this.getPlan() };
    }

    const created = await this.prisma.restockItem.create({
      data: {
        familyId,
        groupId: "recommendation",
        groupTitle: "智能推荐",
        groupIcon: "tips",
        name: recommendation.name,
        description: recommendation.reason,
        image: recommendation.image,
        icon: recommendation.icon,
        sourceRecommendationId: recommendationId,
        selected: true,
      },
    });

    return { itemId: created.id, restockPlan: await this.getPlan() };
  }

  async addProduct(productId: string): Promise<AddRestockProductResponse> {
    const familyId = await this.context.resolveFamilyId();
    const product = await this.prisma.product.findFirst({
      where: { id: productId, familyId, archived: false },
    });

    if (!product) throw new NotFoundException("Product not found");

    const existing = await this.prisma.restockItem.findFirst({
      where: { familyId, productId, completed: false },
    });

    if (existing) {
      return { itemId: existing.id, restockPlan: await this.getPlan() };
    }

    const created = await this.prisma.restockItem.create({
      data: {
        familyId,
        productId,
        groupId: this.slugify(product.category),
        groupTitle: product.category,
        groupIcon: this.iconForCategory(product.category),
        name: product.name,
        description: `需补: 1${product.unit}`,
        image: product.image,
        category: product.category,
        unit: product.unit,
        suggestedQuantity: 1,
        selected: true,
      },
    });

    return { itemId: created.id, restockPlan: await this.getPlan() };
  }

  private groupItems(items: RestockItem[]): RestockPlan["groups"] {
    const grouped = new Map<
      string,
      { id: string; title: string; icon: string; items: RestockItemDto[] }
    >();

    for (const item of items) {
      const group = grouped.get(item.groupId);
      const dto = this.toDto(item);

      if (group) {
        group.items.push(dto);
      } else {
        grouped.set(item.groupId, {
          id: item.groupId,
          title: item.groupTitle,
          icon: item.groupIcon ?? "list",
          items: [dto],
        });
      }
    }

    return [...grouped.values()];
  }

  private toDto(item: RestockItem): RestockItemDto {
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      productId: item.productId ?? undefined,
      category: item.category ?? undefined,
      unit: item.unit ?? undefined,
      suggestedQuantity: item.suggestedQuantity ? Number(item.suggestedQuantity) : undefined,
      image: item.image ?? undefined,
      icon: item.icon ?? undefined,
      sourceRecommendationId: item.sourceRecommendationId ?? undefined,
      selected: item.selected,
    };
  }

  private async lastRestockedText(familyId: string): Promise<string> {
    const lastLog = await this.prisma.stockLog.findFirst({
      where: { familyId, action: "STOCK_IN" },
      orderBy: { operatedAt: "desc" },
      select: { operatedAt: true },
    });

    if (!lastLog) return "暂无补货记录";

    const days = Math.max(
      1,
      Math.floor((Date.now() - lastLog.operatedAt.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const month = String(lastLog.operatedAt.getMonth() + 1).padStart(2, "0");
    const day = String(lastLog.operatedAt.getDate()).padStart(2, "0");
    return `${days}天前（${month}月${day}日）`;
  }

  private async productSummaries(familyId: string): Promise<InventoryProductSummary[]> {
    const products = await this.prisma.product.findMany({
      where: { familyId, archived: false },
      orderBy: { createdAt: "desc" },
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category,
      brand: product.brand ?? "未填写品牌",
      spec: product.spec ?? "未填写规格",
      quantity: Number(product.quantity),
      unit: product.unit,
      status: product.status === "ENOUGH" ? "enough" : product.status === "LOW" ? "low" : "empty",
      statusText: product.statusText ?? this.statusText(product.status),
      image: product.image ?? "/static/products/orijen.png",
      purchasePrice:
        product.purchasePrice !== null ? Number(product.purchasePrice) : undefined,
      purchaseChannel: product.purchaseChannel ?? undefined,
      location: product.location ?? undefined,
      isOpened: product.isOpened,
      stockInDate: product.stockInDate?.toISOString().slice(0, 10),
    }));
  }

  private classify(quantity: number): "ENOUGH" | "LOW" | "EMPTY" {
    if (quantity <= 0) return "EMPTY";
    if (quantity < 3) return "LOW";
    return "ENOUGH";
  }

  private statusText(status: string): string {
    if (status === "ENOUGH") return "充足";
    if (status === "LOW") return "即将耗尽";
    return "已耗尽";
  }

  private slugify(input: string) {
    return (
      input
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "group"
    );
  }

  private iconForCategory(category: string) {
    if (category.includes("罐")) return "goods";
    if (category.includes("砂")) return "layers";
    return "shop";
  }
}

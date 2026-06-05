import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, Product, StockStatus } from "@prisma/client";
import type {
  ArchiveProductResponse,
  ConsumeProductResponse,
  CreateProductResponse,
  InventoryProductSummary,
  InventoryStockStatus,
  ProductDetailResponse,
  ProductListResponse,
} from "@family-inventory/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { FamilyContextService } from "../common/family-context.service";
import {
  ConsumeProductDto,
  CreateProductDto,
  ProductListQueryDto,
  UpdateProductDto,
} from "./products.dto";

const STATUS_TEXT: Record<StockStatus, string> = {
  ENOUGH: "充足",
  LOW: "即将耗尽",
  EMPTY: "已耗尽",
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: FamilyContextService,
  ) {}

  async list(query: ProductListQueryDto): Promise<ProductListResponse> {
    const familyId = await this.context.resolveFamilyId();
    const where: Prisma.ProductWhereInput = { familyId, archived: false };

    if (query.category && query.category !== "all") {
      where.category = query.category;
    }

    if (query.status && query.status !== "all") {
      where.status = this.toDbStatus(query.status);
    }

    if (query.q?.trim()) {
      const trimmed = query.q.trim();
      where.OR = [
        { name: { contains: trimmed } },
        { brand: { contains: trimmed } },
        { spec: { contains: trimmed } },
      ];
    }

    const products = await this.prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return { items: products.map((product) => this.toSummary(product)) };
  }

  async detail(id: string): Promise<ProductDetailResponse> {
    const product = await this.findOwned(id);

    return this.toDetail(product);
  }

  async stockIn(payload: CreateProductDto): Promise<CreateProductResponse> {
    const familyId = await this.context.resolveFamilyId();
    const existing = await this.prisma.product.findFirst({
      where: {
        familyId,
        archived: false,
        name: payload.name,
        category: payload.category,
        unit: payload.unit,
        brand: payload.brand ?? "未填写品牌",
        spec: payload.spec ?? "未填写规格",
      },
    });

    if (existing) {
      const nextQuantity = Number(existing.quantity) + payload.quantity;
      const nextStatus = this.classify(nextQuantity);
      const updated = await this.prisma.product.update({
        where: { id: existing.id },
        data: {
          quantity: nextQuantity,
          status: nextStatus,
          statusText: STATUS_TEXT[nextStatus],
          purchasePrice: payload.purchasePrice ?? existing.purchasePrice ?? undefined,
          purchaseChannel: payload.purchaseChannel ?? existing.purchaseChannel ?? undefined,
          location: payload.location ?? existing.location ?? undefined,
          stockInDate: this.parseDate(payload.stockInDate) ?? existing.stockInDate,
          isOpened: payload.isOpened ?? existing.isOpened,
        },
      });

      await this.prisma.stockLog.create({
        data: {
          familyId,
          productId: existing.id,
          operatorName: "系统",
          action: "STOCK_IN",
          actionText: "扫码入库",
          quantity: payload.quantity,
          unit: payload.unit,
          notes: payload.notes,
        },
      });

      return { item: this.toSummary(updated) };
    }

    return this.create(payload);
  }

  async create(payload: CreateProductDto): Promise<CreateProductResponse> {
    const familyId = await this.context.resolveFamilyId();
    const product = await this.prisma.product.create({
      data: {
        familyId,
        name: payload.name,
        category: payload.category,
        unit: payload.unit,
        quantity: payload.quantity,
        brand: payload.brand ?? "未填写品牌",
        spec: payload.spec ?? "未填写规格",
        image: payload.image ?? this.imageForCategory(payload.category),
        purchasePrice: payload.purchasePrice ?? null,
        purchaseChannel: payload.purchaseChannel,
        location: payload.location,
        isOpened: payload.isOpened ?? false,
        stockInDate: this.parseDate(payload.stockInDate) ?? new Date(),
        notes: payload.notes,
        status: this.classify(payload.quantity),
        statusText: STATUS_TEXT[this.classify(payload.quantity)],
      },
    });

    await this.prisma.stockLog.create({
      data: {
        familyId,
        productId: product.id,
        operatorName: "系统",
        action: "STOCK_IN",
        actionText: "新增入库",
        quantity: payload.quantity,
        unit: payload.unit,
        notes: payload.notes,
      },
    });

    return { item: this.toSummary(product) };
  }

  async update(id: string, payload: UpdateProductDto): Promise<{ detail: ProductDetailResponse }> {
    const familyId = await this.context.resolveFamilyId();
    const product = await this.findOwned(id);
    const nextQuantity = payload.quantity ?? Number(product.quantity);
    const nextStatus = this.classify(nextQuantity);

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        name: payload.name ?? product.name,
        category: payload.category ?? product.category,
        brand: payload.brand ?? product.brand ?? undefined,
        spec: payload.spec ?? product.spec ?? undefined,
        unit: payload.unit ?? product.unit,
        quantity: nextQuantity,
        purchasePrice:
          payload.purchasePrice === undefined
            ? product.purchasePrice ?? undefined
            : payload.purchasePrice,
        purchaseChannel: payload.purchaseChannel ?? product.purchaseChannel ?? undefined,
        location: payload.location ?? product.location ?? undefined,
        isOpened: payload.isOpened ?? product.isOpened,
        stockInDate: this.parseDate(payload.stockInDate) ?? product.stockInDate,
        notes: payload.notes ?? product.notes ?? undefined,
        status: nextStatus,
        statusText: STATUS_TEXT[nextStatus],
      },
    });

    const delta = nextQuantity - Number(product.quantity);

    if (delta !== 0) {
      await this.prisma.stockLog.create({
        data: {
          familyId,
          productId: id,
          operatorName: "系统",
          action: "ADJUST",
          actionText: "库存调整",
          quantity: Math.abs(delta),
          unit: updated.unit,
          notes: payload.notes,
        },
      });
    }

    return { detail: this.toDetail(updated) };
  }

  async consume(id: string, payload: ConsumeProductDto): Promise<ConsumeProductResponse> {
    const familyId = await this.context.resolveFamilyId();
    const product = await this.findOwned(id);
    const current = Number(product.quantity);

    if (payload.quantity > current) {
      throw new BadRequestException("Consume quantity exceeds current stock");
    }

    const nextQuantity = Math.max(0, current - payload.quantity);
    const nextStatus = this.classify(nextQuantity);
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        quantity: nextQuantity,
        status: nextStatus,
        statusText: STATUS_TEXT[nextStatus],
      },
    });

    await this.prisma.stockLog.create({
      data: {
        familyId,
        productId: id,
        operatorName: "系统",
        action: this.consumeAction(payload.actionType),
        actionText: this.consumeText(payload.actionType),
        quantity: payload.quantity,
        unit: updated.unit,
        notes: payload.notes,
      },
    });

    return { detail: this.toDetail(updated) };
  }

  async archive(id: string): Promise<ArchiveProductResponse> {
    const familyId = await this.context.resolveFamilyId();
    const product = await this.findOwned(id);

    await this.prisma.product.update({
      where: { id },
      data: { archived: true },
    });

    await this.prisma.stockLog.create({
      data: {
        familyId,
        productId: id,
        operatorName: "系统",
        action: "ADJUST",
        actionText: "商品归档",
        quantity: 0,
        unit: product.unit,
      },
    });

    const remaining = await this.prisma.product.findMany({
      where: { familyId, archived: false },
      orderBy: { createdAt: "desc" },
    });

    return {
      archivedProductId: id,
      items: remaining.map((item) => this.toSummary(item)),
    };
  }

  private async findOwned(id: string): Promise<Product> {
    const familyId = await this.context.resolveFamilyId();
    const product = await this.prisma.product.findFirst({
      where: { id, familyId, archived: false },
    });

    if (!product) {
      throw new NotFoundException("Product Not Found");
    }

    return product;
  }

  private toSummary(product: Product): InventoryProductSummary {
    return {
      id: product.id,
      name: product.name,
      category: product.category,
      brand: product.brand ?? "未填写品牌",
      spec: product.spec ?? "未填写规格",
      quantity: Number(product.quantity),
      unit: product.unit,
      status: this.toApiStatus(product.status),
      statusText: product.statusText ?? STATUS_TEXT[product.status],
      image: product.image ?? this.imageForCategory(product.category),
      purchasePrice:
        product.purchasePrice !== null ? Number(product.purchasePrice) : undefined,
      purchaseChannel: product.purchaseChannel ?? undefined,
      location: product.location ?? undefined,
      isOpened: product.isOpened,
      stockInDate: product.stockInDate?.toISOString().slice(0, 10),
    };
  }

  private toDetail(product: Product): ProductDetailResponse {
    const summary = this.toSummary(product);
    return {
      item: { ...summary, tags: [product.category] },
      batches: [],
      consumptionTrend: [],
    };
  }

  private toApiStatus(status: StockStatus): InventoryStockStatus {
    if (status === "ENOUGH") return "enough";
    if (status === "LOW") return "low";
    return "empty";
  }

  private toDbStatus(status: InventoryStockStatus): StockStatus {
    if (status === "enough") return "ENOUGH";
    if (status === "low") return "LOW";
    return "EMPTY";
  }

  private classify(quantity: number): StockStatus {
    if (quantity <= 0) return "EMPTY";
    if (quantity < 3) return "LOW";
    return "ENOUGH";
  }

  private imageForCategory(category: string): string {
    if (category.includes("罐")) return "/static/products/ziwi.png";
    if (category.includes("砂")) return "/static/products/litter.png";
    return "/static/products/orijen.png";
  }

  private parseDate(value: string | undefined): Date | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private consumeAction(action: ConsumeProductDto["actionType"]) {
    if (action === "adjust") return "ADJUST" as const;
    if (action === "expired") return "EXPIRED" as const;
    if (action === "gift") return "GIFT" as const;
    return "STOCK_OUT" as const;
  }

  private consumeText(action: ConsumeProductDto["actionType"]) {
    if (action === "adjust") return "库存调整";
    if (action === "expired") return "过期损耗";
    if (action === "gift") return "客户赠送";
    return "日常消耗";
  }
}

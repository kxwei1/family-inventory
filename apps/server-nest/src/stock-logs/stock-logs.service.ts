import { Injectable } from "@nestjs/common";
import { Prisma, StockLogAction } from "@prisma/client";
import type {
  ProductStockLogResponse,
  ProductStockLogSummary,
  StockLogListResponse,
} from "@family-inventory/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { FamilyContextService } from "../common/family-context.service";

const stockLogInclude = {
  product: { select: { name: true, image: true, category: true, archived: true } },
} satisfies Prisma.StockLogInclude;

type StockLogWithProduct = Prisma.StockLogGetPayload<{ include: typeof stockLogInclude }>;

@Injectable()
export class StockLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: FamilyContextService,
  ) {}

  async listAll(): Promise<StockLogListResponse> {
    const familyId = await this.context.resolveFamilyId();
    const logs = await this.prisma.stockLog.findMany({
      where: { familyId },
      orderBy: { operatedAt: "desc" },
      include: stockLogInclude,
    });

    return { items: logs.map((log) => this.toSummary(log)) };
  }

  async listForProduct(productId: string): Promise<ProductStockLogResponse> {
    const familyId = await this.context.resolveFamilyId();
    const logs = await this.prisma.stockLog.findMany({
      where: { familyId, productId },
      orderBy: { operatedAt: "desc" },
      include: stockLogInclude,
    });

    return { items: logs.map((log) => this.toSummary(log)) };
  }

  private toSummary(log: StockLogWithProduct): ProductStockLogSummary {
    return {
      id: log.id,
      productId: log.productId,
      productName: log.product?.name,
      productImage: log.product?.image ?? undefined,
      productCategory: log.product?.category,
      productArchived: log.product?.archived,
      action: this.toApiAction(log.action),
      actionText: log.actionText,
      quantity: Number(log.quantity),
      unit: log.unit,
      unitPrice: log.unitPrice ? Number(log.unitPrice) : undefined,
      amount: log.amount ? Number(log.amount) : undefined,
      operatorName: log.operatorName,
      operatedAt: log.operatedAt.toISOString(),
      notes: log.notes ?? undefined,
    };
  }

  private toApiAction(action: StockLogAction): ProductStockLogSummary["action"] {
    switch (action) {
      case "STOCK_IN":
        return "stock_in";
      case "STOCK_OUT":
        return "stock_out";
      case "EXPIRED":
        return "expired";
      case "GIFT":
        return "gift";
      default:
        return "adjust";
    }
  }
}

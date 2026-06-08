import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ProductsService } from "./products.service";
import { createPrismaMock, PrismaMock } from "../../test/prisma.mock";
import { FamilyContextService } from "../common/family-context.service";

const FAMILY_ID = "fam_demo";

function buildContext(): FamilyContextService {
  return {
    resolveFamilyId: jest.fn().mockResolvedValue(FAMILY_ID),
  } as unknown as FamilyContextService;
}

function seedProduct(prisma: PrismaMock, overrides: Record<string, unknown> = {}) {
  prisma.product.rows.push({
    id: "prod_1",
    familyId: FAMILY_ID,
    archived: false,
    name: "渴望六种鱼猫粮",
    category: "猫粮",
    brand: "Orijen",
    spec: "5.4kg/袋",
    unit: "袋",
    quantity: 2,
    status: "ENOUGH",
    statusText: "充足",
    image: "/static/products/orijen.png",
    purchasePrice: null,
    purchaseChannel: null,
    location: null,
    isOpened: false,
    stockInDate: null,
    notes: null,
    ...overrides,
  });
}

describe("ProductsService", () => {
  let prisma: PrismaMock;
  let service: ProductsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ProductsService(
      prisma as unknown as ConstructorParameters<typeof ProductsService>[0],
      buildContext(),
    );
  });

  it("classifies a freshly created product based on its quantity", async () => {
    const response = await service.create({
      name: "皇家幼猫粮",
      category: "主粮",
      unit: "袋",
      quantity: 0,
    });

    expect(response.item.status).toBe("empty");
    expect(response.item.statusText).toBe("已耗尽");
    expect(prisma.stockLog.rows).toHaveLength(1);
    expect(prisma.stockLog.rows[0]).toMatchObject({
      action: "STOCK_IN",
      actionText: "新增入库",
      quantity: 0,
    });
  });

  it("rejects consume requests that exceed the current stock", async () => {
    seedProduct(prisma, { quantity: 1 });

    await expect(
      service.consume("prod_1", { quantity: 5, actionType: "daily" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("decrements stock and appends a STOCK_OUT log on consume", async () => {
    seedProduct(prisma, { quantity: 3 });

    const response = await service.consume("prod_1", {
      quantity: 2,
      actionType: "daily",
    });

    expect(response.detail.item.quantity).toBe(1);
    expect(prisma.stockLog.rows[0]).toMatchObject({
      action: "STOCK_OUT",
      actionText: "日常消耗",
      quantity: 2,
    });
  });

  it("upserts on stock-in instead of duplicating a product", async () => {
    seedProduct(prisma, { quantity: 1 });

    const response = await service.stockIn({
      name: "渴望六种鱼猫粮",
      category: "猫粮",
      brand: "Orijen",
      spec: "5.4kg/袋",
      unit: "袋",
      quantity: 3,
    });

    expect(prisma.product.rows).toHaveLength(1);
    expect(response.item.quantity).toBe(4);
    expect(prisma.stockLog.rows[0]).toMatchObject({
      actionText: "扫码入库",
      quantity: 3,
    });
  });

  it("404s when archive is called for an unknown product", async () => {
    await expect(service.archive("missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("removes archived products from the active list", async () => {
    seedProduct(prisma);

    await service.archive("prod_1");
    const list = await service.list({});

    expect(list.items).toHaveLength(0);
    expect(prisma.product.rows[0].archived).toBe(true);
  });
});

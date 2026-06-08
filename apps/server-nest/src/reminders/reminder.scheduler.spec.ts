import { ConfigService } from "@nestjs/config";
import { ReminderScheduler } from "./reminder.scheduler";
import { CacheService } from "../common/cache.service";
import { createPrismaMock, PrismaMock } from "../../test/prisma.mock";

const FAMILY_ID = "fam_demo";

function buildConfig(values: Record<string, string> = {}): ConfigService {
  const defaults: Record<string, string> = {
    SCHEDULE_ENABLED: "true",
    STOCK_LOW_THRESHOLD: "3",
    ...values,
  };
  return {
    get: jest.fn((key: string) => defaults[key]),
  } as unknown as ConfigService;
}

function buildCache(): CacheService {
  return {
    invalidateFamilyAggregates: jest.fn().mockResolvedValue(undefined),
  } as unknown as CacheService;
}

describe("ReminderScheduler", () => {
  let prisma: PrismaMock;
  let cache: CacheService;
  let scheduler: ReminderScheduler;

  beforeEach(() => {
    prisma = createPrismaMock();
    prisma.family.rows.push({
      id: FAMILY_ID,
      name: "幸福的小窝",
      archived: false,
      createdAt: new Date("2024-01-01"),
    });
    cache = buildCache();
    scheduler = new ReminderScheduler(
      prisma as unknown as ConstructorParameters<typeof ReminderScheduler>[0],
      cache,
      buildConfig(),
    );
  });

  it("creates a STOCK reminder for low-stock products", async () => {
    prisma.product.rows.push({
      id: "prod_low",
      familyId: FAMILY_ID,
      archived: false,
      name: "Low Food",
      brand: "Brand",
      unit: "袋",
      quantity: 1,
    });

    const touched = await scheduler.scanFamily(FAMILY_ID);

    expect(touched).toBe(1);
    expect(prisma.reminder.rows).toHaveLength(1);
    expect(prisma.reminder.rows[0]).toMatchObject({
      familyId: FAMILY_ID,
      category: "STOCK",
      tone: "WARNING",
      externalKey: "stock:prod_low",
    });
    expect(cache.invalidateFamilyAggregates).toHaveBeenCalledWith(FAMILY_ID);
  });

  it("flags an empty product as DANGER tone", async () => {
    prisma.product.rows.push({
      id: "prod_empty",
      familyId: FAMILY_ID,
      archived: false,
      name: "Out",
      unit: "包",
      quantity: 0,
    });

    await scheduler.scanFamily(FAMILY_ID);

    expect(prisma.reminder.rows[0].tone).toBe("DANGER");
    expect(prisma.reminder.rows[0].badgeText).toBe("已耗尽");
  });

  it("ignores products above the stock threshold", async () => {
    prisma.product.rows.push({
      id: "prod_ok",
      familyId: FAMILY_ID,
      archived: false,
      name: "Plenty",
      unit: "袋",
      quantity: 10,
    });

    const touched = await scheduler.scanFamily(FAMILY_ID);

    expect(touched).toBe(0);
    expect(prisma.reminder.rows).toHaveLength(0);
  });

  it("re-activates a previously dismissed reminder for the same problem", async () => {
    prisma.product.rows.push({
      id: "prod_low",
      familyId: FAMILY_ID,
      archived: false,
      name: "Low Food",
      unit: "袋",
      quantity: 1,
    });
    prisma.reminder.rows.push({
      id: "rem_existing",
      familyId: FAMILY_ID,
      productId: "prod_low",
      category: "STOCK",
      tone: "WARNING",
      title: "Old title",
      description: "Old desc",
      badgeText: "Old",
      timeText: "Old",
      primaryActionText: "x",
      externalKey: "stock:prod_low",
      dismissed: true,
    });

    await scheduler.scanFamily(FAMILY_ID);

    expect(prisma.reminder.rows).toHaveLength(1);
    expect(prisma.reminder.rows[0]).toMatchObject({
      id: "rem_existing",
      dismissed: false,
      title: "Low Food",
    });
  });

  it("flags batches expiring within 14 days as SOON", async () => {
    prisma.product.rows.push({
      id: "prod_food",
      familyId: FAMILY_ID,
      archived: false,
      name: "猫粮",
      unit: "袋",
      quantity: 5,
    });
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 5);
    prisma.productBatch.rows.push({
      id: "batch_1",
      productId: "prod_food",
      batchNo: "B1",
      quantity: 1,
      expiryDate: expiry,
      product: prisma.product.rows[0],
    });

    await scheduler.scanFamily(FAMILY_ID);

    expect(prisma.reminder.rows).toHaveLength(1);
    expect(prisma.reminder.rows[0]).toMatchObject({
      category: "SOON",
      tone: "WARNING",
      externalKey: "expiry:batch_1",
    });
  });

  it("flags expired batches as DANGER", async () => {
    prisma.product.rows.push({
      id: "prod_food",
      familyId: FAMILY_ID,
      archived: false,
      name: "猫粮",
      unit: "袋",
      quantity: 5,
    });
    const expired = new Date();
    expired.setDate(expired.getDate() - 1);
    prisma.productBatch.rows.push({
      id: "batch_old",
      productId: "prod_food",
      quantity: 1,
      expiryDate: expired,
      product: prisma.product.rows[0],
    });

    await scheduler.scanFamily(FAMILY_ID);

    expect(prisma.reminder.rows[0]).toMatchObject({
      category: "EXPIRED",
      tone: "DANGER",
      badgeText: "已过期",
    });
  });

  it("skips the run when SCHEDULE_ENABLED=false", async () => {
    const disabled = new ReminderScheduler(
      prisma as unknown as ConstructorParameters<typeof ReminderScheduler>[0],
      cache,
      buildConfig({ SCHEDULE_ENABLED: "false" }),
    );

    prisma.product.rows.push({
      id: "prod_low",
      familyId: FAMILY_ID,
      archived: false,
      name: "Low",
      unit: "袋",
      quantity: 0,
    });

    await disabled.runScheduledScan();
    expect(prisma.reminder.rows).toHaveLength(0);
  });
});

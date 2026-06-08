import { ConfigService } from "@nestjs/config";
import { CacheService } from "./cache.service";

function buildConfig(values: Record<string, string> = {}): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

describe("CacheService (memory backend)", () => {
  let service: CacheService;

  beforeEach(async () => {
    service = new CacheService(buildConfig());
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it("memoizes the factory inside the TTL window", async () => {
    const factory = jest.fn().mockResolvedValue({ count: 1 });

    const first = await service.wrap("k", 30, factory);
    const second = await service.wrap("k", 30, factory);

    expect(first).toEqual({ count: 1 });
    expect(second).toEqual({ count: 1 });
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("invalidate(prefix) drops every matching key", async () => {
    const factory = jest.fn().mockResolvedValue("hit");

    await service.wrap("dashboard:fam_a", 30, factory);
    await service.wrap("dashboard:fam_b", 30, factory);
    await service.wrap("statistics:fam_a:month", 30, factory);

    await service.invalidate("dashboard:");

    // dashboard keys recompute
    await service.wrap("dashboard:fam_a", 30, factory);
    await service.wrap("dashboard:fam_b", 30, factory);
    // statistics key still cached
    await service.wrap("statistics:fam_a:month", 30, factory);

    expect(factory).toHaveBeenCalledTimes(5);
  });

  it("invalidateFamilyAggregates clears dashboard + statistics for that family", async () => {
    const factory = jest.fn().mockResolvedValue("v");

    await service.wrap("dashboard:fam_a", 30, factory);
    await service.wrap("statistics:fam_a:month", 30, factory);
    await service.wrap("dashboard:fam_b", 30, factory);

    await service.invalidateFamilyAggregates("fam_a");

    await service.wrap("dashboard:fam_a", 30, factory);
    await service.wrap("statistics:fam_a:month", 30, factory);
    await service.wrap("dashboard:fam_b", 30, factory);

    // fam_a dashboard + statistics recomputed (2 misses), fam_b stayed cached
    expect(factory).toHaveBeenCalledTimes(5);
  });

  it("expires entries after TTL", async () => {
    jest.useFakeTimers();
    const factory = jest.fn().mockResolvedValue("v");

    try {
      await service.wrap("k", 1, factory);
      jest.setSystemTime(Date.now() + 1500);
      await service.wrap("k", 1, factory);
    } finally {
      jest.useRealTimers();
    }

    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("recomputes when the cached value can't be parsed", async () => {
    const factory = jest.fn().mockResolvedValueOnce("good").mockResolvedValueOnce("good");
    await service.wrap("k", 30, factory);

    // poison the cache via the test seam
    (service as unknown as {
      backend: { set(k: string, v: string, ttl: number): Promise<void> };
    }).backend.set("k", "{not-json", 30);

    await service.wrap("k", 30, factory);
    expect(factory).toHaveBeenCalledTimes(2);
  });
});

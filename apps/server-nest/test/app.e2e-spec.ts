import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { HttpExceptionFilter } from "../src/common/http-exception.filter";
import { PrismaService } from "../src/prisma/prisma.service";
import { CacheService } from "../src/common/cache.service";
import { ReminderScheduler } from "../src/reminders/reminder.scheduler";
import { NotificationDispatcher } from "../src/notifications/notification.dispatcher";
import { ReminderWebhookWorker } from "../src/notifications/reminder-webhook.worker";
import { createPrismaMock, PrismaMock } from "./prisma.mock";

describe("Family Inventory API (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaMock;
  let cache: CacheService;

  beforeAll(async () => {
    prisma = createPrismaMock();
    cache = {
      onModuleInit: jest.fn().mockResolvedValue(undefined),
      onModuleDestroy: jest.fn().mockResolvedValue(undefined),
      wrap: jest.fn(
        async (_key: string, _ttl: number, factory: () => Promise<unknown>) => factory(),
      ),
      invalidate: jest.fn().mockResolvedValue(undefined),
      invalidateFamilyAggregates: jest.fn().mockResolvedValue(undefined),
      resetForTest: jest.fn(),
    } as unknown as CacheService;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(CacheService)
      .useValue(cache)
      .overrideProvider(ReminderScheduler)
      .useValue({
        onModuleInit: jest.fn(),
        scanAllFamilies: jest.fn().mockResolvedValue(0),
        scanFamily: jest.fn().mockResolvedValue(0),
        runScheduledScan: jest.fn().mockResolvedValue(undefined),
      } as unknown as ReminderScheduler)
      .overrideProvider(NotificationDispatcher)
      .useValue({
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
        dispatchReminderUpdate: jest.fn().mockResolvedValue(null),
        deliverSync: jest.fn().mockResolvedValue(undefined),
        resolveWebhookUrl: jest.fn().mockResolvedValue(undefined),
        setFallbackWebhookUrl: jest.fn(),
      } as unknown as NotificationDispatcher)
      .overrideProvider(ReminderWebhookWorker)
      .useValue({
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
      } as unknown as ReminderWebhookWorker)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it("GET /health is public and returns ok", async () => {
    const response = await request(app.getHttpServer()).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ok: true, service: "family-inventory-server-nest" });
  });

  it("rejects missing-field login with 400 and the standardized error shape", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({});
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      statusCode: 400,
      path: "/api/auth/login",
    });
    expect(response.body.error).toBeDefined();
  });

  it("registers, logs in, accesses /me, and bounces a tampered token", async () => {
    const register = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({
        email: "e2e@example.com",
        password: "e2e-pass-1",
        name: "E2E Owner",
        familyName: "E2E Family",
      });
    expect(register.status).toBe(201);
    expect(register.body.user).toMatchObject({
      role: "admin",
      name: "E2E Owner",
    });
    const token = register.body.token as string;
    expect(typeof token).toBe("string");

    const me = await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.user).toMatchObject({ name: "E2E Owner" });

    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: "e2e@example.com", password: "e2e-pass-1" });
    expect(login.status).toBe(200);
    expect(login.body.user.memberId).toBe(register.body.user.memberId);

    const tampered = await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}.broken`);
    expect(tampered.status).toBe(401);
    expect(tampered.body).toMatchObject({ statusCode: 401 });
  });

  it("scopes data to the authenticated family", async () => {
    // Register two families with unique emails so this test is isolated from
    // earlier specs.
    const familyA = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({
        email: "scope-a@example.com",
        password: "secret123",
        name: "Owner A",
        familyName: "Scope Family A",
      });
    const familyB = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({
        email: "scope-b@example.com",
        password: "secret123",
        name: "Owner B",
        familyName: "Scope Family B",
      });

    expect(familyA.status).toBe(201);
    expect(familyB.status).toBe(201);
    expect(familyA.body.user.familyId).not.toBe(familyB.body.user.familyId);

    // Owner A creates a uniquely-named product
    const create = await request(app.getHttpServer())
      .post("/api/products")
      .set("Authorization", `Bearer ${familyA.body.token}`)
      .send({
        name: "Scope-test cat food",
        category: "猫粮",
        unit: "袋",
        quantity: 2,
      });
    expect(create.status).toBe(201);
    const createdProductId = create.body.item.id as string;

    // Owner A sees it
    const aList = await request(app.getHttpServer())
      .get("/api/products")
      .set("Authorization", `Bearer ${familyA.body.token}`);
    expect(aList.status).toBe(200);
    expect(aList.body.items.some((p: { id: string }) => p.id === createdProductId)).toBe(true);

    // Owner B does NOT see it
    const bList = await request(app.getHttpServer())
      .get("/api/products")
      .set("Authorization", `Bearer ${familyB.body.token}`);
    expect(bList.status).toBe(200);
    expect(bList.body.items.some((p: { id: string }) => p.id === createdProductId)).toBe(false);

    // And Owner B can't fetch the detail directly either
    const bDetail = await request(app.getHttpServer())
      .get(`/api/products/${createdProductId}`)
      .set("Authorization", `Bearer ${familyB.body.token}`);
    expect(bDetail.status).toBe(404);
  });

  it("invalidates the dashboard cache after a product mutation", async () => {
    const register = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({
        email: "cache-owner@example.com",
        password: "secret123",
        name: "Cache Owner",
        familyName: "Cache Family",
      });
    const auth = `Bearer ${register.body.token}`;

    (cache.invalidateFamilyAggregates as jest.Mock).mockClear();

    await request(app.getHttpServer())
      .post("/api/products")
      .set("Authorization", auth)
      .send({ name: "Cache product", category: "猫粮", unit: "袋", quantity: 1 });

    expect(cache.invalidateFamilyAggregates).toHaveBeenCalledWith(
      register.body.user.familyId,
    );

    // Dashboard goes through cache.wrap
    (cache.wrap as jest.Mock).mockClear();
    const dashboard = await request(app.getHttpServer())
      .get("/api/dashboard")
      .set("Authorization", auth);
    expect(dashboard.status).toBe(200);
    expect(cache.wrap).toHaveBeenCalledWith(
      `dashboard:${register.body.user.familyId}`,
      expect.any(Number),
      expect.any(Function),
    );
  });

  it("returns the standardized error shape for 404s", async () => {
    const register = await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({
        email: "missing-owner@example.com",
        password: "secret123",
        name: "Owner",
        familyName: "Missing Family",
      });

    const response = await request(app.getHttpServer())
      .get("/api/products/does-not-exist")
      .set("Authorization", `Bearer ${register.body.token}`);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      statusCode: 404,
      path: "/api/products/does-not-exist",
    });
  });
});

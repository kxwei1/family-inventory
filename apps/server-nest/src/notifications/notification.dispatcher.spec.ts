import { ConfigService } from "@nestjs/config";
import { NotificationDispatcher } from "./notification.dispatcher";
import { createPrismaMock, PrismaMock } from "../../test/prisma.mock";

const FAMILY_ID = "fam_demo";

function buildConfig(values: Record<string, string> = {}): ConfigService {
  return {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
}

describe("NotificationDispatcher (sync mode)", () => {
  let prisma: PrismaMock;
  let dispatcher: NotificationDispatcher;
  let originalFetch: typeof globalThis.fetch | undefined;

  beforeEach(async () => {
    prisma = createPrismaMock();
    prisma.family.rows.push({ id: FAMILY_ID, name: "Demo", archived: false });
    prisma.notificationSettings.rows.push({
      id: "ns1",
      familyId: FAMILY_ID,
      stockWarningEnabled: true,
      expiryReminderEnabled: true,
      webhookUrl: "https://example.test/webhooks/family-fam_demo",
      updatedAt: new Date(),
    });
    prisma.reminder.rows.push({
      id: "rem_1",
      familyId: FAMILY_ID,
      productId: null,
      category: "STOCK",
      tone: "WARNING",
      title: "Low food",
      description: "1 left",
      badgeText: "库存告急",
      timeText: "01-01 12:00",
      primaryActionText: "加入补货",
      externalKey: "stock:prod_low",
      dismissed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    originalFetch = globalThis.fetch;
    dispatcher = new NotificationDispatcher(
      prisma as unknown as ConstructorParameters<typeof NotificationDispatcher>[0],
      buildConfig({ AUTH_REQUIRED: "false" }),
    );

    // No REDIS_URL: dispatcher stays in sync mode.
    await dispatcher.onModuleInit();
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch as typeof globalThis.fetch;
    await dispatcher.onModuleDestroy();
  });

  it("posts to the family-configured webhook on dispatch", async () => {
    const fetchSpy = jest
      .fn()
      .mockResolvedValue({ ok: true, status: 204 } as unknown as Response);
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

    const result = await dispatcher.dispatchReminderUpdate({
      familyId: FAMILY_ID,
      reminderIds: ["rem_1"],
    });

    expect(result).toBeNull(); // sync mode returns null
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://example.test/webhooks/family-fam_demo");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body.familyId).toBe(FAMILY_ID);
    expect(body.reminders).toHaveLength(1);
    expect(body.reminders[0].id).toBe("rem_1");
  });

  it("returns early when no reminder ids are passed", async () => {
    const fetchSpy = jest.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

    const result = await dispatcher.dispatchReminderUpdate({
      familyId: FAMILY_ID,
      reminderIds: [],
    });

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("falls back to NOTIFICATION_WEBHOOK_URL when family has none configured", async () => {
    prisma.notificationSettings.rows[0].webhookUrl = null;
    dispatcher.setFallbackWebhookUrl("https://fallback.test/hook");

    const fetchSpy = jest
      .fn()
      .mockResolvedValue({ ok: true, status: 204 } as unknown as Response);
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

    await dispatcher.dispatchReminderUpdate({
      familyId: FAMILY_ID,
      reminderIds: ["rem_1"],
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://fallback.test/hook",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("silently ignores delivery failures so producers aren't blocked", async () => {
    const fetchSpy = jest.fn().mockRejectedValue(new Error("boom"));
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

    await expect(
      dispatcher.dispatchReminderUpdate({
        familyId: FAMILY_ID,
        reminderIds: ["rem_1"],
      }),
    ).resolves.toBeNull();
  });

  it("skips delivery when no webhook url is configured anywhere", async () => {
    prisma.notificationSettings.rows[0].webhookUrl = null;
    dispatcher.setFallbackWebhookUrl(undefined);

    const fetchSpy = jest.fn();
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;

    await dispatcher.dispatchReminderUpdate({
      familyId: FAMILY_ID,
      reminderIds: ["rem_1"],
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

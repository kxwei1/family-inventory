import { createServer } from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number.parseInt(process.env.PORT ?? "4000", 10);
const defaultDataFile = fileURLToPath(new URL("../data/store.json", import.meta.url));

const defaultStore = {
  products: [
    {
      id: "prod_orijen_fish_cat",
      name: "渴望六种鱼猫粮",
      category: "猫粮",
      brand: "Orijen",
      spec: "5.4kg/袋",
      quantity: 2,
      unit: "袋",
      status: "enough",
      statusText: "充足",
      image: "/static/products/orijen.png",
      purchasePrice: 429,
      purchaseChannel: "天猫",
      location: "客厅储物柜",
      isOpened: true,
      stockInDate: "2026-01-02",
    },
    {
      id: "prod_ziwi_beef_can",
      name: "巅峰牛肉主食罐",
      category: "罐头",
      brand: "Ziwi Peak",
      spec: "170g/罐",
      quantity: 3,
      unit: "罐",
      status: "low",
      statusText: "即将耗尽",
      image: "/static/products/ziwi.png",
      purchasePrice: 28.9,
      purchaseChannel: "京东",
      location: "厨房收纳架",
      isOpened: false,
      stockInDate: "2026-01-08",
    },
    {
      id: "prod_n1_tofu_litter",
      name: "N1豆腐猫砂 原味",
      category: "猫砂",
      brand: "N1",
      spec: "17.5L/包",
      quantity: 0,
      unit: "包",
      status: "empty",
      statusText: "已耗尽",
      image: "/static/products/litter.png",
      purchasePrice: 79,
      purchaseChannel: "线下门店",
      location: "阳台储物区",
      isOpened: true,
      stockInDate: "2026-01-12",
    },
    {
      id: "prod_royal_kitten_food",
      name: "皇家 (Royal Canin) 幼猫全价猫粮",
      category: "主粮",
      brand: "Royal Canin",
      spec: "2kg/袋",
      quantity: 2.5,
      unit: "kg",
      status: "low",
      statusText: "临期",
      image: "/static/products/royal-kitten-food.jpg",
      purchasePrice: 168,
      purchaseChannel: "宠物店",
      location: "储物柜顶层",
      isOpened: false,
      stockInDate: "2026-01-10",
    },
  ],
  profile: {
    id: "user_demo",
    name: "张三丰",
    familyName: "张三丰的家",
    avatar: "/static/family/zhangsan.png",
    stats: {
      petCount: 3,
      bookkeepingDays: 365,
      reminderCount: 8,
    },
  },
  pets: [
    {
      id: "pet_orange",
      name: "橘座",
      species: "猫",
      breed: "中华田园猫",
      ageText: "3岁",
      weightKg: 5.2,
      avatar: "/static/pets/orange-avatar.jpg",
      colorTone: "orange",
      tags: ["贪吃", "亲人", "爱睡觉"],
      diet: {
        staple: "皇家室内成猫粮",
        snack: "冻干鹌鹑",
      },
      inventoryEstimate: {
        foodDays: 12,
        litterDays: 5,
      },
      weightTrend: [
        { label: "08月", value: 60 },
        { label: "09月", value: 65 },
        { label: "10月", value: 62 },
        { label: "11月", value: 70 },
        { label: "12月", value: 80 },
      ],
      albumCount: 15,
      albumPhotos: [
        "/static/pets/orange-hero.jpg",
        "/static/pets/orange-play.jpg",
        "/static/pets/orange-sleep.jpg",
        "/static/pets/orange-window.jpg",
      ],
    },
    {
      id: "pet_white",
      name: "小白",
      species: "狗",
      breed: "比熊犬",
      ageText: "2岁",
      weightKg: 4.8,
      avatar: "/static/pets/white-avatar.jpg",
      colorTone: "white",
      tags: ["活泼", "黏人", "爱散步"],
      diet: {
        staple: "小型犬成犬粮",
        snack: "鸡肉冻干",
      },
      inventoryEstimate: {
        foodDays: 18,
        litterDays: 0,
      },
      weightTrend: [
        { label: "08月", value: 55 },
        { label: "09月", value: 58 },
        { label: "10月", value: 62 },
        { label: "11月", value: 64 },
        { label: "12月", value: 68 },
      ],
      albumCount: 8,
      albumPhotos: [
        "/static/pets/white-hero.jpg",
        "/static/pets/white-avatar.jpg",
      ],
    },
    {
      id: "pet_doubao",
      name: "豆包",
      species: "猫",
      breed: "英短",
      ageText: "4岁",
      weightKg: 6.1,
      avatar: "/static/pets/doubao-avatar.jpg",
      colorTone: "mint",
      tags: ["安静", "挑食"],
      diet: {
        staple: "低敏猫粮",
        snack: "猫条",
      },
      inventoryEstimate: {
        foodDays: 16,
        litterDays: 9,
      },
      weightTrend: [
        { label: "08月", value: 66 },
        { label: "09月", value: 64 },
        { label: "10月", value: 68 },
        { label: "11月", value: 70 },
        { label: "12月", value: 72 },
      ],
      albumCount: 6,
      albumPhotos: [
        "/static/pets/doubao-hero.jpg",
        "/static/pets/doubao-avatar.jpg",
      ],
    },
  ],
  statistics: {
    range: "month",
    totalExpense: 4285.5,
    trendRate: -12.4,
    recordCount: 32,
    averageDailyExpense: 142.85,
    trendSeries: [
      { label: "一", amount: 640, percent: 48, active: false },
      { label: "二", amount: 960, percent: 72, active: false },
      { label: "三", amount: 480, percent: 36, active: false },
      { label: "四", amount: 1280, percent: 96, active: true },
      { label: "五", amount: 770, percent: 58, active: false },
      { label: "六", amount: 1090, percent: 82, active: false },
    ],
    categoryRatio: [
      { category: "主粮", percent: 45 },
      { category: "医疗", percent: 25 },
      { category: "服务", percent: 20 },
      { category: "其他", percent: 10 },
    ],
    topExpenses: [
      { id: "exp_1", rank: 1, name: "皇家小型犬成犬粮 8kg", category: "主粮", date: "10月12日", amount: 389 },
      { id: "exp_2", rank: 2, name: "年度体检套餐", category: "医疗", date: "10月05日", amount: 299 },
      { id: "exp_3", rank: 3, name: "洗护美容服务", category: "服务", date: "10月20日", amount: 158 },
    ],
  },
  dashboard: {
    familyName: "我家的猫窝",
    greeting: "下午好，主人",
    avatar: "/static/profile/cat-avatar.png",
    alerts: [
      { id: "expiring", title: "即将过期", count: 2, icon: "calendar", tone: "danger" },
      { id: "warning", title: "库存告急", count: 1, icon: "warning", tone: "warning" },
      { id: "restock", title: "待补货", count: 3, icon: "cart", tone: "info" },
    ],
    categories: [
      { id: "food", name: "猫粮", icon: "shop", total: 12, unit: "袋", days: "约45天", tone: "mint" },
      { id: "can", name: "罐头", icon: "goods", total: 24, unit: "罐", days: "约12天", tone: "lake" },
      { id: "litter", name: "猫砂", icon: "layers", total: 3, unit: "包", days: "约8天", tone: "yellow" },
    ],
  },
  family: {
    id: "family_demo",
    name: "幸福的小窝",
    createdAt: "2023-05-12",
    memberCount: 3,
    address: {
      contactName: "张三",
      phone: "13800000000",
      region: "上海市 浦东新区",
      detail: "花木路 100 号 8 幢 1602",
      notes: "补货可放门口置物架",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    members: [
      {
        id: "member_zhangsan",
        name: "张三（我）",
        subtitle: "zhangsan@example.com",
        avatar: "/static/family/zhangsan.png",
        role: "admin",
        roleText: "管理员",
      },
      {
        id: "member_lisi",
        name: "李四",
        subtitle: "lisi@example.com",
        avatar: "/static/family/lisi.png",
        role: "member",
        roleText: "成员",
      },
      {
        id: "member_wangwu",
        name: "王五",
        subtitle: "临时访客",
        role: "guest",
        roleText: "访客",
      },
    ],
    settings: [
      { id: "rename", label: "修改家庭名称" },
      { id: "address", label: "家庭地址管理" },
      { id: "permissions", label: "权限与分享设置" },
    ],
  },
  notificationSettings: {
    stockWarningEnabled: true,
    expiryReminderEnabled: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  reminders: [
    {
      id: "reminder_orijen_expiring",
      category: "soon",
      title: "渴望六种鱼猫粮 5.4kg",
      description: "批次: L20230501 · 剩余 2 袋",
      badgeText: "3天后过期",
      timeText: "今天 09:00",
      productId: "prod_orijen_fish_cat",
      tone: "warning",
      primaryActionText: "立即处理",
    },
    {
      id: "reminder_deworm_expired",
      category: "expired",
      title: "拜宠清 驱虫药",
      description: "批次: B220911 · 剩余 1 盒",
      badgeText: "已过期",
      timeText: "昨天 14:30",
      tone: "danger",
      primaryActionText: "报废处理",
    },
  ],
  restockPlan: {
    estimatedCost: 342.5,
    lastRestockedText: "12天前（10月12日）",
    groups: [
      {
        id: "food",
        title: "主粮与零食",
        icon: "shop",
        items: [
          {
            id: "royal_food",
            name: "皇家成犬粮 2kg",
            description: "需补 1袋 · 约 ¥128",
            productId: "prod_royal_food",
            category: "狗粮",
            unit: "袋",
            suggestedQuantity: 1,
            image: "/static/products/orijen.png",
            selected: false,
          },
          {
            id: "chicken_snack",
            name: "冻干鸡肉粒",
            description: "需补 2罐 · 约 ¥79",
            productId: "prod_chicken_snack",
            category: "零食",
            unit: "罐",
            suggestedQuantity: 2,
            image: "/static/products/ziwi.png",
            selected: false,
          },
        ],
      },
      {
        id: "cleaning",
        title: "日用清洁",
        icon: "layers",
        items: [
          {
            id: "pee_pad",
            name: "除臭尿垫 M码",
            description: "需补 1包 · 约 ¥45",
            productId: "prod_pee_pad",
            category: "用品",
            unit: "包",
            suggestedQuantity: 1,
            icon: "layers",
            selected: false,
          },
        ],
      },
    ],
    recommendations: [
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
    ],
  },
  stockLogs: [
    {
      id: "log_orijen_initial",
      productId: "prod_orijen_fish_cat",
      action: "stock_in",
      actionText: "初始入库",
      quantity: 2,
      unit: "袋",
      operatorName: "张三",
      operatedAt: "2026-01-02T10:00:00.000Z",
      notes: "首批入库",
    },
    {
      id: "log_ziwi_initial",
      productId: "prod_ziwi_beef_can",
      action: "stock_in",
      actionText: "初始入库",
      quantity: 3,
      unit: "罐",
      operatorName: "张三",
      operatedAt: "2026-01-08T10:00:00.000Z",
    },
    {
      id: "log_litter_initial",
      productId: "prod_n1_tofu_litter",
      action: "stock_out",
      actionText: "消耗出库",
      quantity: 1,
      unit: "包",
      operatorName: "李四",
      operatedAt: "2026-01-12T10:00:00.000Z",
      notes: "最后一包已用完",
    },
    {
      id: "log_royal_initial",
      productId: "prod_royal_kitten_food",
      action: "stock_in",
      actionText: "初始入库",
      quantity: 2.5,
      unit: "kg",
      operatorName: "张三",
      operatedAt: "2026-01-10T10:00:00.000Z",
      notes: "临期批次待优先消耗",
    },
  ],
  completedRestockItemIds: [],
  dismissedReminderIds: [],
  removedRestockItemIds: [],
  customRestockItems: [],
};

const routes = new Map([
  ["/health", async () => ({ ok: true, service: "family-inventory-server" })],
  ["/api/dashboard", async (data) => buildDashboard(data)],
  ["/api/family", async (data) => data.family],
  ["/api/products", async (data) => ({ items: data.products })],
  ["/api/pets", async (data) => buildPetList(data)],
  ["/api/profile", async (data) => buildProfile(data)],
  ["/api/notification-settings", async (data) => data.notificationSettings],
  ["/api/reminders", async (data) => buildReminders(data)],
  ["/api/restock-plan", async (data) => buildRestockPlan(data)],
  ["/api/stock-logs", async (data) => buildStockLogs(data)],
  ["/api/statistics/summary", async (data) => data.statistics],
]);

export function createApiServer(options = {}) {
  const store = options.store ?? createJsonStore(options.dataFile ?? resolveDataFile());

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

      setCorsHeaders(response);

      if (request.method === "OPTIONS") {
        response.writeHead(204);
        response.end();
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/products") {
        const data = await store.read();

        sendJson(response, 200, buildProductList(data, readProductListFilters(url.searchParams)));
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/statistics/summary") {
        const data = await store.read();

        sendJson(response, 200, buildStatisticsSummary(data, readStatisticsRange(url.searchParams.get("range"))));
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/profile/update") {
        try {
          const payload = await readJsonBody(request);
          const result = await store.update((data) => updateProfile(data, payload));

          sendJson(response, 200, result);
        } catch (error) {
          sendJson(response, 400, {
            error: error instanceof Error ? error.message : "Invalid request body",
          });
        }
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/pets") {
        try {
          const payload = await readJsonBody(request);
          const result = await store.update((data) => {
            const item = createPet(payload);
            data.pets = [item, ...data.pets];

            return {
              item,
              pets: buildPetList(data),
            };
          });

          sendJson(response, 201, result);
        } catch (error) {
          sendJson(response, 400, {
            error: error instanceof Error ? error.message : "Invalid request body",
          });
        }
        return;
      }

      if (request.method === "POST" && url.pathname.startsWith("/api/pets/") && url.pathname.endsWith("/update")) {
        const id = decodeURIComponent(url.pathname.slice("/api/pets/".length, -"/update".length));

        try {
          const payload = await readJsonBody(request);
          const result = await store.update((data) => {
            const petIndex = data.pets.findIndex((item) => item.id === id);

            if (petIndex === -1) {
              const notFound = new Error("Pet Not Found");
              notFound.statusCode = 404;
              throw notFound;
            }

            data.pets[petIndex] = withPetUpdates(data.pets[petIndex], payload);

            return {
              item: data.pets[petIndex],
              pets: buildPetList(data, id),
            };
          });

          sendJson(response, 200, result);
        } catch (error) {
          sendJson(response, error.statusCode ?? 400, {
            error: error instanceof Error ? error.message : "Invalid request body",
            id,
          });
        }
        return;
      }

      if (request.method === "POST" && url.pathname.startsWith("/api/pets/") && url.pathname.endsWith("/album")) {
        const id = decodeURIComponent(url.pathname.slice("/api/pets/".length, -"/album".length));

        try {
          const payload = await readJsonBody(request);
          const image = readRequiredString(payload, "image");
          const result = await store.update((data) => addPetAlbumPhoto(data, id, image));

          sendJson(response, 200, result);
        } catch (error) {
          sendJson(response, error.statusCode ?? 400, {
            error: error instanceof Error ? error.message : "Invalid request body",
            id,
          });
        }
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/products/stock-in") {
        try {
          const payload = await readJsonBody(request);
          const result = await store.update((data) => stockInProduct(data, payload));

          sendJson(response, 200, result);
        } catch (error) {
          sendJson(response, 400, {
            error: error instanceof Error ? error.message : "Invalid request body",
          });
        }
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/products") {
        try {
          const payload = await readJsonBody(request);
          const result = await store.update((data) => {
            const item = createProduct(payload);
            data.products = [item, ...data.products];
            appendStockLog(data, {
              product: item,
              action: "stock_in",
              actionText: "新增入库",
              quantity: item.quantity,
              notes: readOptionalString(payload.notes),
            });
            return { item };
          });

          sendJson(response, 201, result);
        } catch (error) {
          sendJson(response, 400, {
            error: error instanceof Error ? error.message : "Invalid request body",
          });
        }
        return;
      }

      if (request.method === "POST" && url.pathname.startsWith("/api/products/") && url.pathname.endsWith("/consume")) {
        const id = decodeURIComponent(url.pathname.slice("/api/products/".length, -"/consume".length));

        try {
          const payload = await readJsonBody(request);
          const quantity = readConsumeQuantity(payload.quantity);
          const result = await store.update((data) => {
            const productIndex = data.products.findIndex((item) => item.id === id);

            if (productIndex === -1) {
              const notFound = new Error("Product Not Found");
              notFound.statusCode = 404;
              throw notFound;
            }

            if (quantity > data.products[productIndex].quantity) {
              const insufficientStock = new Error("Consume quantity exceeds current stock");
              insufficientStock.statusCode = 400;
              throw insufficientStock;
            }

            data.products[productIndex] = withQuantity(
              data.products[productIndex],
              Math.max(0, data.products[productIndex].quantity - quantity),
            );
            appendStockLog(data, {
              product: data.products[productIndex],
              action: stockLogActionForConsume(payload.actionType),
              actionText: stockLogTextForConsume(payload.actionType),
              quantity,
              notes: readOptionalString(payload.notes),
            });

            return { detail: buildProductDetail(data.products[productIndex]) };
          });

          sendJson(response, 200, result);
        } catch (error) {
          sendJson(response, error.statusCode ?? 400, {
            error: error instanceof Error ? error.message : "Invalid request body",
            id,
          });
        }
        return;
      }

      if (request.method === "POST" && url.pathname.startsWith("/api/products/") && url.pathname.endsWith("/update")) {
        const id = decodeURIComponent(url.pathname.slice("/api/products/".length, -"/update".length));

        try {
          const payload = await readJsonBody(request);
          const result = await store.update((data) => {
            const productIndex = data.products.findIndex((item) => item.id === id);

            if (productIndex === -1) {
              const notFound = new Error("Product Not Found");
              notFound.statusCode = 404;
              throw notFound;
            }

            const previousProduct = data.products[productIndex];
            const nextQuantity = payload.quantity === undefined
              ? previousProduct.quantity
              : readQuantity(payload.quantity);
            data.products[productIndex] = withQuantity(
              withProductMetadata(previousProduct, payload),
              nextQuantity,
            );
            appendAdjustmentStockLog(data, previousProduct, data.products[productIndex], readOptionalString(payload.notes));

            return { detail: buildProductDetail(data.products[productIndex]) };
          });

          sendJson(response, 200, result);
        } catch (error) {
          sendJson(response, error.statusCode ?? 400, {
            error: error instanceof Error ? error.message : "Invalid request body",
            id,
          });
        }
        return;
      }

      if (request.method === "POST" && url.pathname.startsWith("/api/products/") && url.pathname.endsWith("/archive")) {
        const id = decodeURIComponent(url.pathname.slice("/api/products/".length, -"/archive".length));

        try {
          const result = await store.update((data) => archiveProduct(data, id));

          sendJson(response, 200, result);
        } catch (error) {
          sendJson(response, error.statusCode ?? 400, {
            error: error instanceof Error ? error.message : "Invalid request body",
            id,
          });
        }
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/reminders/dismiss") {
        try {
          const payload = await readJsonBody(request);
          const itemId = readItemId(payload.itemId);
          const result = await store.update((data) => dismissReminderItem(data, itemId));

          sendJson(response, 200, result);
        } catch (error) {
          sendJson(response, error.statusCode ?? 400, {
            error: error instanceof Error ? error.message : "Invalid request body",
          });
        }
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/reminders/read-all") {
        try {
          const result = await store.update((data) => readAllReminderItems(data));

          sendJson(response, 200, result);
        } catch (error) {
          sendJson(response, error.statusCode ?? 400, {
            error: error instanceof Error ? error.message : "Invalid request body",
          });
        }
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/family/rename") {
        try {
          const payload = await readJsonBody(request);
          const name = readRequiredString(payload, "name");
          const result = await store.update((data) => renameFamily(data, name));

          sendJson(response, 200, result);
        } catch (error) {
          sendJson(response, error.statusCode ?? 400, {
            error: error instanceof Error ? error.message : "Invalid request body",
          });
        }
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/family/address") {
        try {
          const payload = await readJsonBody(request);
          const result = await store.update((data) => updateFamilyAddress(data, payload));

          sendJson(response, 200, result);
        } catch (error) {
          sendJson(response, error.statusCode ?? 400, {
            error: error instanceof Error ? error.message : "Invalid request body",
          });
        }
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/family/dissolve") {
        try {
          const result = await store.update((data) => dissolveFamily(data));

          sendJson(response, 200, result);
        } catch (error) {
          sendJson(response, error.statusCode ?? 400, {
            error: error instanceof Error ? error.message : "Invalid request body",
          });
        }
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/family/members/role") {
        try {
          const payload = await readJsonBody(request);
          const memberId = readItemId(payload.memberId);
          const role = readFamilyMemberRole(payload.role);
          const result = await store.update((data) => updateFamilyMemberRole(data, memberId, role));

          sendJson(response, 200, result);
        } catch (error) {
          sendJson(response, error.statusCode ?? 400, {
            error: error instanceof Error ? error.message : "Invalid request body",
          });
        }
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/family/members/remove") {
        try {
          const payload = await readJsonBody(request);
          const memberId = readItemId(payload.memberId);
          const result = await store.update((data) => removeFamilyMember(data, memberId));

          sendJson(response, 200, result);
        } catch (error) {
          sendJson(response, error.statusCode ?? 400, {
            error: error instanceof Error ? error.message : "Invalid request body",
          });
        }
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/notification-settings") {
        try {
          const payload = await readJsonBody(request);
          const result = await store.update((data) => updateNotificationSettings(data, payload));

          sendJson(response, 200, result);
        } catch (error) {
          sendJson(response, error.statusCode ?? 400, {
            error: error instanceof Error ? error.message : "Invalid request body",
          });
        }
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/restock-plan/remove") {
        try {
          const payload = await readJsonBody(request);
          const itemId = readItemId(payload.itemId);
          const result = await store.update((data) => removeRestockItem(data, itemId));

          sendJson(response, 200, result);
        } catch (error) {
          sendJson(response, error.statusCode ?? 400, {
            error: error instanceof Error ? error.message : "Invalid request body",
          });
        }
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/restock-plan/recommendations/add") {
        try {
          const payload = await readJsonBody(request);
          const recommendationId = readItemId(payload.recommendationId);
          const result = await store.update((data) => addRecommendationToRestockPlan(data, recommendationId));

          sendJson(response, 200, result);
        } catch (error) {
          sendJson(response, error.statusCode ?? 400, {
            error: error instanceof Error ? error.message : "Invalid request body",
          });
        }
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/restock-plan/products/add") {
        try {
          const payload = await readJsonBody(request);
          const productId = readItemId(payload.productId);
          const result = await store.update((data) => addProductToRestockPlan(data, productId));

          sendJson(response, 200, result);
        } catch (error) {
          sendJson(response, error.statusCode ?? 400, {
            error: error instanceof Error ? error.message : "Invalid request body",
          });
        }
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/restock-plan/complete") {
        try {
          const payload = await readJsonBody(request);
          const itemIds = readItemIds(payload.itemIds);
          const result = await store.update((data) => {
            const completedItemIds = applyRestockItems(data, itemIds);

            return {
              completedItemIds,
              items: data.products,
              restockPlan: buildRestockPlan(data),
            };
          });

          sendJson(response, 200, result);
        } catch (error) {
          sendJson(response, error.statusCode ?? 400, {
            error: error instanceof Error ? error.message : "Invalid request body",
          });
        }
        return;
      }

      if (request.method === "GET" && url.pathname.startsWith("/api/products/") && url.pathname.endsWith("/logs")) {
        const id = decodeURIComponent(url.pathname.slice("/api/products/".length, -"/logs".length));
        const data = await store.read();
        const product = data.products.find((item) => item.id === id);

        if (!product) {
          sendJson(response, 404, { error: "Product Not Found", id });
          return;
        }

        sendJson(response, 200, buildProductLogs(data, id));
        return;
      }

      if (request.method === "GET" && url.pathname.startsWith("/api/products/")) {
        const id = decodeURIComponent(url.pathname.replace("/api/products/", ""));
        const data = await store.read();
        const product = data.products.find((item) => item.id === id);

        if (!product) {
          sendJson(response, 404, { error: "Product Not Found", id });
          return;
        }

        sendJson(response, 200, buildProductDetail(product));
        return;
      }

      if (request.method !== "GET") {
        sendJson(response, 405, { error: "Method Not Allowed" });
        return;
      }

      const handler = routes.get(url.pathname);

      if (!handler) {
        sendJson(response, 404, { error: "Not Found", path: url.pathname });
        return;
      }

      const data = await store.read();
      sendJson(response, 200, await handler(data));
    } catch (error) {
      console.error(error);

      if (!response.headersSent) {
        sendJson(response, 500, { error: "Internal Server Error" });
        return;
      }

      response.destroy(error);
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createApiServer().listen(port, () => {
    console.log(`Family Inventory API listening on http://localhost:${port}`);
  });
}

function resolveDataFile() {
  return process.env.FAMILY_INVENTORY_DATA_FILE || defaultDataFile;
}

function createJsonStore(dataFile) {
  let cachePromise;
  let writeQueue = Promise.resolve();

  async function ensureLoaded() {
    if (!cachePromise) {
      cachePromise = loadStore(dataFile);
    }

    return cachePromise;
  }

  return {
    dataFile,
    async read() {
      await writeQueue;
      return cloneData(await ensureLoaded());
    },
    async update(mutator) {
      const operation = writeQueue.then(async () => {
        const workingData = cloneData(await ensureLoaded());
        const result = mutator(workingData);
        const nextData = normalizeStoreData(workingData);

        await writeStore(dataFile, nextData);
        cachePromise = Promise.resolve(nextData);

        return result;
      });

      writeQueue = operation.catch(() => {});

      return operation;
    },
  };
}

async function loadStore(dataFile) {
  try {
    const rawData = await readFile(dataFile, "utf8");
    return normalizeStoreData(JSON.parse(rawData));
  } catch (error) {
    if (error.code === "ENOENT") {
      const seededData = normalizeStoreData(defaultStore);
      await writeStore(dataFile, seededData);
      return seededData;
    }

    if (error instanceof SyntaxError) {
      throw new Error(`Store file contains invalid JSON: ${dataFile}`);
    }

    throw error;
  }
}

async function writeStore(dataFile, data) {
  await mkdir(dirname(dataFile), { recursive: true });

  const tempFile = `${dataFile}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempFile, JSON.stringify(data, null, 2), "utf8");
  await rename(tempFile, dataFile);
}

function normalizeStoreData(value) {
  const source = isRecord(value) ? value : {};
  const defaults = cloneData(defaultStore);
  const products = Array.isArray(source.products)
    ? source.products.map(normalizeProduct).filter(Boolean)
    : defaults.products;
  const stockLogs = Array.isArray(source.stockLogs)
    ? source.stockLogs.map(normalizeStockLog).filter(Boolean)
    : defaults.stockLogs.map(normalizeStockLog).filter(Boolean);

  return {
    products,
    pets: Array.isArray(source.pets)
      ? source.pets.map(normalizePet).filter(Boolean)
      : defaults.pets,
    profile: isRecord(source.profile) ? { ...defaults.profile, ...source.profile } : defaults.profile,
    statistics: isRecord(source.statistics) ? { ...defaults.statistics, ...source.statistics } : defaults.statistics,
    dashboard: isRecord(source.dashboard) ? { ...defaults.dashboard, ...source.dashboard } : defaults.dashboard,
    family: normalizeFamily(
      isRecord(source.family) ? { ...defaults.family, ...source.family } : defaults.family,
      defaults.family,
    ),
    notificationSettings: normalizeNotificationSettings(
      isRecord(source.notificationSettings) ? source.notificationSettings : defaults.notificationSettings,
      defaults.notificationSettings,
    ),
    reminders: Array.isArray(source.reminders)
      ? source.reminders.map(normalizeReminder).filter(Boolean)
      : defaults.reminders,
    restockPlan: isRecord(source.restockPlan) ? { ...defaults.restockPlan, ...source.restockPlan } : defaults.restockPlan,
    stockLogs: enrichStockLogs(stockLogs, products),
    completedRestockItemIds: Array.isArray(source.completedRestockItemIds)
      ? source.completedRestockItemIds.map(readPersistedString).filter(Boolean)
      : defaults.completedRestockItemIds,
    dismissedReminderIds: Array.isArray(source.dismissedReminderIds)
      ? source.dismissedReminderIds.map(readPersistedString).filter(Boolean)
      : defaults.dismissedReminderIds,
    removedRestockItemIds: Array.isArray(source.removedRestockItemIds)
      ? source.removedRestockItemIds.map(readPersistedString).filter(Boolean)
      : defaults.removedRestockItemIds,
    customRestockItems: Array.isArray(source.customRestockItems)
      ? source.customRestockItems.map(normalizeRestockItem).filter(Boolean)
      : defaults.customRestockItems,
  };
}

function normalizeProduct(product) {
  if (!isRecord(product)) {
    return null;
  }

  const id = readPersistedString(product.id);
  const name = readPersistedString(product.name);
  const category = readPersistedString(product.category);
  const unit = readPersistedString(product.unit);
  const quantity = Number(product.quantity);

  if (!id || !name || !category || !unit || !Number.isFinite(quantity)) {
    return null;
  }

  return withQuantity(
    {
      id,
      name,
      category,
      brand: readPersistedString(product.brand) || "未填写品牌",
      spec: readPersistedString(product.spec) || "未填写规格",
      quantity: 0,
      unit,
      status: "empty",
      statusText: "已耗尽",
      image: readPersistedString(product.image) || imageForCategory(category),
      purchasePrice: readPersistedNonNegativeNumber(product.purchasePrice),
      purchaseChannel: readPersistedString(product.purchaseChannel) || undefined,
      location: readPersistedString(product.location) || undefined,
      isOpened: readPersistedBoolean(product.isOpened, false),
      stockInDate: readPersistedString(product.stockInDate) || undefined,
    },
    Math.max(0, quantity),
  );
}

function normalizePet(pet) {
  if (!isRecord(pet)) {
    return null;
  }

  const id = readPersistedString(pet.id);
  const name = readPersistedString(pet.name);

  if (!id || !name) {
    return null;
  }

  const albumPhotos = normalizePetAlbumPhotos(pet.albumPhotos);

  return {
    id,
    name,
    species: readPersistedString(pet.species) || "猫",
    breed: readPersistedString(pet.breed) || "混血",
    ageText: readPersistedString(pet.ageText) || "未填写",
    weightKg: normalizePetWeight(pet.weightKg, 0),
    avatar: readPersistedString(pet.avatar) || undefined,
    colorTone: readPetColorTone(pet.colorTone),
    tags: normalizePetTags(pet.tags, []),
    diet: normalizePetDiet(pet.diet),
    inventoryEstimate: normalizePetInventoryEstimate(pet.inventoryEstimate),
    weightTrend: normalizePetWeightTrend(pet.weightTrend),
    albumCount: Math.max(normalizeNonNegativeInteger(pet.albumCount, albumPhotos.length), albumPhotos.length),
    albumPhotos,
  };
}

function readPetColorTone(value) {
  return ["orange", "white", "mint", "lake", "neutral"].includes(value) ? value : "neutral";
}

function normalizePetTags(value, fallback) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const tags = [...new Set(value.map(readPersistedString).filter(Boolean))];

  return tags.length ? tags.slice(0, 5) : fallback;
}

function normalizePetAlbumPhotos(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map(readPersistedString).filter(Boolean))].slice(0, 24);
}

function normalizePetDiet(value) {
  const diet = isRecord(value) ? value : {};

  return {
    staple: readPersistedString(diet.staple) || "未填写主粮",
    snack: readPersistedString(diet.snack) || "未填写零食",
  };
}

function normalizePetInventoryEstimate(value) {
  const estimate = isRecord(value) ? value : {};

  return {
    foodDays: normalizeNonNegativeInteger(estimate.foodDays, 0),
    litterDays: normalizeNonNegativeInteger(estimate.litterDays, 0),
  };
}

function normalizePetWeightTrend(value) {
  if (!Array.isArray(value)) {
    return [
      { label: "08月", value: 50 },
      { label: "09月", value: 58 },
      { label: "10月", value: 62 },
      { label: "11月", value: 68 },
      { label: "12月", value: 72 },
    ];
  }

  const points = value
    .filter(isRecord)
    .map((point) => ({
      label: readPersistedString(point.label),
      value: normalizeNonNegativeInteger(point.value, 0),
    }))
    .filter((point) => point.label);

  return points.length ? points.slice(-6) : normalizePetWeightTrend(null);
}

function normalizePetWeight(value, fallback) {
  const weight = Number(value);

  return Number.isFinite(weight) && weight >= 0 ? Math.round(weight * 10) / 10 : fallback;
}

function readPetWeight(value) {
  const weight = Number(value);

  if (!Number.isFinite(weight) || weight < 0) {
    throw new Error("weightKg must be a non-negative number");
  }

  return Math.round(weight * 10) / 10;
}

function normalizeNonNegativeInteger(value, fallback) {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0 ? Math.round(number) : fallback;
}

function normalizeStockLog(log) {
  if (!isRecord(log)) {
    return null;
  }

  const id = readPersistedString(log.id);
  const productId = readPersistedString(log.productId);
  const action = readStockLogAction(log.action);
  const actionText = readPersistedString(log.actionText);
  const quantity = Number(log.quantity);
  const unit = readPersistedString(log.unit);
  const operatorName = readPersistedString(log.operatorName);
  const operatedAt = readPersistedString(log.operatedAt);

  if (!id || !productId || !action || !actionText || !Number.isFinite(quantity) || !unit || !operatorName || !operatedAt) {
    return null;
  }

  return {
    id,
    productId,
    productName: readPersistedString(log.productName) || undefined,
    productImage: readPersistedString(log.productImage) || undefined,
    productCategory: readPersistedString(log.productCategory) || undefined,
    action,
    actionText,
    quantity: Math.max(0, quantity),
    unit,
    unitPrice: readPersistedNonNegativeNumber(log.unitPrice),
    amount: readPersistedNonNegativeNumber(log.amount),
    operatorName,
    operatedAt,
    notes: readPersistedString(log.notes) || undefined,
  };
}

function enrichStockLogs(stockLogs, products) {
  const productsById = new Map(products.map((product) => [product.id, product]));

  return stockLogs.map((log) => enrichStockLog(log, productsById.get(log.productId)));
}

function enrichStockLog(log, product) {
  if (!product) {
    return log;
  }

  const unitPrice = readPersistedNonNegativeNumber(log.unitPrice) ??
    (log.action === "stock_in" ? readPersistedNonNegativeNumber(product.purchasePrice) : undefined);
  const amount = readPersistedNonNegativeNumber(log.amount) ??
    (log.action === "stock_in" && unitPrice !== undefined
      ? roundCurrency(unitPrice * log.quantity)
      : undefined);

  return {
    ...log,
    productName: readPersistedString(log.productName) || product.name,
    productImage: readPersistedString(log.productImage) || product.image,
    productCategory: readPersistedString(log.productCategory) || product.category,
    unitPrice,
    amount,
  };
}

function normalizeReminder(reminder) {
  if (!isRecord(reminder)) {
    return null;
  }

  const id = readPersistedString(reminder.id);
  const category = readReminderCategory(reminder.category);
  const title = readPersistedString(reminder.title);
  const description = readPersistedString(reminder.description);
  const badgeText = readPersistedString(reminder.badgeText);
  const timeText = readPersistedString(reminder.timeText);
  const tone = readReminderTone(reminder.tone);
  const primaryActionText = readPersistedString(reminder.primaryActionText);

  if (!id || !category || !title || !description || !badgeText || !timeText || !tone || !primaryActionText) {
    return null;
  }

  return {
    id,
    category,
    title,
    description,
    badgeText,
    timeText,
    productId: readPersistedString(reminder.productId) || undefined,
    tone,
    primaryActionText,
    secondaryActionText: readPersistedString(reminder.secondaryActionText) || undefined,
  };
}

function normalizeNotificationSettings(settings, defaults) {
  return {
    stockWarningEnabled: typeof settings.stockWarningEnabled === "boolean"
      ? settings.stockWarningEnabled
      : defaults.stockWarningEnabled,
    expiryReminderEnabled: typeof settings.expiryReminderEnabled === "boolean"
      ? settings.expiryReminderEnabled
      : defaults.expiryReminderEnabled,
    updatedAt: readPersistedString(settings.updatedAt) || defaults.updatedAt,
  };
}

function normalizeFamily(family, defaults) {
  const members = Array.isArray(family.members) ? family.members : defaults.members;

  return {
    ...family,
    members,
    memberCount: members.length,
    address: normalizeFamilyAddress(
      isRecord(family.address) ? family.address : defaults.address,
      defaults.address,
    ),
    settings: normalizeFamilySettings(family.settings, defaults.settings),
  };
}

function normalizeFamilySettings(settings, defaults) {
  const incoming = Array.isArray(settings) ? settings.filter(isRecord) : [];

  return defaults.map((defaultSetting) => {
    const matched = incoming.find((setting) => setting.id === defaultSetting.id);
    const label = readPersistedString(matched?.label);

    return {
      id: defaultSetting.id,
      label: label || defaultSetting.label,
    };
  });
}

function normalizeFamilyAddress(address, defaults) {
  return {
    contactName: readPersistedString(address.contactName) || defaults.contactName,
    phone: readPersistedString(address.phone) || defaults.phone,
    region: readPersistedString(address.region) || defaults.region,
    detail: readPersistedString(address.detail) || defaults.detail,
    notes: readPersistedString(address.notes) || undefined,
    updatedAt: readPersistedString(address.updatedAt) || defaults.updatedAt,
  };
}

function normalizeRestockItem(item) {
  if (!isRecord(item)) {
    return null;
  }

  const id = readPersistedString(item.id);
  const name = readPersistedString(item.name);
  const description = readPersistedString(item.description);

  if (!id || !name || !description) {
    return null;
  }

  return {
    id,
    name,
    description,
    productId: readPersistedString(item.productId) || undefined,
    category: readPersistedString(item.category) || undefined,
    unit: readPersistedString(item.unit) || undefined,
    suggestedQuantity: readSuggestedQuantity(item.suggestedQuantity),
    image: readPersistedString(item.image) || undefined,
    icon: readPersistedString(item.icon) || undefined,
    sourceRecommendationId: readPersistedString(item.sourceRecommendationId) || undefined,
    selected: Boolean(item.selected),
  };
}

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 100_000) {
        request.destroy();
        reject(new Error("Request body is too large"));
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Request body must be valid JSON"));
      }
    });
    request.on("error", reject);
  });
}

function buildPetList(data, selectedPetId) {
  return {
    items: data.pets,
    selectedPetId: selectedPetId || data.pets[0]?.id,
  };
}

function createPet(payload) {
  if (!isRecord(payload)) {
    throw new Error("Pet payload is required");
  }

  const name = readRequiredString(payload, "name");
  const species = readOptionalString(payload.species) || "猫";
  const breed = readOptionalString(payload.breed) || "混血";
  const weightKg = payload.weightKg === undefined ? 0 : readPetWeight(payload.weightKg);

  return normalizePet({
    id: `pet_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    species,
    breed,
    ageText: readOptionalString(payload.ageText) || "未填写",
    weightKg,
    colorTone: species.includes("狗") ? "lake" : "mint",
    tags: normalizePetTags(payload.tags, ["新成员"]),
    diet: normalizePetDiet(payload.diet),
    inventoryEstimate: {
      foodDays: 0,
      litterDays: 0,
    },
    albumCount: 0,
    albumPhotos: [],
  });
}

function withPetUpdates(pet, payload) {
  if (!isRecord(payload)) {
    throw new Error("Pet payload is required");
  }

  return normalizePet({
    ...pet,
    name: readProductUpdateString(payload, "name", pet.name, { required: true }),
    species: readProductUpdateString(payload, "species", pet.species, { required: true }),
    breed: readProductUpdateString(payload, "breed", pet.breed, { required: true }),
    ageText: readProductUpdateString(payload, "ageText", pet.ageText),
    weightKg: Object.prototype.hasOwnProperty.call(payload, "weightKg")
      ? readPetWeight(payload.weightKg)
      : pet.weightKg,
    tags: Object.prototype.hasOwnProperty.call(payload, "tags")
      ? normalizePetTags(payload.tags, pet.tags)
      : pet.tags,
    diet: Object.prototype.hasOwnProperty.call(payload, "diet")
      ? withPetDietUpdates(pet.diet, payload.diet)
      : pet.diet,
  });
}

function withPetDietUpdates(currentDiet, payloadDiet) {
  const diet = isRecord(payloadDiet) ? payloadDiet : {};

  return {
    staple: Object.prototype.hasOwnProperty.call(diet, "staple")
      ? readOptionalString(diet.staple) || currentDiet.staple
      : currentDiet.staple,
    snack: Object.prototype.hasOwnProperty.call(diet, "snack")
      ? readOptionalString(diet.snack) || currentDiet.snack
      : currentDiet.snack,
  };
}

function addPetAlbumPhoto(data, petId, image) {
  const petIndex = data.pets.findIndex((item) => item.id === petId);

  if (petIndex === -1) {
    const notFound = new Error("Pet Not Found");
    notFound.statusCode = 404;
    throw notFound;
  }

  const pet = data.pets[petIndex];
  const albumPhotos = [
    image,
    ...normalizePetAlbumPhotos(pet.albumPhotos).filter((item) => item !== image),
  ].slice(0, 24);

  data.pets[petIndex] = normalizePet({
    ...pet,
    albumPhotos,
    albumCount: albumPhotos.length,
  });

  return {
    item: data.pets[petIndex],
    pets: buildPetList(data, petId),
  };
}

function createProduct(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Product payload is required");
  }

  const name = readRequiredString(payload, "name");
  const category = readRequiredString(payload, "category");
  const unit = readRequiredString(payload, "unit");
  const quantity = readQuantity(payload.quantity);

  return withQuantity(
    {
      id: `prod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      category,
      brand: readOptionalString(payload.brand) || "未填写品牌",
      spec: readOptionalString(payload.spec) || "未填写规格",
      quantity: 0,
      unit,
      status: "empty",
      statusText: "已耗尽",
      image: readOptionalString(payload.image) || imageForCategory(category),
      purchasePrice: readOptionalNonNegativeNumber(payload.purchasePrice, "purchasePrice"),
      purchaseChannel: readOptionalString(payload.purchaseChannel) || undefined,
      location: readOptionalString(payload.location) || undefined,
      isOpened: readOptionalBoolean(payload.isOpened, "isOpened") ?? false,
      stockInDate: readOptionalString(payload.stockInDate) || new Date().toISOString().slice(0, 10),
    },
    quantity,
  );
}

function stockInProduct(data, payload) {
  const incomingProduct = createProduct(payload);
  const productIndex = data.products.findIndex((product) =>
    isSameStockInProduct(product, incomingProduct),
  );

  if (productIndex >= 0) {
    data.products[productIndex] = withQuantity(
      withStockInMetadata(data.products[productIndex], incomingProduct),
      data.products[productIndex].quantity + incomingProduct.quantity,
    );
    appendStockLog(data, {
      product: data.products[productIndex],
      action: "stock_in",
      actionText: "扫码入库",
      quantity: incomingProduct.quantity,
      notes: readOptionalString(payload.notes),
    });

    return {
      item: data.products[productIndex],
    };
  }

  data.products = [incomingProduct, ...data.products];
  appendStockLog(data, {
    product: incomingProduct,
    action: "stock_in",
    actionText: "扫码入库",
    quantity: incomingProduct.quantity,
    notes: readOptionalString(payload.notes),
  });

  return {
    item: incomingProduct,
  };
}

function withStockInMetadata(product, incomingProduct) {
  return {
    ...product,
    image: incomingProduct.image || product.image,
    purchasePrice: incomingProduct.purchasePrice ?? product.purchasePrice,
    purchaseChannel: incomingProduct.purchaseChannel || product.purchaseChannel,
    location: incomingProduct.location || product.location,
    isOpened: incomingProduct.isOpened ?? product.isOpened,
    stockInDate: incomingProduct.stockInDate || product.stockInDate,
  };
}

function isSameStockInProduct(product, incomingProduct) {
  return productIdentityKey(product) === productIdentityKey(incomingProduct);
}

function productIdentityKey(product) {
  return [
    product.name,
    product.brand,
    product.category,
    product.unit,
  ]
    .map(normalizeProductIdentity)
    .join("|");
}

function normalizeProductIdentity(value) {
  return readPersistedString(value).toLocaleLowerCase("zh-CN");
}

function withQuantity(product, quantity) {
  return {
    ...product,
    quantity,
    status: statusForQuantity(quantity, product),
    statusText: statusTextForQuantity(quantity, product),
  };
}

function withProductMetadata(product, payload) {
  if (!isRecord(payload)) {
    throw new Error("Product payload is required");
  }

  return {
    ...product,
    name: readProductUpdateString(payload, "name", product.name, { required: true }),
    category: readProductUpdateString(payload, "category", product.category, { required: true }),
    brand: readProductUpdateString(payload, "brand", product.brand),
    spec: readProductUpdateString(payload, "spec", product.spec),
    unit: readProductUpdateString(payload, "unit", product.unit, { required: true }),
    purchasePrice: Object.prototype.hasOwnProperty.call(payload, "purchasePrice")
      ? readOptionalNonNegativeNumber(payload.purchasePrice, "purchasePrice")
      : product.purchasePrice,
    purchaseChannel: readProductOptionalUpdateString(payload, "purchaseChannel", product.purchaseChannel),
    location: readProductOptionalUpdateString(payload, "location", product.location),
    isOpened: Object.prototype.hasOwnProperty.call(payload, "isOpened")
      ? readOptionalBoolean(payload.isOpened, "isOpened") ?? false
      : product.isOpened,
    stockInDate: readProductOptionalUpdateString(payload, "stockInDate", product.stockInDate),
  };
}

function buildProductList(data, filters = {}) {
  return {
    items: filterProducts(data.products, filters),
  };
}

function readProductListFilters(searchParams) {
  return {
    query: readOptionalString(searchParams.get("q") ?? searchParams.get("query")),
    category: readOptionalString(searchParams.get("category")),
    status: readProductListStatus(searchParams.get("status")),
  };
}

function filterProducts(products, filters) {
  const query = readOptionalString(filters.query).toLocaleLowerCase("zh-CN");
  const category = readOptionalString(filters.category);
  const status = readProductListStatus(filters.status);

  return products.filter((product) => {
    if (category && category !== "all" && product.category !== category) {
      return false;
    }

    if (status && product.status !== status) {
      return false;
    }

    if (!query) {
      return true;
    }

    return [
      product.name,
      product.brand,
      product.category,
      product.spec,
      product.purchaseChannel,
      product.location,
    ]
      .join(" ")
      .toLocaleLowerCase("zh-CN")
      .includes(query);
  });
}

function readStatisticsRange(value) {
  const range = readOptionalString(value);

  return range === "week" || range === "year" ? range : "month";
}

function buildStatisticsSummary(data, range) {
  const dynamicSummary = buildDynamicStatisticsSummary(data, range);

  if (dynamicSummary) {
    return dynamicSummary;
  }

  if (range === "week") {
    return {
      range,
      totalExpense: 986.8,
      trendRate: -4.8,
      recordCount: 8,
      averageDailyExpense: 140.97,
      trendSeries: [
        { label: "一", amount: 120, percent: 48, active: false },
        { label: "二", amount: 155, percent: 62, active: false },
        { label: "三", amount: 90, percent: 36, active: false },
        { label: "四", amount: 230, percent: 92, active: true },
        { label: "五", amount: 145, percent: 58, active: false },
        { label: "六", amount: 175, percent: 70, active: false },
        { label: "日", amount: 105, percent: 42, active: false },
      ],
      categoryRatio: [
        { category: "主粮", percent: 52 },
        { category: "零食", percent: 18 },
        { category: "用品", percent: 17 },
        { category: "其他", percent: 13 },
      ],
      topExpenses: [
        { id: "week_exp_1", rank: 1, name: "渴望六种鱼猫粮 1.8kg", category: "主粮", date: "06月02日", amount: 289 },
        { id: "week_exp_2", rank: 2, name: "冻干零食补充装", category: "零食", date: "06月01日", amount: 126 },
        { id: "week_exp_3", rank: 3, name: "除臭喷雾", category: "用品", date: "05月30日", amount: 69.8 },
      ],
    };
  }

  if (range === "year") {
    return {
      range,
      totalExpense: 48692.4,
      trendRate: 8.6,
      recordCount: 366,
      averageDailyExpense: 133.4,
      trendSeries: [
        { label: "Q1", amount: 11200, percent: 78, active: false },
        { label: "Q2", amount: 12600, percent: 88, active: true },
        { label: "Q3", amount: 9200, percent: 64, active: false },
        { label: "Q4", amount: 7600, percent: 52, active: false },
      ],
      categoryRatio: [
        { category: "主粮", percent: 42 },
        { category: "医疗", percent: 24 },
        { category: "用品", percent: 20 },
        { category: "其他", percent: 14 },
      ],
      topExpenses: [
        { id: "year_exp_1", rank: 1, name: "年度体检与疫苗套餐", category: "医疗", date: "03月18日", amount: 1299 },
        { id: "year_exp_2", rank: 2, name: "自动喂食器升级款", category: "用品", date: "04月09日", amount: 899 },
        { id: "year_exp_3", rank: 3, name: "大包装主粮组合", category: "主粮", date: "01月22日", amount: 728 },
      ],
    };
  }

  return {
    ...data.statistics,
    range: "month",
  };
}

function buildDynamicStatisticsSummary(data, range) {
  const expenseRecords = buildExpenseRecords(data, range);

  if (!expenseRecords.length) {
    return null;
  }

  const totalExpense = roundCurrency(expenseRecords.reduce((sum, record) => sum + record.amount, 0));
  const previousTotal = roundCurrency(
    buildExpenseRecords(data, range, previousRangeAnchor(range)).reduce((sum, record) => sum + record.amount, 0),
  );
  const categoryTotals = new Map();

  for (const record of expenseRecords) {
    categoryTotals.set(record.category, (categoryTotals.get(record.category) ?? 0) + record.amount);
  }

  const categoryRatio = [...categoryTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({
      category,
      percent: Math.round((amount / totalExpense) * 100),
    }));

  return {
    range,
    totalExpense,
    trendRate: previousTotal > 0
      ? Number((((totalExpense - previousTotal) / previousTotal) * 100).toFixed(1))
      : 0,
    recordCount: expenseRecords.length,
    averageDailyExpense: roundCurrency(totalExpense / statisticsRangeDayCount(range)),
    trendSeries: buildTrendSeries(expenseRecords, range),
    categoryRatio: categoryRatio.length ? categoryRatio : [{ category: "其他", percent: 100 }],
    topExpenses: expenseRecords
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((record, index) => ({
        id: record.id,
        productId: record.productId,
        productImage: record.productImage,
        productArchived: record.productArchived,
        rank: index + 1,
        name: record.name,
        category: record.category,
        date: formatStatisticsDate(record.operatedAt),
        amount: record.amount,
      })),
  };
}

function buildExpenseRecords(data, range, now = new Date()) {
  const productsById = new Map(data.products.map((product) => [product.id, product]));

  return (data.stockLogs ?? [])
    .filter((log) => log.action === "stock_in")
    .map((log) => {
      const product = productsById.get(log.productId);
      const quantity = readPersistedNonNegativeNumber(log.quantity);
      const operatedAt = new Date(log.operatedAt);
      const unitPrice = readPersistedNonNegativeNumber(log.unitPrice) ??
        readPersistedNonNegativeNumber(product?.purchasePrice);
      const amount = readPersistedNonNegativeNumber(log.amount) ??
        (unitPrice === undefined || quantity === undefined ? undefined : roundCurrency(unitPrice * quantity));
      const name = readPersistedString(log.productName) || product?.name;
      const category = readPersistedString(log.productCategory) || product?.category;

      if (!name || !category || amount === undefined || Number.isNaN(operatedAt.getTime())) {
        return null;
      }

      if (!isInStatisticsRange(operatedAt, range, now)) {
        return null;
      }

      if (amount <= 0) {
        return null;
      }

      return {
        id: log.id,
        productId: log.productId,
        productImage: readPersistedString(log.productImage) || product?.image,
        productArchived: Boolean(log.productArchived),
        name,
        category: toExpenseCategory(category),
        operatedAt,
        amount,
      };
    })
    .filter(Boolean);
}

function buildTrendSeries(records, range, now = new Date()) {
  const buckets = createTrendBuckets(range, now);

  for (const record of records) {
    const bucket = buckets.find((item) =>
      record.operatedAt >= item.start && record.operatedAt <= item.end,
    );

    if (bucket) {
      bucket.amount += record.amount;
    }
  }

  const maxAmount = Math.max(0, ...buckets.map((bucket) => bucket.amount));
  let activeAssigned = false;

  return buckets.map((bucket) => {
    const amount = roundCurrency(bucket.amount);
    const active = !activeAssigned && maxAmount > 0 && bucket.amount === maxAmount;

    if (active) {
      activeAssigned = true;
    }

    return {
      label: bucket.label,
      amount,
      percent: maxAmount > 0 ? Math.max(8, Math.round((bucket.amount / maxAmount) * 100)) : 0,
      active,
    };
  });
}

function createTrendBuckets(range, now) {
  if (range === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, index) => {
      const dayStart = new Date(start);
      dayStart.setDate(start.getDate() + index);
      const dayEnd = endOfDay(dayStart);

      return {
        label: weekdayLabel(dayStart),
        start: dayStart,
        end: dayEnd,
        amount: 0,
      };
    });
  }

  if (range === "year") {
    return Array.from({ length: 4 }, (_, index) => {
      const start = new Date(now.getFullYear(), index * 3, 1);
      const end = new Date(now.getFullYear(), index * 3 + 3, 0, 23, 59, 59, 999);

      return {
        label: `Q${index + 1}`,
        start,
        end,
        amount: 0,
      };
    });
  }

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  return Array.from({ length: 6 }, (_, index) => {
    const startDay = Math.floor((index * daysInMonth) / 6) + 1;
    const endDay = Math.floor(((index + 1) * daysInMonth) / 6);
    const start = new Date(now.getFullYear(), now.getMonth(), startDay);
    const end = new Date(now.getFullYear(), now.getMonth(), endDay, 23, 59, 59, 999);

    return {
      label: ["一", "二", "三", "四", "五", "六"][index],
      start,
      end,
      amount: 0,
    };
  });
}

function endOfDay(date) {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

function weekdayLabel(date) {
  return ["日", "一", "二", "三", "四", "五", "六"][date.getDay()];
}

function previousRangeAnchor(range) {
  const now = new Date();

  if (range === "week") {
    now.setDate(now.getDate() - 7);
    return now;
  }

  if (range === "year") {
    now.setFullYear(now.getFullYear() - 1);
    return now;
  }

  now.setMonth(now.getMonth() - 1);
  return now;
}

function isInStatisticsRange(date, range, now) {
  if (range === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return date >= start && date <= now;
  }

  if (range === "year") {
    return date.getFullYear() === now.getFullYear();
  }

  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function statisticsRangeDayCount(range) {
  if (range === "week") return 7;

  const now = new Date();

  if (range === "year") {
    const start = new Date(now.getFullYear(), 0, 1);
    return Math.max(1, Math.floor((now.getTime() - start.getTime()) / 86_400_000) + 1);
  }

  return now.getDate();
}

function toExpenseCategory(category) {
  if (category.includes("粮")) return "主粮";
  if (category.includes("罐") || category.includes("零食")) return "零食";
  if (category.includes("砂") || category.includes("用品") || category.includes("保健")) return "用品";
  return "其他";
}

function formatStatisticsDate(date) {
  return `${String(date.getMonth() + 1).padStart(2, "0")}月${String(date.getDate()).padStart(2, "0")}日`;
}

function roundCurrency(value) {
  return Number(value.toFixed(2));
}

function buildDashboard(data) {
  const lowCount = data.products.filter((product) => product.quantity > 0 && isLowStockProduct(product)).length;
  const restockCount = data.products.filter(isLowStockProduct).length;

  return {
    ...data.dashboard,
    alerts: data.dashboard.alerts.map((alert) => {
      if (alert.id === "warning") return { ...alert, count: lowCount };
      if (alert.id === "restock") return { ...alert, count: restockCount };
      return alert;
    }),
    categories: data.dashboard.categories.map((category) => {
      const products = data.products.filter((product) => productMatchesCategory(product, category.name));

      if (!products.length) {
        return category;
      }

      const total = products.reduce((sum, product) => sum + product.quantity, 0);

      return {
        ...category,
        total,
        unit: products[0].unit,
        days: estimateDaysText(category.name, total),
      };
    }),
  };
}

function buildProfile(data) {
  const reminders = buildReminders(data);

  return {
    ...data.profile,
    stats: {
      ...data.profile.stats,
      petCount: data.pets.length,
      reminderCount: reminders.summary.total,
    },
  };
}

function updateProfile(data, payload) {
  if (!isRecord(payload)) {
    throw new Error("Profile payload is required");
  }

  data.profile = {
    ...data.profile,
    name: readProductUpdateString(payload, "name", data.profile.name, { required: true }),
    avatar: readProductUpdateString(payload, "avatar", data.profile.avatar),
  };

  return {
    profile: buildProfile(data),
  };
}

function buildReminderItems(data) {
  const stockReminders = data.products
    .filter(isLowStockProduct)
    .map((product) => ({
      id: `reminder_stock_${product.id}`,
      category: "stock",
      title: product.name,
      description: `当前库存: ${product.quantity} ${product.unit}`,
      badgeText: product.quantity <= 0 ? "已耗尽" : "库存预警",
      timeText: "刚刚",
      productId: product.id,
      tone: product.quantity <= 0 ? "danger" : "info",
      primaryActionText: "补货申请",
      secondaryActionText: "忽略",
    }));
  const staticIds = new Set(data.reminders.map((item) => item.id));
  const generated = stockReminders.filter((item) => !staticIds.has(item.id));

  return [...data.reminders, ...generated];
}

function buildReminders(data) {
  const dismissedIds = new Set(data.dismissedReminderIds ?? []);
  const items = buildReminderItems(data).filter(
    (item) => !dismissedIds.has(item.id) && isReminderEnabled(item, data.notificationSettings),
  );

  return summarizeReminders(items);
}

function isReminderEnabled(item, settings) {
  if (item.category === "stock") {
    return settings.stockWarningEnabled !== false;
  }

  return settings.expiryReminderEnabled !== false;
}

function summarizeReminders(items) {
  return {
    items,
    summary: {
      total: items.length,
      soon: items.filter((item) => item.category === "soon").length,
      expired: items.filter((item) => item.category === "expired").length,
      stock: items.filter((item) => item.category === "stock").length,
    },
  };
}

function dismissReminderItem(data, itemId) {
  const items = buildReminders(data).items;

  if (!items.some((item) => item.id === itemId)) {
    const error = new Error("Reminder Not Found");
    error.statusCode = 404;
    throw error;
  }

  data.dismissedReminderIds = [...new Set([...(data.dismissedReminderIds ?? []), itemId])];

  return {
    dismissedItemIds: data.dismissedReminderIds,
    reminders: buildReminders(data),
  };
}

function readAllReminderItems(data) {
  const visibleIds = buildReminders(data).items.map((item) => item.id);
  data.dismissedReminderIds = [...new Set([...(data.dismissedReminderIds ?? []), ...visibleIds])];

  return {
    dismissedItemIds: data.dismissedReminderIds,
    reminders: buildReminders(data),
  };
}

function renameFamily(data, name) {
  data.family = {
    ...data.family,
    name,
  };
  data.profile = {
    ...data.profile,
    familyName: name,
  };
  data.dashboard = {
    ...data.dashboard,
    familyName: name,
  };

  return {
    family: data.family,
  };
}

function updateFamilyAddress(data, payload) {
  if (!isRecord(payload)) {
    throw new Error("Address payload is required");
  }

  data.family = {
    ...data.family,
    address: {
      contactName: readRequiredString(payload, "contactName"),
      phone: readRequiredString(payload, "phone"),
      region: readRequiredString(payload, "region"),
      detail: readRequiredString(payload, "detail"),
      notes: readOptionalString(payload.notes) || undefined,
      updatedAt: new Date().toISOString(),
    },
  };

  return {
    family: data.family,
  };
}

function updateFamilyMemberRole(data, memberId, role) {
  const memberIndex = data.family.members.findIndex((member) => member.id === memberId);

  if (memberIndex === -1) {
    const error = new Error("Family Member Not Found");
    error.statusCode = 404;
    throw error;
  }

  const member = data.family.members[memberIndex];

  if (member.role === "admin" && role !== "admin" && countFamilyAdmins(data.family) <= 1) {
    const error = new Error("At least one admin is required");
    error.statusCode = 400;
    throw error;
  }

  data.family.members[memberIndex] = {
    ...member,
    role,
    roleText: roleTextForFamilyRole(role),
  };
  data.family = normalizeFamilyCounts(data.family);

  return {
    family: data.family,
  };
}

function removeFamilyMember(data, memberId) {
  const member = data.family.members.find((item) => item.id === memberId);

  if (!member) {
    const error = new Error("Family Member Not Found");
    error.statusCode = 404;
    throw error;
  }

  if (member.role === "admin" && countFamilyAdmins(data.family) <= 1) {
    const error = new Error("At least one admin is required");
    error.statusCode = 400;
    throw error;
  }

  data.family = normalizeFamilyCounts({
    ...data.family,
    members: data.family.members.filter((item) => item.id !== memberId),
  });

  return {
    family: data.family,
  };
}

function dissolveFamily(data) {
  const profileName = readPersistedString(data.profile?.name) || "我";
  const currentMember =
    data.family.members.find((member) => readPersistedString(member.name).includes("我")) ??
    data.family.members.find((member) => member.role === "admin") ??
    data.family.members[0];
  const nextName = `${profileName}的家`;

  data.family = normalizeFamilyCounts({
    ...data.family,
    id: `family_${Date.now().toString(36)}`,
    name: nextName,
    createdAt: new Date().toISOString().slice(0, 10),
    members: [
      {
        id: readPersistedString(currentMember?.id) || "member_self",
        name: `${profileName}（我）`,
        subtitle:
          readPersistedString(currentMember?.subtitle) ||
          `${readPersistedString(data.profile?.id) || "user"}@family.local`,
        avatar: readPersistedString(currentMember?.avatar) || readPersistedString(data.profile?.avatar) || undefined,
        role: "admin",
        roleText: "管理员",
      },
    ],
  });
  data.profile = {
    ...data.profile,
    familyName: nextName,
  };
  data.dashboard = {
    ...data.dashboard,
    familyName: nextName,
  };

  return {
    family: data.family,
  };
}

function normalizeFamilyCounts(family) {
  return {
    ...family,
    memberCount: family.members.length,
  };
}

function countFamilyAdmins(family) {
  return family.members.filter((member) => member.role === "admin").length;
}

function updateNotificationSettings(data, payload) {
  data.notificationSettings = {
    ...data.notificationSettings,
    ...(typeof payload.stockWarningEnabled === "boolean"
      ? { stockWarningEnabled: payload.stockWarningEnabled }
      : {}),
    ...(typeof payload.expiryReminderEnabled === "boolean"
      ? { expiryReminderEnabled: payload.expiryReminderEnabled }
      : {}),
    updatedAt: new Date().toISOString(),
  };

  return {
    settings: data.notificationSettings,
  };
}

function archiveProduct(data, productId) {
  const product = data.products.find((item) => item.id === productId);

  if (!product) {
    const error = new Error("Product Not Found");
    error.statusCode = 404;
    throw error;
  }

  data.stockLogs = enrichStockLogs(data.stockLogs ?? [], data.products);
  data.products = data.products.filter((item) => item.id !== productId);
  removeProductFromRestockState(data, productId);
  appendStockLog(data, {
    product,
    action: "adjust",
    actionText: "商品归档",
    quantity: product.quantity,
    notes: product.name,
    allowZero: true,
  });

  return {
    archivedProductId: productId,
    items: data.products,
  };
}

function removeProductFromRestockState(data, productId) {
  const restockItemId = `product_${productId}`;

  data.customRestockItems = (data.customRestockItems ?? []).filter(
    (item) => item.id !== restockItemId && item.productId !== productId,
  );
  data.removedRestockItemIds = (data.removedRestockItemIds ?? []).filter((id) => id !== restockItemId);
  data.completedRestockItemIds = (data.completedRestockItemIds ?? []).filter((id) => id !== restockItemId);
}

function buildRestockPlan(data) {
  const completedStaticItemIds = new Set(data.completedRestockItemIds ?? []);
  const removedItemIds = new Set(data.removedRestockItemIds ?? []);
  const customRestockItems = (data.customRestockItems ?? []).filter((item) => !removedItemIds.has(item.id));
  const customRecommendationIds = new Set(
    customRestockItems.map((item) => item.sourceRecommendationId).filter(Boolean),
  );
  const plan = {
    ...cloneData(data.restockPlan),
    groups: data.restockPlan.groups
      .map((group) => ({
        ...cloneData(group),
        items: group.items.filter(
          (item) => !completedStaticItemIds.has(item.id) && !removedItemIds.has(item.id),
        ),
      }))
      .filter((group) => group.items.length > 0),
    recommendations: data.restockPlan.recommendations.filter(
      (recommendation) => !customRecommendationIds.has(recommendation.id),
    ),
  };
  const groups = [
    ...(customRestockItems.length
      ? [
          {
            id: "custom",
            title: "我的清单",
            icon: "layers",
            items: customRestockItems,
          },
        ]
      : []),
    ...plan.groups,
  ];

  return {
    ...plan,
    estimatedCost: groups.some((group) => group.items.length > 0) ? plan.estimatedCost : 0,
    groups,
  };
}

function applyRestockItems(data, itemIds) {
  const restockPlan = buildRestockPlan(data);
  const restockItems = new Map(
    restockPlan.groups.flatMap((group) => group.items.map((item) => [item.id, item])),
  );
  const completedItemIds = [];

  for (const itemId of itemIds) {
    const item = restockItems.get(itemId);

    if (!item) {
      continue;
    }

    const product = upsertRestockedProduct(data, item);
    appendStockLog(data, {
      product,
      action: "stock_in",
      actionText: "补货入库",
      quantity: readSuggestedQuantity(item.suggestedQuantity),
      notes: item.name,
    });
    completedItemIds.push(itemId);

    if ((data.customRestockItems ?? []).some((customItem) => customItem.id === itemId)) {
      data.customRestockItems = data.customRestockItems.filter((customItem) => customItem.id !== itemId);
    }

    if (item.productId && item.productId !== item.id) {
      data.completedRestockItemIds = [...new Set([...(data.completedRestockItemIds ?? []), itemId])];
    }
  }

  if (!completedItemIds.length) {
    const error = new Error("No restock items matched");
    error.statusCode = 404;
    throw error;
  }

  return completedItemIds;
}

function removeRestockItem(data, itemId) {
  const plan = buildRestockPlan(data);
  const itemExists = plan.groups.some((group) => group.items.some((item) => item.id === itemId));

  if (!itemExists) {
    const error = new Error("Restock Item Not Found");
    error.statusCode = 404;
    throw error;
  }

  if ((data.customRestockItems ?? []).some((item) => item.id === itemId)) {
    data.customRestockItems = data.customRestockItems.filter((item) => item.id !== itemId);
  } else {
    data.removedRestockItemIds = [...new Set([...(data.removedRestockItemIds ?? []), itemId])];
  }

  return {
    removedItemIds: [itemId],
    restockPlan: buildRestockPlan(data),
  };
}

function addRecommendationToRestockPlan(data, recommendationId) {
  const recommendation = data.restockPlan.recommendations.find((item) => item.id === recommendationId);

  if (!recommendation) {
    const error = new Error("Recommendation Not Found");
    error.statusCode = 404;
    throw error;
  }

  const item = restockItemFromRecommendation(recommendation);
  const existing = (data.customRestockItems ?? []).find(
    (customItem) =>
      customItem.id === item.id || customItem.sourceRecommendationId === item.sourceRecommendationId,
  );

  if (!existing) {
    data.customRestockItems = [item, ...(data.customRestockItems ?? [])];
  }

  data.removedRestockItemIds = (data.removedRestockItemIds ?? []).filter((id) => id !== item.id);

  return {
    itemId: existing?.id ?? item.id,
    restockPlan: buildRestockPlan(data),
  };
}

function addProductToRestockPlan(data, productId) {
  const product = data.products.find((item) => item.id === productId);

  if (!product) {
    const error = new Error("Product Not Found");
    error.statusCode = 404;
    throw error;
  }

  const item = restockItemFromProduct(product);
  const existing = (data.customRestockItems ?? []).find((customItem) => customItem.id === item.id);

  if (!existing) {
    data.customRestockItems = [item, ...(data.customRestockItems ?? [])];
  }

  data.removedRestockItemIds = (data.removedRestockItemIds ?? []).filter((id) => id !== item.id);

  return {
    itemId: existing?.id ?? item.id,
    restockPlan: buildRestockPlan(data),
  };
}

function restockItemFromRecommendation(recommendation) {
  const category = inferCategory(recommendation.name);
  const unit = inferUnit(`${recommendation.name} ${recommendation.reason}`);

  return {
    id: `recommendation_${recommendation.id}`,
    productId: `prod_recommendation_${recommendation.id}`,
    name: recommendation.name,
    description: `${recommendation.reason} · 建议补 1${unit}`,
    category,
    unit,
    suggestedQuantity: 1,
    image: readPersistedString(recommendation.image) || undefined,
    icon: readPersistedString(recommendation.icon) || undefined,
    sourceRecommendationId: recommendation.id,
    selected: false,
  };
}

function restockItemFromProduct(product) {
  const suggestedQuantity = suggestedRestockQuantity(product);

  return {
    id: `product_${product.id}`,
    productId: product.id,
    name: product.name,
    description: `当前库存: ${product.quantity} ${product.unit} · 建议补 ${suggestedQuantity}${product.unit}`,
    category: product.category,
    unit: product.unit,
    suggestedQuantity,
    image: readPersistedString(product.image) || undefined,
    selected: false,
  };
}

function upsertRestockedProduct(data, item) {
  const category = readPersistedString(item.category) || inferCategory(item.name);
  const unit = readPersistedString(item.unit) || inferUnit(item.description);
  const quantity = readSuggestedQuantity(item.suggestedQuantity);
  const productId = readPersistedString(item.productId) || `prod_restock_${item.id}`;
  const productIndex = data.products.findIndex((product) => product.id === productId || product.id === item.id);

  if (productIndex >= 0) {
    data.products[productIndex] = withQuantity(
      data.products[productIndex],
      data.products[productIndex].quantity + quantity,
    );
    return data.products[productIndex];
  }

  const product = withQuantity(
    {
      id: productId,
      name: item.name,
      category,
      brand: "补货入库",
      spec: item.description,
      quantity: 0,
      unit,
      status: "empty",
      statusText: "已耗尽",
      image: readPersistedString(item.image) || imageForCategory(category),
      purchaseChannel: "补货入库",
      location: undefined,
      isOpened: false,
      stockInDate: new Date().toISOString().slice(0, 10),
    },
    quantity,
  );

  data.products.unshift(product);
  return product;
}

function buildProductLogs(data, productId) {
  return buildStockLogs(data, productId);
}

function buildStockLogs(data, productId) {
  const productsById = new Map(data.products.map((product) => [product.id, product]));

  return {
    items: data.stockLogs
      .filter((log) => !productId || log.productId === productId)
      .map((log) => decorateStockLog(log, productsById.get(log.productId)))
      .sort((a, b) => new Date(b.operatedAt).getTime() - new Date(a.operatedAt).getTime()),
  };
}

function decorateStockLog(log, product) {
  if (!product) {
    return log.actionText === "商品归档" && log.notes
      ? { ...log, productArchived: true, productName: log.productName || log.notes }
      : { ...log, productArchived: true };
  }

  return {
    ...log,
    productName: log.productName || product.name,
    productImage: log.productImage || product.image,
    productCategory: log.productCategory || product.category,
    productArchived: false,
  };
}

function appendStockLog(data, { product, action, actionText, quantity, notes, allowZero = false }) {
  if (!allowZero && !quantity) {
    return;
  }

  const unitPrice = action === "stock_in" ? readPersistedNonNegativeNumber(product.purchasePrice) : undefined;
  const amount = unitPrice === undefined ? undefined : roundCurrency(unitPrice * quantity);

  data.stockLogs = [
    {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      productId: product.id,
      productName: product.name,
      productImage: product.image,
      productCategory: product.category,
      action,
      actionText,
      quantity,
      unit: product.unit,
      unitPrice,
      amount,
      operatorName: data.profile?.name || "家庭成员",
      operatedAt: new Date().toISOString(),
      notes: notes || undefined,
    },
    ...(data.stockLogs ?? []),
  ];
}

function appendAdjustmentStockLog(data, previousProduct, nextProduct, notes) {
  const delta = nextProduct.quantity - previousProduct.quantity;

  if (delta === 0) {
    return;
  }

  appendStockLog(data, {
    product: nextProduct,
    action: delta > 0 ? "stock_in" : "adjust",
    actionText: delta > 0 ? "库存调整入库" : "库存调整",
    quantity: Math.abs(delta),
    notes,
  });
}

function stockLogActionForConsume(actionType) {
  if (actionType === "adjust") return "adjust";
  if (actionType === "expired") return "expired";
  if (actionType === "gift") return "gift";
  return "stock_out";
}

function stockLogTextForConsume(actionType) {
  if (actionType === "adjust") return "库存调整";
  if (actionType === "expired") return "过期损耗";
  if (actionType === "gift") return "赠送出库";
  return "日常消耗";
}

function buildProductDetail(item) {
  const isEmpty = item.quantity <= 0;
  const firstBatchQuantity = isEmpty
    ? 0
    : item.unit === "kg"
      ? Math.min(item.quantity, 0.5)
      : Math.max(0.5, Math.min(item.quantity, 1));
  const secondBatchQuantity = Math.max(0, item.quantity - firstBatchQuantity);
  const storageLocation = item.location || "储物柜顶层";

  return {
    item: {
      ...item,
      tags: productDetailTags(item),
    },
    batches: [
      {
        id: `${item.id}_batch_a`,
        batchNo: "#202311A",
        location: storageLocation,
        quantity: firstBatchQuantity,
        unit: item.unit,
        expiryText: isEmpty ? "已耗尽" : "剩30天过期",
        status: isEmpty ? "expired" : "warning",
        statusText: isEmpty ? "已耗尽" : "临期",
        progress: isEmpty ? 0 : 28,
        canConsume: !isEmpty,
      },
      {
        id: `${item.id}_batch_b`,
        batchNo: "#202401B",
        location: storageLocation,
        quantity: secondBatchQuantity,
        unit: item.unit,
        expiryText: "2026.01.20 到期",
        status: "normal",
        statusText: "正常",
        progress: 100,
        canConsume: secondBatchQuantity > 0,
      },
    ],
    consumptionTrend: [
      { label: "10.01", value: 40 },
      { label: "10.06", value: 60 },
      { label: "10.12", value: 45 },
      { label: "10.18", value: 70 },
      { label: "10.24", value: 55 },
      { label: "10.30", value: 80 },
    ],
  };
}

function productDetailTags(item) {
  const targetPetTag = item.name.includes("猫") || item.category.includes("猫") || item.unit === "罐"
    ? "猫咪"
    : item.isOpened
      ? "已开封"
      : "主粮";

  return [...new Set([item.category, targetPetTag].filter(Boolean))];
}

function readRequiredString(payload, key) {
  const value = payload[key];

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} is required`);
  }

  return value.trim();
}

function readOptionalString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function readProductUpdateString(payload, key, fallback, options = {}) {
  if (!Object.prototype.hasOwnProperty.call(payload, key)) {
    return fallback;
  }

  const value = readOptionalString(payload[key]);

  if (!value && options.required) {
    throw new Error(`${key} is required`);
  }

  return value || fallback;
}

function readProductOptionalUpdateString(payload, key, fallback) {
  if (!Object.prototype.hasOwnProperty.call(payload, key)) {
    return fallback;
  }

  return readOptionalString(payload[key]) || undefined;
}

function readPersistedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function readPersistedNonNegativeNumber(value) {
  const quantity = Number(value);

  return Number.isFinite(quantity) && quantity >= 0 ? quantity : undefined;
}

function readPersistedBoolean(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function readQuantity(value) {
  const quantity = Number(value);

  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error("quantity must be a non-negative number");
  }

  return quantity;
}

function readOptionalNonNegativeNumber(value, key) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const quantity = Number(value);

  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error(`${key} must be a non-negative number`);
  }

  return quantity;
}

function readOptionalBoolean(value, key) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new Error(`${key} must be a boolean`);
  }

  return value;
}

function readConsumeQuantity(value) {
  const quantity = Number(value);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("quantity must be a positive number");
  }

  return quantity;
}

function readItemId(value) {
  const itemId = readOptionalString(value);

  if (!itemId) {
    throw new Error("itemId is required");
  }

  return itemId;
}

function readItemIds(value) {
  if (!Array.isArray(value)) {
    throw new Error("itemIds must be an array");
  }

  const itemIds = [...new Set(value.map(readOptionalString).filter(Boolean))];

  if (!itemIds.length) {
    throw new Error("itemIds must include at least one item");
  }

  return itemIds;
}

function readStockLogAction(value) {
  return ["stock_in", "stock_out", "adjust", "expired", "gift"].includes(value) ? value : "";
}

function readProductListStatus(value) {
  return ["enough", "low", "empty"].includes(value) ? value : "";
}

function readReminderCategory(value) {
  return ["soon", "expired", "stock"].includes(value) ? value : "";
}

function readReminderTone(value) {
  return ["warning", "danger", "info"].includes(value) ? value : "";
}

function readFamilyMemberRole(value) {
  if (["admin", "member", "guest"].includes(value)) {
    return value;
  }

  throw new Error("role must be admin, member, or guest");
}

function roleTextForFamilyRole(role) {
  if (role === "admin") return "管理员";
  if (role === "guest") return "访客";
  return "成员";
}

function statusForQuantity(quantity, product) {
  if (quantity <= 0) return "empty";
  if (quantity <= lowStockThreshold(product)) return "low";
  return "enough";
}

function statusTextForQuantity(quantity, product) {
  if (quantity <= 0) return "已耗尽";
  if (quantity <= lowStockThreshold(product)) return "即将耗尽";
  return "充足";
}

function isLowStockProduct(product) {
  return product.quantity <= lowStockThreshold(product);
}

function lowStockThreshold(product) {
  return product.unit === "罐" || product.category.includes("罐") ? 3 : 0;
}

function imageForCategory(category) {
  if (category.includes("罐")) return "/static/products/ziwi.png";
  if (category.includes("砂")) return "/static/products/litter.png";
  return "/static/products/orijen.png";
}

function productMatchesCategory(product, categoryName) {
  return product.category.includes(categoryName) || categoryName.includes(product.category);
}

function estimateDaysText(categoryName, total) {
  if (total <= 0) return "已用尽";

  if (categoryName.includes("猫粮")) {
    return `约${Math.max(1, Math.round(total * 18))}天`;
  }

  if (categoryName.includes("罐")) {
    return `约${Math.max(1, Math.round(total * 4))}天`;
  }

  return `约${Math.max(1, Math.round(total * 7))}天`;
}

function suggestedRestockQuantity(product) {
  const targetQuantity = product.category.includes("罐")
    ? 12
    : product.category.includes("砂") || product.category.includes("用品")
      ? 4
      : 4;

  return Math.max(1, targetQuantity - product.quantity);
}

function readSuggestedQuantity(value) {
  const quantity = Number(value);

  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

function inferCategory(name) {
  if (name.includes("砂")) return "猫砂";
  if (name.includes("粮")) return "猫粮";
  if (name.includes("罐") || name.includes("肉")) return "零食";
  return "用品";
}

function inferUnit(description) {
  if (description.includes("罐")) return "罐";
  if (description.includes("袋")) return "袋";
  if (description.includes("包")) return "包";
  return "件";
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createApiServer } from "../src/index.mjs";

const createdProductPayload = {
  name: "Smoke Test Cat Food",
  category: "猫粮",
  brand: "Codex",
  spec: "1kg/袋",
  unit: "袋",
  quantity: 2,
  purchasePrice: 19.9,
  purchaseChannel: "Smoke",
  location: "Smoke shelf",
  isOpened: false,
  stockInDate: "2026-06-05",
  notes: "Smoke product create",
};

const stockInPayload = {
  ...createdProductPayload,
  quantity: 3,
  notes: "Smoke stock-in upsert",
};

async function main() {
  const tempDirectory = await mkdtemp(join(tmpdir(), "family-inventory-api-"));
  const server = createApiServer({
    dataFile: join(tempDirectory, "store.json"),
  });

  try {
    const baseUrl = await listen(server);
    const api = createApiClient(baseUrl);

    const dashboard = await api("/api/dashboard");
    assert.ok(dashboard.familyName, "dashboard includes family name");
    assert.ok(Array.isArray(dashboard.categories), "dashboard includes categories");

    const seededMonthStatistics = await api("/api/statistics/summary?range=month");
    assert.equal(
      seededMonthStatistics.topExpenses[0]?.date,
      "10月12日",
      "seeded month statistics preserve stitch-aligned top expense date",
    );
    assert.equal(
      seededMonthStatistics.topExpenses[1]?.date,
      "10月05日",
      "seeded month statistics preserve second top expense date",
    );
    assert.equal(
      seededMonthStatistics.topExpenses[2]?.date,
      "10月20日",
      "seeded month statistics preserve third top expense date",
    );
    assert.equal(
      seededMonthStatistics.trendSeries.find((item) => item.active)?.label,
      "四",
      "seeded month statistics preserve stitch-aligned active trend bucket",
    );

    const profile = await api("/api/profile");
    assert.equal(profile.avatar, "/static/family/zhangsan.png", "profile uses human default avatar");
    assert.equal(profile.stats.petCount, 3, "profile pet count reflects seeded pets");

    const updatedProfile = await api("/api/profile/update", {
      method: "POST",
      body: {
        name: "Smoke Keeper",
        avatar: "/static/family/lisi.png",
      },
    });
    assert.equal(updatedProfile.profile.name, "Smoke Keeper", "profile update persists name");
    assert.equal(updatedProfile.profile.avatar, "/static/family/lisi.png", "profile update persists avatar");

    const pets = await api("/api/pets");
    assert.ok(pets.items.length > 0, "seeded pet list is not empty");

    const createdPet = await api("/api/pets", {
      method: "POST",
      expectedStatus: 201,
      body: {
        name: "Smoke Pet",
        species: "狗",
        breed: "柯基",
        ageText: "1岁",
        weightKg: 8.4,
        tags: ["活泼"],
        diet: {
          staple: "Smoke staple",
          snack: "Smoke snack",
        },
      },
    });
    assert.equal(createdPet.item.name, "Smoke Pet", "pet create returns created pet");
    assert.equal(createdPet.pets.selectedPetId, createdPet.item.id, "pet create selects new pet");

    const updatedPet = await api(`/api/pets/${encodeURIComponent(createdPet.item.id)}/update`, {
      method: "POST",
      body: {
        name: "Smoke Pet Updated",
        species: "狗",
        breed: "柯基",
        ageText: "2岁",
        weightKg: 8.8,
        tags: ["活泼", "亲人"],
        diet: {
          staple: "Updated staple",
          snack: "Updated snack",
        },
      },
    });
    assert.equal(updatedPet.item.name, "Smoke Pet Updated", "pet update persists name");
    assert.equal(updatedPet.item.diet.staple, "Updated staple", "pet update persists diet");

    const album = await api(`/api/pets/${encodeURIComponent(createdPet.item.id)}/album`, {
      method: "POST",
      body: {
        image: "/static/products/orijen.png",
      },
    });
    assert.equal(album.item.albumPhotos[0], "/static/products/orijen.png", "pet album adds image first");

    const batchAlbum = await api(`/api/pets/${encodeURIComponent(createdPet.item.id)}/album/batch`, {
      method: "POST",
      body: {
        images: [
          "/static/products/ziwi.png",
          "/static/products/litter.png",
          "/static/products/orijen.png",
        ],
      },
    });
    assert.deepEqual(
      batchAlbum.addedImages,
      ["/static/products/ziwi.png", "/static/products/litter.png"],
      "batch album dedupes against existing images",
    );
    assert.equal(
      batchAlbum.item.albumPhotos[0],
      "/static/products/ziwi.png",
      "batch album prepends new images preserving input order",
    );

    const removeAlbum = await api(`/api/pets/${encodeURIComponent(createdPet.item.id)}/album/remove`, {
      method: "POST",
      body: {
        image: "/static/products/litter.png",
      },
    });
    assert.ok(
      !removeAlbum.item.albumPhotos.includes("/static/products/litter.png"),
      "removed album photo no longer appears in list",
    );

    const updatedNotificationSettings = await api("/api/notification-settings", {
      method: "POST",
      body: {
        stockWarningEnabled: false,
        expiryReminderEnabled: false,
      },
    });
    assert.equal(
      updatedNotificationSettings.settings.stockWarningEnabled,
      false,
      "notification stock toggle persists",
    );
    assert.equal(
      updatedNotificationSettings.settings.expiryReminderEnabled,
      false,
      "notification expiry toggle persists",
    );

    const reminders = await api("/api/reminders");
    assert.ok(Array.isArray(reminders.items), "reminders return item list");
    assert.equal(reminders.summary.total, 0, "disabled notification categories hide reminders");

    const mutedProfile = await api("/api/profile");
    assert.equal(mutedProfile.stats.reminderCount, 0, "profile reminder count respects notification settings");

    if (reminders.items.length) {
      const dismissed = await api("/api/reminders/dismiss", {
        method: "POST",
        body: {
          itemId: reminders.items[0].id,
        },
      });
      assert.ok(
        dismissed.dismissedItemIds.includes(reminders.items[0].id),
        "reminder dismiss persists item id",
      );
    }

    const readAllReminders = await api("/api/reminders/read-all", {
      method: "POST",
      body: {},
    });
    assert.equal(readAllReminders.reminders.items.length, 0, "read all hides visible reminders");

    const restockPlan = await api("/api/restock-plan");
    assert.ok(restockPlan.groups.length > 0, "restock plan includes groups");
    assert.equal(
      restockPlan.lastRestockedText,
      "12天前（10月12日）",
      "restock plan preserves stitch-aligned last restocked text",
    );

    if (restockPlan.recommendations.length) {
      const recommendation = restockPlan.recommendations[0];
      const addedRecommendation = await api("/api/restock-plan/recommendations/add", {
        method: "POST",
        body: {
          recommendationId: recommendation.id,
        },
      });
      assert.ok(addedRecommendation.itemId, "recommendation add returns restock item id");

      const completedRestock = await api("/api/restock-plan/complete", {
        method: "POST",
        body: {
          itemIds: [addedRecommendation.itemId],
        },
      });
      assert.ok(
        completedRestock.completedItemIds.includes(addedRecommendation.itemId),
        "restock completion returns completed item id",
      );

      const recommendationProductId = `prod_recommendation_${recommendation.id}`;
      const recommendationProduct = await api(`/api/products/${encodeURIComponent(recommendationProductId)}`);
      assert.equal(
        recommendationProduct.item.id,
        recommendationProductId,
        "restock recommendation completion creates stable product id",
      );
      assert.equal(
        recommendationProduct.item.name,
        recommendation.name,
        "restock recommendation completion preserves product name",
      );
    }

    const products = await api("/api/products");
    assert.ok(products.items.length > 0, "seeded product list is not empty");

    const seededProduct = products.items.find((item) => item.id === "prod_orijen_fish_cat") ??
      products.items.find((item) => item.quantity > 0) ??
      products.items[0];
    const seededDetail = await api(`/api/products/${encodeURIComponent(seededProduct.id)}`);
    assert.equal(seededDetail.item.id, seededProduct.id, "product detail resolves seeded product");

    const royalDetail = await api("/api/products/prod_royal_kitten_food");
    assert.equal(
      royalDetail.item.name,
      "皇家 (Royal Canin) 幼猫全价猫粮",
      "royal detail seed preserves stitch-aligned product name",
    );
    assert.equal(
      royalDetail.item.image,
      "/static/products/royal-kitten-food.jpg",
      "royal detail seed uses stitch-aligned hero image",
    );
    assert.deepEqual(
      royalDetail.item.tags,
      ["主粮", "猫咪"],
      "royal detail seed preserves stitch-aligned product tags",
    );
    assert.equal(royalDetail.batches[0]?.quantity, 0.5, "royal detail first batch uses stitch quantity");
    assert.equal(royalDetail.batches[0]?.unit, "kg", "royal detail first batch uses stitch unit");

    const royalLogs = await api("/api/products/prod_royal_kitten_food/logs");
    assert.equal(royalLogs.items[0]?.quantity, 2.5, "royal stock log preserves kg quantity");
    assert.equal(royalLogs.items[0]?.unit, "kg", "royal stock log preserves kg unit");
    assert.equal(
      royalLogs.items[0]?.productImage,
      "/static/products/royal-kitten-food.jpg",
      "royal stock log is enriched with hero image",
    );

    const seededLogs = await api(`/api/products/${encodeURIComponent(seededProduct.id)}/logs`);
    assert.ok(Array.isArray(seededLogs.items), "product logs return an item list");

    await api("/api/products/missing-product/logs", { expectedStatus: 404 });

    await api("/api/products", {
      method: "POST",
      expectedStatus: 400,
      body: {
        ...createdProductPayload,
        name: "   ",
      },
    });

    await api("/api/products", {
      method: "POST",
      expectedStatus: 400,
      body: {
        ...createdProductPayload,
        quantity: -1,
      },
    });

    const created = await api("/api/products", {
      method: "POST",
      expectedStatus: 201,
      body: createdProductPayload,
    });
    assert.equal(created.item.quantity, createdProductPayload.quantity, "product create persists quantity");

    await api(`/api/products/${encodeURIComponent(created.item.id)}/consume`, {
      method: "POST",
      expectedStatus: 400,
      body: {
        quantity: 999,
        actionType: "daily",
      },
    });

    await api(`/api/products/${encodeURIComponent(created.item.id)}/consume`, {
      method: "POST",
      expectedStatus: 400,
      body: {
        quantity: 0,
        actionType: "daily",
      },
    });

    await api(`/api/products/${encodeURIComponent(created.item.id)}/consume`, {
      method: "POST",
      expectedStatus: 400,
      body: {
        quantity: -1,
        actionType: "daily",
      },
    });

    const consumed = await api(`/api/products/${encodeURIComponent(created.item.id)}/consume`, {
      method: "POST",
      body: {
        quantity: 1,
        actionType: "daily",
        notes: "Smoke consume",
      },
    });
    assert.equal(consumed.detail.item.quantity, 1, "valid consume decrements stock");

    const stockedIn = await api("/api/products/stock-in", {
      method: "POST",
      body: stockInPayload,
    });
    assert.equal(stockedIn.item.id, created.item.id, "stock-in upserts matching product");
    assert.equal(stockedIn.item.quantity, 4, "stock-in adds to existing quantity");

    await api(`/api/products/${encodeURIComponent(created.item.id)}/update`, {
      method: "POST",
      expectedStatus: 400,
      body: {
        name: "   ",
      },
    });

    const updatedProduct = await api(`/api/products/${encodeURIComponent(created.item.id)}/update`, {
      method: "POST",
      body: {
        name: "Smoke Test Cat Food Updated",
        category: "猫粮",
        brand: "Codex Updated",
        spec: "1.5kg/袋",
        unit: "袋",
        quantity: 6,
        purchasePrice: null,
        purchaseChannel: "",
        location: "",
        stockInDate: "2026-06-06",
        isOpened: true,
        notes: "Smoke quantity adjustment",
      },
    });
    assert.equal(updatedProduct.detail.item.name, "Smoke Test Cat Food Updated", "product update persists name");
    assert.equal(updatedProduct.detail.item.quantity, 6, "product update persists quantity");
    assert.equal(updatedProduct.detail.item.purchasePrice, undefined, "product update can clear purchase price");
    assert.equal(updatedProduct.detail.item.purchaseChannel, undefined, "product update can clear purchase channel");
    assert.equal(updatedProduct.detail.item.location, undefined, "product update can clear location");
    assert.equal(updatedProduct.detail.item.isOpened, true, "product update persists opened state");

    const createdLogs = await api(`/api/products/${encodeURIComponent(created.item.id)}/logs`);
    assert.ok(
      createdLogs.items.some((item) => item.action === "stock_out"),
      "product logs include consume record",
    );
    assert.ok(
      createdLogs.items.some((item) => item.action === "stock_out" && item.notes === "Smoke consume"),
      "product logs include consume notes",
    );
    assert.ok(
      createdLogs.items.some((item) => item.action === "stock_in" && item.notes === createdProductPayload.notes),
      "product logs include create notes",
    );
    assert.ok(
      createdLogs.items.some(
        (item) =>
          item.action === "stock_in" &&
          item.amount === 59.7 &&
          item.notes === stockInPayload.notes,
      ),
      "product logs include priced stock-in record with notes",
    );
    assert.ok(
      createdLogs.items.some(
        (item) =>
          item.action === "stock_in" &&
          item.actionText === "库存调整入库" &&
          item.quantity === 2 &&
          item.notes === "Smoke quantity adjustment",
      ),
      "product logs include update quantity adjustment notes",
    );

    const statistics = await api("/api/statistics/summary?range=year");
    assert.ok(Array.isArray(statistics.trendSeries), "statistics include trend series");
    assert.ok(statistics.trendSeries.length > 0, "statistics trend series is not empty");
    assert.ok(
      statistics.trendSeries.every((item) => item.percent >= 0 && item.percent <= 100),
      "statistics trend series uses bounded percents",
    );
    assert.ok(
      statistics.trendSeries.some((item) => item.active),
      "statistics trend series marks the peak bucket",
    );
    assert.ok(
      statistics.topExpenses.some((item) => item.productId === created.item.id),
      "statistics include fresh stock-in expense",
    );

    const addedSeededRestock = await api("/api/restock-plan/products/add", {
      method: "POST",
      body: {
        productId: seededProduct.id,
      },
    });
    assert.equal(
      addedSeededRestock.itemId,
      `product_${seededProduct.id}`,
      "product restock add uses stable product item id",
    );

    const archivedSeeded = await api(`/api/products/${encodeURIComponent(seededProduct.id)}/archive`, {
      method: "POST",
    });
    assert.equal(archivedSeeded.archivedProductId, seededProduct.id, "archive returns archived product id");

    await api(`/api/products/${encodeURIComponent(seededProduct.id)}`, { expectedStatus: 404 });

    const logsAfterArchive = await api("/api/stock-logs");
    const archivedInitialLog = logsAfterArchive.items.find(
      (item) => item.productId === seededProduct.id && item.actionText === "初始入库",
    );

    assert.ok(archivedInitialLog, "archived product keeps historical initial log");
    assert.equal(
      archivedInitialLog.productName,
      seededProduct.name,
      "archived historical log preserves product name",
    );
    assert.equal(
      archivedInitialLog.productImage,
      seededProduct.image,
      "archived historical log preserves product image",
    );
    assert.equal(archivedInitialLog.productArchived, true, "archived historical log is marked archived");

    const restockAfterArchive = await api("/api/restock-plan");
    assert.ok(
      restockAfterArchive.groups.every((group) =>
        group.items.every((item) => item.id !== addedSeededRestock.itemId && item.productId !== seededProduct.id),
      ),
      "archive removes product-specific restock item",
    );

    const zeroQuantityProduct = products.items.find((item) => item.id === "prod_n1_tofu_litter");
    assert.ok(zeroQuantityProduct, "seed data includes zero-quantity product");

    const archivedZeroQuantity = await api(`/api/products/${encodeURIComponent(zeroQuantityProduct.id)}/archive`, {
      method: "POST",
    });
    assert.equal(
      archivedZeroQuantity.archivedProductId,
      zeroQuantityProduct.id,
      "archive returns zero-quantity product id",
    );

    const logsAfterZeroArchive = await api("/api/stock-logs");
    const zeroQuantityArchiveLog = logsAfterZeroArchive.items.find(
      (item) => item.productId === zeroQuantityProduct.id && item.actionText === "商品归档",
    );
    assert.ok(zeroQuantityArchiveLog, "zero-quantity archive writes an audit log");
    assert.equal(zeroQuantityArchiveLog.quantity, 0, "zero-quantity archive log preserves zero quantity");
    assert.equal(
      zeroQuantityArchiveLog.productName,
      zeroQuantityProduct.name,
      "zero-quantity archive log preserves product name",
    );

    const family = await api("/api/family");
    const onlyAdmin = family.members.find((member) => member.role === "admin");
    assert.ok(onlyAdmin, "seed family includes an admin");
    assert.equal(family.memberCount, family.members.length, "family member count matches members");

    const addressedFamily = await api("/api/family/address", {
      method: "POST",
      body: {
        contactName: "Smoke Contact",
        phone: "13800000000",
        region: "上海市 浦东新区",
        detail: "Smoke Road 1",
        notes: "Leave at shelf",
      },
    });
    assert.equal(addressedFamily.family.address.contactName, "Smoke Contact", "family address persists");

    await api("/api/family/members/role", {
      method: "POST",
      expectedStatus: 400,
      body: {
        memberId: onlyAdmin.id,
        role: "member",
      },
    });

    console.log("API smoke passed");
  } finally {
    await closeServer(server);
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

function listen(server) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      const address = server.address();

      assert.ok(address && typeof address === "object", "server listens on a TCP address");
      resolve(`http://127.0.0.1:${address.port}`);
    };

    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(0, "127.0.0.1");
  });
}

function createApiClient(baseUrl) {
  return async function api(path, options = {}) {
    const method = options.method ?? "GET";
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: options.body ? { "content-type": "application/json" } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : undefined;
    const expectedStatus = options.expectedStatus ?? 200;

    assert.equal(
      response.status,
      expectedStatus,
      `${method} ${path} expected ${expectedStatus}, got ${response.status}: ${text}`,
    );

    return payload;
  };
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

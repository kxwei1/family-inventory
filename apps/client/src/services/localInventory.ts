import type {
  AddPetAlbumPhotoRequest,
  AddPetAlbumPhotoResponse,
  AddRestockProductRequest,
  AddRestockProductResponse,
  AddRestockRecommendationRequest,
  AddRestockRecommendationResponse,
  ArchiveProductResponse,
  CompleteRestockRequest,
  CompleteRestockResponse,
  ConsumeProductRequest,
  ConsumeProductResponse,
  CreatePetRequest,
  CreatePetResponse,
  CreateProductRequest,
  CreateProductResponse,
  DissolveFamilyResponse,
  DismissReminderRequest,
  DismissReminderResponse,
  DashboardSummary,
  FamilyOverview,
  InventoryProductSummary,
  NotificationSettings,
  PetListResponse,
  PetProfileSummary,
  ProductDetailResponse,
  ProductListFilters,
  ProductListResponse,
  ProductStockLogResponse,
  ProductStockLogSummary,
  ProfileSummary,
  ReadAllRemindersResponse,
  RemoveFamilyMemberRequest,
  RemoveFamilyMemberResponse,
  ReminderItem,
  ReminderListResponse,
  RenameFamilyRequest,
  RenameFamilyResponse,
  RestockItem,
  RestockPlan,
  StatisticsRange,
  StatisticsSummary,
  RemoveRestockItemRequest,
  RemoveRestockItemResponse,
  StockLogListResponse,
  UpdateFamilyMemberRoleRequest,
  UpdateFamilyMemberRoleResponse,
  UpdateFamilyAddressRequest,
  UpdateFamilyAddressResponse,
  UpdateNotificationSettingsRequest,
  UpdateNotificationSettingsResponse,
  UpdatePetRequest,
  UpdatePetResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  UpdateProductRequest,
  UpdateProductResponse,
} from "@family-inventory/shared-types";
import { storage } from "@/utils/storage";
import {
  fallbackDashboard,
  fallbackPets,
  fallbackProducts,
  fallbackFamily,
  fallbackProfile,
  fallbackReminders,
  fallbackRestockPlan,
  fallbackStockLogs,
  getFallbackStatistics,
} from "./fallbackData";

const LOCAL_PRODUCTS_KEY = "fi:inventory:local_products";
const LOCAL_ARCHIVED_PRODUCTS_KEY = "fi:inventory:archived_products";
const LOCAL_PETS_KEY = "fi:inventory:local_pets";
const LOCAL_COMPLETED_RESTOCK_KEY = "fi:inventory:completed_restock_items";
const LOCAL_REMOVED_RESTOCK_KEY = "fi:inventory:removed_restock_items";
const LOCAL_CUSTOM_RESTOCK_KEY = "fi:inventory:custom_restock_items";
const LOCAL_STOCK_LOGS_KEY = "fi:inventory:stock_logs";
const LOCAL_DISMISSED_REMINDERS_KEY = "fi:inventory:dismissed_reminders";
const LOCAL_FAMILY_KEY = "fi:inventory:family";
const LOCAL_PROFILE_KEY = "fi:inventory:profile";
const LOCAL_NOTIFICATION_SETTINGS_KEY = "fi:inventory:notification_settings";
const defaultNotificationSettings: NotificationSettings = {
  stockWarningEnabled: true,
  expiryReminderEnabled: true,
  updatedAt: "2026-01-01T00:00:00.000Z",
};

export async function getProductListFallback(
  filters: ProductListFilters = {},
): Promise<ProductListResponse> {
  return {
    items: filterProducts(await listMergedProducts(), filters),
  };
}

export async function getProductDetailFallback(id: string): Promise<ProductDetailResponse> {
  const productList = await getProductListFallback();
  const item = productList.items.find((product) => product.id === id);

  if (!item) {
    throw new Error("Product not found");
  }

  return buildProductDetail(item);
}

export async function getPetsFallback(selectedPetId?: string): Promise<PetListResponse> {
  const items = await listMergedPets();

  return {
    items,
    selectedPetId: selectedPetId || items[0]?.id,
  };
}

export async function createLocalPet(payload: CreatePetRequest): Promise<CreatePetResponse> {
  const pet = toPetProfileSummary(payload);
  const localPets = await listLocalPets();

  await storage.set(LOCAL_PETS_KEY, [pet, ...localPets]);

  return {
    item: pet,
    pets: await getPetsFallback(pet.id),
  };
}

export async function updateLocalPet(
  id: string,
  payload: UpdatePetRequest,
): Promise<UpdatePetResponse> {
  const localPets = await listLocalPets();
  const sourcePet =
    localPets.find((pet) => pet.id === id) ??
    fallbackPets.find((pet) => pet.id === id);

  if (!sourcePet) {
    throw new Error("Pet not found");
  }

  const nextPet = withPetUpdates(sourcePet, payload);
  const nextLocalPets = upsertLocalPet(localPets, nextPet);

  await storage.set(LOCAL_PETS_KEY, nextLocalPets);

  return {
    item: nextPet,
    pets: await getPetsFallback(id),
  };
}

export async function addLocalPetAlbumPhoto(
  id: string,
  payload: AddPetAlbumPhotoRequest,
): Promise<AddPetAlbumPhotoResponse> {
  const image = readRequiredString(payload.image, "image");

  const localPets = await listLocalPets();
  const sourcePet =
    localPets.find((pet) => pet.id === id) ??
    fallbackPets.find((pet) => pet.id === id);

  if (!sourcePet) {
    throw new Error("Pet not found");
  }

  const albumPhotos = [
    image,
    ...(sourcePet.albumPhotos ?? []).filter((item) => item !== image),
  ].slice(0, 24);
  const nextPet = {
    ...sourcePet,
    albumPhotos,
    albumCount: albumPhotos.length,
  };
  const nextLocalPets = upsertLocalPet(localPets, nextPet);

  await storage.set(LOCAL_PETS_KEY, nextLocalPets);

  return {
    item: nextPet,
    pets: await getPetsFallback(id),
  };
}

export async function createLocalProduct(payload: CreateProductRequest) {
  const product = toProductSummary(payload);
  const localProducts = await listLocalProducts();

  await storage.set(LOCAL_PRODUCTS_KEY, [product, ...localProducts]);
  await appendLocalStockLog({
    product,
    action: "stock_in",
    actionText: "新增入库",
    quantity: product.quantity,
    notes: payload.notes,
  });

  return {
    item: product,
  };
}

export async function stockInLocalProduct(payload: CreateProductRequest): Promise<CreateProductResponse> {
  const incomingProduct = toProductSummary(payload);
  let products = await listMergedProducts();
  const productIndex = products.findIndex((product) => isSameStockInProduct(product, incomingProduct));
  let item = incomingProduct;

  if (productIndex >= 0) {
    await persistEnrichedLocalStockLogs(products);
    item = withQuantity(
      withStockInMetadata(products[productIndex], incomingProduct),
      products[productIndex].quantity + incomingProduct.quantity,
    );
    products = [
      item,
      ...products.filter((product) => product.id !== item.id),
    ];
  } else {
    products = [incomingProduct, ...products];
  }

  await removeArchivedProductIds([item.id]);
  await storage.set(LOCAL_PRODUCTS_KEY, products);
  await appendLocalStockLog({
    product: item,
    action: "stock_in",
    actionText: "扫码入库",
    quantity: incomingProduct.quantity,
    notes: payload.notes,
  });

  return {
    item,
  };
}

export async function consumeLocalProduct(
  id: string,
  payload: ConsumeProductRequest,
): Promise<ConsumeProductResponse> {
  const localProducts = await listLocalProducts();
  const sourceProduct = (await listMergedProducts()).find((product) => product.id === id);
  const quantity = readPositiveQuantity(payload.quantity);

  if (!sourceProduct) {
    throw new Error("Product not found");
  }

  if (quantity > sourceProduct.quantity) {
    throw new Error("Consume quantity exceeds current stock");
  }

  const nextProduct = withQuantity(
    sourceProduct,
    Math.max(0, sourceProduct.quantity - quantity),
  );
  const nextLocalProducts = [
    nextProduct,
    ...localProducts.filter((product) => product.id !== id),
  ];

  await storage.set(LOCAL_PRODUCTS_KEY, nextLocalProducts);
  await appendLocalStockLog({
    product: nextProduct,
    action: stockLogActionForConsume(payload.actionType),
    actionText: stockLogTextForConsume(payload.actionType),
    quantity,
    notes: payload.notes,
  });

  return {
    detail: buildProductDetail(nextProduct),
  };
}

export async function updateLocalProduct(
  id: string,
  payload: UpdateProductRequest,
): Promise<UpdateProductResponse> {
  const localProducts = await listLocalProducts();
  const mergedProducts = await listMergedProducts();
  const sourceProduct = mergedProducts.find((product) => product.id === id);

  if (!sourceProduct) {
    throw new Error("Product not found");
  }

  const nextQuantity = payload.quantity === undefined
    ? sourceProduct.quantity
    : readNonNegativeQuantity(payload.quantity);
  const nextProduct = withQuantity(withProductMetadata(sourceProduct, payload), nextQuantity);
  const nextLocalProducts = [
    nextProduct,
    ...localProducts.filter((product) => product.id !== id),
  ];

  await persistEnrichedLocalStockLogs(mergedProducts);
  await storage.set(LOCAL_PRODUCTS_KEY, nextLocalProducts);
  await appendLocalAdjustmentStockLog(sourceProduct, nextProduct, payload.notes);

  return {
    detail: buildProductDetail(nextProduct),
  };
}

export async function archiveLocalProduct(id: string): Promise<ArchiveProductResponse> {
  const mergedProducts = await listMergedProducts();
  const product = mergedProducts.find((item) => item.id === id);

  if (!product) {
    throw new Error("Product not found");
  }

  const archivedProductIds = new Set(await listArchivedProductIds());
  archivedProductIds.add(id);

  const nextProducts = mergedProducts.filter((item) => item.id !== id);

  await persistEnrichedLocalStockLogs(mergedProducts);
  await storage.set(LOCAL_ARCHIVED_PRODUCTS_KEY, [...archivedProductIds]);
  await storage.set(LOCAL_PRODUCTS_KEY, nextProducts);
  await removeProductFromLocalRestockState(id);
  await appendLocalStockLog({
    product,
    action: "adjust",
    actionText: "商品归档",
    quantity: product.quantity,
    notes: product.name,
    allowZero: true,
  });

  return {
    archivedProductId: id,
    items: nextProducts,
  };
}

async function removeProductFromLocalRestockState(productId: string) {
  const restockItemId = `product_${productId}`;
  const [customItems, removedItemIds, completedItemIds] = await Promise.all([
    listCustomRestockItems(),
    listRemovedRestockItemIds(),
    listCompletedRestockItemIds(),
  ]);

  await Promise.all([
    storage.set(
      LOCAL_CUSTOM_RESTOCK_KEY,
      customItems.filter((item) => item.id !== restockItemId && item.productId !== productId),
    ),
    storage.set(
      LOCAL_REMOVED_RESTOCK_KEY,
      removedItemIds.filter((id) => id !== restockItemId),
    ),
    storage.set(
      LOCAL_COMPLETED_RESTOCK_KEY,
      completedItemIds.filter((id) => id !== restockItemId),
    ),
  ]);
}

export async function getProductLogsFallback(id: string): Promise<ProductStockLogResponse> {
  const product = (await listMergedProducts()).find((item) => item.id === id);

  if (!product) {
    throw new Error("Product not found");
  }

  return getStockLogsFallback(id);
}

export async function getStockLogsFallback(productId?: string): Promise<StockLogListResponse> {
  const products = await listMergedProducts();
  const productsById = new Map(products.map((product) => [product.id, product]));

  return {
    items: (await listLocalStockLogs(products))
      .filter((log) => !productId || log.productId === productId)
      .map((log) => decorateStockLog(log, productsById.get(log.productId)))
      .sort((a, b) => new Date(b.operatedAt).getTime() - new Date(a.operatedAt).getTime()),
  };
}

export async function getRestockPlanFallback(): Promise<RestockPlan> {
  const products = await listMergedProducts();
  const completedItemIds = await listCompletedRestockItemIds();
  const removedItemIds = await listRemovedRestockItemIds();
  const customItems = await listCustomRestockItems();

  return buildRestockPlan(products, new Set(completedItemIds), new Set(removedItemIds), customItems);
}

export async function getRemindersFallback(): Promise<ReminderListResponse> {
  const products = await listMergedProducts();
  const dismissedIds = new Set(await listDismissedReminderIds());
  const settings = await getNotificationSettingsFallback();
  const items = buildReminderItems(products).filter(
    (item) => !dismissedIds.has(item.id) && isReminderEnabled(item, settings),
  );

  return summarizeReminders(items);
}

export async function getFamilyFallback(): Promise<FamilyOverview> {
  return normalizeLocalFamily(await storage.get<unknown>(LOCAL_FAMILY_KEY));
}

export async function getProfileFallback(): Promise<ProfileSummary> {
  const family = await getFamilyFallback();
  const pets = await listMergedPets();
  const reminders = await getRemindersFallback();
  const localProfile = normalizeLocalProfile(await storage.get<unknown>(LOCAL_PROFILE_KEY));

  return {
    ...fallbackProfile,
    ...localProfile,
    familyName: family.name,
    stats: {
      ...fallbackProfile.stats,
      ...(localProfile.stats ?? {}),
      petCount: pets.length,
      reminderCount: reminders.summary.total,
    },
  };
}

export async function updateLocalProfile(
  payload: UpdateProfileRequest,
): Promise<UpdateProfileResponse> {
  const profile = withProfileUpdates(await getProfileFallback(), payload);

  await storage.set(LOCAL_PROFILE_KEY, {
    name: profile.name,
    avatar: profile.avatar,
  });

  return {
    profile: await getProfileFallback(),
  };
}

export async function getDashboardFallback(): Promise<DashboardSummary> {
  const family = await getFamilyFallback();
  const products = await listMergedProducts();

  return {
    ...fallbackDashboard,
    familyName: family.name,
    alerts: fallbackDashboard.alerts.map((alert) => {
      if (alert.id === "warning") {
        return {
          ...alert,
          count: products.filter((product) => product.quantity > 0 && isLowStockProduct(product)).length,
        };
      }

      if (alert.id === "restock") {
        return {
          ...alert,
          count: products.filter(isLowStockProduct).length,
        };
      }

      return alert;
    }),
    categories: fallbackDashboard.categories.map((category) => {
      const categoryProducts = products.filter((product) => productMatchesCategory(product, category.name));

      if (!categoryProducts.length) {
        return category;
      }

      const total = categoryProducts.reduce((sum, product) => sum + product.quantity, 0);

      return {
        ...category,
        total,
        unit: categoryProducts[0].unit,
        days: estimateDaysText(category.name, total),
      };
    }),
  };
}

export async function getStatisticsFallback(range: StatisticsRange = "month"): Promise<StatisticsSummary> {
  const dynamicSummary = await buildDynamicStatisticsSummary(range);

  return dynamicSummary ?? getFallbackStatistics(range);
}

export async function getNotificationSettingsFallback(): Promise<NotificationSettings> {
  return normalizeLocalNotificationSettings(await storage.get<unknown>(LOCAL_NOTIFICATION_SETTINGS_KEY));
}

function normalizeLocalNotificationSettings(settings: unknown): NotificationSettings {
  const incoming = isPlainObject(settings) ? settings : {};

  return {
    stockWarningEnabled: typeof incoming.stockWarningEnabled === "boolean"
      ? incoming.stockWarningEnabled
      : defaultNotificationSettings.stockWarningEnabled,
    expiryReminderEnabled: typeof incoming.expiryReminderEnabled === "boolean"
      ? incoming.expiryReminderEnabled
      : defaultNotificationSettings.expiryReminderEnabled,
    updatedAt: readLocalOptionalString(incoming.updatedAt) || defaultNotificationSettings.updatedAt,
  };
}

export async function updateLocalNotificationSettings(
  payload: UpdateNotificationSettingsRequest,
): Promise<UpdateNotificationSettingsResponse> {
  const settings = {
    ...(await getNotificationSettingsFallback()),
    ...(typeof payload.stockWarningEnabled === "boolean"
      ? { stockWarningEnabled: payload.stockWarningEnabled }
      : {}),
    ...(typeof payload.expiryReminderEnabled === "boolean"
      ? { expiryReminderEnabled: payload.expiryReminderEnabled }
      : {}),
    updatedAt: new Date().toISOString(),
  };

  await storage.set(LOCAL_NOTIFICATION_SETTINGS_KEY, settings);

  return {
    settings,
  };
}

export async function renameLocalFamily(
  payload: RenameFamilyRequest,
): Promise<RenameFamilyResponse> {
  const name = readRequiredString(payload.name, "name");

  const family = {
    ...(await getFamilyFallback()),
    name,
  };

  await storage.set(LOCAL_FAMILY_KEY, family);

  return {
    family,
  };
}

export async function updateLocalFamilyMemberRole(
  payload: UpdateFamilyMemberRoleRequest,
): Promise<UpdateFamilyMemberRoleResponse> {
  const memberId = readLocalItemId(payload.memberId);
  const role = readLocalFamilyMemberRole(payload.role);
  const family = await getFamilyFallback();
  const memberIndex = family.members.findIndex((member) => member.id === memberId);

  if (memberIndex === -1) {
    throw new Error("Family member not found");
  }

  const member = family.members[memberIndex];

  if (member.role === "admin" && role !== "admin" && countFamilyAdmins(family) <= 1) {
    throw new Error("At least one admin is required");
  }

  const nextFamily = normalizeFamilyCounts({
    ...family,
    members: family.members.map((item) =>
      item.id === memberId
        ? { ...item, role, roleText: roleTextForFamilyRole(role) }
        : item,
    ),
  });
  await storage.set(LOCAL_FAMILY_KEY, nextFamily);

  return {
    family: nextFamily,
  };
}

export async function updateLocalFamilyAddress(
  payload: UpdateFamilyAddressRequest,
): Promise<UpdateFamilyAddressResponse> {
  const address = {
    contactName: readRequiredString(payload.contactName, "contactName"),
    phone: readRequiredString(payload.phone, "phone"),
    region: readRequiredString(payload.region, "region"),
    detail: readRequiredString(payload.detail, "detail"),
    notes: readOptionalString(payload.notes) || undefined,
    updatedAt: new Date().toISOString(),
  };

  const family = {
    ...(await getFamilyFallback()),
    address,
  };

  await storage.set(LOCAL_FAMILY_KEY, family);

  return {
    family,
  };
}

export async function removeLocalFamilyMember(
  payload: RemoveFamilyMemberRequest,
): Promise<RemoveFamilyMemberResponse> {
  const memberId = readLocalItemId(payload.memberId);
  const family = await getFamilyFallback();
  const member = family.members.find((item) => item.id === memberId);

  if (!member) {
    throw new Error("Family member not found");
  }

  if (member.role === "admin" && countFamilyAdmins(family) <= 1) {
    throw new Error("At least one admin is required");
  }

  const nextFamily = normalizeFamilyCounts({
    ...family,
    members: family.members.filter((item) => item.id !== memberId),
  });
  await storage.set(LOCAL_FAMILY_KEY, nextFamily);

  return {
    family: nextFamily,
  };
}

export async function dissolveLocalFamily(): Promise<DissolveFamilyResponse> {
  const family = await getFamilyFallback();
  const profile = await getProfileFallback();
  const currentMember =
    family.members.find((member) => member.name.includes("我")) ??
    family.members.find((member) => member.role === "admin") ??
    family.members[0];
  const nextFamily = normalizeFamilyCounts({
    ...family,
    id: `family_${Date.now().toString(36)}`,
    name: `${profile.name}的家`,
    createdAt: new Date().toISOString().slice(0, 10),
    members: [
      {
        id: currentMember?.id ?? "member_self",
        name: `${profile.name}（我）`,
        subtitle: currentMember?.subtitle ?? `${profile.id}@family.local`,
        avatar: currentMember?.avatar ?? profile.avatar,
        role: "admin",
        roleText: "管理员",
      },
    ],
  });

  await storage.set(LOCAL_FAMILY_KEY, nextFamily);

  return {
    family: nextFamily,
  };
}

export async function dismissLocalReminder(
  payload: DismissReminderRequest,
): Promise<DismissReminderResponse> {
  const itemId = readLocalItemId(payload.itemId);
  const current = await getRemindersFallback();

  if (!current.items.some((item) => item.id === itemId)) {
    throw new Error("Reminder not found");
  }

  const dismissedItemIds = [...new Set([...(await listDismissedReminderIds()), itemId])];
  await storage.set(LOCAL_DISMISSED_REMINDERS_KEY, dismissedItemIds);

  return {
    dismissedItemIds,
    reminders: await getRemindersFallback(),
  };
}

export async function readAllLocalReminders(): Promise<ReadAllRemindersResponse> {
  const current = await getRemindersFallback();
  const dismissedItemIds = [
    ...new Set([...(await listDismissedReminderIds()), ...current.items.map((item) => item.id)]),
  ];
  await storage.set(LOCAL_DISMISSED_REMINDERS_KEY, dismissedItemIds);

  return {
    dismissedItemIds,
    reminders: await getRemindersFallback(),
  };
}

export async function completeLocalRestock(
  payload: CompleteRestockRequest,
): Promise<CompleteRestockResponse> {
  const itemIds = readLocalItemIds(payload.itemIds);

  const products = await listMergedProducts();
  const completedStaticItemIds = new Set(await listCompletedRestockItemIds());
  const removedItemIds = new Set(await listRemovedRestockItemIds());
  const customItems = await listCustomRestockItems();
  let remainingCustomItems = customItems;
  const restockItems = new Map(
    buildRestockPlan(products, completedStaticItemIds, removedItemIds, customItems)
      .groups.flatMap((group) => group.items.map((item) => [item.id, item])),
  );
  const completedItemIds: string[] = [];
  const restoredProductIds: string[] = [];

  for (const itemId of itemIds) {
    const item = restockItems.get(itemId);

    if (!item) continue;

    const product = upsertRestockedProduct(products, item);
    restoredProductIds.push(product.id);
    await appendLocalStockLog({
      product,
      action: "stock_in",
      actionText: "补货入库",
      quantity: readSuggestedQuantity(item.suggestedQuantity),
      notes: item.name,
    });
    completedItemIds.push(itemId);

    if (remainingCustomItems.some((customItem) => customItem.id === itemId)) {
      remainingCustomItems = remainingCustomItems.filter((customItem) => customItem.id !== itemId);
    }

    if (item.productId && item.productId !== item.id) {
      completedStaticItemIds.add(itemId);
    }
  }

  if (!completedItemIds.length) {
    throw new Error("No restock items matched");
  }

  await storage.set(LOCAL_PRODUCTS_KEY, products);
  await removeArchivedProductIds(restoredProductIds);
  await storage.set(LOCAL_COMPLETED_RESTOCK_KEY, [...completedStaticItemIds]);
  await storage.set(LOCAL_CUSTOM_RESTOCK_KEY, remainingCustomItems);

  return {
    completedItemIds,
    items: products,
    restockPlan: buildRestockPlan(
      products,
      completedStaticItemIds,
      new Set(await listRemovedRestockItemIds()),
      await listCustomRestockItems(),
    ),
  };
}

export async function removeLocalRestockItem(
  payload: RemoveRestockItemRequest,
): Promise<RemoveRestockItemResponse> {
  const itemId = readLocalItemId(payload.itemId);
  const products = await listMergedProducts();
  const completedItemIds = new Set(await listCompletedRestockItemIds());
  const removedItemIds = new Set(await listRemovedRestockItemIds());
  const customItems = await listCustomRestockItems();
  const plan = buildRestockPlan(products, completedItemIds, removedItemIds, customItems);
  const itemExists = plan.groups.some((group) => group.items.some((item) => item.id === itemId));

  if (!itemExists) {
    throw new Error("Restock item not found");
  }

  if (customItems.some((item) => item.id === itemId)) {
    await storage.set(
      LOCAL_CUSTOM_RESTOCK_KEY,
      customItems.filter((item) => item.id !== itemId),
    );
  } else {
    removedItemIds.add(itemId);
    await storage.set(LOCAL_REMOVED_RESTOCK_KEY, [...removedItemIds]);
  }

  return {
    removedItemIds: [itemId],
    restockPlan: await getRestockPlanFallback(),
  };
}

export async function addLocalRestockRecommendation(
  payload: AddRestockRecommendationRequest,
): Promise<AddRestockRecommendationResponse> {
  const recommendationId = readLocalItemId(payload.recommendationId);
  const recommendation = fallbackRestockPlan.recommendations.find(
    (item) => item.id === recommendationId,
  );

  if (!recommendation) {
    throw new Error("Recommendation not found");
  }

  const item = restockItemFromRecommendation(recommendation);
  const customItems = await listCustomRestockItems();
  const existing = customItems.find(
    (customItem) =>
      customItem.id === item.id || customItem.sourceRecommendationId === item.sourceRecommendationId,
  );

  if (!existing) {
    await storage.set(LOCAL_CUSTOM_RESTOCK_KEY, [item, ...customItems]);
  }

  const removedItemIds = (await listRemovedRestockItemIds()).filter((id) => id !== item.id);
  await storage.set(LOCAL_REMOVED_RESTOCK_KEY, removedItemIds);

  return {
    itemId: existing?.id ?? item.id,
    restockPlan: await getRestockPlanFallback(),
  };
}

export async function addLocalRestockProduct(
  payload: AddRestockProductRequest,
): Promise<AddRestockProductResponse> {
  const productId = readLocalItemId(payload.productId);
  const product = (await listMergedProducts()).find((item) => item.id === productId);

  if (!product) {
    throw new Error("Product not found");
  }

  const item = restockItemFromProduct(product);
  const customItems = await listCustomRestockItems();
  const existing = customItems.find((customItem) => customItem.id === item.id);

  if (!existing) {
    await storage.set(LOCAL_CUSTOM_RESTOCK_KEY, [item, ...customItems]);
  }

  const removedItemIds = (await listRemovedRestockItemIds()).filter((id) => id !== item.id);
  await storage.set(LOCAL_REMOVED_RESTOCK_KEY, removedItemIds);

  return {
    itemId: existing?.id ?? item.id,
    restockPlan: await getRestockPlanFallback(),
  };
}

async function listLocalProducts() {
  const products = await storage.get<unknown>(LOCAL_PRODUCTS_KEY);

  if (!Array.isArray(products)) {
    return [];
  }

  return products.flatMap((product) => {
    const normalized = normalizeLocalProduct(product);
    return normalized ? [normalized] : [];
  });
}

function normalizeLocalProduct(product: unknown): InventoryProductSummary | null {
  if (!isPlainObject(product)) {
    return null;
  }

  const id = readLocalOptionalString(product.id);
  const name = readLocalOptionalString(product.name);
  const category = readLocalOptionalString(product.category);
  const unit = readLocalOptionalString(product.unit);
  const quantity = Number(product.quantity);

  if (!id || !name || !category || !unit || !Number.isFinite(quantity)) {
    return null;
  }

  return withQuantity(
    {
      id,
      name,
      category,
      brand: readLocalOptionalString(product.brand) || "未填写品牌",
      spec: readLocalOptionalString(product.spec) || "未填写规格",
      quantity: 0,
      unit,
      status: "empty",
      statusText: "已耗尽",
      image: readLocalOptionalString(product.image) || imageForCategory(category),
      purchasePrice: readLogNonNegativeNumber(product.purchasePrice),
      purchaseChannel: readLocalOptionalString(product.purchaseChannel) || undefined,
      location: readLocalOptionalString(product.location) || undefined,
      isOpened: typeof product.isOpened === "boolean" ? product.isOpened : false,
      stockInDate: readLocalOptionalString(product.stockInDate) || undefined,
    },
    Math.max(0, quantity),
  );
}

async function listLocalPets() {
  const pets = await storage.get<unknown>(LOCAL_PETS_KEY);

  if (!Array.isArray(pets)) {
    return [];
  }

  return pets.flatMap((pet) => {
    const normalized = normalizeLocalPet(pet);
    return normalized ? [normalized] : [];
  });
}

function normalizeLocalPet(pet: unknown): PetProfileSummary | null {
  if (!isPlainObject(pet)) {
    return null;
  }

  const id = readLocalOptionalString(pet.id);
  const name = readLocalOptionalString(pet.name);

  if (!id || !name) {
    return null;
  }

  const albumPhotos = normalizeLocalPetAlbumPhotos(pet.albumPhotos);

  return {
    id,
    name,
    species: readLocalOptionalString(pet.species) || "猫",
    breed: readLocalOptionalString(pet.breed) || "混血",
    ageText: readLocalOptionalString(pet.ageText) || "未填写",
    weightKg: normalizeLocalPetWeight(pet.weightKg, 0),
    avatar: readLocalOptionalString(pet.avatar) || undefined,
    colorTone: readLocalPetColorTone(pet.colorTone),
    tags: normalizeLocalPetTags(pet.tags, []),
    diet: normalizeLocalPetDiet(pet.diet),
    inventoryEstimate: normalizeLocalPetInventoryEstimate(pet.inventoryEstimate),
    weightTrend: normalizeLocalPetWeightTrend(pet.weightTrend),
    albumCount: Math.max(
      normalizeLocalNonNegativeInteger(pet.albumCount, albumPhotos.length),
      albumPhotos.length,
    ),
    albumPhotos,
  };
}

function readLocalPetColorTone(value: unknown): PetProfileSummary["colorTone"] {
  return value === "orange" || value === "white" || value === "mint" || value === "lake" || value === "neutral"
    ? value
    : "neutral";
}

function normalizeLocalPetTags(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const tags = [...new Set(value.map(readLocalOptionalString).filter(Boolean))];

  return tags.length ? tags.slice(0, 5) : fallback;
}

function normalizeLocalPetAlbumPhotos(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map(readLocalOptionalString).filter(Boolean))].slice(0, 24);
}

function normalizeLocalPetDiet(value: unknown): PetProfileSummary["diet"] {
  const diet = isPlainObject(value) ? value : {};

  return {
    staple: readLocalOptionalString(diet.staple) || "未填写主粮",
    snack: readLocalOptionalString(diet.snack) || "未填写零食",
  };
}

function normalizeLocalPetInventoryEstimate(value: unknown): PetProfileSummary["inventoryEstimate"] {
  const estimate = isPlainObject(value) ? value : {};

  return {
    foodDays: normalizeLocalNonNegativeInteger(estimate.foodDays, 0),
    litterDays: normalizeLocalNonNegativeInteger(estimate.litterDays, 0),
  };
}

function normalizeLocalPetWeightTrend(value: unknown): PetProfileSummary["weightTrend"] {
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
    .filter(isPlainObject)
    .map((point) => ({
      label: readLocalOptionalString(point.label),
      value: normalizeLocalNonNegativeInteger(point.value, 0),
    }))
    .filter((point) => point.label);

  return points.length ? points.slice(-6) : normalizeLocalPetWeightTrend(null);
}

function normalizeLocalPetWeight(value: unknown, fallback: number) {
  const weight = Number(value);

  return Number.isFinite(weight) && weight >= 0 ? Math.round(weight * 10) / 10 : fallback;
}

function normalizeLocalNonNegativeInteger(value: unknown, fallback: number) {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0 ? Math.round(number) : fallback;
}

function normalizeLocalStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map(readLocalOptionalString).filter(Boolean))];
}

async function listMergedPets() {
  const localPets = await listLocalPets();
  const localPetsById = new Map(localPets.map((pet) => [pet.id, pet]));
  const fallbackIds = new Set(fallbackPets.map((pet) => pet.id));
  const localCreatedPets = localPets.filter((pet) => !fallbackIds.has(pet.id));

  return [
    ...localCreatedPets,
    ...fallbackPets.map((pet) => localPetsById.get(pet.id) ?? pet),
  ];
}

function upsertLocalPet(localPets: PetProfileSummary[], nextPet: PetProfileSummary) {
  const index = localPets.findIndex((pet) => pet.id === nextPet.id);

  if (index === -1) {
    return [nextPet, ...localPets];
  }

  return localPets.map((pet) => (pet.id === nextPet.id ? nextPet : pet));
}

async function listMergedProducts() {
  const archivedProductIds = new Set(await listArchivedProductIds());
  const localProducts = (await listLocalProducts()).filter((product) => !archivedProductIds.has(product.id));
  const localIds = new Set(localProducts.map((product) => product.id));

  return [
    ...localProducts,
    ...fallbackProducts.filter(
      (product) => !localIds.has(product.id) && !archivedProductIds.has(product.id),
    ),
  ];
}

async function listArchivedProductIds() {
  return normalizeLocalStringList(await storage.get<unknown>(LOCAL_ARCHIVED_PRODUCTS_KEY));
}

async function removeArchivedProductIds(productIds: string[]) {
  if (!productIds.length) return;

  const restoredIds = new Set(productIds);
  const archivedProductIds = (await listArchivedProductIds()).filter((id) => !restoredIds.has(id));

  await storage.set(LOCAL_ARCHIVED_PRODUCTS_KEY, archivedProductIds);
}

async function listCompletedRestockItemIds() {
  return normalizeLocalStringList(await storage.get<unknown>(LOCAL_COMPLETED_RESTOCK_KEY));
}

async function listRemovedRestockItemIds() {
  return normalizeLocalStringList(await storage.get<unknown>(LOCAL_REMOVED_RESTOCK_KEY));
}

async function listCustomRestockItems() {
  const items = await storage.get<unknown>(LOCAL_CUSTOM_RESTOCK_KEY);

  if (!Array.isArray(items)) {
    return [];
  }

  return items.flatMap((item) => {
    const normalized = normalizeLocalRestockItem(item);
    return normalized ? [normalized] : [];
  });
}

function normalizeLocalRestockItem(item: unknown): RestockItem | null {
  if (!isPlainObject(item)) {
    return null;
  }

  const id = readLocalOptionalString(item.id);
  const name = readLocalOptionalString(item.name);
  const description = readLocalOptionalString(item.description);

  if (!id || !name || !description) {
    return null;
  }

  const productId = readLocalOptionalString(item.productId);
  const sourceRecommendationId = readLocalOptionalString(item.sourceRecommendationId);
  const normalized: RestockItem = {
    id,
    name,
    description,
    productId: productId || undefined,
    category: readLocalOptionalString(item.category) || undefined,
    unit: readLocalOptionalString(item.unit) || undefined,
    suggestedQuantity: readSuggestedQuantity(item.suggestedQuantity),
    image: readLocalOptionalString(item.image) || undefined,
    icon: readLocalOptionalString(item.icon) || undefined,
    sourceRecommendationId: sourceRecommendationId || undefined,
    selected: Boolean(item.selected),
  };

  if (normalized.sourceRecommendationId) {
    return {
      ...normalized,
      productId: `prod_recommendation_${normalized.sourceRecommendationId}`,
    };
  }

  if (normalized.productId?.startsWith("local_restock_")) {
    return {
      ...normalized,
      productId: normalized.productId.replace("local_restock_", "prod_restock_"),
    };
  }

  return normalized;
}

async function listDismissedReminderIds() {
  return normalizeLocalStringList(await storage.get<unknown>(LOCAL_DISMISSED_REMINDERS_KEY));
}

async function listLocalStockLogs(products?: InventoryProductSummary[]) {
  const logs = await readLocalStockLogsWithFallback();

  return products ? enrichStockLogs(logs, products) : logs;
}

async function readLocalStockLogsWithFallback() {
  const stockLogs = await storage.get<unknown>(LOCAL_STOCK_LOGS_KEY);
  const localLogs = Array.isArray(stockLogs)
    ? stockLogs.flatMap((log) => {
        const normalized = normalizeLocalStockLog(log);
        return normalized ? [normalized] : [];
      })
    : [];
  const localIds = new Set(localLogs.map((log) => log.id));

  return [...localLogs, ...fallbackStockLogs.filter((log) => !localIds.has(log.id))];
}

function normalizeLocalStockLog(log: unknown): ProductStockLogSummary | null {
  if (!isPlainObject(log)) {
    return null;
  }

  const id = readLocalOptionalString(log.id);
  const productId = readLocalOptionalString(log.productId);
  const action = readLocalStockLogAction(log.action);
  const actionText = readLocalOptionalString(log.actionText);
  const quantity = Number(log.quantity);
  const unit = readLocalOptionalString(log.unit);
  const operatorName = readLocalOptionalString(log.operatorName);
  const operatedAt = readLocalOptionalString(log.operatedAt);

  if (!id || !productId || !action || !actionText || !Number.isFinite(quantity) || !unit || !operatorName || !operatedAt) {
    return null;
  }

  return {
    id,
    productId,
    productName: readLocalOptionalString(log.productName) || undefined,
    productImage: readLocalOptionalString(log.productImage) || undefined,
    productCategory: readLocalOptionalString(log.productCategory) || undefined,
    action,
    actionText,
    quantity: Math.max(0, quantity),
    unit,
    unitPrice: readLogNonNegativeNumber(log.unitPrice),
    amount: readLogNonNegativeNumber(log.amount),
    operatorName,
    operatedAt,
    notes: readLocalOptionalString(log.notes) || undefined,
  };
}

function readLocalStockLogAction(value: unknown): ProductStockLogSummary["action"] | "" {
  if (value === "stock_in" || value === "stock_out" || value === "adjust" || value === "expired" || value === "gift") {
    return value;
  }

  return "";
}

async function persistEnrichedLocalStockLogs(products: InventoryProductSummary[]) {
  const logs = await readLocalStockLogsWithFallback();
  const enrichedLogs = enrichStockLogs(logs, products);

  if (!areStockLogsEqual(logs, enrichedLogs)) {
    await storage.set(LOCAL_STOCK_LOGS_KEY, enrichedLogs);
  }
}

async function appendLocalStockLog({
  product,
  action,
  actionText,
  quantity,
  notes,
  allowZero = false,
}: {
  product: InventoryProductSummary;
  action: ProductStockLogSummary["action"];
  actionText: string;
  quantity: number;
  notes?: unknown;
  allowZero?: boolean;
}) {
  if (!allowZero && !quantity) return;

  const logs = await listLocalStockLogs(await listMergedProducts());
  const unitPrice = action === "stock_in" ? readLogNonNegativeNumber(product.purchasePrice) : undefined;
  const amount = unitPrice === undefined ? undefined : roundCurrency(unitPrice * quantity);

  await storage.set(LOCAL_STOCK_LOGS_KEY, [
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
      operatorName: "我",
      operatedAt: new Date().toISOString(),
      notes: readOptionalString(notes) || undefined,
    },
    ...logs,
  ]);
}

async function appendLocalAdjustmentStockLog(
  previousProduct: InventoryProductSummary,
  nextProduct: InventoryProductSummary,
  notes?: unknown,
) {
  const delta = nextProduct.quantity - previousProduct.quantity;

  if (delta === 0) return;

  await appendLocalStockLog({
    product: nextProduct,
    action: delta > 0 ? "stock_in" : "adjust",
    actionText: delta > 0 ? "库存调整入库" : "库存调整",
    quantity: Math.abs(delta),
    notes,
  });
}

function decorateStockLog(
  log: ProductStockLogSummary,
  product: InventoryProductSummary | undefined,
): ProductStockLogSummary {
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

function enrichStockLogs(
  logs: ProductStockLogSummary[],
  products: InventoryProductSummary[],
) {
  const productsById = new Map(products.map((product) => [product.id, product]));

  return logs.map((log) => enrichStockLog(log, productsById.get(log.productId)));
}

function enrichStockLog(
  log: ProductStockLogSummary,
  product: InventoryProductSummary | undefined,
): ProductStockLogSummary {
  if (!product) {
    return log;
  }

  const unitPrice = readLogNonNegativeNumber(log.unitPrice) ??
    (log.action === "stock_in" ? readLogNonNegativeNumber(product.purchasePrice) : undefined);
  const amount = readLogNonNegativeNumber(log.amount) ??
    (log.action === "stock_in" && unitPrice !== undefined
      ? roundCurrency(unitPrice * log.quantity)
      : undefined);

  return {
    ...log,
    productName: log.productName || product.name,
    productImage: log.productImage || product.image,
    productCategory: log.productCategory || product.category,
    unitPrice,
    amount,
  };
}

function areStockLogsEqual(
  left: ProductStockLogSummary[],
  right: ProductStockLogSummary[],
) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((leftItem, index) => {
    const rightItem = right[index];

    return stockLogFieldNames.every((fieldName) => leftItem[fieldName] === rightItem[fieldName]);
  });
}

const stockLogFieldNames = [
  "id",
  "productId",
  "productName",
  "productImage",
  "productCategory",
  "action",
  "actionText",
  "quantity",
  "unit",
  "unitPrice",
  "amount",
  "operatorName",
  "operatedAt",
  "notes",
] as const satisfies readonly (keyof ProductStockLogSummary)[];

function toPetProfileSummary(payload: CreatePetRequest): PetProfileSummary {
  const name = readRequiredString(payload.name, "name");
  const species = readOptionalString(payload.species) || "猫";

  return {
    id: `pet_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    species,
    breed: readOptionalString(payload.breed) || "混血",
    ageText: readOptionalString(payload.ageText) || "未填写",
    weightKg: readPetWeight(payload.weightKg ?? 0),
    colorTone: species.includes("狗") ? "lake" : "mint",
    tags: readPetTags(payload.tags, ["新成员"]),
    diet: readPetDiet(payload.diet, {
      staple: "未填写主粮",
      snack: "未填写零食",
    }),
    inventoryEstimate: {
      foodDays: 0,
      litterDays: 0,
    },
    weightTrend: [
      { label: "08月", value: 50 },
      { label: "09月", value: 58 },
      { label: "10月", value: 62 },
      { label: "11月", value: 68 },
      { label: "12月", value: 72 },
    ],
    albumCount: 0,
    albumPhotos: [],
  };
}

function withPetUpdates(
  pet: PetProfileSummary,
  payload: UpdatePetRequest,
): PetProfileSummary {
  return {
    ...pet,
    name: readPetText(payload.name, pet.name, true),
    species: readPetText(payload.species, pet.species, true),
    breed: readPetText(payload.breed, pet.breed, true),
    ageText: readPetText(payload.ageText, pet.ageText),
    weightKg: payload.weightKg === undefined ? pet.weightKg : readPetWeight(payload.weightKg),
    tags: payload.tags === undefined ? pet.tags : readPetTags(payload.tags, pet.tags),
    diet: payload.diet === undefined ? pet.diet : readPetDiet(payload.diet, pet.diet),
  };
}

function readPetDiet(value: unknown, fallback: PetProfileSummary["diet"]) {
  const diet = value && typeof value === "object" ? (value as Partial<PetProfileSummary["diet"]>) : {};

  return {
    staple: readPetText(diet.staple, fallback.staple),
    snack: readPetText(diet.snack, fallback.snack),
  };
}

function readPetText(value: unknown, fallback: string, required = false) {
  if (value === undefined) {
    return fallback;
  }

  const text = typeof value === "string" ? value.trim() : "";

  if (!text && required) {
    throw new Error("Pet field is required");
  }

  return text || fallback;
}

function withProfileUpdates(
  profile: ProfileSummary,
  payload: UpdateProfileRequest,
): ProfileSummary {
  return {
    ...profile,
    name: readProfileUpdateString(payload.name, profile.name, "name", true),
    avatar: readProfileUpdateString(payload.avatar, profile.avatar, "avatar"),
  };
}

function readProfileUpdateString(
  value: unknown,
  fallback: string,
  key: string,
  required = false,
) {
  if (value === undefined) {
    return fallback;
  }

  const text = typeof value === "string" ? value.trim() : "";

  if (!text && required) {
    throw new Error(`${key} is required`);
  }

  return text || fallback;
}

function normalizeLocalProfile(profile: unknown): Partial<ProfileSummary> {
  if (!isPlainObject(profile)) {
    return {};
  }

  const stats = normalizeLocalProfileStats(profile.stats);

  return {
    ...(readLocalOptionalString(profile.id) ? { id: readLocalOptionalString(profile.id) } : {}),
    ...(readLocalOptionalString(profile.name) ? { name: readLocalOptionalString(profile.name) } : {}),
    ...(readLocalOptionalString(profile.familyName) ? { familyName: readLocalOptionalString(profile.familyName) } : {}),
    ...(readLocalOptionalString(profile.avatar) ? { avatar: readLocalOptionalString(profile.avatar) } : {}),
    ...(stats ? { stats } : {}),
  };
}

function normalizeLocalProfileStats(stats: unknown): ProfileSummary["stats"] | undefined {
  if (!isPlainObject(stats)) {
    return undefined;
  }

  return {
    petCount: normalizeLocalNonNegativeInteger(stats.petCount, fallbackProfile.stats.petCount),
    bookkeepingDays: normalizeLocalNonNegativeInteger(
      stats.bookkeepingDays,
      fallbackProfile.stats.bookkeepingDays,
    ),
    reminderCount: normalizeLocalNonNegativeInteger(
      stats.reminderCount,
      fallbackProfile.stats.reminderCount,
    ),
  };
}

function readPetTags(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const tags = [...new Set(value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean))];

  return tags.length ? tags.slice(0, 5) : fallback;
}

function readPetWeight(value: unknown) {
  const weight = Number(value);

  if (!Number.isFinite(weight) || weight < 0) {
    throw new Error("weightKg must be a non-negative number");
  }

  return Math.round(weight * 10) / 10;
}

function toProductSummary(payload: CreateProductRequest): InventoryProductSummary {
  const name = readRequiredString(payload.name, "name");
  const category = readRequiredString(payload.category, "category");
  const unit = readRequiredString(payload.unit, "unit");

  return withQuantity({
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
  }, readNonNegativeQuantity(payload.quantity));
}

function withQuantity(
  product: InventoryProductSummary,
  quantity: number,
): InventoryProductSummary {
  return {
    ...product,
    quantity,
    status: statusForQuantity(quantity, product),
    statusText: statusTextForQuantity(quantity, product),
  };
}

function withStockInMetadata(
  product: InventoryProductSummary,
  incomingProduct: InventoryProductSummary,
): InventoryProductSummary {
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

function isSameStockInProduct(
  product: InventoryProductSummary,
  incomingProduct: InventoryProductSummary,
) {
  return productIdentityKey(product) === productIdentityKey(incomingProduct);
}

function productIdentityKey(product: InventoryProductSummary) {
  return [
    product.name,
    product.brand,
    product.category,
    product.unit,
  ]
    .map(normalizeProductIdentity)
    .join("|");
}

function normalizeProductIdentity(value: string) {
  return value.trim().toLocaleLowerCase("zh-CN");
}

function filterProducts(
  products: InventoryProductSummary[],
  filters: ProductListFilters,
) {
  const query = readOptionalString(filters.query).toLocaleLowerCase("zh-CN");
  const category = readOptionalString(filters.category);
  const status = filters.status === "all" ? "" : filters.status;

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

type ProductMetadataUpdateKey = "name" | "category" | "brand" | "spec" | "unit";
type ProductOptionalMetadataUpdateKey = "purchaseChannel" | "location" | "stockInDate";

function withProductMetadata(
  product: InventoryProductSummary,
  payload: UpdateProductRequest,
): InventoryProductSummary {
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

function readProductUpdateString(
  payload: UpdateProductRequest,
  key: ProductMetadataUpdateKey,
  fallback: string,
  options: { required?: boolean } = {},
) {
  if (!Object.prototype.hasOwnProperty.call(payload, key)) {
    return fallback;
  }

  const value = payload[key];
  const text = typeof value === "string" ? value.trim() : "";

  if (!text && options.required) {
    throw new Error(`${key} is required`);
  }

  return text || fallback;
}

function readRequiredString(value: unknown, key: string) {
  const text = typeof value === "string" ? value.trim() : "";

  if (!text) {
    throw new Error(`${key} is required`);
  }

  return text;
}

function readOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readProductOptionalUpdateString(
  payload: UpdateProductRequest,
  key: ProductOptionalMetadataUpdateKey,
  fallback?: string,
) {
  if (!Object.prototype.hasOwnProperty.call(payload, key)) {
    return fallback;
  }

  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function buildProductDetail(item: InventoryProductSummary): ProductDetailResponse {
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

function productDetailTags(item: InventoryProductSummary) {
  const targetPetTag = item.name.includes("猫") || item.category.includes("猫") || item.unit === "罐"
    ? "猫咪"
    : item.isOpened
      ? "已开封"
      : "主粮";

  return [...new Set([item.category, targetPetTag].filter(Boolean))];
}

function buildRestockPlan(
  products: InventoryProductSummary[],
  completedStaticItemIds: Set<string>,
  removedItemIds: Set<string>,
  customItems: RestockItem[],
): RestockPlan {
  const customRestockItems = customItems.filter((item) => !removedItemIds.has(item.id));
  const customRecommendationIds = new Set(
    customRestockItems.map((item) => item.sourceRecommendationId).filter(Boolean),
  );
  const plan: RestockPlan = {
    ...fallbackRestockPlan,
    groups: fallbackRestockPlan.groups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) => !completedStaticItemIds.has(item.id) && !removedItemIds.has(item.id),
        ),
      }))
      .filter((group) => group.items.length > 0),
    recommendations: fallbackRestockPlan.recommendations.filter(
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

function buildReminderItems(products: InventoryProductSummary[]) {
  const generated = products.filter(isLowStockProduct).map(toStockReminder);
  const staticIds = new Set(fallbackReminders.map((item) => item.id));

  return [...fallbackReminders, ...generated.filter((item) => !staticIds.has(item.id))];
}

function summarizeReminders(items: ReminderItem[]): ReminderListResponse {
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

function isReminderEnabled(item: ReminderItem, settings: NotificationSettings) {
  if (item.category === "stock") {
    return settings.stockWarningEnabled;
  }

  return settings.expiryReminderEnabled;
}

interface ExpenseRecord {
  id: string;
  productId?: string;
  productImage?: string;
  productArchived?: boolean;
  name: string;
  category: string;
  operatedAt: Date;
  amount: number;
}

interface TrendBucket {
  label: string;
  start: Date;
  end: Date;
  amount: number;
}

async function buildDynamicStatisticsSummary(range: StatisticsRange): Promise<StatisticsSummary | null> {
  const expenseRecords = await buildExpenseRecords(range);

  if (!expenseRecords.length) {
    return null;
  }

  const totalExpense = roundCurrency(expenseRecords.reduce((sum, record) => sum + record.amount, 0));
  const previousExpenseRecords = await buildExpenseRecords(range, previousRangeAnchor(range));
  const previousTotal = roundCurrency(previousExpenseRecords.reduce((sum, record) => sum + record.amount, 0));
  const categoryTotals = new Map<string, number>();

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

async function buildExpenseRecords(
  range: StatisticsRange,
  now = new Date(),
): Promise<ExpenseRecord[]> {
  const products = await listMergedProducts();
  const productsById = new Map(products.map((product) => [product.id, product]));

  return (await listLocalStockLogs(products))
    .filter((log) => log.action === "stock_in")
    .map((log): ExpenseRecord | null => {
      const product = productsById.get(log.productId);
      const operatedAt = new Date(log.operatedAt);
      const unitPrice = readLogNonNegativeNumber(log.unitPrice) ??
        readLogNonNegativeNumber(product?.purchasePrice);
      const amount = readLogNonNegativeNumber(log.amount) ??
        (unitPrice === undefined || !Number.isFinite(log.quantity)
          ? undefined
          : roundCurrency(unitPrice * log.quantity));
      const name = log.productName || product?.name;
      const category = log.productCategory || product?.category;

      if (
        !name ||
        !category ||
        amount === undefined ||
        Number.isNaN(operatedAt.getTime()) ||
        !isInStatisticsRange(operatedAt, range, now)
      ) {
        return null;
      }

      if (amount <= 0) {
        return null;
      }

      return {
        id: log.id,
        productId: log.productId,
        productImage: log.productImage || product?.image,
        productArchived: Boolean(log.productArchived),
        name,
        category: toExpenseCategory(category),
        operatedAt,
        amount,
      };
    })
    .filter((record): record is ExpenseRecord => Boolean(record));
}

function buildTrendSeries(records: ExpenseRecord[], range: StatisticsRange, now = new Date()) {
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

function createTrendBuckets(range: StatisticsRange, now: Date): TrendBucket[] {
  if (range === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, index) => {
      const dayStart = new Date(start);
      dayStart.setDate(start.getDate() + index);

      return {
        label: weekdayLabel(dayStart),
        start: dayStart,
        end: endOfDay(dayStart),
        amount: 0,
      };
    });
  }

  if (range === "year") {
    return Array.from({ length: 4 }, (_, index) => ({
      label: `Q${index + 1}`,
      start: new Date(now.getFullYear(), index * 3, 1),
      end: new Date(now.getFullYear(), index * 3 + 3, 0, 23, 59, 59, 999),
      amount: 0,
    }));
  }

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  return Array.from({ length: 6 }, (_, index) => {
    const startDay = Math.floor((index * daysInMonth) / 6) + 1;
    const endDay = Math.floor(((index + 1) * daysInMonth) / 6);

    return {
      label: ["一", "二", "三", "四", "五", "六"][index],
      start: new Date(now.getFullYear(), now.getMonth(), startDay),
      end: new Date(now.getFullYear(), now.getMonth(), endDay, 23, 59, 59, 999),
      amount: 0,
    };
  });
}

function endOfDay(date: Date) {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

function weekdayLabel(date: Date) {
  return ["日", "一", "二", "三", "四", "五", "六"][date.getDay()];
}

function previousRangeAnchor(range: StatisticsRange) {
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

function isInStatisticsRange(date: Date, range: StatisticsRange, now: Date) {
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

function statisticsRangeDayCount(range: StatisticsRange) {
  if (range === "week") return 7;

  const now = new Date();

  if (range === "year") {
    const start = new Date(now.getFullYear(), 0, 1);
    return Math.max(1, Math.floor((now.getTime() - start.getTime()) / 86_400_000) + 1);
  }

  return now.getDate();
}

function toExpenseCategory(category: string) {
  if (category.includes("粮")) return "主粮";
  if (category.includes("罐") || category.includes("零食")) return "零食";
  if (category.includes("砂") || category.includes("用品") || category.includes("保健")) return "用品";
  return "其他";
}

function formatStatisticsDate(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, "0")}月${String(date.getDate()).padStart(2, "0")}日`;
}

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

function readLogNonNegativeNumber(value: unknown) {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function toStockReminder(product: InventoryProductSummary): ReminderItem {
  return {
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
  };
}

function restockItemFromRecommendation(
  recommendation: RestockPlan["recommendations"][number],
): RestockItem {
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
    image: recommendation.image,
    icon: recommendation.icon,
    sourceRecommendationId: recommendation.id,
    selected: false,
  };
}

function restockItemFromProduct(product: InventoryProductSummary): RestockItem {
  const suggestedQuantity = suggestedRestockQuantity(product);

  return {
    id: `product_${product.id}`,
    productId: product.id,
    name: product.name,
    description: `当前库存: ${product.quantity} ${product.unit} · 建议补 ${suggestedQuantity}${product.unit}`,
    category: product.category,
    unit: product.unit,
    suggestedQuantity,
    image: product.image,
    selected: false,
  };
}

function upsertRestockedProduct(products: InventoryProductSummary[], item: RestockItem) {
  const category = item.category || inferCategory(item.name);
  const unit = item.unit || inferUnit(item.description);
  const productId = item.productId || `prod_restock_${item.id}`;
  const quantity = readSuggestedQuantity(item.suggestedQuantity);
  const productIndex = products.findIndex((product) => product.id === productId || product.id === item.id);

  if (productIndex >= 0) {
    products[productIndex] = withQuantity(products[productIndex], products[productIndex].quantity + quantity);
    return products[productIndex];
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
      image: item.image || imageForCategory(category),
      purchaseChannel: "补货入库",
      location: undefined,
      isOpened: false,
      stockInDate: new Date().toISOString().slice(0, 10),
    },
    quantity,
  );

  products.unshift(product);
  return product;
}

function imageForCategory(category: string) {
  if (category.includes("罐")) return "/static/products/ziwi.png";
  if (category.includes("砂")) return "/static/products/litter.png";
  return "/static/products/orijen.png";
}

function suggestedRestockQuantity(product: InventoryProductSummary) {
  const targetQuantity = product.category.includes("罐")
    ? 12
    : product.category.includes("砂") || product.category.includes("用品")
      ? 4
      : 4;

  return Math.max(1, targetQuantity - product.quantity);
}

function readSuggestedQuantity(value: unknown) {
  const quantity = Number(value);

  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

function readNonNegativeQuantity(value: unknown) {
  const quantity = Number(value);

  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error("quantity must be a non-negative number");
  }

  return quantity;
}

function readPositiveQuantity(value: unknown) {
  const quantity = Number(value);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("quantity must be a positive number");
  }

  return quantity;
}

function readOptionalNonNegativeNumber(value: unknown, key: string) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const quantity = Number(value);

  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error(`${key} must be a non-negative number`);
  }

  return quantity;
}

function readOptionalBoolean(value: unknown, key: string) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new Error(`${key} must be a boolean`);
  }

  return value;
}

function normalizeFamilyCounts(family: FamilyOverview): FamilyOverview {
  return {
    ...family,
    memberCount: family.members.length,
  };
}

function normalizeLocalFamily(family: unknown): FamilyOverview {
  const incoming = isPlainObject(family) ? family : {};

  return normalizeFamilyCounts({
    id: readLocalOptionalString(incoming.id) || fallbackFamily.id,
    name: readLocalOptionalString(incoming.name) || fallbackFamily.name,
    createdAt: readLocalOptionalString(incoming.createdAt) || fallbackFamily.createdAt,
    memberCount: 0,
    address: normalizeLocalFamilyAddress(incoming.address),
    members: normalizeLocalFamilyMembers(incoming.members),
    settings: normalizeFamilySettings(incoming.settings),
  });
}

function normalizeLocalFamilyAddress(address: unknown): FamilyOverview["address"] {
  const incoming = isPlainObject(address) ? address : {};

  return {
    contactName: readLocalOptionalString(incoming.contactName) || fallbackFamily.address.contactName,
    phone: readLocalOptionalString(incoming.phone) || fallbackFamily.address.phone,
    region: readLocalOptionalString(incoming.region) || fallbackFamily.address.region,
    detail: readLocalOptionalString(incoming.detail) || fallbackFamily.address.detail,
    notes: readLocalOptionalString(incoming.notes) || undefined,
    updatedAt: readLocalOptionalString(incoming.updatedAt) || fallbackFamily.address.updatedAt,
  };
}

function normalizeLocalFamilyMembers(members: unknown): FamilyOverview["members"] {
  const incoming = Array.isArray(members) ? members : fallbackFamily.members;
  const normalized = incoming.flatMap((member, index) => {
    const normalizedMember = normalizeLocalFamilyMember(member, index);
    return normalizedMember ? [normalizedMember] : [];
  });
  const usableMembers = normalized.length ? normalized : fallbackFamily.members;

  if (usableMembers.some((member) => member.role === "admin")) {
    return usableMembers;
  }

  const [firstMember, ...restMembers] = usableMembers;

  return [
    {
      ...firstMember,
      role: "admin",
      roleText: roleTextForFamilyRole("admin"),
    },
    ...restMembers,
  ];
}

function normalizeLocalFamilyMember(
  member: unknown,
  index: number,
): FamilyOverview["members"][number] | null {
  if (!isPlainObject(member)) {
    return null;
  }

  const fallbackMember = fallbackFamily.members[index];
  const id = readLocalOptionalString(member.id) || fallbackMember?.id;
  const name = readLocalOptionalString(member.name) || fallbackMember?.name;
  const subtitle = readLocalOptionalString(member.subtitle) || fallbackMember?.subtitle;
  const role = readLocalOptionalFamilyMemberRole(member.role) || fallbackMember?.role || "member";

  if (!id || !name || !subtitle) {
    return null;
  }

  return {
    id,
    name,
    subtitle,
    avatar: readLocalOptionalString(member.avatar) || fallbackMember?.avatar,
    role,
    roleText: readLocalOptionalString(member.roleText) || roleTextForFamilyRole(role),
  };
}

function normalizeFamilySettings(settings: unknown): FamilyOverview["settings"] {
  const incoming = Array.isArray(settings) ? settings : [];

  return fallbackFamily.settings.map((fallbackSetting) => {
    const matched = incoming.find(
      (item): item is { label?: unknown } =>
        isPlainObject(item) && item.id === fallbackSetting.id,
    );
    const label = typeof matched?.label === "string" ? matched.label.trim() : "";

    return {
      id: fallbackSetting.id,
      label: label || fallbackSetting.label,
    };
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function countFamilyAdmins(family: FamilyOverview) {
  return family.members.filter((member) => member.role === "admin").length;
}

function readLocalItemId(value: unknown) {
  const itemId = typeof value === "string" ? value.trim() : "";

  if (!itemId) {
    throw new Error("itemId is required");
  }

  return itemId;
}

function readLocalItemIds(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error("itemIds must be an array");
  }

  const itemIds = [...new Set(value.map(readLocalOptionalString).filter(Boolean))];

  if (!itemIds.length) {
    throw new Error("itemIds must include at least one item");
  }

  return itemIds;
}

function readLocalOptionalString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readLocalFamilyMemberRole(value: unknown): FamilyOverview["members"][number]["role"] {
  if (value === "admin" || value === "member" || value === "guest") {
    return value;
  }

  throw new Error("role must be admin, member, or guest");
}

function readLocalOptionalFamilyMemberRole(
  value: unknown,
): FamilyOverview["members"][number]["role"] | "" {
  if (value === "admin" || value === "member" || value === "guest") {
    return value;
  }

  return "";
}

function roleTextForFamilyRole(role: FamilyOverview["members"][number]["role"]) {
  if (role === "admin") return "管理员";
  if (role === "guest") return "访客";
  return "成员";
}

function statusForQuantity(quantity: number, product: InventoryProductSummary) {
  if (quantity <= 0) return "empty";
  if (quantity <= lowStockThreshold(product)) return "low";
  return "enough";
}

function statusTextForQuantity(quantity: number, product: InventoryProductSummary) {
  if (quantity <= 0) return "已耗尽";
  if (quantity <= lowStockThreshold(product)) return "即将耗尽";
  return "充足";
}

function isLowStockProduct(product: InventoryProductSummary) {
  return product.quantity <= lowStockThreshold(product);
}

function lowStockThreshold(product: InventoryProductSummary) {
  return product.unit === "罐" || product.category.includes("罐") ? 3 : 0;
}

function productMatchesCategory(product: InventoryProductSummary, categoryName: string) {
  return product.category.includes(categoryName) || categoryName.includes(product.category);
}

function estimateDaysText(categoryName: string, total: number) {
  if (total <= 0) return "已用尽";

  if (categoryName.includes("猫粮")) {
    return `约${Math.max(1, Math.round(total * 18))}天`;
  }

  if (categoryName.includes("罐")) {
    return `约${Math.max(1, Math.round(total * 4))}天`;
  }

  return `约${Math.max(1, Math.round(total * 7))}天`;
}

function stockLogActionForConsume(actionType: ConsumeProductRequest["actionType"]) {
  if (actionType === "adjust") return "adjust";
  if (actionType === "expired") return "expired";
  if (actionType === "gift") return "gift";
  return "stock_out";
}

function stockLogTextForConsume(actionType: ConsumeProductRequest["actionType"]) {
  if (actionType === "adjust") return "库存调整";
  if (actionType === "expired") return "过期损耗";
  if (actionType === "gift") return "赠送出库";
  return "日常消耗";
}

function inferCategory(name: string) {
  if (name.includes("砂")) return "猫砂";
  if (name.includes("粮")) return "猫粮";
  if (name.includes("罐") || name.includes("肉")) return "零食";
  return "用品";
}

function inferUnit(description: string) {
  if (description.includes("罐")) return "罐";
  if (description.includes("袋")) return "袋";
  if (description.includes("包")) return "包";
  return "件";
}

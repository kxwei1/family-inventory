import type {
  AddPetAlbumPhotoRequest,
  AddPetAlbumPhotoResponse,
  AddPetAlbumPhotosRequest,
  AddPetAlbumPhotosResponse,
  RemovePetAlbumPhotoRequest,
  RemovePetAlbumPhotoResponse,
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
  DashboardSummary,
  DismissReminderRequest,
  DismissReminderResponse,
  DissolveFamilyResponse,
  FamilyOverview,
  NotificationSettings,
  PetListResponse,
  ProductDetailResponse,
  ProductListFilters,
  ProductListResponse,
  ProductStockLogResponse,
  ProfileSummary,
  ReadAllRemindersResponse,
  RemoveFamilyMemberRequest,
  RemoveFamilyMemberResponse,
  ReminderListResponse,
  RenameFamilyRequest,
  RenameFamilyResponse,
  RemoveRestockItemRequest,
  RemoveRestockItemResponse,
  RestockPlan,
  StockLogListResponse,
  StatisticsRange,
  StatisticsSummary,
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
import { getJsonWithFallback, postJsonWithFallback } from "./apiClient";
import {
  addLocalRestockProduct,
  addLocalRestockRecommendation,
  addLocalPetAlbumPhoto,
  addLocalPetAlbumPhotos,
  removeLocalPetAlbumPhoto,
  archiveLocalProduct,
  completeLocalRestock,
  createLocalPet,
  createLocalProduct,
  consumeLocalProduct,
  dismissLocalReminder,
  getDashboardFallback,
  getFamilyFallback,
  getNotificationSettingsFallback,
  getPetsFallback,
  getProductDetailFallback,
  getProductListFallback,
  getProductLogsFallback,
  getProfileFallback,
  getRemindersFallback,
  getStockLogsFallback,
  getStatisticsFallback,
  getRestockPlanFallback,
  readAllLocalReminders,
  renameLocalFamily,
  removeLocalFamilyMember,
  removeLocalRestockItem,
  dissolveLocalFamily,
  stockInLocalProduct,
  updateLocalFamilyMemberRole,
  updateLocalFamilyAddress,
  updateLocalNotificationSettings,
  updateLocalPet,
  updateLocalProfile,
  updateLocalProduct,
} from "./localInventory";

export function fetchProducts(filters: ProductListFilters = {}) {
  return getJsonWithFallback<ProductListResponse>(
    `/api/products${toProductListQuery(filters)}`,
    () => getProductListFallback(filters),
  );
}

function toProductListQuery(filters: ProductListFilters) {
  const params = new URLSearchParams();
  const query = filters.query?.trim();
  const category = filters.category?.trim();
  const status = filters.status === "all" ? "" : filters.status;

  if (query) params.set("q", query);
  if (category && category !== "all") params.set("category", category);
  if (status) params.set("status", status);

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

export function fetchProductDetail(id: string) {
  return getJsonWithFallback<ProductDetailResponse>(
    `/api/products/${encodeURIComponent(id)}`,
    () => getProductDetailFallback(id),
    { fallbackOnHttpError: false },
  );
}

export function fetchProductLogs(id: string) {
  return getJsonWithFallback<ProductStockLogResponse>(
    `/api/products/${encodeURIComponent(id)}/logs`,
    () => getProductLogsFallback(id),
    { fallbackOnHttpError: false },
  );
}

export function fetchStockLogs() {
  return getJsonWithFallback<StockLogListResponse>("/api/stock-logs", getStockLogsFallback);
}

export function fetchProfile() {
  return getJsonWithFallback<ProfileSummary>("/api/profile", getProfileFallback);
}

export function updateProfile(payload: UpdateProfileRequest) {
  return postJsonWithFallback<UpdateProfileResponse, UpdateProfileRequest>(
    "/api/profile/update",
    payload,
    () => updateLocalProfile(payload),
    { fallbackOnHttpError: false },
  );
}

export function fetchPets() {
  return getJsonWithFallback<PetListResponse>("/api/pets", getPetsFallback);
}

export function createPet(payload: CreatePetRequest) {
  return postJsonWithFallback<CreatePetResponse, CreatePetRequest>(
    "/api/pets",
    payload,
    () => createLocalPet(payload),
    { fallbackOnHttpError: false },
  );
}

export function updatePet(id: string, payload: UpdatePetRequest) {
  return postJsonWithFallback<UpdatePetResponse, UpdatePetRequest>(
    `/api/pets/${encodeURIComponent(id)}/update`,
    payload,
    () => updateLocalPet(id, payload),
    { fallbackOnHttpError: false },
  );
}

export function addPetAlbumPhoto(id: string, payload: AddPetAlbumPhotoRequest) {
  return postJsonWithFallback<AddPetAlbumPhotoResponse, AddPetAlbumPhotoRequest>(
    `/api/pets/${encodeURIComponent(id)}/album`,
    payload,
    () => addLocalPetAlbumPhoto(id, payload),
    { fallbackOnHttpError: false },
  );
}

export function addPetAlbumPhotos(id: string, payload: AddPetAlbumPhotosRequest) {
  return postJsonWithFallback<AddPetAlbumPhotosResponse, AddPetAlbumPhotosRequest>(
    `/api/pets/${encodeURIComponent(id)}/album/batch`,
    payload,
    () => addLocalPetAlbumPhotos(id, payload),
    { fallbackOnHttpError: false },
  );
}

export function removePetAlbumPhoto(id: string, payload: RemovePetAlbumPhotoRequest) {
  return postJsonWithFallback<RemovePetAlbumPhotoResponse, RemovePetAlbumPhotoRequest>(
    `/api/pets/${encodeURIComponent(id)}/album/remove`,
    payload,
    () => removeLocalPetAlbumPhoto(id, payload),
    { fallbackOnHttpError: false },
  );
}

export function fetchStatistics(range: StatisticsRange = "month") {
  return getJsonWithFallback<StatisticsSummary>(
    `/api/statistics/summary?range=${encodeURIComponent(range)}`,
    () => getStatisticsFallback(range),
  );
}

export function fetchDashboard() {
  return getJsonWithFallback<DashboardSummary>("/api/dashboard", getDashboardFallback);
}

export function fetchReminders() {
  return getJsonWithFallback<ReminderListResponse>("/api/reminders", getRemindersFallback);
}

export function dismissReminder(payload: DismissReminderRequest) {
  return postJsonWithFallback<DismissReminderResponse, DismissReminderRequest>(
    "/api/reminders/dismiss",
    payload,
    () => dismissLocalReminder(payload),
    { fallbackOnHttpError: false },
  );
}

export function readAllReminders() {
  return postJsonWithFallback<ReadAllRemindersResponse, Record<string, never>>(
    "/api/reminders/read-all",
    {},
    readAllLocalReminders,
    { fallbackOnHttpError: false },
  );
}

export function fetchFamily() {
  return getJsonWithFallback<FamilyOverview>("/api/family", getFamilyFallback);
}

export function fetchNotificationSettings() {
  return getJsonWithFallback<NotificationSettings>(
    "/api/notification-settings",
    getNotificationSettingsFallback,
  );
}

export function updateNotificationSettings(payload: UpdateNotificationSettingsRequest) {
  return postJsonWithFallback<
    UpdateNotificationSettingsResponse,
    UpdateNotificationSettingsRequest
  >(
    "/api/notification-settings",
    payload,
    () => updateLocalNotificationSettings(payload),
    { fallbackOnHttpError: false },
  );
}

export function renameFamily(payload: RenameFamilyRequest) {
  return postJsonWithFallback<RenameFamilyResponse, RenameFamilyRequest>(
    "/api/family/rename",
    payload,
    () => renameLocalFamily(payload),
    { fallbackOnHttpError: false },
  );
}

export function updateFamilyMemberRole(payload: UpdateFamilyMemberRoleRequest) {
  return postJsonWithFallback<UpdateFamilyMemberRoleResponse, UpdateFamilyMemberRoleRequest>(
    "/api/family/members/role",
    payload,
    () => updateLocalFamilyMemberRole(payload),
    { fallbackOnHttpError: false },
  );
}

export function updateFamilyAddress(payload: UpdateFamilyAddressRequest) {
  return postJsonWithFallback<UpdateFamilyAddressResponse, UpdateFamilyAddressRequest>(
    "/api/family/address",
    payload,
    () => updateLocalFamilyAddress(payload),
    { fallbackOnHttpError: false },
  );
}

export function removeFamilyMember(payload: RemoveFamilyMemberRequest) {
  return postJsonWithFallback<RemoveFamilyMemberResponse, RemoveFamilyMemberRequest>(
    "/api/family/members/remove",
    payload,
    () => removeLocalFamilyMember(payload),
    { fallbackOnHttpError: false },
  );
}

export function dissolveFamily() {
  return postJsonWithFallback<DissolveFamilyResponse, Record<string, never>>(
    "/api/family/dissolve",
    {},
    dissolveLocalFamily,
    { fallbackOnHttpError: false },
  );
}

export function fetchRestockPlan() {
  return getJsonWithFallback<RestockPlan>("/api/restock-plan", getRestockPlanFallback);
}

export function createProduct(payload: CreateProductRequest) {
  return postJsonWithFallback<CreateProductResponse, CreateProductRequest>(
    "/api/products",
    payload,
    () => createLocalProduct(payload),
    { fallbackOnHttpError: false },
  );
}

export function stockInProduct(payload: CreateProductRequest) {
  return postJsonWithFallback<CreateProductResponse, CreateProductRequest>(
    "/api/products/stock-in",
    payload,
    () => stockInLocalProduct(payload),
    { fallbackOnHttpError: false },
  );
}

export function consumeProduct(id: string, payload: ConsumeProductRequest) {
  return postJsonWithFallback<ConsumeProductResponse, ConsumeProductRequest>(
    `/api/products/${encodeURIComponent(id)}/consume`,
    payload,
    () => consumeLocalProduct(id, payload),
    { fallbackOnHttpError: false },
  );
}

export function updateProduct(id: string, payload: UpdateProductRequest) {
  return postJsonWithFallback<UpdateProductResponse, UpdateProductRequest>(
    `/api/products/${encodeURIComponent(id)}/update`,
    payload,
    () => updateLocalProduct(id, payload),
    { fallbackOnHttpError: false },
  );
}

export function archiveProduct(id: string) {
  return postJsonWithFallback<ArchiveProductResponse, Record<string, never>>(
    `/api/products/${encodeURIComponent(id)}/archive`,
    {},
    () => archiveLocalProduct(id),
    { fallbackOnHttpError: false },
  );
}

export function completeRestock(payload: CompleteRestockRequest) {
  return postJsonWithFallback<CompleteRestockResponse, CompleteRestockRequest>(
    "/api/restock-plan/complete",
    payload,
    () => completeLocalRestock(payload),
    { fallbackOnHttpError: false },
  );
}

export function removeRestockItem(payload: RemoveRestockItemRequest) {
  return postJsonWithFallback<RemoveRestockItemResponse, RemoveRestockItemRequest>(
    "/api/restock-plan/remove",
    payload,
    () => removeLocalRestockItem(payload),
    { fallbackOnHttpError: false },
  );
}

export function addRestockRecommendation(payload: AddRestockRecommendationRequest) {
  return postJsonWithFallback<AddRestockRecommendationResponse, AddRestockRecommendationRequest>(
    "/api/restock-plan/recommendations/add",
    payload,
    () => addLocalRestockRecommendation(payload),
    { fallbackOnHttpError: false },
  );
}

export function addRestockProduct(payload: AddRestockProductRequest) {
  return postJsonWithFallback<AddRestockProductResponse, AddRestockProductRequest>(
    "/api/restock-plan/products/add",
    payload,
    () => addLocalRestockProduct(payload),
    { fallbackOnHttpError: false },
  );
}

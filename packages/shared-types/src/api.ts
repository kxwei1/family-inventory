export type InventoryStockStatus = "enough" | "low" | "empty";

export interface InventoryProductSummary {
  id: string;
  name: string;
  category: string;
  brand: string;
  spec: string;
  quantity: number;
  unit: string;
  status: InventoryStockStatus;
  statusText: string;
  image: string;
  purchasePrice?: number;
  purchaseChannel?: string;
  location?: string;
  isOpened?: boolean;
  stockInDate?: string;
}

export interface ProductListResponse {
  items: InventoryProductSummary[];
}

export interface ProductListFilters {
  query?: string;
  category?: string;
  status?: InventoryStockStatus | "all";
}

export interface CreateProductRequest {
  name: string;
  category: string;
  brand?: string;
  spec?: string;
  unit: string;
  quantity: number;
  purchasePrice?: number;
  purchaseChannel?: string;
  location?: string;
  isOpened?: boolean;
  image?: string;
  stockInDate?: string;
  notes?: string;
}

export interface CreateProductResponse {
  item: InventoryProductSummary;
}

export interface UpdateProductRequest {
  name?: string;
  category?: string;
  brand?: string;
  spec?: string;
  unit?: string;
  quantity?: number;
  notes?: string;
  purchasePrice?: number | null;
  purchaseChannel?: string;
  location?: string;
  isOpened?: boolean;
  stockInDate?: string;
}

export interface UpdateProductResponse {
  detail: ProductDetailResponse;
}

export interface ArchiveProductResponse {
  archivedProductId: string;
  items: InventoryProductSummary[];
}

export interface ProductBatchSummary {
  id: string;
  batchNo: string;
  location: string;
  quantity: number;
  unit: string;
  expiryText: string;
  status: "normal" | "warning" | "expired";
  statusText: string;
  progress: number;
  canConsume: boolean;
}

export interface ProductDetailResponse {
  item: InventoryProductSummary & {
    tags: string[];
  };
  batches: ProductBatchSummary[];
  consumptionTrend: Array<{
    label: string;
    value: number;
  }>;
}

export interface ConsumeProductRequest {
  quantity: number;
  actionType: "daily" | "adjust" | "expired" | "gift";
  notes?: string;
}

export interface ConsumeProductResponse {
  detail: ProductDetailResponse;
}

export interface ProductStockLogSummary {
  id: string;
  productId: string;
  productName?: string;
  productImage?: string;
  productCategory?: string;
  productArchived?: boolean;
  action: "stock_in" | "stock_out" | "adjust" | "expired" | "gift";
  actionText: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  amount?: number;
  operatorName: string;
  operatedAt: string;
  notes?: string;
}

export interface ProductStockLogResponse {
  items: ProductStockLogSummary[];
}

export interface StockLogListResponse {
  items: ProductStockLogSummary[];
}

export interface ProfileSummary {
  id: string;
  name: string;
  familyName: string;
  avatar: string;
  stats: {
    petCount: number;
    bookkeepingDays: number;
    reminderCount: number;
  };
}

export interface UpdateProfileRequest {
  name?: string;
  avatar?: string;
}

export interface UpdateProfileResponse {
  profile: ProfileSummary;
}

export type PetColorTone = "orange" | "white" | "mint" | "lake" | "neutral";

export interface PetProfileSummary {
  id: string;
  name: string;
  species: string;
  breed: string;
  ageText: string;
  weightKg: number;
  avatar?: string;
  colorTone: PetColorTone;
  tags: string[];
  diet: {
    staple: string;
    snack: string;
  };
  inventoryEstimate: {
    foodDays: number;
    litterDays: number;
  };
  weightTrend: Array<{
    label: string;
    value: number;
  }>;
  albumCount: number;
  albumPhotos: string[];
}

export interface PetListResponse {
  items: PetProfileSummary[];
  selectedPetId?: string;
}

export interface CreatePetRequest {
  name: string;
  species?: string;
  breed?: string;
  ageText?: string;
  weightKg?: number;
  tags?: string[];
  diet?: {
    staple?: string;
    snack?: string;
  };
}

export interface CreatePetResponse {
  item: PetProfileSummary;
  pets: PetListResponse;
}

export interface UpdatePetRequest {
  name?: string;
  species?: string;
  breed?: string;
  ageText?: string;
  weightKg?: number;
  tags?: string[];
  diet?: {
    staple?: string;
    snack?: string;
  };
}

export interface UpdatePetResponse {
  item: PetProfileSummary;
  pets: PetListResponse;
}

export interface AddPetAlbumPhotoRequest {
  image: string;
}

export interface AddPetAlbumPhotoResponse {
  item: PetProfileSummary;
  pets: PetListResponse;
}

export interface AddPetAlbumPhotosRequest {
  images: string[];
}

export interface AddPetAlbumPhotosResponse {
  item: PetProfileSummary;
  pets: PetListResponse;
  addedImages: string[];
}

export interface RemovePetAlbumPhotoRequest {
  image: string;
}

export interface RemovePetAlbumPhotoResponse {
  item: PetProfileSummary;
  pets: PetListResponse;
}

export type StatisticsRange = "week" | "month" | "year";

export interface StatisticsSummary {
  range: StatisticsRange;
  totalExpense: number;
  trendRate: number;
  recordCount: number;
  averageDailyExpense: number;
  trendSeries: Array<{
    label: string;
    amount: number;
    percent: number;
    active: boolean;
  }>;
  categoryRatio: Array<{
    category: string;
    percent: number;
  }>;
  topExpenses: Array<{
    id: string;
    productId?: string;
    productImage?: string;
    productArchived?: boolean;
    rank: number;
    name: string;
    category: string;
    date: string;
    amount: number;
  }>;
}

export interface DashboardSummary {
  familyName: string;
  greeting: string;
  avatar: string;
  alerts: Array<{
    id: string;
    title: string;
    count: number;
    icon: string;
    tone: "danger" | "warning" | "info";
  }>;
  categories: Array<{
    id: string;
    name: string;
    icon: string;
    total: number;
    unit: string;
    days: string;
    tone: "mint" | "lake" | "yellow";
  }>;
}

export type ReminderCategory = "soon" | "expired" | "stock";

export interface ReminderItem {
  id: string;
  category: ReminderCategory;
  title: string;
  description: string;
  badgeText: string;
  timeText: string;
  productId?: string;
  tone: "warning" | "danger" | "info";
  primaryActionText: string;
  secondaryActionText?: string;
}

export interface ReminderListResponse {
  items: ReminderItem[];
  summary: {
    total: number;
    soon: number;
    expired: number;
    stock: number;
  };
}

export interface DismissReminderRequest {
  itemId: string;
}

export interface DismissReminderResponse {
  dismissedItemIds: string[];
  reminders: ReminderListResponse;
}

export interface ReadAllRemindersResponse {
  dismissedItemIds: string[];
  reminders: ReminderListResponse;
}

export interface FamilyMemberSummary {
  id: string;
  name: string;
  subtitle: string;
  avatar?: string;
  role: "admin" | "member" | "guest";
  roleText: string;
}

export interface FamilyAddress {
  contactName: string;
  phone: string;
  region: string;
  detail: string;
  notes?: string;
  updatedAt: string;
}

export type FamilySettingId = "rename" | "address" | "permissions";

export interface FamilyOverview {
  id: string;
  name: string;
  createdAt: string;
  memberCount: number;
  address: FamilyAddress;
  members: FamilyMemberSummary[];
  settings: Array<{
    id: FamilySettingId;
    label: string;
  }>;
}

export interface RenameFamilyRequest {
  name: string;
}

export interface RenameFamilyResponse {
  family: FamilyOverview;
}

export interface UpdateFamilyMemberRoleRequest {
  memberId: string;
  role: FamilyMemberSummary["role"];
}

export interface UpdateFamilyMemberRoleResponse {
  family: FamilyOverview;
}

export interface RemoveFamilyMemberRequest {
  memberId: string;
}

export interface RemoveFamilyMemberResponse {
  family: FamilyOverview;
}

export interface DissolveFamilyResponse {
  family: FamilyOverview;
}

export interface UpdateFamilyAddressRequest {
  contactName: string;
  phone: string;
  region: string;
  detail: string;
  notes?: string;
}

export interface UpdateFamilyAddressResponse {
  family: FamilyOverview;
}

export interface NotificationSettings {
  stockWarningEnabled: boolean;
  expiryReminderEnabled: boolean;
  updatedAt: string;
}

export interface UpdateNotificationSettingsRequest {
  stockWarningEnabled?: boolean;
  expiryReminderEnabled?: boolean;
}

export interface UpdateNotificationSettingsResponse {
  settings: NotificationSettings;
}

export interface RestockPlan {
  estimatedCost: number;
  lastRestockedText: string;
  groups: Array<{
    id: string;
    title: string;
    icon: string;
    items: RestockItem[];
  }>;
  recommendations: Array<{
    id: string;
    name: string;
    reason: string;
    image?: string;
    icon?: string;
  }>;
}

export interface RestockItem {
  id: string;
  name: string;
  description: string;
  productId?: string;
  category?: string;
  unit?: string;
  suggestedQuantity?: number;
  image?: string;
  icon?: string;
  sourceRecommendationId?: string;
  selected: boolean;
}

export interface CompleteRestockRequest {
  itemIds: string[];
}

export interface CompleteRestockResponse {
  completedItemIds: string[];
  items: InventoryProductSummary[];
  restockPlan: RestockPlan;
}

export interface RemoveRestockItemRequest {
  itemId: string;
}

export interface RemoveRestockItemResponse {
  removedItemIds: string[];
  restockPlan: RestockPlan;
}

export interface AddRestockRecommendationRequest {
  recommendationId: string;
}

export interface AddRestockRecommendationResponse {
  itemId: string;
  restockPlan: RestockPlan;
}

export interface AddRestockProductRequest {
  productId: string;
}

export interface AddRestockProductResponse {
  itemId: string;
  restockPlan: RestockPlan;
}

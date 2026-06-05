// 商品分类
export const ProductCategory = {
  CAT_FOOD: "CAT_FOOD",
  CANNED: "CANNED",
  LITTER: "LITTER",
  SNACK: "SNACK",
  HEALTHCARE: "HEALTHCARE",
  TOY: "TOY",
  OTHER: "OTHER",
} as const;
export type ProductCategory = (typeof ProductCategory)[keyof typeof ProductCategory];

export const ProductCategoryLabel: Record<ProductCategory, string> = {
  CAT_FOOD: "猫粮",
  CANNED: "罐头",
  LITTER: "猫砂",
  SNACK: "零食",
  HEALTHCARE: "保健品",
  TOY: "玩具",
  OTHER: "其他",
};

// 库存批次状态
export const StockBatchStatus = {
  NORMAL: "NORMAL",
  EXPIRING_SOON: "EXPIRING_SOON",
  EXPIRED: "EXPIRED",
  DEPLETED: "DEPLETED",
} as const;
export type StockBatchStatus = (typeof StockBatchStatus)[keyof typeof StockBatchStatus];

// 出入库操作类型
export const StockLogAction = {
  STOCK_IN: "STOCK_IN",
  STOCK_OUT: "STOCK_OUT",
  ADJUST: "ADJUST",
  DELETE: "DELETE",
} as const;
export type StockLogAction = (typeof StockLogAction)[keyof typeof StockLogAction];

// 购买渠道
export const PurchaseChannel = {
  TAOBAO: "TAOBAO",
  JD: "JD",
  PDD: "PDD",
  OFFLINE: "OFFLINE",
  GIFT: "GIFT",
  OTHER: "OTHER",
} as const;
export type PurchaseChannel = (typeof PurchaseChannel)[keyof typeof PurchaseChannel];

// 家庭成员角色
export const FamilyRole = {
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
  GUEST: "GUEST",
} as const;
export type FamilyRole = (typeof FamilyRole)[keyof typeof FamilyRole];

// 同步状态（离线能力使用）
export const SyncStatus = {
  SYNCED: "SYNCED",
  PENDING_CREATE: "PENDING_CREATE",
  PENDING_UPDATE: "PENDING_UPDATE",
  PENDING_DELETE: "PENDING_DELETE",
} as const;
export type SyncStatus = (typeof SyncStatus)[keyof typeof SyncStatus];

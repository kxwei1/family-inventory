import type { BaseEntity } from "./common";
import type { PurchaseChannel, StockBatchStatus } from "./enums";

export interface StockBatch extends BaseEntity {
  familyId: string;
  productId: string;
  batchNo?: string;          // 批次号 #001
  quantity: number;          // 当前数量
  initialQuantity: number;   // 入库时数量
  productionDate?: string;   // 生产日期
  expiryDate?: string;       // 过期日期
  stockInDate: string;       // 入库日期
  purchasePrice?: number;
  purchaseChannel?: PurchaseChannel;
  locationId?: string;       // 存放位置
  isOpened: boolean;
  openedAt?: string;
  status: StockBatchStatus;
  notes?: string;
}

export interface StorageLocation extends BaseEntity {
  familyId: string;
  name: string;        // 客厅储物柜 / 储藏室 / 冰箱
  icon?: string;
  description?: string;
}

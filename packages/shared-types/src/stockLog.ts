import type { BaseEntity } from "./common";
import type { StockLogAction } from "./enums";

export interface StockLog extends BaseEntity {
  familyId: string;
  batchId: string;
  productId: string;
  action: StockLogAction;
  quantity: number;       // 操作数量（正数）
  operatorId: string;     // 操作人 userId
  operatorName?: string;  // 冗余存储，便于历史展示
  operatedAt: string;     // 操作时间
  notes?: string;
}

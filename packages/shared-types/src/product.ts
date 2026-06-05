import type { BaseEntity } from "./common";
import type { ProductCategory } from "./enums";

export interface Product extends BaseEntity {
  familyId: string;
  name: string;
  category: ProductCategory;
  brand?: string;
  spec?: string;       // 规格：2kg / 85g
  unit: string;        // 单位：罐 / 袋 / 包 / kg
  flavor?: string;     // 口味/型号
  barcode?: string;
  imageUrl?: string;
  description?: string;
}

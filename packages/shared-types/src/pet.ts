import type { BaseEntity } from "./common";

export interface Pet extends BaseEntity {
  familyId: string;
  name: string;
  avatar?: string;
  species?: string;       // 猫 / 狗
  breed?: string;         // 英短 / 美短
  gender?: "MALE" | "FEMALE" | "UNKNOWN";
  birthDate?: string;
  weight?: number;        // 当前体重（kg）
  isNeutered?: boolean;   // 是否绝育
  tags?: string[];        // 室内 / 挑食 / 活泼
  notes?: string;
}

export interface PetWeightRecord extends BaseEntity {
  petId: string;
  weight: number;
  recordedAt: string;
}

export interface FeedingRecord extends BaseEntity {
  petId: string;
  batchId: string;
  productId: string;
  quantity: number;
  fedAt: string;
  notes?: string;
}

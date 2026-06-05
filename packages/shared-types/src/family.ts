import type { BaseEntity } from "./common";
import type { FamilyRole } from "./enums";

export interface Family extends BaseEntity {
  name: string;
  avatar?: string;
  ownerId: string;
  description?: string;
}

export interface FamilyMember extends BaseEntity {
  familyId: string;
  userId: string;
  nickname: string;
  avatar?: string;
  role: FamilyRole;
  joinedAt: string;
}

export interface User extends BaseEntity {
  nickname: string;
  avatar?: string;
  phone?: string;
  email?: string;
  wechatOpenId?: string;
}

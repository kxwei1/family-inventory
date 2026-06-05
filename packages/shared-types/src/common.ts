// 通用基础类型，所有实体都带 sync 元数据，便于离线 / 多端同步
export interface BaseEntity {
  id: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  version: number;   // 服务端版本号，用于冲突检测
  deletedAt?: string | null;
}

// 客户端本地实体扩展（包含同步状态）
export interface LocalEntity extends BaseEntity {
  syncStatus: "SYNCED" | "PENDING_CREATE" | "PENDING_UPDATE" | "PENDING_DELETE";
  localId?: string; // 本地生成的临时 ID（未上行前）
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
}

// =========================================
// Unified storage adapter
// H5: IndexedDB via Dexie for durable offline datasets
// MP-WEIXIN/native: uni storage
//
// Public API is platform-agnostic. Use these helpers in stores and services.
// =========================================

import type Dexie from "dexie";
import type { Table } from "dexie";

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
}

class UniStorageAdapter implements StorageAdapter {
  async get<T>(key: string): Promise<T | null> {
    return new Promise((resolve) => {
      uni.getStorage({
        key,
        success: (res) => resolve(res.data as T),
        fail: () => resolve(null),
      });
    });
  }

  async set<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve, reject) => {
      uni.setStorage({
        key,
        data: value as unknown,
        success: () => resolve(),
        fail: (err) => reject(err),
      });
    });
  }

  async remove(key: string): Promise<void> {
    return new Promise((resolve) => {
      uni.removeStorage({
        key,
        success: () => resolve(),
        fail: () => resolve(),
      });
    });
  }

  async keys(): Promise<string[]> {
    return new Promise((resolve) => {
      uni.getStorageInfo({
        success: (res) => resolve(res.keys),
        fail: () => resolve([]),
      });
    });
  }

  async clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        uni.clearStorageSync();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
}

interface StorageRecord {
  key: string;
  value: unknown;
  updatedAt: string;
}

const INDEXED_DB_NAME = "family-inventory-storage";
const INDEXED_DB_TABLE = "records";
const ADAPTER_MANAGED_LEGACY_KEYS = [
  "fi:current_user",
  "fi:current_family",
  "fi:sync_queue",
  "fi:last_sync_at",
  "fi:theme",
  "fi:entity:",
  "fi:inventory:local_",
  "fi:inventory:archived_",
  "fi:inventory:completed_",
  "fi:inventory:removed_",
  "fi:inventory:custom_",
  "fi:inventory:stock_logs",
  "fi:inventory:dismissed_",
  "fi:inventory:family",
  "fi:inventory:profile",
  "fi:inventory:notification_",
];

class IndexedDbStorageAdapter implements StorageAdapter {
  private readonly fallback: StorageAdapter;
  private dbPromise: Promise<Dexie | null> | null = null;
  private migrationPromise: Promise<void> | null = null;

  constructor(fallback: StorageAdapter) {
    this.fallback = fallback;
  }

  async get<T>(key: string): Promise<T | null> {
    const table = await this.getTable();

    if (!table) {
      return this.fallback.get<T>(key);
    }

    await this.migrateLegacyKeys(table);
    const record = await table.get(key);

    if (record) {
      return record.value as T;
    }

    const fallbackValue = await this.fallback.get<T>(key);

    if (fallbackValue !== null) {
      await table.put({ key, value: fallbackValue, updatedAt: new Date().toISOString() });
      await this.fallback.remove(key);
    }

    return fallbackValue;
  }

  async set<T>(key: string, value: T): Promise<void> {
    const table = await this.getTable();

    if (!table) {
      await this.fallback.set(key, value);
      return;
    }

    await this.migrateLegacyKeys(table);
    await table.put({ key, value, updatedAt: new Date().toISOString() });
    await this.fallback.remove(key);
  }

  async remove(key: string): Promise<void> {
    const table = await this.getTable();

    if (!table) {
      await this.fallback.remove(key);
      return;
    }

    await this.migrateLegacyKeys(table);
    await table.delete(key);
    await this.fallback.remove(key);
  }

  async keys(): Promise<string[]> {
    const table = await this.getTable();

    if (!table) {
      return this.fallback.keys();
    }

    await this.migrateLegacyKeys(table);
    const records = await table.toArray();

    return records.map((record) => record.key);
  }

  async clear(): Promise<void> {
    const table = await this.getTable();

    if (table) {
      await table.clear();
    }

    await this.fallback.clear();
  }

  private async getTable(): Promise<Table<StorageRecord, string> | null> {
    const db = await this.getDb();

    return db?.table<StorageRecord, string>(INDEXED_DB_TABLE) ?? null;
  }

  private async getDb(): Promise<Dexie | null> {
    if (!this.dbPromise) {
      this.dbPromise = this.openDb();
    }

    return this.dbPromise;
  }

  private async openDb(): Promise<Dexie | null> {
    if (typeof indexedDB === "undefined") {
      return null;
    }

    try {
      const { default: DexieConstructor } = await import("dexie");
      const db = new DexieConstructor(INDEXED_DB_NAME);
      db.version(1).stores({
        [INDEXED_DB_TABLE]: "&key, updatedAt",
      });
      await db.open();

      return db;
    } catch {
      return null;
    }
  }

  private async migrateLegacyKeys(table: Table<StorageRecord, string>): Promise<void> {
    if (!this.migrationPromise) {
      this.migrationPromise = this.runLegacyMigration(table);
    }

    await this.migrationPromise;
  }

  private async runLegacyMigration(table: Table<StorageRecord, string>): Promise<void> {
    try {
      const keys = (await this.fallback.keys()).filter(isAdapterManagedLegacyKey);

      for (const key of keys) {
        const value = await this.fallback.get<unknown>(key);

        if (value !== null) {
          await table.put({ key, value, updatedAt: new Date().toISOString() });
        }

        await this.fallback.remove(key);
      }
    } catch {
      this.migrationPromise = null;
    }
  }
}

function isAdapterManagedLegacyKey(key: string) {
  return ADAPTER_MANAGED_LEGACY_KEYS.some((item) => key === item || key.startsWith(item));
}

function createStorageAdapter(): StorageAdapter {
  const uniStorage = new UniStorageAdapter();

  // #ifdef H5
  return new IndexedDbStorageAdapter(uniStorage);
  // #endif

  return uniStorage;
}

export const storage: StorageAdapter = createStorageAdapter();

// Strongly-typed namespace helpers define keys here so callers don't pass raw strings.
export const StorageKey = {
  CURRENT_USER: "fi:current_user",
  CURRENT_FAMILY: "fi:current_family",
  SYNC_QUEUE: "fi:sync_queue",
  LAST_SYNC_AT: "fi:last_sync_at",
  THEME: "fi:theme",
} as const;
export type StorageKey = (typeof StorageKey)[keyof typeof StorageKey];

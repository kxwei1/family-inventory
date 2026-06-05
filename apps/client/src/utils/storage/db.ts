// =========================================
// Entity-level CRUD layer (offline-first)
// Delegates to the platform storage adapter.
// =========================================

import type {
  Product,
  StockBatch,
  StockLog,
  Pet,
  StorageLocation,
} from "@family-inventory/shared-types";
import { storage } from "./index";

type EntityMap = {
  products: Product;
  stockBatches: StockBatch;
  stockLogs: StockLog;
  pets: Pet;
  storageLocations: StorageLocation;
};

const entityKey = (table: keyof EntityMap) => `fi:entity:${table}`;

async function readAll<K extends keyof EntityMap>(table: K): Promise<EntityMap[K][]> {
  const list = await storage.get<EntityMap[K][]>(entityKey(table));
  return list ?? [];
}

async function writeAll<K extends keyof EntityMap>(table: K, items: EntityMap[K][]): Promise<void> {
  await storage.set(entityKey(table), items);
}

export const db = {
  async list<K extends keyof EntityMap>(table: K): Promise<EntityMap[K][]> {
    return readAll(table);
  },

  async findById<K extends keyof EntityMap>(table: K, id: string): Promise<EntityMap[K] | null> {
    const all = await readAll(table);
    return (all.find((item) => (item as { id: string }).id === id) as EntityMap[K] | undefined) ?? null;
  },

  async insert<K extends keyof EntityMap>(table: K, item: EntityMap[K]): Promise<void> {
    const all = await readAll(table);
    all.push(item);
    await writeAll(table, all);
  },

  async update<K extends keyof EntityMap>(
    table: K,
    id: string,
    patch: Partial<EntityMap[K]>,
  ): Promise<EntityMap[K] | null> {
    const all = await readAll(table);
    const idx = all.findIndex((item) => (item as { id: string }).id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...patch };
    await writeAll(table, all);
    return all[idx];
  },

  async remove<K extends keyof EntityMap>(table: K, id: string): Promise<boolean> {
    const all = await readAll(table);
    const next = all.filter((item) => (item as { id: string }).id !== id);
    if (next.length === all.length) return false;
    await writeAll(table, next);
    return true;
  },

  async clear<K extends keyof EntityMap>(table: K): Promise<void> {
    await writeAll(table, []);
  },
};

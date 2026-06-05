// Sync storage facade for pinia-plugin-persistedstate.
// H5 -> window.localStorage when available
// MP/native -> uni.getStorageSync / uni.setStorageSync / uni.removeStorageSync

type SyncStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function createLocalStorage(): SyncStorage | null {
  if (typeof globalThis === "undefined") return null;
  const win = globalThis as { localStorage?: SyncStorage };
  return win.localStorage ?? null;
}

function createUniStorage(): SyncStorage {
  return {
    getItem(key) {
      try {
        const value = uni.getStorageSync(key) as string | undefined;
        return typeof value === "string" && value.length > 0 ? value : null;
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        uni.setStorageSync(key, value);
      } catch {
        /* ignore quota / unsupported */
      }
    },
    removeItem(key) {
      try {
        uni.removeStorageSync(key);
      } catch {
        /* ignore */
      }
    },
  };
}

export const persistedStorage: SyncStorage = createLocalStorage() ?? createUniStorage();

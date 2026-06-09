type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type WebStorageKind = "local" | "session";

type MemoryStorageMap = Record<WebStorageKind, Map<string, string>>;

const globalStorageCache = globalThis as typeof globalThis & {
  __bergmannStorageCache__?: MemoryStorageMap;
  __bergmannResolvedStorage__?: Partial<Record<WebStorageKind, StorageLike>>;
};

function getMemoryStorageCache(): MemoryStorageMap {
  if (!globalStorageCache.__bergmannStorageCache__) {
    globalStorageCache.__bergmannStorageCache__ = {
      local: new Map<string, string>(),
      session: new Map<string, string>()
    };
  }
  return globalStorageCache.__bergmannStorageCache__;
}

function getMemoryStorage(kind: WebStorageKind): StorageLike {
  const cache = getMemoryStorageCache()[kind];
  return {
    getItem: (key: string) => cache.get(key) ?? null,
    removeItem: (key: string) => {
      cache.delete(key);
    },
    setItem: (key: string, value: string) => {
      cache.set(key, value);
    }
  };
}

function resolveBrowserStorage(kind: WebStorageKind): StorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const storage = kind === "local" ? window.localStorage : window.sessionStorage;
    if (!storage) {
      return null;
    }
    const testKey = "__bergmann_storage_probe__";
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return storage;
  } catch {
    return null;
  }
}

export function getWebStorage(kind: WebStorageKind): StorageLike {
  const cached = globalStorageCache.__bergmannResolvedStorage__?.[kind];
  if (cached) {
    return cached;
  }

  const storage = resolveBrowserStorage(kind) ?? getMemoryStorage(kind);
  globalStorageCache.__bergmannResolvedStorage__ = {
    ...globalStorageCache.__bergmannResolvedStorage__,
    [kind]: storage
  };
  return storage;
}

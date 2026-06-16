export type StorageLike = {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
};

type StringMap = Record<string, string>;

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function readWindowNameStorage(): StringMap {
  if (!hasWindow()) {
    return {};
  }

  try {
    const raw = window.name;
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return parsed as StringMap;
  } catch {
    return {};
  }
}

function writeWindowNameStorage(data: StringMap): void {
  if (!hasWindow()) {
    return;
  }

  window.name = JSON.stringify(data);
}

function createWindowNameStorage(): StorageLike {
  return {
    getItem(key: string): string | null {
      const data = readWindowNameStorage();
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    removeItem(key: string): void {
      const data = readWindowNameStorage();
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        delete data[key];
        writeWindowNameStorage(data);
      }
    },
    setItem(key: string, value: string): void {
      const data = readWindowNameStorage();
      data[key] = value;
      writeWindowNameStorage(data);
    }
  };
}

function getNativeStorage(): StorageLike | null {
  if (!hasWindow()) {
    return null;
  }

  try {
    if (typeof window.localStorage !== "undefined") {
      return window.localStorage;
    }
  } catch {
    // Ignore access errors and fall back.
  }

  try {
    if (typeof window.sessionStorage !== "undefined") {
      return window.sessionStorage;
    }
  } catch {
    // Ignore access errors and fall back.
  }

  return createWindowNameStorage();
}

export function getWebStorage(): StorageLike | null {
  return getNativeStorage();
}

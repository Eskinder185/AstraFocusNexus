/** Minimal Storage-like surface so persistence logic can be unit-tested without a browser. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function browserStore(): KeyValueStore | null {
  try {
    return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
  } catch {
    return null; // e.g. storage disabled by privacy settings
  }
}

export function readJSON<T = unknown>(key: string, store: KeyValueStore | null = browserStore()): T | undefined {
  if (!store) return undefined;
  try {
    const raw = store.getItem(key);
    return raw == null ? undefined : (JSON.parse(raw) as T);
  } catch {
    return undefined;
  }
}

/** Returns false when the write failed (quota exceeded, storage disabled). */
export function writeJSON(key: string, value: unknown, store: KeyValueStore | null = browserStore()): boolean {
  if (!store) return false;
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { dump(): Record<string, string> } {
  const data = { ...initial };
  return {
    getItem: k => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
    dump: () => ({ ...data }),
  };
}

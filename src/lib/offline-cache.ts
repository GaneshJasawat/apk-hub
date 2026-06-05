import localforage from "localforage";

const store = localforage.createInstance({ name: "apkhub-cache" });

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    return await store.getItem<T>(key);
  } catch {
    return null;
  }
}

export async function setCache<T>(key: string, data: T): Promise<void> {
  try {
    await store.setItem(key, data);
  } catch {
    // storage full or unavailable
  }
}

export function isOnline(): boolean {
  return navigator.onLine;
}

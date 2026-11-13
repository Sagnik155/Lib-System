import { Book } from '../types/index.ts';

const DB_NAME = 'LibraryAppCatalogueCache';
const DB_VERSION = 1;
const STORE_NAME = 'catalogue';
const META_KEY = 'last_synced_timestamp';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCatalogueToCache(books: Book[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Clear old catalogue cache
    store.clear();

    // Insert updated books
    for (const b of books) {
      store.put(b);
    }

    // Record last-synced time
    localStorage.setItem(META_KEY, new Date().toISOString());

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save catalogue to IndexedDB cache:', err);
  }
}

export async function getCatalogueFromCache(): Promise<Book[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result as Book[]);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to read catalogue from IndexedDB cache:', err);
    return [];
  }
}

export function getLastSyncTime(): string | null {
  return localStorage.getItem(META_KEY);
}

export async function clearOfflineCache(): Promise<void> {
  try {
    localStorage.removeItem(META_KEY);
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
  } catch (err) {
    console.warn('Failed to clear offline cache on logout:', err);
  }
}

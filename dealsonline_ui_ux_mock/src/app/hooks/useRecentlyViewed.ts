import { useSyncExternalStore, useCallback } from 'react';

const STORAGE_KEY = 'recently_viewed';
const MAX_ITEMS = 20;

interface RecentItem {
  id: string;
  name: string;
  image: string;
  category: string;
}

function getSnapshot(): RecentItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

let cachedSnapshot = getSnapshot();

function subscribe(cb: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) {
      cachedSnapshot = getSnapshot();
      cb();
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

function getSnapshotCached() {
  return cachedSnapshot;
}

export function useRecentlyViewed() {
  const items = useSyncExternalStore(subscribe, getSnapshotCached);

  const addItem = useCallback((item: RecentItem) => {
    const current = getSnapshot();
    const filtered = current.filter((i) => i.id !== item.id);
    const updated = [item, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    cachedSnapshot = updated;
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
  }, []);

  return { items, addItem };
}

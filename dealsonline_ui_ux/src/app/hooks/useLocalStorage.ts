import { useState, useCallback, useSyncExternalStore } from 'react';
import type { Product } from '../lib/api';

// ---------------------------------------------------------------------------
// Generic localStorage helpers
// ---------------------------------------------------------------------------

function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
  // Dispatch a custom event so other tabs/components can react
  window.dispatchEvent(new StorageEvent('storage', { key }));
}

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------

export interface LocalFavorite {
  product_id: string;
  name: string;
  brand: string;
  category: string;
  image: string;
  addedAt: string;
}

const FAV_KEY = 'pc_favorites';

function favSnapshot(): LocalFavorite[] {
  return getItem<LocalFavorite[]>(FAV_KEY, []);
}

let favCache = favSnapshot();

function subscribeFav(cb: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === FAV_KEY || e.key === null) {
      favCache = favSnapshot();
      cb();
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

function getFavSnapshot() {
  return favCache;
}

export function useLocalFavorites() {
  const favorites = useSyncExternalStore(subscribeFav, getFavSnapshot, getFavSnapshot);

  const isFavorite = useCallback(
    (productId: string) => favorites.some((f) => f.product_id === productId),
    [favorites],
  );

  const toggleFavorite = useCallback((product: Product) => {
    const current = favSnapshot();
    const idx = current.findIndex((f) => f.product_id === product.id);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push({
        product_id: product.id,
        name: product.name,
        brand: product.brand,
        category: product.category,
        image: product.image,
        addedAt: new Date().toISOString(),
      });
    }
    favCache = [...current];
    setItem(FAV_KEY, current);
  }, []);

  const removeFavorite = useCallback((productId: string) => {
    const current = favSnapshot().filter((f) => f.product_id !== productId);
    favCache = [...current];
    setItem(FAV_KEY, current);
  }, []);

  return { favorites, isFavorite, toggleFavorite, removeFavorite };
}

// ---------------------------------------------------------------------------
// Price Alerts
// ---------------------------------------------------------------------------

export interface LocalPriceAlert {
  alert_id: string;
  product_id: string;
  name: string;
  brand: string;
  category: string;
  image: string;
  currentPrice: number;
  targetPrice: number;
  triggered: boolean;
  createdAt: string;
}

const ALERT_KEY = 'pc_price_alerts';

function alertSnapshot(): LocalPriceAlert[] {
  return getItem<LocalPriceAlert[]>(ALERT_KEY, []);
}

let alertCache = alertSnapshot();

function subscribeAlert(cb: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === ALERT_KEY || e.key === null) {
      alertCache = alertSnapshot();
      cb();
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

function getAlertSnapshot() {
  return alertCache;
}

export function useLocalAlerts() {
  const alerts = useSyncExternalStore(subscribeAlert, getAlertSnapshot, getAlertSnapshot);

  const addAlert = useCallback(
    (product: Product, targetPrice: number) => {
      const current = alertSnapshot();
      const lowestPrice = Math.min(
        ...product.prices.filter((p) => p.inStock).map((p) => p.price),
      );
      current.push({
        alert_id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        product_id: product.id,
        name: product.name,
        brand: product.brand,
        category: product.category,
        image: product.image,
        currentPrice: lowestPrice,
        targetPrice,
        triggered: lowestPrice <= targetPrice,
        createdAt: new Date().toISOString(),
      });
      alertCache = [...current];
      setItem(ALERT_KEY, current);
    },
    [],
  );

  const removeAlert = useCallback((alertId: string) => {
    const current = alertSnapshot().filter((a) => a.alert_id !== alertId);
    alertCache = [...current];
    setItem(ALERT_KEY, current);
  }, []);

  const updateAlert = useCallback((alertId: string, targetPrice: number) => {
    const current = alertSnapshot();
    const alert = current.find((a) => a.alert_id === alertId);
    if (alert) {
      alert.targetPrice = targetPrice;
      alert.triggered = alert.currentPrice <= targetPrice;
    }
    alertCache = [...current];
    setItem(ALERT_KEY, current);
  }, []);

  return { alerts, addAlert, removeAlert, updateAlert };
}

// ---------------------------------------------------------------------------
// Price Alerts — PRProduct overload (flat price, no prices[] array)
// ---------------------------------------------------------------------------

export function useLocalPRAlerts() {
  const alerts = useSyncExternalStore(subscribeAlert, getAlertSnapshot, getAlertSnapshot);

  const addPRAlert = useCallback(
    (product: { id: string; name: string; price: number; image: string | null; categoryName: string }, targetPrice: number) => {
      const current = alertSnapshot();
      current.push({
        alert_id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        product_id: product.id,
        name: product.name,
        brand: product.name.split(' ')[0],
        category: product.categoryName,
        image: product.image ?? '',
        currentPrice: product.price,
        targetPrice,
        triggered: product.price <= targetPrice,
        createdAt: new Date().toISOString(),
      });
      alertCache = [...current];
      setItem(ALERT_KEY, current);
    },
    [],
  );

  const removeAlert = useCallback((alertId: string) => {
    const current = alertSnapshot().filter((a) => a.alert_id !== alertId);
    alertCache = [...current];
    setItem(ALERT_KEY, current);
  }, []);

  const updateAlert = useCallback((alertId: string, targetPrice: number) => {
    const current = alertSnapshot();
    const a = current.find((x) => x.alert_id === alertId);
    if (a) {
      a.targetPrice = targetPrice;
      a.triggered = a.currentPrice <= targetPrice;
    }
    alertCache = [...current];
    setItem(ALERT_KEY, current);
  }, []);

  return { alerts, addPRAlert, removeAlert, updateAlert };
}

// ---------------------------------------------------------------------------
// Product Comparison (unlimited items)
// ---------------------------------------------------------------------------

export interface LocalComparisonItem {
  product_id: string;
  name: string;
  image: string;
  price: number;
  numStores: number;
  categoryName: string;
  categoryUrl: string;
  rating: number | null;
  productType: string;
}

const COMPARE_KEY = 'pc_comparison';

function compareSnapshot(): LocalComparisonItem[] {
  return getItem<LocalComparisonItem[]>(COMPARE_KEY, []);
}

let compareCache = compareSnapshot();

function subscribeCompare(cb: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === COMPARE_KEY || e.key === null) {
      compareCache = compareSnapshot();
      cb();
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

function getCompareSnapshot() {
  return compareCache;
}

export function useLocalComparison() {
  const comparisonItems = useSyncExternalStore(subscribeCompare, getCompareSnapshot, getCompareSnapshot);

  const isInComparison = useCallback(
    (productId: string) => comparisonItems.some((c) => c.product_id === productId),
    [comparisonItems],
  );

  const addToComparison = useCallback(
    (product: { id: string; name: string; image: string | null; price: number; numStores: number; categoryName: string; categoryUrl?: string; rating?: number | null; productType: string }) => {
      const current = compareSnapshot();
      if (current.some((c) => c.product_id === product.id)) return false;
      current.push({
        product_id: product.id,
        name: product.name,
        image: product.image ?? '',
        price: product.price,
        numStores: product.numStores,
        categoryName: product.categoryName,
        categoryUrl: product.categoryUrl ?? '',
        rating: product.rating ?? null,
        productType: product.productType,
      });
      compareCache = [...current];
      setItem(COMPARE_KEY, current);
      return true;
    },
    [],
  );

  const removeFromComparison = useCallback((productId: string) => {
    const current = compareSnapshot().filter((c) => c.product_id !== productId);
    compareCache = [...current];
    setItem(COMPARE_KEY, current);
  }, []);

  const toggleComparison = useCallback(
    (product: { id: string; name: string; image: string | null; price: number; numStores: number; categoryName: string; categoryUrl?: string; rating?: number | null; productType: string }) => {
      const current = compareSnapshot();
      const idx = current.findIndex((c) => c.product_id === product.id);
      if (idx >= 0) {
        current.splice(idx, 1);
        compareCache = [...current];
        setItem(COMPARE_KEY, current);
        return false; // removed
      }
      if (current.length >= 100) return null; // safety cap
      current.push({
        product_id: product.id,
        name: product.name,
        image: product.image ?? '',
        price: product.price,
        numStores: product.numStores,
        categoryName: product.categoryName,
        categoryUrl: product.categoryUrl ?? '',
        rating: product.rating ?? null,
        productType: product.productType,
      });
      compareCache = [...current];
      setItem(COMPARE_KEY, current);
      return true; // added
    },
    [],
  );

  const clearComparison = useCallback(() => {
    compareCache = [];
    setItem(COMPARE_KEY, []);
  }, []);

  return { comparisonItems, isInComparison, addToComparison, removeFromComparison, toggleComparison, clearComparison };
}

// ---------------------------------------------------------------------------
// Recently Viewed (max 20 items)
// ---------------------------------------------------------------------------

export interface RecentlyViewedItem {
  product_id: string;
  name: string;
  image: string;
  price: number;
  rating: number | null;
  productType: string;
  viewedAt: string;
}

const RECENT_KEY = 'pc_recently_viewed';
const MAX_RECENT = 20;

function recentSnapshot(): RecentlyViewedItem[] {
  return getItem<RecentlyViewedItem[]>(RECENT_KEY, []);
}

let recentCache = recentSnapshot();

function subscribeRecent(cb: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === RECENT_KEY || e.key === null) {
      recentCache = recentSnapshot();
      cb();
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

function getRecentSnapshot() {
  return recentCache;
}

export function useRecentlyViewed() {
  const recentItems = useSyncExternalStore(subscribeRecent, getRecentSnapshot, getRecentSnapshot);

  const addRecentView = useCallback(
    (product: { id: string; name: string; image: string | null; price: number; rating?: number | null; productType: string }) => {
      const current = recentSnapshot().filter((r) => r.product_id !== product.id);
      current.unshift({
        product_id: product.id,
        name: product.name,
        image: product.image ?? '',
        price: product.price,
        rating: product.rating ?? null,
        productType: product.productType,
        viewedAt: new Date().toISOString(),
      });
      if (current.length > MAX_RECENT) current.length = MAX_RECENT;
      recentCache = [...current];
      setItem(RECENT_KEY, current);
    },
    [],
  );

  return { recentItems, addRecentView };
}

import type { ClusterSummary } from './api';
import { clusterSaving, hasPrice, pricedShopCount } from './format';
import { withPhotosFirst } from './images';

/** Cards per page on every listing (design review §1, item 7). */
export const PAGE_SIZE = 48;

export type SortKey = 'relevance' | 'price-asc' | 'price-desc' | 'saving';

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'relevance', label: 'Most compared' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'saving', label: 'Biggest saving' },
];

export interface ListingFilters {
  sort: SortKey;
  brands: string[];
  min: number | null;
  max: number | null;
  multiShop: boolean;
}

/** Filters live in the URL so a filtered listing is linkable and Back works. */
export function readFilters(params: URLSearchParams): ListingFilters {
  const sort = params.get('sort') as SortKey | null;
  const num = (key: string) => {
    const v = Number(params.get(key));
    return params.get(key) && Number.isFinite(v) && v > 0 ? v : null;
  };
  return {
    sort: SORT_OPTIONS.some((o) => o.value === sort) ? (sort as SortKey) : 'relevance',
    brands: (params.get('brand') ?? '').split(',').filter(Boolean),
    min: num('min'),
    max: num('max'),
    multiShop: params.get('multi') === '1',
  };
}

export function writeFilters(filters: ListingFilters, page = 0): Record<string, string> {
  const out: Record<string, string> = {};
  if (filters.sort !== 'relevance') out.sort = filters.sort;
  if (filters.brands.length) out.brand = filters.brands.join(',');
  if (filters.min != null) out.min = String(filters.min);
  if (filters.max != null) out.max = String(filters.max);
  if (filters.multiShop) out.multi = '1';
  if (page > 0) out.page = String(page + 1);
  return out;
}

export function activeFilterCount(f: ListingFilters): number {
  return f.brands.length + (f.min != null ? 1 : 0) + (f.max != null ? 1 : 0) + (f.multiShop ? 1 : 0);
}

const brandKey = (row: ClusterSummary) => (row.brand ?? '').trim().toLowerCase();

/** Listing-title words the brand extractor sometimes mistakes for a brand. */
const NOT_BRANDS = new Set(['offer', 'limited time', 'new', 'sale', 'original', 'brand new', 'hot']);

/** Brands present in the rows, most products first, for the brand filter. */
export function brandFacets(rows: ClusterSummary[], limit = 16): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = brandKey(row);
    if (key && !NOT_BRANDS.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

export function applyFilters(rows: ClusterSummary[], f: ListingFilters): ClusterSummary[] {
  let out = rows.filter((row) => {
    if (f.brands.length && !f.brands.includes(brandKey(row))) return false;
    if (f.multiShop && pricedShopCount(row) < 2) return false;
    if (f.min != null && !(hasPrice(row.best_price) && row.best_price >= f.min)) return false;
    if (f.max != null && !(hasPrice(row.best_price) && row.best_price <= f.max)) return false;
    return true;
  });

  const price = (row: ClusterSummary) => (hasPrice(row.best_price) ? row.best_price : null);
  switch (f.sort) {
    case 'price-asc':
    case 'price-desc': {
      const dir = f.sort === 'price-asc' ? 1 : -1;
      const priced = out.filter((r) => price(r) != null).sort((a, b) => dir * (price(a)! - price(b)!));
      out = [...priced, ...out.filter((r) => price(r) == null)];
      break;
    }
    case 'saving': {
      const kes = (r: ClusterSummary) => clusterSaving(r)?.kes ?? -1;
      out = [...out].sort((a, b) => kes(b) - kes(a));
      break;
    }
    default:
      out = withPhotosFirst(out);
  }
  return out;
}

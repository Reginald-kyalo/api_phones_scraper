import type { ClusterSummary } from './clusterTypes';
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
// Shop names show up as a brand on own-label listings; they are not a brand a
// shopper filters by.
const NOT_BRANDS = new Set([
  'offer', 'limited time', 'new', 'sale', 'original', 'brand new', 'hot',
  'cleanshelf', 'carrefour', 'naivas', 'quickmart', 'jumia', 'kilimall',
]);

/** Brands present in the rows, most products first, for the brand filter. */
export function brandFacets(rows: ClusterSummary[], limit = 200): { value: string; count: number }[] {
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
    default: {
      // "Most compared" means what it says: the most shops priced first. The
      // capture's own rank put single-shop listings with a nonsense spread
      // (22,977%) at the top of Phones. Cards with photos stay ahead of
      // those without (DESIGN_RULES.md §5); sort is stable, so capture order
      // breaks the remaining ties.
      out = withPhotosFirst(
        [...out].sort((a, b) => pricedShopCount(b) - pricedShopCount(a)),
      );
    }
  }
  return out;
}

export interface PriceBucket {
  min: number | null;
  max: number | null;
  count: number;
}

/** 14,700 → 15,000; 2,340 → 2,500: a boundary a shopper would type. */
function niceRound(n: number): number {
  const mag = 10 ** Math.floor(Math.log10(Math.max(n, 1)));
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 8, 10];
  return mag * steps.reduce((best, s) => (Math.abs(s * mag - n) < Math.abs(best * mag - n) ? s : best), 1);
}

/**
 * Four price ranges fitted to the category's real spread (benchmark §2.4),
 * with how many products fall in each under the other active filters. The
 * boundaries are the quartiles, rounded, so each range holds a fair share.
 */
export function priceBuckets(rows: ClusterSummary[], f: ListingFilters): PriceBucket[] {
  const others = applyFilters(rows, { ...f, min: null, max: null, sort: 'relevance' });
  const prices = others.map((r) => r.best_price).filter(hasPrice).sort((a, b) => a - b);
  if (prices.length < 8) return [];
  const q = (p: number) => niceRound(prices[Math.floor(prices.length * p)]);
  const cuts = [...new Set([q(0.25), q(0.5), q(0.75)])].sort((a, b) => a - b);
  const edges: [number | null, number | null][] = [
    [null, cuts[0]],
    ...cuts.slice(1).map((c, i) => [cuts[i], c] as [number, number]),
    [cuts[cuts.length - 1], null],
  ];
  // The listing's min and max are both inclusive, so a range stops one
  // shilling below the next one's start: KES 20,000 is in exactly one range.
  return edges.map(([min, max]) => ({
    min,
    max: max == null ? null : max - 1,
    count: prices.filter((p) => (min == null || p >= min) && (max == null || p < max)).length,
  }));
}

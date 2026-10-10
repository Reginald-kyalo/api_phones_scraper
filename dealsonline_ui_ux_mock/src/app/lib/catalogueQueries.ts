/**
 * Catalogue reads, one page at a time.
 *
 * Every query here returns at most MAX_ROWS products. They run in two places:
 *
 *   - the catalogue function (functions/api/catalogue), reading the dataset
 *     from a private R2 bucket. In production the browser only ever gets
 *     these pages, never the dataset files (strategy: anti-scraping, layer 0);
 *   - the browser itself in local mode (dev server, or a build without the
 *     bucket), reading public/demo/ through demoSource.
 *
 * Same code both sides, so filters, sorting and paging cannot drift between
 * the dev server and production.
 */
import type { ClusterDetail, ClusterSummary } from './clusterTypes';
import * as demo from './demoSource';
import type { SearchRow } from './demoSource';
import type { DemoManifest, DemoShelfTreeResponse, DemoBrowseNode } from './demoTypes';
import { clusterSaving } from './format';
import { imageUsable } from './images';
import { applyFilters, brandFacets, PAGE_SIZE, type ListingFilters } from './listing';

/** The most products any one response carries. */
export const MAX_ROWS = 96;

const clamp = (n: number | undefined, fallback: number) =>
  Math.min(Math.max(Math.floor(n ?? fallback), 1), MAX_ROWS);

function pageOf<T>(rows: T[], page: number, size = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const safe = Math.min(Math.max(page, 0), pages - 1);
  return { results: rows.slice(safe * size, (safe + 1) * size), page: safe, pages };
}

export const manifest = (): Promise<DemoManifest> => demo.getManifest();

export const detail = (id: string): Promise<ClusterDetail> => demo.getDetail(id);

/** One page (48) of a category, filtered and sorted, with its brand facets. */
export async function browse(slug: string, filters: ListingFilters, page = 0) {
  const { rows, count } = await demo.getCategoryRows(slug);
  const filtered = applyFilters(rows, filters);
  return {
    ...pageOf(filtered, page),
    /** Matching products after filters. */
    count: filtered.length,
    /** Products in the category. */
    total: count,
    brands: brandFacets(rows),
  };
}

/**
 * Deals worth showing (DESIGN_RULES.md §5: a photo and a saving we will show),
 * at or above `minSaving` percent, one page at a time.
 */
export async function deals(options: { page?: number; minSaving?: number; limit?: number } = {}) {
  const m = await demo.getManifest();
  const all = (await Promise.all(Array.from({ length: m.deals.pages }, (_, i) => demo.getDeals({ page: i }))))
    .flatMap((r) => r.results)
    .filter((c) => imageUsable(c.image) && (clusterSaving(c)?.pct ?? -1) >= (options.minSaving ?? 0));
  return { ...pageOf(all, options.page ?? 0, clamp(options.limit, PAGE_SIZE)), count: all.length };
}

/** The first products of a category in capture order (homepage rails). */
export async function categoryPage(slug: string, limit?: number) {
  const res = await demo.getCategoryPage(slug, 0);
  return { results: res.results.slice(0, clamp(limit, PAGE_SIZE)), count: res.count };
}

export interface SearchResult {
  /** Hits with a listing row, filtered, sorted and paged like a category. */
  results: ClusterSummary[];
  /** Hits without a listing row, rendered as plain links (first page only). */
  plain: SearchRow[];
  /** Every hit, before category scope and filters. */
  count: number;
  /** Product cards after scope and filters. */
  cardCount: number;
  categories: [slug: string, count: number][];
  page: number;
  pages: number;
}

/** Search, scoped to a category and filtered like a listing, one page at a time. */
export async function search(
  q: string,
  options: { slug?: string; filters: ListingFilters; page?: number; limit?: number },
): Promise<SearchResult> {
  const res = await demo.searchSummaries(q, { limit: 480 });
  const catOf = (h: SearchRow) => h.c ?? h.id.split('::')[0];
  const counts = new Map<string, number>();
  for (const r of res.results) counts.set(catOf(r.hit), (counts.get(catOf(r.hit)) ?? 0) + 1);
  const scoped = options.slug ? res.results.filter((r) => catOf(r.hit) === options.slug) : res.results;
  const cards = applyFilters(scoped.flatMap((r) => (r.row ? [r.row] : [])), options.filters);
  const paged = pageOf(cards, options.page ?? 0, clamp(options.limit, PAGE_SIZE));
  return {
    ...paged,
    plain: scoped.filter((r) => !r.row).map((r) => r.hit).slice(0, PAGE_SIZE),
    count: res.count,
    cardCount: cards.length,
    categories: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
  };
}

export const shelfTree = (slug: string): Promise<DemoShelfTreeResponse> => demo.getShelfTree(slug);

export function shelfClusters(
  slug: string,
  options: { multiStoreOnly?: boolean; limit?: number; offset?: number } = {},
): Promise<{ node: DemoBrowseNode; count: number; total: number; results: ClusterSummary[] }> {
  return demo.getShelfClusters(slug, { ...options, limit: clamp(options.limit, 24) });
}

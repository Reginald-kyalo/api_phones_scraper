/**
 * Static demo data source.
 *
 * Serves the dataset captured into `public/demo/`. Category/detail fixtures come
 * from the API's own `_cluster_view`, and leaf shelf fixtures are captured from
 * `/api/clusters/browse-tree` + `/api/clusters/by-node`, so these are the same
 * objects the live endpoints would return.
 *
 * The whole catalogue ships (61,473 clusters, 14 categories), so nothing here
 * may load "everything" eagerly. Listings are paginated and details are sharded;
 * page counts and bucket counts are per category and come from the manifest.
 */
import type { ClusterDetail, ClusterSummary } from './api';
import type {
  DemoBrowseNode,
  DemoManifest,
  DemoShelfMeta,
  DemoShelfTreeResponse,
} from './demoTypes';

const BASE = `${import.meta.env.BASE_URL}demo`;
/** Must match SHELF_PAGE_SIZE in scripts/capture_demo_shelves.py. */
const SHELF_PAGE_SIZE = 100;
/** Must match SHELF_DETAIL_BUCKETS in scripts/capture_demo_shelves.py. */
const SHELF_DETAIL_BUCKETS = 256;
const cache = new Map<string, Promise<unknown>>();

function load<T>(path: string): Promise<T> {
  let hit = cache.get(path);
  if (!hit) {
    hit = fetch(`${BASE}/${path}`).then((res) => {
      if (!res.ok) throw new Error(`demo fixture missing: ${path} (${res.status})`);
      return res.json();
    });
    // Don't memoise failures — a transient error would poison the route forever.
    hit.catch(() => cache.delete(path));
    cache.set(path, hit);
  }
  return hit as Promise<T>;
}

/** Zero-padded to SHARD_DIGITS in the capture script. */
const pad = (n: number) => String(n).padStart(3, '0');

/**
 * 32-bit FNV-1a — must stay byte-identical to `fnv1a` in
 * `scripts/capture_demo_dataset.py`, which decides the shard every cluster was
 * written into. Known vectors are pinned by tests on both sides.
 */
export function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  const bytes = new TextEncoder().encode(text);
  for (const byte of bytes) {
    hash ^= byte;
    // Math.imul keeps the 32-bit wrap that Python's & 0xFFFFFFFF gives.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function shardFor(clusterId: string, slug: string, buckets: number): string {
  return `${slug}-${pad(fnv1a(clusterId) % buckets)}`;
}

export const getManifest = () => load<DemoManifest>('manifest.json');

export async function getCategoryMeta(slug: string) {
  const manifest = await getManifest();
  const meta = manifest.categories.find((c) => c.slug === slug);
  if (!meta) throw new Error(`unknown category: ${slug}`);
  return meta;
}

/** One page of a category listing, spread-ranked. Page is 0-based. */
export async function getCategoryPage(
  slug: string,
  page = 0,
): Promise<{ results: ClusterSummary[]; count: number; pages: number; page: number }> {
  const meta = await getCategoryMeta(slug);
  const safe = Math.min(Math.max(page, 0), meta.pages - 1);
  const rows = await load<ClusterSummary[]>(
    `categories/${encodeURIComponent(slug)}-${pad(safe)}.json`,
  );
  return { results: rows, count: meta.count, pages: meta.pages, page: safe };
}

/**
 * Curated deals feed — reproduces /api/clusters/deals including its
 * per-category price floor and max-spread guard. Paginated, not truncated:
 * 3,189 deals over 7 pages.
 */
export async function getDeals(
  options: { slug?: string; page?: number; limit?: number } = {},
): Promise<{ results: ClusterSummary[]; count: number; pages: number; page: number }> {
  if (options.slug) {
    const res = await getCategoryPage(options.slug, options.page ?? 0);
    return {
      ...res,
      results: options.limit ? res.results.slice(0, options.limit) : res.results,
    };
  }
  const manifest = await getManifest();
  const page = Math.min(Math.max(options.page ?? 0, 0), manifest.deals.pages - 1);
  const rows = await load<ClusterSummary[]>(`deals-${pad(page)}.json`);
  return {
    results: options.limit ? rows.slice(0, options.limit) : rows,
    count: manifest.deals.count,
    pages: manifest.deals.pages,
    page,
  };
}

export async function getDetail(clusterId: string): Promise<ClusterDetail> {
  try {
    // cluster_id is "<slug>::<rest>"; the slug also names the shard file.
    const slug = clusterId.split('::')[0];
    const meta = await getCategoryMeta(slug);
    const shard = shardFor(clusterId, slug, meta.buckets);
    const rows = await load<Record<string, ClusterDetail>>(`clusters/${shard}.json`);
    const hit = rows[clusterId];
    if (hit) return hit;
  } catch {
    // A leaf captured from the live by-node endpoint can name a cluster that was
    // excluded from the older category capture. The shelf detail shard below is
    // the forwarding address for those rows.
  }

  const shard = `${pad(fnv1a(clusterId) % SHELF_DETAIL_BUCKETS)}`;
  const rows = await load<Record<string, ClusterDetail>>(`shelf-details/${shard}.json`);
  const hit = rows[clusterId];
  if (!hit) throw new Error(`unknown cluster: ${clusterId}`);
  return hit;
}

export async function getShelfTree(slug: string): Promise<DemoShelfTreeResponse> {
  return load<DemoShelfTreeResponse>(
    `shelves/${encodeURIComponent(slug)}/tree.json`,
  );
}

async function getShelfMeta(slug: string): Promise<DemoShelfMeta> {
  return load<DemoShelfMeta>(`shelves/${encodeURIComponent(slug)}/meta.json`);
}

/**
 * One page of a leaf shelf, reproduced from the live `/by-node/{slug}` order.
 *
 * The frontend page size is 24 (matching production ShelfPage), while the
 * static capture stores 100 rows per file. This slices the requested 24 rows
 * out of those 100-row pages, so the first page and every “show more” page
 * contain exactly the same rows the live endpoint would return.
 */
export async function getShelfClusters(
  slug: string,
  options: { multiStoreOnly?: boolean; limit?: number; offset?: number } = {},
): Promise<{
  node: DemoBrowseNode;
  count: number;
  total: number;
  results: ClusterSummary[];
}> {
  const tree = await getShelfTree(slug);
  if (!tree.parent) throw new Error(`unknown shelf: ${slug}`);
  const meta = await getShelfMeta(slug);
  const prefix = options.multiStoreOnly ? 'products-multi' : 'products';
  const total = options.multiStoreOnly ? meta.multi_total : meta.total;
  const limit = Math.max(0, Math.floor(options.limit ?? 24));
  const offset = Math.max(0, Math.floor(options.offset ?? 0));

  if (limit === 0 || offset >= total) {
    return { node: tree.parent, count: 0, total, results: [] };
  }

  const page = Math.floor(offset / SHELF_PAGE_SIZE);
  const startInPage = offset % SHELF_PAGE_SIZE;
  const totalPages = options.multiStoreOnly ? meta.multi_pages : meta.pages;
  const lastPage = Math.min(
    totalPages - 1,
    Math.floor((offset + limit - 1) / SHELF_PAGE_SIZE),
  );
  const pageCount = lastPage - page + 1;

  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, i) =>
      load<ClusterSummary[]>(
        `shelves/${encodeURIComponent(slug)}/${prefix}-${pad(page + i)}.json`,
      ),
    ),
  );

  const rows = pages.flat().slice(startInPage, startInPage + limit);
  return { node: tree.parent, count: rows.length, total, results: rows };
}

/** One row of public/demo/cards/<slug>.json — see scripts/build-card-index.mjs. */
type CardRow = [
  id: string,
  name: string,
  brand: string | null,
  bestPrice: number | null,
  nStoresPriced: number | null,
  nStores: number | null,
  spreadPct: number | null,
  cheapestStore: number,
  image: string | null,
  likelyUsed: 0 | 1,
];

/**
 * Turn a compact card row back into the summary shape every card and filter
 * reads. Only the fields cards use are real; the rest are neutral defaults
 * (cards never read them, and the product page fetches the full detail).
 */
function fromCard(slug: string, stores: string[], r: CardRow): ClusterSummary {
  return {
    cluster_id: r[0],
    title: r[1],
    display_name: r[1],
    representative_title: null,
    category: slug,
    primary_facet: null,
    spec_facets: {},
    comparison_grade: true,
    brand: r[2],
    canonical_name: null,
    n_listings: null,
    n_stores: r[5],
    n_stores_priced: r[4],
    stores: null,
    is_multi_store: (r[4] ?? r[5] ?? 0) >= 2,
    best_price: r[3],
    cheapest_store: r[7] >= 0 ? stores[r[7]] : null,
    condition_basis: r[9] ? 'likely_used' : 'new',
    n_confident: null,
    n_likely_used: null,
    likely_used_best_price: null,
    n_used: 0,
    used_best_price: null,
    like_for_like_spread_pct: r[6],
    cross_store_spread_pct: null,
    configs: [],
    best_by_store: {},
    data_warning: null,
    image: r[8],
  };
}

/**
 * Every product in a category, in capture rank order, from the compact card
 * index. Browse filters and sorts run over these client-side, so they cover
 * the whole category — 42,673 groceries included (~1.8 MB gzipped).
 */
export async function getCategoryRows(
  slug: string,
): Promise<{ rows: ClusterSummary[]; count: number; complete: boolean }> {
  const meta = await getCategoryMeta(slug);
  const index = await load<{ stores: string[]; rows: CardRow[] }>(`cards/${encodeURIComponent(slug)}.json`);
  return {
    rows: index.rows.map((r) => fromCard(slug, index.stores, r)),
    count: meta.count,
    complete: true,
  };
}

/**
 * Search hits joined to their listing rows, so results render as the same
 * cards as every other page. Hits outside the loaded rows (deep in the two
 * largest categories) come back as null and render as a plain row.
 */
export async function searchSummaries(
  query: string,
  options: { slug?: string; limit?: number } = {},
): Promise<{ results: { hit: SearchRow; row: ClusterSummary | null }[]; count: number }> {
  const res = await search(query, { slug: options.slug, limit: options.limit ?? 240 });
  const slugs = [...new Set(res.results.map((r) => r.id.split('::')[0]))];
  const byId = new Map<string, ClusterSummary>();
  await Promise.all(
    slugs.map(async (slug) => {
      try {
        const { rows } = await getCategoryRows(slug);
        for (const row of rows) byId.set(row.cluster_id, row);
      } catch {
        /* unknown slug: its hits render as plain rows */
      }
    }),
  );
  return {
    results: res.results.map((hit) => ({ hit, row: byId.get(hit.id) ?? null })),
    count: res.count,
  };
}

export interface SearchRow {
  id: string;
  /** lowercased, whitespace-folded title */
  t: string;
  c: string | null;
  p: number | null;
}

/**
 * Substring AND-match across the whole catalogue. The index is sharded per
 * category, so a scoped search pays for one slice and a global search fetches
 * the slices in parallel (7 MB total, cached after first use).
 */
export async function search(
  query: string,
  options: { slug?: string; limit?: number } = {},
): Promise<{ results: SearchRow[]; count: number }> {
  const needle = query.trim().toLowerCase();
  if (!needle) return { results: [], count: 0 };

  const manifest = await getManifest();
  const slugs = options.slug ? [options.slug] : manifest.categories.map((c) => c.slug);
  const shards = await Promise.all(
    slugs.map((slug) => load<SearchRow[]>(`search/${encodeURIComponent(slug)}.json`)),
  );

  const terms = needle.split(/\s+/);
  const hits: SearchRow[] = [];
  for (const shard of shards) {
    for (const row of shard) {
      if (terms.every((term) => row.t.includes(term))) hits.push(row);
    }
  }
  // Exact-ish matches first: shorter titles containing every term are closer.
  hits.sort((a, b) => a.t.length - b.t.length);
  return { results: hits.slice(0, options.limit ?? 60), count: hits.length };
}

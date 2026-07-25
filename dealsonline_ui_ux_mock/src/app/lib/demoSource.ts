/**
 * Static demo data source.
 *
 * Serves the dataset captured from `product_matching_db.product_clusters_mvp`
 * into `public/demo/`. Shapes come from the API's own `_cluster_view`, so these
 * are the same objects `/api/clusters/*` would return — verified at capture time
 * with a field-level diff against the live endpoint.
 *
 * Everything is lazy and memoised: first paint costs manifest + deals only.
 */
import type { ClusterDetail, ClusterSummary } from './api';
import type { DemoManifest } from './demoTypes';

const BASE = `${import.meta.env.BASE_URL}demo`;
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

/**
 * 32-bit FNV-1a — must stay byte-identical to `fnv1a` in
 * `scripts/capture_demo_dataset.py`, which decides the shard every cluster was
 * written into. Known vectors are pinned by tests in both repos.
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

/** Zero-pad width shared with SHARD_DIGITS in capture_demo_dataset.py. */
const PAD = 3;
const pad = (n: number) => String(n).padStart(PAD, '0');

export function shardFor(clusterId: string, slug: string, buckets: number): string {
  return `${slug}-${pad(fnv1a(clusterId) % buckets)}`;
}

export const getManifest = () => load<DemoManifest>('manifest.json');

async function categoryMeta(slug: string) {
  const manifest = await getManifest();
  const hit = manifest.categories.find((c) => c.slug === slug);
  if (!hit) throw new Error(`unknown category: ${slug}`);
  return hit;
}

/**
 * One page of a category, spread-ranked (comparable products first, single-store
 * ones in the tail). Summary rows — no store maps.
 *
 * Paginated because the catalogue is captured whole: groceries alone is 33,692
 * rows / ~15 MB, which is a page of data, not a fetch.
 */
export async function getCategory(
  slug: string,
  page = 0,
): Promise<{ results: ClusterSummary[]; count: number; pages: number; page: number }> {
  const meta = await categoryMeta(slug);
  const clamped = Math.min(Math.max(page, 0), meta.pages - 1);
  const rows = await load<ClusterSummary[]>(
    `categories/${encodeURIComponent(slug)}-${pad(clamped)}.json`,
  );
  return { results: rows, count: meta.count, pages: meta.pages, page: clamped };
}

/**
 * Deals feed — reproduces /api/clusters/deals including its per-category price
 * floor and max-spread guard. Pass a slug for that category's listing instead.
 *
 * `count` is the TRUE total, not the length of what was fetched: `limit` only
 * trims the page in hand, so a caller asking for 50 still learns there are 3,189.
 */
export async function getDeals(
  options: { slug?: string; limit?: number; page?: number } = {},
): Promise<{ results: ClusterSummary[]; count: number; pages: number; page: number }> {
  if (options.slug) {
    const listing = await getCategory(options.slug, options.page ?? 0);
    return { ...listing, results: options.limit ? listing.results.slice(0, options.limit) : listing.results };
  }
  const manifest = await getManifest();
  const pages = manifest.deals.pages;
  const page = Math.min(Math.max(options.page ?? 0, 0), pages - 1);
  const rows = await load<ClusterSummary[]>(`deals-${pad(page)}.json`);
  return {
    results: options.limit ? rows.slice(0, options.limit) : rows,
    count: manifest.deals.count,
    pages,
    page,
  };
}

export async function getDetail(clusterId: string): Promise<ClusterDetail> {
  // cluster_id is "<slug>::<rest>"; the slug also names the shard file.
  const slug = clusterId.split('::')[0];
  // Bucket count is per category and derived from measured bytes, so it must
  // come from the manifest — a hard-coded value addresses the wrong shard.
  const meta = await categoryMeta(slug);
  const shard = shardFor(clusterId, slug, meta.buckets);
  const rows = await load<Record<string, ClusterDetail>>(`clusters/${shard}.json`);
  const hit = rows[clusterId];
  if (!hit) throw new Error(`unknown cluster: ${clusterId}`);
  return hit;
}

interface SearchRow {
  id: string;
  /** lowercased, whitespace-folded title */
  t: string;
  c: string | null;
  p: number | null;
}

/**
 * Substring AND-match over the whole captured catalogue.
 *
 * The index is sharded per category: a category-scoped search fetches one slice,
 * an unscoped one fetches the shards in parallel. A single global index would be
 * ~7 MB for 66k clusters.
 */
export async function search(
  query: string,
  options: { slug?: string; limit?: number } = {},
): Promise<{ results: SearchRow[]; count: number }> {
  const needle = query.trim().toLowerCase();
  if (!needle) return { results: [], count: 0 };
  const manifest = await getManifest();
  const slugs = options.slug
    ? [options.slug]
    : manifest.categories.map((c) => c.slug);
  const shards = await Promise.all(
    slugs.map((slug) => load<SearchRow[]>(`search/${encodeURIComponent(slug)}.json`)),
  );
  const terms = needle.split(/\s+/);
  const hits: SearchRow[] = [];
  for (const shard of shards) {
    for (const row of shard) if (terms.every((term) => row.t.includes(term))) hits.push(row);
  }
  // Cheapest first so an unscoped search still leads with something useful.
  hits.sort((a, b) => (a.p ?? Infinity) - (b.p ?? Infinity));
  return { results: hits.slice(0, options.limit ?? 60), count: hits.length };
}

export type { SearchRow };

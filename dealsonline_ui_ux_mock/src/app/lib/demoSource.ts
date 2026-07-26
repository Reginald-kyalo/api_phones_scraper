/**
 * Static demo data source.
 *
 * Serves the dataset captured from `product_matching_db.product_clusters_mvp`
 * into `public/demo/`. Shapes come from the API's own `_cluster_view`, so these
 * are the same objects `/api/clusters/*` would return — verified at capture time
 * with a field-level diff against the live endpoint.
 *
 * The whole catalogue ships (61,473 clusters, 14 categories), so nothing here
 * may load "everything" eagerly. Listings are paginated and details are sharded;
 * page counts and bucket counts are per category and come from the manifest.
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
  // cluster_id is "<slug>::<rest>"; the slug also names the shard file.
  const slug = clusterId.split('::')[0];
  const meta = await getCategoryMeta(slug);
  const shard = shardFor(clusterId, slug, meta.buckets);
  const rows = await load<Record<string, ClusterDetail>>(`clusters/${shard}.json`);
  const hit = rows[clusterId];
  if (!hit) throw new Error(`unknown cluster: ${clusterId}`);
  return hit;
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

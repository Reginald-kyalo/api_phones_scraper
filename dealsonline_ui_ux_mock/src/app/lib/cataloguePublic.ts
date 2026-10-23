/**
 * The public shape of catalogue responses.
 *
 * The dataset's own manifest and detail objects carry fields the interface
 * never reads: where each category is sharded, which source collection it
 * came from, what the capture excluded, and the identity keys the merge
 * engine absorbed. None of that belongs in a response a browser can request
 * (scraping review 2026-10-23, §3). Both read modes go through these
 * projections, so a page sees the same object whether it asked the catalogue
 * function or ran the query locally.
 */
import type { ClusterDetail } from './clusterTypes';
import type { DemoManifest } from './demoTypes';

export interface PublicCategory {
  slug: string;
  count: number;
  /** How many of `count` have prices from two or more shops. */
  multi_store: number;
  /** false ⇒ reachable, but not a reliable comparison (accessories). */
  comparison_grade: boolean;
  name?: string | null;
}

export interface PublicManifest {
  captured_at: string;
  total_clusters: number;
  multi_store_clusters: number;
  total_stores: number;
  deals: { count: number };
  categories: PublicCategory[];
}

export function publicManifest(m: DemoManifest): PublicManifest {
  return {
    captured_at: m.captured_at,
    total_clusters: m.total_clusters,
    multi_store_clusters: m.multi_store_clusters,
    total_stores: m.total_stores,
    deals: { count: m.deals.count },
    categories: m.categories.map((c) => ({
      slug: c.slug,
      count: c.count,
      multi_store: c.multi_store,
      comparison_grade: c.comparison_grade,
      ...(c.name != null ? { name: c.name } : {}),
    })),
  };
}

/**
 * Pipeline identifiers that explain nothing to a shopper and name internal
 * structure. `mvp_merged_members` stays: it carries the shop titles the
 * match explanation shows. `mvp_n_merged` stays: it decides whether that
 * explanation renders.
 */
const INTERNAL_DETAIL_FIELDS = ['mvp_merged_from', 'mvp_rule', 'mvp_generated', 'category_path'] as const;

export function publicDetail(detail: ClusterDetail): ClusterDetail {
  const out: Record<string, unknown> = { ...detail };
  for (const field of INTERNAL_DETAIL_FIELDS) delete out[field];
  return out as unknown as ClusterDetail;
}

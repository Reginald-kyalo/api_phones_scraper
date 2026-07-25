/**
 * Manifest for the captured static dataset in `public/demo/`.
 *
 * Written by `scripts/capture_demo_dataset.py` in the API repo. Cluster shapes
 * themselves live in `api.ts` (`ClusterSummary` / `ClusterDetail`) because the
 * fixtures are produced by the API's own `_cluster_view` projection.
 *
 * Nothing in the capture caps the dataset for size — listings are paginated and
 * details sharded — so `pages` and `buckets` are per category and MUST be read
 * from here rather than assumed.
 */
export interface DemoCategory {
  slug: string;
  count: number;
  /** How many of `count` are comparable across >=2 stores. */
  multi_store: number;
  /** Mirrors COMPARISON_SLUGS — false ⇒ reachable, but not a reliable comparison. */
  comparison_grade: boolean;
  /** Listing pages of `page_size` rows each, spread-ranked. */
  pages: number;
  /** Detail shards for this category; see shardFor() in demoSource.ts. */
  buckets: number;
}

export interface DemoManifest {
  captured_at: string;
  source_collection: string;
  /** Minimum n_stores captured. 1 = the entire catalogue. */
  min_stores: number;
  page_size: number;
  total_clusters: number;
  multi_store_clusters: number;
  /** Clusters skipped for having no price and no store — never for size. */
  excluded_unpriced: number;
  total_stores: number;
  with_image: number;
  with_history: number;
  /** Clusters with mvp_n_merged > 1. */
  merged: number;
  deals: { count: number; pages: number };
  categories: DemoCategory[];
}

/**
 * API client for the FastAPI backend.
 * All calls go through the Vite proxy (/api → localhost:10000).
 * Cookies are sent automatically (credentials: 'include').
 *
 * NOTE: in this statically-hosted demo build, `clustersApi` (bottom of file) is
 * served from committed fixtures instead — see `demoSource.ts`.
 */
import * as demoSource from './demoSource';

const BASE = '/api';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || body.message || detail;
    } catch {
      // ignore parse error
    }
    throw new ApiError(detail, res.status);
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;
  return res.json();
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface AuthUser {
  email: string;
  name: string;
  user_id?: string;
}

export interface SessionInfo {
  authenticated: boolean;
  username: string;
  email: string;
  user_id: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    request<AuthUser>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signup: (email: string, password: string) =>
    request<AuthUser>('/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    request<{ message: string }>('/logout', { method: 'POST' }),

  verifySession: () =>
    request<SessionInfo>('/verify-session'),

  refresh: () =>
    request<{ message: string }>('/refresh', { method: 'POST' }),
};

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export interface PriceData {
  retailerId: string;
  retailerName: string;
  price: number;
  inStock: boolean;
  url: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  image: string;
  images: string[];
  rating: number;
  reviewCount: number;
  prices: PriceData[];
  discount?: number | null;
  specifications: Record<string, string>;
  reviews: { id: string; author: string; rating: number; date: string; text: string; helpful: number }[];
  priceHistory: { date: string; price: number }[];
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  dealCount: number;
  subcategories?: unknown[];
}

export const productsApi = {
  getFeatured: (limit = 8) =>
    request<{ products: Product[] }>(`/products/featured?limit=${limit}`),

  getDeals: (limit = 6) =>
    request<{ products: Product[] }>(`/products/deals?limit=${limit}`),

  search: (q: string, category?: string, limit = 20) => {
    const params = new URLSearchParams({ q, limit: String(limit) });
    if (category) params.set('category', category);
    return request<{ products: Product[]; query: string; count: number }>(
      `/products/search?${params}`,
    );
  },

  getByCategory: (categoryId: string, options?: { brand?: string; sort?: string; limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    if (options?.brand) params.set('brand', options.brand);
    if (options?.sort) params.set('sort', options.sort);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    return request<{ products: Product[]; brands: string[]; brandCounts?: Record<string, number>; count: number; category: string }>(
      `/products/category/${encodeURIComponent(categoryId)}?${params}`,
    );
  },

  getById: (productId: string) =>
    request<Product>(`/products/${encodeURIComponent(productId)}`),

  getCategories: () =>
    request<{ categories: Category[] }>('/categories/list'),

  getStats: () =>
    request<{ productCount: number; shopCount: number; categoryCount: number }>('/stats'),

  getRelated: (productId: string, limit = 8) =>
    request<{ products: Product[] }>(
      `/products/related/${encodeURIComponent(productId)}?limit=${limit}`,
    ),
};

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------

export const favoritesApi = {
  list: () =>
    request<Array<Record<string, unknown>>>('/favorites'),

  add: (product: Record<string, unknown>) =>
    request<{ message: string }>('/favorites', {
      method: 'POST',
      body: JSON.stringify({ product }),
    }),

  remove: (productId: string) =>
    request<{ message: string }>(`/favorites/${encodeURIComponent(productId)}`, {
      method: 'DELETE',
    }),
};

// ---------------------------------------------------------------------------
// Price Alerts
// ---------------------------------------------------------------------------

export interface PriceAlertFromServer {
  alert_id: string;
  product: { product_id: string; brand: string; model: string; model_image: string };
  originalPrice: number;
  currentPrice: number;
  targetPrice: number;
  triggered: boolean;
  createdAt: string;
  email: string;
}

export const alertsApi = {
  list: (filter = 'all', sort = 'date-desc', page = 1, pageSize = 10) => {
    const params = new URLSearchParams({
      filter,
      sort,
      page: String(page),
      page_size: String(pageSize),
    });
    return request<{
      alerts: PriceAlertFromServer[];
      currentPage: number;
      totalPages: number;
      totalCount: number;
    }>(`/price-alerts?${params}`);
  },

  count: () =>
    request<{ totalCount: number; triggeredCount: number }>('/price-alerts/count'),

  create: (productId: string, targetPrice: number, alternateEmail?: string) =>
    request<{ id: string; alert_id: string; message: string }>('/price-alerts', {
      method: 'POST',
      body: JSON.stringify({
        product_id: productId,
        target_price: targetPrice,
        alternate_email: alternateEmail || null,
      }),
    }),

  update: (alertId: string, targetPrice: number, alternateEmail?: string) =>
    request<{ message: string }>(`/price-alerts/${encodeURIComponent(alertId)}`, {
      method: 'PUT',
      body: JSON.stringify({
        product_id: '',
        target_price: targetPrice,
        alternate_email: alternateEmail || null,
      }),
    }),

  delete: (alertId: string) =>
    request<{ message: string }>(`/price-alerts/${encodeURIComponent(alertId)}`, {
      method: 'DELETE',
    }),
};

// ---------------------------------------------------------------------------
// Subscription / Payment
// ---------------------------------------------------------------------------

export const subscriptionApi = {
  status: () =>
    request<Record<string, unknown>>('/subscription/status'),

  canCreateAlert: () =>
    request<Record<string, unknown>>('/subscription/can-create-alert'),
};

// ---------------------------------------------------------------------------
// PriceRunner Category Browser
// ---------------------------------------------------------------------------

export interface PRProductType {
  id: string;
  label: string;
  icon: string;
  productCount: number;
  image: string | null;
}

export interface PRTreeNode {
  name: string;
  slug: string;
  categoryUrl?: string;
  image?: string;
  children?: PRTreeNode[];
}

export interface PRProduct {
  id: string;
  name: string;
  description: string;
  image: string | null;
  price: number;
  numStores: number;
  categoryName: string;
  categoryUrl: string;
  productUrl: string;
  productType: string;
}

export interface PRProductsResponse {
  products: PRProduct[];
  total: number;
  page: number;
  totalPages: number;
  productType: string;
  label: string;
  brands: { name: string; count: number }[];
}

export interface PRProductDetail extends PRProduct {
  categoryPath: string[];
  rating: number | null;
}

export const pricerunnerApi = {
  getProductTypes: () =>
    request<{ productTypes: PRProductType[] }>('/pr/product-types').then((res) => ({
      // The backend feed contains a junk row with empty id/label — never render it.
      productTypes: res.productTypes.filter((t) => t.id?.trim() && t.label?.trim()),
    })),

  getCategoryTree: (productType: string) =>
    request<{ productType: string; label: string; tree: PRTreeNode[] }>(
      `/pr/categories/${encodeURIComponent(productType)}/tree`,
    ),

  getProducts: (
    productType: string,
    options?: {
      categoryUrl?: string;
      sort?: string;
      page?: number;
      limit?: number;
      minPrice?: number;
      maxPrice?: number;
      q?: string;
      brand?: string;
    },
  ) => {
    const params = new URLSearchParams();
    if (options?.categoryUrl) params.set('category_url', options.categoryUrl);
    if (options?.sort) params.set('sort', options.sort);
    if (options?.page) params.set('page', String(options.page));
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.minPrice != null) params.set('min_price', String(options.minPrice));
    if (options?.maxPrice != null) params.set('max_price', String(options.maxPrice));
    if (options?.q) params.set('q', options.q);
    if (options?.brand) params.set('brand', options.brand);
    return request<PRProductsResponse>(
      `/pr/categories/${encodeURIComponent(productType)}/products?${params}`,
    );
  },

  search: (q: string, productType?: string, page = 1, limit = 24) => {
    const params = new URLSearchParams({ q, page: String(page), limit: String(limit) });
    if (productType) params.set('product_type', productType);
    return request<{
      products: PRProduct[];
      total: number;
      page: number;
      totalPages: number;
      query: string;
    }>(`/pr/search?${params}`);
  },

  getHomepageProducts: (limit = 12) =>
    request<{ deals: PRProduct[]; trending: PRProduct[]; totalProducts: number }>(
      `/pr/homepage?limit=${limit}`,
    ),

  getProduct: (productId: string) =>
    request<PRProductDetail>(`/pr/product/${encodeURIComponent(productId)}`),

  getRelatedProducts: (productId: string, limit = 8) =>
    request<{ products: PRProduct[] }>(
      `/pr/product/${encodeURIComponent(productId)}/related?limit=${limit}`,
    ),
};

// ---------------------------------------------------------------------------
// Cross-store price-comparison clusters  (GET /api/clusters/*)
//
// This is the matching engine's own output: one cluster = one product family
// grouped across marketplaces by the deterministic model_identity_key. Prefer
// these endpoints over the generator mocks (mockServices.ts) for the store list
// and price comparison — they carry the HONEST-price contract the mocks cannot:
//   • best_price / cheapest_store  — the confident NEW-retail headline
//   • condition_basis              — "new" | "likely_used"; if "likely_used" even
//                                    the headline is a classifieds/refurb fallback
//   • likely_used_best_price       — the used/refurb "asking" tier, shown separately
//   • data_warning                 — non-null ⇒ render a caveat, never a clean headline
//   • comparison_grade             — false for accessories (headphones/monitors):
//                                    searchable but NOT a reliable cross-store deal
//   • like_for_like_spread_pct     — same-config saving (the honest one); prefer over
//                                    cross_store_spread_pct which conflates configs
//   • configs[]                    — per-facet (storage/CPU) like-for-like price splits
// Summary views (search/deals) map by_store → price; the detail view adds url+title.
// ---------------------------------------------------------------------------

export interface ClusterStore {
  price: number | null;
  url: string;
  title: string;
}

export interface ClusterConfig<Store = number> {
  facet_label: string | null;
  facet_value: string | number | null;
  storage_gb: number | null;
  best_price: number | null;
  cheapest_store: string | null;
  n_stores: number | null;
  spread_pct: number | null;
  by_store: Record<string, Store>;
}

export interface ClusterView<Store = number> {
  cluster_id: string;
  title: string;
  display_name: string | null;
  representative_title: string | null;
  category: string | null;
  /**
   * Position in the 424-node canonical taxonomy, for nested navigation.
   *
   * ⚠️ `null` is a real answer, not a lookup failure: `groceries` — the LARGEST
   * category — is not a taxonomy node, because FMCG came through its own
   * pipeline. Do not assume every category has a parent.
   */
  category_path?: {
    slug: string | null;
    name: string | null;
    parent_slug: string | null;
    level: number | null;
    path: string[];
    path_string: string | null;
    product_type: string | null;
  } | null;
  primary_facet: string | null;
  spec_facets: Record<string, string[]>;
  /** false for accessories — searchable but not a reliable cross-store comparison. */
  comparison_grade: boolean;
  /**
   * The title says this is an accessory, not the product its category claims —
   * a phone case filed under `headphones`. Category slugs come from the store's
   * own category page, so this happens. Such rows are demoted to the end of a
   * listing and kept out of deals, never removed.
   */
  off_category?: boolean;
  brand: string | null;
  canonical_name: string | null;
  n_listings: number | null;
  n_stores: number | null;
  stores: string[] | null;
  is_multi_store: boolean;
  best_price: number | null;
  cheapest_store: string | null;
  /** "new" | "likely_used" — "likely_used" ⇒ headline is a classifieds/refurb fallback. */
  condition_basis: string;
  n_confident: number | null;
  n_likely_used: number | null;
  likely_used_best_price: number | null;
  /** @deprecated back-compat aliases equal to the *_likely_used fields */
  n_used: number;
  used_best_price: number | null;
  /**
   * ⛔ A MARKUP, not a saving: (max - min) / MIN. 139 clusters publish >100%,
   * which is impossible as a discount. Never render this to a shopper.
   */
  like_for_like_spread_pct: number | null;
  /**
   * What a shopper actually keeps: (max - min) / MAX. Always < 100.
   * This is the badge number. Present on summaries too, so cards can reach it.
   */
  saving_pct?: number | null;
  /**
   * The two offers `like_for_like_spread_pct` actually compares, so the saving
   * can be SHOWN rather than asserted — and checked by a reader.
   *
   * ⚠️ Worth rendering both titles verbatim. The grocery merge unions flavour
   * variants into one config, so the pair can be e.g. Green Label at one shop
   * against Blue Label at the other — visible only if both names are on screen.
   */
  spread_basis?: {
    facet_label: string | null;
    spread_pct: number | null;
    cheapest: SpreadOffer | null;
    dearest: SpreadOffer | null;
  } | null;
  cross_store_spread_pct: number | null;
  configs: ClusterConfig<Store>[];
  best_by_store: Record<string, Store>;
  /** non-null ⇒ show a caveat; do NOT headline the price as a clean deal. */
  data_warning: string | null;

  /**
   * Can this actually be bought? The engine gates on it but the API used to drop
   * the verdict, so nothing downstream could tell a live price from a dead one.
   *
   * The captured dataset contains only `available` and `unknown` — `out_of_stock`
   * and `delisted` rows are excluded at capture time. Handle all four anyway: the
   * LIVE API serves them, and `unknown` means the source carries no stock field,
   * NOT that the item is in stock.
   */
  availability_basis?: 'available' | 'out_of_stock' | 'delisted' | 'unknown';
  /**
   * `stale` ⇒ unseen for over 60 days, so the price is historical. Never present
   * in the capture (those rows are excluded).
   *
   * ⚠️ `unknown` is NOT a staleness claim — tvs, printers, routers, wearables,
   * desktop-computers and digital-cameras date nothing at source, so all 3,960 of
   * their clusters are `unknown`. Do not badge them as out of date.
   */
  freshness_basis?: 'fresh' | 'stale' | 'unknown';
  /** ISO timestamp of the most recently verified listing; null when undated. */
  last_seen?: string | null;

  // --- capture-time additions (see docs/superpowers/plans/2026-07-25-static-demo-dataset.md)
  /** One real member image, chosen stably per cluster. 46,701/61,473 covered. */
  image?: string | null;
  /**
   * Every distinct real photo the cluster's listings carry, chosen one FIRST.
   * Lets "wrong picture" be corrected rather than only flagged. 12,705 clusters
   * have >=2; retailer placeholder assets are excluded. Capped at 6.
   */
  image_candidates?: string[] | null;
  /** Only present where >=2 DATED points exist (13,287 clusters); never synthesised. */
  price_history?: PricePoint[] | null;
  /** True for every cluster rebuilt through the MVP path — NOT a merge signal. */
  mvp_generated?: boolean;
  mvp_rule?: string | null;
  /** >1 ⇒ this cluster is the union of several engine clusters: the only merge signal. */
  mvp_n_merged?: number | null;
  /**
   * The engine cluster_ids this row absorbed, its own included, so
   * `length === mvp_n_merged`.
   *
   * This is the forwarding address for a dead id. 6,039 ids are absorbed across
   * the corpus, and a reader report or bookmark keyed on one would otherwise have
   * no way to find where it went. Search this array to re-attach.
   *
   * ⚠️ Ids are reproducible from a given corpus (two rebuilds now produce identical
   * ids) but not permanent — a genuinely new merge still absorbs one.
   */
  mvp_merged_from?: string[] | null;
  /**
   * The same absorbed clusters WITH TITLES. `mvp_merged_from` is identity keys
   * ("groceries::250mlx6+brookside+flavour+strawberry+uht") — unshowable to a
   * person. This is what to render when asking "do these belong together?":
   * one tickable row per entry, each carrying the cluster_id to report back.
   */
  mvp_merged_members?: { cluster_id: string; title: string | null }[] | null;

}

export interface SpreadOffer {
  store: string | null;
  price: number | null;
  /** the listing title as that store wrote it */
  title: string | null;
  url: string | null;
}

export interface PricePoint {
  /** ISO date string */
  t: string;
  price: number;
}

/** Summary rows (search/deals) carry price-only store maps. */
export type ClusterSummary = ClusterView<number>;
/** Detail view (single cluster) carries {price,url,title} per store for click-through. */
export type ClusterDetail = ClusterView<ClusterStore>;

/**
 * Cluster data source.
 *
 * This build is statically hosted, so clusters come from the committed capture
 * in `public/demo/` rather than `/api/clusters/*`. The fixtures are produced by
 * the API's own `_cluster_view`, and capture-time verification showed zero field
 * mismatches against the live endpoint — so the shapes below are unchanged and
 * consumers do not care which side served them.
 */
export const clustersApi = {
  /** Best REAL like-for-like cross-store deals (NEW-priced, multi-store, honest spread). */
  getDeals: (options?: { slug?: string; limit?: number; page?: number }) =>
    demoSource.getDeals(options ?? {}),

  search: (q: string, options?: { slug?: string; limit?: number }) =>
    demoSource.search(q, options ?? {}),

  /** Full comparison for one product, including per-store click-through URLs. */
  getDetail: (clusterId: string) => demoSource.getDetail(clusterId),

  /** Dataset totals and the category table — drives homepage rails and browse. */
  getManifest: () => demoSource.getManifest(),

  /** One page of a category listing (0-based); the catalogue is too big to load whole. */
  getCategoryPage: (slug: string, page = 0) => demoSource.getCategoryPage(slug, page),
};

export { ApiError };

/**
 * API client for the FastAPI backend.
 * All calls go through the Vite proxy (/api → localhost:10000).
 * Cookies are sent automatically (credentials: 'include').
 */

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

/**
 * Where a cluster sits in a category tree — served, but never declared here until now.
 *
 * ⛔⛔ THE SLUG IS NOT SAFE TO LINK. `app/api/taxonomy.py:category_path_for_cluster` answers
 * from the retired 424-node spine where it has an answer and from `browse_nodes` otherwise, so
 * one field carries slugs from TWO spaces and nothing on the wire says which. Measured
 * 2026-09-03: the redesign spine shares 112 slugs with the 424-spine and 95 with `browse_nodes`,
 * and the three trees disagree about what those slugs mean (`bathtubs` is level 3 in one and
 * level 2 in another). Passing this slug to `shelfHref` or `departmentHref` therefore lands on
 * a plausible WRONG page, not on a 404 — the loudest failure would be the lucky one.
 * ⇒ Render `path_string`; do not build a link out of `slug` without knowing the space.
 */
export interface CategoryPath {
  slug: string;
  name: string | null;
  parent_slug: string | null;
  level: number;
  path: string[];
  path_string: string;
  product_type: string | null;
  unsorted?: boolean;
}

export interface ClusterConfig<Store = number> {
  facet_label: string | null;
  facet_value: string | number | null;
  storage_gb: number | null;
  best_price: number | null;
  cheapest_store: string | null;
  /**
   * ⛔ Stores holding a LISTING — NOT the number a shopper can compare. Rendering this as
   * "N shops" overstated by a mean of +9.6 on the smartphone shelf (99 of 100 clusters).
   * Use `n_stores_priced`.
   */
  n_stores: number | null;
  /**
   * ⛔⛔ A CONFIG HAS NO `n_stores_priced` AND THIS TYPE USED TO CLAIM ONE, non-optional.
   * `app/api/schemas/clusters.py:ClusterConfig` serves `n_stores` only — `n_stores_priced` is
   * a `ClusterView` field. So the declaration below the comment on `n_stores` ("Use
   * `n_stores_priced`") pointed at `undefined`, and anything that followed it would have
   * rendered "compared across NaN shops" with the compiler's blessing.
   *
   * ⭐ THE HONEST COUNT AT CONFIG LEVEL IS DERIVED, NOT DECLARED: `pricedOffers(by_store).length`
   * in `features/clusters/components/OfferRow`. It is the count of the rows that will actually
   * render, so it cannot overstate them — which is the whole lesson of the cluster-level fix.
   */
  spread_pct: number | null;
  by_store: Record<string, Store>;
}

export interface ClusterView<Store = number> {
  cluster_id: string;
  title: string;
  display_name: string | null;
  representative_title: string | null;
  category: string | null;
  primary_facet: string | null;
  spec_facets: Record<string, string[]>;
  /** false for accessories — searchable but not a reliable cross-store comparison. */
  comparison_grade: boolean;
  brand: string | null;
  canonical_name: string | null;
  n_listings: number | null;
  /**
   * ⛔ Stores holding a LISTING — NOT the number a shopper can compare. Rendering this as
   * "N shops" overstated by a mean of +9.6 on the smartphone shelf (99 of 100 clusters).
   * Use `n_stores_priced`.
   */
  n_stores: number | null;
  /**
   * ⭐ Stores that can actually PRICE this cluster — exactly the column count of
   * `best_by_store`, after store-name canonicalisation. THIS is "compared across N shops".
   * ⚠️ Below 2 there is no comparison at all, which is worth saying rather than hiding.
   */
  n_stores_priced: number;
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
  like_for_like_spread_pct: number | null;
  cross_store_spread_pct: number | null;
  configs: ClusterConfig<Store>[];
  best_by_store: Record<string, Store>;
  /** Where this sits in a category tree. ⛔ Render `path_string`; see `CategoryPath`. */
  category_path: CategoryPath | null;
  /** non-null ⇒ show a caveat; do NOT headline the price as a clean deal. */
  data_warning: string | null;
}

/** Summary rows (search/deals) carry price-only store maps. */
export type ClusterSummary = ClusterView<number>;
/** Detail view (single cluster) carries {price,url,title} per store for click-through. */
export type ClusterDetail = ClusterView<ClusterStore>;

export const clustersApi = {
  /** Best REAL like-for-like cross-store deals (NEW-priced, multi-store, honest spread). */
  getDeals: (options?: { slug?: string; limit?: number; minStores?: number }) => {
    const params = new URLSearchParams();
    if (options?.slug) params.set('slug', options.slug);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.minStores) params.set('min_stores', String(options.minStores));
    return request<{ count: number; results: ClusterSummary[] }>(
      `/clusters/deals?${params}`,
    );
  },

  search: (q: string, options?: { slug?: string; multiStoreOnly?: boolean; limit?: number }) => {
    const params = new URLSearchParams({ q });
    if (options?.slug) params.set('slug', options.slug);
    if (options?.multiStoreOnly) params.set('multi_store_only', 'true');
    if (options?.limit) params.set('limit', String(options.limit));
    return request<{ query: string; count: number; results: ClusterSummary[] }>(
      `/clusters/search?${params}`,
    );
  },

  /** Full comparison for one product, including per-store click-through URLs. */
  getDetail: (clusterId: string) =>
    request<ClusterDetail>(`/clusters/${encodeURIComponent(clusterId)}`),
};

// ---------------------------------------------------------------------------
// The CANONICAL category tree (taxonomy_db.browse_nodes)
//
// ⛔ NOT the same thing as `pricerunnerApi`. That reads `taxonomy_db.canonical_categories` —
// the retired 424-node PriceRunner spine, which still drives /browse. This reads the canonical
// taxonomy built bottom-up from the shops (4,137 nodes @ 2026-08-21). The two slug spaces are
// DISJOINT, so
// a slug from one NEVER resolves in the other. Kept side by side deliberately: the cutover is
// additive, exactly as the API-side one was.
// ---------------------------------------------------------------------------

export interface BrowseNode {
  slug: string;
  label: string | null;
  parent_slug: string | null;
  /** root-first ancestor slugs, excluding self */
  ancestors: string[];
  /** display label per `ancestors` entry, INDEX FOR INDEX; falls back to the slug */
  ancestor_labels: string[];
  /**
   * ⛔ OWN stock only — NOT what the shelf page shows. `food-cupboard` publishes 2,010 here
   * and answers 6,220 on `/by-node`. Render `n_clusters_subtree` instead; this field is kept
   * because sorting, auditing and "how much sits directly here" still need it.
   */
  n_clusters: number;
  /**
   * ⭐ Stock on this shelf AND everything below it — identical to the `total` that
   * `/by-node/{slug}` returns, so a menu and the page it links to agree. THIS is the number
   * to display, and the one the API already orders by.
   */
  n_clusters_subtree: number;
  n_stores: number;
  /** a grouping header, not a landing page — render as a section title, not a shelf */
  coarse: boolean;
  /** this node or something below it holds stock */
  browsable: boolean;
  /** holds stock and has no children to sort it into */
  unsorted: boolean;
}

export const browseApi = {
  /** One level of the tree: a node's children, or the roots when `parent` is omitted. */
  getTree: (parent?: string | null, options?: { includeEmpty?: boolean }) => {
    const params = new URLSearchParams();
    if (parent) params.set('parent', parent);
    if (options?.includeEmpty) params.set('browsable_only', 'false');
    return request<{ parent: BrowseNode | null; count: number; results: BrowseNode[] }>(
      `/clusters/browse-tree?${params}`,
    );
  },

  /** The products on one shelf AND everything below it (descendant closure, server-side). */
  getClusters: (
    slug: string,
    options?: { multiStoreOnly?: boolean; limit?: number; offset?: number },
  ) => {
    const params = new URLSearchParams();
    if (options?.multiStoreOnly) params.set('multi_store_only', 'true');
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    return request<{
      node: BrowseNode;
      count: number;
      total: number;
      results: ClusterSummary[];
    }>(`/clusters/by-node/${encodeURIComponent(slug)}?${params}`);
  },
};

// ---------------------------------------------------------------------------
// THE DEPARTMENT SPINE — 21 ruled departments over the canonical tree
//
// ⭐ WHY THIS IS A SEPARATE CLIENT. `browseApi` serves the tree as the engine publishes it:
// 529 browsable roots, 75% of them one shop's private vocabulary, `Laptops` in three places.
// Faithful, and not navigable. The spine is a curated presentation mapping ruled by a person
// (`phones_scraper/implementation_plans/department_spine_worksheet_2026-08-21.md` §8) and served
// from API config, so every surface renders the same 21 and cannot drift.
//
// ⛔⛔ A DEPARTMENT `id` IS NOT A `BrowseNode` SLUG, AND THE TWO NAMESPACES OVERLAP. Six ids
// (`audio`, `bakery`, `cleaning`, `fresh`, `hardware`, `pantry`) also name a node, and the pages
// genuinely differ — `/department/pantry` is 485 clusters while `/shelf/pantry` is 889. This is
// the SAME defect class as the disjoint spine/canonical slug spaces above, so it gets the same
// discipline: `departmentHref` and `shelfHref` are the only two link builders, and neither id
// is ever passed to the other's endpoint.
//
// ⛔ THE SPINE DOES NOT REPLACE THE TREE. It reaches ~45% of placed clusters by design; the rest
// stay reachable at /shelf. Any surface rendering departments MUST keep an "All categories" door.
// ---------------------------------------------------------------------------

export interface Department {
  /** URL-safe id — ⛔ NOT a `BrowseNode` slug. `/department/{id}`, never `/shelf/{id}`. */
  id: string;
  /** OUR name. `browse_nodes.label` is the engine's join key and is never rewritten upstream. */
  label: string;
  /** the `browse_nodes` slugs this department claims, each WITH its subtree */
  adopts: string[];
  /**
   * ⭐ Clusters across every adopted subtree — identical to the `total` that
   * `/by-department/{id}` returns, so a tile and the page it links to agree by construction.
   */
  n_clusters: number;
  /** ⚠️ the WIDEST adopted shelf's span — a lower bound, not a distinct-store count */
  n_stores: number;
  /** ⛔ adopted slugs that no longer resolve. Non-empty means a ruling is being skipped. */
  unresolved: string[];
  /** other department ids sharing clusters — ruled and deliberate (Tablets sits in Computers) */
  overlaps: string[];
  /** defects this department adopts KNOWINGLY — reported, never patched in the client */
  notes: string[];
}

export const departmentApi = {
  /** The 21 ruled departments, in EDITORIAL order. ⛔ Do not re-sort by stock. */
  list: () =>
    request<{ count: number; results: Department[]; n_clusters_total: number }>(
      '/clusters/departments',
    ),

  /** The products across every shelf a department adopts. Closure is server-side. */
  getClusters: (
    id: string,
    options?: { multiStoreOnly?: boolean; limit?: number; offset?: number },
  ) => {
    const params = new URLSearchParams();
    if (options?.multiStoreOnly) params.set('multi_store_only', 'true');
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    return request<{
      department: Department;
      /** the adopted nodes, stock-ordered — the page's subcategory grid, no extra call */
      shelves: BrowseNode[];
      count: number;
      total: number;
      results: ClusterSummary[];
    }>(`/clusters/by-department/${encodeURIComponent(id)}?${params}`);
  },
};

export { ApiError };

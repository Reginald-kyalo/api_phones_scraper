/**
 * API client for the FastAPI backend.
 * All calls go through the Vite proxy (/api → localhost:10000).
 * Cookies are sent automatically (credentials: 'include').
 *
 * NOTE: in this statically-hosted demo build, `clustersApi` (bottom of file) is
 * served from committed fixtures instead — see `demoSource.ts`.
 */
import * as catalogue from './catalogueQueries';
import { writeFilters, type ListingFilters } from './listing';
import type { DemoBrowseNode, DemoShelfTreeResponse } from './demoTypes';

const BASE = '/api';

class ApiError extends Error {
  status: number;
  /** From a 429's Retry-After header, in milliseconds, when one was sent. */
  retryAfterMs?: number;
  constructor(message: string, status: number, retryAfterMs?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryAfterMs = retryAfterMs;
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

// Cluster shapes live in clusterTypes.ts so the catalogue function can use
// them without this browser module.
export type {
  ClusterStore, ClusterConfig, ClusterView, SpreadOffer, PricePoint, ClusterSummary, ClusterDetail,
} from './clusterTypes';
import type { ClusterDetail } from './clusterTypes';
import type { PublicManifest } from './cataloguePublic';
import { takeInitialResponse, type QueryParams } from './initialCatalogueData';

/**
 * Cluster data source.
 *
 * Two modes, one set of queries (catalogueQueries.ts), so results are the
 * same either way:
 *
 *   VITE_CATALOGUE=api   production: every read is one small page from the
 *                        catalogue function (/api/catalogue/*), which reads a
 *                        private R2 bucket. The dataset files are not public.
 *   anything else        local: the queries run in the browser over the
 *                        files in public/demo/ (dev server, or a build made
 *                        before the bucket exists).
 */
const CATALOGUE_API = import.meta.env.VITE_CATALOGUE === 'api';
const API_BASE = `${import.meta.env.BASE_URL}api/catalogue`;

/** Retry-After as milliseconds: seconds or an HTTP date; undefined if absent or unreadable. */
function retryAfterMs(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const at = Date.parse(header);
  return Number.isNaN(at) ? undefined : Math.max(0, at - Date.now());
}

async function getJson<T>(op: string, params: QueryParams = {}): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  const res = await fetch(`${API_BASE}/${op}${qs.size ? `?${qs}` : ''}`);
  if (!res.ok) throw new ApiError(`catalogue ${op} failed`, res.status, retryAfterMs(res.headers.get('retry-after')));
  return res.json() as Promise<T>;
}

/**
 * Every read first asks the page for the data the prerender embedded for it
 * (lib/initialCatalogueData.ts), then goes to the catalogue. A product page
 * therefore shows its prices even when the catalogue request would fail, and
 * a prerendered page costs no catalogue read at all on first view. The
 * parameter objects here are the keys the prerender writes: change one side,
 * change the other.
 */
function read<T>(op: string, params: QueryParams, live: () => Promise<T>): Promise<T> {
  const embedded = takeInitialResponse<T>(op, params);
  return embedded !== undefined ? Promise.resolve(embedded) : live();
}

const filterParams = (filters: ListingFilters) => writeFilters(filters);

export const clustersApi = {
  /** Dataset totals and the category table, in their public shape. */
  getManifest: (): Promise<PublicManifest> =>
    read('manifest', {}, () => (CATALOGUE_API ? getJson('manifest') : catalogue.manifest())),

  /** Full comparison for one product, including per-store click-through URLs. */
  getDetail: (clusterId: string): Promise<ClusterDetail> =>
    read('detail', { id: clusterId }, () =>
      CATALOGUE_API ? getJson('detail', { id: clusterId }) : catalogue.detail(clusterId)),

  /** One page (48) of a category, filtered and sorted, with brand facets. */
  browse: (slug: string, filters: ListingFilters, page = 0): ReturnType<typeof catalogue.browse> => {
    const params = { slug, ...filterParams(filters), page };
    return read('browse', params, () => (CATALOGUE_API ? getJson('browse', params) : catalogue.browse(slug, filters, page)));
  },

  /** Deals with a photo and a showable difference of at least `minSaving` %. */
  getDeals: (options: { page?: number; minSaving?: number; limit?: number } = {}): ReturnType<typeof catalogue.deals> =>
    read('deals', options, () => (CATALOGUE_API ? getJson('deals', options) : catalogue.deals(options))),

  /** The first products of a category in capture order (rails, compare panel). */
  getCategoryPage: (slug: string, limit?: number): ReturnType<typeof catalogue.categoryPage> =>
    read('category', { slug, limit }, () =>
      CATALOGUE_API ? getJson('category', { slug, limit }) : catalogue.categoryPage(slug, limit)),

  /** Search, scoped and filtered like a listing, one page at a time. Never embedded. */
  search: (
    q: string,
    options: { slug?: string; filters: ListingFilters; page?: number; limit?: number },
  ): Promise<catalogue.SearchResult> =>
    CATALOGUE_API
      ? getJson('search', { q, slug: options.slug, ...filterParams(options.filters), page: options.page, limit: options.limit })
      : catalogue.search(q, options),
};

// ---------------------------------------------------------------------------
// The canonical category tree, for the demo's shelf pages. Same two modes.
// ---------------------------------------------------------------------------

export type BrowseNode = DemoBrowseNode;

export const browseApi = {
  /** One level of the tree. The demo only captures leaf shelves, so a root listing is empty. */
  getTree: (parent?: string | null): Promise<DemoShelfTreeResponse> => {
    if (!parent) {
      return Promise.resolve({ parent: null, count: 0, results: [] });
    }
    return read('shelf-tree', { slug: parent }, () =>
      CATALOGUE_API ? getJson('shelf-tree', { slug: parent }) : catalogue.shelfTree(parent));
  },

  /** The products on one shelf AND everything below it. */
  getClusters: (
    slug: string,
    options: { multiStoreOnly?: boolean; limit?: number; offset?: number } = {},
  ): ReturnType<typeof catalogue.shelfClusters> => {
    const params = { slug, multi: options.multiStoreOnly ? 1 : undefined, limit: options.limit, offset: options.offset };
    return read('shelf', params, () => (CATALOGUE_API ? getJson('shelf', params) : catalogue.shelfClusters(slug, options)));
  },
};

export { ApiError };

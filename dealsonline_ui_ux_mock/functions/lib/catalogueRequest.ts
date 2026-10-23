/**
 * Request validation for GET /api/catalogue/<op>: a pure function from URL
 * to either a typed request or a 400/404, with no storage read either way.
 *
 * The limits are the public contract (scraping review 2026-10-23, §3):
 * one path segment; a query of at most 256 code points; an id of at most
 * 512 and a slug of at most 128; `limit` a finite positive integer clamped to
 * MAX_LIMIT; `page` and `offset` finite nonnegative integers no larger than
 * MAX_PAGE; filters from the listing's own allowlist, with a minimum no
 * greater than the maximum. A recognised parameter given twice with
 * different values is a 400, never a silent choice of one.
 */
import { readFilters, SORT_OPTIONS, type ListingFilters } from '../../src/app/lib/listing';

export const MAX_LIMIT = 96;
export const MAX_PAGE = 1_000_000;
export const MAX_QUERY_CODE_POINTS = 256;
export const MAX_ID_CODE_POINTS = 512;
export const MAX_SLUG_CODE_POINTS = 128;
const MAX_BRANDS = 20;
const MAX_BRAND_CODE_POINTS = 64;

/** Category and shelf slugs as the capture writes them. */
const SLUG = /^[a-z0-9][a-z0-9-]*$/;

export type CatalogueRequest =
  | { op: 'manifest' }
  | { op: 'detail'; id: string }
  | { op: 'browse'; slug: string; filters: ListingFilters; page: number }
  | { op: 'deals'; page: number; minSaving?: number; limit?: number }
  | { op: 'category'; slug: string; limit?: number }
  | { op: 'search'; q: string; slug?: string; filters: ListingFilters; page: number; limit?: number }
  | { op: 'shelf-tree'; slug: string }
  | { op: 'shelf'; slug: string; multi: boolean; limit?: number; offset: number };

export type ParseResult =
  | { ok: true; request: CatalogueRequest }
  | { ok: false; status: 400 | 404; error: string };

class Reject extends Error {
  constructor(readonly status: 400 | 404, message: string) {
    super(message);
  }
}

const codePoints = (s: string) => [...s].length;

function reader(q: URLSearchParams) {
  /** One value for a name; two different values is a contradiction. */
  const one = (name: string): string | undefined => {
    const all = q.getAll(name);
    if (all.length === 0) return undefined;
    if (all.some((v) => v !== all[0])) throw new Reject(400, `conflicting values for ${name}`);
    return all[0];
  };
  const int = (name: string, { min, max, required = false }: { min: number; max: number; required?: boolean }) => {
    const raw = one(name);
    if (raw === undefined || raw === '') {
      if (required) throw new Reject(400, `${name} is required`);
      return undefined;
    }
    if (!/^-?\d+$/.test(raw.trim())) throw new Reject(400, `${name} must be an integer`);
    const n = Number(raw);
    if (!Number.isSafeInteger(n) || n < min || n > max) throw new Reject(400, `${name} must be between ${min} and ${max}`);
    return n;
  };
  const number = (name: string, { min, max }: { min: number; max: number }) => {
    const raw = one(name);
    if (raw === undefined || raw === '') return undefined;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < min || n > max) throw new Reject(400, `${name} must be a number between ${min} and ${max}`);
    return n;
  };
  const slug = (name: string, required: boolean) => {
    const raw = one(name);
    if (raw === undefined || raw === '') {
      if (required) throw new Reject(400, `${name} is required`);
      return undefined;
    }
    if (codePoints(raw) > MAX_SLUG_CODE_POINTS || !SLUG.test(raw)) throw new Reject(400, `${name} is not a valid slug`);
    return raw;
  };
  /** Positive, clamped: a client asking for more than a page gets a page. */
  const limit = () => {
    const raw = one('limit');
    if (raw === undefined || raw === '') return undefined;
    if (!/^\d+$/.test(raw.trim())) throw new Reject(400, 'limit must be a positive integer');
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1) throw new Reject(400, 'limit must be a positive integer');
    return Math.min(n, MAX_LIMIT);
  };
  const page = () => int('page', { min: 0, max: MAX_PAGE }) ?? 0;
  const flag = (name: string) => {
    const raw = one(name);
    if (raw === undefined || raw === '') return false;
    if (raw !== '1' && raw !== '0') throw new Reject(400, `${name} must be 1 or 0`);
    return raw === '1';
  };
  /** The listing filters, validated before readFilters normalises them. */
  const filters = (): ListingFilters => {
    const sort = one('sort');
    if (sort !== undefined && sort !== '' && !SORT_OPTIONS.some((o) => o.value === sort)) throw new Reject(400, 'unknown sort');
    const brands = (one('brand') ?? '').split(',').filter(Boolean);
    if (brands.length > MAX_BRANDS) throw new Reject(400, 'too many brands');
    if (brands.some((b) => codePoints(b) > MAX_BRAND_CODE_POINTS)) throw new Reject(400, 'brand is too long');
    const min = number('min', { min: 0, max: Number.MAX_SAFE_INTEGER });
    const max = number('max', { min: 0, max: Number.MAX_SAFE_INTEGER });
    if (min != null && max != null && min > max) throw new Reject(400, 'min must not exceed max');
    flag('multi');
    // readFilters reads the same names; `page` in the listing URL format is
    // 1-based and ignored here, where the API's own 0-based `page` applies.
    return readFilters(q);
  };
  return { one, int, number, slug, limit, page, flag, filters };
}

export function parseCatalogueRequest(url: URL, op: string | string[] | undefined): ParseResult {
  try {
    const segments = Array.isArray(op) ? op : op ? [op] : [];
    if (segments.length !== 1) throw new Reject(404, 'unknown operation');
    const name = segments[0];
    const r = reader(url.searchParams);
    switch (name) {
      case 'manifest':
        return { ok: true, request: { op: 'manifest' } };
      case 'detail': {
        const id = r.one('id');
        if (!id) throw new Reject(400, 'id is required');
        if (codePoints(id) > MAX_ID_CODE_POINTS) throw new Reject(400, 'id is too long');
        if (!/^[a-z0-9-]+::/.test(id)) throw new Reject(400, 'id is not a product id');
        return { ok: true, request: { op: 'detail', id } };
      }
      case 'browse':
        return { ok: true, request: { op: 'browse', slug: r.slug('slug', true)!, filters: r.filters(), page: r.page() } };
      case 'deals':
        return {
          ok: true,
          request: { op: 'deals', page: r.page(), minSaving: r.number('minSaving', { min: 0, max: 100 }), limit: r.limit() },
        };
      case 'category':
        return { ok: true, request: { op: 'category', slug: r.slug('slug', true)!, limit: r.limit() } };
      case 'search': {
        const q = (r.one('q') ?? '').trim();
        if (codePoints(q) > MAX_QUERY_CODE_POINTS) throw new Reject(400, 'q is too long');
        return { ok: true, request: { op: 'search', q, slug: r.slug('slug', false), filters: r.filters(), page: r.page(), limit: r.limit() } };
      }
      case 'shelf-tree':
        return { ok: true, request: { op: 'shelf-tree', slug: r.slug('slug', true)! } };
      case 'shelf':
        return {
          ok: true,
          request: {
            op: 'shelf',
            slug: r.slug('slug', true)!,
            multi: r.flag('multi'),
            limit: r.limit(),
            offset: r.int('offset', { min: 0, max: MAX_PAGE }) ?? 0,
          },
        };
      default:
        throw new Reject(404, 'unknown operation');
    }
  } catch (err) {
    if (err instanceof Reject) return { ok: false, status: err.status, error: err.message };
    throw err;
  }
}

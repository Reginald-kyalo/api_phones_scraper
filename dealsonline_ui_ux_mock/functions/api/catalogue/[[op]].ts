/**
 * Cloudflare Pages Function — GET /api/catalogue/<op>
 *
 * The catalogue, one page at a time. The dataset lives in a PRIVATE R2 bucket
 * (binding `CATALOGUE`), so the browser never downloads the files behind it:
 * every response is at most 96 products (catalogueQueries.MAX_ROWS). This is
 * the "stop shipping the whole catalogue" step of the anti-scraping plan, and
 * the one URL to observe and, later, rate-limit in Cloudflare.
 *
 * Ops: manifest · detail?id · browse?slug&<filters>&page · deals?page&minSaving
 * · category?slug&limit · search?q&slug&<filters>&page · shelf-tree?slug
 * · shelf?slug&multi&limit&offset. Filters use the listing URL format
 * (sort, brand, min, max, multi), the same as the page's own URL.
 *
 * Contract (scraping review 2026-10-23, §3): input is validated before any
 * read (functions/lib/catalogueRequest.ts); malformed input is 400, an
 * unknown operation or product is 404, an unreachable store is 503. Errors
 * are never cached. Responses carry the public projection only.
 *
 * Storage layout: `current.json` at the bucket root names the active dataset
 * version, and files live under `versions/<version>/` (scripts/
 * upload-catalogue.mjs). A bucket without `current.json` is read at its root,
 * which is the layout the first uploads used.
 *
 * Without the bucket the function reads /demo/ from the site's own assets
 * ONLY on localhost (`wrangler pages dev`). Anywhere else a missing binding
 * is a deployment fault and answers 503: a public fallback is exactly what
 * this function exists to prevent.
 */
import * as catalogue from '../../../src/app/lib/catalogueQueries';
import { CatalogueMissingError, CatalogueStorageError, setLoader } from '../../../src/app/lib/demoSource';
import { parseCatalogueRequest } from '../../lib/catalogueRequest';

interface Env {
  CATALOGUE?: R2Bucket;
  ASSETS: Fetcher;
}

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])$/;
const CURRENT_KEY = 'current.json';
/** How long a warm isolate trusts the version it last read. */
const VERSION_TTL_MS = 5 * 60_000;

let configured: string | null = null;
let versionRead: { at: number; prefix: Promise<string> } | null = null;
/**
 * The bindings of the request being served. The loader reads these rather
 * than closing over one request's `env`: a warm isolate serves many requests,
 * and the loader must talk to the bucket of the current one.
 */
let bindings: Env | null = null;
let origin = '';

/** Test seam: forget the loader and version a previous request configured. */
export function resetCatalogueState() {
  configured = null;
  versionRead = null;
  bindings = null;
}

/** `versions/<v>/` from current.json, or '' for the flat legacy layout. */
function activePrefix(bucket: R2Bucket): Promise<string> {
  const now = Date.now();
  if (!versionRead || now - versionRead.at > VERSION_TTL_MS) {
    const prefix = (async () => {
      let obj: R2ObjectBody | null;
      try {
        obj = await bucket.get(CURRENT_KEY);
      } catch (err) {
        throw new CatalogueStorageError(`cannot read ${CURRENT_KEY}: ${(err as Error).message}`);
      }
      if (!obj) return '';
      const current = (await obj.json()) as { version?: unknown };
      return typeof current.version === 'string' && /^[A-Za-z0-9._-]+$/.test(current.version)
        ? `versions/${current.version}/`
        : '';
    })();
    // A failed read is not remembered: the next request tries again.
    prefix.catch(() => { versionRead = null; });
    versionRead = { at: now, prefix };
  }
  return versionRead.prefix;
}

async function configure(env: Env, url: URL): Promise<void> {
  bindings = env;
  origin = url.origin;
  if (env.CATALOGUE) {
    const prefix = await activePrefix(env.CATALOGUE);
    const mode = `r2:${prefix}`;
    if (configured === mode) return;
    configured = mode;
    // setLoader clears the parsed-file cache, so a version switch in a warm
    // isolate never mixes files from two datasets.
    setLoader(async (path) => {
      const bucket = bindings?.CATALOGUE;
      if (!bucket) throw new CatalogueStorageError('CATALOGUE binding missing');
      let obj: R2ObjectBody | null;
      try {
        obj = await bucket.get(prefix + path);
      } catch (err) {
        throw new CatalogueStorageError(`${path}: ${(err as Error).message}`);
      }
      if (!obj) throw new CatalogueMissingError(`catalogue file missing: ${path}`);
      return obj.json();
    });
    return;
  }
  if (!LOCAL_HOST.test(url.hostname)) {
    throw new CatalogueStorageError('CATALOGUE binding missing');
  }
  if (configured === 'assets') return;
  configured = 'assets';
  setLoader(async (path) => {
    if (!bindings) throw new CatalogueStorageError('no request bindings');
    const res = await bindings.ASSETS.fetch(new URL(`/demo/${path}`, origin));
    if (res.status === 404) throw new CatalogueMissingError(`catalogue file missing: ${path}`);
    if (!res.ok) throw new CatalogueStorageError(`assets ${res.status} for ${path}`);
    return res.json();
  });
}

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Success: the dataset changes once per capture; a few minutes at the
      // edge and in the browser saves R2 reads without serving stale prices
      // for long. Errors: never cached, so an outage or a limit cannot be
      // replayed to the next shopper as if it were the answer.
      'cache-control': status === 200 ? 'public, max-age=300' : 'no-store',
      'x-robots-tag': 'noindex',
      ...extra,
    },
  });

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const url = new URL(request.url);
  const parsed = parseCatalogueRequest(url, params.op);
  if (!parsed.ok) return json({ error: parsed.error }, parsed.status);
  const r = parsed.request;

  try {
    await configure(env, url);
    switch (r.op) {
      case 'manifest':
        return json(await catalogue.manifest());
      case 'detail':
        return json(await catalogue.detail(r.id));
      case 'browse':
        return json(await catalogue.browse(r.slug, r.filters, r.page));
      case 'deals':
        return json(await catalogue.deals({ page: r.page, minSaving: r.minSaving, limit: r.limit }));
      case 'category':
        return json(await catalogue.categoryPage(r.slug, r.limit));
      case 'search':
        return json(await catalogue.search(r.q, { slug: r.slug, filters: r.filters, page: r.page, limit: r.limit }));
      case 'shelf-tree':
        return json(await catalogue.shelfTree(r.slug));
      case 'shelf':
        return json(await catalogue.shelfClusters(r.slug, { multiStoreOnly: r.multi, limit: r.limit, offset: r.offset }));
    }
  } catch (err) {
    if (err instanceof CatalogueMissingError) return json({ error: 'not found' }, 404);
    if (err instanceof CatalogueStorageError) return json({ error: 'catalogue unavailable' }, 503, { 'retry-after': '30' });
    return json({ error: 'internal error' }, 500);
  }
};

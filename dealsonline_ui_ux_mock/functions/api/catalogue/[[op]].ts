/**
 * Cloudflare Pages Function — GET /api/catalogue/<op>
 *
 * The catalogue, one page at a time. The dataset lives in a PRIVATE R2 bucket
 * (binding `CATALOGUE`), so the browser never downloads the files behind it:
 * every response is at most 96 products (catalogueQueries.MAX_ROWS). This is
 * the "stop shipping the whole catalogue" step of the anti-scraping plan, and
 * the one URL to rate-limit in Cloudflare (Security → WAF → Rate limiting).
 *
 * Ops: manifest · detail?id · browse?slug&<filters>&page · deals?page&minSaving
 * · category?slug&limit · search?q&slug&<filters>&page · shelf-tree?slug
 * · shelf?slug&multi&limit&offset. Filters use the listing URL format
 * (sort, brand, min, max, multi), the same as the page's own URL.
 *
 * Without the bucket (a build with the dataset still public, or
 * `wrangler pages dev` before setup) it reads /demo/ from the site's own
 * assets instead, so the same function works locally.
 */
import * as catalogue from '../../../src/app/lib/catalogueQueries';
import { setLoader } from '../../../src/app/lib/demoSource';
import { readFilters } from '../../../src/app/lib/listing';

interface Env {
  CATALOGUE?: R2Bucket;
  ASSETS: Fetcher;
}

let configured: 'r2' | 'assets' | null = null;

function configure(env: Env, origin: string) {
  const mode = env.CATALOGUE ? 'r2' : 'assets';
  if (configured === mode) return;
  configured = mode;
  setLoader(async (path) => {
    if (env.CATALOGUE) {
      const obj = await env.CATALOGUE.get(path);
      if (!obj) throw new Error(`catalogue file missing: ${path}`);
      return obj.json();
    }
    const res = await env.ASSETS.fetch(new URL(`/demo/${path}`, origin));
    if (!res.ok) throw new Error(`catalogue file missing: ${path}`);
    return res.json();
  });
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // The dataset changes once per capture; a few minutes at the edge and in
      // the browser saves R2 reads without serving stale prices for long.
      'cache-control': 'public, max-age=300',
      'x-robots-tag': 'noindex',
    },
  });

const num = (v: string | null) => (v == null || v === '' || Number.isNaN(Number(v)) ? undefined : Number(v));

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const url = new URL(request.url);
  configure(env, url.origin);
  const q = url.searchParams;
  const op = Array.isArray(params.op) ? params.op[0] : params.op;
  const page = Math.max(0, num(q.get('page')) ?? 0);
  const slug = q.get('slug') ?? '';

  try {
    switch (op) {
      case 'manifest':
        return json(await catalogue.manifest());
      case 'detail':
        return json(await catalogue.detail(q.get('id') ?? ''));
      case 'browse':
        return json(await catalogue.browse(slug, readFilters(q), page));
      case 'deals':
        return json(await catalogue.deals({ page, minSaving: num(q.get('minSaving')), limit: num(q.get('limit')) }));
      case 'category':
        return json(await catalogue.categoryPage(slug, num(q.get('limit'))));
      case 'search':
        return json(
          await catalogue.search(q.get('q') ?? '', {
            slug: slug || undefined,
            filters: readFilters(q),
            page,
            limit: num(q.get('limit')),
          }),
        );
      case 'shelf-tree':
        return json(await catalogue.shelfTree(slug));
      case 'shelf':
        return json(
          await catalogue.shelfClusters(slug, {
            multiStoreOnly: q.get('multi') === '1',
            limit: num(q.get('limit')),
            offset: num(q.get('offset')),
          }),
        );
      default:
        return json({ error: 'unknown operation' }, 404);
    }
  } catch {
    // Unknown slug or id: the page shows its own "not found".
    return json({ error: 'not found' }, 404);
  }
};

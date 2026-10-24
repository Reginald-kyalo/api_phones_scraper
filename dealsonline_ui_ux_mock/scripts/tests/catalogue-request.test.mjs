// The public API contract (scraping review 2026-10-23, §3), run against the
// real Pages Function with a read-only local stand-in for R2.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { load, ROOT } from './harness.mjs';

const { onRequestGet, resetCatalogueState } = await load('functions/api/catalogue/[[op]].ts');
beforeEach(() => resetCatalogueState());
const { parseCatalogueRequest, MAX_LIMIT } = await load('functions/lib/catalogueRequest.ts');

const DEMO = join(ROOT, 'public', 'demo');
// The biggest captured shelf, whichever capture is unpacked: the engine's
// shelves (MVP) and the catalogue's spine shelves have different slugs.
const SHELF = JSON.parse(await readFile(join(DEMO, 'shelves', 'manifest.json'), 'utf8'))
  .shelves.reduce((a, b) => (b.total > a.total ? b : a)).slug;

/** An R2 bucket backed by public/demo, optionally under a version prefix. */
function fakeBucket({ prefix = '', current = null, failing = false } = {}) {
  const reads = [];
  return {
    reads,
    async get(key) {
      reads.push(key);
      if (failing) throw new Error('simulated R2 outage');
      if (key === 'current.json') return current ? { json: async () => current } : null;
      if (prefix && !key.startsWith(prefix)) return null;
      try {
        const text = await readFile(join(DEMO, key.slice(prefix.length)), 'utf8');
        return { json: async () => JSON.parse(text) };
      } catch {
        return null;
      }
    },
  };
}

const assetsNever = { fetch: () => { throw new Error('public asset fallback must not run'); } };

async function call(path, env, host = 'https://sokopulse.example') {
  const url = new URL(path, host);
  const params = { op: url.pathname.split('/').slice(3) };
  const res = await onRequestGet({ request: new Request(url), env, params });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body, headers: Object.fromEntries(res.headers) };
}

const rows = (b) => (b?.results?.length ?? 0) + (b?.plain?.length ?? 0);

test('list responses never exceed MAX_LIMIT rows across arrays', async () => {
  const env = { CATALOGUE: fakeBucket(), ASSETS: assetsNever };
  for (const path of [
    '/api/catalogue/category?slug=mobile-phones&limit=10000',
    '/api/catalogue/search?q=Samsung&slug=mobile-phones&limit=10000',
    '/api/catalogue/search?q=a&limit=10000',
    `/api/catalogue/shelf?slug=${SHELF}&limit=10000`,
  ]) {
    const r = await call(path, env);
    assert.equal(r.status, 200, path);
    assert.ok(rows(r.body) <= MAX_LIMIT, `${path}: ${rows(r.body)} rows`);
  }
});

test('malformed input is a 400 with no storage read', async () => {
  for (const path of [
    '/api/catalogue/category?slug=mobile-phones&limit=-2',
    '/api/catalogue/category?slug=mobile-phones&limit=Infinity',
    '/api/catalogue/category?slug=mobile-phones&limit=0',
    '/api/catalogue/browse?slug=mobile-phones&page=0.5',
    '/api/catalogue/browse?slug=mobile-phones&page=-1',
    '/api/catalogue/browse?slug=mobile-phones&page=1000001',
    '/api/catalogue/browse?slug=mobile-phones&sort=cheapest',
    '/api/catalogue/browse?slug=mobile-phones&min=500&max=100',
    '/api/catalogue/browse?slug=Mobile%20Phones',
    '/api/catalogue/browse?slug=' + 'a'.repeat(129),
    '/api/catalogue/search?q=' + 'a'.repeat(257),
    '/api/catalogue/search?q=x&slug=a&slug=b',
    '/api/catalogue/detail?id=' + 'a'.repeat(513),
    '/api/catalogue/detail?id=no-separator',
    '/api/catalogue/detail',
    '/api/catalogue/shelf?slug=smartphone-tablet-wearable&multi=yes',
  ]) {
    const bucket = fakeBucket();
    const r = await call(path, { CATALOGUE: bucket, ASSETS: assetsNever });
    assert.equal(r.status, 400, path);
    assert.equal(bucket.reads.length, 0, `${path} read storage`);
    assert.equal(r.headers['cache-control'], 'no-store');
  }
});

test('a 256-code-point query is accepted and a repeated identical parameter is not a conflict', async () => {
  const env = { CATALOGUE: fakeBucket(), ASSETS: assetsNever };
  assert.equal((await call('/api/catalogue/search?q=' + 'é'.repeat(256), env)).status, 200);
  assert.equal((await call('/api/catalogue/search?q=a&slug=tvs&slug=tvs', env)).status, 200);
});

test('unknown operations and extra path segments are 404', async () => {
  const env = { CATALOGUE: fakeBucket(), ASSETS: assetsNever };
  assert.equal((await call('/api/catalogue/manifest/extra', env)).status, 404);
  assert.equal((await call('/api/catalogue/does-not-exist', env)).status, 404);
  assert.equal((await call('/api/catalogue/', env)).status, 404);
});

test('an unknown product or category is 404; an unreachable store is 503', async () => {
  const env = { CATALOGUE: fakeBucket(), ASSETS: assetsNever };
  assert.equal((await call('/api/catalogue/detail?id=mobile-phones::nobody::nothing', env)).status, 404);
  assert.equal((await call('/api/catalogue/browse?slug=no-such-category', env)).status, 404);
  // A warm isolate keeps parsed files for a while, so an outage is only
  // visible on a read that misses that cache; a cold isolate reads first.
  resetCatalogueState();
  const down = await call('/api/catalogue/manifest', { CATALOGUE: fakeBucket({ failing: true }), ASSETS: assetsNever });
  assert.equal(down.status, 503);
  assert.equal(down.headers['cache-control'], 'no-store');
  assert.ok(down.headers['retry-after']);
});

test('without the bucket, only localhost falls back to public assets', async () => {
  const noBucket = { ASSETS: assetsNever };
  const prod = await call('/api/catalogue/manifest', noBucket, 'https://sokopulse.co.ke');
  assert.equal(prod.status, 503, 'production without R2 must fail closed');
  let served = 0;
  const local = {
    ASSETS: {
      fetch: async (url) => {
        served += 1;
        const rel = decodeURIComponent(new URL(url).pathname.replace(/^\/demo\//, ''));
        try {
          return new Response(await readFile(join(DEMO, rel), 'utf8'), { status: 200 });
        } catch {
          return new Response('', { status: 404 });
        }
      },
    },
  };
  const dev = await call('/api/catalogue/manifest', local, 'http://localhost:8788');
  assert.equal(dev.status, 200);
  assert.ok(served > 0);
});

test('public projections carry no storage layout or pipeline identifiers', async () => {
  const env = { CATALOGUE: fakeBucket(), ASSETS: assetsNever };
  const m = await call('/api/catalogue/manifest', env);
  assert.equal(m.status, 200);
  for (const field of ['source_collection', 'excluded_unpriced', 'freshness', 'page_size', 'min_stores']) {
    assert.ok(!(field in m.body), `manifest exposes ${field}`);
  }
  assert.ok(m.body.categories.every((c) => !('buckets' in c) && !('pages' in c)));
  assert.ok(m.body.total_clusters > 0 && m.body.categories.length > 0);
  assert.equal(m.headers['x-robots-tag'], 'noindex');
  const first = (await call('/api/catalogue/category?slug=mobile-phones&limit=1', env)).body.results[0];
  const d = await call('/api/catalogue/detail?id=' + encodeURIComponent(first.cluster_id), env);
  assert.equal(d.status, 200);
  for (const field of ['mvp_merged_from', 'mvp_rule', 'mvp_generated', 'category_path']) {
    assert.ok(!(field in d.body), `detail exposes ${field}`);
  }
  assert.ok(d.body.best_by_store, 'shopper evidence (per-shop offers) is kept');
});

test('files are read under the version named by current.json', async () => {
  const bucket = fakeBucket({ prefix: 'versions/2026-10-01-abcdef01/', current: { version: '2026-10-01-abcdef01' } });
  const r = await call('/api/catalogue/manifest', { CATALOGUE: bucket, ASSETS: assetsNever });
  assert.equal(r.status, 200);
  assert.ok(bucket.reads.includes('versions/2026-10-01-abcdef01/manifest.json'), bucket.reads.join(','));
});

test('parser clamps a large limit instead of rejecting it', () => {
  const r = parseCatalogueRequest(new URL('https://x/api/catalogue/category?slug=tvs&limit=5000'), ['category']);
  assert.ok(r.ok);
  assert.equal(r.request.limit, MAX_LIMIT);
});

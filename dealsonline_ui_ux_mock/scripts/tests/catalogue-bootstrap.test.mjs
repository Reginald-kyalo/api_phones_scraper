// The embedded initial-data contract between scripts/prerender.ts and
// lib/api.ts (scraping review 2026-10-23, §2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './harness.mjs';

const lib = await load('src/app/lib/initialCatalogueData.ts');
const { queryKey, serializeInitialData, initialDataScript, readInitialCatalogueData, INITIAL_SCHEMA_VERSION, INITIAL_DATA_ID } = lib;

const payload = (over = {}) => ({
  schemaVersion: INITIAL_SCHEMA_VERSION,
  catalogueVersion: '2026-10-01T00:00:00Z',
  pathname: '/prices/mobile-phones::x::y',
  queries: [{ key: queryKey('detail', { id: 'mobile-phones::x::y' }), response: { title: 'a</script><b>' } }],
  ...over,
});

const docWith = (text) => ({ getElementById: (id) => (id === INITIAL_DATA_ID ? { textContent: text } : null) });

test('keys ignore parameter order and empty values, and match the client URL rule', () => {
  assert.equal(queryKey('browse', { slug: 'tvs', page: 0 }), queryKey('browse', { page: 0, slug: 'tvs' }));
  assert.equal(queryKey('shelf', { slug: 'x', multi: undefined, limit: 48, offset: 0 }), 'shelf?limit=48&offset=0&slug=x');
  assert.equal(queryKey('manifest', {}), 'manifest');
  assert.notEqual(queryKey('deals', { minSaving: 0 }), queryKey('deals', {}));
});

test('serialised JSON cannot close its script element', () => {
  const html = initialDataScript(payload());
  assert.ok(!html.slice(html.indexOf('>') + 1, html.lastIndexOf('</script>')).includes('</script>'));
  assert.ok(!serializeInitialData(payload()).includes('<'));
  assert.deepEqual(JSON.parse(serializeInitialData(payload({ queries: [{ key: 'k', response: 'a b' }] }))).queries[0].response, 'a b');
});

test('the payload is read only for its own pathname and only when well formed', () => {
  const good = serializeInitialData(payload());
  assert.ok(readInitialCatalogueData(docWith(good), '/prices/mobile-phones%3A%3Ax%3A%3Ay'));
  assert.equal(readInitialCatalogueData(docWith(good), '/prices/other'), null);
  assert.equal(readInitialCatalogueData(docWith('not json'), '/prices/mobile-phones::x::y'), null);
  assert.equal(readInitialCatalogueData(docWith(serializeInitialData(payload({ schemaVersion: 2 }))), '/prices/mobile-phones::x::y'), null);
  assert.equal(readInitialCatalogueData(docWith(serializeInitialData(payload({ queries: [{ nokey: 1 }] }))), '/prices/mobile-phones::x::y'), null);
  assert.equal(readInitialCatalogueData({ getElementById: () => null }, '/'), null);
});

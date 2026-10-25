// Which listings were left out of the like-for-like comparison, and why. A
// reason is counted only when a data field on the offer supports it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './harness.mjs';

const { excludedFromConfig, describeExclusions } = await load('src/app/lib/excludedOffers.ts');

const o = (store, price, url, extra = {}) => ({ price, url, title: `t ${url}`, ...extra });
const cfg = (facet_value, by_store, label = `${facet_value}GB`) => ({
  facet_label: label, facet_value, storage_gb: typeof facet_value === 'number' ? facet_value : null, by_store,
});

// Two configurations; selected = 128. Store c only sells 256, d is used in 128.
function fixture() {
  const a128 = o('a', 100, 'a128', { facet_value: '128' });
  const b128 = o('b', 110, 'b128', { facet_value: '128' });
  const a256 = o('a', 150, 'a256', { facet_value: '256' });
  const c256 = o('c', 160, 'c256', { facet_value: '256' });
  const config128 = cfg(128, { a: a128, b: b128 });
  const config256 = cfg(256, { a: a256, c: c256 });
  const cluster = { best_by_store: { a: a128, b: b128, c: c256 }, configs: [config128, config256] };
  return { cluster, config128, config256, a128, b128, a256, c256 };
}

test('everything in the selected map: total 0', () => {
  const { a128, b128 } = fixture();
  const config = cfg(128, { a: a128, b: b128 });
  assert.deepEqual(excludedFromConfig({ best_by_store: { a: a128, b: b128 }, configs: [config] }, config), {
    total: 0, reasons: [],
  });
});

test("the other configuration's offers count as other_configuration (offers, not stores)", () => {
  const { cluster, config128 } = fixture();
  // a256 (store a) and c256 (store c): two offers, a is a store that is also in the map.
  assert.deepEqual(excludedFromConfig(cluster, config128), {
    total: 2, reasons: [{ kind: 'other_configuration', count: 2 }],
  });
});

test('a used offer of the same configuration counts as used', () => {
  const { cluster, config128 } = fixture();
  const d = o('d', 70, 'd128', { facet_value: '128', condition: 'used' });
  cluster.best_by_store.d = d;
  const r = excludedFromConfig(cluster, config128);
  assert.deepEqual(r.reasons, [{ kind: 'other_configuration', count: 2 }, { kind: 'used', count: 1 }]);
  assert.equal(r.total, 3);
});

test('refurbished and likely_used === true count as used; likely_used false does not', () => {
  const { cluster, config128 } = fixture();
  cluster.best_by_store.d = o('d', 70, 'd1', { facet_value: '128', condition: 'refurbished' });
  cluster.best_by_store.e = o('e', 71, 'e1', { facet_value: '128', likely_used: true });
  cluster.best_by_store.f = o('f', 72, 'f1', { facet_value: '128', likely_used: false });
  const used = excludedFromConfig(cluster, config128).reasons.find((x) => x.kind === 'used');
  assert.equal(used.count, 2);
});

test('offers with no finite positive price count as unpriced', () => {
  const { cluster, config128 } = fixture();
  cluster.best_by_store.d = o('d', null, 'd1', { facet_value: '128' });
  cluster.best_by_store.e = o('e', 0, 'e1', { facet_value: '128' });
  cluster.best_by_store.f = o('f', NaN, 'f1', { facet_value: '128' });
  const r = excludedFromConfig(cluster, config128);
  assert.deepEqual(r.reasons.find((x) => x.kind === 'unpriced'), { kind: 'unpriced', count: 3 });
});

test('out of stock: stock_status says so, or delisted === true', () => {
  const { cluster, config128 } = fixture();
  cluster.best_by_store.d = o('d', 90, 'd1', { facet_value: '128', stock_status: 'out_of_stock' });
  cluster.best_by_store.e = o('e', 91, 'e1', { facet_value: '128', delisted: true });
  cluster.best_by_store.f = o('f', 92, 'f1', { facet_value: '128', stock_status: 'in_stock', delisted: false });
  const r = excludedFromConfig(cluster, config128);
  assert.deepEqual(r.reasons.find((x) => x.kind === 'out_of_stock'), { kind: 'out_of_stock', count: 2 });
  assert.equal(r.total, 4, 'f has no supported reason and is not counted');
});

test('two reasons: counted once, under the first in order', () => {
  const { cluster, config128 } = fixture();
  // used + unpriced + out of stock -> used
  cluster.best_by_store.d = o('d', null, 'd1', { facet_value: '128', condition: 'used', delisted: true });
  // unpriced + out of stock -> unpriced
  cluster.best_by_store.e = o('e', null, 'e1', { facet_value: '128', stock_status: 'out of stock' });
  // other configuration + used -> other_configuration
  const cu = o('c', 80, 'c256-used', { facet_value: '256', condition: 'used' });
  cluster.configs[1].by_store.cu = cu; // used AND in the other configuration
  const r = excludedFromConfig(cluster, config128);
  assert.deepEqual(r.reasons, [
    { kind: 'other_configuration', count: 3 },
    { kind: 'used', count: 1 },
    { kind: 'unpriced', count: 1 },
  ]);
  assert.equal(r.total, 5);
});

test('an offer is not double counted when it is in the cluster map and another config map', () => {
  const { cluster, config128 } = fixture();
  assert.equal(excludedFromConfig(cluster, config128).total, 2); // c256 appears in both
});

test('a cluster-level offer of unknown configuration gets no invented reason', () => {
  const { cluster, config128 } = fixture();
  cluster.best_by_store.z = o('z', 99, 'z1'); // no facet_value, in no config map
  assert.equal(excludedFromConfig(cluster, config128).total, 2);
});

test('missing maps are tolerated', () => {
  assert.deepEqual(excludedFromConfig({}, { by_store: undefined }), { total: 0, reasons: [] });
});

test('words: counts and agreement, storage vs other facet', () => {
  const s = { total: 3, reasons: [{ kind: 'other_configuration', count: 2 }, { kind: 'used', count: 1 }] };
  assert.deepEqual(describeExclusions(s, cfg(128, {})), {
    heading: '3 other listings were left out of this comparison',
    detail: '2 are a different storage size, 1 is a used item',
  });
  assert.equal(describeExclusions({ total: 1, reasons: [{ kind: 'unpriced', count: 1 }] }, cfg(128, {})).heading,
    '1 other listing was left out of this comparison');
  assert.equal(
    describeExclusions({ total: 1, reasons: [{ kind: 'other_configuration', count: 1 }] },
      { facet_label: 'Intel Core i5', facet_value: 'i5', storage_gb: null, by_store: {} }).detail,
    '1 is a different version');
  assert.equal(
    describeExclusions({ total: 3, reasons: [{ kind: 'unpriced', count: 2 }, { kind: 'out_of_stock', count: 1 }] },
      cfg(128, {})).detail,
    '2 have no price listed, 1 is out of stock');
});

test('membership in another config map is enough, even when facet values are missing', () => {
  const { cluster, config128 } = fixture();
  const x = o('x', 120, 'x1'); // no facet_value on the offer
  cluster.configs.push({ facet_label: null, facet_value: null, storage_gb: null, by_store: { x } });
  cluster.configs.push({ facet_label: null, facet_value: '', storage_gb: null, by_store: { y: o('y', null, 'y1', { condition: 'used' }) } });
  assert.deepEqual(excludedFromConfig(cluster, config128).reasons, [{ kind: 'other_configuration', count: 4 }]);
  // and a selected config with an empty facet still sees other maps' offers
  const blank = { facet_label: null, facet_value: null, storage_gb: null, by_store: { a: cluster.configs[0].by_store.a } };
  assert.equal(excludedFromConfig(cluster, blank).reasons.find((r) => r.kind === 'other_configuration').count >= 3, true);
});

// "Why is this one cheaper?" — a line appears only when a data field on the
// offer supports it; price alone never produces a reason.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './harness.mjs';

const { explainOffer } = await load('src/app/lib/offerExplanation.ts');

const NOW = Date.parse('2026-10-25T12:00:00Z');
const o = (price, extra = {}) => ({ price, url: 'https://x.test', title: 't', ...extra });
const cluster = { last_seen: '2026-10-24T00:00:00Z' };
const config = (by_store, facet_value = 128) => ({ facet_label: '128 GB', facet_value, storage_gb: 128, by_store });
const run = (offer, others, facet = 128) => {
  const by_store = { a: offer, ...others };
  return explainOffer(offer, config(by_store, facet), cluster, NOW);
};
const others = { b: o(100_000), c: o(100_000) };

test('used offer, 20% under the median: condition line from the field', () => {
  assert.deepEqual(run(o(80_000, { condition: 'used' }), others), [
    { kind: 'condition', text: 'This listing is used.' },
  ]);
});

test('refurbished offer: condition line says refurbished', () => {
  assert.deepEqual(run(o(80_000, { condition: 'refurbished' }), others), [
    { kind: 'condition', text: 'This listing is refurbished.' },
  ]);
});

test('new condition is not a reason', () => {
  assert.deepEqual(run(o(80_000, { condition: 'new' }), others), [
    { kind: 'unknown', text: "We can't tell why this price is lower. Check the listing before you buy." },
  ]);
});

test('offer for another facet value names that value; compared as strings', () => {
  assert.deepEqual(run(o(80_000, { facet_value: 64 }), others), [
    { kind: 'configuration', text: 'This price is for the 64 GB version.' },
  ]);
  // "128" (string) vs 128 (int) is the same configuration
  assert.equal(run(o(80_000, { facet_value: '128' }), others).some((l) => l.kind === 'configuration'), false);
});

test('cpu facet values are named as given', () => {
  const r = run(o(80_000, { facet_value: 'Intel Core i3' }), others, 'Intel Core i5');
  assert.deepEqual(r, [{ kind: 'configuration', text: 'This price is for the Intel Core i3 version.' }]);
});

test('old observation: stale line with the date', () => {
  const r = run(o(80_000, { observed_at: '2026-08-01T10:00:00Z' }), others);
  assert.deepEqual(r, [{ kind: 'stale', text: 'This price was last seen on 1 Aug 2026.' }]);
});

test('recent observation is not stale', () => {
  const r = run(o(80_000, { observed_at: '2026-10-20T10:00:00Z' }), others);
  assert.deepEqual(r.map((l) => l.kind), ['unknown']);
});

test('several supported reasons all appear, in a fixed order', () => {
  const r = run(o(80_000, { condition: 'used', facet_value: 64, observed_at: '2026-08-01T10:00:00Z' }), others);
  assert.deepEqual(r.map((l) => l.kind), ['condition', 'configuration', 'stale']);
});

test('nothing supports it: exactly one unknown line', () => {
  const r = run(o(80_000), others);
  assert.deepEqual(r.map((l) => l.kind), ['unknown']);
});

test('not cheap enough (14% under median): empty', () => {
  assert.deepEqual(run(o(86_000, { condition: 'used' }), others), []);
});

test('exactly 15% under the median counts', () => {
  assert.equal(run(o(85_000, { condition: 'used' }), others).length, 1);
});

test('single priced offer: empty', () => {
  assert.deepEqual(explainOffer(o(50_000, { condition: 'used' }), config({ a: o(50_000) }), cluster, NOW), []);
});

test('unpriced offers do not count toward the median or the minimum', () => {
  const by = { a: o(80_000, { condition: 'used' }), b: o(null), c: o(0) };
  assert.deepEqual(explainOffer(by.a, config(by), cluster, NOW), []);
});

test('median is of this configuration only, not best_by_store', () => {
  const c = { ...cluster, best_by_store: { z: o(500_000) } };
  assert.deepEqual(explainOffer(o(99_000, { condition: 'used' }), config({ a: o(99_000), b: o(100_000) }), c, NOW), []);
});

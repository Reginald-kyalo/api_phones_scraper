// The coverage line states what the comparison rests on, from the offers it
// was given, and never more than that.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './harness.mjs';

const { coverageLine } = await load('src/app/lib/coverageLine.ts');

const NOW = Date.parse('2026-10-25T12:00:00Z');
const DAY = 86_400_000;
const ago = (d) => new Date(NOW - d * DAY).toISOString();
const offer = (price, observed_at) => ({ price, observed_at, url: `u${price}${observed_at}` });

test('no offers: no text', () => {
  assert.deepEqual(coverageLine([], NOW, 30), { text: '', recent: 0, older: 0 });
  assert.equal(coverageLine(null, NOW, 30).text, '');
});

test('unpriced offers are not counted', () => {
  const r = coverageLine([offer(0, ago(1)), offer(NaN, ago(1)), offer(-5, ago(1)), offer(null, ago(1))], NOW, 30);
  assert.deepEqual(r, { text: '', recent: 0, older: 0 });
});

test('one fresh offer: singular, one sentence', () => {
  assert.deepEqual(coverageLine([offer(100, ago(2))], NOW, 30), {
    text: '1 matching offer from the shops we track', recent: 1, older: 0,
  });
});

test('all fresh: one sentence', () => {
  const r = coverageLine([offer(100, ago(1)), offer(110, ago(5)), offer(120, ago(30))], NOW, 30);
  assert.equal(r.text, '3 matching offers from the shops we track');
  assert.equal(r.recent, 3);
  assert.equal(r.older, 0);
});

test('mixed: both sentences with the right counts', () => {
  const r = coverageLine([offer(100, ago(1)), offer(110, ago(5)), offer(120, ago(31))], NOW, 30);
  assert.equal(
    r.text,
    '3 matching offers from the shops we track. 2 were checked in the last 30 days; 1 has an older observation.',
  );
  assert.equal(r.recent, 2);
  assert.equal(r.older, 1);
});

test('older observations are plural when more than one', () => {
  const r = coverageLine([offer(100, ago(1)), offer(110, ago(60)), offer(120, ago(90))], NOW, 30);
  assert.match(r.text, /1 was checked in the last 30 days; 2 have older observations\.$/);
});

test('no observed_at counts as older, never as recent', () => {
  const r = coverageLine([offer(100, ago(1)), offer(110, undefined), offer(120, 'not a date')], NOW, 30);
  assert.equal(r.recent, 1);
  assert.equal(r.older, 2);
});

test('none recent', () => {
  const r = coverageLine([offer(100, ago(80))], NOW, 30);
  assert.equal(r.text, '1 matching offer from the shops we track. None were checked in the last 30 days; 1 has an older observation.');
});

test('the threshold is the one passed in', () => {
  const r = coverageLine([offer(100, ago(10)), offer(110, ago(3))], NOW, 7);
  assert.equal(r.recent, 1);
  assert.match(r.text, /in the last 7 days/);
});

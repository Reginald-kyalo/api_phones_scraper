// The browser acknowledgement: only a valid receipt for the request's own key
// counts as "saved". Uses real Response objects and a fake fetcher; no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './harness.mjs';

const { submitReport, ReportError } = await load('src/app/lib/reportClient.ts');

const KEY = '3f2b8c1e-5a7d-4e9b-8c3a-1d2e3f4a5b6c';
const OTHER = '9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d';
const body = { scope: 'cluster', cluster_id: 'c1', note: 'n', version: '256GB', facets: [] };
const receipt = (key = KEY) => ({ ok: true, report_id: 'r-1', submission_key: key, reference: '7c9e6679-7425-40de-944b-e07fc1f90ae7' });
const json = (obj, status = 200, headers = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...headers } });
const fake = (res) => {
  const calls = [];
  const f = async (url, init) => {
    calls.push({ url, init });
    if (typeof res === 'function') return res(calls.length);
    return res;
  };
  f.calls = calls;
  return f;
};
const failsWith = async (fetcher, kind) => {
  await assert.rejects(submitReport(body, KEY, fetcher), (e) => {
    assert.ok(e instanceof ReportError, `ReportError expected, got ${e}`);
    assert.equal(e.kind, kind);
    return true;
  });
};

test('valid 201 receipt is accepted and the request carries the key and body', async () => {
  const f = fake(json(receipt(), 201));
  const r = await submitReport(body, KEY, f);
  assert.deepEqual(r, receipt());
  const { init } = f.calls[0];
  assert.equal(init.method, 'POST');
  assert.equal(init.headers['idempotency-key'], KEY);
  assert.deepEqual(JSON.parse(init.body), body);
});

test('valid replay 200 receipt is accepted', async () => {
  assert.deepEqual(await submitReport(body, KEY, fake(json(receipt(), 200))), receipt());
});

test('key comparison ignores case', async () => {
  const r = await submitReport(body, KEY, fake(json(receipt(KEY.toUpperCase()), 200)));
  assert.equal(r.report_id, 'r-1');
});

test('false successes are rejected', async (t) => {
  await t.test('JSON {ok:false}', () => failsWith(fake(json({ ok: false }, 200)), 'bad-receipt'));
  await t.test('unrelated JSON', () => failsWith(fake(json({ hello: 'world' }, 200)), 'bad-receipt'));
  await t.test('JSON array', () => failsWith(fake(json([receipt()], 200)), 'bad-receipt'));
  await t.test('HTML 200 (SPA shell)', () =>
    failsWith(fake(new Response('<!doctype html><html></html>', { status: 200, headers: { 'content-type': 'text/html' } })), 'bad-receipt'));
  await t.test('HTML mislabelled as JSON', () =>
    failsWith(fake(new Response('<html>', { status: 200, headers: { 'content-type': 'application/json' } })), 'bad-receipt'));
  await t.test('malformed JSON', () =>
    failsWith(fake(new Response('{"ok":tru', { status: 201, headers: { 'content-type': 'application/json' } })), 'bad-receipt'));
  await t.test('receipt for another key', () => failsWith(fake(json(receipt(OTHER), 201)), 'bad-receipt'));
  await t.test('receipt without report_id', () =>
    failsWith(fake(json({ ok: true, submission_key: KEY }, 201)), 'bad-receipt'));
  await t.test('receipt without reference', () =>
    failsWith(fake(json({ ok: true, report_id: 'r-1', submission_key: KEY }, 201)), 'bad-receipt'));
  await t.test('valid-looking receipt on a non-2xx status', () => failsWith(fake(json(receipt(), 500)), 'unavailable'));
});

test('false successes leave the outcome uncertain (the server may have committed)', async () => {
  await assert.rejects(submitReport(body, KEY, fake(json({ ok: false }, 200))), (e) => e.uncertain === true);
});

test('400 and 413 are definite rejections, not retryable', async () => {
  for (const status of [400, 413, 415]) {
    await assert.rejects(submitReport(body, KEY, fake(json({ ok: false, error: 'x' }, status))), (e) => {
      assert.equal(e.kind, 'invalid');
      assert.equal(e.status, status);
      assert.equal(e.uncertain, false);
      return true;
    });
  }
});

test('409 is a conflict and not retryable with the same key', async () => {
  await assert.rejects(submitReport(body, KEY, fake(json({ ok: false }, 409))), (e) => {
    assert.equal(e.kind, 'conflict');
    assert.equal(e.uncertain, false);
    return true;
  });
});

test('429 and 503 are retryable and honour Retry-After seconds', async () => {
  for (const status of [429, 503]) {
    await assert.rejects(submitReport(body, KEY, fake(json({ ok: false }, status, { 'retry-after': '7' }))), (e) => {
      assert.equal(e.kind, status === 429 ? 'rate-limited' : 'unavailable');
      assert.equal(e.retryAfterMs, 7000);
      assert.equal(e.uncertain, false);
      return true;
    });
  }
});

test('Retry-After is clamped and ignored when unusable', async () => {
  const wait = async (h) => {
    try { await submitReport(body, KEY, fake(json({}, 503, h))); } catch (e) { return e.retryAfterMs; }
  };
  assert.equal(await wait({}), null);
  assert.equal(await wait({ 'retry-after': 'soon' }), null);
  assert.equal(await wait({ 'retry-after': '-4' }), null);
  assert.equal(await wait({ 'retry-after': '99999' }), 120000);
});

test('network loss after commit is uncertain; the retry reuses the key and gets the replay', async () => {
  let committed = 0;
  const f = fake((n) => {
    if (n === 1) { committed++; throw new TypeError('network lost'); }
    return json(receipt(), 200);
  });
  await assert.rejects(submitReport(body, KEY, f), (e) => {
    assert.equal(e.kind, 'network');
    assert.equal(e.uncertain, true);
    return true;
  });
  const r = await submitReport(body, KEY, f);
  assert.equal(r.report_id, 'r-1');
  assert.equal(committed, 1);
  assert.equal(f.calls[0].init.headers['idempotency-key'], f.calls[1].init.headers['idempotency-key']);
  assert.equal(f.calls[0].init.body, f.calls[1].init.body);
});

test('a hung request times out as an uncertain network failure', async () => {
  const hang = (url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))));
  await assert.rejects(submitReport(body, KEY, hang, { timeoutMs: 20 }), (e) => {
    assert.equal(e.kind, 'network');
    assert.equal(e.uncertain, true);
    return true;
  });
});

test('a malformed submission key is refused before any request', async () => {
  const f = fake(json(receipt(), 201));
  await assert.rejects(submitReport(body, 'not-a-uuid', f), ReportError);
  assert.equal(f.calls.length, 0);
});

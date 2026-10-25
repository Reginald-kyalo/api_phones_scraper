// The /api/reports contract: bounded reader, parser, receipt guard, and the
// real Pages Function with a fake D1 and an intercepted fetch (no real writes).
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './harness.mjs';

const handler = await load('functions/api/reports.ts');
const { parseReportBody, readReportRequest, MAX_BODY_BYTES } = await load('functions/lib/reportRequest.ts');
const { isReportReceipt } = await load('src/app/lib/reportContract.ts');

const KEY = '3f2b8c1e-5a7d-4e9b-8c3a-1d2e3f4a5b6c';
const good = () => ({ scope: 'cluster', cluster_id: 'c1', note: 'wrong variant', facets: [] });

// A stand-in D1 that counts every storage touch. It answers like a store that
// accepted the write: the winner row echoes whatever payload hash was bound.
function fakeDb() {
  let hash = null;
  const db = {
    calls: 0,
    prepare(sql) {
      db.calls++;
      return {
        bind: (...args) => {
          if (/INSERT INTO reports/.test(sql)) hash = args.find((a) => typeof a === 'string' && /^[0-9a-f]{64}$/.test(a)) ?? hash;
          return { first: async () => ({ id: 1, payload_hash: hash, facet_count: db.facets }), sql, args };
        },
      };
    },
    facets: 0,
    batch: async (stmts) => { db.calls++; db.facets = stmts.length - 1; return stmts.map(() => ({ meta: { changes: 1 } })); },
  };
  return db;
}
const realFetch = globalThis.fetch;
let fetches = 0;
globalThis.fetch = async () => { fetches++; throw new Error('network must not be used in tests'); };
afterEach(() => { fetches = 0; });
process.on('exit', () => { globalThis.fetch = realFetch; });

const req = (body, headers = {}, method = 'POST') =>
  new Request('https://x.example/api/reports', {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' || body instanceof Uint8Array || body instanceof ReadableStream ? body : JSON.stringify(body),
    ...(body instanceof ReadableStream ? { duplex: 'half' } : {}),
  });

async function post(body, { headers, env } = {}) {
  const db = fakeDb();
  const res = await handler.onRequest({
    request: req(body, headers),
    env: { DB: db, ...env },
    waitUntil() {},
  });
  return { res, db, json: await res.json().catch(() => null) };
}

// --- the three uncaught TypeErrors from report-checks.json ---------------
test('null JSON body is a controlled 400, not a TypeError', async () => {
  const { res, db } = await post('null');
  assert.equal(res.status, 400);
  assert.equal(db.calls, 0);
});
test('numeric scope is a controlled 400', async () => {
  const { res, db } = await post({ ...good(), scope: 7 });
  assert.equal(res.status, 400);
  assert.equal(db.calls, 0);
});
test('numeric facet kind is a controlled 400', async () => {
  const { res, db } = await post({ ...good(), facets: [{ kind: 5 }] });
  assert.equal(res.status, 400);
  assert.equal(db.calls, 0);
});

// --- other rejections never reach storage --------------------------------
for (const [name, body] of [
  ['array body', '[]'],
  ['malformed JSON', '{nope'],
  ['numeric cluster_id', { ...good(), cluster_id: 12 }],
  ['numeric note', { ...good(), note: 5 }],
  ['numeric version', { ...good(), version: 256 }],
  ['numeric facet value', { ...good(), facets: [{ kind: 'price', value: 100 }] }],
  ['facets not an array', { ...good(), facets: {} }],
  ['facet is an array', { ...good(), facets: [[]] }],
  ['unknown scope', { ...good(), scope: 'galaxy' }],
  ['unknown facet kind', { ...good(), facets: [{ kind: 'bogus' }] }],
  ['empty report', { scope: 'cluster', cluster_id: 'c1' }],
  ['missing cluster_id', { scope: 'cluster', note: 'x' }],
  ['61 facets', { ...good(), facets: Array.from({ length: 61 }, () => ({ kind: 'other' })) }],
  ['javascript: page_url', { ...good(), page_url: 'javascript:alert(1)' }],
  ['relative page_url', { ...good(), page_url: '/p/1' }],
  ['credentialed page_url', { ...good(), page_url: 'https://u:p@x.example/' }],
]) {
  test(`rejects ${name} with 400 and no storage call`, async () => {
    const { res, db } = await post(body);
    assert.equal(res.status, 400);
    assert.equal(db.calls, 0);
    assert.equal(fetches, 0);
  });
}

test('60 facets pass; site scope needs no cluster_id', () => {
  const facets = Array.from({ length: 60 }, () => ({ kind: 'other' }));
  assert.equal(parseReportBody({ ...good(), facets }).ok, true);
  assert.equal(parseReportBody({ scope: 'site', note: 'slow' }).ok, true);
});

test('field bounds count code points, trim, and reject rather than truncate', () => {
  const ok = (o) => parseReportBody({ ...good(), ...o }).ok;
  assert.equal(ok({ note: '😀'.repeat(1000) }), true);
  assert.equal(ok({ note: '😀'.repeat(1001) }), false);
  assert.equal(ok({ note: ` ${'a'.repeat(1000)} ` }), true);
  assert.equal(ok({ title: 'a'.repeat(501) }), false);
  assert.equal(ok({ cluster_id: 'a'.repeat(513) }), false);
  assert.equal(ok({ category: 'a'.repeat(129) }), false);
  assert.equal(ok({ version: 'a'.repeat(257) }), false);
  assert.equal(ok({ captured_at: 'a'.repeat(41) }), false);
  assert.equal(ok({ page_url: `https://x.example/${'a'.repeat(2031)}` }), false);
  assert.equal(ok({ facets: [{ kind: 'other', subject: 'a'.repeat(513) }] }), false);
  assert.equal(ok({ facets: [{ kind: 'other', value: 'a'.repeat(201) }] }), false);
  assert.equal(ok({ facets: [{ kind: 'other', value: 'a'.repeat(200), subject: 'a'.repeat(512) }] }), true);
});

test('version maps to selected_version, unknown fields are dropped, nulls allowed', () => {
  const r = parseReportBody({ ...good(), version: ' 256GB ', title: null, extra: 'x', country: 'ZZ', page_url: 'https://x.example/p' });
  assert.equal(r.ok, true);
  assert.equal(r.report.selected_version, '256GB');
  assert.equal(r.report.title, null);
  assert.equal('extra' in r.report, false);
  assert.equal('country' in r.report, false);
});

// --- byte boundary --------------------------------------------------------
// A body of exactly N bytes: a JSON object padded by a note... use a single
// string field whose length makes the whole body hit the target size.
function bodyOfBytes(n, ch) {
  const enc = new TextEncoder();
  const frame = (pad) => `{"scope":"site","note":"x","junk":"${pad}"}`;
  const base = enc.encode(frame('')).length;
  const unit = enc.encode(ch).length;
  const count = Math.floor((n - base) / unit);
  // Whole multibyte characters, then ASCII filler for the exact byte count.
  const s = frame(ch.repeat(count) + 'a'.repeat(n - base - count * unit));
  assert.equal(enc.encode(s).length, n);
  return s;
}
for (const [label, ch] of [['ASCII', 'a'], ['multibyte', 'é'], ['4-byte', '😀']]) {
  test(`${label}: 65,536 bytes parse, 65,537+ is 413`, async () => {
    const atLimit = bodyOfBytes(MAX_BODY_BYTES, ch);
    assert.equal((await readReportRequest(req(atLimit))).ok, true);
    const over = bodyOfBytes(MAX_BODY_BYTES + 1, ch);
    const r = await readReportRequest(req(over));
    assert.equal(r.ok, false);
    assert.equal(r.status, 413);
  });
}
test('multibyte string under 64K characters but over 64K bytes is 413', async () => {
  const note = 'é'.repeat(40000); // 40,000 chars = 80,000 bytes
  const r = await readReportRequest(req(JSON.stringify({ scope: 'site', note: 'x', junk: note })));
  assert.equal(r.status, 413);
});
test('forged small Content-Length cannot smuggle an oversize stream', async () => {
  const big = bodyOfBytes(MAX_BODY_BYTES + 10, 'a');
  const r = await readReportRequest(req(big, { 'content-length': '10' }));
  assert.equal(r.status, 413);
});
test('missing Content-Length on a chunked stream is still counted', async () => {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    start(c) {
      for (let i = 0; i < 70; i++) c.enqueue(enc.encode('a'.repeat(1024)));
      c.close();
    },
  });
  const r = await readReportRequest(req(stream));
  assert.equal(r.status, 413);
});
test('declared oversize Content-Length is refused', async () => {
  const r = await readReportRequest(req('{}', { 'content-length': '999999' }));
  assert.equal(r.status, 413);
});

// --- media type and idempotency key ---------------------------------------
test('non-JSON media types are 415; json with charset is accepted', async () => {
  for (const type of ['text/plain', 'application/x-www-form-urlencoded', 'application/jsonx']) {
    const r = await readReportRequest(req(JSON.stringify(good()), { 'content-type': type }));
    assert.equal(r.status, 415, type);
  }
  const noType = new Request('https://x.example/', { method: 'POST', body: '{}' });
  noType.headers.delete('content-type');
  assert.equal((await readReportRequest(noType)).status, 415);
  const ok = await readReportRequest(req(JSON.stringify(good()), { 'content-type': 'Application/JSON; charset=utf-8' }));
  assert.equal(ok.ok, true);
});

test('Idempotency-Key: valid is kept, invalid is 400, missing is made or 400 when required', async () => {
  const k = await readReportRequest(req(good(), { 'idempotency-key': KEY.toUpperCase() }));
  assert.equal(k.ok, true);
  assert.equal(k.submissionKey, KEY);
  for (const bad of ['not-a-uuid', '3f2b8c1e5a7d4e9b8c3a1d2e3f4a5b6c', `${KEY}x`]) {
    const r = await readReportRequest(req(good(), { 'idempotency-key': bad }));
    assert.equal(r.status, 400, bad);
  }
  const made = await readReportRequest(req(good()));
  assert.equal(made.ok, true);
  assert.match(made.submissionKey, /^[0-9a-f-]{36}$/);
  const required = await readReportRequest(req(good()), { requireKey: true });
  assert.equal(required.status, 400);
  assert.match(required.error, /[Rr]eload/);
});

test('REPORT_REQUIRE_KEY=1 makes the handler refuse keyless requests before storage', async () => {
  const keyless = await post(good(), { env: { REPORT_REQUIRE_KEY: '1' } });
  assert.equal(keyless.res.status, 400);
  assert.equal(keyless.db.calls, 0);
  const keyed = await post(good(), { env: { REPORT_REQUIRE_KEY: '1' }, headers: { 'idempotency-key': KEY } });
  assert.equal(keyed.res.status, 201);
});

// --- handler end to end ----------------------------------------------------
test('valid report still stores (201) with JSON and no-store; 415 and 413 have no storage call', async () => {
  const ok = await post(good());
  assert.equal(ok.res.status, 201);
  assert.equal(ok.res.headers.get('cache-control'), 'no-store');
  assert.match(ok.res.headers.get('content-type'), /json/);
  assert.ok(ok.db.calls >= 1);

  const wrongType = await post(JSON.stringify(good()), { headers: { 'content-type': 'text/plain' } });
  assert.equal(wrongType.res.status, 415);
  assert.equal(wrongType.db.calls, 0);
  const big = await post(bodyOfBytes(MAX_BODY_BYTES + 1, 'a'));
  assert.equal(big.res.status, 413);
  assert.equal(big.db.calls, 0);
  assert.equal(big.res.headers.get('cache-control'), 'no-store');
});

test('unsupported methods are 405 with Allow: POST and no-store', async () => {
  for (const method of ['GET', 'PUT', 'DELETE']) {
    const res = await handler.onRequest({
      request: new Request('https://x.example/api/reports', { method }),
      env: { DB: fakeDb() },
      waitUntil() {},
    });
    assert.equal(res.status, 405);
    assert.equal(res.headers.get('allow'), 'POST');
    assert.equal(res.headers.get('cache-control'), 'no-store');
  }
});

// --- receipt guard -----------------------------------------------------------
test('isReportReceipt requires ok, nonempty id and a valid UUID (optionally matching)', () => {
  const r = { ok: true, report_id: 'r1', submission_key: KEY };
  assert.equal(isReportReceipt(r), true);
  assert.equal(isReportReceipt(r, KEY), true);
  assert.equal(isReportReceipt(r, '00000000-0000-4000-8000-000000000000'), false);
  for (const bad of [null, [], 'x', { ...r, ok: false }, { ...r, ok: 'true' }, { ...r, report_id: '' }, { ...r, report_id: 7 },
    { ...r, submission_key: 'nope' }, { ok: true, report_id: 'r1' }]) {
    assert.equal(isReportReceipt(bad), false, JSON.stringify(bad));
  }
});

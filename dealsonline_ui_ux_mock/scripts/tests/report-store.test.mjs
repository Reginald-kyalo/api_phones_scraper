// Report persistence against a REAL local D1 (miniflare's workerd-backed D1, the
// same engine `wrangler dev --local` uses): atomic parent+facets, idempotent
// retries, key/payload conflicts, concurrent callers. Nothing here touches a
// remote database, a webhook or the network.
import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { load, ROOT } from './harness.mjs';

const { Miniflare } = createRequire(join(ROOT, 'package.json'))('miniflare');
const store = await load('functions/lib/reportStore.ts');
const handler = await load('functions/api/reports.ts');
const { saveReport, canonicalReportBody, ReportConflictError } = store;

const K1 = '3f2b8c1e-5a7d-4e9b-8c3a-1d2e3f4a5b6c';
const K2 = '9a1c7d20-1b3e-4c55-9d0f-0a1b2c3d4e5f';
const migration = (name) => readFileSync(join(ROOT, 'migrations', name), 'utf8');

/** D1 exec() runs one statement per line, so split on ';' ourselves. */
async function applySql(db, sql) {
  const stripped = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
  for (const stmt of stripped.split(';').map((s) => s.trim()).filter(Boolean)) {
    await db.prepare(stmt).run();
  }
}

const report = (over = {}) => ({
  scope: 'cluster', cluster_id: 'c1', title: 'Phone X', category: 'phones',
  captured_at: '2026-10-01', page_url: 'https://x.example/p', note: 'wrong variant',
  selected_version: 'v1',
  facets: [
    { kind: 'grouping', subject: 'c1a', value: 'wrong' },
    { kind: 'title', subject: null, value: 'Phone X 128GB' },
    { kind: 'other', subject: null, value: null },
  ],
  ...over,
});

let mf, db, migDb;
before(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response("ok"); } }',
    d1Databases: { DB: 'report-store-test', MIG: 'report-migration-test' },
  });
  db = await mf.getD1Database('DB');
  migDb = await mf.getD1Database('MIG');
  await applySql(db, migration('0000_legacy_reports.sql'));
  await applySql(db, migration('0001_report_idempotency.sql'));
  await applySql(db, migration('0002_report_status.sql'));
});
after(async () => { await mf.dispose(); });
afterEach(async () => {
  await db.prepare('DELETE FROM report_facets').run();
  await db.prepare('DELETE FROM reports').run();
});

const count = async (table) => (await db.prepare(`SELECT COUNT(*) c FROM ${table}`).first()).c;
const facets = async () => (await db.prepare('SELECT report_id, kind, subject, value, position FROM report_facets ORDER BY report_id, position').all()).results;

// --- canonical body -----------------------------------------------------------
test('canonicalReportBody is stable, ordered, and independent of country/time', () => {
  const a = canonicalReportBody(report());
  assert.equal(a, canonicalReportBody({ ...report(), country: 'KE', created_at: 'now' }));
  const swapped = report();
  swapped.facets = [swapped.facets[1], swapped.facets[0], swapped.facets[2]];
  assert.notEqual(a, canonicalReportBody(swapped), 'facet order is part of the body');
  assert.notEqual(a, canonicalReportBody(report({ note: 'different' })));
  assert.notEqual(a, canonicalReportBody(report({ selected_version: 'v2' })));
});

// --- first write ---------------------------------------------------------------
test('a report with several facets lands once, with ordered facets and its key and hash', async () => {
  const out = await saveReport(db, K1, report(), { country: 'KE' });
  assert.equal(out.created, true);
  assert.match(out.reportId, /^\d+$/);
  const row = await db.prepare('SELECT * FROM reports').first();
  assert.equal(String(row.id), out.reportId);
  assert.equal(row.submission_key, K1);
  assert.match(row.payload_hash, /^[0-9a-f]{64}$/);
  assert.equal(row.selected_version, 'v1');
  assert.equal(row.country, 'KE');
  assert.equal(row.note, 'wrong variant');
  assert.deepEqual((await facets()).map((f) => [f.position, f.kind, f.subject, f.value]), [
    [0, 'grouping', 'c1a', 'wrong'], [1, 'title', null, 'Phone X 128GB'], [2, 'other', null, null],
  ]);
});

test('a report with no facets is stored and replays cleanly', async () => {
  const r = report({ facets: [] });
  const a = await saveReport(db, K1, r, { country: null });
  const b = await saveReport(db, K1, r, { country: null });
  assert.deepEqual([a.created, b.created, a.reportId === b.reportId, await count('reports')], [true, false, true, 1]);
});

// --- retries and conflicts -------------------------------------------------------
test('a same-body retry returns the same id, created=false, and adds nothing', async () => {
  const first = await saveReport(db, K1, report(), { country: 'KE' });
  const again = await saveReport(db, K1, report(), { country: 'US' }); // country is not part of the body
  assert.deepEqual(again, { reportId: first.reportId, reference: first.reference, created: false });
  assert.equal(await count('reports'), 1);
  assert.equal(await count('report_facets'), 3);
  assert.equal((await db.prepare('SELECT country FROM reports').first()).country, 'KE', 'replay must not rewrite the parent');
});

test('a key reused with a different body throws ReportConflictError and changes nothing', async () => {
  await saveReport(db, K1, report(), { country: 'KE' });
  const before_ = JSON.stringify([(await db.prepare('SELECT * FROM reports').all()).results, await facets()]);
  const other = report({ note: 'changed', facets: [{ kind: 'image', subject: null, value: null }] });
  await assert.rejects(saveReport(db, K1, other, { country: 'KE' }), ReportConflictError);
  assert.equal(JSON.stringify([(await db.prepare('SELECT * FROM reports').all()).results, await facets()]), before_);
});

// --- atomicity -------------------------------------------------------------------
test('a SQL failure on a later facet rolls back the parent and every earlier facet', async () => {
  const bad = report();
  bad.facets = [...bad.facets, { kind: null, subject: null, value: null }]; // NOT NULL violation, last statement
  await assert.rejects(saveReport(db, K1, bad, { country: null }), (e) => !(e instanceof ReportConflictError));
  assert.equal(await count('reports'), 0);
  assert.equal(await count('report_facets'), 0);
  // The same key is then free for a good submission (nothing half-claimed it).
  const ok = await saveReport(db, K1, report(), { country: null });
  assert.equal(ok.created, true);
  assert.equal(await count('report_facets'), 3);
});

test('an unrelated constraint failure is not swallowed by the conflict handling', async () => {
  const bad = report({ scope: null }); // reports.scope is NOT NULL: not the idempotency key
  await assert.rejects(saveReport(db, K1, bad, { country: null }), (e) => !(e instanceof ReportConflictError));
  assert.equal(await count('reports'), 0);
});

// --- concurrency -----------------------------------------------------------------
test('five concurrent callers with the same key and body: one created, no duplicates', async () => {
  const outs = await Promise.all(Array.from({ length: 5 }, () => saveReport(db, K1, report(), { country: 'KE' })));
  assert.equal(outs.filter((o) => o.created).length, 1);
  assert.equal(new Set(outs.map((o) => o.reportId)).size, 1);
  assert.equal(await count('reports'), 1);
  assert.equal(await count('report_facets'), 3);
  assert.deepEqual((await facets()).map((f) => f.position), [0, 1, 2]);
});

test('concurrent callers with the same key and different bodies: one wins, facets never mix', async () => {
  const a = report({ note: 'A', facets: [{ kind: 'grouping', subject: 'a1', value: 'wrong' }, { kind: 'grouping', subject: 'a2', value: 'ok' }] });
  const b = report({ note: 'B', facets: [{ kind: 'price', subject: 'b1', value: '10' }, { kind: 'dead_link', subject: 'b2', value: null }, { kind: 'other', subject: null, value: null }] });
  const settled = await Promise.allSettled([a, b, a, b].map((r) => saveReport(db, K1, r, { country: null })));
  const winnerNote = (await db.prepare('SELECT note FROM reports').first()).note;
  const winner = winnerNote === 'A' ? a : b;
  assert.equal(await count('reports'), 1);
  assert.deepEqual((await facets()).map((f) => [f.kind, f.subject, f.value]), winner.facets.map((f) => [f.kind, f.subject, f.value]));
  for (const [i, s] of settled.entries()) {
    const r = [a, b, a, b][i];
    if (r === winner) assert.equal(s.status, 'fulfilled', `same-body caller ${i}`);
    else { assert.equal(s.status, 'rejected'); assert.ok(s.reason instanceof ReportConflictError); }
  }
  assert.equal(settled.filter((s) => s.status === 'fulfilled' && s.value.created).length, 1);
});

test('different keys are independent reports', async () => {
  const a = await saveReport(db, K1, report(), { country: null });
  const b = await saveReport(db, K2, report(), { country: null });
  assert.notEqual(a.reportId, b.reportId);
  assert.equal(await count('reports'), 2);
  assert.equal(await count('report_facets'), 6);
});

// --- migrations ---------------------------------------------------------------------
test('migrations adopt a legacy database: rows and ids survive, 0000 is re-runnable', async () => {
  await applySql(migDb, migration('0000_legacy_reports.sql'));
  await migDb.prepare("INSERT INTO reports (id, scope, cluster_id, created_at) VALUES (41, 'cluster', 'old', '2026-01-01')").run();
  await migDb.prepare("INSERT INTO report_facets (report_id, kind) VALUES (41, 'other')").run();
  await migDb.prepare("INSERT INTO honeypot_hits (ip, created_at) VALUES ('1.2.3.4', '2026-01-01')").run();
  await applySql(migDb, migration('0000_legacy_reports.sql')); // adopting an existing db is a no-op
  await applySql(migDb, migration('0001_report_idempotency.sql'));
  await applySql(migDb, migration('0002_report_status.sql'));
  const old = await migDb.prepare('SELECT id, cluster_id, submission_key, payload_hash, selected_version, status, outcome, status_updated_at FROM reports').first();
  assert.deepEqual(old, { id: 41, cluster_id: 'old', submission_key: null, payload_hash: null, selected_version: null, status: null, outcome: null, status_updated_at: null });
  assert.equal((await migDb.prepare('SELECT position FROM report_facets').first()).position, null);
  assert.equal((await migDb.prepare('SELECT COUNT(*) c FROM honeypot_hits').first()).c, 1);
  // Several legacy rows without a key must not collide on the unique index.
  await migDb.prepare("INSERT INTO reports (scope, created_at) VALUES ('site', 'x')").run();
  await migDb.prepare("INSERT INTO reports (scope, created_at) VALUES ('site', 'y')").run();
  // New ids continue after the legacy ones.
  const out = await saveReport(migDb, K1, report(), { country: null });
  assert.ok(Number(out.reportId) > 41);
  assert.match(out.reference, /^[0-9a-f-]{36}$/);
  assert.equal((await migDb.prepare('SELECT status FROM reports WHERE id = ?').bind(Number(out.reportId)).first()).status, 'received');
});

// --- the handler, end to end on real D1 --------------------------------------------------
const realFetch = globalThis.fetch;
let fetches = 0;
globalThis.fetch = async () => { fetches++; throw new Error('network must not be used in tests'); };
process.on('exit', () => { globalThis.fetch = realFetch; });

const post = (body, { key = K1, env = {}, headers = {} } = {}) => {
  const waits = [];
  return handler.onRequest({
    request: new Request('https://x.example/api/reports', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(key ? { 'idempotency-key': key } : {}), ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    env: { DB: db, ...env },
    waitUntil: (p) => waits.push(p),
  });
};
const body = () => ({ scope: 'cluster', cluster_id: 'c1', note: 'n', version: 'v1', facets: [{ kind: 'grouping', subject: 'c1a', value: 'wrong' }, { kind: 'other' }] });

test('handler: 201 first write, 200 identical receipt on replay, both no-store JSON', async () => {
  const first = await post(body());
  assert.equal(first.status, 201);
  assert.equal(first.headers.get('cache-control'), 'no-store');
  assert.match(first.headers.get('content-type'), /json/);
  const receipt = await first.json();
  assert.deepEqual(Object.keys(receipt).sort(), ['ok', 'reference', 'report_id', 'submission_key']);
  assert.match(receipt.reference, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(receipt.submission_key, K1);
  const replay = await post(body());
  assert.equal(replay.status, 200);
  assert.equal(replay.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await replay.json(), receipt, 'replay returns the same reference');
  assert.equal(await count('reports'), 1);
  assert.equal(await count('report_facets'), 2);
});

test('handler: conflicting reuse is a 409 without echoing any report content', async () => {
  await post(body());
  const res = await post({ ...body(), note: 'SECRET-NOTE-TEXT' });
  assert.equal(res.status, 409);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const text = await res.text();
  assert.ok(!text.includes('SECRET-NOTE-TEXT') && !text.includes('c1a'));
  assert.equal(JSON.parse(text).ok, undefined);
  assert.equal(await count('reports'), 1);
});

test('handler: a storage fault is 503 with Retry-After: 30 and no-store, never a success', async () => {
  const broken = { prepare: (s) => db.prepare(s), batch: async () => { throw new Error('D1_ERROR: boom'); } };
  const res = await post(body(), { env: { DB: broken } });
  assert.equal(res.status, 503);
  assert.equal(res.headers.get('retry-after'), '30');
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.ok(!(await res.text()).includes('boom'));
  assert.equal(await count('reports'), 0);
});

test('handler: invalid input never reaches storage', async () => {
  let calls = 0;
  const spy = { prepare() { calls++; throw new Error('storage touched'); }, batch() { calls++; throw new Error('storage touched'); } };
  for (const [b, opt] of [['null', {}], [JSON.stringify(body()), { headers: { 'content-type': 'text/plain' } }], [body(), { key: 'not-a-uuid' }]]) {
    const res = await post(b, { env: { DB: spy }, ...opt });
    assert.ok([400, 415].includes(res.status), String(res.status));
  }
  assert.equal(calls, 0);
});

test('handler: production mode requires D1 and never uses or mirrors to a webhook', async () => {
  fetches = 0;
  const hook = { REPORT_REQUIRE_KEY: '1', REPORT_WEBHOOK_URL: 'https://hook.example/x', REPORT_SINK: 'webhook' };
  const noDb = await post(body(), { env: { DB: undefined, ...hook } });
  assert.equal(noDb.status, 503);
  assert.equal(noDb.headers.get('cache-control'), 'no-store');
  assert.equal(fetches, 0, 'webhook-only must not satisfy production storage');
  const withDb = await post(body(), { env: hook });
  assert.equal(withDb.status, 201);
  assert.equal(fetches, 0, 'no webhook mirror in production mode');
  assert.equal(await count('reports'), 1);
});

test('handler: outside production, a D1+webhook mirror fires only for a first write, never a replay', async () => {
  const hits = [];
  globalThis.fetch = async (url) => { hits.push(url); return new Response('ok'); };
  try {
    const env = { REPORT_WEBHOOK_URL: 'https://hook.example/x' };
    const waits = [];
    const run = () => handler.onRequest({
      request: new Request('https://x.example/api/reports', { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': K1 }, body: JSON.stringify(body()) }),
      env: { DB: db, ...env }, waitUntil: (p) => waits.push(p),
    });
    assert.equal((await run()).status, 201);
    assert.equal((await run()).status, 200);
    await Promise.all(waits);
    assert.equal(hits.length, 1);
  } finally {
    globalThis.fetch = async () => { fetches++; throw new Error('network must not be used in tests'); };
  }
});

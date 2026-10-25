// GET /api/reports/:reference — the public, read-only status of a report, keyed
// by a random UUID reference (never the integer row id). Real local D1
// (miniflare). Exactly four fields come back and never any report content;
// unknown, malformed or integer ids are a JSON 404 (no storage read when the
// form is wrong); every response is no-store; a NULL status reads as
// "received". Nothing here uses the network.
import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { load, ROOT } from './harness.mjs';

const { Miniflare } = createRequire(join(ROOT, 'package.json'))('miniflare');
const status = await load('functions/api/reports/[id].ts');
const post = await load('functions/api/reports.ts');
const store = await load('functions/lib/reportStore.ts');

const K1 = '3f2b8c1e-5a7d-4e9b-8c3a-1d2e3f4a5b6c';
const REF = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const SECRET_NOTE = 'SECRET-NOTE-do-not-leak';
const SECRET_URL = 'https://secret.example/page?q=1';

async function applySql(db, sql) {
  const stripped = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
  for (const stmt of stripped.split(';').map((s) => s.trim()).filter(Boolean)) await db.prepare(stmt).run();
}

let mf, db;
before(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response("ok"); } }',
    d1Databases: { DB: 'report-status-test' },
  });
  db = await mf.getD1Database('DB');
  for (const f of readdirSync(join(ROOT, 'migrations')).filter((n) => n.endsWith('.sql')).sort()) {
    await applySql(db, readFileSync(join(ROOT, 'migrations', f), 'utf8'));
  }
});
after(async () => { await mf.dispose(); });
afterEach(async () => {
  await db.prepare('DELETE FROM report_facets').run();
  await db.prepare('DELETE FROM reports').run();
});

const get = (id, env = { DB: db }, method = 'GET') =>
  status.onRequest({
    request: new Request(`https://x.example/api/reports/${id}`, { method }),
    env,
    params: { id },
  });

// A row with the pre-status INSERT shape plus a public reference, status NULL.
const insertRow = async (id = 41, ref = REF) => {
  await db.prepare(
    `INSERT INTO reports (id, scope, cluster_id, note, page_url, created_at, public_ref)
     VALUES (?, 'cluster', 'c1', ?, ?, '2026-09-01T00:00:00Z', ?)`,
  ).bind(id, SECRET_NOTE, SECRET_URL, ref).run();
};

const assertNoStore = (res) => {
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.match(res.headers.get('content-type'), /json/);
};

test('a row with NULL status reads as received, with exactly four fields and no content', async () => {
  await insertRow(41);
  const res = await get(REF);
  assert.equal(res.status, 200);
  assertNoStore(res);
  const text = await res.text();
  const body = JSON.parse(text);
  assert.deepEqual(Object.keys(body).sort(), ['ok', 'outcome', 'reference', 'status', 'status_updated_at']);
  assert.deepEqual(body, { ok: true, reference: REF, status: 'received', outcome: null, status_updated_at: null });
  for (const leak of [SECRET_NOTE, SECRET_URL, 'cluster', '2026-09-01', 'report_id']) {
    assert.ok(!text.includes(leak), `must not contain ${leak}`);
  }
  assert.ok(!/"41"|:41\b/.test(text), 'the integer id is never returned');
});

test('a report saved through POST starts as received and its reference resolves', async () => {
  const created = await post.onRequest({
    request: new Request('https://x.example/api/reports', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': K1 },
      body: JSON.stringify({ scope: 'cluster', cluster_id: 'c1', note: SECRET_NOTE, version: 'v1', facets: [{ kind: 'other' }] }),
    }),
    env: { DB: db }, waitUntil: () => {},
  });
  assert.equal(created.status, 201);
  const { reference, report_id } = await created.json();
  const row = await db.prepare('SELECT status, public_ref FROM reports WHERE id = ?').bind(Number(report_id)).first();
  assert.equal(row.status, 'received', 'new rows are stored as received');
  assert.equal(row.public_ref, reference);
  const res = await get(reference);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'received');
  assert.equal(body.reference, reference);
  // The integer id from the receipt is not a way in.
  assert.equal((await get(report_id)).status, 404);
});

test('operator-written status and outcome are returned; nothing else is', async () => {
  await insertRow(7);
  await db.prepare(
    `UPDATE reports SET status = 'resolved', outcome = ?, status_updated_at = '2026-10-25T08:00:00Z' WHERE public_ref = ?`,
  ).bind('We split the two listings.', REF).run();
  const res = await get(REF);
  assertNoStore(res);
  assert.deepEqual(await res.json(), {
    ok: true, reference: REF, status: 'resolved', outcome: 'We split the two listings.',
    status_updated_at: '2026-10-25T08:00:00Z',
  });
});

test('the schema refuses a status outside received|reviewed|resolved, an outcome over 300 characters, and a duplicate reference', async () => {
  await insertRow(8);
  await assert.rejects(db.prepare(`UPDATE reports SET status = 'done' WHERE id = 8`).run());
  await assert.rejects(db.prepare(`UPDATE reports SET outcome = ? WHERE id = 8`).bind('x'.repeat(301)).run());
  await db.prepare(`UPDATE reports SET outcome = ? WHERE id = 8`).bind('x'.repeat(300)).run();
  await assert.rejects(insertRow(9, REF));
});

test('a well-formed but unknown reference is a JSON 404, no-store, with no report content', async () => {
  await insertRow(41);
  const res = await get('00000000-0000-4000-8000-000000000000');
  assert.equal(res.status, 404);
  assertNoStore(res);
  assert.deepEqual(await res.json(), { error: 'report not found' });
});

test('a legacy row without a reference cannot be reached by its integer id', async () => {
  await db.prepare(`INSERT INTO reports (id, scope, created_at) VALUES (1, 'site', 'x')`).run();
  const res = await get('1');
  assert.equal(res.status, 404);
});

test('integer, guessed or malformed ids are 404 without touching storage', async () => {
  let touched = 0;
  const spy = { prepare() { touched++; throw new Error('storage must not be read'); } };
  for (const id of ['1', '41', '0', '-1', 'abc', '1; DROP TABLE reports', '', ' 4', '9'.repeat(30), '%00', '१२',
    REF.slice(0, -1), REF + '0', REF.replace(/-/g, ''), `${REF}' OR '1'='1`]) {
    const res = await get(id, { DB: spy });
    assert.equal(res.status, 404, `id ${JSON.stringify(id)}`);
    assertNoStore(res);
  }
  assert.equal(touched, 0);
});

test('only GET is served: other methods are 405 and no status can be written publicly', async () => {
  await insertRow(41);
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const res = await get(REF, { DB: db }, method);
    assert.equal(res.status, 405, method);
    assert.equal(res.headers.get('allow'), 'GET');
    assertNoStore(res);
  }
  const row = await db.prepare('SELECT status FROM reports WHERE id = 41').first();
  assert.equal(row.status, null);
});

test('a missing binding is a 503 and a storage fault is a 503, never a made-up status', async () => {
  assert.equal((await get(REF, {})).status, 503);
  const broken = { prepare() { throw new Error('d1 down'); } };
  const res = await get(REF, { DB: broken });
  assert.equal(res.status, 503);
  assertNoStore(res);
  assert.ok(!(await res.text()).includes('d1 down'));
});

test('getReportStatus reads an unrecognised stored status as received (defence in depth)', async () => {
  const fake = { prepare: () => ({ bind: () => ({ first: async () => ({ public_ref: REF, status: 'weird', outcome: null, status_updated_at: null }) }) }) };
  assert.equal((await store.getReportStatus(fake, REF)).status, 'received');
});

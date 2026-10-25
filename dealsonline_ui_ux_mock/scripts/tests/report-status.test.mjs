// GET /api/reports/:id — the public, read-only status of a report. Real local D1
// (miniflare). The endpoint must return exactly four fields and never any
// report content; unknown or malformed ids are a JSON 404; every response is
// no-store; a row whose status is NULL (written before migration 0002, or by a
// rolled-back handler) reads as "received". Nothing here uses the network.
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

const insertOld = async (id = 41) => {
  // The pre-0002 INSERT shape: no status columns at all.
  await db.prepare(
    `INSERT INTO reports (id, scope, cluster_id, note, page_url, created_at)
     VALUES (?, 'cluster', 'c1', ?, ?, '2026-09-01T00:00:00Z')`,
  ).bind(id, SECRET_NOTE, SECRET_URL).run();
};

const assertNoStore = (res) => {
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.match(res.headers.get('content-type'), /json/);
};

test('a row with NULL status reads as received, with exactly four fields and no content', async () => {
  await insertOld(41);
  const res = await get('41');
  assert.equal(res.status, 200);
  assertNoStore(res);
  const text = await res.text();
  const body = JSON.parse(text);
  assert.deepEqual(Object.keys(body).sort(), ['ok', 'outcome', 'report_id', 'status', 'status_updated_at']);
  assert.equal(body.ok, true);
  assert.equal(body.report_id, '41');
  assert.equal(body.status, 'received');
  assert.equal(body.outcome, null);
  assert.equal(body.status_updated_at, null);
  for (const leak of [SECRET_NOTE, SECRET_URL, 'c1', 'cluster', '2026-09-01']) {
    assert.ok(!text.includes(leak), `must not contain ${leak}`);
  }
});

test('a report saved through POST starts as received and the receipt id resolves', async () => {
  const created = await post.onRequest({
    request: new Request('https://x.example/api/reports', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': K1 },
      body: JSON.stringify({ scope: 'cluster', cluster_id: 'c1', note: SECRET_NOTE, version: 'v1', facets: [{ kind: 'other' }] }),
    }),
    env: { DB: db }, waitUntil: () => {},
  });
  assert.equal(created.status, 201);
  const { report_id } = await created.json();
  const row = await db.prepare('SELECT status FROM reports WHERE id = ?').bind(Number(report_id)).first();
  assert.equal(row.status, 'received', 'new rows are stored as received');
  const res = await get(report_id);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, 'received');
});

test('operator-written status and outcome are returned; nothing else is', async () => {
  await insertOld(7);
  await db.prepare(
    `UPDATE reports SET status = 'resolved', outcome = ?, status_updated_at = '2026-10-25T08:00:00Z' WHERE id = 7`,
  ).bind('We split the two listings.').run();
  const res = await get('7');
  assertNoStore(res);
  assert.deepEqual(await res.json(), {
    ok: true, report_id: '7', status: 'resolved', outcome: 'We split the two listings.',
    status_updated_at: '2026-10-25T08:00:00Z',
  });
});

test('the schema refuses a status outside received|reviewed|resolved and an outcome over 300 characters', async () => {
  await insertOld(8);
  await assert.rejects(db.prepare(`UPDATE reports SET status = 'done' WHERE id = 8`).run());
  await assert.rejects(db.prepare(`UPDATE reports SET outcome = ? WHERE id = 8`).bind('x'.repeat(301)).run());
  await db.prepare(`UPDATE reports SET outcome = ? WHERE id = 8`).bind('x'.repeat(300)).run();
});

test('an unknown id is a JSON 404, no-store, with no report content', async () => {
  await insertOld(41);
  const res = await get('999');
  assert.equal(res.status, 404);
  assertNoStore(res);
  assert.deepEqual(await res.json(), { error: 'report not found' });
});

test('a malformed id is a 404 without touching storage', async () => {
  let touched = 0;
  const spy = { prepare() { touched++; throw new Error('storage must not be read'); } };
  for (const id of ['abc', '1; DROP TABLE reports', '-1', '0', '1.5', '01', '', ' 4', '9'.repeat(30), '%00', '१२']) {
    const res = await get(id, { DB: spy });
    assert.equal(res.status, 404, `id ${JSON.stringify(id)}`);
    assertNoStore(res);
  }
  assert.equal(touched, 0);
});

test('only GET is served: other methods are 405 and no status can be written publicly', async () => {
  await insertOld(41);
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const res = await get('41', { DB: db }, method);
    assert.equal(res.status, 405, method);
    assert.equal(res.headers.get('allow'), 'GET');
    assertNoStore(res);
  }
  const row = await db.prepare('SELECT status FROM reports WHERE id = 41').first();
  assert.equal(row.status, null);
});

test('a missing binding is a 503 and a storage fault is a 503, never a made-up status', async () => {
  assert.equal((await get('41', {})).status, 503);
  const broken = { prepare() { throw new Error('d1 down'); } };
  const res = await get('41', { DB: broken });
  assert.equal(res.status, 503);
  assertNoStore(res);
  assert.ok(!(await res.text()).includes('d1 down'));
});

test('getReportStatus reads an unrecognised stored status as received (defence in depth)', async () => {
  const fake = { prepare: () => ({ bind: () => ({ first: async () => ({ id: 5, status: 'weird', outcome: null, status_updated_at: null }) }) }) };
  assert.equal((await store.getReportStatus(fake, '5')).status, 'received');
});

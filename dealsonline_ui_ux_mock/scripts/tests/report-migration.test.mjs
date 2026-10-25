// Migration convergence, driven through the REAL recorded mechanism: the
// installed (lockfile-pinned) wrangler's `d1 migrations apply --local`, which
// tracks applied files in the d1_migrations table. Everything is a throwaway
// local D1 under a temp dir with a placeholder (all-zero) database id; nothing
// here can reach a remote database, a webhook or the network on purpose.
//
//   MIGRATIONS_DIR=<dir>  point at another chain (used to watch this test fail
//                         against a deliberately broken migration).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { ROOT } from './harness.mjs';

const MIGRATIONS = resolve(process.env.MIGRATIONS_DIR || join(ROOT, 'migrations'));
const WRANGLER = join(ROOT, 'node_modules', '.bin', 'wrangler');
const read = (p) => readFileSync(p, 'utf8');
const LEGACY_0000 = join(ROOT, 'migrations', '0000_legacy_reports.sql');
let work;

before(() => { work = mkdtempSync(join(tmpdir(), 'report-migration-')); });
after(() => { rmSync(work, { recursive: true, force: true }); });

/** A scratch D1: its own persist dir and a wrangler config pointing at MIGRATIONS. */
function scratch(name) {
  const dir = join(work, name);
  const config = join(work, `${name}.toml`);
  writeFileSync(config, [
    `name = "migration-rehearsal"`,
    `compatibility_date = "2024-09-01"`,
    `[[d1_databases]]`,
    `binding = "DB"`,
    `database_name = "rehearsal-${name}"`,
    `database_id = "00000000-0000-0000-0000-000000000000"`,
    `migrations_dir = "${MIGRATIONS}"`,
  ].join('\n'));
  const wr = (args) => spawnSync(WRANGLER, [...args, '--local', '--persist-to', dir, '-c', config], {
    cwd: work, encoding: 'utf8',
    env: { ...process.env, CI: '1', WRANGLER_SEND_METRICS: 'false', NO_COLOR: '1', WRANGLER_LOG_PATH: join(work, 'logs') },
  });
  const db = `rehearsal-${name}`;
  return {
    migrate: () => wr(['d1', 'migrations', 'apply', db]),
    file: (path) => wr(['d1', 'execute', db, '--file', path]),
    sql(text) {
      const r = wr(['d1', 'execute', db, '--json', '--command', text]);
      assert.equal(r.status, 0, `${text}\n${r.stdout}\n${r.stderr}`);
      return JSON.parse(r.stdout)[0].results;
    },
  };
}

const columns = (d, table) => d.sql(`PRAGMA table_info(${table})`).map((c) => c.name);
const recorded = (d) => d.sql('SELECT name FROM d1_migrations ORDER BY id').map((r) => r.name);
const indexes = (d) => d.sql("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'").map((r) => r.name).sort();

const CHAIN = ['0000_legacy_reports.sql', '0001_report_idempotency.sql', '0002_report_status.sql'];

function assertConverged(d) {
  assert.deepEqual(recorded(d), CHAIN);
  for (const c of ['submission_key', 'payload_hash', 'selected_version']) assert.ok(columns(d, 'reports').includes(c), `reports.${c}`);
  for (const c of ['status', 'outcome', 'status_updated_at', 'public_ref']) assert.ok(columns(d, 'reports').includes(c), `reports.${c}`);
  assert.ok(columns(d, 'report_facets').includes('position'));
  for (const i of ['uq_reports_submission_key', 'uq_facets_report_position', 'uq_reports_public_ref', 'idx_reports_cluster', 'idx_facets_report']) {
    assert.ok(indexes(d).includes(i), i);
  }
}

test('fresh database converges, and re-applying the chain is a recorded no-op', () => {
  const d = scratch('fresh');
  const first = d.migrate();
  assert.equal(first.status, 0, first.stdout + first.stderr);
  assertConverged(d);
  const again = d.migrate();
  assert.equal(again.status, 0, again.stdout + again.stderr);
  assert.match(again.stdout, /No migrations to apply/, 'a second apply must not run any SQL (no repeated ALTER)');
  assertConverged(d);
});

test('a legacy hand-built database keeps its ids and content, and old rows sit beside new ones', () => {
  const d = scratch('legacy');
  // The old, manually applied schema (== 0000, the pre-idempotency tables), no d1_migrations table.
  assert.equal(d.file(LEGACY_0000).status, 0);
  assert.equal(d.sql("SELECT name FROM sqlite_master WHERE name='d1_migrations'").length, 0);
  const seed = join(work, 'seed.sql');
  writeFileSync(seed, `
    INSERT INTO reports (id, scope, cluster_id, title, category, captured_at, page_url, note, country, created_at)
      VALUES (7,  'cluster', 'c-old', 'Old phone', 'phones', '2026-09-01', 'https://x.example/old', 'legacy note', 'KE', '2026-09-02T10:00:00Z'),
             (41, 'site',    NULL,    NULL,        NULL,     NULL,         NULL,                    NULL,          NULL, '2026-09-03T10:00:00Z');
    INSERT INTO report_facets (id, report_id, kind, subject, value) VALUES
      (3, 7, 'grouping', 'c-old-a', 'wrong'), (4, 7, 'title', NULL, 'Old phone 128GB'), (9, 7, 'other', NULL, NULL);
    INSERT INTO honeypot_hits (id, ip, user_agent, path, country, created_at) VALUES (5, '203.0.113.9', 'bot', '/data/x', 'KE', '2026-09-04T00:00:00Z');
  `);
  assert.equal(d.file(seed).status, 0);
  const before = {
    reports: d.sql('SELECT * FROM reports ORDER BY id'),
    facets: d.sql('SELECT * FROM report_facets ORDER BY id'),
    hits: d.sql('SELECT * FROM honeypot_hits ORDER BY id'),
  };

  const r = d.migrate();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assertConverged(d);

  // Every legacy value is unchanged; the new columns are NULL on old rows.
  const project = (rows, keys) => rows.map((row) => Object.fromEntries(keys.map((k) => [k, row[k]])));
  const reportKeys = Object.keys(before.reports[0]);
  const facetKeys = Object.keys(before.facets[0]);
  const after = d.sql('SELECT * FROM reports ORDER BY id');
  assert.deepEqual(project(after, reportKeys), before.reports);
  assert.deepEqual(project(d.sql('SELECT * FROM report_facets ORDER BY id'), facetKeys), before.facets);
  assert.deepEqual(d.sql('SELECT * FROM honeypot_hits ORDER BY id'), before.hits);
  // (wrangler 3's --json renders SQL NULL as the string "null", so assert NULL-ness in SQL.)
  assert.equal(d.sql('SELECT COUNT(*) n FROM reports WHERE submission_key IS NULL AND payload_hash IS NULL AND selected_version IS NULL')[0].n, 2);
  assert.equal(d.sql('SELECT COUNT(*) n FROM report_facets WHERE position IS NULL')[0].n, 3);
  // 0002 is additive too: legacy rows keep a NULL status (the API reads NULL as received).
  assert.equal(d.sql('SELECT COUNT(*) n FROM reports WHERE status IS NULL AND outcome IS NULL AND status_updated_at IS NULL AND public_ref IS NULL')[0].n, 2);

  // A new-format report coexists; AUTOINCREMENT continues past the legacy ids.
  d.sql(`INSERT INTO reports (scope, cluster_id, created_at, submission_key, payload_hash, selected_version)
         VALUES ('cluster','c-new','2026-10-24T00:00:00Z','3f2b8c1e-5a7d-4e9b-8c3a-1d2e3f4a5b6c','abc','v1')`);
  const newId = d.sql("SELECT id FROM reports WHERE cluster_id='c-new'")[0].id;
  assert.ok(newId > 41, `new id ${newId} must follow the legacy ids`);
  d.sql(`INSERT INTO report_facets (report_id, kind, position) VALUES (${newId}, 'other', 0), (${newId}, 'title', 1)`);
  // Rollback compatibility: the pre-migration handler's INSERT shape still works on the migrated schema.
  d.sql(`INSERT INTO reports (scope, cluster_id, created_at) VALUES ('cluster','c-compat','2026-10-24T01:00:00Z')`);
  d.sql(`INSERT INTO report_facets (report_id, kind) VALUES (${newId + 1}, 'other')`);
  assert.equal(d.sql('SELECT COUNT(*) n FROM reports')[0].n, 4);

  // Re-applying neither re-runs the ALTERs nor disturbs anything, new rows included.
  const again = d.migrate();
  assert.equal(again.status, 0);
  assert.match(again.stdout, /No migrations to apply/);
  assert.equal(d.sql('SELECT COUNT(*) n FROM reports')[0].n, 4);
  assert.equal(d.sql('SELECT COUNT(*) n FROM report_facets')[0].n, 6);
});

test('executing schema.sql first breaks the chain: why DEPLOY.md forbids it', () => {
  const d = scratch('schemasql');
  assert.equal(d.file(join(ROOT, 'schema.sql')).status, 0);
  const r = d.migrate();
  assert.notEqual(r.status, 0, 'the final-schema reference must not be migratable-over');
  assert.match(r.stdout + r.stderr, /duplicate column name/i);
});

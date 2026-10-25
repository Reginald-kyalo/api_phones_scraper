# Report service release runbook (PF-02, phase one)

**Status: local rehearsal DONE; staging drill and production steps are OPEN.** This
document does not certify production readiness and is not permission to deploy.
Nothing below marked OPEN was executed: no Cloudflare account access existed when it
was written, and no database or binding identifier has been invented.

Scope: the `reports` / `report_facets` D1 tables, `functions/api/reports.ts`, and the
receipt-aware client in `dealsonline_ui_ux_mock/`.

## 1. What changed, in dependency order

| Step | Artifact | Safe alone? |
|---|---|---|
| 1 | Migrations `0000_legacy_reports.sql` (adopts legacy tables, all `IF NOT EXISTS`), `0001_report_idempotency.sql` (additive columns + partial unique indexes) and `0002_report_status.sql` (status, outcome, status_updated_at, public_ref + unique index) | Yes: old handler ignores new columns. Apply 0000-0002 together: 0001 without 0002 leaves rows whose replay returns 503 |
| 2 | Compatible handler (`reportRequest.ts`, `reportStore.ts`, `reports.ts`): validates, writes parent+facets in one D1 batch, 201 / 200 replay / 409 conflict / 503. Keys optional while `REPORT_REQUIRE_KEY` is unset | Yes, needs step 1 |
| 3 | Receipt-aware client: sends `Idempotency-Key`, shows success only for a receipt carrying its own key, retries under the same key | Needs step 2 |
| 4 | Observe real clients and receipts in staging, then production logs | evidence only |
| 5 | Set `REPORT_REQUIRE_KEY=1` (first-launch profile) | Only after step 4 |

`REPORT_REQUIRE_KEY=1` means: key required on every submission; **D1 required**;
the webhook is disabled both as primary and as mirror. Webhook-only (no `DB`) is no
longer a supported sink in any mode: the endpoint answers 503 and never calls the
webhook. See DEPLOY.md.

⛔ **A push to the Pages production branch deploys.** Back up and apply migrations
0000-0002 together to production D1 BEFORE merging. Applying 0001 without 0002
leaves rows whose replay returns 503.

**Pre-merge gate:** `DB` is bound in every Pages environment (Production and
Preview); no environment is webhook-only.

## 2. Local rehearsal (DONE, real, reproducible)

Base commit at time of writing: `a35aafdf` (branch `sdd/production-foundation`) plus the Task 5 commit.
Toolchain: Node 24.22.1, npm 9.2.0, wrangler 3.114.17 / miniflare from `package-lock.json`,
Python 3.13.7, pytest 9.0.2, Playwright 1.52.0.

```bash
cd dealsonline_ui_ux_mock
npm ci
npm run demo:prepare        # generated public/demo, needed by test:catalogue
npm run test:catalogue      # 12 tests, 0 fail
npm run test:reports        # 76 tests, 0 fail (incl. report-migration.test.mjs)
npm run type-check          # clean
npm run check:design        # "design tokens: ok"
( cd .. && python -m pytest tests/test_hygiene.py tests/test_capture_demo_dataset.py tests/test_mock_phone_navigation.py -q )   # 180 passed, 2 skipped
VITE_CATALOGUE=api npx vite --port 5199 &
UI_BASE=http://localhost:5199 python scripts/tests/report-journey.py   # 0 failure(s), light+dark
```

`scripts/tests/report-migration.test.mjs` drives the **real recorded mechanism**
(`wrangler d1 migrations apply --local`, which records files in `d1_migrations`) on
throwaway local databases with the placeholder id `00000000-0000-0000-0000-000000000000`:

1. Fresh DB: all three migrations (0000-0002) apply; a second apply prints "No migrations to apply"
   (no repeated ALTER); columns and indexes are present.
2. Legacy hand-built DB (0000 schema, no `d1_migrations`, seeded reports 7 and 41,
   facets 3/4/9, a honeypot hit): `migrations apply` adopts it, applies only the
   additive change, every legacy id and value is byte-identical, new columns are NULL on
   old rows, a new-format report coexists with ids continuing after 41, the
   pre-migration INSERT shape still works (rollback compatibility), and a re-apply
   changes nothing.
3. Executing `schema.sql` first makes `migrations apply` fail with
   `duplicate column name`: this is why DEPLOY.md forbids it.

The test was also run red against a deliberately broken chain (0001 without the
`position` column): 2 of 3 tests failed, as intended.

CI: `.github/workflows/production-foundation-checks.yml` runs the same three groups
(Python/static, `test:reports`, browser journey) with `npm ci`, pinned Node/Python/
Playwright, `permissions: contents: read`, no secrets and the webhook variables blanked.
It cannot deploy. Not yet observed running on GitHub (OPEN, item O1).

## 3. OPEN items for an operator

Record each result in section 5. Do not run a command against an environment whose
identity you have not first written down.

### O1. CI evidence
Push the branch, confirm all three jobs are green on the candidate commit, record the run URL.
Verify the pinned Node 24.22.1 is accepted by `actions/setup-node`; adjust the pin only deliberately.

### O2. Staging database identity
```bash
npx wrangler d1 create dealsonline-reports-staging     # prints the real database_id
npx wrangler d1 info   dealsonline-reports-staging
```
Record: Cloudflare account id, staging database name and **real** `database_id`, the Pages
project/environment bound as `DB`. The staging `wrangler.toml` (not committed) must set
`migrations_dir = "migrations"` and that id. Confirm it differs from production's, that
the staging Pages environment has **no** `REPORT_WEBHOOK_URL` / `REPORT_WEBHOOK_TOKEN`, and
that the production database is not bound to any preview/staging deployment.

### O3. Reproduce the legacy state in staging
Create the pre-migration condition the production database is believed to be in, using a
copy of the old tables only (never `schema.sql`; it is the final schema):
```bash
npx wrangler d1 execute dealsonline-reports-staging --remote --file=migrations/0000_legacy_reports.sql
# seed a few legacy reports/facets with explicit ids, as in the local fixture
npx wrangler d1 migrations list dealsonline-reports-staging --remote     # expect 0000, 0001 and 0002 pending
```
If production was provisioned from a differently shaped `schema.sql`, first compare
`wrangler d1 export dealsonline-reports --remote --no-data --output=prod-schema.sql`
with `migrations/0000_legacy_reports.sql`; reconcile differences before proceeding.

### O4. Backup and restoration proof (staging)
```bash
npx wrangler d1 export dealsonline-reports-staging --remote --output=backups/staging-pre-migrations.sql
npx wrangler d1 time-travel info dealsonline-reports-staging          # note the bookmark / timestamp
npx wrangler d1 migrations apply dealsonline-reports-staging --remote
# prove restore: apply the export into a scratch database and compare row counts and ids
npx wrangler d1 create dealsonline-reports-restore-check
npx wrangler d1 execute dealsonline-reports-restore-check --remote --file=backups/staging-pre-migrations.sql
npx wrangler d1 time-travel restore dealsonline-reports-staging --timestamp=<pre-migration timestamp>   # only if the drill calls for it
```
Evidence: export file checksum, row counts of `reports`/`report_facets`/`honeypot_hits` before,
after migration and after restore; migrated ids unchanged; restored database equals the backup.

### O5. Migration on staging
```bash
npx wrangler d1 migrations apply dealsonline-reports-staging --remote
npx wrangler d1 migrations apply dealsonline-reports-staging --remote     # must report nothing to apply
npx wrangler d1 migrations list  dealsonline-reports-staging --remote
```
Evidence: both outputs, `d1_migrations` rows, legacy ids and content unchanged.

### O6. Handler, lost-response retry, rollback compatibility (staging)
1. Deploy the compatible handler + receipt-aware client to staging, `REPORT_REQUIRE_KEY` unset.
2. Lost-response retry: submit with key K, drop the response (browser offline after send, or
   `curl --max-time` abort), retry the same key and body. Expect 200 with the same
   `report_id`; `SELECT COUNT(*) FROM reports WHERE submission_key='K'` is 1. Same key with a
   different body: 409.
3. Old-format client (no key) still stored while the key is optional.
4. Rollback compatibility: redeploy the **previous** handler on the migrated database; submit
   a report; confirm it lands and no new row or column was touched. Then redeploy the new handler.
5. Set `REPORT_REQUIRE_KEY=1` in staging; confirm keyless requests are rejected, D1-missing
   returns 503, and a configured webhook is never called.
6. Prove isolation: staging webhook URL empty; no staging submission appears in the
   production database (`SELECT COUNT(*)` on both before and after) or any production sink.

### O7. Production (owner-gated; not part of this package)
Only after O1-O6 are complete and the owner approves, in this order, each as its own recorded step:
1. Confirm the production database name and id from the Cloudflare dashboard and record them.
2. Backup: `wrangler d1 export <prod-db> --remote --output=...` plus a Time Travel bookmark.
3. `wrangler d1 migrations list <prod-db> --remote` (expect 0000-0002 pending), then `migrations apply --remote` so 0000, 0001 and 0002 land together, BEFORE merging to the production branch.
   (First-time adoption of a hand-built database also works: 0000 is idempotent.)
4. Deploy the compatible handler, then the receipt-aware client.
5. Observe real clients/receipts (O6 query on `submission_key IS NOT NULL` vs NULL).
6. Set `REPORT_REQUIRE_KEY=1` for launch.

## 4. Rollback (never destructive)

- Never `DROP COLUMN`, never delete rows created after the migration, never re-run `schema.sql`.
- If new writes fail: (a) temporarily disable report submission (unbind `DB` under the profile so
  the endpoint returns 503, or ship the UI with the dialog disabled), or (b) redeploy the
  previous compatible handler; the migrated schema accepts its INSERTs (proven locally and to be
  proven in O6.4).
- Unset `REPORT_REQUIRE_KEY` to return to optional keys.
- A bad migration is repaired by a new numbered forward migration or by Time Travel/restore of
  the pre-migration backup, decided by the operator with the owner, after exporting the current
  data so new rows are not lost.

## 5. Evidence record (fill in; leave blank until real)

| Field | Value |
|---|---|
| Candidate commit | |
| Schema version (last recorded migration; expect 0002_report_status.sql) | |
| Pre-merge gate: `DB` bound in Production and Preview, none webhook-only | |
| CI run URL | |
| Local test outputs | see section 2 (commit above plus Task 5 commit) |
| Browser journey evidence | local run: 0 failures, light and dark |
| Staging database name / real id | |
| Production database identity (confirmed by owner) | |
| Backup file + checksum | |
| Restore proof | |
| Operator | |
| Date/time and timezone | |
| Lost-response retry result | |
| Rollback-compatibility result | |
| Isolation result (no staging report reached production/webhook) | |
| Gate decision | NOT MET until O1-O6 are filled in |

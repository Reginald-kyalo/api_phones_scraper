# Production Foundation Phase One Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a deterministic regression baseline and make the first-launch report service validate, persist and acknowledge submissions reliably.

**Architecture:** Preserve the current Pages/R2 comparison website. Keep report request validation separate from D1 persistence, commit each report and its facets atomically, and make browser retries idempotent. Use D1 as the launch record of truth; webhook delivery remains a separate, disabled-by-default capability.

**Tech Stack:** Existing React/TypeScript frontend, Pages Functions, D1/SQLite, Node 24 test harness and Python pytest.

**Spec:** [Production-readiness proposal](/home/reginaldkyalo/codes/api_phones_scraper/docs/production-readiness-2026-10-23/proposal.md), especially sections 9, 11 and 13.

**Status:** Ready for implementation review, not executed. User scope remains review/proposals only. Baseline is `124c14f883189ee3f3bca719117ef8db3da80f40`; recheck before starting. All newly named files below are proposed files unless explicitly described as existing. No production database identifier or deployment credential is assumed.

## Global Constraints

- No change to prices, matching, catalogue scope, ranking, themes or currently disabled account/payment/notification features in this package.
- Preserve the current private-catalogue, API validation and initial-page-data improvements.
- Do not fix tests by making stale prices appear fresh or restoring obsolete wording.
- No live retailer requests, real reports, production database writes or webhook messages in automated tests.
- The launch report sink is D1. Production configuration must require a bound database and reject webhook-only configurations until separately accepted.
- Preserve existing report IDs and records. Use additive migrations; do not delete old honeypot records as an incidental cleanup.
- All report responses use JSON and `Cache-Control: no-store`. Unsupported methods return 405 with `Allow: POST`.
- Invalid input must not reach storage. Report success requires durable persistence, not just HTTP 2xx or a JSON content type.
- This package does not certify production readiness. Data, publication, security, experience and operational gates remain mandatory.

## Review Focus

- A July fixture evaluated in October must not make the test nondeterministic or weaken freshness rules (Task 1).
- Valid JSON of the wrong shape, multibyte text and a forged Content-Length must not crash or evade size limits (Task 2).
- Concurrent retries and conflicting reuse of one submission key must not duplicate or mix reports (Task 3).
- A successful database write followed by a lost HTTP response must recover without a second report (Task 4).
- Existing data and old clients must survive an explicit migration/release sequence; rollback must not undo new records (Task 5).

## Package order

1. Baseline correction, independently reviewable.
2. Report contract and validation.
3. Atomic/idempotent D1 persistence.
4. Browser acknowledgement and retry behaviour.
5. Migration rehearsal and CI evidence.

Tasks 2–4 form one report-service release. Do not deploy strict new request requirements before deploying a compatible client. Each task gets focused tests; a release candidate gets their combined checks and browser/D1 acceptance.

## Task 1 — Make the existing baseline deterministic

**Modify:**

- [clusters.py](/home/reginaldkyalo/codes/api_phones_scraper/app/api/routes/clusters.py)
- [test_hygiene.py](/home/reginaldkyalo/codes/api_phones_scraper/tests/test_hygiene.py)
- [test_mock_phone_navigation.py](/home/reginaldkyalo/codes/api_phones_scraper/tests/test_mock_phone_navigation.py)

**Interfaces:** Extend `_cluster_view(d: dict, summary: bool = False, *, now: datetime | None = None) -> dict`; pass `now` into `freshness`. Existing callers keep their behaviour. Proposed navigation decision: retain the current `/aisle/phones-wearables` fallback and the current department/family directory, rather than revert the recent redesign.

- [ ] Preserve the three baseline failures as evidence. Add `test_projection_freshness_uses_supplied_clock`: the same dated fixture is fresh immediately after its observation and stale after the configured threshold, using explicit aware UTC times.
- [ ] Run the new test before changing the projection; expect failure because `now` is not accepted. Then implement the optional clock parameter and fix the existing freshness assertion to use the fixture clock.
- [ ] Update the fallback test to the proposed current route contract and rename it accordingly. Replace the literal “More collections” assertion with checks for the actual directory contract: department entry points, comparison-category links and family-anchor destinations. Preserve taxonomy provenance/legacy separation checks that still express real requirements.
- [ ] Run `apienv/bin/python -m pytest tests/test_hygiene.py tests/test_capture_demo_dataset.py tests/test_mock_phone_navigation.py -q` from the repository root, with Node 24 on PATH. Expect all selected cases passing; never add xfail/skip just to make this gate green.
- [ ] Review the capture-test tar warning separately: document runtime behaviour and safe extraction follow-up rather than change data packing as part of this small fix.
- [ ] Commit the passing baseline correction if implementation is later authorised. Gate: tests distinguish fresh/stale states without dependence on today's date and retain the intended navigation behaviour.

## Task 2 — Define a bounded report contract

**Create:**

- `/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/functions/lib/reportRequest.ts`
- `/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/lib/reportContract.ts`
- `/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/scripts/tests/report-request.test.mjs`

**Modify:** [reports.ts](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/functions/api/reports.ts), [package.json](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/package.json).

**Interfaces:**

- `parseReportBody(value: unknown): ReportParseResult`, where the result is `{ok:true, report:ValidatedReport}` or `{ok:false, error:string}`.
- `readReportRequest(request: Request): Promise<ReportRequestResult>`, adding a validated UUID `submissionKey` from the `Idempotency-Key` header or returning a specified 400/413/415 status.
- `ValidatedReport` contains the current scope/context/facets plus `selected_version: string | null`; the current client's `version` input maps to this field. Server-observed country and creation time remain separate.
- `ReportInput` is the shared browser wire type for scope, cluster_id, title, category, captured_at, page_url, note, version and facets; optional context values may be null. `ReportRequestResult` is `{ok:true, report:ValidatedReport, submissionKey:string}` or `{ok:false, status:400|413|415, error:string}`. Keep runtime validation even when callers use these TypeScript types.
- `ReportReceipt = {ok:true, report_id:string, submission_key:string}`. No submitted note or private details are echoed in the receipt.

**Chosen bounds:** 64 KiB actual UTF-8 body bytes; at most 60 facets; note 1,000 code points; title 500; cluster ID 512; category 128; selected version 256; captured-at string 40; page URL 2,048; facet subject 512; facet value 200. Require strings/null as appropriate rather than coercing arrays/objects/numbers. Trim text; reject overlength values rather than silently truncate. Retain existing scope and facet-kind allowlists. Unknown fields are ignored for forward compatibility, not persisted.

- [ ] Write tests reproducing the three uncaught TypeErrors from the [offline probes](/home/reginaldkyalo/codes/api_phones_scraper/docs/production-readiness-2026-10-23/report-checks.json), plus arrays, malformed JSON, numeric context fields, unknown scope/kind, empty report, 61 facets and invalid/missing UUID. Expect controlled 400 responses and zero storage calls.
- [ ] Add byte-boundary tests with ASCII and multibyte strings: at most 65,536 bytes can be parsed; more returns 413. Count streamed bytes even if Content-Length is missing or false. Reject non-JSON media types with 415; accept `application/json` with charset parameters.
- [ ] Implement the parser and bounded reader. Validate absolute HTTP(S) page URLs, rejecting credentials and unsupported schemes. Treat report text as untrusted content; it must never become executable HTML in future triage interfaces.
- [ ] Add the shared receipt type/validator: `isReportReceipt(value: unknown): value is ReportReceipt`. Require `ok === true`, a nonempty string ID and a valid matching submission UUID.
- [ ] Add `test:reports` to package scripts, initially running `report-request.test.mjs`. Use the existing esbuild harness for TypeScript imports. Expect all boundary tests and both existing catalogue test files to pass, plus `npm run type-check`.

**Compatibility decision:** use a temporary `REPORT_REQUIRE_KEY=0` only during the staging/client transition; server-generated keys can keep old clients functional but cannot deduplicate their retries. Production launch requires `REPORT_REQUIRE_KEY=1`. Explicitly test old clients before switching; do not claim their requests are idempotent. A missing required key returns 400 with a safe reload instruction.

## Task 3 — Persist reports and facets atomically and idempotently

**Create:**

- `/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/functions/lib/reportStore.ts`
- `/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/migrations/0000_legacy_reports.sql`
- `/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/migrations/0001_report_idempotency.sql`
- `/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/scripts/tests/report-store.test.mjs`

**Modify:** [reports.ts](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/functions/api/reports.ts), [schema.sql](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/schema.sql).

**Interfaces:**

- `canonicalReportBody(report: ValidatedReport): string` serialises a fixed order of validated user/context fields, preserving facet order. Use SHA-256 of its UTF-8 bytes as `payload_hash`; exclude request country and server timestamps.
- `saveReport(db: D1Database, submissionKey: string, report: ValidatedReport, context: {country:string|null}): Promise<{reportId:string, created:boolean}>`.
- A key reused with a different canonical body throws a typed `ReportConflictError`; the handler maps it to 409. Storage faults become 503/no-store with `Retry-After: 30`.

**Migration design:** `0000_legacy_reports.sql` freezes the present legacy table/index definitions using non-destructive `CREATE ... IF NOT EXISTS`; it bootstraps a fresh database or adopts an existing manually created one. `0001_report_idempotency.sql` adds nullable `submission_key`, `payload_hash` and `selected_version` columns to `reports`, plus a unique index on non-null submission keys. Add nullable `position` to `report_facets` and a unique `(report_id, position)` index. Existing rows remain intact and retain numeric IDs. Use the migration chain for provisioning; update `schema.sql` as a final-schema reference, not a second script to execute before the same ALTER migrations.

- [ ] Write tests for a successful report with multiple facets, duplicate same-body retries, conflicting bodies, a failed facet insertion and two concurrent callers using the same key. Before implementation, expect the partial-write/deduplication cases to fail against current storage logic.
- [ ] Use one D1 `batch()` for parent creation and all child inserts. Resolve the parent ID by submission key in SQL; do not run the parent INSERT separately beforehand. Guard child insertion by both key and matching payload hash. Use targeted conflict handling for the intended unique keys; do not suppress unrelated SQL failures.
- [ ] On retry, return the existing receipt without duplicating facets. On conflicting reuse, do not modify the existing parent or children. Read the winning row/hash after the transaction and verify it before acknowledging success. Make creation versus replay status observable from transaction results, not a racy preflight lookup alone.
- [ ] Test a forced SQL failure within the batch in a local D1 environment: neither parent nor facets may persist. Run concurrent same-key/same-body and same-key/different-body cases, verifying exact row counts and contents. Mock tests alone cannot close this gate.
- [ ] Return 201 with the receipt for a first write and 200 with the same receipt for a replay. Return 409 for conflicting reuse; no report body is returned in the error. Ensure all errors and receipts are noncacheable.
- [ ] In first-launch production mode, require D1 and disable webhook-only storage/mirroring. Keep existing webhook-only environments explicitly outside this launch profile; do not silently reroute existing production traffic. Any later webhook adapter needs its own timeout, idempotency and durable JSON acknowledgement tests.
- [ ] Add store tests to `test:reports`. Gate: injected failure leaves no partial report, retries are safe, conflicts cannot mix facets, and missing storage cannot yield success.

D1 batches support transactional rollback if a statement fails; that is the basis for this design, not an assumption that separate writes are atomic. [Cloudflare D1 batch documentation](https://developers.cloudflare.com/d1/worker-api/d1-database/)

## Task 4 — Make browser acknowledgement and retries truthful

**Create:**

- `/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/lib/reportClient.ts`
- `/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/scripts/tests/report-client.test.mjs`
- `/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/scripts/tests/report-journey.py`

**Modify:** [ReportDialog.tsx](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/features/clusters/components/ReportDialog.tsx).

**Interfaces:** `submitReport(body: ReportInput, submissionKey: string, fetcher?: typeof fetch): Promise<ReportReceipt>`. The client accepts only a valid receipt for its own key; HTTP status/content type alone is insufficient.

- [ ] Add client tests for valid 201, valid replay 200, JSON `{ok:false}`, unrelated JSON, HTML 200, malformed JSON, receipt for another key, 400/409/429/503 and network loss after server commit. Expect current MIME-only acknowledgement logic to fail the false-success cases.
- [ ] Generate one UUID per logical submission. Retain it and the exact submitted body across a failed request/retry. Editing the report creates a new submission identity; warn after an uncertain previous outcome that the earlier report may already have arrived. Closing/reopening starts a new draft. Do not regenerate the key merely because a timeout occurred.
- [ ] Disable repeat submission while sending, retain all inputs on failure and allow a controlled retry using the same key. Honour Retry-After where provided. Do not automatically retry indefinitely.
- [ ] Store the exact selected configuration in the new explicit field, while retaining human-readable title context for older operators. Keep displayed seller choices aligned with the selected offers.
- [ ] Require a validated receipt before showing “Report received. Thank you.” If the service is unavailable, say “We couldn’t save your report. Your text is still here. Try again.” Preserve existing accessible focus and announcement behaviour.
- [ ] Run the browser test with synthetic data and local/intercepted endpoints: successful submission, response lost after commit, retry without duplication, edit after failure, invalid receipt, and keyboard-only completion in both themes. Never use a real production report for these cases.
- [ ] Gate: the UI cannot claim success from an HTML or arbitrary JSON response, and ordinary timeout retries do not duplicate reports.

## Task 5 — Rehearse migration and establish CI evidence

**Create:**

- `/home/reginaldkyalo/codes/api_phones_scraper/.github/workflows/production-foundation-checks.yml`
- `/home/reginaldkyalo/codes/api_phones_scraper/docs/production-readiness-2026-10-23/report-release-runbook.md`
- `/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/scripts/tests/report-migration.test.mjs`

**Modify:** [DEPLOY.md](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/DEPLOY.md), [package.json](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/package.json).

- [ ] Test schema convergence on a fresh database and an existing fixture database with legacy reports/facets. Apply the additive migration through the recorded migration mechanism once; re-running migration application must not reapply ALTER statements. Preserve old IDs/content and allow old-format rows alongside new ones.
- [ ] Use a local D1 binding first, then a separately identified staging database. Record the real binding and database identifiers only when account access supplies them; never invent a production UUID. Cloudflare tracks applied SQL migrations, which must be reconciled with existing manually applied schema history. [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [ ] CI uses lockfile installs, declared Node/Python versions, the selected Python checks, catalogue/report tests, app/Function type checks and design checks. It has no production deployment permission and no production report sink. Add the local D1 and browser acceptance jobs using installed/test-pinned tooling rather than downloading an unpinned latest tool during each test.
- [ ] Prepare the release order: backup and additive migration → compatible handler → receipt-aware client → verify observed clients/receipts → require idempotency keys for launch. If new writes fail, disable report submission temporarily or restore the compatible handler; do not roll back by dropping columns or deleting new rows.
- [ ] In staging, prove backup restoration, the lost-response retry case and rollback compatibility. Verify that no staging report reaches a production database or webhook.
- [ ] Record commit, schema version, test outputs, browser evidence, database identity, operator and rollback steps in the runbook. Gate: one reproducible passing candidate and a completed staging drill. This is not permission to deploy production during this planning task.

## Verification commands and expected outcomes

From `/home/reginaldkyalo/codes/api_phones_scraper`:

```bash
PATH=/home/reginaldkyalo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH apienv/bin/python -m pytest tests/test_hygiene.py tests/test_capture_demo_dataset.py tests/test_mock_phone_navigation.py -q
```

From `/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock`, with the supported Node runtime on PATH:

```bash
npm run test:catalogue
npm run test:reports
npm run type-check
npm run check:design
```

`test:reports` and its tests are future implementation outputs, not currently available commands. Expected outcome after implementation: zero failures in these required checks, plus local D1 atomicity/migration evidence and the browser scenarios described above. The older audit probe intentionally reports findings without enforcing a failing exit status; it is evidence, not a substitute CI gate.

## Self-review and handoff

This package addresses the three known baseline failures and the confirmed report validation/persistence/acknowledgement gaps. It specifies body limits, persistence semantics, concurrency behaviour, migration compatibility and browser recovery. It intentionally does not set final data-retention durations, validate the legal entity, migrate the upstream scraper or certify production security: those belong to the owner-backed gates in the [release backlog](/home/reginaldkyalo/codes/api_phones_scraper/docs/production-readiness-2026-10-23/release-backlog.md).

Implementation must still test the actual D1 and browser behaviour. No plan, mock result or passing type check substitutes for that evidence. Review the chosen D1-only launch profile and phase-one scope before executing application changes.

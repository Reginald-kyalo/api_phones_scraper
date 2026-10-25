# SDD ledger — plan: docs/superpowers/plans/2026-10-23-production-foundation-phase-one.md
Worktree: /home/reginaldkyalo/.cache/phones_scraper_agents/wt-storefront/prod-foundation branch sdd/production-foundation base 4d1c0d7a. Second plan docs/superpowers/plans/2026-10-25-comparison-trust-features.md runs after Task 5.
Pre-flight scan (2026-10-25):
| pair | produces / consumes | finding |
| T2 ↔ T3 | T2 readReportRequest/ValidatedReport/ReportReceipt in reports.ts; T3 saveReport consumes ValidatedReport, handler maps ReportConflictError→409 | consistent; T3 must keep T2's 400/413/415 ordering before storage |
| T2 ↔ T4 | ReportReceipt + isReportReceipt (T2) consumed by reportClient (T4) | consistent |
| T3 ↔ T5 | migrations 0000/0001 (T3) consumed by migration test (T5) | consistent; T5 must not re-apply ALTERs |
| T1 self | test added before `now` param exists must FAIL first | consistent |
| T5 self | staging drill + real D1 identifiers need account access | gap, not conflict — see ruling |
Ruling: all Node commands use the Node 24 runtime at /home/reginaldkyalo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin (system node is v20) — plan declares Node 24 — cost if wrong: test harness differences.
Ruling: T5's staging drill, real database identifiers and production-deploy steps are documented as OPEN in the runbook, not simulated — no Cloudflare account access in this session — cost if wrong: none, it is the plan's own instruction.
Ruling: implementers are Sonnet (owner instruction 2026-10-25 "use sonnet agents"); reviewers Sonnet for small diffs, Opus for T3 (concurrency) and the final review — cost if wrong: a missed defect in a cheap-reviewed task.
Task 1: implementer DONE_WITH_CONCERNS c8bff993 (env: worktree apienv symlink dangling → main repo apienv used; .env copied, ignored; unrelated failure tests/test_listing_quality.py noted). Review dispatched.
Task 1: ⚠️ resolved — JSX string assertions verified by the implementer's green run (180 passed); tar-warning item is documentation-only per the brief and is in task-1-report.md.
Task 1: minor (deferred): DemoShelfPage no longer asserted to use isLegacyPhoneCollection; only the export is checked (tests/test_mock_phone_navigation.py ~L195).
Task 1: minor (deferred): source-string JSX assertions are brittle to refactors (existing file pattern).
Task 1: complete (commits 4d1c0d7a..c8bff993, review clean)
Task 2: implementer DONE_WITH_CONCERNS 1f367467 (tests written after modules but RED run against original handler: 17 failed incl. the 3 TypeErrors; node_modules symlinked, untracked; test:catalogue 5 env failures = no public/demo data in worktree, same without the change). Review dispatched.
Task 2: ⚠️ resolved — node_modules symlink confirmed untracked (git ls-files empty); catalogue baseline failures are env (no demo data), same before the change per implementer.
Task 2: minor (deferred): stale comment in ReportDialog.tsx about REASONS (Task 4 touches that file).
Task 2: note for release: REPORT_REQUIRE_KEY must stay unset/0 in production until the Task 4 client ships (old client would 400).
Task 2: complete (commits c8bff993..1f367467, review clean)
Task 3: implementer DONE bd70b6e2 (17 store tests on miniflare D1; production mode keyed off REPORT_REQUIRE_KEY=1, no new flag; webhook-only envs keep old {ok,facets} body). Opus review dispatched.
Task 3: Ruling: Important #1 (DEPLOY.md still says execute schema.sql --remote; REPORT_REQUIRE_KEY=1 profile undocumented) is carried into Task 5, whose brief already modifies DEPLOY.md and writes the release runbook — not a fix round — cost if wrong: an operator provisioning from DEPLOY.md between now and Task 5 (nobody deploys from this branch yet).
Task 3: minor (deferred): report-store.test.mjs ~L687 "unrelated constraint not swallowed" would also pass with INSERT OR IGNORE; assert on the NOT NULL error text.
Task 3: minor (deferred): REPORT_REQUIRE_KEY doubles as the D1-only profile flag; a dedicated flag later.
Task 3: minor (deferred): legacy webhook-only path returns {ok,facets}, no idempotency (outside launch profile by design).
Task 3: ⚠️ open for owner: whether live production D1 was built from schema.sql (needs PRAGMA table_info --remote); no committed wrangler.toml shows the migrations dir binding.
Task 3: complete (commits 1f367467..bd70b6e2, review clean)
Task 4: implementer DONE 75e4c984 (73 report tests; Playwright journey 44 PASS both themes, endpoints intercepted; role=alert added to failure block). Review dispatched.
Task 4: review NOT approved — Important: per-second countdown inside role="alert" region re-announces; Minor: inFlight not reset on close/reopen. Fix round 1 dispatched (implementer resumed).
Task 4: minor (deferred): after 400/413 an identical resend mints a fresh key (harmless); journey check(...,True) after wait_for is tautological; no Retry-After HTTP-date test; fake journey server dedups by key only, not body hash.
Task 4: fix round 1/5 (2 addressed, 0 open — countdown moved out of alert; inFlight reset on close with generation guard; commits 75e4c984..a35aafdf)
Task 4: minor (deferred): no regression test for close-mid-request then reopen; journey keyboard step uses programmatic .focus().
Task 4: complete (commits bd70b6e2..a35aafdf, review clean after 1 fix round)
Task 5: implementer DONE_WITH_CONCERNS f6068ac7 (staging/prod steps O1-O7 OPEN per ruling; CI unverified on GitHub; wrangler --json prints NULL as 'null'; migration test ~45s). Review dispatched.
Task 5: ⚠️ resolved — DEPLOY.md grep shows no remaining instruction to execute schema.sql (checked by controller); 503-without-DB in production mode was traced by the Task 3 Opus reviewer.
Task 5: minor (deferred): legacy fixture is built from 0000 itself (proves additivity, not production parity — O3 schema diff covers); old-INSERT proxy is test-written; Time Travel bullet should say "last resort"; actions pinned to major tags not SHAs; CI unverified on GitHub (O1).
Task 5: complete (commits a35aafdf..f6068ac7, review clean)
Ruling: one final whole-branch review at the end of BOTH plans (same branch, same reviewer seat) instead of two — cost if wrong: a plan-1 defect found later than it could have been; all five tasks were individually reviewed.

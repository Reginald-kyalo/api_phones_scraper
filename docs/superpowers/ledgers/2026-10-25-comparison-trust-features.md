# SDD ledger — plan: docs/superpowers/plans/2026-10-25-comparison-trust-features.md
Worktree: /home/reginaldkyalo/.cache/phones_scraper_agents/wt-storefront/prod-foundation branch sdd/production-foundation; follows plan 2026-10-23-production-foundation-phase-one (complete at f6068ac7).
Pre-flight: T1/T2/T3 are independent pure-function+component tasks; T4 consumes plan-1 reportStore/migrations (0001 exists → T4 adds 0002). No conflicts. Ruling: implementers Sonnet; reviewers Sonnet; final review Opus over both plans.
Task 1: implementer DONE_WITH_CONCERNS ea1dd1fa — projection lacks per-offer condition/observed_at/facet_value; only the unknown line renders today. Review dispatched.
Ruling: insert Task 1b (per-offer evidence fields from members through _cluster_view → projection → demo capture) before Task 2; brief at task-1b-brief.md — without it Tasks 1–3 render nothing useful — cost if wrong: an API view change outside the plan's 'no new API fields unless listed' (listed now).
Task 1: review approved. Minor facet_value-null guard handed to the running Task 1b implementer (same file). minor (deferred): condition vocab beyond used/refurbished yields only the unknown line; facetName assumes storage axis for numeric values; unknown copy is implementer's wording.
Task 1: complete (commits f6068ac7..ea1dd1fa, review clean)
Task 1b: implementer DONE_WITH_CONCERNS 6fcc2951 (demo capture NOT regenerated — would overwrite tracked tarball with today's corpus; owner call. Claims 4 test_mock_phone_navigation failures also on clean HEAD — contradicts Task 1's green run; reviewer asked to check). Review dispatched.
Task 1b: review approved. Ruling: the `likely_used`/`delisted` False-when-missing defaults violate "never guess" in spirit; handed to the Task 2 implementer (which consumes those fields) as a one-line change to null + test — cost if wrong: Task 2 scope grows by a few lines.
Task 1b: minor (deferred): _flag treats only True/"true" as true; duplicate urls resolve to first member; `if members` on a tuple is misleading; HTTP serialises null not absent (Pydantic default).
Task 1b: OPEN for owner: demo dataset recapture (overwrites the tracked tarball with today's corpus); until then demo data shows only the unknown line.
Task 1b: complete (commits ea1dd1fa..6fcc2951, review clean)
Task 2: implementer DONE_WITH_CONCERNS 660b6194 (per-config map is configs[].by_store — my dispatch note was wrong, brief was right; tests not run red first; unpriced offers inside by_store not counted per brief; offers in no config map with no evidence not counted). Review dispatched.
Task 2: review NOT approved — Important: facet-less configs drop other_configuration membership; Minor: precedence test tautological; "same version" sentence wrong for non-config reasons. Fix round 1 dispatched (implementer resumed).
Task 2: OPEN for owner: unpriced offers inside the selected by_store are hidden from the list but not counted as excluded (brief-literal); decide whether the list should show them or the count include them.
Task 2: minor (deferred): dedup keeps the config-map copy over best_by_store's; describeExclusions called twice per render; nothing shown under "All versions".
Task 2: fix round 1/5 (3 addressed, 0 open — membership counts without facets; real precedence test; honest copy; commits 660b6194..d4e641eb)
Task 2: minor (deferred): facet-less selected-config assertion is `>= 3`; the page's selected config must be the cluster's own copy or its offers count as other_configuration.
Task 2: complete (commits 6fcc2951..d4e641eb, review clean after 1 fix round)
Task 3: implementer DONE 7dd283ad (9 tests red-first; no n_stores in page; existing 'from N shops' already derived — two derived counts now side by side). Review dispatched.
Task 3: minor (deferred): useMemo on a fresh `offers` array never caches; hasPrice vs coverageLine priced predicate differ only on Infinity.
Task 3: complete (commits d4e641eb..7dd283ad, review clean)
Task 4: implementer DONE d52e32db (85 report tests; routing verified via wrangler pages functions build; concern: report_id is a sequential int → enumerable status endpoint — the brief said 'reuse report_id', my plan defect; reviewer asked to weigh). Review dispatched.
Task 4: review NOT approved — Important: sequential report_id as the public reference is enumerable. Ruling: brief's "reuse report_id" is overridden by its own "opaque reference" requirement; fix = random public_ref (UUID) on insert, returned as `reference`, GET keyed on it — cost if wrong: receipt contract gains a field the client must validate (tests updated in the same round). Fix round 1 dispatched.
Task 4: minor (deferred): status_updated_at NULL on new rows (no "received at" time on the timeline); clipboard success path not exercised; 503 checked before id validation when the binding is missing.
Task 4: fix round 1/5 (1 addressed, 0 open — random public_ref reference; commits d52e32db..535ecef4)
Task 4: minor (deferred): a row with submission_key (0001) but no public_ref (0002 applied later) would 503 on replay — apply 0001+0002 together or backfill; server REFERENCE_RE is lowercase-only while the client accepts uppercase; 0002 amended in place (never applied anywhere, per implementer).
Task 4: complete (commits 7dd283ad..535ecef4, review clean after 1 fix round)
All tasks complete. Final whole-branch review dispatched (Opus) over 124c14f8..535ecef4.
Final review (Opus): mergeable after fixes. I1 coverage line counts undated offers as "older" (false claim on every page today); I2 runbook/DEPLOY must say apply 0000–0002 BEFORE merging (merge = deploy) and mention 0002; I3 webhook-only envs now get false failures + duplicates with the new client. Minors M1 schema.sql lags 0002; M2 CI lacks test:trust + test_offer_evidence; M3 coverage line renders under All versions; M5 observed_at not normalised to ISO; M6 DEPLOY says 500 not 503.
Ruling: I3 → webhook-only path returns 503 "no report storage configured" (visible refusal, not a silent reroute; the launch profile is D1-only), and "DB bound in every Pages environment" becomes a pre-merge gate in the runbook — cost if wrong: a webhook-only Preview env loses reporting until DB is bound.
Ruling: M4 (receipt still carries integer report_id) is the owner's contract call; DEPLOY.md wording corrected to "never used as the public reference" in the fix wave. M7/M8/M9/M10 → owner wording / drop.
Fix wave dispatched (one Sonnet implementer): I1, I2, I3, M1, M2, M3, M5, M6 + M4 doc wording.
Final fix wave: 24515cc8 (I1 I2 I3 M1 M2 M3 M5 M6 + M4 doc wording; 38 trust / 88 report / 201 py). Scoped re-review dispatched.
Final fix wave re-review: approved (all 8 addressed, no new breakage). Branch complete at 24515cc8.

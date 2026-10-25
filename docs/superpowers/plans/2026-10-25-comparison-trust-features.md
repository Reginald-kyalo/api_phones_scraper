# Comparison trust features — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]` syntax.

**Goal:** Make the quality of a comparison visible on the product page: why a cheap offer is cheap, which listings were left out of the like-for-like comparison, how many tracked shops are being compared, and a reference the shopper keeps after reporting a problem.

**Why (owner decision 2026-10-25):** of eight proposed ideas, these four are backed by data the catalogue already holds. Saved snapshots and requirement-based alerts need accounts (disabled for launch); warranty handoff reminders need warranty data the rows do not carry; merchant tools are a business decision. Those four are deferred, not rejected.

**Architecture:** Pure derivation functions in `src/app/lib/` over the existing public cluster detail projection (no new API fields unless listed), rendered by small components on the existing product/cluster page. Copy says only what the data holds; an unexplained price difference stays unexplained.

**Tech stack:** existing React/TypeScript app in `dealsonline_ui_ux_mock/`, `node --test` for pure functions (same harness as `scripts/tests/*.test.mjs`), `npm run type-check`, `npm run check:design`.

**Baseline:** the branch head after the production-foundation phase-one tasks. Read the public detail projection in `functions/lib/cataloguePublic.ts` and the detail page components under `src/app/features/clusters/` before designing.

## Global Constraints

- Never read a served store count; derive every count from the offers actually rendered (the repo's standing rule).
- `configs[].facet_value` is `int` for storage and `str` for cpu: compare as strings.
- The cluster-level `best_by_store` mixes configurations; `configs[].by_store` is the like-for-like set. Explanations must be computed per selected configuration.
- Never invent a reason. A line is shown only when a data field supports it (condition, configuration facet, stale observation). If nothing supports it, show "We could not tell why this offer is cheaper." or nothing — never a guess.
- No new network requests; everything derives from data the page already has (initial embedded data or the detail response).
- Existing copy rules (`DESIGN_RULES.md`, `BEHAVIORAL_PRINCIPLES.md`) apply; run `npm run check:design`.
- Each task: tests first (fail, then pass), then `npm run type-check`.

## Task 1 — Explain an unusually cheap offer

**Create:** `src/app/lib/offerExplanation.ts`, `scripts/tests/offer-explanation.test.mjs`.
**Modify:** the component that renders one shop offer row for the selected configuration.

**Interface:** `explainOffer(offer, config, cluster, now): OfferExplanation[]` where each item is `{kind: 'condition'|'configuration'|'stale'|'unknown', text: string}`. An offer is "unusually cheap" when its price is below the median of the configuration's priced offers by at least 15% AND there are ≥2 priced offers. Below that threshold the function returns `[]`.

- [ ] Tests: used/refurbished offer → `condition` line ("This listing is used." / "This listing is refurbished." using the offer's condition field, never inferred from price); an offer whose own facet differs from the selected configuration → `configuration` line naming the offer's value ("This price is for the 128 GB version."); an observation older than the page's freshness threshold → `stale` line with the observed date; none of the above → one `unknown` line; not cheap enough → `[]`; single priced offer → `[]`.
- [ ] Implement; render the lines under the offer row as small muted text with an accessible group label; no badge, no colour that implies a verdict.
- [ ] `npm run type-check`, tests pass, `check:design` passes.

## Task 2 — Show which listings were excluded from the like-for-like comparison

**Create:** `src/app/lib/excludedOffers.ts`, `scripts/tests/excluded-offers.test.mjs`.
**Modify:** the configuration comparison section.

**Interface:** `excludedFromConfig(cluster, config): ExclusionSummary` → `{total: number, reasons: Array<{kind: 'other_configuration'|'used'|'unpriced'|'out_of_stock', count: number}>}` over the cluster's offers that are NOT in `config.by_store` (one offer per store per configuration; count offers, not stores).

- [ ] Tests: cluster with 2 configurations → the other configuration's offers count as `other_configuration`; a used offer in the same configuration counts as `used`; offers with no price → `unpriced`; out of stock → `out_of_stock`; an offer with two reasons is counted once under the first matching reason in the order listed; everything in `by_store` → `total 0`.
- [ ] Implement; render a collapsed disclosure under the comparison: "N other listings were left out of this comparison" expanding to the reason counts in words ("2 are a different storage size, 1 is a used item"). Hidden when `total` is 0. The disclosure is secondary (collapsed by default, keyboard operable).
- [ ] Type-check, tests, design check.

## Task 3 — Coverage line without overstating it

**Create:** `src/app/lib/coverageLine.ts`, `scripts/tests/coverage-line.test.mjs`.
**Modify:** the comparison header.

**Interface:** `coverageLine(pricedOffers, now, staleAfterDays): {text: string, recent: number, older: number}` with text like "3 matching offers from the shops we track" and, when `older > 0`, a second sentence "2 were checked in the last N days; 1 has an older observation." Counts derive from the offers passed in.

- [ ] Tests: 0 offers → no text (empty string); 1 offer → singular; mixed fresh/stale → both sentences with correct counts; all fresh → one sentence.
- [ ] Implement; render the line once in the comparison header; remove any existing count that is read from a served field rather than derived.
- [ ] Type-check, tests, design check.

## Task 4 — A reference the shopper keeps after a report

**Modify:** `ReportDialog.tsx`, `functions/api/reports.ts`, `functions/lib/reportStore.ts` (from the phase-one plan), `migrations/` (new additive migration), `scripts/tests/report-store.test.mjs`.
**Create:** `functions/api/reports/[id].ts` (GET status), `src/app/features/clusters/components/ReportStatus.tsx`, `scripts/tests/report-status.test.mjs`.

**Interfaces:**
- Migration `0002_report_status.sql`: nullable `status` on `reports` (`received` | `reviewed` | `resolved`), nullable `outcome` (free text, operator-written, ≤ 300 code points), `status_updated_at`. Default for new rows: `received`.
- `GET /api/reports/:report_id` → `{ok:true, report_id, status, outcome: string|null, status_updated_at}` with `Cache-Control: no-store`; 404 JSON for unknown id; no report content, note, URL or facets are returned. The id is a server-generated opaque reference (reuse the existing `report_id`).
- After a validated receipt, the dialog shows "Your reference: <id>" with a copy control and a link to `/report/<id>`, a page that renders the status timeline Received → Reviewed → Resolved with the operator outcome text when present and "We have not reviewed this yet." otherwise.

- [ ] Tests: migration leaves existing rows readable with `status` null (treated as `received` on read); GET returns status for a known id and 404 for unknown; GET never includes note/page_url/facets; response is no-store.
- [ ] Implement store read, endpoint, migration, dialog reference and status page. Status changes are operator-only (no public write path); document in `DEPLOY.md` how an operator updates status with wrangler d1 execute.
- [ ] Browser check (Playwright or the existing harness): submit a synthetic report locally, open the reference link, see "Received".
- [ ] Type-check, `npm run test:reports`, design check.

## Task 1b — Per-offer evidence fields (inserted 2026-10-25 by controller ruling)
See `.superpowers/sdd/2026-10-25-comparison-trust-features/task-1b-brief.md` (copied here for the record): enrich `best_by_store` / `configs[].best_by_store` offers in `app/api/routes/clusters.py::_cluster_view` with `condition`, `likely_used`, `observed_at`, `stock_status`, `delisted` from the matching member row, and `facet_value` per config; pass through `clusterTypes.ts` and `cataloguePublic.ts`; recapture the demo dataset if the API can run locally. Tasks 1–3 depend on it.

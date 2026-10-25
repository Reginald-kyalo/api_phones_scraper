# Production baseline, evidence and file register

**23 October 2026 · Current source:** `124c14f883189ee3f3bca719117ef8db3da80f40`.

This register supports the [production proposal](/home/reginaldkyalo/codes/api_phones_scraper/docs/production-readiness-2026-10-23/proposal.md). It separates current checks from earlier review evidence and external settings that were unavailable. No website source or deployment configuration was changed in this review.

## Checks run in this pass

| Check | Result | Interpretation |
|---|---|---|
| Current catalogue request and bootstrap test files | Both files passed; runner reported 2 file-level tests | Covers request validation/storage behaviour and initial-data serialisation contract; not full browser acceptance |
| Frontend TypeScript check | Passed | Current compile-time contract is consistent |
| Pages Functions TypeScript check | Passed | Function types compile |
| Design-token check | Passed | Token rules pass; no claim of measured contrast or WCAG conformance |
| Hygiene, capture and phone-navigation Python suites | **178 passed, 3 failed**, one warning | Current release baseline is not fully green |
| Offline report handler probes | Three uncaught type errors; partial-write and webhook-acknowledgement weaknesses confirmed | Needs remediation before report intake is treated as production-ready |

The Node tool runs printed “Failed to create stream fd: Operation not permitted” diagnostics, then the catalogue runner and design check completed successfully with exit code 0. Both TypeScript invocations also completed with exit code 0. These diagnostics are recorded rather than silently treating an incomplete run as success.

### Python failures

1. `tests/test_hygiene.py::test_the_projection_surfaces_availability_and_freshness`: a fixture based on 25 July 2026 expects `fresh`, but the projection uses the current clock and returns `stale`. The helper supports an injected clock; the projection test does not supply one. Fix deterministic time handling and separately test freshness transitions. This failure is not evidence that a July price should be called fresh in October.
2. `tests/test_mock_phone_navigation.py::test_phone_navigation_preserves_legacy_category_fallback`: expects a literal redirect to `/browse`; the current source redirects to `/aisle/phones-wearables`. Decide the intended route contract, then align code and test.
3. `tests/test_mock_phone_navigation.py::test_navigation_contract_separates_categories_from_legacy_collections`: expects the removed text “More collections.” Preserve the actual information-architecture requirement with a meaningful assertion rather than blindly restoring old wording.

The warning concerns tar extraction defaults changing in Python 3.14. Review archive extraction safety and runtime compatibility when making the capture pipeline reproducible. The entire Python test suite was not run; no coverage percentage is inferred from this subset.

### Report handler evidence

The [offline harness](/home/reginaldkyalo/codes/api_phones_scraper/docs/production-readiness-2026-10-23/check_reports.mjs) bundles the actual handler and uses fake D1 storage and intercepted `fetch`. No network request or real report submission occurs. [Raw results](/home/reginaldkyalo/codes/api_phones_scraper/docs/production-readiness-2026-10-23/report-checks.json).

| Input/failure | Observed outcome | Required production behaviour |
|---|---|---|
| JSON `null` | Uncaught `TypeError` reading scope | Defined 400 JSON response |
| Numeric `scope` | Uncaught `TypeError` calling trim | Type validation before field access |
| Numeric facet kind | Uncaught `TypeError` calling trim | Type validation before field access |
| No report sink configured | 503 JSON | Correct failure classification; release configuration must prevent it during normal use |
| Facet batch fails after parent insert | 500, but fake storage already records one parent write | Atomic persistence and idempotent retries |
| Primary webhook returns HTTP 200 HTML error | Site returns 201 success | Validated durable acknowledgement contract or D1 record of truth |

The D1 failure probe demonstrates the handler's sequence and lack of a transaction spanning both operations. It is not a real D1 outage or a claim that every report is partially written. The webhook test demonstrates permissive acknowledgement handling; it does not assert that a particular deployed webhook is returning errors.

## Current improvements and remaining checks

The latest commit contains private-data build guards, validated catalogue parameters, public projections, noncached catalogue errors, embedded page data, crawler access to the catalogue API, versioned R2 publishing and removal of the hidden export-link/fake-row approach. Preserve these improvements.

Their deployment and operational behaviour still need evidence:

- The build guard depends on `CF_PAGES`, and `ALLOW_PUBLIC_CATALOGUE=1` can override it. Confirm production and manual-deploy policy cannot accidentally expose raw fixtures.
- Upload activation occurs after successful object writes, but `--activate` does not inspect the target before switching. Version names can be reused, and the default digest is based on the manifest rather than every data object's content. Add immutable content-version verification and safe activation tests.
- The API's active pointer is refreshed separately from static HTML. Coordinate publication and test old HTML, new API data and version switches rather than assuming they remain coherent automatically.
- Initial data validates its wrapper/path and provides each response once. The current test does not establish rendered resilience across every route, changed query, expired snapshot or navigation/refresh failure.
- Documentation still describes valid single-shop routes falling through to the 404 shell. Decide status/indexability deliberately.
- Policy pages explicitly defer legal entity, host/logging details, retention and provider cookie facts. Brand source still labels the domain/mailbox as placeholders. Verify real ownership and operation before replacing that text.
- The report schema still contains obsolete honeypot comments/table definitions. Review actual retained data and retention requirements; do not assume removing a UI link erases earlier logs.

## File register and review comments

These are the principal files to check for this programme, not a claim that every repository file was audited. All links use absolute paths. New future CI/runbook/test files should be specified in each work package's implementation plan.

| File | Area and review comment |
|---|---|
| [README.md](/home/reginaldkyalo/codes/api_phones_scraper/README.md) | Reconcile outdated static-only, catalogue-size, SEO and operational claims with current architecture |
| [PRODUCTION_READINESS.md](/home/reginaldkyalo/codes/api_phones_scraper/PRODUCTION_READINESS.md) | June historical assessment; do not reuse obsolete claims of fake/UK-only data or virtually no tests |
| [DEPLOY.md](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/DEPLOY.md) | Release procedure, public-data override, actual domain/bindings, report service and rollback ownership |
| [Azure workflow](/home/reginaldkyalo/codes/api_phones_scraper/.github/workflows/azure-deploy.yml) | References absent `Dockerfile.azure`; establish the actual supported release pipeline |
| [package.json](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/package.json), [package-lock.json](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/package-lock.json) | Runtime support, reproducible installs, required CI commands and dependency inventory |
| [requirements.txt](/home/reginaldkyalo/codes/api_phones_scraper/requirements.txt) | Python dependency/runtime policy, transitive reproducibility and Motor migration if backend is adopted |
| [capture_demo_dataset.py](/home/reginaldkyalo/codes/api_phones_scraper/scripts/capture_demo_dataset.py) | Real observation times, export completeness, safe artifacts and production data-quality gates |
| [hygiene.py](/home/reginaldkyalo/codes/api_phones_scraper/app/api/hygiene.py) | Freshness, availability, seller normalisation and deterministic clock-based testing |
| [clusters.py](/home/reginaldkyalo/codes/api_phones_scraper/app/api/routes/clusters.py) | Serving projections, comparable offers, freshness and stable identity contract |
| [cataloguePublic.ts](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/lib/cataloguePublic.ts) | Public fields must minimise internal data without losing shopper-facing evidence/report context |
| [catalogueQueries.ts](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/lib/catalogueQueries.ts) | Search correctness, list bounds, combined response sizes and expensive query paths |
| [catalogueRequest.ts](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/functions/lib/catalogueRequest.ts) | Retain strict validation; expand boundary/failure regression coverage where needed |
| [catalogue handler](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/functions/api/catalogue/[[op]].ts) | Private storage, status codes, active-version/cache isolation, concurrent version transitions and request controls |
| [postbuild.mjs](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/scripts/postbuild.mjs) | Enforce production-safe output on every supported deploy path; static headers |
| [prepare-demo-dataset.mjs](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/scripts/prepare-demo-dataset.mjs) | Artifact integrity, safe extraction, reproducibility and confidential URL handling |
| [upload-catalogue.mjs](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/scripts/upload-catalogue.mjs) | Verify immutable versions, target completeness, activation/rollback and HTML/API coherence |
| [prerender.ts](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/scripts/prerender.ts) | Product coverage, real 404 behaviour, canonicals, structured data and versioned initial content |
| [initialCatalogueData.ts](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/lib/initialCatalogueData.ts), [api.ts](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/lib/api.ts) | Startup, path/query identity, old payloads, retry timing and retaining usable information |
| [ClusterPricesPage.tsx](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/pages/ClusterPricesPage.tsx) | Selected configuration, price basis, condition, seller handoff, accessibility and failure resilience |
| [SearchPage.tsx](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/pages/SearchPage.tsx), [CatalogueBrowsePage.tsx](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/pages/CatalogueBrowsePage.tsx), [DemoShelfPage.tsx](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/pages/DemoShelfPage.tsx) | Consistent scope, refinements, counts, pagination and navigation restoration |
| [PhoneCategoryPage.tsx](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/pages/PhoneCategoryPage.tsx), [CatalogueCategoriesPage.tsx](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/pages/CatalogueCategoriesPage.tsx) | Resolve tests versus intended navigation and information architecture |
| [format.ts](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/lib/format.ts) | 30-day stale display threshold versus the new operational freshness policy; truthful price/savings labels |
| [useLocalStorage.ts](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/hooks/useLocalStorage.ts) | Blocked/full/corrupt storage, schema migration and exact selected product identity |
| [AuthContext.tsx](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/context/AuthContext.tsx) | Accounts intentionally disabled; require feature-specific acceptance before changing that |
| [PriceAlertDialog.tsx](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/features/alerts/components/PriceAlertDialog.tsx) | Preserve honest browser-only price-target wording until real notifications exist |
| [reports.ts](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/functions/api/reports.ts), [schema.sql](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/schema.sql) | Type/body validation, atomic writes, idempotency, sink acknowledgement, retention and migrations |
| [ReportDialog.tsx](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/features/clusters/components/ReportDialog.tsx) | Exact selected-offer context, preserved input, acknowledgement and accessible errors |
| [brand.ts](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/lib/brand.ts), [LegalPage.tsx](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/pages/LegalPage.tsx) | Verified domain/mailbox/operator, actual processors/retention and accurate commercial claims |
| [DESIGN_RULES.md](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/DESIGN_RULES.md), [AdSlot.tsx](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/components/ads/AdSlot.tsx) | Theme/accessibility parity, neutral hierarchy, real paid-creative limits and disclosure |
| [app/main.py](/home/reginaldkyalo/codes/api_phones_scraper/app/main.py) | Conditional backend review: development CORS override, scheduler separation and genuine dependency readiness |
| [app/routes/user.py](/home/reginaldkyalo/codes/api_phones_scraper/app/routes/user.py), [price_alerts.py](/home/reginaldkyalo/codes/api_phones_scraper/app/routes/price_alerts.py), [payment.py](/home/reginaldkyalo/codes/api_phones_scraper/app/routes/payment.py) | Future feature-specific security/operations reviews; not audited or approved for activation by this proposal |
| [catalogue-request.test.mjs](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/scripts/tests/catalogue-request.test.mjs), [catalogue-bootstrap.test.mjs](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/scripts/tests/catalogue-bootstrap.test.mjs) | Preserve passing contracts; add real build/browser/publication acceptance |
| [test_hygiene.py](/home/reginaldkyalo/codes/api_phones_scraper/tests/test_hygiene.py), [test_capture_demo_dataset.py](/home/reginaldkyalo/codes/api_phones_scraper/tests/test_capture_demo_dataset.py), [test_mock_phone_navigation.py](/home/reginaldkyalo/codes/api_phones_scraper/tests/test_mock_phone_navigation.py) | Reconcile current failures and retain meaningful data/navigation regressions |

## Verification boundaries

Not verified in this pass: the new deployment on the public website; Cloudflare account/rules/private bucket settings; real crawler behaviour or indexing; full accessibility/manual device coverage; field performance; load capacity; source prices at retailers; upstream scheduler/matcher execution; mailbox delivery; legal applicability; backups; actual D1/webhook service; optional backend auth/payments; dependency vulnerability status.

Lack of evidence is not proof a dashboard feature or operational process is absent. These are explicit acceptance tasks. The prior review's live/browser findings refer to its older baseline and must be retested against the new release.

## Reproduce the local checks

From `/home/reginaldkyalo/codes/api_phones_scraper`, the Python subset and report harness are:

```bash
PATH=/home/reginaldkyalo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH apienv/bin/python -m pytest tests/test_hygiene.py tests/test_capture_demo_dataset.py tests/test_mock_phone_navigation.py -q
/home/reginaldkyalo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node docs/production-readiness-2026-10-23/check_reports.mjs
```

From `/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock`, use the installed Node 24 runtime to run `npm run test:catalogue`, `npm run type-check` and `npm run check:design` (or their direct Node commands). No clean dependency installation, complete production rebuild, browser run or deployment was performed for this pass. Future implementation must add those to the release evidence.

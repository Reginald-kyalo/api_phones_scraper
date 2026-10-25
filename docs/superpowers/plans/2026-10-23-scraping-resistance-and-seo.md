# Scraping Resistance and SEO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove public bulk-catalogue downloads, constrain abusive catalogue access and preserve useful search-visible pages and normal shopping.

**Architecture:** Keep prerendered public HTML and bounded public API responses backed by private, versioned R2 data. Use page-sized initial data for resilient rendering. Add observation before selective rate enforcement, using trusted crawler signals and an account-supported counter mechanism.

**Tech Stack:** React 18, React Router 7, TypeScript, Vite 6, Cloudflare Pages Functions, R2; Node 24 for the supplied audit harnesses, Python/Playwright for browser checks.

**Spec:** [Scraping resistance with search visibility](/home/reginaldkyalo/codes/api_phones_scraper/docs/scraping-seo-review-2026-10-23/proposal.md)

**Status (23 October 2026):** the code-only parts of Tasks 2, 3 and 4 and the recovery copy of Task 5 are implemented on `claude/project-thread-wt66oa` (commit after `ee95d5bd`); Task 1, the observation period, Task 6 and Task 7 need the Cloudflare account and remain open.

Done in code: `scripts/postbuild.mjs` fails a Cloudflare Pages build (`CF_PAGES`) that would publish `/demo/` unless `ALLOW_PUBLIC_CATALOGUE=1`, writes no `/demo/*` cache rule in API mode, and asserts no JSON or archive remains in `dist` (only `shop-icons/index.json`); `scripts/upload-catalogue.mjs` uploads under `versions/<capture date>-<manifest hash>/` and activates via `current.json` only when every file landed (`--activate <v>` rolls back); `functions/lib/catalogueRequest.ts` is the pure parser (400 before any read; 404 for extra segments/unknown ops; limits, lengths, allowlists and min ≤ max as specified); `functions/api/catalogue/[[op]].ts` reads the versioned prefix, distinguishes 404 (missing object) from 503 (storage error or missing binding off localhost), sets `Cache-Control: no-store` on errors, and serves the public projections from `src/app/lib/cataloguePublic.ts` (manifest without shard/bucket/source metadata; detail without `mvp_merged_from`, `mvp_rule`, `mvp_generated`, `category_path`); the prerender embeds `<script type="application/json" id="catalogue-initial">` with the page's own responses (product: manifest + detail; category/brand: first browse page; shelf: tree + first page; deals: first page; home: the six deals and six rows per rail it displays) and `src/app/lib/api.ts` answers the first requests from it (`src/app/lib/initialCatalogueData.ts`); `robots.txt` allows `/api/catalogue/` in the search and default groups; trap rows are planted only when the bulk card index is public; `src/app/lib/loadError.ts` gives pages distinct 404 / 429 ("Please wait a moment before trying again.", `Retry-After` parsed) / 503 / failure messages; `npm run test:catalogue` (`scripts/tests/*.test.mjs`, node:test on Node 20) holds the contract and bootstrap tests; `DEPLOY.md` carries the release gate, alternate-host notes and observe-first guidance. Verified: type-check, 12/12 contract tests, API-mode build (6,186 pages, no data files in dist), and a browser run of the API-mode build with no catalogue function at all: product, home, category, deals and shelf pages render from embedded data with zero `/api/catalogue/` requests.

Deliberately not done: the hidden `/data/catalogue-export` link and trap definitions stay (traps are inert in API mode; the honeypot is documented as low-confidence telemetry, never an automatic ban); single-shop products still boot from the 404 shell (a Function catch-all would shadow the prerendered files); no `cataloguePolicy.ts`, because no counter or verified-bot signal exists to feed it until Task 1's inventory; no edge Cache API layer. Reviewed commit was `ee95d5bdf12f0d460156483c14fc650ea0ea4700`.

## Global Constraints

- Public product prices remain visible to shoppers and search crawlers; private dataset files never become a fallback for production availability.
- At most 96 combined product rows per list response; one product per detail response.
- Search query maximum 256 Unicode code points; ID maximum 512; slug maximum 128.
- Limit must be a finite positive integer and clamps to 96; page/offset must be finite nonnegative integers no greater than 1,000,000.
- Invalid input returns 400; unknown operations/resources 404; storage failure 503; limiting 429 JSON with `Retry-After`. Errors use `Cache-Control: no-store`.
- Never infer verified crawler identity from User-Agent alone. Private-data boundaries apply to every client.
- Do not challenge public SEO pages, required static assets, robots.txt or sitemap.xml by default.
- Observe at least seven representative days before enforcing new behavioural limits. The 30-request burst/two-per-second model is an experimental starting point, not an approved production threshold.
- No new paid service until account capability and measured need justify it. No production load test without an explicitly scoped, authorised staging/production test window.
- Keep existing shopper-facing source evidence, condition warnings, price timestamps and comparison functions.

## Review Focus

- Shared mobile IPs, cookie rejection and multiple tabs: normal shoppers retain access and recover without loops (Tasks 5–6).
- R2 upload failure, stale dataset version and missing bindings: no partial catalogue or public fallback (Task 2).
- Encoded IDs, Unicode searches, duplicate parameters and non-finite values: validation is strict without breaking legitimate links (Task 3).
- API outage, slow refresh and stale HTML: meaningful page content survives and its age is clear (Task 4).
- Alternate hosts, cached requests and spoofed crawler headers: no bypass of private data or enforcement boundaries (Tasks 1, 6–7).

## Files and responsibilities

All paths below are absolute. Files marked **new** are proposals, not existing implementation.

| File | Responsibility / review comment |
|---|---|
| [DEPLOY.md](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/DEPLOY.md) | Correct public-data defaults, crawler classification, IP-limit advice and alternate-host checklist |
| [postbuild.mjs](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/scripts/postbuild.mjs) | Fail unsafe production builds; remove raw files before static publication |
| [prepare-demo-dataset.mjs](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/scripts/prepare-demo-dataset.mjs) | Protect artifact URLs/logging; preserve explicit local-only fixture use |
| [upload-catalogue.mjs](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/scripts/upload-catalogue.mjs) | Upload immutable dataset versions and verify completeness before activation |
| [catalogue handler](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/functions/api/catalogue/[[op]].ts) | Validate requests, use private storage, project responses, distinguish errors and enforce selected policy |
| [catalogueQueries.ts](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/lib/catalogueQueries.ts) | Preserve bounded responses and avoid unnecessary full-query work |
| [demoSource.ts](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/lib/demoSource.ts) | Version-aware private loading; remove fake-product filtering when injection is removed |
| [api.ts](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/lib/api.ts) | Read validated initial data, handle JSON errors and Retry-After, preserve API/local contracts |
| [prerender.ts](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/scripts/prerender.ts) | Emit page-sized initial data, correct robots/canonicals/status coverage; remove fake rows and hidden link |
| [trap-products.json](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/scripts/trap-products.json) | Retire fake production product definitions |
| [Footer.tsx](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/components/layout/Footer.tsx) | Remove hidden export link |
| [data catch-all](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/functions/data/[[path]].ts) | Retain plain 404 if needed; stop treating a hit as proof of scraping |
| [ClusterPricesPage.tsx](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/pages/ClusterPricesPage.tsx) | Seed product state synchronously; retain dated data when refresh fails |
| [CatalogueBrowsePage.tsx](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/pages/CatalogueBrowsePage.tsx) | Seed category listing and keep navigation/filter behaviour |
| [HomePage.tsx](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/pages/HomePage.tsx) | Seed the displayed home listing only |
| [DealsPage.tsx](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/pages/DealsPage.tsx) | Keep the initial deals page useful without a mandatory network refill |
| [DemoShelfPage.tsx](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/pages/DemoShelfPage.tsx), [DemoAislePage.tsx](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/pages/DemoAislePage.tsx), [PhoneCategoryPage.tsx](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/pages/PhoneCategoryPage.tsx) | Inventory each emitted route's data needs; seed only the visible shelf/category payload |
| [SearchPage.tsx](/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/pages/SearchPage.tsx) | Keep search noindex policy and provide a clear temporary-limit recovery state |
| `/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/functions/lib/catalogueRequest.ts` **new** | Pure request parser with tagged validation errors |
| `/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/lib/cataloguePublic.ts` **new** | Shared public types and field projections; no storage layout |
| `/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/src/app/lib/initialCatalogueData.ts` **new** | Safe page-data parsing and exact route/query matching |
| `/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/functions/lib/cataloguePolicy.ts` **new** | Pure policy decision based on trusted signals and counter results |
| `/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/scripts/tests/` **new tests** | Build, response, bootstrap and policy regression tests described below |
| `/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/scripts/tests/catalogue-rendering.py` **new** | Browser assertions for initial HTML, refresh failure and recovery |

Dashboard rules, R2 public-access settings, custom domains and preview restrictions live outside these files. Record their actual identifiers and rollback steps in a deployment checklist; do not imply editing `_redirects` alone protects Functions.

## Task 1 — Confirm the deployment boundary

- [ ] Record the intended production hostname, owning Cloudflare zone, Pages project, plan, current rules, R2 bindings, public bucket settings, production alias and known preview/older deployment URLs. Do not export secrets.
- [ ] Resolve whether `sokopulse.co.ke` is ready to be the canonical host. Verify its routing and Search Console property before changing canonicals or redirecting the reviewed site.
- [ ] Capture a small baseline of status, robots, sitemap, rendered product data and normal catalogue requests. Use the bounded audit harness, not an unrestricted crawl.
- [ ] Document the exact available verified-bot fields, rate-counting dimensions, counting periods and skip behaviour. Choose a supported enforcement mechanism only after this inventory.
- [ ] Gate: every public data path and deployment alias has an owner and test case. Record unresolved account access as a release blocker, not as a code defect.

## Task 2 — Enforce private, versioned catalogue publishing

- [ ] Add `scripts/tests/catalogue-build.test.mjs` covering a production build without API mode, a leaked raw JSON/archive fixture, absent R2 binding and interrupted upload. Run it with Node 24 `node --test`; expect failures against current behaviour.
- [ ] Introduce `CATALOGUE_DEPLOYMENT=production` as an explicit build/runtime configuration. In that mode require `VITE_CATALOGUE=api` and a valid HTTPS `SITE_URL` at build time; require `CATALOGUE` and `CATALOGUE_VERSION` at runtime. Local fallback requires an explicit development setting.
- [ ] Add postbuild assertions that raw catalogue files and archives are outside `dist`. Permit the unrelated `shop-icons/index.json` manifest. Do not delete all JSON indiscriminately.
- [ ] Upload objects beneath `versions/<CATALOGUE_VERSION>/`, then verify the manifest and all expected object keys/checksums. Publish the Pages deployment configured for that version only after completeness is confirmed. A failed upload cannot activate that version.
- [ ] Include the version in loader/cache identity so a warm process cannot mix versions. Missing binding/object infrastructure returns a noncached 503; a valid unknown product remains 404.
- [ ] Remove fake row injection, its hash-based UI filter and the hidden export link together. Keep the obsolete export route a plain 404 or remove it; do not add automatic IP bans. Add a build assertion that no defined trap ID is present in the resulting catalogue or HTML.
- [ ] Run the tests and an isolated API-mode build. Confirm a coherent private dataset, no raw catalogue in public output and retained HTML/sitemap counts. Commit the independently passing change if implementation workflow calls for commits.
- [ ] Gate: staging direct-bucket URLs and known alternate-host raw-data URLs cannot retrieve catalogue files; rollback selects a previous private version, never public assets.

## Task 3 — Define and enforce the public API contract

- [ ] Add `scripts/tests/catalogue-request.test.mjs` and `catalogue-public.test.mjs`. Promote the audit cases into assertions and add Unicode length, encoded IDs, duplicate/conflicting parameters, empty input, negative prices, invalid sort, combined-array limits and storage-failure cases. Run to establish failing tests.
- [ ] Implement `parseCatalogueRequest(url, opSegments)` as a pure tagged-result parser in `catalogueRequest.ts`; reject extra path segments, conflicting duplicate recognised parameters and the invalid inputs specified in Global Constraints. Keep successful large integer limits clamped to 96, matching the audit contract.
- [ ] Inventory fields consumed by the app before defining `PublicManifest`, `PublicProductSummary` and `PublicProductDetail` in `cataloguePublic.ts`. Remove source collection names, shard metadata and unused internal merge/source identifiers. Keep displayed shop titles, warnings, history and provenance needed to explain comparisons.
- [ ] Return only those projections from all operations and use them for initial page data. Check the aggregate row limit across `results` and `plain`; do not remove total counts needed for pagination.
- [ ] Separate validation/not-found/storage errors, and set noncacheable error headers. Instrument tests to assert zero storage reads for inputs rejected before lookup.
- [ ] Normalise cache keys with operation, every result-changing parameter and catalogue version. If edge caching is added, place policy evaluation before the cache hit path; do not cache 400/429/503 responses as successes.
- [ ] Run both new test files, the existing catalogue audit, and `npm run type-check` from `/home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock`. Gate: all hardening contracts pass and public projections retain shopper evidence.

## Task 4 — Preserve content through browser startup and API failure

- [ ] Add `scripts/tests/catalogue-bootstrap.test.mjs` covering route/query mismatch, stale version, malformed JSON and a `</script>` value. Add browser cases for product, category, home, deals and each indexed shelf route with no JavaScript, normal JavaScript and failed refresh. Establish failures before implementation.
- [ ] Correct robots generation: add the specific catalogue API allow rule to relevant search/default groups while retaining other private API exclusions. Keep JSON `X-Robots-Tag: noindex`. Test longest-match robots behaviour using a compatible parser or explicit rule fixtures, not a parser that merely accepts the first matching prefix.
- [ ] Emit a safely serialized `<script type="application/json" id="catalogue-initial">` payload containing `{schemaVersion: 1, catalogueVersion, pathname, queries}`. Each query entry has the normalised operation/parameters and its public projected response. Escape `<` and script-sensitive separators; never embed a whole dataset.
- [ ] Implement `readInitialCatalogueData()` and `getInitialCatalogueResponse(op, params)` with schema validation and exact normalised matching. Seed component state synchronously for the rendered route rather than showing an empty replacement while waiting for fetch.
- [ ] Refresh data normally when appropriate. If it fails, retain existing data and timestamp, offer retry, and avoid false “product not found” states. Do not switch to `hydrateRoot` over the current hand-built HTML unless the renderer is first made structurally identical to React; this plan uses initial data instead.
- [ ] Map every prerendered route to its client consumer. Resolve valid product routes omitted by prerender selection: indexable 200 page or intentional 200/noindex page; only genuinely missing items return 404. Keep search combinations out of the sitemap unless intentionally selected.
- [ ] Run bootstrap tests and browser assertions, then rebuild. Gate: title, offers, links and appropriate structured data remain correct after startup and failed refresh; no initial payload contains unrelated catalogue records.

## Task 5 — Build recovery and observation before enforcement

- [ ] Add `scripts/tests/catalogue-recovery.test.mjs` for 429 with valid/missing Retry-After, 503, unexpected HTML responses, repeated retries and simultaneous tabs. Confirm current behaviour does not meet the desired recovery contract.
- [ ] Extend the catalogue error type to carry status and parsed retry timing. Keep valid displayed prices on screen; present “Please wait a moment before trying again.” for a temporary limit, with a retry action after the cooldown. Do not label limiting as a product absence.
- [ ] Stop automatic retry storms. Deduplicate identical in-flight catalogue reads where the existing query layer permits it; do not suppress necessary variant/filter requests.
- [ ] Collect aggregate operation volume, result size, latency, status, cache path and high-level traversal signals. Keep secrets and full request headers out of logs. Set a short documented retention period for raw identifiers, with aggregates retained separately according to operational need.
- [ ] Run policy decisions in observation mode for at least seven representative days. Include cookie-disabled sessions, mobile shared-IP traffic, multiple tabs and known crawl traffic in review. Decide thresholds from observed legitimate request patterns, not the simulation alone.
- [ ] Gate: the team can explain what would be limited, how users recover and how false positives will be noticed. Recovery tests pass before any production enforcement.

## Task 6 — Implement only the selected, supported enforcement mechanism

This task is conditional on Task 1's account inventory and Task 5's measurements. It is intentionally not a claim that a particular Cloudflare subscription feature is available.

- [ ] Select and record one implementation: account-supported WAF rate rules, or an application counter service behind the Pages Function. If session-aware counters are unavailable, do not pretend an IP-only rule is equivalent; use conservative IP observation and defer that part of enforcement until a supported counter is chosen.
- [ ] Add `scripts/tests/catalogue-policy.test.mjs` with spoofed Googlebot, trusted verified search, private paths, cache hits, missing cookies, repeated identities and rotating identities. Include the offline model's known distributed bypass as a limitation, not a failing claim of total prevention.
- [ ] Implement `decideCatalogueAccess({routeClass, verifiedSearch, counterResult, mode})` returning allow, observe or limit with retry seconds. Crawler verification and counter results must originate from trusted edge/server infrastructure, not arbitrary request headers or a client-supplied boolean.
- [ ] Exempt verified search only from the applicable public catalogue throttle. Never exempt raw-data/private boundaries, and do not apply an unconditional allow to all verified bots. Keep HTML/robots/sitemap/assets outside this catalogue limiter.
- [ ] Apply checks before expensive data work and before cached catalogue delivery. Return JSON 429 with Retry-After/no-store. Keep a configuration switch for immediate enforcement rollback.
- [ ] If separately justified for abusive report submissions, add Turnstile with mandatory server-side validation to that write route. Do not add it to ordinary catalogue GETs or SEO entry pages by default.
- [ ] Run policy tests and controlled staging requests against the real chosen mechanism. Gate: counters, cooldowns, cached requests, verified-crawler exceptions and recovery actually work on the deployed platform.

## Task 7 — Validate deployment, then stage enforcement

- [ ] Configure the canonical domain and supported production `pages.dev` redirect preserving paths/query strings. Protect preview deployments separately. Test Function routes directly because static `_redirects` does not cover them.
- [ ] Check raw files, archives and direct bucket access through production, known preview/old deployment aliases and any remaining public artifact location. Record any copies that cannot be recalled.
- [ ] Run no-JavaScript and rendered checks on representative product/category pages. Verify robots, canonicals, sitemap, JSON-LD and HTTP statuses. Use Search Console URL Inspection and actual crawl logs on the real domain; do not substitute a fake Googlebot User-Agent test.
- [ ] Test known legitimate use, multiple shoppers behind one IP, missing cookies, delayed API, refresh 429/503 and accessible retry controls. Use a bounded staging test window for rate scenarios; do not stress the public site casually.
- [ ] Enable only the narrowly selected enforcement rule, observe shopping/crawl/error metrics, and stop on the proposal's rollback conditions. Keep raw data private through rollback.
- [ ] Update the deployment checklist with rule identifiers, dataset version, measured thresholds, verification evidence, rollback instructions and remaining limitations. Commit final documentation if implementation is authorised.

## Baseline commands already available

These scripts belong to this review. They do not implement the future controls. Run from `/home/reginaldkyalo/codes/api_phones_scraper` with installed dependencies. Local build outputs are disposable; `stage.json` records their path.

```bash
apienv/bin/python docs/scraping-seo-review-2026-10-23/build_isolated.py
apienv/bin/python docs/scraping-seo-review-2026-10-23/check_build.py
/home/reginaldkyalo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node docs/scraping-seo-review-2026-10-23/test_catalogue_contract.mjs
apienv/bin/python docs/scraping-seo-review-2026-10-23/test_policy_model.py
apienv/bin/python .agents/skills/webapp-testing/scripts/with_server.py --server '/home/reginaldkyalo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node docs/scraping-seo-review-2026-10-23/serve_isolated.mjs' --port 8765 -- apienv/bin/python docs/scraping-seo-review-2026-10-23/test_rendering.py
```

The contract audit reports proposed-contract failures in JSON and does not currently fail its process exit status. Promote those checks into strict regression tests during Task 3; a zero exit code from the audit is not proof that all contracts passed.

The future `scripts/tests/*.test.mjs` files are to be created by the implementation tasks and run using Node 24 `node --test <absolute-file-path>`. Use an esbuild import harness for TypeScript, matching the existing audit, rather than assuming plain Node can load every Vite-specific module.

## Plan review

The plan separates immediately useful exposure removal from observation-dependent behavioural enforcement. It covers build output, storage, public response shape, browser startup, recovery, crawler identity and alternate hosts. Account configuration and real crawler validation remain explicit release gates; offline tests cannot satisfy them. Execution requires a later implementation request, since the present scope is review and proposals only.

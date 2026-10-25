# SokoPulse production-readiness proposal

**23 October 2026 · Proposal only · Baseline: `124c14f883189ee3f3bca719117ef8db3da80f40`**

## Decision proposed

Prepare SokoPulse for a **controlled, comparison-first public launch**: reliable Kenyan product comparisons, clear price dates and conditions, useful search, trustworthy shop handoffs, local favourites/comparisons/price targets, and a working correction channel.

Keep accounts, cross-device sync, notification alerts, subscriptions/payments and paid placements disabled until each has its own operational acceptance evidence. Production quality does not require enabling every feature in the repository. It requires every exposed feature to work, every claim to be supported, and a team able to detect and correct failures.

Retain the current React/Vite frontend, prerendered pages, Pages Functions and private R2 catalogue. Treat data collection/matching, publication, public serving and optional account services as separate responsibilities. A framework rewrite is not justified by the evidence collected so far.

**Current verdict:** there is a credible launch foundation, but the evidence does not support calling the website production-ready yet. The main gates are catalogue correctness and freshness, deployed configuration, reliable report storage, release automation, accessibility/performance verification, operational ownership and complete business/privacy information.

This proposal adds no production code or configuration. Its recommendations and numerical targets are proposed operating choices, not claims that the site already meets them.

## 1. What has changed since the earlier reviews

The latest commit implements substantial work from the scraping/SEO proposal: production-oriented private-data safeguards, request validation, smaller public responses, versioned uploads, API-friendly robots rules and embedded initial page data. The new catalogue test files, frontend/Function type checks and design-token check pass locally.

Those findings supersede the older source baseline. The earlier live raw-data exposure and API-blocked rendering failure remain historical evidence, not proof that the new code still behaves that way. Deployment of the latest commit and browser behaviour after it were **not verified in this pass**.

| Area | Current evidence | Production status |
|---|---|---|
| Catalogue API and initial-data contract | New local tests pass | Implemented; deployed and browser acceptance still needed |
| Private data publishing | Guard and versioned uploader present | Configuration, aliases, immutable versions and restore drill still needed |
| Type safety and design tokens | Current checks pass | Useful baseline; not a full functional or accessibility audit |
| Python quality/navigation checks | 178 passed, 3 failed | Release test baseline needs reconciliation |
| Report intake | Local failure probes confirm validation and persistence weaknesses | Launch blocker while reporting is offered |
| Accounts and notifications | Accounts disabled; targets explicitly browser-only | Acceptable for the proposed first launch |
| Business identity and privacy | Placeholder domain/mailbox comments; policy facts explicitly unfinished | Launch blocker until facts and services are confirmed |
| CI/CD | Checked-in Azure workflow references a missing Dockerfile; no current Pages release workflow found in the inspected workflow directory | Dashboard settings may exist; repeatable release evidence is missing |
| Data refresh, matching and service operations | Historical capture and pipeline documentation; no current end-to-end operational verification | Must be demonstrated before making current-price claims |

Detailed findings, file paths and test limitations are in the [baseline and file register](/home/reginaldkyalo/codes/api_phones_scraper/docs/production-readiness-2026-10-23/baseline-and-files.md). The June production assessment and parts of the README are outdated: the current frontend has Kenyan catalogue data, prerendering and a meaningful test suite. They must not be used unchanged as the launch checklist.

## 2. Launch scope and architecture

### First production release

Include search, categories/shelves, exact product/configuration comparison, shop links, disclosed price history where supported, local saved items, local price targets, reporting, help, commercial explanation and complete policies. Keep System / Light / Dark if both themes meet the same acceptance requirements.

Start with the retailer/category subset that passes the data gates. Do not select launch categories merely because their current catalogue count is large. Exclude uncertain comparisons from “lowest comparable price” and savings claims; they can remain clearly labelled individual listings if useful and accurately described.

**Publication boundary:** only approved products/offers enter public search, shelves, counts, API results, structured offers and sitemaps. Approval of individual listings is separate from approval to compare them. A previously valid product excluded from the launch subset keeps a minimal 200/noindex page saying prices are not currently available, with no unapproved prices or offers; its detail API returns 404/not available. Saved links show that unavailable state. Genuinely unknown URLs return 404. Keep the excluded-ID registry private. This is a proposed scope reduction that must be approved at G0; it prevents direct URLs or APIs from bypassing the launch data gate.

### Architecture choice

| Option | Benefit | Cost/risk | Recommendation |
|---|---|---|---|
| Harden the current snapshot/Pages/R2 architecture | Reuses tested work; good public HTML; isolates the public site from scraping jobs | Needs disciplined refresh, versioning and publication | **Use for first launch** |
| Make the existing FastAPI/Mongo service the public runtime for all features | Supports accounts and live server workflows | Adds database, auth, worker, network and operational dependencies | Introduce only for approved features after a separate service review |
| Rewrite the frontend/server framework now | Could support different rendering/update needs | Migration, regressions and delay without addressing matching quality | Defer unless measured limits require it |

The upstream collection/matching system should publish validated releases; it should not run inside a request to the shopping website. The reviewed repository describes that system as a sibling project, which was not audited here. Its owner must demonstrate scheduled operation, permissions, monitoring and recovery rather than relying on this site's tests.

A production release should identify the source commit, dataset content version, schema version, configuration version and migration version. HTML, JSON-LD, initial payloads and the API must agree about the comparison they represent. Keep immutable prior artifacts for rollback.

## 3. Data accuracy, freshness and comparison integrity — first priority

**Required work**

- Define an offer contract: stable product/configuration identity; seller identity and link; KES price; condition; size/capacity/pack; bundle status; availability evidence; delivery/mandatory costs when known; source observation time; and provenance. Dataset capture time must not masquerade as a fresh retailer observation.
- Separate a product family from the selected comparable configuration. Compute price order, shop count, savings, history, report context and saved comparison from the same eligible offers. “Lowest” means lowest among the comparable offers shown, not necessarily lowest across Kenya.
- Maintain category-specific matching rules and a labelled evaluation set. Historical documentation reports substantial variant-merging errors in a demo grocery pipeline; that historic estimate is not a current measured error rate. Re-measure the actual release and quarantine known bad matches.
- Preserve unknowns. Do not infer stock, warranty, seller verification, delivery-inclusive cost or genuine discounts from a title, an image, a low price or a retailer's crossed-out price alone.
- Treat ordinary price spread separately from a verified discount. Keep dates and condition visible on cards, details and saved comparisons. Avoid displaying “deal” or a savings percentage for an ineligible, stale or inconsistent comparison.
- Establish scheduled updates, per-source health, retries with backoff, anomaly detection and a publishing queue. Keep a failed capture from erasing a healthy catalogue. Alert on major count/price shifts and stale retailer feeds.
- Check source usage rights, image permissions and merchant terms. Store/cache images only where permitted; if an image-fetching service is added, allowlist destinations and prevent access to private/internal addresses.

**Proposed starting freshness policy:** observations used in featured deals must be no older than 24 hours; observations used as ordinary current comparisons no older than 72 hours. Older observations may remain as dated recorded prices but cannot drive current savings claims. Unknown observation times are explicitly unknown. These are provisional launch targets to validate against collection capacity; the existing 30-day display threshold is not a sufficient promise of current pricing.

**Acceptance gate:** every launch offer has an explicit observation-time status and price basis. Every offer presented as current meets the adopted freshness target, and all featured deals meet the stricter target. At least 95% of price-bearing offers in the approved launch subset must be fresh enough for current presentation; remaining offers are shown only as dated recorded prices, or withheld if their age is unknown. Human review of at least 200 stratified comparisons across the launch subset plus known edge cases finds no unresolved severe mismatch. Any confirmed mismatch is quarantined and causes review of its matching rule. This sample is a release check, not statistical proof that the entire catalogue is error-free. Record sampling, disagreements and corrections.

## 4. Discovery and shopping journeys

Use one consistent results contract across search, categories and shelves: accurate scope/count, supported filters, explicit sorting, stable pagination and shareable URLs. Test misspellings, exact model numbers, brands, pack sizes, zero matches, unavailable products and obsolete URLs. Introduce a dedicated search engine only if measured relevance/latency cannot be met with the current approach.

Preserve the exact selected configuration when saving, comparing, reporting or returning from a shop. Validate that links lead to the named retailer's relevant listing, use safe URL schemes and do not lose context. Do not describe a link as a verified offer unless it has actually been checked to the stated standard.

All loading, empty, failed, offline, stale and rate-limited states must be distinct. Keep useful loaded data during refresh failure and provide a clear retry. Test localStorage blocked, full, cleared or containing older/corrupt data; a storage failure must not break browsing.

**Acceptance gate:** complete search → filter → exact configuration → compare → retailer handoff and save → return journeys on mobile and desktop, including slow/failed requests and browser Back. No account is required for core comparison. Every visible action has a working outcome or an honest unavailable state.

## 5. Neutral design, wording, themes and accessibility

Keep the existing restrained visual direction. Prioritise the product identity, condition, price, seller and check time over promotional badges. Use “Compare prices across Kenyan shops” as a stable proposition, with concise explanations only where they help interpret uncertainty, commercial relationships or price basis.

Keep **System / Light / Dark**, defaulting to System and remembering an explicit choice. Both themes are supported product surfaces, not optional polish. If one cannot pass the release checks, delay that theme's availability rather than ship known unreadable controls. Preserve natural product-image colours, consistent semantic meanings and visible focus in each mode.

Target **WCAG 2.2 AA** across complete journeys. Combine automated scans with keyboard, zoom, touch and screen-reader checks: accessible search suggestions, named shop links, modal focus/return, error announcements, contrast, visible/unobscured focus and target spacing. Check 320, 390, 768 and 1440 CSS-pixel layouts, 200% text zoom and reflow at 400% zoom. Passing a token check or an automated scanner alone does not establish conformance. [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)

Use at least one Windows screen-reader/browser pair and VoiceOver on a supported Apple device for the core flows. Define the supported browser/device matrix and test actual mobile Safari and Android Chrome; a resized desktop viewport is insufficient.

**Acceptance gate:** no blocking accessibility defects in the core journeys; all known A/AA failures within the supported release scope resolved; no clipped prices or hidden key metadata; both themes pass the same controls and states. Keep a public accessibility contact and an internal issue owner without claiming certification that has not occurred.

## 6. SEO and content lifecycle

Confirm the real production domain and mailbox. Match canonicals, sitemaps, social metadata and redirects to that host. Protect previews, close older raw-data URLs and check Function endpoints on alternate hosts, not only the homepage.

Retest the newly embedded page data through actual browser startup, refresh failure, filtering and navigation. Test HTML, client state and JSON-LD together after a dataset update. A successful unit test for serialisation is not proof that all page types retain their content. Google must be able to retrieve rendering dependencies. [Google JavaScript SEO guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)

Every valid product route needs an intentional HTTP/indexability decision. The current documented fallback gives unprerendered products the 404 shell: useful single-shop pages must not accidentally return 404 solely because they were excluded from a batch. Use 404/410 for genuine absence, permanent redirects for valid replacements, and 200/noindex for deliberately nonindexed valid pages. Decide how stable URLs survive cluster rebuilds.

Define canonical/index rules for filters, sorts, search and pagination to avoid an unbounded crawl space. Include only useful canonical pages in sitemaps; derive modification dates from relevant content changes. Keep stale or missing offers out of misleading structured-data claims. Use product snippets appropriate to a comparison service; do not present the site as the seller or assume merchant-listing eligibility. Validate markup and inspect rendered sample URLs in Search Console. [Google product snippet guidance](https://developers.google.com/search/docs/appearance/structured-data/product-snippet)

**Acceptance gate:** representative launch URLs have correct status, canonical, visible content and matching structured data; sitemap URLs resolve appropriately; actual Search Console rendering checks pass. Indexing and ranking remain monitored outcomes, not guaranteed release-test results.

## 7. Performance, capacity and cost

Measure the real production experience on Kenyan mobile connections and representative lower-powered phones. Use lab tests before launch and privacy-reviewed field measurement during beta. Keep initial results and shop offers usable without loading secondary charts, advertising or large unrelated data payloads.

Target mobile and desktop 75th-percentile **LCP ≤2.5 s, INP ≤200 ms and CLS ≤0.1**. These are field-performance targets; a Lighthouse score or a fast local build cannot certify them. [Web Vitals guidance](https://web.dev/articles/vitals)

Optimise responsive images, dimensions, route splitting, font loading and cache behaviour. Set measured route-specific JavaScript/image budgets after collecting a baseline, and fail unexplained regressions over 10%. Record compression and test conditions so budgets are comparable. Avoid strict arbitrary bundle limits before knowing what the route needs.

For capacity planning, use a declared staging load profile rather than “national scale.” A provisional first profile is 20 catalogue requests/second for 15 minutes plus a 60-request/second one-minute burst, with an agreed mix of searches, details and listings and both warm/cold paths. This is a proposed test, not a measured capacity or user-count estimate. Adjust it to expected launch traffic and the account's limits before execution; never run it against production without a scoped test window.

**Acceptance gate:** no unhandled errors under the approved profile; measured API latency and cost are within the adopted budget; cache behaviour cannot serve wrong filters or cross-user data. Set spend alerts at 50%, 80% and 100% of an owner-approved monthly budget, with a documented response that preserves core comparisons.

## 8. Security, scraping resistance and dependencies

Use an applicable **OWASP ASVS 5.0.0** requirements register with evidence and exclusions, rather than a generic “secure” label. Cover public read APIs, report writes, third-party links, secrets, build artifacts and administrative access now; add account/payment controls when those features are approved. [OWASP ASVS](https://asvs.owasp.org/)

Keep private R2 data private in production and previews. Prohibit `ALLOW_PUBLIC_CATALOGUE=1` in production policy, including manual uploads; the current build guard is tied to the Pages build environment. Validate old deployments, direct bucket access and artifact visibility. Retain bounded API responses and observe traffic before targeted throttling. Preserve verified search access, fair treatment of shared mobile IPs and JSON recovery responses, as detailed in the [scraping/SEO proposal](/home/reginaldkyalo/codes/api_phones_scraper/docs/scraping-seo-review-2026-10-23/proposal.md).

Add verified security headers for both static and Function responses: a tested Content Security Policy, anti-framing policy, MIME protection, referrer policy and appropriate transport security after domain review. Roll CSP out in reporting mode first and account for structured data, images and permitted third parties. Cloudflare's static `_headers` configuration does not apply to Pages Function responses, so test both paths. [Cloudflare header behaviour](https://developers.cloudflare.com/pages/configuration/headers/)

Use least-privilege deployment/service credentials, protected production environments, auditable admin access and secret rotation/revocation procedures. Scan source/history and artifacts without printing secrets. Keep dependency and licence inventories, reproducible lockfiles and a supported runtime policy; triage findings by exploitability and shipped surface rather than blindly updating every package.

If FastAPI is introduced, separately review CORS, cookies/session rotation, CSRF, account enumeration, password reset, object-level authorisation, request limits and database access. Its current `DEBUG or True` development-origin allowance must be reconciled. The Python dependencies include Motor: MongoDB's current notice places it in critical-fix-only support after 14 May 2026, with final support ending 14 May 2027. Plan migration to PyMongo Async for an adopted backend. This is not a reason to activate that backend at launch. [MongoDB Motor notice](https://github.com/mongodb/motor)

**Acceptance gate:** no unresolved exploitable critical/high issue in the exposed release; private data cannot be retrieved through known bypass hosts; secrets and admin access have owners; agreed lower-risk exceptions are documented with expiry and compensating controls.

## 9. Reports, correction workflow and support

Make report submission a reliable service rather than merely a form. The local review confirmed three classes of gap: invalid body types throw uncaught errors; a failed facet write can follow an already successful parent insert; a webhook's HTTP 200 HTML error can receive a success acknowledgement from the site.

Validate object and field types before access, enforce body/field limits, add abuse controls appropriate to writes, return predictable errors and preserve the user's input. Use atomic report-plus-facet persistence and an idempotency key so retries do not create duplicates. Require a documented durable acknowledgement from a webhook, with timeouts; do not assume every 2xx body means the external service stored the report. Prefer D1 as the first-launch record of truth and omit webhook mirroring until a reliable need exists.

Assign a report owner, a triage queue, severity labels and a correction audit trail. Link reports to dataset version and the exact selected offers. A user's report is evidence to investigate, not automatic permission to rewrite a price or matching rule. Provide a verified support mailbox with tested receipt/reply and a defined coverage schedule.

**Proposed service target:** triage ordinary reports within two business days during beta; investigate clearly misleading price/match incidents within the staffed day and remove affected comparisons promptly when confirmed. Do not publish a response-time promise before staffing is established.

**Acceptance gate:** an authorised staging report survives storage/retry/failure tests, appears in the operator queue and can be resolved with an auditable correction. No real user data or production report is necessary for this test.

## 10. Privacy, business information and commercial neutrality

Finish the legal entity/contact details, host/processors, data categories, purposes, retention, rights-request process and incident process using the actual configuration. Inventory server logs, report notes, browser storage, external image requests, shop click-outs and any future analytics or ad services. “Saved locally” does not mean the whole website processes no personal data.

Review Kenya's applicable data-protection obligations, registration applicability, processor agreements, transfers and whether a DPIA is needed with a qualified responsible adviser. The ODPC provides the relevant compliance and registration guidance; this proposal does not determine the business's legal status. [ODPC compliance guidance](https://www.odpc.go.ke/data-protection-compliance/) · [ODPC registration guidance](https://www.odpc.go.ke/wp-content/uploads/2024/02/ODPC-Guidance-Note-on-Registration-of-Data-Controllers-and-Data-Processors.pdf)

Implement a documented retention/deletion schedule and test it. Do not introduce a generic cookie banner without first knowing what tracking exists and what choices are required. Any nonessential analytics/advertising must follow the adopted consent/choice policy and honour withdrawal. Avoid sending free-text reports or identifiable search text to analytics by default.

Keep organic ranking independent of commercial payment. If sponsored placements are enabled later, test labels, creative size, relevance, theme contrast and layout stability. Track affiliate relationships transparently and use appropriate link qualification. Never let payment confer “Lowest,” “Verified” or “Recommended” status.

**Acceptance gate:** no placeholder policy facts or unsupported business claims remain; contact paths work; data processing matches disclosures; permitted source/image use is documented; commercial claims match actual contracts and ranking behaviour.

## 11. Releases, observability, backups and incidents

Create a current Pages release pipeline. Retire or explicitly disable the obsolete Azure workflow once its ownership is confirmed. CI should install from lockfiles, check types/tokens, run data/API/report tests, build in production mode, inspect output for raw data, run staging journey/accessibility checks and record release metadata. A production deployment promotes an identified, tested release rather than whatever happens to be on a developer machine.

Separate development, staging and production bindings/secrets/data. Prevent previews from contacting production report sinks. Add migration rehearsal and rollback compatibility. Browser fixtures must never submit real reports or trigger payments.

Strengthen the existing versioned uploader: compute an immutable content digest/file inventory, reject reuse of an active version with different contents, verify the target before `--activate`, and coordinate the API's current pointer with HTML/data deployment. A manifest-only version hash and successful upload exit codes are useful foundations but do not alone prove end-to-end publication integrity. Exercise concurrent requests across a version switch and failure before/after activation.

Monitor meaningful outcomes: searchable catalogue availability, product content retained after startup, successful valid API reads, report persistence, dataset age by retailer, source failure rates, suspicious extraction, cost and frontend errors. Redact sensitive content and attach release/dataset IDs to diagnostics. Platform monitoring may already exist; it was not available to this review.

**Provisional operating objectives:** 99.9% successful core browsing requests over 30 days; p95 valid catalogue response time under 750 ms from a named representative test location; recovery of the public service within one hour; report-data recovery point no worse than one hour. These require platform capability, staffing and restore evidence before adoption. Separate upstream freshness failures from HTTP uptime and report bot-blocked traffic separately instead of improving the metric by hiding errors.

Back up reports, required configuration and immutable catalogue releases using supported platform mechanisms. Test restoration into an isolated environment and verify both data and app behaviour. Assign an incident lead, rollback authority and contact route. Define responses to wrong-price incidents, leaked data, source outages, abusive traffic, broken deployment and lost report storage. An untested backup is not a release gate pass.

**Acceptance gate:** a failed release can be rolled back without republishing raw data; a report backup restores correctly within the adopted objectives; alerts reach an accountable operator; runbooks and credentials work during a drill.

## 12. Feature-specific gates for later releases

| Feature | Required before enabling |
|---|---|
| Accounts and sync | Auth/session/authorisation review; recovery, deletion and export; cross-device data migration; abuse limits; user-data restore tests |
| Real price notifications | Independent scheduler/worker; exact variant/condition target; fresh source evidence; deduplication; opt-in/unsubscribe; deliverability, retries and failed-delivery monitoring |
| Subscriptions or M-Pesa | Separate payments review covering server-side entitlements, authenticated/verified callbacks as supported by the provider, idempotency, reconciliation, refunds, secrets and sandbox-to-production acceptance |
| Sponsored placements / affiliate tracking | Actual contracts; visible disclosure; ranking independence; permitted tracking; real creative and layout tests |
| Merchant portal or submissions | Verified merchant access, moderation, audit trail, input safety and prevention of self-serving price/ranking edits |
| New languages, PWA or richer recommendations | Demonstrated user need, supported content/data and accessibility; no unsupported “best” claims |

Existing backend code for a feature is not evidence that its service works or is suitable for production. Keep its entry points out of the first launch unless it passes the applicable gate.

## 13. Gated delivery programme

Use named people for these roles at kickoff; one person can hold several roles, but each gate needs a recorded decision and evidence.

| Gate | Work package | Accountable role | Exit evidence |
|---|---|---|---|
| G0 — Define the release | Confirm launch subset, feature flags, domain, service owners, account capabilities and budget | Product owner + engineering lead | Approved scope, inventory, risk register and acceptance targets |
| G1 — Trust the data | Matching evaluation, freshness pipeline, offer contract, rights and correction rules | Data owner | Reviewed sample, automated data checks, monitored refresh cycle and quarantine workflow |
| G2 — Make delivery safe | Private publication, immutable releases, report reliability, CI, security configuration and restore | Engineering/operations lead | Passing regression suite, staging release, private-data checks, fault/restore drills |
| G3 — Prove the experience | Core journeys, neutral copy, both themes, accessibility, SEO and performance | Product/design + QA | Browser/device matrix, manual access checks, rendered SEO checks and performance baseline |
| G4 — Operate a controlled beta | Narrow public subset, support, monitoring, privacy facts and measured abuse controls | Product owner + operator | At least 14 consecutive days of reviewed beta evidence and no unresolved release blockers |
| G5 — Expand deliberately | Broader catalogue, traffic or individual optional features | Owner of each expansion | Same gates repeated for changed scope; production metrics support the increase |

G2/G3 preparation may overlap, but no public-launch gate bypasses G1. Estimate effort after G0 identifies the upstream state and category scope. A calendar commitment now would conceal the largest unknown: whether reliable fresh data can be produced consistently. The 14-day beta window is an observation minimum, not a promised launch date.

**Low-traffic beta rule:** fourteen days alone does not prove the 30-day availability objective or reliable field percentiles. The 30-day service objective is evaluated only after a full observation window. As a provisional internal threshold for a field-performance decision, collect at least 200 eligible observations for each metric in each device class, with representative coverage of the main page types; this is not a Google-defined certification rule. If volume is insufficient, remain in controlled beta or record an owner-approved, limited expansion supported by device/lab tests and continued monitoring. Mark field performance unverified; do not convert missing data into a pass. No such exception waives data integrity, security, report durability or critical-journey gates.

**Proposed default release choices:** comparison-only architecture; D1 for reports; no ads or notification service at first launch; retain both themes subject to parity; launch only passing data subsets. Domain ownership, legal identity, monthly budget, named staffing and upstream access remain owner-supplied facts. Their absence does not prevent preparation, but prevents a responsible launch sign-off.

## 14. Definition of ready

- All exposed critical journeys work on the supported browser/device matrix, including failure paths.
- No unresolved severe comparison error in the approved release sample; freshness and price-basis rules are enforced across all published launch offers.
- All required release tests pass; stale tests are corrected to the intended contract, not silently ignored.
- No known exploitable critical/high security defect, raw-data bypass or unacceptable personal-data exposure remains.
- Accessibility, theme, performance and rendered SEO gates have evidence; provisional targets are adopted or revised explicitly before sign-off.
- Reports persist reliably, corrections have an owner, policies reflect real services and support works.
- Deployment, version activation, rollback and restore are rehearsed; monitoring reaches someone who can act.
- Disabled features make no active promises and cannot be accidentally enabled by an unrelated deployment.
- Product, data, engineering/operations and privacy/business owners record approval of their gates and any lower-risk exceptions with expiry dates.

## Proposed next implementation package

Start with G0 and the launch-blocking portions of G1/G2: establish a current passing test baseline, harden report intake, verify private publishing and safe version activation, demonstrate the fresh-data pipeline, and resolve the production domain/contact/policy facts. Then complete the end-to-end experience and operational evidence before widening access.

The prior [design completion checklist](/home/reginaldkyalo/codes/api_phones_scraper/docs/design-audit-2026-10-21/completion-checklist.md), [copy deck](/home/reginaldkyalo/codes/api_phones_scraper/docs/design-audit-2026-10-21/copy-deck.md) and [scraping/SEO plan](/home/reginaldkyalo/codes/api_phones_scraper/docs/superpowers/plans/2026-10-23-scraping-resistance-and-seo.md) remain supporting worklists. Reconcile them against the new commit; do not implement their already-completed items again. Detailed implementation plans should be created per approved work package, with exact tests and interfaces, rather than treating this cross-system proposal as a single unchecked build task.

The planning continuation now includes an [ordered release backlog and decision register](/home/reginaldkyalo/codes/api_phones_scraper/docs/production-readiness-2026-10-23/release-backlog.md) and a [phase-one implementation plan](/home/reginaldkyalo/codes/api_phones_scraper/docs/superpowers/plans/2026-10-23-production-foundation-phase-one.md). Phase one covers the deterministic test baseline and reliable report intake, with exact files, contracts, migration sequence and acceptance tests. These documents are preparation only; they do not mark those changes implemented.

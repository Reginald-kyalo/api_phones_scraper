# Scraping and SEO test results

**Date:** 23 October 2026. **Repository baseline:** `ee95d5bdf12f0d460156483c14fc650ea0ea4700`.

Review-only work: production received bounded GET requests; no website source, Cloudflare settings or deployments were changed. Local experiments used a disposable build and read-only catalogue fixtures. The local browser server was stopped after the test.

## Results

| Check | Result | Meaning |
|---|---|---|
| Public exposure | Confirmed | Raw manifest, category shard and phone index were publicly readable |
| Live list caps | Passed sampled cases | Oversized category/search limits returned 96 rows each |
| Private-mode build | Passed | Raw catalogue removed from static output; private output created |
| Static SEO output | Passed sampled content/build checks | 6,179 sitemap URLs, price-bearing product HTML and structured data retained |
| API hardening contracts | 6 passed, 6 gaps | Existing caps work; validation and metadata projection need work |
| Browser: JavaScript disabled | Content retained | Product heading and four visible `KES ` text occurrences |
| Browser: API available | Content retained | Product heading, eleven `KES ` occurrences and three “Go to shop” links |
| Browser: API blocked | Resilience failed | Heading and prices disappeared; product load error displayed |
| Offline rate-policy model | 9 tests passed | Model behaves as specified, including its documented rotating-identity bypass |
| Actual WAF/R2 permissions/verified crawlers | Not tested | Requires the account and an authorised deployment/staging task |

## 1. Bounded live probes

[Machine-readable evidence](/home/reginaldkyalo/codes/api_phones_scraper/docs/scraping-seo-review-2026-10-23/evidence/live-probes.json) · [Probe script](/home/reginaldkyalo/codes/api_phones_scraper/docs/scraping-seo-review-2026-10-23/probe_live.py)

Fifteen sequential requests were attempted against [the supplied website](https://dealsonline-d58.pages.dev/), with a 0.7-second pause and a 2 MB response cap. Fourteen returned 200; the nonexistent-page request ended in a connection reset. That reset does not establish a 404 response or a bot block. Successful responses totalled 1,697,461 bytes. There was no bulk crawl, concurrency stress, challenge bypass, credential use or form submission.

| Request | Observation |
|---|---|
| `/demo/cards/mobile-phones.json` | 200; 628,766 bytes; 3,496 rows |
| `/demo/manifest.json` | 200; catalogue totals include 74,609 products and 36 shops |
| `/demo/categories/mobile-phones-000.json` | 200; 282,038 bytes |
| `/api/catalogue/category?slug=mobile-phones&limit=10000` | 200; 96 results |
| `/api/catalogue/search?q=Samsung&slug=mobile-phones&limit=10000` | 200; 96 results |
| Sample product HTML | 200; product heading, prices and JSON-LD present without executing JavaScript |
| Same product with Googlebot User-Agent | Same HTML hash; **not** a verified crawler test |
| `/search?q=Samsung` | 200; noindex present |
| `/robots.txt` | Disallows `/api/`, including catalogue requests |
| `/sitemap.xml` | 6,179 URLs |

No probe visited the hidden export honeypot. No inference was made that low-volume success means all production bot protections are absent.

## 2. Current handler versus proposed contracts

[Results](/home/reginaldkyalo/codes/api_phones_scraper/docs/scraping-seo-review-2026-10-23/evidence/catalogue-contract.json) · [Harness](/home/reginaldkyalo/codes/api_phones_scraper/docs/scraping-seo-review-2026-10-23/test_catalogue_contract.mjs)

The actual Pages catalogue handler was bundled and invoked with a read-only local R2 substitute. This tests application code, not Cloudflare's runtime or WAF.

**Passed:** category cap; scoped search cap; broad search cap; shelf cap; unsupported operation returns 404; single-product detail returns 200.

**Gaps against the proposed contract:**

| Case | Current result | Proposed result |
|---|---|---|
| Public manifest | Includes category shard/bucket metadata | Public presentation fields only |
| `limit=-2` | 200; one row | 400 |
| `limit=Infinity` | 200; 96 rows | 400 |
| `page=0.5` | 200; 48 rows | 400 |
| `/manifest/extra` | 200 manifest | 404 |
| Query of 257 `a` characters | 200 empty result | 400 before catalogue work |

These are deliberately tested future requirements, not six existing test-suite failures. The audit script records failed checks but exits successfully; inspect its JSON, not just the process status. The shelf test uses the actual fixture slug `smartphone-tablet-wearable`.

## 3. Isolated build and browser rendering

[Build output](/home/reginaldkyalo/codes/api_phones_scraper/docs/scraping-seo-review-2026-10-23/evidence/isolated-build.json) · [Static checks](/home/reginaldkyalo/codes/api_phones_scraper/docs/scraping-seo-review-2026-10-23/evidence/build-checks.json) · [Browser evidence](/home/reginaldkyalo/codes/api_phones_scraper/docs/scraping-seo-review-2026-10-23/evidence/rendering.json)

The real Vite build and postbuild ran with `VITE_CATALOGUE=api`, ads off and the supplied `pages.dev` origin as a **test-only** `SITE_URL`. Output went into a disposable `/tmp` directory, not the deployed site or the app's normal dist. The existing prepared local catalogue was used; the data preparation/export pipeline was not rerun.

The build produced 6,187 HTML files including the 404 shell, 6,179 sitemap URLs and private `.catalogue` data. Public `dist/demo` was absent. The only JSON file remaining in the static output was `shop-icons/index.json`, not catalogue data. The build log reported 5,522 prerendered product pages; sitemap count is not a claim of 74,609 indexed products.

A localhost adapter served that output and the actual catalogue handler, backed by the private files. Headless Chromium tested the same product in three fresh contexts at 1280 × 900. All external requests were blocked; images therefore need not resemble the fully online page. The API-blocked case explicitly aborted local `/api/` requests; it does not emulate Google's robots processor.

All three document requests returned 200 and there were no captured JavaScript page errors. Only the API-blocked case lost the heading and prices. Its screen showed “We couldn’t load this product. Try again.” This proves the current client replacement depends on the API in the tested build. The HTTP 200 alone therefore does not establish meaningful rendered content.

The price counts are text occurrences, not offer counts. The no-JavaScript page contains shop-linked listings with different labels, so its zero “Go to shop” label count is not evidence that it has no shop links.

Screenshots:

- [JavaScript disabled](/home/reginaldkyalo/codes/api_phones_scraper/docs/scraping-seo-review-2026-10-23/evidence/no-javascript.png)
- [API available](/home/reginaldkyalo/codes/api_phones_scraper/docs/scraping-seo-review-2026-10-23/evidence/api-available.png)
- [API blocked](/home/reginaldkyalo/codes/api_phones_scraper/docs/scraping-seo-review-2026-10-23/evidence/api-blocked.png)

The browser test initially could not start because localhost was restricted and automatic approval review timed out. It subsequently ran successfully after explicit user approval; no browser-test blocker remains.

## 4. Offline abuse-policy experiment

[Results](/home/reginaldkyalo/codes/api_phones_scraper/docs/scraping-seo-review-2026-10-23/evidence/policy-model.json) · [Model and nine tests](/home/reginaldkyalo/codes/api_phones_scraper/docs/scraping-seo-review-2026-10-23/test_policy_model.py)

The model used a 30-request token bucket refilling at two requests per second, with assumed trusted session and crawler inputs. It is an experiment, not deployed protection.

- One identity issuing 80 instantaneous catalogue reads: 30 allowed, 50 limited.
- Twenty shoppers making twenty reads each over 57 seconds behind one IP: no per-session limits. A simple shared 60-per-minute IP cap would instead limit 340 of those 400 requests.
- Four hundred requests using new identities: all allowed. This demonstrates why session limits alone cannot stop a distributed scraper.
- Private paths stay closed even for the trusted crawler fixture; claiming Googlebot in User-Agent does not grant that fixture's trusted status.

Passing these tests proves model behaviour only. It does not establish production false-positive rates, actual verified-bot classification, supported Cloudflare plan features or real-world scraping prevention.

## Reproduction and remaining gates

The [implementation plan's baseline commands](/home/reginaldkyalo/codes/api_phones_scraper/docs/superpowers/plans/2026-10-23-scraping-resistance-and-seo.md) run the isolated build, static checks, handler tests, model and browser test. Build before browser testing because `evidence/stage.json` points to temporary output. Re-running scripts overwrites their evidence files; retain this dated baseline separately if comparing a later implementation.

Still required at implementation time: actual R2 private-access validation; production domain/canonical verification; old deployment and preview checks; real cache/WAF/rate-counter tests; Search Console rendering and crawl checks; representative shared-network traffic; and measured thresholds before enforcement. No ranking, index coverage, production load capacity or complete resistance to scraping has been certified.

The [proposal](/home/reginaldkyalo/codes/api_phones_scraper/docs/scraping-seo-review-2026-10-23/proposal.md) explains the resulting design and rollout choices.

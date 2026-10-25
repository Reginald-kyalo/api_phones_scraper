# Scraping resistance with search visibility

**Review date:** 23 October 2026. **Scope:** proposal and tests only; no website, deployment, Cloudflare account or production configuration changes.

**Reviewed:** [live website](https://dealsonline-d58.pages.dev/) and repository commit `ee95d5bdf12f0d460156483c14fc650ea0ea4700`. Local source is not proof that the live deployment was built from that exact commit.

## Recommendation

Keep useful product and category pages public and crawlable. Move the complete catalogue behind the existing private R2 integration, expose only the data each page needs through bounded API responses, and apply selective abuse controls to repeated catalogue access. Preserve a usable page when an API request fails or is limited.

This will substantially reduce the convenience of bulk extraction. It cannot make public prices impossible to scrape: a determined visitor can collect the same information shoppers and search engines can see. The objective should be **less bulk data exposed, greater cost for systematic extraction, and no unnecessary obstacles for shoppers or search engines**.

The strongest first step already exists in the code. This does not require a website redesign, encrypted prices, login walls or an expensive bot-management subscription before any benefit is possible.

## What the checks established

| Finding | Evidence | Implication |
|---|---|---|
| A raw phone index is publicly downloadable | One GET to `/demo/cards/mobile-phones.json` returned 628,766 bytes and 3,496 rows | API pagination is bypassable while raw files remain public |
| Raw manifests and category files are also reachable | `/demo/manifest.json` and one category shard returned 200 | Remove the entire raw-data publication path, not just the phone index |
| The catalogue API already caps sampled list responses | Category and search requests with `limit=10000` returned 96 products | Reuse this boundary; it does not prevent repeated pagination |
| Private mode works at build time | Isolated `VITE_CATALOGUE=api` build removed `dist/demo` and produced private `.catalogue` output | Existing architecture can support the proposed separation |
| Useful HTML survives that build | 6,179 sitemap entries; sampled product HTML contains prices and structured data | Keeping data files private need not remove search-visible content |
| Current robots rules conflict with a confirmed rendering dependency | Robots disallows `/api/`; in the isolated API-mode browser test, blocking API requests removed the product heading and all price text | Allow required public reads and preserve initial page data before deployment |
| Canonicals point to a different host | Live pages declare `https://sokopulse.co.ke/...` while reviewed on `pages.dev` | Confirm the intended domain, ownership, routing and Search Console property |
| API input handling needs tightening | Six of twelve proposed local hardening checks failed | Add validation and public response projections before relying on API restrictions |

The manifest reports 74,609 product clusters across 36 shops. The local raw dataset occupies 526,975,580 bytes across 4,087 JSON files; that is a local inventory, **not a download of the whole live catalogue**. The tracked compressed archive is about 43.7 MB. Repository visibility and external artifact exposure were not verified.

See the [test report](/home/reginaldkyalo/codes/api_phones_scraper/docs/scraping-seo-review-2026-10-23/test-results.md) for exact scope, failures and reproducible commands. No production load test or actual Cloudflare enforcement test was performed.

## 1. Close bulk-data exposure first

Use `VITE_CATALOGUE=api` for production builds. Keep the `CATALOGUE` R2 bucket private, with no public bucket hostname or public custom domain. Retain the source dataset outside the deployed static directory.

Add an explicit production deployment setting and fail the build if production would publish raw catalogue files. A missing R2 binding in production should return a temporary service error; it must not silently switch back to public assets. Keep the public-data fallback only for explicitly configured local development.

The release gate should check `/demo/`, `/.catalogue/`, compressed archives, source maps containing embedded data, build artifacts, release attachments and repository visibility. Do not publish private URLs or signed artifact links in build logs. An API token embedded in JavaScript would be public and would not solve this problem.

Use versioned R2 object prefixes and upload the complete new dataset before switching the active version. The current uploader overwrites files in place, which can mix old and new data if an upload is interrupted. Keep the previous private version available for rollback.

Check old deployments and preview URLs as well as the current production URL. The current build gives raw `/demo/` files a one-year immutable cache lifetime. Removing files from a new build does not recall downloaded copies or automatically prove every old URL and cache is closed. Purge supported caches and remove or restrict old public deployments where the platform permits it.

**Gate:** no raw catalogue response from the production domain, `pages.dev`, a known deployment alias, or a direct bucket URL; missing storage cannot reopen a public fallback. Raw files staying private is a permanent constraint, including during rollback.

## 2. Preserve search-visible product content

Keep real names, prices, shop names, availability qualifications, timestamps and product links in the initial HTML. Structured data must describe the same visible offers. The information served to crawlers and shoppers should agree.

The current prerendering is a useful foundation, but React uses `createRoot` to replace it. Product data is then requested again. The isolated API-mode browser test confirmed that blocking API requests removes the product heading and all visible price text, leaving a retry message. With JavaScript disabled, the product heading and prices were present; with API access, they were present in the interactive page too. This demonstrates a rendering dependency, not Google's exact rendering behaviour or an observed indexing loss. Google processes JavaScript and depends on access to necessary resources, so checking only View Source is insufficient. [Google JavaScript SEO guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)

The immediate correction is a specific `Allow: /api/catalogue/` alongside the broader API disallow, repeated in every relevant crawler group. Keep `X-Robots-Tag: noindex` on catalogue JSON so it supports rendering without becoming the intended search result. A crawler must be able to fetch a resource to observe its noindex instruction. This is crawl policy, not an access-control exception for private APIs. [Google noindex guidance](https://developers.google.com/search/docs/crawling-indexing/block-indexing)

Then embed a small, validated initial-data payload for the current page, using the same public response projection as the API. The client should render that data immediately and keep it if background refresh fails. Embed only the page's products, not a whole category or catalogue. Serialize safely against script termination and avoid sensitive internal fields. This still exposes the visible prices, as intended, but removes a fragile mandatory refetch.

Keep JavaScript, CSS, essential images, robots.txt and sitemaps accessible. Do not require CAPTCHA or login to read ordinary product pages. Search/filter combinations need a deliberate indexability policy to avoid unbounded crawl paths; useful category pages should remain discoverable through normal links.

Currently only products meeting the prerender selection are emitted, including a requirement for multiple shops. Decide separately whether useful single-shop products should be indexable. Valid products should return 200 with an explicit index/noindex decision; genuinely missing products should return 404. Do not leave valid routes returning the generic 404 shell merely because they were omitted from the prerender batch.

**Gate:** representative product and category pages retain their principal content with JavaScript disabled, enabled, delayed and with the refresh API failing. Canonical tags, structured data and status codes stay correct. Confirm rendering with Search Console on the actual production domain; a test request with a Googlebot User-Agent is not verified Googlebot traffic or evidence of indexing.

## 3. Make the public API small and predictable

Keep the existing ceiling of 96 product rows. Apply it to the combined product arrays in a response, not independently to several arrays. A product detail response should represent one product. A public manifest may include category labels, category slugs, counts and capture dates needed by the interface; it should not include storage shard names, bucket layouts or source collection identifiers.

Do not remove shopper-facing evidence while minimising responses. Original shop listing titles, condition, warranty, price history used by the chart, comparison warnings and source links support trust. Audit actual field consumers before replacing the current full detail object with a public projection.

Recommended contract:

| Input or outcome | Proposed behaviour |
|---|---|
| Operation | Exactly one supported path segment; an extra suffix returns 404 |
| Search query | At most 256 Unicode code points after trimming; reject longer input before catalogue work |
| Product ID / category slug | Maximum 512 / 128 code points; validate the expected form without breaking existing encoded IDs |
| Limit | Finite positive integer; values above 96 clamp to 96; negative, fractional and non-finite values return 400 |
| Page / offset | Finite nonnegative integers, maximum 1,000,000; beyond available results returns an empty page |
| Sort, booleans and filters | Allowlisted values; finite nonnegative prices with minimum no greater than maximum |
| Malformed input | 400 JSON, no storage reads where validation can happen first |
| Missing product or category | 404 JSON |
| Storage outage | 503 JSON; do not mislabel a service failure as a missing product |
| Access limit | 429 JSON with `Retry-After` and `Cache-Control: no-store` |

Cache successful, public catalogue responses with normalised keys that include every result-changing parameter and the dataset version. Check rate policy before returning cached responses; otherwise a scraper can repeatedly use the cache without being counted. Cache headers alone do not establish that Pages Function responses are cached at the edge. Errors and rate-limit responses must not become shared cached failures.

**Gate:** all defined contracts pass; existing search, filters, variants, comparisons and shop links still work. Invalid input and denied requests do not perform expensive catalogue work.

## 4. Apply selective controls, with a fair recovery path

Start with observation. Measure catalogue reads, pagination depth, repeated sequential traversal, request concurrency, error rates and storage cost. Do not treat rapid use, one hidden-link visit, a VPN, a Kenyan mobile carrier, or a missing cookie as conclusive evidence of abuse.

For ordinary catalogue requests, use several signals together. A first-party session can help separate shoppers behind one shared IP, but bots can create sessions. IP rate is a secondary signal with generous allowance for shared networks. Neither alone identifies a person.

An offline starting hypothesis was a session bucket of 30 immediate requests, refilling at two per second. It limited 50 of 80 instantaneous requests while allowing the simulated normal shopping pattern. These numbers are **not production recommendations yet**: real navigation, prefetching and retries must determine the thresholds. A distributed scraper using new identities bypassed the model, as expected.

Do not adopt the existing deployment note's blanket “60 per minute per IP → challenge.” In the test comparison, 20 shoppers making 20 reads each behind one IP would lose 340 of 400 requests under a simple one-minute 60-request IP cap. This is a hypothetical shared-network scenario, not a measurement of the current site.

Prefer short cooldowns and 429 JSON for excessive read activity. Show a brief recovery message, for example: **“Please wait a moment before trying again.”** Keep already-loaded prices visible with their existing timestamp. Respect `Retry-After`; stop automatic retry loops. Do not substitute an HTML challenge into a JSON fetch and assume the app can recover.

Use Turnstile where there is an abusive user action to protect, such as repeated report submissions, and only if observation warrants it. Validate tokens server-side. It should not be a mandatory gate on every SEO landing page. [Turnstile validation requirements](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)

### Search crawlers and other bots

Use a trusted Cloudflare verified-bot signal or verified crawler network identity for narrow exceptions. A request saying “Googlebot” is not sufficient. Google documents verification methods because User-Agent strings are spoofable. [Googlebot verification guidance](https://developers.google.com/search/docs/crawling-indexing/googlebot)

Distinguish search indexing, link previews, user-requested retrieval and bulk collection. Cloudflare's verified category includes more than search engines; a blanket `cf.client.bot` bypass would grant access more widely than intended. Exempt verified search crawlers from the catalogue-read throttle where needed for rendering, never from private-data boundaries. Test preview and accessibility-related traffic separately. [Cloudflare verified bots](https://developers.cloudflare.com/bots/concepts/bot/verified-bots/)

Robots exclusions can express a preference against named collection crawlers, but noncompliant scrapers can ignore them. Avoid describing every currently listed crawler as “training-only.” Google-Extended, for example, is a robots product token rather than a separate HTTP User-Agent, and its control does not determine Google Search inclusion. [Google crawler documentation](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)

### Cloudflare configuration depends on the account

The account plan, existing WAF rules and bot settings were not available to this review. Confirm them before specifying a deployable rule. The current Cloudflare documentation gives Free rate limiting a 10-second counting period and IP-based characteristics; cookie/header-based counting and other advanced options are plan-dependent. Do not present the offline session model as a Free-plan dashboard configuration. Distributed enforcement is also not an exact global request quota. [Cloudflare rate limiting](https://developers.cloudflare.com/waf/rate-limiting-rules/)

Do not enable Free Bot Fight Mode as the default solution here: it cannot be bypassed with ordinary WAF Skip rules and can affect API traffic. Where available, scoped custom rules or Super Bot Fight Mode exclusions offer more control. [Bot Fight Mode limitations](https://developers.cloudflare.com/bots/get-started/bot-fight-mode/)

**Gate:** observe at least seven representative days before enforcing new behavioural limits. Start enforcement on suspicious catalogue traffic only. Verify both cache hits and origin reads are counted as intended, and verify good crawlers through trusted identity rather than a spoofed header. [Rate-limit counting options](https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/)

## 5. Remove protections that undermine trust

The code plants fake product rows in built catalogue indexes and filters their hashed IDs from shopper-facing results. I did not establish that fake products are currently displayed to shoppers. Nevertheless, fabricated prices in a production dataset create a regression risk and add little resistance because the client-side filter is inspectable.

Remove fake product injection and its display filter together. Retain data provenance through internal records and access telemetry, rather than poisoning the catalogue.

The hidden `/data/catalogue-export` link is a honeypot: its route returns 404 and may log requests to D1. It is not the bulk-export exposure found in this review. A hit can come from scanners, preview tools or accidental traversal; it must not trigger an automatic permanent IP ban. Prefer removing the hidden link. If its endpoint is retained, treat requests as low-confidence telemetry and minimise retention of raw identifiers.

Do not rely on CORS, referer checks, disabled right-click, minified scripts, obscure URLs or robots.txt to prevent non-browser downloads. Avoid fingerprinting every shopper or requiring an account simply to compare prices.

## 6. Close alternate-host bypasses

Agree the real public domain before adding zone-level protection. Configure matching canonicals, sitemap URLs and redirects. Redirect the production `pages.dev` hostname to that domain, preserving paths and query strings, and restrict preview deployments separately. Cloudflare documents these as separate configuration steps. [Pages custom-domain redirects](https://developers.cloudflare.com/pages/how-to/redirect-to-custom-domain/) · [Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)

Check API routes explicitly: static `_redirects` rules do not apply to requests handled by Pages Functions. An apparently correct homepage redirect can therefore leave another route as a bypass. [Pages redirect limitations](https://developers.cloudflare.com/pages/configuration/redirects/)

**Gate:** direct API requests through every known alternate host are redirected, restricted or subject to equivalent controls. Preview restrictions must cover HTML and Functions, not only one surface.

## Sequential rollout and decision gates

| Order | Deliverable | Gate before continuing |
|---|---|---|
| 1 | Domain, plan and endpoint inventory | Confirm the production host, Cloudflare capabilities, existing controls and all public aliases |
| 2 | Private catalogue publishing | No raw data in output or known public aliases; missing R2 fails closed; versioned upload and rollback verified |
| 3 | SEO and response contracts | HTML and required API remain crawlable; robust initial rendering; all input/projection tests pass |
| 4 | Observation and recovery UI | Normal activity, shared-network behaviour, crawler traffic and API failures measured; retry handling works |
| 5 | Narrow enforcement | Staging tests pass for real crawler verification, cache paths and alternate hosts; thresholds justified by observations |
| 6 | Production review | Compare crawl health, shopping success, false positives and extraction cost; adjust or roll back only the new mitigation |

Public-data closure and API validation should not wait for an elaborate bot-scoring system. Behavioural enforcement should wait for evidence.

Use dashboards for 200/400/404/429/503 rates, retries, successful search/detail loads, cache hit rate, storage reads and suspicious traversal. Check Search Console crawl and indexing reports on the intended domain. Indexing and rankings are outcomes to observe; no build or local test can guarantee them.

Provisional rollout stops: any confirmed challenge to a verified search crawler or robots/sitemap fetch; any loss of primary product content after refresh failure; any newly public raw catalogue file; or a sustained increase in failed legitimate shopping sessions beyond an agreed baseline. Confirmed shared-network false positives warrant immediate adjustment. Do not claim precise false-positive percentages until traffic classification is reliable.

Rollback should disable or loosen the new throttle/challenge, retain the private bucket and strict response contracts, and restore the previous complete dataset version if needed. Never “fix” availability by publishing the raw catalogue again.

## Cost, limitations and proposed decision

The private catalogue and prerender approach reuses existing components. Costs shift toward controlled Function/R2 reads and any chosen caching or rate-state service. A paid bot product may become useful for distributed abuse, but the need and cost depend on actual traffic and the account plan; no subscription price or savings figure was assumed here.

Local tests cannot validate Cloudflare's deployed WAF, cache topology, verified-bot classification, private bucket settings, old deployments or Search Console. The final production gates require account access and an authorised implementation/deployment task. This review did not change those settings.

**Proposed decision:** proceed later with private publishing, SEO-safe rendering and API validation as the first implementation package. Add observation and short, selective limits as a second package. Consider paid bot controls only if measured abuse remains material after those improvements.

The [implementation plan](/home/reginaldkyalo/codes/api_phones_scraper/docs/superpowers/plans/2026-10-23-scraping-resistance-and-seo.md) maps this proposal to exact files and acceptance checks.

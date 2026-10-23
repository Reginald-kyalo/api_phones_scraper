# Deploying SokoPulse

Static HTML for every page worth a search result, plus two Pages Functions:
`/api/catalogue/*`, which serves the catalogue one page at a time from a
private R2 bucket, and `/api/reports`. **Production builds must not ship the
dataset itself.** A Cloudflare Pages build without `VITE_CATALOGUE=api` fails
on purpose (`scripts/postbuild.mjs`): the alternative is every catalogue file
public under `/demo/`, which the 23 October 2026 scraping review found live
(one GET returned 3,496 phone records). `ALLOW_PUBLIC_CATALOGUE=1` overrides
the check for a preview that is meant to be public.

## Release gate

Before a production deploy is called done:

1. `VITE_CATALOGUE=api` is set for Production and Preview, the `CATALOGUE`
   bucket is bound, and `npm run catalogue:upload` has activated a version.
2. From the production host, the `pages.dev` host and every preview alias:
   `/demo/manifest.json` is 404; `/api/catalogue/manifest` is 200 and carries
   `x-robots-tag: noindex`; `/api/catalogue/category?slug=mobile-phones&limit=-2`
   is 400.
3. A product page keeps its heading and prices with JavaScript disabled, with
   JavaScript enabled, and with `/api/` requests blocked (the HTML embeds the
   page's own data; `npm run test:catalogue` covers the contract).
4. `robots.txt` allows `/api/catalogue/` and disallows `/api/` and `/data/`.
5. Canonical URLs, the sitemap and `SITE_URL` name the same host, and that
   host is the one in Search Console.
6. No raw catalogue file is reachable through an old deployment or a direct
   bucket URL (R2 public access stays off).

## Build

```bash
npm ci
npm run build          # -> dist/
```

Serving `dist/` on any static host is enough.

### Where the catalogue comes from

`public/demo/` is **not in git**. It is ~151 MB across ~430 JSON files, and git
keeps every version of every changed file forever — a re-capture rewrote nearly
all of them, so tracking them loose cost roughly **100 MB of permanent history per
run**, on a repo Cloudflare Pages re-clones on every build.

What ships instead is one deterministic archive, `data/demo-dataset.tar.gz`
(**15 MB**), unpacked by a `prebuild` hook. Nothing to run by hand: `npm run build`
and `npm run dev` both materialise it first, and repeat runs are a no-op.

```bash
npm run demo:prepare          # explicit; normally implied by build/dev
```

⛔ **"Generate it in CI" cannot be taken literally.** The capture reads MongoDB,
which no hosted builder can reach — so the dataset must arrive as an artefact.

⚠️ **The pack is byte-reproducible on purpose.** tar records mtimes and owners
and gzip stamps its own header with the clock, so a naive pack differs on every
run and git would store a fresh 15 MB blob even when nothing changed — giving back
most of the saving. `test_packing_is_reproducible` pins it, including the gzip
header field, which comparing two same-second packs cannot catch.

**To take the 15 MB out of the repo too** — put the archive on R2, S3 or a GitHub
Release and set one variable; no other change:

```bash
DEMO_DATASET_URL=https://…/demo-dataset.tar.gz npm run build
```

On Pages that is an environment variable in the dashboard. A missing or
unreachable dataset **fails the build** rather than publishing a site whose every
page renders its empty state.

### Deploying under a sub-path

GitHub Pages project sites live at `https://<user>.github.io/<repo>/`. Every
asset URL, the fixture paths and the router all have to agree on that prefix:

```bash
BASE_PATH=/<repo>/ npm run build
```

⚠️ **The trailing slash is required.** `BASE_PATH` feeds Vite's `base`, which
feeds `import.meta.env.BASE_URL`, which feeds both the fixture loader and the
router's `basename`.

⛔ Without `basename` the site *looks* broken in a misleading way: assets and
fixtures load fine (they are absolute), but the router matches nothing and
renders NotFound on every page — it reads as a data failure, not a routing one.

## What the host must provide

| need | why | provided by |
|---|---|---|
| Real HTML per page | crawlers and link previews do not run JavaScript | `scripts/prerender.ts`, run by `scripts/postbuild.mjs`: one HTML file per product sold by 2+ shops, category, department, shelf and static page, plus `sitemap.xml` and `robots.txt` |
| Fallback for everything else | single-shop products and typos are not files | `dist/404.html`, written by the prerender as the app shell: the app boots at the requested URL (status 404) |
| Long cache on `/assets/*` | hashed bundles | `dist/_headers`, written by `scripts/postbuild.mjs` (a `/demo/*` rule is written only when the dataset is deliberately public) |
| Page data without a request | a product page must not lose its prices when `/api/catalogue/` fails or is limited | the prerender embeds the page's own catalogue responses in a `<script type="application/json" id="catalogue-initial">`; `src/app/lib/api.ts` answers the first requests from it |

⛔ **No rewrite rules in `_redirects`.** Cloudflare Pages applies them before
static files, so `/prices/*  /  200` would serve the homepage in place of every
prerendered product (measured in `wrangler pages dev`).
`tests/test_capture_demo_dataset.py::test_redirects_carry_no_rewrite_rules`
guards this.

Set `SITE_URL` at build time once the domain is live; canonical URLs and the
sitemap use it (default: the placeholder in `src/app/lib/brand.ts`).
`PRERENDER_MAX_PRODUCTS` caps product pages (default 12,000) so a deploy stays
under Cloudflare Pages' 20,000-file limit.

## Private catalogue (R2), so the dataset is not downloadable

Without `VITE_CATALOGUE=api` the build ships the dataset in `dist/demo/` and the
browser reads it directly: anyone can copy every file. That is a local-only
mode now. With **`VITE_CATALOGUE=api`** the browser asks `/api/catalogue/*` (a
Pages Function) for one page at a time, at most 96 products, and the dataset
lives in a private R2 bucket. Same queries both ways
(`src/app/lib/catalogueQueries.ts`), so results do not change.

The function's contract (`functions/lib/catalogueRequest.ts`, tested by
`npm run test:catalogue`): malformed input is 400 before any read; an unknown
operation, product or category is 404; an unreachable bucket is 503 with
`Retry-After`; errors are `Cache-Control: no-store`; responses are the public
projection only (no shard layout, no pipeline identifiers). A missing
`CATALOGUE` binding falls back to `/demo/` **only on localhost**; anywhere
else it is 503, never a public fallback.

One-time setup, in this order (the site breaks if the variable is set before
the bucket is filled):

1. **Create the bucket.** Cloudflare dashboard → R2 → Create bucket, name
   `sokopulse-catalogue`. Leave public access off.
2. **Create an API token** for uploads: My Profile → API Tokens → Create token →
   "Edit Cloudflare Workers" template, or a custom token with *Account · Workers
   R2 Storage · Edit*. Note your Account ID (R2 overview page, right column).
3. **Fill the bucket** from this folder:
   ```bash
   VITE_CATALOGUE=api npm run build
   CLOUDFLARE_ACCOUNT_ID=<id> CLOUDFLARE_API_TOKEN=<token> npm run catalogue:upload
   ```
   About 4,100 files; roughly 15 minutes. Every file goes under
   `versions/<capture date>-<manifest hash>/`, and `current.json` at the bucket
   root switches to that version only when every file is there, so an
   interrupted upload can never mix two datasets. The function re-reads
   `current.json` within five minutes. Roll back with
   `node scripts/upload-catalogue.mjs --activate <previous version>`.
4. **Bind it:** Pages → the project → Settings → Functions → R2 bucket bindings
   → variable `CATALOGUE`, bucket `sokopulse-catalogue` (Production and Preview).
5. **Switch the site over:** Pages → Settings → Environment variables → add
   `VITE_CATALOGUE` = `api`, then redeploy.
6. **Observe before limiting.** Watch `/api/catalogue/` request volume,
   status codes, pagination depth and sequential traversal for at least a
   week of real traffic first. Do not start with a blanket per-IP cap: twenty
   shoppers behind one Kenyan mobile-carrier address making twenty reads each
   would lose most of them under a 60-per-minute rule. When a limit is
   justified, make it JSON 429 with `Retry-After` (the app shows "Please wait
   a moment before trying again." and keeps the prices already on screen),
   never an HTML challenge substituted into a JSON fetch. Exempt verified
   search crawlers (`cf.verified_bot_category` is "Search Engine Crawler",
   not a User-Agent string) from that limiter, and nothing else.

After every dataset re-capture, repeat step 3 before deploying.

Without the binding the function falls back to the site's own `/demo/` files,
which is what `wrangler pages dev dist` uses locally on a normal build. To test
the R2 path locally: `VITE_CATALOGUE=api npm run build`,
`node scripts/upload-catalogue.mjs --local`, then
`wrangler pages dev dist --r2 CATALOGUE=sokopulse-catalogue`.

## Crawlers: open to search and AI answers, closed to training

`robots.txt` and `llms.txt` are written by the prerender. Search and
AI-answer crawlers (Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User,
PerplexityBot, Claude-SearchBot and others) may read every public page **and
`/api/catalogue/`**: the app fetches it to render, and a crawler that cannot
fetch a resource cannot render the page. Those responses carry
`X-Robots-Tag: noindex`, so they never become results. Crawlers that collect
training data (GPTBot, ClaudeBot, CCBot, Bytespider and others; Google-Extended
is a robots token rather than a separate crawler) are disallowed; the honeypot
`/data/` and every other `/api/` path are closed to all. robots.txt is a
request, so enforce the same split at Cloudflare (on the sokopulse.co.ke zone,
not `*.pages.dev`):

1. **Security → Bots:** leave **Block AI bots** OFF (the single switch also
   blocks the answer crawlers that get SokoPulse cited) and leave **AI
   Labyrinth** OFF.
2. **AI Crawl Control** (or **AI Audit**, depending on the dashboard version) →
   crawlers list: set **Allow** for Googlebot, Bingbot, OAI-SearchBot,
   ChatGPT-User, PerplexityBot, Perplexity-User, Claude-SearchBot,
   Claude-User, Applebot; set **Block** for GPTBot, ClaudeBot, CCBot,
   Google-Extended, Applebot-Extended, Bytespider, Meta-ExternalAgent,
   Amazonbot. Turn on **Enforce robots.txt** if offered.
3. **Security → WAF → Custom rules**, if the crawler list is not available:
   `(cf.verified_bot_category eq "AI Crawler")` → **Block**, placed after a
   rule `(cf.client.bot)` → **Skip** for Search Engine Crawler and AI
   Assistant/AI Search categories.
4. Treat `honeypot_hits` (D1) as low-confidence telemetry, not a block list:
   a scanner, a link-preview service or an accidental traversal can request
   `/data/catalogue-export` once. Review repeat offenders by hand; do not
   automate a permanent ban from one hit. Keep the catalogue limiter, when
   there is one, to the rule in the R2 section above.

## Alternate hosts

Protection on the `sokopulse.co.ke` zone does nothing for `*.pages.dev` or
preview aliases, and static `_redirects` rules do not apply to requests that
Pages Functions handle. Once the custom domain is live: redirect the
production `pages.dev` host to it preserving path and query (Pages → Custom
domains), restrict preview deployments (Pages → Settings → Access policy),
and test `/api/catalogue/manifest` through each host directly, not just the
homepage. Until the domain decision is made, canonicals already name
`sokopulse.co.ke` while the site is reviewed on `pages.dev`: pick the host,
set `SITE_URL` to it, and register the same host in Search Console.

## Host notes

- **Cloudflare Pages (the target)** — connect the GitHub repo; build command
  `npm run build`, output `dist`. `_headers` and `404.html` are read
  automatically. Reporting needs a one-time D1 setup, below.
- **Vercel** — enable clean URLs (`cleanUrls: true`) so `/deals` serves
  `deals.html`, and make `404.html` the not-found page.
- **GitHub Pages** — build with `BASE_PATH=/<repo>/` and publish `dist`.
  `404.html` boots the app for unknown paths. Note Pages ignores `_headers`, so the
  dataset is not long-cached there.
- **S3 / CloudFront** — set `404.html` as the error document, and map
  extensionless paths to their `.html` file.

## Regenerating the dataset

From the API repo, with MongoDB running:

```bash
CLUSTERS_COLLECTION=product_clusters_mvp \
  apienv/bin/python -m scripts.capture_demo_dataset
```

It rewrites `public/demo/` in place — manifest, paginated listings, sharded
details and the search index — then repacks `data/demo-dataset.tar.gz`, which is
the file to commit. `public/demo/` itself is ignored.

⚠️ Commit the archive, or the change does not ship. `git status` will look clean
apart from it, which is the point: one 15 MB file instead of ~430, and **zero new
objects when the capture produced identical data**.

## Pre-deploy checks

```bash
npm run type-check
npx vite preview --port 4173        # then browse with the backend stopped
```

The dataset's own integrity is covered by the API repo's suite
(`apienv/bin/python -m pytest tests/`), including that detail shards carry
store click-through URLs — a defect that renders perfectly and silently removes
every "Go to store" link.


## Cloudflare Pages + CI/CD

⛔ **Set the root directory to `dealsonline_ui_ux_mock` — this is not optional.**
The frontend is a subdirectory of the API repo and there is no `package.json` at
the top level, so a default Pages project fails immediately:

```
Executing user command: npm run build
npm error path /opt/buildhome/repo/package.json
npm error enoent Could not read package.json
```

That error names npm, so it reads as a dependency problem. It is not: npm is
running in the wrong directory. Build command and output directory are both
**relative to the root directory**, so they stay `npm run build` and `dist`.

| setting | value |
|---|---|
| Root directory | **`dealsonline_ui_ux_mock`** |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | 20 |
| Environment variables | `VITE_CATALOGUE` = `api` (Production and Preview), `SITE_URL` = the canonical origin |
| Functions bindings | R2 `CATALOGUE` → `sokopulse-catalogue`; D1 `DB` → `dealsonline-reports` |

⚠️ **Do not commit a `wrangler.toml` with a placeholder `database_id`.** The build
log shows Pages checking for one before it runs anything ("Checking for
configuration in a Wrangler configuration file (BETA)"), and once the root
directory is right it will find it. A Wrangler config becomes the source of truth
for bindings, so a fake id there is worse than no file: D1 binds to nothing while
the dashboard binding is ignored. Bind `DB` in the dashboard instead — see below.
For local Functions work, pass the database on the command line rather than
committing it:

```bash
npx wrangler pages dev dist --d1 DB=dealsonline-reports
```

Every push to the production branch deploys; pull requests get preview URLs.
`clusters-api` works as the production branch — Pages lets you nominate any
branch, so there is no need to merge to `main` first. Measured against the
platform limits, the build fits comfortably:

| limit | ours |
|---|---|
| 20,000 files per deployment | **466** |
| 25 MiB per file | **3.5 MB** largest (`demo/search/groceries.json`) |

✅ **The repo used to be the constraint, not Pages** — ~100 MB of git objects per
re-capture, on something Pages re-clones every build. Fixed: the catalogue is one
15 MB reproducible archive unpacked by a `prebuild` hook, and an unchanged capture
now costs nothing. See *Where the catalogue comes from* above.

⚠️ **The existing ~103 MB of history is still there.** Untracking stops the
growth; it does not shrink what is already committed. Removing it would mean
rewriting history (`git filter-repo`) and force-pushing — worth it only if clone
time actually becomes a problem.

### Where reports are stored, and how to point them somewhere else

The browser only ever knows the string `/api/reports`. Storage is entirely the
Function's business, so changing it is an environment variable — no code change,
no rebuild, no client release.

⭐ **Forwarding from the edge rather than the browser is what makes that cheap.**
A page posting straight to a Google Apps Script or an Airtable endpoint hits a
CORS preflight it cannot satisfy and a redirect it cannot follow, and any key it
carried would be readable in the JS bundle. Server-side none of that applies: any
HTTPS endpoint works, and the credential never leaves Cloudflare.

| variable | effect |
|---|---|
| *(D1 binding `DB` only)* | default — the two-table schema below |
| `REPORT_WEBHOOK_URL` | POST the whole submission as JSON to any endpoint |
| `REPORT_WEBHOOK_TOKEN` | optional; sent as `Authorization: Bearer …` |
| `REPORT_SINK` | force `d1` or `webhook`; unset means "use whatever is configured" |

Anything that accepts a JSON POST works: a Google Apps Script bound to a sheet
(stakeholders watch reports arrive in a spreadsheet, zero infrastructure),
Airtable, Supabase, or this project's own FastAPI so the labels land next to the
clusters they label.

⚠️ **A primary sink is awaited; a mirror is not.** With both configured D1 is the
store of record and the webhook is fire-and-forget — a reader should not wait on
Google Sheets to be told their report landed, and a mirror failure is not their
problem. With only a webhook configured it *becomes* the primary and is awaited,
because otherwise the 201 would be a claim nothing backs.

⛔ With **no** sink configured the endpoint returns **503**, not 500: a missing
binding is a deployment fault, and "try again in a moment" would invite someone
to retype a report that can never land.

### Reporting bad listings (D1)

`functions/api/reports.ts` is the only server-side surface. Pages Functions
deploy from this repo with the site, so there is no second service.

```bash
npx wrangler d1 create dealsonline-reports          # note the id it prints
npx wrangler d1 execute dealsonline-reports --remote --file=./schema.sql
```

Then bind it in **Pages → Settings → Functions → D1 bindings**: variable `DB`.

Read reports with:

```bash
npx wrangler d1 execute dealsonline-reports --remote \
  --command "SELECT cluster_id, reason, COUNT(*) n FROM reports GROUP BY 1,2 ORDER BY n DESC LIMIT 50"
```

⛔ **Without the binding the endpoint returns 500 and the UI says so.** It never
shows a confirmation it cannot back up — a static preview with no Function
returns the SPA shell at 200, so the client checks for a JSON content-type
before believing a report was stored.

⚠️ **Reports are anchored on more than `cluster_id`.** 4,082 of 61,473 clusters
are unions of several engine clusters and the absorbed ids are not published, so
an id can stop resolving after a rebuild. Each row also stores `store_url` (a
real listing, independent of our clustering) and `captured_at` (which snapshot
the reader saw).

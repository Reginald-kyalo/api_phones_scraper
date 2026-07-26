# Deploying the DealsOnline demo

The build is **fully static**. There is no API, no database and no runtime
configuration: the whole catalogue ships as committed JSON under `public/demo/`
and is read by `src/app/lib/demoSource.ts`. Verified with the backend stopped —
0 `/api/` requests on any route.

## Build

```bash
npm ci
npm run build          # -> dist/
```

Serving `dist/` on any static host is enough.

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
| SPA fallback | `/deals` is not a file; a hard refresh or shared link would 404 | `public/_redirects` (Netlify/Cloudflare) and `public/404.html` (GitHub Pages) |
| Long cache on `/demo/*` | ~143 MB of content-stable JSON | `dist/_headers`, written by `scripts/postbuild.mjs` |

**How the GitHub Pages path works:** the host serves `404.html` for unknown
paths; it parks `location.href` in `sessionStorage` and bounces to the app root,
and an inline script in `index.html` `<head>` puts the URL back before the
router reads it.

⛔ That restore **must** stay a classic inline script in `<head>`. ES imports are
hoisted, so anything in `main.tsx` runs *after* `routes.ts` has already called
`createBrowserRouter` — which snapshots `location.pathname`. Placing it there
looks correct and silently sends every deep link to the homepage.
`tests/test_capture_demo_dataset.py::test_spa_deeplink_restore_runs_before_modules`
guards this.

## Host notes

- **Cloudflare Pages (the target)** — connect the GitHub repo; build command
  `npm run build`, output `dist`. `_redirects` and `_headers` are read
  automatically. Reporting needs a one-time D1 setup, below.
- **Vercel** — add a rewrite of `/(.*)` to `/index.html`; it does not read
  `_redirects`.
- **GitHub Pages** — build with `BASE_PATH=/<repo>/` and publish `dist`.
  `404.html` supplies the fallback. Note Pages ignores `_headers`, so the
  dataset is not long-cached there.
- **S3 / CloudFront** — set the error document to `index.html` (200), or upload
  `404.html` as the 404 document.

## Regenerating the dataset

From the API repo, with MongoDB running:

```bash
CLUSTERS_COLLECTION=product_clusters_mvp \
  apienv/bin/python -m scripts.capture_demo_dataset
```

It rewrites `public/demo/` in place — manifest, paginated listings, sharded
details and the search index. Rebuild afterwards.

⚠️ **Every re-capture rewrites all ~280 shard files**, so each one adds roughly
another 100 MB of git objects. If the dataset is regenerated often, untrack
`public/demo/` and generate it in CI before `npm run build` instead.

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

Connect the repo in the Pages dashboard: build `npm run build`, output `dist`,
Node 20. Every push to the default branch deploys; pull requests get preview
URLs. Measured against the platform limits, the build fits comfortably:

| limit | ours |
|---|---|
| 20,000 files per deployment | **466** |
| 25 MiB per file | **3.5 MB** largest (`demo/search/groceries.json`) |

⚠️ **The repo is the constraint, not Pages.** `public/demo/` is ~144 MB and a
re-capture rewrites all ~430 shard files, adding roughly another 100 MB of git
objects each time. Pages clones the repo on every build, so this only gets
slower. If the dataset will be regenerated regularly, untrack it and generate it
in the build step instead — the site does not care where the JSON comes from.

### Reporting bad listings (D1)

`functions/api/reports.ts` is the only server-side surface. Pages Functions
deploy from this repo with the site, so there is no second service.

```bash
npx wrangler d1 create dealsonline-reports          # paste id into wrangler.toml
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

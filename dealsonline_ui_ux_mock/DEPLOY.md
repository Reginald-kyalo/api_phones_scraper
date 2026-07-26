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

Connect the repo in the Pages dashboard: build `npm run build`, output `dist`,
Node 20. Every push to the default branch deploys; pull requests get preview
URLs. Measured against the platform limits, the build fits comfortably:

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

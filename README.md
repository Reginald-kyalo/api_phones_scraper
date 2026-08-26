# api_phones_scraper — DealsOnline serving layer

The **serving half** of DealsOnline, a Kenyan price-comparison site: a FastAPI + MongoDB
API, the React frontends that consume it, and the capture script that turns the live
catalogue into a fully static demo.

**Live demo:** <https://dealsonline-d58.pages.dev/>

It scrapes nothing and matches nothing. All of that happens upstream in
[`../phones_scraper`](#upstream-the-phones_scraper-engine); this repo **reads that engine's
Mongo output** and shapes it into an HTTP contract.

> ⚠️ **Active branch: `clusters-api`.** That is where the work is — it runs **59 commits
> ahead of `main`**, and carries the whole clusters/departments API and the current
> frontend. `main` is a stale snapshot; read and branch from `clusters-api` instead.

---

## The two catalogues

Everything here traces back to one of two datasets, and they are not equal:

| | **Clusters** (`/api/clusters/*`) | **PR catalogue** (`/api/pr/*`) |
|---|---|---|
| Source | `product_matching_db.product_clusters_mvp`, built by the engine over `marketplace_scraper_db` | `pricerunner_db` — scraped UK PriceRunner/Klarna |
| Prices | **Real KES**, per store, with the store's own URL | GBP magnitudes, meaningless for Kenya |
| Images | From the Kenyan listings | Hotlinked from `owp.klarna.com` |
| Status | **The real product.** What ships. | Legacy. Rich tree and images only; being retired |

⭐ **`PRODUCTION_READINESS.md` (2026-06-18) says "the data isn't real". That is no longer
true.** Real scraped Kenyan-retailer products were captured into
`dealsonline_ui_ux_mock/` on 2026-07-26: **88,137 clusters** across 15 categories, 38 store
identities, 3,568 deals, from 46 store collections in `marketplace_scraper_db`. The PR
catalogue's problems (§1 of that doc) are real; the "no real data" verdict is stale.

---

## Layout

```
app/                        FastAPI service
  main.py                     app factory, CORS, security headers, /healthz
  api/routes/clusters.py      /api/clusters — the real Kenyan comparison API
  api/routes/pricerunner.py   /api/pr      — legacy UK catalogue
  api/routes/products.py      /api/products — older SPA product API
  api/hygiene.py              serving-layer data repair (never writes Mongo)
  api/taxonomy.py, departments.py   category tree + department spine
  routes/                     session auth, favorites, price alerts, M-Pesa payments
  database.py                 Mongo/Redis clients (9 databases — see below)
scripts/capture_demo_dataset.py   live Mongo -> static JSON shards for the demo
tests/                      pytest; schema, taxonomy, hygiene and fixture suites
dealsonline_ui_ux_mock/     ⭐ current frontend — static, real data, no API at runtime
dealsonline_ui_ux/          previous frontend — talks to the live API
dealsonline_ui_ux_bac/      backup of an earlier iteration
docs/backend-data-issues.md catalogue of data defects, with verdicts and fixes
```

### Clusters API surface

```
GET /api/clusters/search            GET /api/clusters/deals
GET /api/clusters/by-node/{slug}    GET /api/clusters/browse-tree
GET /api/clusters/departments       GET /api/clusters/by-department/{id}
GET /api/clusters/{cluster_id}
```

---

## Running it

```bash
apienv/bin/python -m app.main          # uvicorn on $PORT (default 10000)
apienv/bin/pytest                      # test suite
```

Needs `.env` with `MONGO_URI`, `REDIS_URL`, `PRIMARY_SECRET_KEY`, `BREVO_API_KEY` and the
M-Pesa Daraja credentials.

⛔ **There is no working deploy pipeline.** `.github/workflows/azure-deploy.yml` is
**retired** — it builds a `Dockerfile.azure` that no longer exists in the repo. Treat it as
dead weight, not as the deploy path.

### The static demo

`dealsonline_ui_ux_mock/` is what serves <https://dealsonline-d58.pages.dev/> on
Cloudflare Pages, and it has **no backend at runtime**. `capture_demo_dataset.py` reads
`product_clusters_mvp`, projects each cluster through the API's own `_cluster_view` so the
fixtures match the live contract by construction, and shards it into `public/demo/`
(~151 MB, ~430 files, git-ignored). What ships is one byte-reproducible
`data/demo-dataset.tar.gz` (15 MB), unpacked by a `prebuild` hook.

```bash
apienv/bin/python -m scripts.capture_demo_dataset   # re-capture (needs Mongo)
cd dealsonline_ui_ux_mock && npm ci && npm run build
```

---

## Upstream: the `phones_scraper` engine

Sibling repo at `../phones_scraper`. It scrapes ~60 Kenyan stores and answers the hard
question in the middle — *is this jumia listing the same product as that kilimall one?* —
with **exact identity-key equality**, no title similarity on the live path.

```
stores on the web
  ① SCRAPE   -> marketplace_scraper_db.<store>_products     ~46 raw collections
  ② COMPILE  -> product_matching_db.compiled_products       normalised, prices -> KES
  ③ CLUSTER  -> product_matching_db.product_clusters        the comparable unit
  ④ TAXONOMY -> taxonomy_db.browse_nodes + browse_placements
  ⑤ SERVE    -> this repo (reads Mongo directly)
```

Its state: a working engine **run by hand**, not deployed — ~480k compiled listings, ~105k
clusters, a 4k-node category tree. Read its `docs/ARCHITECTURE.md` §7 before touching it;
large parts of that repo look live and are not.

⛔ **The keyer is frozen** until the manual match review completes. That is why data defects
found here are fixed in `app/api/hygiene.py` at serve time and **never** by rewriting Mongo.

---

## Known rough edges

- **Nine Mongo databases**, split by category — `phones_db`, `cosmetics_db`, `laptops_db`,
  `shoes_db`, `sound_systems_db`, plus `pricerunner_db`, `taxonomy_db`, `getprice_db`, `db`.
  Organic sprawl from earlier generations, not a unified catalogue; the clusters path uses
  `product_matching_db` and ignores most of them.
- **Images are still hotlinked** from Klarna on PR-backed surfaces — not ours to serve, and
  they will break. Own storage + CDN is outstanding.
- **SEO:** the frontends are client-rendered SPAs. For a comparison business that lives on
  Google product queries, SSR/SSG + schema.org `Product`/`Offer` is the biggest technical
  gap left (`PRODUCTION_READINESS.md` §2).
- Per-defect detail, evidence and verdicts: `docs/backend-data-issues.md`.

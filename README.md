# api_phones_scraper — DealsOnline serving layer

The **serving half** of DealsOnline, a Kenyan price-comparison site: a FastAPI + MongoDB
API, the React frontends that consume it, and the capture script that turns the live
catalogue into a fully static demo.

**Live demo:** <https://dealsonline-d58.pages.dev/>

It scrapes nothing and matches nothing. All of that happens upstream in
[`../phones_scraper`](#upstream-the-phones_scraper-engine); this repo **reads that engine's
Mongo output** and shapes it into an HTTP contract.

---

## Run it in two minutes — no backend required

The demo frontend has **no API and no database at runtime**. The entire catalogue ships in
the repo as a 15 MB reproducible archive, unpacked by a `prebuild` hook.

```bash
cd dealsonline_ui_ux_mock
npm ci
npm run dev            # or: npm run build && npm run preview
```

That's the whole setup. Verified with the backend stopped — 0 `/api/` requests on any route.

### What's in it

Captured 2026-07-26 from live Mongo, from ~46 scraped Kenyan store collections:

| | |
|---|---|
| Product clusters | **88,137** across 15 categories |
| …with more than one store (the actual comparisons) | **7,641** |
| Deals | 3,568 |
| Distinct retailers | 38 |
| With an image / with price history | 73,894 / 19,076 |
| Prices | **real KES**, per store, each with the store's own URL |

Excluded rather than shipped broken: 7,834 unpriced, 4,395 unbuyable, 5,618 stale (>60 days).

`scripts/capture_demo_dataset.py` projects every cluster through **the API's own
`_cluster_view`**, so the static fixtures match the live HTTP contract by construction rather
than by hand-maintained parity. `public/demo/` (~151 MB, ~430 shards) is git-ignored; what
ships is one **byte-reproducible** `data/demo-dataset.tar.gz`, pinned by
`test_packing_is_reproducible` — tar mtimes and the gzip header stamp otherwise make every
pack a fresh 15 MB blob in git history.

---

## How matching actually works

The hard question upstream is *is jumia's "Samsung Galaxy A05 64GB+4GB (Dual SIM) - Black"
the same product as kilimall's "Samsung A05 4/64GB Smartphone"?* Kenyan retail has no GTINs
and no shared catalogue, so there is nothing to join on.

**The production answer is deterministic: exact identity-key equality.** Titles are parsed
into a canonical key (brand, model, capacity, size) and two listings are the same product
only if their keys match exactly. `cluster_compiled.py` and `cluster_grocery.py` use **no
similarity of any kind** — no fuzzy ratio, no embeddings, no learned scorer.

That is a deliberate trade, not a shortcut. A wrong merge on a price-comparison site is a
visible, trust-destroying error — two different phones sharing one price — and a similarity
score gives you no way to explain *why* two things merged, or to fix one case without moving
every other case. An exact key is auditable and reversible: you can point at the token that
did it.

⚠️ **One measured exception, and it is the corpus this demo serves.** The API reads
`CLUSTERS_COLLECTION`, which for the demo is `product_clusters_mvp` — built by
`build_mvp_clusters.py`, which layers a similarity merge on top of the engine's exact-key
output **for groceries only**: sklearn TF-IDF over `char_wb` 3–5 grams, L2-normalised,
cosine top-K (k=10) at a **0.82** floor, plus shared pack size. Production grocery recall by
exact key alone is ~5–9%, which under-sells the data badly.

It is fenced in on every side:

- **Separate collection.** It never touches `product_clusters`, which is the baseline every
  recall figure is measured against.
- **Error rate quantified, not hoped at.** It merges roughly **1 in 6** pairs a human labelled
  a *variant* (500g vs 1kg, organic vs not). Acceptable for a demo; explicitly not acceptable
  as a source of truth or as training labels.
- **Labelled in the data.** Every document is stamped `mvp_generated: True` and `mvp_rule`, so
  nothing downstream can mistake it for engine output.
- **Chosen by measurement.** The rule that won on gold *pairs* (subset+size, 77.3% recall)
  collapsed the corpus into blobs as a *clustering* rule — one 1,506-member "Aquamist Mineral
  Water". Top-K beat the earlier token rule 4,272 to 4,213 multi-store clusters while cutting
  blob rejections 4,342 → 327.

So: deterministic by default; similarity only where recall demanded it, in an isolated
collection, with its failure rate measured and stamped on every row.

⛔ **Not on the live path, despite existing in the tree:** the 4-tier
`rule → fuzzy → BM25 → semantic` cascade in `product_matching/` (zero importers),
`structured_matcher.py`'s rapidfuzz scorer (every importer is an eval tool), dense embeddings,
and the Gemini reviewer. There is **no learned pairwise scorer** — that is the named next step,
the thing meant to reject those variant merges. Training scaffolding exists
(`export_training_pairs.py`, `train_cpu_floor.py`); the model does not.

---

## The two catalogues

| | **Clusters** (`/api/clusters/*`) | **PR catalogue** (`/api/pr/*`) |
|---|---|---|
| Source | `product_matching_db`, built by the engine over `marketplace_scraper_db` | `pricerunner_db` — scraped UK PriceRunner/Klarna |
| Prices | **Real KES**, per store, with the store's URL | GBP magnitudes, meaningless for Kenya |
| Images | From the Kenyan listings | Hotlinked from `owp.klarna.com` |
| Status | **The real product.** What ships. | Legacy. Rich tree and images only; being retired |

> `PRODUCTION_READINESS.md` (2026-06-18) says "the data isn't real". That was true then and
> is not now — the 2026-07-26 capture above is real scraped Kenyan-retailer data. Its other
> findings still stand.

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
  database.py                 Mongo/Redis clients
scripts/capture_demo_dataset.py   live Mongo -> static JSON shards
tests/                      pytest; schema, taxonomy, hygiene and fixture suites
dealsonline_ui_ux_mock/     ⭐ current frontend — static, real data, no API at runtime
dealsonline_ui_ux/          previous frontend — talks to the live API
docs/backend-data-issues.md every known data defect, with evidence and verdict
```

```
GET /api/clusters/search            GET /api/clusters/deals
GET /api/clusters/by-node/{slug}    GET /api/clusters/browse-tree
GET /api/clusters/departments       GET /api/clusters/by-department/{id}
GET /api/clusters/{cluster_id}
```

### Fixing data at serve time

Defects found in the engine's output are repaired in `app/api/hygiene.py` — brand extraction
that grabbed `14-inch` or `3.5mm`, display names title-cased from the normalised key until
`HT S40R` became `Ht … S40r`, dead listings with a live-looking price — and **never** by
rewriting Mongo. The keyer that produced them is frozen pending manual match review, and
Mongo is the measurement baseline. Same doctrine as `scripts/category_purity.py`.

The obvious rules over-reach, and the corpus proves it: "a brand cannot start with a digit"
blanks `7Up`, `4th Street`, `5Tea` and `4US`, all real. Only unambiguous measurements are
rejected. Detail and counts: `docs/backend-data-issues.md`.

---

## Running the API

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m app.main     # uvicorn on $PORT (default 10000)
.venv/bin/pytest
```

Needs a `.env` with `MONGO_URI`, `REDIS_URL`, `PRIMARY_SECRET_KEY`, `BREVO_API_KEY` and the
M-Pesa Daraja credentials — and a populated Mongo, which only the upstream engine can build.
**If you just want to see the thing work, use the static demo above instead.**

---

## Upstream: the `phones_scraper` engine

Sibling repo at `../phones_scraper`. It scrapes ~60 Kenyan stores and produces everything
this repo serves.

```
stores on the web
  ① SCRAPE   -> marketplace_scraper_db.<store>_products     ~46 raw collections
  ② COMPILE  -> product_matching_db.compiled_products       normalised, prices -> KES
  ③ CLUSTER  -> product_matching_db.product_clusters        the comparable unit
  ④ TAXONOMY -> taxonomy_db.browse_nodes + browse_placements
  ⑤ SERVE    -> this repo (reads Mongo directly)
```

A working engine **run by hand**, not deployed: ~480k compiled listings, ~105k clusters, a
4k-node category tree. Read its `docs/ARCHITECTURE.md` §7 first — large parts of that repo
look live and are not.

---

## Known rough edges

- **No deploy pipeline.** `.github/workflows/azure-deploy.yml` is retired — it builds a
  `Dockerfile.azure` that no longer exists. Dead weight, not the deploy path.
- **Nine Mongo databases**, split by category (`phones_db`, `cosmetics_db`, `laptops_db`,
  `shoes_db`, `sound_systems_db`, plus `pricerunner_db`, `taxonomy_db`, `getprice_db`, `db`) —
  organic sprawl from earlier generations. The clusters path uses `product_matching_db` and
  ignores most of them; consolidating to one product/offer schema is outstanding.
- **Images are still hotlinked** from Klarna on PR-backed surfaces — not ours to serve, and
  they will break. Own storage + CDN is outstanding.
- **SEO:** both frontends are client-rendered SPAs. For a business that lives on Google
  product queries, SSR/SSG plus schema.org `Product`/`Offer` is the biggest gap left.
- **Active branch is `clusters-api`**, ~59 commits ahead of `main`.

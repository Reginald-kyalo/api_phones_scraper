# DealsOnline — Production-Readiness Assessment

> Engineering review of the system architecture and its readiness to serve a
> nationwide Kenyan price-comparison service. Companion to
> `dealsonline_ui_ux/DESIGN_HANDOFF.md` (which covers the frontend/design work).
> Date: 2026-06-18.

## Verdict

A **credible foundation with a real spine** (FastAPI + MongoDB + Redis + M-Pesa +
auth + a modern SPA), with evident thought behind it. But it is **not
production-ready for nationwide service yet** — and the blockers are **not** the
UI. They are **data strategy, SEO, and operational maturity**. The frontend is
currently running ahead of the data/ops layer.

## What's genuinely solid

- **Modern frontend:** React 18 + Vite + TS + Tailwind v4 + shadcn/ui, feature-folder
  structure, lazy-loaded routes. Good bones; design/a11y layer now strong.
- **Reasonable async backend:** FastAPI + Motor (async Mongo) + Redis, APScheduler,
  session auth, and favorites / price-alerts / subscriptions already scaffolded.
- **M-Pesa STK Push (Daraja) is integrated** (`app/routes/payment.py`) — correct and
  essential for Kenya; most generic templates omit this entirely.
- **CORS is allow-listed** (not `*`), there's an **Azure deploy pipeline**
  (`.github/workflows/azure-deploy.yml`).

## Critical blockers — BEFORE production

### 1. The data isn't real (the existential one)
The catalog is **scraped PriceRunner/Klarna data** (`pricerunner_db`, images
hotlinked from `owp.klarna.com`, prices in **£** for UK products). The core promise
— *real prices from Kenyan retailers* — is **not backed by real data yet**. This is
both a **product gap** and a **legal/IP/ToS risk** (serving a competitor's catalog
nationwide).
- **Needed:** your own retailer data pipeline — merchant feeds / affiliate APIs /
  agreements with Jumia, Kilimall, Phone Place, Avechi, etc.
- **Needed:** your own **image storage + CDN** (hotlinking Klarna will break and is
  not yours to serve).

### 2. SEO — near-fatal for a comparison site as a pure SPA
Price-comparison businesses live on Google product/price queries. Client-rendered
Vite means crawlers see an empty shell.
- **Needed:** SSR/SSG (Next.js, or Vite SSR / prerender), **schema.org
  `Product` / `Offer` / `AggregateOffer`** structured data, sitemaps, per-product
  canonical URLs. This is the **#1 technical evolution** for the business model.

### 3. A headline feature isn't running
The price-alert monitoring jobs in `app/main.py` are **commented out** — alerts are
not checked on a schedule. Scraping/monitoring also runs **in-process via
APScheduler**, which won't survive multiple instances or scale.
- **Needed:** decouple to a **worker + queue / scheduled job** (Celery/RQ or a cloud
  scheduler), separate from the API process; re-enable and monitor the alert loop.

### 4. Fragmented data model
Nine Mongo databases split by category (`phones_db`, `cosmetics_db`, `laptops_db`,
`shoes_db`, `sound_systems_db`, plus `pricerunner_db`, `taxonomy_db`, `getprice_db`,
`db`). Organic sprawl, not a unified catalog.
- **Needed:** consolidate to one **product/offer schema** with deliberate indexes;
  otherwise search, dedup, and cross-category features get painful.

### 5. Operating blind
No error tracking, metrics, or structured logging (no Sentry/OTel/Prometheus), and
**~zero test coverage** (one test file, `tests/test_design_tokens.py`).
- **Needed:** error tracking + metrics + structured logs, and a real test safety net
  (API contract tests, critical-path e2e) before national traffic.

### 6. Secrets hygiene
`app/routes/payment.py` hardcodes credential **defaults** in source. (They're the
public Safaricom **sandbox** test values, so not a real leak — but the pattern is
dangerous.)
- **Needed:** real keys only from env/secret manager, with rotation; flip
  `MPESA_ENVIRONMENT` to `production` deliberately.

## What should evolve — AFTER production

- **Product matching / dedup** — the genuinely hard problem: recognizing "the same
  product" across retailers with messy titles (ML/embeddings + rules). Where a
  comparison engine wins or dies.
- **Real search** — move off Mongo text search to **Typesense / Meilisearch /
  Elastic** for typo-tolerance, facets, ranking.
- **Price freshness SLAs** + price-history at scale; a retailer-onboarding pipeline;
  **click-out / affiliate tracking** (the revenue model).
- **Caching/CDN strategy**, **rate limiting / abuse protection**, **PWA or mobile
  app** (Kenya is mobile-first), **Swahili i18n**, analytics/experimentation.
- **Compliance:** Kenya's **Data Protection Act (2019)** — consent, data handling,
  and the cookie/privacy flows wired for real.

## Bottom line

The skeleton and the now-premium frontend are a solid head start, and M-Pesa being
real is a meaningful advantage. Priority order to become a shippable national product:

1. A legitimate **Kenyan-retailer data pipeline + own image/CDN**.
2. **SSR + structured data** for SEO.
3. **Decoupled scraping/alerts + observability + tests**.

Nail those and this becomes genuinely shippable; ship without them and it's a polished
demo on borrowed data.

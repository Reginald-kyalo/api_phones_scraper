# Backend Data Issues

Catalog of data/curation defects observed from the frontend during the 2026-07-07
design review and clusters wiring. Each entry: evidence (live API, verified that
day), user-facing impact, and suggested fix. Frontend guards noted where they
exist — a guard hides the symptom, the data still needs fixing.

Two datasets are involved:

- **PR catalog** (`/api/pr/*`, Mongo `pricerunner` data): scraped UK PriceRunner /
  Klarna data. Rich tree + images, but foreign prices and no real Kenyan offers.
- **Clusters** (`/api/clusters/*`): the matching engine's output over scraped
  Kenyan stores. Real KES prices and per-store URLs; limited categories
  (`mobile-phones`, `laptops`, `tablets`, `headphones`, `monitors`).

---

## P1 — actively misleading users

### 1. PR catalog prices are GBP magnitudes rendered as KES

- **Evidence:** `GET /api/pr/product/3431242039` → iPhone 17 Pro Max, `price: 1134.99`.
  The UI (all KES after the currency sweep) renders "KES 1,135" for a flagship phone.
- **Impact:** Every PR-backed surface (browse, product page, homepage trending)
  shows nonsense prices for the Kenyan market. This is the single biggest
  honesty problem left.
- **Fix options (decision needed):** (a) descope PR prices — use the PR catalog
  for discovery/images only and route all pricing to clusters; (b) store and
  serve a currency field + convert; (c) retire PR-backed pricing surfaces.
- **Frontend guard:** none possible — the number itself is wrong for the market.

### 2. `/api/pr/homepage` "deals" are junk 0.1-priced rows

- **Evidence:** `GET /api/pr/homepage` deals = "Puzzle DLC EU" (0.1), "Clear
  Shockproof Hybrid 3 in 1 Mobile Phone Cover" (0.1), more DLCs — selected by
  lowest absolute price, not by discount or comparison quality.
- **Impact:** The homepage "Top deals" rail would be garbage if wired to it
  (why the homepage still runs on `homepageMock.ts`).
- **Fix:** curate server-side — require valid price (≥ some floor), multiple
  stores, and a real discount signal; or replace the endpoint's deals section
  with the clusters deals feed.
- **Frontend guard:** `formatPrice` returns "Price N/A" for values < 1; homepage
  uses mock data.

### 3. NSFW top product in `health_beauty`

- **Evidence:** flagged 2026-06-17 (see project memory): the top product for
  `health_beauty` by store count is an adult item.
- **Impact:** cannot surface category top-products blindly anywhere.
- **Fix:** category-level curation/deny-list server-side, or an `nsfw` flag in
  the feed so clients can filter.
- **Frontend guard:** homepage avoids category top-products; nothing systematic.

---

## P2 — junk rows and parsing artifacts

### 4. Empty product-type document in `/api/pr/product-types`

- **Evidence:** the endpoint returns 15 rows, one with `id: ""`, `label: ""`
  (between `sound_vision` and `photography`).
- **Impact:** rendered as a blank icon-only sidebar button on /browse (before
  the client guard).
- **Fix:** delete the junk Mongo document; add a not-empty constraint to the
  ingest that writes product types.
- **Frontend guard:** `pricerunnerApi.getProductTypes` now filters empty
  id/label rows (commit `147ef276`).

### 5. Cluster brand extraction picks up non-brands

- **Evidence (live, 2026-07-07):**
  - `laptops::14-inch::macbook-m3::pro` → `brand: "14-inch"`, display name
    "14-inch MacBook M3 Pro" (brand should be Apple).
- **Impact:** wrong eyebrow label on deal cards; breaks any brand facet/filter
  built on clusters; the identity key itself is polluted (`14-inch` occupies
  the brand slot), which risks splitting Apple MacBook clusters.
- **Fix:** brand extractor should reject size/spec tokens (`\d+-inch`, storage,
  RAM) and map known model families (MacBook → Apple) before keying.

### 6. Display-name generator reorders model tokens

- **Evidence:** `mobile-phones::jx::12::note` → display name "Jx 12 Note", but
  both underlying listings are titled "JX NOTE 12" (jumia.co.ke 6,150;
  kilimall.com 6,499 — the match itself is CORRECT; JX is a real budget brand).
- **Impact:** users see a model name written in an order no store uses;
  reduces trust and searchability.
- **Fix:** display_name should follow the majority token order of member
  titles rather than the normalized identity-key order.

### 7. Two-listing clusters can still carry mis-parsed prices

- **Evidence:** documented in `app/api/routes/clusters.py` comments (the
  "354 KES Moto" case): the engine's outlier price-band only applies to
  clusters with ≥ 3 prices, so 2-listing clusters can headline a junk price
  and a fake spread. Serving-layer guards exist but the underlying parses
  remain in the data.
- **Impact:** occasional fake "best price"/huge-spread deals in thin clusters.
- **Fix:** extend outlier detection to n=2 (e.g., price-ratio sanity bound vs
  category median) at build time, not just at serve time.

---

## P3 — data the frontend needs but the feed doesn't carry

### 8. Cluster views have no images

- **Impact:** cluster deal cards and any future cluster rails are text-only;
  homepage rails can't be wired to clusters without an image strategy.
- **Fix:** carry a representative listing image (or per-store image URLs) in
  `_cluster_view`.

### 9. Cluster views have no price history

- **Impact:** the product-page chart still runs on `generatePriceHistory`
  mock; the new `/prices/:clusterId` page has no history section.
- **Fix:** expose the compiled products' `price_history` in `_cluster_view`
  (small backend add, noted in the 2026-07-07 plan follow-ups).

### 10. PR product detail content is thin

- **Evidence:** `GET /api/pr/product/{id}` description for the sampled iPhone
  is just "iOS"; the "Product details" section renders one word.
- **Impact:** dead-weight page section; specs exist only as cluster
  `spec_facets`.
- **Fix:** either enrich PR detail at scrape time or drop the section for
  products without real content.

### 11. No reviews source exists

- **Impact:** product-page Reviews section is a permanent empty state
  (placeholder mock removed from display but no data behind it).
- **Fix:** decide product direction first (aggregate store ratings? drop
  reviews?); no scraping work until then.

---

## P4 — API behavior notes (not data, but observed from the client)

### 12. Session probe 401s in the console for every signed-out visitor

- **Evidence:** every page load fires an auth/session request that 401s when
  logged out; browsers always log failed requests, so the console is never
  clean.
- **Fix:** a cheap `GET /api/auth/session` variant that returns 200 with
  `{authenticated: false}`, or the client skips the probe without a session
  cookie hint.

### 13. Legacy `/api/products/deals` caps `limit ≤ 50`

- **Evidence:** `?limit=120` → 422 (this silently blanked the old Deals page).
- **Status:** Deals page moved to `/api/clusters/deals`; the legacy endpoint
  is now unused by the UI. Keep the cap documented or align it if anything
  else consumes it.

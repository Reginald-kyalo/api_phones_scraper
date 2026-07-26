# Backend Data Issues

Catalog of data/curation defects observed from the frontend during the 2026-07-07
design review and clusters wiring. Each entry: evidence (live API, verified that
day), user-facing impact, and suggested fix. Frontend guards noted where they
exist — a guard hides the symptom, the data still needs fixing.

---

## Revalidation 2026-07-25 — what is still true

Every clusters-side entry was re-measured against `product_clusters_mvp` (62,668
shipped clusters). Verdicts below; the detail is inline on each entry.

| # | issue | verdict | where it stands |
|---|---|---|---|
| 5 | brand holds non-brands | ✅ **real, wider than reported** | fixed in the serving layer — 330 clusters |
| 6 | display_name reorders tokens | ✅ **real, 1,463 clusters** | fixed — but the *suggested* fix was wrong, see below |
| 7 | 2-listing mis-parsed prices | ⚠️ unchanged | still serving-layer guarded only |
| 8 | cluster views have no images | ✅ **done** | 46,701 of 61,473 carry one |
| 9 | cluster views have no price history | ⚠️ **partly** | 3,556 clusters (5.8%); groceries still have none |
| 11 | no reviews source | ⚠️ unchanged | section removed rather than faked |
| — | **stale / unbuyable products shipped** | 🆕 **found, fixed** | 1,195 dead rows removed |
| — | **one retailer under two identities** | ✅ **real, harmless to prices** | folded — 43 → 38 store identities |

⭐ **The most important correction: two of these were reported with a suggested fix
that measures wrong.** #6's "follow the majority token order of member titles"
would produce *worse* titles (member tokens are stored folded and lower-case, so
rebuilding from them yields "ht s20r sony"). And the intuitive form of #5 — "a
brand cannot start with a digit" — blanks the real brands `7Up`, `4th Street`,
`5Tea` and `4US`. Both are fixed, neither the way it was proposed.

⛔ **The freeze applies.** All of these originate in the keyer, which is frozen
until the manual match review completes. Fixes live in `app/api/hygiene.py` and
never rewrite Mongo — same doctrine as `scripts/category_purity.py`.

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
- **✅ FIXED 2026-07-25, serving layer** (`app/api/hygiene.clean_brand`). The cited
  cluster no longer exists, but the family does and is wider than one shape: 330
  clusters (78 distinct values) across sizes (`3.5mm`, `12 inch`), audio configs
  (`3.1ch`, `16 channel`), wiring (`6way`, `2-pin`), pack counts (`2pcs`,
  `1 pair`), "N in 1" (`3-in-1`) and dimensions (`74x54x6`).
- ⛔ **The obvious rule over-reaches and the corpus proves it.** "A brand cannot
  start with a digit" would blank `7up` (7Up 330Ml), `4th` (4th Street Sweet Red),
  `5tea` and `4us` — all real. Only unambiguous measurements are rejected, and
  `m` is excluded from the unit list so `3M` can never be blanked (the cost is two
  eyebrows reading "30M" for cable lengths).
- ⚠️ **The MacBook → Apple half was NOT done.** Mapping model families to brands
  is a second guess layered on the keyer's first one; a missing brand renders as
  no eyebrow, which is honest. The real fix is in the keyer, and it is frozen.

### 6. Display-name generator reorders model tokens

- **Evidence:** `mobile-phones::jx::12::note` → display name "Jx 12 Note", but
  both underlying listings are titled "JX NOTE 12" (jumia.co.ke 6,150;
  kilimall.com 6,499 — the match itself is CORRECT; JX is a real budget brand).
- **Impact:** users see a model name written in an order no store uses;
  reduces trust and searchability.
- **Fix:** display_name should follow the majority token order of member
  titles rather than the normalized identity-key order.
- **✅ FIXED 2026-07-25, serving layer** (`app/api/hygiene.best_title`). Real at
  scale: **1,463 clusters (2.3%)** where display_name is a pure permutation of
  every member title. The cited `jx::12::note` cluster is gone; the mechanism is
  not, and it is worse than reordering — display_name is title-cased *from the
  normalised key*, so casing dies too:

  ```
  representative_title  Sony 5.1ch Home Cinema with Wireless Rear Speakers | HT S40R
  display_name          Sony Ht 5.1ch Home Cinema With Wireless Rear Speakers S40r
  ```

  The model identifier `HT S40R` is torn in half and lower-cased.
- ⛔ **The suggested fix would have made it worse.** Member tokens are stored
  folded and lower-case, so rebuilding from their majority order yields
  `"ht s20r sony"`. The wanted string already exists as `representative_title` — a
  real listing, verbatim, correctly cased.
- **What shipped instead:** prefer `representative_title` **only when it is the
  same bag of tokens** as display_name, so the swap is provably lossless. When
  display_name genuinely differs (it stripped store noise — "BRAND NEW … FREE
  DELIVERY"), it still wins.

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

### 14. Dead products shipped as live catalogue (found 2026-07-25)

- **Evidence:** cluster members carry `delisted`, `stock_status` and `last_seen`,
  the engine's `gate_members` reads all three — and `_cluster_view` returned none
  of them, so no consumer could tell a live price from a dead one. Measured over
  the 62,668 captured clusters:
  - **192** were out of stock at *every* store carrying them.
  - **1,003** had not been seen for over 60 days (last seen 2026-04).
  - 3,680 more were fully delisted; those were already excluded, but as
    "unpriced", which misnamed the reason.
- **Impact:** each rendered as an ordinary card with a real price and a "Go to
  store" button leading somewhere you cannot buy. ✅ The **deals feed was clean** —
  0 out-of-stock, 0 over 90 days — because it already required a fresh multi-store
  spread. The rot was entirely in the browse catalogue, which nothing checked.
- **✅ FIXED:** `hygiene.availability` / `hygiene.freshness` recompute both from
  `members[]` and the capture drops the dead rows (62,668 → 61,473, deals
  unchanged at 3,189). Both are now published fields.
- ⚠️ **Recomputed, not read from the engine's stamp,** because the stamp only
  exists on 28,754 of 66,406 clusters — groceries, tvs, printers, routers,
  wearables, desktop-computers and digital-cameras have neither field.
- ⚠️ **And NOT from the members' `fresh` flag**, which is a rebuild-time snapshot
  that has itself gone stale: 99,258 members are flagged `fresh: true` while the
  whole corpus is now 8-30 days old. `last_seen` is the only non-circular evidence.
- ⛔ **Undated ≠ stale.** 3,960 clusters date nothing at source and they are the
  *entirety* of six categories. They ship as `freshness_basis: "unknown"`.
  Dropping unknowns would delete six categories — the same mistake the old
  `n_stores >= 2` cap made when it deleted three.

### 15. One retailer under two identities (found 2026-07-25)

- **Evidence:** grocery scrapers write bare names, device scrapers write domains,
  and five retailers are crawled by both: `cleanshelf`/`cleanshelf.online`,
  `carrefour`/`carrefour.ke`, `naivas`/`naivas.online`,
  `quickmart`/`quickmart.co.ke`, `greenspoon`/`greenspoon.co.ke`.
- **Impact:** 43 store identities where there are 38 retailers. ✅ **Measured
  harmless to prices:** zero clusters name a retailer under both identities, so
  nothing was ever falsely multi-store and no deal was corrupted. The damage is
  confined to per-store aggregates and store facets.
- **✅ FIXED:** `hygiene.canonical_store` folds them in the projection, so
  `stores`, `best_by_store` and `cheapest_store` agree. Manifest `total_stores`
  43 → 38.
- ⚠️ **An explicit five-entry map, not a TLD regex.** The frontend's
  `storeIdentity.ts` strips TLDs generically, which is fine for a display label
  and unsafe for data — it would silently merge any two future stores sharing a
  stem.

---

## P3 — data the frontend needs but the feed doesn't carry

### 8. Cluster views have no images

- **Impact:** cluster deal cards and any future cluster rails are text-only;
  homepage rails can't be wired to clusters without an image strategy.
- **Fix:** carry a representative listing image (or per-store image URLs) in
  `_cluster_view`.
- **✅ DONE:** 46,701 of 61,473 clusters (76%) carry one, chosen stably per
  cluster from grocery member images or device `compiled_products.product_image`.
  The remaining 24% is a genuine source gap — neither carries an image.

### 9. Cluster views have no price history

- **Impact:** the product-page chart still runs on `generatePriceHistory`
  mock; the new `/prices/:clusterId` page has no history section.
- **Fix:** expose the compiled products' `price_history` in `_cluster_view`
  (small backend add, noted in the 2026-07-07 plan follow-ups).
- **✅ DONE 2026-07-26 — and the "gap" was an unread source, not missing data.**
  **13,287 of 61,473 clusters (21.6%)** now carry a real dated series, groceries
  **0% → 24.2% (8,144 clusters)**. Two defects were behind it:
  1. ⛔ **Every timestamp the capture had ever written was empty.** It read a
     `date` key; the sources write `at` (compiled_products) or `timestamp`
     (raw store collections). All 3,556 series shipped as `{"t": "", ...}`. The
     chart drew, the manifest counted them, the suite was green — the fixtures
     used a key spelling production has never produced.
  2. ⭐ **Groceries were never going to resolve.** Their cluster members are not
     in `compiled_products` at all (0 of them), because `cluster_grocery` reads
     `marketplace_scraper_db` directly. The history was always there, in the very
     collection the clusterer reads — `<site>_products.prices` — and nothing
     looked. Every store carries it.
- **Remaining:** 78% of clusters still have no series. That is a genuine source
  gap (one observation per listing), not an unread one.

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

---

## P1 — added 2026-07-26

### 16. ⛔ avechi prices are stored in CENTS — ~380 live listings are 100× too high

- **Evidence:** `marketplace_scraper_db.avechi_products` holds the inflated value
  at source, so this is a scrape-time unit bug, not a matching artifact:

  | product | stored | actual |
  |---|---:|---:|
  | Anker 737 GanPrime 120W Charger | 999,900 | ~9,999 |
  | Samsung Wireless Charger Trio | 909,900 | ~9,099 |
  | Anker 537 PowerCore 24K 65W | 799,900 | ~7,999 |

- **This is LIVE in shipped categories, not just the new one.** Counting avechi
  listings ≥20,000 KES that divide exactly by 100:

  | slug | avechi listings | suspect | % |
  |---|---:|---:|---:|
  | headphones | 424 | **148** | 34.9% |
  | mobile-phone-accessories | 252 | 103 | 40.9% |
  | wearables | 324 | 58 | 17.9% |
  | routers | 51 | 22 | 43.1% |
  | mobile-phones | 3,179 | 33 | 1.0% |

  The concentration in cheap-goods categories is the signature: 100× a 5,000 KES
  accessory lands in the suspicious band, while laptops (0.0%) and printers (0.0%)
  are unaffected because their real prices already sit there.

- **Impact:** inflates the *dearest* side of a spread, so it manufactures fake
  savings. The deals surface is largely protected by `MAX_DEAL_SPREAD_PCT = 80`,
  but browse will show a 999,900 KES power bank.

- ⚠️ **Do not remediate on a `≥500,000` threshold** — only 26 of the 103 accessory
  cases clear it. The reliable signature is `>= 20,000 and price % 100 == 0`
  scoped to avechi.

- **Fix:** at the scraper (divide avechi by 100 at parse time), not in serving —
  a serving-layer guard cannot distinguish a genuine 20,000 KES round price from
  an inflated 200 KES one without knowing the source unit.

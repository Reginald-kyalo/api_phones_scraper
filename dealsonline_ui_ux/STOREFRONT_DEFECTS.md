# Storefront defects outside the category scope

Reported 2026-08-21, investigated the same day. This started as a scoping pass — each entry says
who owns it, what was actually measured, and what it would take. **#1 has since been fixed**;
the rest are still open.

Ordered by severity. Severity here means *damage to the site's central claim* — this is a
price-comparison storefront, so a wrong shop count outranks a missing chart.

---

## ✅ 1. FIXED — the shop count on every card was overstated — BACKEND + FRONTEND

**Was the single most damaging defect live.** The diagnosis below is kept as the record of what
was measured; the fix is at the end of this section. Cards rendered `cluster.n_stores` as
"N shops". That field counts stores holding a **listing**. The comparison table renders
`best_by_store`, which holds stores with a **usable, gated price**. They are not the same number
and the gap is large.

Measured over 100 clusters from each of two surfaces:

| surface | counts agree | overstated | mean overstatement | worst |
|---|---:|---:|---:|---|
| curated `/clusters/deals` | 48% | **52%** | +4.0 shops | `Google Pixel 8` — says **16**, can price **2** |
| `/by-node/smartphone` | **1%** | **99%** | **+9.6 shops** | `Samsung Galaxy S23 Ultra` — says **20**, can price **2** |

⛔ On the smartphone shelf — the site's flagship category — **99 of 100 clusters overstate**.
`Apple iPhone 14` advertises 12 shops and the page can show one price. A shopper who clicks
through to compare 20 shops and finds 2 has been told something untrue by the surface that exists
to be trusted.

⚠️ **This was never simply a display bug to patch client-side.** `n_stores` is a legitimate field
with a legitimate meaning ("how many shops carry this at all") and other consumers may rely on
it, so the fix had to be a projection decision rather than a client-side reinterpretation.

### Fixed 2026-08-21

**Backend** — `ClusterView.n_stores_priced`, computed in `_cluster_view` as the column count of
`best_by_store`. `n_stores` keeps its meaning and its consumers; the change is additive, the same
shape `n_clusters_subtree` took. Guarded by `tests/test_cluster_comparable_stores.py` (8 tests).

⭐ **Counted AFTER canonicalisation, not before.** `_by_store` folds `carrefour` and
`carrefour.ke` into one column via `fold_by_store`, so counting the raw doc would have swapped
one wrong number for a quieter one. `by_store` is now built once and used twice — as the rendered
map and as the count — so the two cannot disagree. Verified on 100 live smartphone clusters:
`n_stores_priced == len(best_by_store)` on **all 100**.

**Frontend** — `comparedLabel()` replaces `shopLabel()` on cards and on the comparison headline.
Two counts and one explanation, as proposed: the card says *"compared across 3 shops"*, and the
comparison page adds *"Carried by 19 shops — the rest have no usable price right now (out of
stock, delisted, or a used listing)"*. The carried number is real and explains why the product
looks widely stocked; it is simply not a comparison.

⭐ **Below two, the page now says so.** `comparedLabel` renders "only 1 shop — no comparison" and
"no price available" rather than a confident "1 shop". This matters more than it looks: **29 of
100** clusters on the smartphone shelf can price fewer than two shops, so on nearly a third of
that shelf there is no comparison at all — and the old UI advertised up to 17 shops on those.

⚠️ **`configs[].n_stores` was already honest** — checked across 198 live configs,
`cfg.n_stores == len(cfg.by_store)` on every one. Only the cluster-level count was wrong, so the
per-variant line was left alone.

⭐ The render gate now asserts the invariant end to end: it reads a card's claim, opens the
product, and checks the claim equals the number of rows the comparison list shows.

---

## ✅ 2. FIXED — variant shops were a number you could not open — FRONTEND ONLY

**Fixed 2026-09-03.** `VariantBlock` in `ClusterPricesPage.tsx` makes each configuration an
expandable control: the header carries the facet label, `from PRICE at STORE`, the per-variant
`spread_pct` as a chip, and `comparedLabel(...)`; opening it renders the `by_store` map the
payload was already carrying, as real rows with real click-through.

⭐ **THE COUNT IS DERIVED FROM THE ROWS, NOT READ FROM A FIELD** — `pricedOffers(cfg.by_store)
.length`. Two reasons, and the second was found while fixing this: `cfg.n_stores` is the listing
count that overstated the cluster headline by +9.6, **and `ClusterConfig.n_stores_priced` did not
exist**. The TypeScript declared it non-optional and `app/api/schemas/clusters.py:ClusterConfig`
never served it — so a reader following the type's own advice ("Use `n_stores_priced`") would
have got `undefined` and rendered *"compared across NaN shops"* with the compiler's blessing. The
dead declaration is gone and the comment in its place says why.

⭐⭐ **AND THE VARIANT TURNS OUT TO BE THE ONLY HONEST COMPARISON ON THE PAGE.** The cluster-level
list is `best_by_store` — each shop's best price across *every* configuration — so it will put a
128GB phone beside a 256GB one. Live: `Samsung Galaxy A17` is 18,999 vs 21,500 at 128GB (13.2%
apart) and 24,999 vs 29,500 at 256GB (18.0%). Two real comparisons that the old page reduced to
the text "· 2 shops", twice. The block now says this in its own subheading.

⭐ `OfferRow` is shared by both lists, so the count and the rows cannot drift — the same "built
once, used twice" discipline the `n_stores_priced` backend fix used.

⛔ **GATED: `scripts/verify_prices.py`, 34 assertions, proved RED first** — 5 failing, one of them
*passing vacuously* at `0 openers == 0 variants` until the assertion was tightened. The
load-bearing one asserts the claim on the control equals the rows the control opens.

### The original diagnosis, kept as the record

`ClusterPricesPage` renders a "By configuration" block per variant showing
`facet_label · from PRICE at STORE · N shops`. The **N shops is not clickable and nothing
expands it**, so the page states a comparison exists and offers no way to see it.

⭐ **No backend work is needed. The data is already in the payload.** Each entry of
`cluster.configs[]` carries a full `by_store` map:

```json
{ "facet_label": "Apple M2", "best_price": 113999.0, "cheapest_store": "grandhub.co.ke",
  "n_stores": 3, "spread_pct": 79.8,
  "by_store": { "grandhub.co.ke": 113999.0, "le.co.ke": 205000.0, "kenyatronics.com": 114700.0 } }
```

The page reads `facet_label`, `best_price`, `cheapest_store` and `n_stores`, and **drops
`by_store` entirely**. Rendering the per-store rows the variant already carries closes this.

### ✅ 2b. DONE — a variant is now its own comparable page — FRONTEND + ROUTING

**Shipped 2026-09-04. Route key ruled: `/prices/{cluster_id}?facet=<facet_value>`.** A stable
variant id would have been a backend change and this was scoped frontend-only, so the derivable
key won. It also puts the variant in the URL beside `?multi_store=1`, which is this app's
standing rule — a like-for-like comparison of one configuration is the most shareable thing the
site produces.

⛔⛔ **`facet_value` IS NOT ONE TYPE, AND THAT IS THE TRAP.** It is an `int` when the primary
facet is `storage_gb` (256, 128, 512) and a `str` when it is `cpu` ("Intel Core i5", "Apple M2")
— verified across live clusters. So the key is `String(facet_value)` on the way out and compared
as a string on the way back in. A `===` against the raw value would resolve every *laptop* and
silently fail every *phone*, which is the worst possible split for a bug to have.

**In variant mode the page's subject is the configuration**: the heading reads
`Samsung Galaxy A17 · 256GB`, the headline price and spread come from the config, and the price
list is that config's `by_store` rather than the cluster's mixed `best_by_store`. The other
configurations become a switcher, and "Compare all configurations" steps back up.

⛔ **`n_stores` AND THE USED/REFURB LINE ARE SUPPRESSED IN VARIANT MODE.** They are CLUSTER facts
— "carried by 19 shops" over a variant's two rows would have re-introduced defect #1 in the one
place its fix never looked. Asserted.

⛔⛔ **A STALE `?facet=` FAILS LOUDLY AND DOES NOT FALL BACK.** `configs` are rebuilt on every
re-cluster, so a shared variant link *will* eventually name a configuration that no longer
exists. Falling through to the whole-cluster view would show a cross-configuration spread to
someone who believed they had picked one variant — exactly the dishonesty this page exists to
remove. It renders a notice and a link to the full comparison instead.

⭐ **THE EXPANDER STAYS; THIS IS ADDITIVE.** Expanding is for scanning every variant at once, the
permalink is for sending one of them to somebody. Swapping one for the other would have traded
an affordance and broken the assertions guarding #2.

⭐ And `spread_pct` — computed, served and rendered nowhere before 2026-09-03 — is now the chip
on every variant header and the headline saving on a variant page. That is the number a
comparison page is *for*.

---

## ✅ 3. FIXED — back from a product page always landed on `/deals` — FRONTEND ONLY

**Fixed 2026-09-03, in the shape this entry prescribed.** `ClusterDealCard` now carries a
`CameFrom {href, label}` in router state, and `ClusterPricesPage` reads it for its back control,
falling back to `/deals` only when nothing told it where the shopper came from. The card is used
by `DealsPage`, `DepartmentPage` and `ShelfPage`, so one change covers all three entry points —
arriving from `/shelf/smartphone` the control now reads *Smartphones* and returns there.

⭐ **AN HREF, NOT A SLUG, AND THAT IS THE WHOLE POINT.** `/shelf`, `/department` and the retired
spine are three overlapping slug spaces; a slug plus a guess at which builder to use is exactly
the mistake `shelfHref`/`departmentHref` exist to prevent. The linking page already knows which
page it is, so it passes the finished link and the comparison page never guesses.

⛔ **AND `navigate(-1)` IS STILL NOT THE ANSWER**, as this entry warned — the gate loads the page
cold (a shared link, a new tab) and asserts the control is still a real route.

✅ **AND #3b IS DONE TOO (same day).** `ProductDetailsPage` now has a back control. The shared
pieces moved to `lib/navigation.ts` — `CameFrom`, `useOrigin`, `useCameFrom`, `useHereAs` — and
`BrowsePage`, `FavoritesPage`, `ShelfPage`, `DepartmentPage` and `DealsPage` all declare their
origin.

⭐⭐ **ITS FALLBACK IS THE PRODUCT'S OWN CATEGORY, NOT `/deals`** — the same link the breadcrumb
below it already builds, so the two cannot point apart. Giving every page one site-wide default
is precisely the defect above wearing a new name.

⛔⛔ **AND `useHereAs` REPLACED A REBUILT HREF, WHICH WAS A REAL REGRESSION IN THE FIRST CUT OF
THIS FIX.** `shelfHref(node.slug)` drops `?multi_store=1` — the filter this app deliberately keeps
in the URL so a compare-only view is shareable and survives a back button — so the back link
returned the shopper to an *unfiltered* shelf and quietly undid what they had set. `BrowsePage` is
worse still: it answers to three routes and carries the product list in `?cat=<encoded url>`, so
a rebuilt `/browse/${productType}` lands on a page with **no products on it at all**. Capturing
the live location is the only origin that is true. Both are now asserted.

⭐ The breadcrumb half was done differently and deliberately: the trail renders
`category_path.path_string` as **text, not links**. `category_path` is answered from the retired
424-node spine where it has an answer and from `browse_nodes` otherwise, so one field carries
slugs from two spaces with nothing on the wire saying which. Measured 2026-09-03: the redesign
spine shares **112 slugs with the 424-spine and 95 with `browse_nodes`**, and the trees disagree
about what those slugs mean. A link built from that slug lands on a plausible *wrong* page rather
than a 404 — the lucky failure would be the loud one.

### The original diagnosis, kept as the record

[`ClusterPricesPage.tsx:76`](src/app/pages/ClusterPricesPage.tsx#L76) hardcoded it:

```tsx
<Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 gap-1">
  <Link to="/deals"><ArrowLeft /> All deals</Link>
</Button>
```

So arriving from `/shelf/food-cupboard`, from search, or from favourites and pressing the page's
own back control drops you into Deals — a section you may never have visited. It also contradicts
the breadcrumb work done for the category tree, where the trail is accurate.

⛔ Do **not** fix this with `navigate(-1)` alone: that is wrong on a fresh load (a shared link, a
new tab) where there is no history entry to return to. The shape that works is a breadcrumb built
from what the page knows — the cluster carries `category_path` already — with the referring
route as an override and `/deals` only as the last-resort default.

⚠️ `ProductDetailsPage` has no back control at all; whatever is decided should cover both.

---

## 🟠 4. No price history chart here, though the mock has one — BACKEND, then FRONTEND

Confirmed: `dealsonline_ui_ux_mock/src/app/pages/ClusterPricesPage.tsx:275-279` renders
`PRPriceHistoryChart` guarded on `cluster.price_history`, with a comment recording that
**13,287 of 61,473 clusters (21.6%) have ≥2 dated points**. This directory's
`ClusterPricesPage.tsx` has **zero** chart references, and its API client does not declare the
field.

⛔ **It is blocked on the backend, not on the UI.** The live API serves no `price_history` on
either surface — checked both `/clusters/deals` (summary) and `/clusters/{id}` (detail); the
field is absent from both projections. `PriceHistoryChart.tsx` already exists in this directory
and is unused.

So: project `price_history` in `app/api/routes/clusters.py`, declare it on `ClusterView`, then
render the component that is already here — guarded on ≥2 points, because 78% of clusters will
have nothing to draw and an empty chart is worse than no chart.

---

## 🟡 5. Product images — DEFERRED BY DECISION, not a defect to fix here

The cluster projection carries **no image field at all** — neither `image` nor `images` appears
on the summary or detail payload.

⭐ Deliberately out of scope for this directory. Per the earlier `phones_scraper` discussion this
needs its own workflow: a system that picks the best-quality picture across the shops carrying a
cluster and promotes it as the representative image. Until that exists, the placeholder treatment
already in `ImageWithFallback` stands.

⚠️ Recorded here only so it is not re-diagnosed as a frontend bug. It is an upstream capability
that has not been built yet.

---

## Scope summary

| # | Defect | Backend | Frontend | Blocked on |
|---|---|:---:|:---:|---|
| 1 | ~~Shop count overstated~~ | ✅ **DONE** | ✅ **DONE** | — |
| 2 | ~~Variant shops unreachable~~ | — | ✅ **DONE** | — |
| 2b | ~~Variant as its own page~~ | — | ✅ **DONE** | — (route key ruled: `?facet=`) |
| 3 | ~~Back always goes to `/deals`~~ | — | ✅ **DONE** | — |
| 3b | ~~`ProductDetailsPage` has no back control~~ | — | ✅ **DONE** | — |
| 4 | No price history chart | ⛔ **member ROLLUP, not a projection** | ✅ render existing component | backend rollup |
| 5 | Product images | ⛔ upstream workflow | — | `phones_scraper` picture pipeline |

⭐ **#1 (2026-08-21), #2 and #3 (2026-09-03) are fixed**, the last two with no backend change at
all — the variant `by_store` map was already served and simply not read, and the back control was
a hardcoded `<Link to="/deals">`.

⭐⭐ **ONLY #4 IS LEFT, AND IT IS BIGGER THAN THIS DOC ASSUMED.** It is filed as "project the
field", which is wrong: **clusters carry no `price_history` at all.** Measured 2026-09-04 —
`product_matching_db.product_clusters` has the key on **0 of 105,084** documents. The data lives
one layer down on `compiled_products`, where **33,866 of 479,780 rows (7.1%)** have ≥2 dated
points. So a cluster's history has to be ROLLED UP from its members; it is a real backend task,
not a projection, and the "13,287 of 61,473 clusters (21.6%)" in the mock's comment describes a
rollup nobody has written yet. `PriceHistoryChart.tsx` is still sitting here unused.

⚠️ **AND #2b IS NOW BETTER MOTIVATED THAN WHEN IT WAS FILED.** Fixing #2 established that the
variant *is* the honest comparison and the cluster list is not — which is an argument for giving a
variant its own addressable URL, not just an expander. The route-key decision it names
(`facet_value` is not a stable id) is still the only thing in the way.

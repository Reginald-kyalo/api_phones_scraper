# Static Demo Dataset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the DealsOnline UI as a statically-hosted demo running entirely on committed JSON captured from the real `product_clusters_mvp` dataset — keeping the ambitious design, with every rendered value traceable to crawled data.

**Architecture:** A Python capture script in the API repo imports the API's own `_cluster_view` projection and writes sharded JSON into `dealsonline_ui_ux_mock/public/demo/`. The frontend gains a `demoSource` module implementing the existing `clustersApi` signatures against those files, so pages that already consume clusters need no component rewrite. Pages still on fabricated mocks are re-sourced onto cluster data rather than deleted.

**Two workspaces, one codebase.** `dealsonline_ui_ux/` remains the live-API application and is **not touched by this plan**. `dealsonline_ui_ux_mock/` — created 2026-07-25, currently a byte-identical copy of `dealsonline_ui_ux/src` — is the static demo build and the sole frontend target here. Fixes worth keeping in both should be ported back deliberately, not assumed.

**Tech Stack:** Python 3.13 + pymongo (capture, run via `apienv`), React 18 + Vite + TypeScript + Tailwind v4 (frontend), static host (no runtime backend).

## Global Constraints

- **No fabricated values may reach the screen.** If a design slot has no real source, remove the slot — do not fill it. Removing `generateStores`, `generatePriceHistory`, `generateRatingBreakdown`, `PLACEHOLDER_REVIEWS` is in scope.
- **Currency is KES**, always via `formatPrice` / `shopLabel` from `src/app/lib/format.ts`. Never hardcode a currency symbol.
- **Fixture shape must equal live API shape.** The capture script calls `app.api.routes.clusters._cluster_view`; it must never hand-build a projection.
- **Image rule:** pick a random member image per cluster, with a **stable seed** (cluster_id) so the same cluster always shows the same image across rebuilds. **Never use a `cleanshelf` image** — that store usually has none.
- **Merge marker keys on `mvp_n_merged > 1`** (2,016 clusters), *not* on `mvp_generated` (4,272) — the latter includes 2,256 pass-throughs that were never merged.
- Design tokens, motion budget and behavioural rules stay as documented in `dealsonline_ui_ux_mock/DESIGN_HANDOFF.md` and `BEHAVIORAL_PRINCIPLES.md`.
- **`src/styles/theme.css` is the only authoritative token source.** `figma_exports/design-tokens.json` is a March 2026 export of the *Figma Make default* theme (`primary: #030213`, greys) taken before the June teal rebrand. Applying it would silently revert the brand identity. Do not read tokens from it; do not "reconcile" the two.
- `guidelines/Guidelines.md` is unedited Figma boilerplate — it contains no project rules and must not be treated as a spec.
- Source dataset: `product_matching_db.product_clusters_mvp` (66,406 docs). **Never write to it or to `product_clusters`.**

---

## Measured dataset facts (2026-07-25, verified against live Mongo)

Everything below was measured, not assumed. It is the evidence the design rests on.

**6,592 multi-store clusters** (`n_stores >= 2`), 6.62 MB as full `_cluster_view` JSON, 2.24 MB trimmed to summary fields, ~1,053 bytes average per detail row. 2,439 clusters have 3+ stores. Zero carry a `data_warning`.

| slug | multi-store | total | rate | reachable today | comparison-grade |
|---|---:|---:|---:|---|---|
| groceries | 4,272 | 33,692 | 12.7% | yes | yes |
| mobile-phones | 1,208 | 5,259 | 23.0% | yes | yes |
| laptops | 729 | 4,951 | 14.7% | yes | yes |
| tablets | 141 | 845 | 16.7% | yes | yes |
| audio-systems | 120 | 8,656 | 1.4% | **NO — HTTP 400** | no |
| wearables | 59 | 1,476 | 4.0% | **NO — HTTP 400** | no |
| headphones | 30 | 6,912 | 0.4% | yes | no |
| speakers | 19 | 1,832 | 1.0% | **NO — HTTP 400** | no |
| monitors | 10 | 299 | 3.3% | yes | no |
| desktop-computers | 2 | 160 | 1.2% | **NO — HTTP 400** | no |
| routers | 2 | 1,166 | 0.2% | **NO — HTTP 400** | no |

**202 clusters across 5 categories are unreachable** because those slugs are missing from `_SLUGS` — the same defect class that hid groceries before commit `7226de12`.

The multi-store *rate* splits cleanly at a gap between tablets (16.7%) / laptops (14.7%) / groceries (12.7%) and wearables (4.0%). `COMPARISON_SLUGS` already sits exactly on that boundary, so it stays unchanged and `comparison_grade` remains an honest signal.

**Image sources are complementary and total:**

| category group | source | coverage |
|---|---|---|
| groceries (4,272) | `members[].image` on the cluster doc | 100% (99.98% excluding cleanshelf — costs exactly 1 cluster) |
| devices (2,320) | join `members[].product_id` → `compiled_products.product_image` | 100% |

Devices have **no** `members[].image`; groceries resolve into `compiled_products` at only 1%. Both paths are required.

**Price history** lives on `compiled_products.price_history`. Only **798 clusters (12.1%)** have ≥2 real points and **73 (1.1%)** have ≥5; groceries have none. Coverage by category: monitors 60%, desktop-computers/speakers/routers ~50%, mobile-phones 47%, headphones 43%, tablets 29%, audio-systems 27%, laptops 18%, wearables 8%, groceries 0%.

**Provenance:** `mvp_n_merged > 1` → 2,016 clusters actually merged; `== 1` → 2,256 pass-through; absent → 2,320 non-grocery. All merges used one rule: TF-IDF `char_wb(3-5)` cosine top-K(k=10) ≥ 0.82 over titles + shared size, components capped at 8 (cap never fired).

**Store identity is inconsistent:** 39 distinct store values mixing bare names (`carrefour`, `naivas`, `eastmatt`, `cleanshelf`) with domains (`jumia.co.ke`, `kilimall.com`), and `carrefour` (9,270 listings) coexists with `carrefour.ke` (29) as separate identities.

---

## ⭐ AMENDMENT (2026-07-25, later): the capture is no longer size-capped

The dataset above describes the **first** capture, which took `n_stores >= 2` and the top 400 deals. Both were caps chosen for convenience, and both cost real fidelity. They are gone. Nothing in `capture_demo_dataset.py` now truncates for size — what used to be a cap is a **shard boundary**.

| | first capture | now |
|---|---:|---:|
| clusters | 6,592 | **62,668** |
| categories with data | 11 | **14** |
| deals | 400 | **3,189** |
| stores represented | 39 | **43** |
| clusters with an image | 6,590 | **47,719** |
| clusters with price history | 798 | **3,595** |
| on disk | 14 MB | **117 MB** (any single fetch ≤ 34 KB gzipped) |

**What the `n_stores >= 2` filter was actually costing.** It is defensible for a *comparison* surface, but it was applied to the whole capture, so it also decided what the catalogue contained. `tvs` (687), `printers` (342) and `digital-cameras` (129) have **zero** multi-store clusters — three entire categories were absent from a demo whose corpus holds them. Every other category was ~10× thinner than the real data. The 6,592 comparable clusters are still exactly the ones `/deals` surfaces; they are now the comparable subset of a real catalogue instead of the whole of a small one.

**The one exclusion that remains is quality, not size.** `MIN_STORES = 1` skips 3,738 clusters at `n_stores == 0`. All 3,738 have `stores: []` **and** `best_price: None` — zero exceptions, verified — so they would render as a card with no price and nothing to click. The count ships in the manifest as `excluded_unpriced` so the exclusion stays visible rather than silent.

### What made lifting the caps possible

Capping was the easy way to keep files small. Removing it needed sizing to become a property of the layout:

- **Listings are paginated, never truncated** — `categories/<slug>-<page>.json`, 500 rows per page, `pages` per category in the manifest. Groceries is 68 pages; as one file it would have been 15 MB.
- **Detail shards are sized from measured bytes.** `buckets_for()` divides a category's actual serialized size by a 400 KB target, so opening one product costs about the same for a router (4 buckets) as for a grocery item (117). A fixed 16 would have made one grocery shard 2.7 MB.
- **The shard suffix widened to 3 digits.** At 117 buckets a 2-digit suffix would have made bucket 100 collide with bucket 00 — silently, in both languages. `SHARD_DIGITS` and `const PAD` are now asserted equal by a test.
- **The search index shards per category**, so a category-scoped search pays for its slice only; a global search fetches the shards in parallel (7 MB raw / 1.4 MB gzipped, lazily, on first query).
- **Re-captures clear the previous run's files first.** Bucket counts move as the corpus grows, so a stale shard would still be served while the frontend addressed a different one.

### The contract this created, and how it is held

The frontend must now read `pages` and `buckets` **per category from the manifest** — the same cluster id addresses a different file under a different bucket count. `tests/test_demo_fixtures.py` holds it: every promised page exists, page contents sum to the category count, every cluster id resolves into a shard that contains it, no orphaned shard survives a re-capture, and `demoSource.ts` still carries the matching `PAD` and FNV constants. Each of those five was **proven to fail** against an injected fault before being trusted. A separate node run confirmed the TypeScript `shardFor` resolves 560 real ids across all 14 categories into the committed shards.

**Still true and unchanged:** ~1 in 6 grocery merges joins something a human called a `variant`; single-store clusters are honest product pages, not comparisons (`is_multi_store` is now in the summary projection so the UI can say which is which).

### Design consequence: what each ambitious slot is fed by

| design slot | real source | action |
|---|---|---|
| Product imagery | `members[].image` / `compiled_products.product_image` | keep — 100% real |
| Store comparison rows | `best_by_store` (price + url + title) | keep — 100% real |
| Variant / config breakdown | `configs`, `spec_facets` | keep — 100% real |
| Price-spread signature bar | `like_for_like_spread_pct`, `best_by_store` | keep — 100% real |
| Price-history chart | `compiled_products.price_history` | keep, but **render only when ≥2 real points** (798 clusters) |
| Reviews / star ratings | none | **remove** — no source exists |
| "How we matched this" | `mvp_rule`, `mvp_n_merged`, `n_listings` | **new** — turns the honesty requirement into a feature |

---

## File Structure

**API repo (`/home/reginaldkyalo/codes/api_phones_scraper`)**

- Modify `app/api/routes/clusters.py` — unlock slugs, add provenance to projection.
- Create `scripts/capture_demo_dataset.py` — the capture script; only writer of `public/demo/`.
- Modify `docs/backend-data-issues.md` — record the store-identity duplication.

**Frontend (`dealsonline_ui_ux_mock/`)**

- Create `public/demo/**` — generated fixtures (committed).
- Create `src/app/lib/demoSource.ts` — fixture loader + cache, implements the `clustersApi` surface.
- Create `src/app/lib/demoTypes.ts` — `ClusterSummary`/`ClusterDetail` extensions (`image`, `price_history`, `mvp_*`).
- Create `src/app/features/clusters/components/ClusterCard.tsx` — image-led card replacing the text-only `ClusterDealCard`.
- Create `src/app/features/clusters/components/MatchProvenance.tsx` — the "how we matched this" disclosure.
- Create `src/app/features/clusters/components/StoreRow.tsx` — extracted store row with normalized store display.
- Create `src/app/lib/storeIdentity.ts` — store name/domain normalization + display labels.
- Create `src/app/pages/SearchPage.tsx` — offline search over the committed index.
- Modify `src/app/lib/api.ts` — route `clustersApi` at `demoSource` in demo builds.
- Modify `src/app/pages/HomePage.tsx` — rails from real categories; delete `homepageMock` import.
- Modify `src/app/pages/DealsPage.tsx` — category filter; consume `ClusterCard`.
- Modify `src/app/pages/ClusterPricesPage.tsx` — image, provenance, history, normalized stores.
- Modify `src/app/pages/BrowsePage.tsx` + `CategoriesPage.tsx` — drive from `manifest.json`.
- Modify `src/app/pages/Root.tsx`, `src/app/context/AuthContext.tsx` — no boot-time auth probe in demo builds.
- Delete `src/app/data/homepageMock.ts`, `src/app/data/mockServices.ts`.
- Delete `src/app/features/product/components/ReviewSection.tsx`.
- Modify `vite.config.ts`, add `public/_redirects` + `public/404.html` — static hosting.

---

## Task 0: Bring the demo workspace under version control

**Files:**
- Create: `dealsonline_ui_ux_mock/.gitignore`
- Modify: `.gitignore` (repo root, if it excludes the directory)

**Interfaces:**
- Produces: a tracked `dealsonline_ui_ux_mock/` whose `node_modules/` (256 MB) and `dist/` are excluded.

- [ ] **Step 1: Confirm the current state**

Run:
```bash
cd /home/reginaldkyalo/codes/api_phones_scraper
git ls-files dealsonline_ui_ux_mock | wc -l
du -sh dealsonline_ui_ux_mock/node_modules dealsonline_ui_ux_mock/dist
```
Expected: `0` tracked files, and roughly `256M` + `1.4M` of build output that must never be committed.

- [ ] **Step 2: Add the ignore file**

Create `dealsonline_ui_ux_mock/.gitignore`:

```gitignore
node_modules/
dist/
.vite/
*.local
```

- [ ] **Step 3: Verify only source is staged**

Run:
```bash
git add -An dealsonline_ui_ux_mock | wc -l
git add -An dealsonline_ui_ux_mock | grep -c "node_modules\|/dist/" || echo "0 build artefacts"
```
Expected: a file count in the low hundreds, and `0 build artefacts`.

- [ ] **Step 4: Confirm the workspace builds before any changes**

Run:
```bash
cd dealsonline_ui_ux_mock && npm run type-check && npm run build 2>&1 | tail -2
```
Expected: type-check exits 0 and the build reports `✓ built in`. This is the baseline every later task is measured against.

- [ ] **Step 5: Commit**

```bash
cd /home/reginaldkyalo/codes/api_phones_scraper
git add dealsonline_ui_ux_mock
git commit -m "chore(demo): track the static demo workspace, excluding build output"
```

---

## Task 1: Unlock every category that has real data

**Files:**
- Modify: `app/api/routes/clusters.py:26` (`_SLUGS`)
- Test: `app/tests/test_clusters_slugs.py` (create)

**Interfaces:**
- Produces: `_SLUGS` containing all 11 slugs; `COMPARISON_SLUGS` unchanged at 4.

- [ ] **Step 1: Write the failing test**

Create `app/tests/test_clusters_slugs.py`:

```python
from app.api.routes.clusters import _SLUGS, COMPARISON_SLUGS

# Categories with >=2 multi-store clusters, measured 2026-07-25 against
# product_clusters_mvp. Unreachable slugs return HTTP 400 from /deals and /search.
CATEGORIES_WITH_DATA = {
    "groceries", "mobile-phones", "laptops", "tablets", "audio-systems",
    "wearables", "headphones", "speakers", "monitors",
    "desktop-computers", "routers",
}

# Multi-store rate >= 12% — the honest bar for "this is a real comparison".
HIGH_RATE_SLUGS = {"mobile-phones", "tablets", "laptops", "groceries"}


def test_every_category_with_data_is_reachable():
    assert CATEGORIES_WITH_DATA - _SLUGS == set()


def test_comparison_grade_stays_on_high_rate_categories_only():
    assert COMPARISON_SLUGS == HIGH_RATE_SLUGS
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/reginaldkyalo/codes/api_phones_scraper && apienv/bin/python -m pytest app/tests/test_clusters_slugs.py -v`
Expected: FAIL — `test_every_category_with_data_is_reachable` reports the 5 missing slugs `{'audio-systems', 'wearables', 'speakers', 'routers', 'desktop-computers'}`.

- [ ] **Step 3: Write minimal implementation**

In `app/api/routes/clusters.py`, replace the `_SLUGS` assignment:

```python
# Every canonical slug with >=2 multi-store clusters (measured 2026-07-25).
# Reachability != comparability: COMPARISON_SLUGS below is the trust signal.
_SLUGS = {
    "mobile-phones", "laptops", "tablets", "headphones", "monitors", "groceries",
    "audio-systems", "wearables", "speakers", "desktop-computers", "routers",
}
```

Leave `COMPARISON_SLUGS` exactly as it is.

- [ ] **Step 4: Run test to verify it passes**

Run: `apienv/bin/python -m pytest app/tests/test_clusters_slugs.py -v`
Expected: 2 passed.

- [ ] **Step 5: Verify the previously-400ing categories are reachable**

Note `pkill -f "uvicorn app.main:app"` kills the shell running it, because the command
string itself matches the pattern. Kill and start in separate calls.

```bash
cd /home/reginaldkyalo/codes/api_phones_scraper
CLUSTERS_COLLECTION=product_clusters_mvp apienv/bin/uvicorn app.main:app --port 10000 --host 127.0.0.1 &
sleep 15
for s in audio-systems wearables speakers routers desktop-computers; do
  printf "%-20s " "$s"; curl -s "http://127.0.0.1:10000/api/clusters/search?q=a&slug=$s&limit=2" | head -c 45; echo
done
```

Expected: each returns `{"query":"a","count":…` — **not** `{"detail":"unknown slug`.

⚠️ **`/deals` correctly returns 0 for all of these, and that is the right answer.**
Measured 2026-07-25: `like_for_like_spread_pct` is null for every cluster in all seven
non-comparison categories, because a like-for-like spread needs the same *config* at 2+
stores and accessories produce no config facets. Some do have a config-blind
`cross_store_spread_pct` (audio-systems 22, monitors 3, wearables 2, speakers 1,
headphones 0) — which is exactly the weaker signal `/deals` is designed to exclude.
Unlocking makes these categories searchable and browsable; it does not, and should not,
manufacture deals for them.

- [ ] **Step 6: Commit**

```bash
git add app/api/routes/clusters.py app/tests/test_clusters_slugs.py
git commit -m "fix(clusters): unlock the 5 categories with real data but no slug entry"
```

---

## Task 2: Expose merge provenance in the projection

**Files:**
- Modify: `app/api/routes/clusters.py` (`_cluster_view`)
- Test: `app/tests/test_clusters_provenance.py` (create)

**Interfaces:**
- Consumes: `_SLUGS` from Task 1.
- Produces: `_cluster_view` output gains `mvp_generated: bool`, `mvp_rule: str | None`, `mvp_n_merged: int | None`. All `None`/`False` when serving `product_clusters`.

- [ ] **Step 1: Write the failing test**

Create `app/tests/test_clusters_provenance.py`:

```python
from app.api.routes.clusters import _cluster_view

BASE = {
    "cluster_id": "groceries::x", "canonical_category_slug": "groceries",
    "representative_title": "Test Product 1L", "n_stores": 2, "n_listings": 3,
    "best_price": 100, "members": [],
}


def test_merged_cluster_exposes_provenance():
    view = _cluster_view({**BASE, "mvp_generated": True, "mvp_n_merged": 3,
                          "mvp_rule": "TF-IDF char_wb(3-5) >= 0.82"})
    assert view["mvp_generated"] is True
    assert view["mvp_n_merged"] == 3
    assert view["mvp_rule"].startswith("TF-IDF")


def test_production_cluster_reports_no_provenance():
    # Docs from product_clusters carry no mvp_* keys at all.
    view = _cluster_view(BASE)
    assert view["mvp_generated"] is False
    assert view["mvp_n_merged"] is None
    assert view["mvp_rule"] is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `apienv/bin/python -m pytest app/tests/test_clusters_provenance.py -v`
Expected: FAIL with `KeyError: 'mvp_generated'`.

- [ ] **Step 3: Write minimal implementation**

In `_cluster_view` in `app/api/routes/clusters.py`, add to the returned dict (alongside `comparison_grade`):

```python
        # Demo-dataset provenance. Absent on product_clusters, so this is
        # False/None there. mvp_n_merged > 1 means "this cluster is the union
        # of >1 engine cluster" — the only field that implies merge risk;
        # mvp_generated alone includes untouched pass-throughs.
        "mvp_generated": bool(d.get("mvp_generated", False)),
        "mvp_rule": d.get("mvp_rule"),
        "mvp_n_merged": d.get("mvp_n_merged"),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `apienv/bin/python -m pytest app/tests/test_clusters_provenance.py app/tests/test_clusters_slugs.py -v`
Expected: 4 passed.

- [ ] **Step 5: Confirm the projection contract test still passes**

Run: `apienv/bin/python -m pytest product_identity/tests/test_api_projection_contract.py -v`
Expected: PASS. If it fails because the new keys are unknown to the engine side, add `mvp_generated`, `mvp_rule`, `mvp_n_merged` to that test's API-only allow-list with the reason "demo provenance, no engine equivalent".

- [ ] **Step 6: Commit**

```bash
git add app/api/routes/clusters.py app/tests/test_clusters_provenance.py
git commit -m "feat(clusters): expose mvp merge provenance in the cluster projection"
```

---

## Task 3: Capture script — images

**Files:**
- Create: `scripts/capture_demo_dataset.py`
- Test: `scripts/tests/test_capture_images.py` (create)

**Interfaces:**
- Produces: `pick_image(cluster: dict, device_images: dict[str, str]) -> str | None`, and `EXCLUDED_IMAGE_SITES = {"cleanshelf"}`.

- [ ] **Step 1: Write the failing test**

Create `scripts/tests/test_capture_images.py`:

```python
from scripts.capture_demo_dataset import pick_image


def test_grocery_image_comes_from_members():
    cluster = {"cluster_id": "groceries::a", "members": [
        {"product_id": "p1", "site": "carrefour", "image": "https://cdn/a.jpg"},
    ]}
    assert pick_image(cluster, {}) == "https://cdn/a.jpg"


def test_cleanshelf_images_are_never_used():
    cluster = {"cluster_id": "groceries::b", "members": [
        {"product_id": "p1", "site": "cleanshelf", "image": "https://cdn/bad.jpg"},
        {"product_id": "p2", "site": "naivas", "image": "https://cdn/good.jpg"},
    ]}
    assert pick_image(cluster, {}) == "https://cdn/good.jpg"


def test_cleanshelf_only_cluster_yields_no_image():
    cluster = {"cluster_id": "groceries::c", "members": [
        {"product_id": "p1", "site": "cleanshelf", "image": "https://cdn/bad.jpg"},
    ]}
    assert pick_image(cluster, {}) is None


def test_device_image_comes_from_compiled_products():
    cluster = {"cluster_id": "laptops::d", "members": [
        {"product_id": "p9", "site": "jumia.co.ke"},
    ]}
    assert pick_image(cluster, {"p9": "https://cdn/laptop.jpg"}) == "https://cdn/laptop.jpg"


def test_choice_is_stable_across_runs():
    cluster = {"cluster_id": "groceries::e", "members": [
        {"product_id": f"p{i}", "site": "naivas", "image": f"https://cdn/{i}.jpg"}
        for i in range(8)
    ]}
    assert len({pick_image(cluster, {}) for _ in range(25)}) == 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/reginaldkyalo/codes/api_phones_scraper && apienv/bin/python -m pytest scripts/tests/test_capture_images.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'scripts.capture_demo_dataset'`.

- [ ] **Step 3: Write minimal implementation**

Create `scripts/__init__.py` and `scripts/tests/__init__.py` as empty files, then create `scripts/capture_demo_dataset.py`:

```python
"""Capture the MVP demo dataset into static JSON for the hosted demo.

Reads product_matching_db.product_clusters_mvp (never writes), projects each
cluster through the API's own _cluster_view so fixtures match the live contract
by construction, and shards the result into dealsonline_ui_ux_mock/public/demo/.

Usage:
    apienv/bin/python -m scripts.capture_demo_dataset
"""
import hashlib

# cleanshelf listings usually carry no image; when they do it is unreliable.
EXCLUDED_IMAGE_SITES = {"cleanshelf"}


def _usable(url) -> bool:
    return isinstance(url, str) and url.strip().startswith("http")


def pick_image(cluster: dict, device_images: dict) -> str | None:
    """One real image per cluster, chosen randomly but stably.

    Groceries carry images inline on members[]; devices carry none there and
    resolve through compiled_products instead. Selection is seeded on
    cluster_id so a rebuild never reshuffles the page.
    """
    candidates = []
    for m in cluster.get("members") or []:
        if (m.get("site") or "").lower() in EXCLUDED_IMAGE_SITES:
            continue
        if _usable(m.get("image")):
            candidates.append(m["image"].strip())
        elif _usable(device_images.get(m.get("product_id"))):
            candidates.append(device_images[m["product_id"]].strip())
    if not candidates:
        return None
    candidates.sort()
    seed = hashlib.sha256(str(cluster.get("cluster_id", "")).encode()).digest()
    return candidates[int.from_bytes(seed[:8], "big") % len(candidates)]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `apienv/bin/python -m pytest scripts/tests/test_capture_images.py -v`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add scripts/__init__.py scripts/tests/__init__.py scripts/capture_demo_dataset.py scripts/tests/test_capture_images.py
git commit -m "feat(demo): stable per-cluster image selection excluding cleanshelf"
```

---

## Task 4: Capture script — price history

**Files:**
- Modify: `scripts/capture_demo_dataset.py`
- Test: `scripts/tests/test_capture_history.py` (create)

**Interfaces:**
- Consumes: nothing from Task 3 beyond the module.
- Produces: `build_history(cluster, histories: dict[str, list]) -> list[dict] | None` returning `[{"t": "2026-06-01", "price": 990}, ...]` or `None`.

- [ ] **Step 1: Write the failing test**

Create `scripts/tests/test_capture_history.py`:

```python
from scripts.capture_demo_dataset import build_history, MIN_HISTORY_POINTS


def test_single_point_history_is_dropped():
    # 88% of clusters have <2 points. A one-point "trend" is not a trend.
    cluster = {"members": [{"product_id": "p1"}]}
    assert build_history(cluster, {"p1": [{"date": "2026-06-01", "price": 100}]}) is None


def test_two_points_are_kept_and_sorted():
    cluster = {"members": [{"product_id": "p1"}]}
    hist = {"p1": [{"date": "2026-06-08", "price": 90},
                   {"date": "2026-06-01", "price": 100}]}
    assert build_history(cluster, hist) == [
        {"t": "2026-06-01", "price": 100},
        {"t": "2026-06-08", "price": 90},
    ]


def test_longest_member_series_wins():
    cluster = {"members": [{"product_id": "short"}, {"product_id": "long"}]}
    hist = {
        "short": [{"date": "2026-06-01", "price": 10}, {"date": "2026-06-02", "price": 11}],
        "long": [{"date": "2026-06-01", "price": 20}, {"date": "2026-06-02", "price": 21},
                 {"date": "2026-06-03", "price": 22}],
    }
    assert len(build_history(cluster, hist)) == 3


def test_minimum_is_two_points():
    assert MIN_HISTORY_POINTS == 2
```

- [ ] **Step 2: Run test to verify it fails**

Run: `apienv/bin/python -m pytest scripts/tests/test_capture_history.py -v`
Expected: FAIL — `ImportError: cannot import name 'build_history'`.

- [ ] **Step 3: Write minimal implementation**

Append to `scripts/capture_demo_dataset.py`:

```python
# Only 798 of 6,592 clusters (12.1%) have >=2 real points; groceries have none.
# The chart renders for those and is omitted everywhere else.
MIN_HISTORY_POINTS = 2


def build_history(cluster: dict, histories: dict) -> list | None:
    """Longest real price series among a cluster's members, or None."""
    best: list = []
    for m in cluster.get("members") or []:
        series = histories.get(m.get("product_id")) or []
        if len(series) > len(best):
            best = series
    if len(best) < MIN_HISTORY_POINTS:
        return None
    points = [
        {"t": str(p.get("date") or p.get("t") or ""), "price": p.get("price")}
        for p in best
        if p.get("price") is not None
    ]
    points.sort(key=lambda p: p["t"])
    return points if len(points) >= MIN_HISTORY_POINTS else None
```

- [ ] **Step 4: Run test to verify it passes**

Run: `apienv/bin/python -m pytest scripts/tests/ -v`
Expected: 9 passed.

- [ ] **Step 5: Commit**

```bash
git add scripts/capture_demo_dataset.py scripts/tests/test_capture_history.py
git commit -m "feat(demo): real price history only where >=2 points exist"
```

---

## Task 5: Capture script — shard writer

**Files:**
- Modify: `scripts/capture_demo_dataset.py`
- Test: manual verification against generated output (this task's deliverable is data on disk)

**Interfaces:**
- Consumes: `pick_image`, `build_history`, `_cluster_view`.
- Produces: `dealsonline_ui_ux_mock/public/demo/{manifest.json, deals.json, search.json, categories/<slug>.json, clusters/<slug>-NNN.json}`; `SUMMARY_FIELDS` list; `DETAIL_SHARD_SIZE = 500`.

- [ ] **Step 1: Write the writer**

Append to `scripts/capture_demo_dataset.py`:

```python
import json
import os
from collections import defaultdict
from pathlib import Path

os.environ.setdefault("CLUSTERS_COLLECTION", "product_clusters_mvp")

from pymongo import MongoClient  # noqa: E402
from app.api.routes.clusters import _cluster_view, COMPARISON_SLUGS  # noqa: E402

OUT = Path(__file__).resolve().parents[1] / "dealsonline_ui_ux_mock" / "public" / "demo"
SOURCE_COLLECTION = "product_clusters_mvp"
DETAIL_SHARD_SIZE = 500
TOP_DEALS = 400

SUMMARY_FIELDS = [
    "cluster_id", "display_name", "title", "brand", "category", "best_price",
    "n_stores", "n_listings", "cheapest_store", "like_for_like_spread_pct",
    "condition_basis", "data_warning", "comparison_grade",
    "mvp_generated", "mvp_n_merged",
]


def _summary(view: dict) -> dict:
    row = {k: view.get(k) for k in SUMMARY_FIELDS}
    row["image"] = view.get("image")
    return row


def _fold(text: str) -> str:
    return " ".join((text or "").lower().split())


def main() -> None:
    db = MongoClient("mongodb://localhost:27017", serverSelectionTimeoutMS=8000)["product_matching_db"]
    docs = list(db[SOURCE_COLLECTION].find({"n_stores": {"$gte": 2}}))
    print(f"clusters: {len(docs)}")

    member_ids = [m.get("product_id") for d in docs for m in (d.get("members") or [])]
    device_images, histories = {}, {}
    for cp in db["compiled_products"].find(
        {"product_id": {"$in": member_ids}},
        {"product_id": 1, "product_image": 1, "price_history": 1},
    ):
        if cp.get("product_image"):
            device_images[cp["product_id"]] = cp["product_image"]
        if cp.get("price_history"):
            histories[cp["product_id"]] = cp["price_history"]
    print(f"resolved {len(device_images)} images / {len(histories)} histories from compiled_products")

    views = []
    for d in docs:
        v = _cluster_view(d)
        v["image"] = pick_image(d, device_images)
        v["price_history"] = build_history(d, histories)
        views.append(v)

    by_cat = defaultdict(list)
    for v in views:
        by_cat[v.get("category") or "other"].append(v)

    (OUT / "categories").mkdir(parents=True, exist_ok=True)
    (OUT / "clusters").mkdir(parents=True, exist_ok=True)

    shard_of = {}
    for slug, rows in by_cat.items():
        rows.sort(key=lambda r: -(r.get("like_for_like_spread_pct") or 0))
        (OUT / "categories" / f"{slug}.json").write_text(
            json.dumps([_summary(r) for r in rows], separators=(",", ":"))
        )
        for i in range(0, len(rows), DETAIL_SHARD_SIZE):
            name = f"{slug}-{i // DETAIL_SHARD_SIZE:03d}"
            chunk = rows[i:i + DETAIL_SHARD_SIZE]
            (OUT / "clusters" / f"{name}.json").write_text(
                json.dumps({r["cluster_id"]: r for r in chunk}, separators=(",", ":"))
            )
            for r in chunk:
                shard_of[r["cluster_id"]] = name

    deals = sorted(
        (v for v in views if v.get("comparison_grade")),
        key=lambda r: -(r.get("like_for_like_spread_pct") or 0),
    )[:TOP_DEALS]
    (OUT / "deals.json").write_text(json.dumps([_summary(r) for r in deals], separators=(",", ":")))

    (OUT / "search.json").write_text(json.dumps(
        [{"id": v["cluster_id"], "t": _fold(v.get("display_name") or v.get("title")),
          "c": v.get("category"), "p": v.get("best_price")} for v in views],
        separators=(",", ":"),
    ))

    manifest = {
        "captured_at": __import__("datetime").datetime.now().isoformat(timespec="seconds"),
        "source_collection": SOURCE_COLLECTION,
        "total_clusters": len(views),
        "total_stores": len({s for v in views for s in (v.get("stores") or [])}),
        "with_image": sum(1 for v in views if v.get("image")),
        "with_history": sum(1 for v in views if v.get("price_history")),
        "merged": sum(1 for v in views if (v.get("mvp_n_merged") or 0) > 1),
        "shard_of": shard_of,
        "categories": sorted(
            ({"slug": s, "count": len(r), "comparison_grade": s in COMPARISON_SLUGS}
             for s, r in by_cat.items()),
            key=lambda c: -c["count"],
        ),
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, separators=(",", ":")))
    print(f"wrote {len(views)} clusters, {manifest['with_image']} images, "
          f"{manifest['with_history']} histories, {manifest['merged']} merged")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run the capture**

Run: `cd /home/reginaldkyalo/codes/api_phones_scraper && apienv/bin/python -m scripts.capture_demo_dataset`
Expected: `clusters: 6592`, then `wrote 6592 clusters, 6591 images, 798 histories, 2016 merged`.

- [ ] **Step 3: Verify the output matches the measured facts**

Run:
```bash
cd /home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock/public/demo
apienv=/home/reginaldkyalo/codes/api_phones_scraper/apienv
$apienv/bin/python -c "
import json,pathlib
m=json.load(open('manifest.json'))
assert m['total_clusters']==6592, m['total_clusters']
assert m['with_image']==6591, m['with_image']
assert m['merged']==2016, m['merged']
assert len(m['categories'])==11, len(m['categories'])
d=json.load(open('deals.json')); assert len(d)==400
assert all(r['comparison_grade'] for r in d)
assert all(r['image'] for r in d[:50])
print('manifest OK'); print('initial payload KB:',
  round((pathlib.Path('manifest.json').stat().st_size+pathlib.Path('deals.json').stat().st_size)/1024))
"
du -sh . ; du -sh clusters categories
```
Expected: `manifest OK`, initial payload well under 400 KB, total under 8 MB.

- [ ] **Step 4: Commit**

```bash
cd /home/reginaldkyalo/codes/api_phones_scraper
git add scripts/capture_demo_dataset.py dealsonline_ui_ux_mock/public/demo
git commit -m "feat(demo): capture 6,592 real clusters into sharded static JSON"
```

---

## Task 6: Frontend data layer

**Files:**
- Create: `dealsonline_ui_ux_mock/src/app/lib/demoTypes.ts`
- Create: `dealsonline_ui_ux_mock/src/app/lib/demoSource.ts`
- Modify: `dealsonline_ui_ux_mock/src/app/lib/api.ts`

**Interfaces:**
- Consumes: fixtures from Task 5.
- Produces: `demoSource.getManifest()`, `.getDeals({slug?, limit?})`, `.getCategory(slug)`, `.getDetail(clusterId)`, `.search(q, {slug?, limit?})`; types `DemoManifest`, `ClusterSummaryView`, `ClusterDetailView`.

- [ ] **Step 1: Extend the existing cluster types (do NOT create parallel ones)**

`src/app/lib/api.ts` already defines `ClusterView<Store>` with the aliases
`ClusterSummary = ClusterView<number>` and `ClusterDetail = ClusterView<ClusterStore>`,
and `DealsPage.tsx` imports `ClusterSummary` from there. Extending those in place keeps
every existing consumer compiling and prevents two type systems drifting apart.

In `src/app/lib/api.ts`, add these fields to the `ClusterView<Store>` interface:

```ts
  /** Capture-time additions — see docs/superpowers/plans/2026-07-25-static-demo-dataset.md */
  image?: string | null;
  price_history?: PricePoint[] | null;
  mvp_generated?: boolean;
  mvp_rule?: string | null;
  mvp_n_merged?: number | null;
```

and above it:

```ts
export interface PricePoint { t: string; price: number }
```

Then create `src/app/lib/demoTypes.ts` for the manifest only:

```ts
export interface DemoCategory { slug: string; count: number; comparison_grade: boolean }

export interface DemoManifest {
  captured_at: string;
  source_collection: string;
  total_clusters: number;
  total_stores: number;
  with_image: number;
  with_history: number;
  merged: number;
  /** cluster_id -> detail shard name, e.g. "groceries-003" */
  shard_of: Record<string, string>;
  categories: DemoCategory[];
}
```

Everywhere below, `ClusterSummary` and `ClusterDetail` mean the extended types from
`api.ts` — there is no `ClusterSummaryView`/`ClusterDetailView`.

- [ ] **Step 2: Write the loader**

Create `src/app/lib/demoSource.ts`:

```ts
import type { ClusterDetail, ClusterSummary } from './api';
import type { DemoManifest } from './demoTypes';

const BASE = `${import.meta.env.BASE_URL}demo`;
const cache = new Map<string, Promise<unknown>>();

function load<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    cache.set(path, fetch(`${BASE}/${path}`).then((r) => {
      if (!r.ok) throw new Error(`demo fixture missing: ${path}`);
      return r.json();
    }));
  }
  return cache.get(path) as Promise<T>;
}

export const getManifest = () => load<DemoManifest>('manifest.json');
export const getCategory = (slug: string) =>
  load<ClusterSummary[]>(`categories/${slug}.json`);

export async function getDeals(opts: { slug?: string; limit?: number } = {}) {
  const rows = opts.slug
    ? await getCategory(opts.slug)
    : await load<ClusterSummary[]>('deals.json');
  return { results: rows.slice(0, opts.limit ?? rows.length), count: rows.length };
}

export async function getDetail(clusterId: string): Promise<ClusterDetail> {
  const manifest = await getManifest();
  const shard = manifest.shard_of[clusterId];
  if (!shard) throw new Error(`unknown cluster: ${clusterId}`);
  const rows = await load<Record<string, ClusterDetail>>(`clusters/${shard}.json`);
  return rows[clusterId];
}

interface SearchRow { id: string; t: string; c: string | null; p: number | null }

export async function search(q: string, opts: { slug?: string; limit?: number } = {}) {
  const needle = q.trim().toLowerCase();
  if (!needle) return { results: [] as SearchRow[], count: 0 };
  const index = await load<SearchRow[]>('search.json');
  const terms = needle.split(/\s+/);
  const hits = index.filter(
    (r) => (!opts.slug || r.c === opts.slug) && terms.every((t) => r.t.includes(t)),
  );
  return { results: hits.slice(0, opts.limit ?? 40), count: hits.length };
}
```

- [ ] **Step 3: Point clustersApi at the fixtures**

In `src/app/lib/api.ts`, replace the body of the exported `clustersApi` object with delegation, keeping the existing exported name and call signatures:

```ts
import * as demoSource from './demoSource';

// Static demo build: clusters are served from committed fixtures captured
// from product_clusters_mvp. Same shapes as /api/clusters/* by construction.
export const clustersApi = {
  getDeals: (opts: { slug?: string; limit?: number; minStores?: number } = {}) =>
    demoSource.getDeals(opts),
  search: (q: string, opts: { slug?: string; limit?: number } = {}) =>
    demoSource.search(q, opts),
  getDetail: (clusterId: string) => demoSource.getDetail(clusterId),
  getManifest: () => demoSource.getManifest(),
  getCategory: (slug: string) => demoSource.getCategory(slug),
};
```

- [ ] **Step 4: Verify types and that existing pages still compile**

Run: `cd /home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock && npm run type-check`
Expected: exit 0. If `DealsPage.tsx` errors on `ClusterSummary`, re-point its import to `ClusterSummaryView` from `demoTypes`.

- [ ] **Step 5: Commit**

```bash
git add src/app/lib/demoTypes.ts src/app/lib/demoSource.ts src/app/lib/api.ts
git commit -m "feat(demo): fixture-backed clusters data layer for static hosting"
```

---

## Task 7: Store identity normalization

**Files:**
- Create: `dealsonline_ui_ux_mock/src/app/lib/storeIdentity.ts`
- Test: `dealsonline_ui_ux_mock/src/app/lib/storeIdentity.test.ts` (create)

**Interfaces:**
- Produces: `storeKey(raw: string): string`, `storeName(raw: string): string`.

- [ ] **Step 1: Write the failing test**

Create `src/app/lib/storeIdentity.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { storeKey, storeName } from './storeIdentity';

describe('storeIdentity', () => {
  it('folds a domain and a bare name to one key', () => {
    // Measured: carrefour (9,270 listings) and carrefour.ke (29) coexist.
    expect(storeKey('carrefour.ke')).toBe(storeKey('carrefour'));
  });

  it('strips www and tld for display', () => {
    expect(storeName('www.jumia.co.ke')).toBe('Jumia');
    expect(storeName('kilimall.com')).toBe('Kilimall');
  });

  it('title-cases bare grocery names', () => {
    expect(storeName('naivas')).toBe('Naivas');
    expect(storeName('eastmatt')).toBe('Eastmatt');
  });

  it('keeps distinct retailers distinct', () => {
    expect(storeKey('naivas')).not.toBe(storeKey('carrefour'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/lib/storeIdentity.test.ts`
Expected: FAIL — cannot resolve `./storeIdentity`. If vitest is not installed, run `npm i -D vitest` first and add `"test": "vitest run"` to `package.json` scripts.

- [ ] **Step 3: Write minimal implementation**

Create `src/app/lib/storeIdentity.ts`:

```ts
/**
 * Store values arrive in two shapes: bare names from grocery scrapers
 * ("carrefour", "naivas") and domains from device scrapers ("jumia.co.ke").
 * The same retailer can appear as both — carrefour vs carrefour.ke.
 */
const TLD = /\.(co\.ke|or\.ke|ke|com|net|online|shop)$/;

export function storeKey(raw: string): string {
  return (raw || '')
    .toLowerCase()
    .trim()
    .replace(/^www\./, '')
    .replace(TLD, '');
}

export function storeName(raw: string): string {
  const key = storeKey(raw);
  return key
    .split(/[-_.]/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/lib/storeIdentity.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/app/lib/storeIdentity.ts src/app/lib/storeIdentity.test.ts package.json
git commit -m "feat(ui): fold duplicate store identities for display"
```

---

## Task 8: Image-led cluster card

**Files:**
- Create: `dealsonline_ui_ux_mock/src/app/features/clusters/components/ClusterCard.tsx`
- Modify: `dealsonline_ui_ux_mock/src/app/pages/DealsPage.tsx`
- Delete: `dealsonline_ui_ux_mock/src/app/features/clusters/components/ClusterDealCard.tsx`

**Interfaces:**
- Consumes: `ClusterSummaryView`, `storeName`, `formatPrice`, `shopLabel`.
- Produces: `<ClusterCard cluster={...} />`.

- [ ] **Step 1: Write the card**

Create `src/app/features/clusters/components/ClusterCard.tsx`:

```tsx
import { Link } from 'react-router';
import { TrendingDown, Package } from 'lucide-react';
import type { ClusterSummaryView } from '../../../lib/demoTypes';
import { formatPrice, shopLabel } from '../../../lib/format';
import { storeName } from '../../../lib/storeIdentity';
import { ImageWithFallback } from '../../../components/common/ImageWithFallback';

export function ClusterCard({ cluster }: { cluster: ClusterSummaryView }) {
  const name = cluster.display_name ?? cluster.title;
  const spread = cluster.like_for_like_spread_pct;
  const likelyUsed = cluster.condition_basis === 'likely_used';

  return (
    <Link
      to={`/prices/${encodeURIComponent(cluster.cluster_id)}`}
      className="group flex flex-col rounded-xl overflow-hidden ultra-border transition-colors hover:border-primary/40"
    >
      <div className="relative aspect-square bg-white flex items-center justify-center p-4">
        {cluster.image ? (
          <ImageWithFallback
            src={cluster.image}
            alt=""
            loading="lazy"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <Package className="h-10 w-10 text-muted-foreground/30" aria-hidden="true" />
        )}
        {spread != null && spread > 0 && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded bg-teal/10 px-1.5 py-0.5 text-xs font-semibold text-teal-deep">
            <TrendingDown className="h-3 w-3" aria-hidden="true" />
            {Math.round(spread)}%
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 pt-2">
        <p className="microcopy-label">{cluster.brand ?? cluster.category ?? 'Product'}</p>
        <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-foreground">{name}</p>
        <div className="mt-auto pt-2">
          <span className="price-num text-base font-bold text-foreground">
            {formatPrice(cluster.best_price)}
          </span>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {likelyUsed ? 'used/refurb asking' : 'lowest price'}
            {cluster.cheapest_store ? ` · ${storeName(cluster.cheapest_store)}` : ''}
          </p>
          <p className="text-xs text-muted-foreground">{shopLabel(cluster.n_stores ?? 0)}</p>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Swap it into DealsPage and delete the old card**

In `src/app/pages/DealsPage.tsx` replace the import
`import { ClusterDealCard } from '../features/clusters/components/ClusterDealCard';`
with
`import { ClusterCard } from '../features/clusters/components/ClusterCard';`
and the usage `<ClusterDealCard key={c.cluster_id} cluster={c} />` with
`<ClusterCard key={c.cluster_id} cluster={c} />`.

Then: `rm src/app/features/clusters/components/ClusterDealCard.tsx`

- [ ] **Step 3: Verify**

Run: `npm run type-check && npm run build`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add -A src/app/features/clusters src/app/pages/DealsPage.tsx
git commit -m "feat(ui): image-led cluster card on real product images"
```

---

## Task 9: Match provenance disclosure

**Files:**
- Create: `dealsonline_ui_ux_mock/src/app/features/clusters/components/MatchProvenance.tsx`
- Modify: `dealsonline_ui_ux_mock/src/app/pages/ClusterPricesPage.tsx`

**Interfaces:**
- Consumes: `ClusterDetailView`.
- Produces: `<MatchProvenance cluster={...} />` — renders nothing unless `mvp_n_merged > 1`.

- [ ] **Step 1: Write the component**

Create `src/app/features/clusters/components/MatchProvenance.tsx`:

```tsx
import { useState } from 'react';
import { ChevronDown, GitMerge } from 'lucide-react';
import type { ClusterDetailView } from '../../../lib/demoTypes';

/**
 * Honesty surface: 2,016 of 6,592 demo clusters are the union of more than one
 * engine cluster, and roughly 1 in 6 of those joins two things a human would
 * call variants. Shown only where a merge actually happened — mvp_generated
 * alone also covers 2,256 untouched pass-throughs.
 */
export function MatchProvenance({ cluster }: { cluster: ClusterDetailView }) {
  const [open, setOpen] = useState(false);
  const merged = cluster.mvp_n_merged ?? 0;
  if (merged <= 1) return null;

  return (
    <div className="rounded-lg ultra-border mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 p-3 text-left text-sm text-muted-foreground"
      >
        <GitMerge className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span className="flex-1">
          Grouped from {merged} product listings by title similarity
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="border-t border-border px-3 py-3 text-xs leading-relaxed text-muted-foreground">
          <p>
            These {cluster.n_listings ?? merged} listings were matched automatically, not
            verified by hand. Similar sizes or variants can occasionally be grouped together —
            check the store titles below before buying.
          </p>
          {cluster.mvp_rule && (
            <p className="mt-2 font-mono text-[11px] break-words">{cluster.mvp_rule}</p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Mount it on the comparison page**

In `src/app/pages/ClusterPricesPage.tsx`, add
`import { MatchProvenance } from '../features/clusters/components/MatchProvenance';`
and render `<MatchProvenance cluster={cluster} />` immediately before the
`{!cluster.comparison_grade && (` caveat block.

- [ ] **Step 3: Verify it appears on a merged cluster and not on a clean one**

Run:
```bash
npm run build && npx vite preview --port 4173 --host 127.0.0.1 &
sleep 6
node -e "
const m=require('./public/demo/manifest.json');
const fs=require('fs');
const cats=fs.readdirSync('./public/demo/categories');
let merged=null, clean=null;
for (const f of cats) {
  for (const r of JSON.parse(fs.readFileSync('./public/demo/categories/'+f))) {
    if ((r.mvp_n_merged||0)>1 && !merged) merged=r.cluster_id;
    if (!(r.mvp_n_merged>1) && !clean) clean=r.cluster_id;
  }
}
console.log('merged:', '/prices/'+encodeURIComponent(merged));
console.log('clean :', '/prices/'+encodeURIComponent(clean));
"
```
Then open both printed URLs against `http://127.0.0.1:4173`. Expected: the merged one shows "Grouped from N product listings by title similarity" and expands to the rule text; the clean one shows no such block.

- [ ] **Step 4: Commit**

```bash
git add src/app/features/clusters/components/MatchProvenance.tsx src/app/pages/ClusterPricesPage.tsx
git commit -m "feat(ui): disclose automatic merges on affected clusters only"
```

---

## Task 10: Comparison page — image, real history, normalized stores

**Files:**
- Modify: `dealsonline_ui_ux_mock/src/app/pages/ClusterPricesPage.tsx`
- Modify: `dealsonline_ui_ux_mock/src/app/features/product/components/PriceHistoryChart.tsx`

**Interfaces:**
- Consumes: `ClusterDetailView.price_history`, `.image`; `storeName`.
- Produces: `<PRPriceHistoryChart>` accepting `{ title: string; priceHistory: PricePointView[] }`.

- [ ] **Step 1: Re-point the chart at real data**

In `src/app/features/product/components/PriceHistoryChart.tsx`, replace the props interface and the mock import:

```tsx
import type { PricePointView } from '../../../lib/demoTypes';

interface PRPriceHistoryChartProps {
  title: string;
  priceHistory: PricePointView[];
}
```

Remove `import { type PricePoint } from '../../../data/mockServices';`, change the
component signature to `({ title, priceHistory }: PRPriceHistoryChartProps)`, replace
`{product.name}` in the subtitle with `{title}`, and change the axis key from
`month` to `t` in `<XAxis dataKey="t" />` and in `historyStats` (`filteredHistory.find(p => p.price === min)?.t`).

- [ ] **Step 2: Render image, stores and history on the comparison page**

In `src/app/pages/ClusterPricesPage.tsx`:

Add imports:
```tsx
import { storeName } from '../lib/storeIdentity';
import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { PRPriceHistoryChart } from '../features/product/components/PriceHistoryChart';
```

Render the image immediately after the `<h1>`:
```tsx
{cluster.image && (
  <div className="mb-4 flex h-56 items-center justify-center rounded-xl bg-white p-4 ultra-border">
    <ImageWithFallback src={cluster.image} alt="" className="max-h-full max-w-full object-contain" />
  </div>
)}
```

Replace every rendered `{storeName}` label in the store rows and config rows with
`{storeName(storeNameRaw)}` (rename the map variable to `storeNameRaw` to avoid
shadowing the helper), and the avatar initial with `storeName(storeNameRaw)[0]`.

Append after the configs block:
```tsx
{cluster.price_history && cluster.price_history.length >= 2 && (
  <div className="mt-8">
    <PRPriceHistoryChart title={name} priceHistory={cluster.price_history} />
  </div>
)}
```

- [ ] **Step 3: Verify against a cluster that has history**

Run:
```bash
npm run type-check && npm run build
node -e "
const fs=require('fs');
const dir='./public/demo/clusters';
for (const f of fs.readdirSync(dir)) {
  const rows=JSON.parse(fs.readFileSync(dir+'/'+f));
  for (const id in rows) if ((rows[id].price_history||[]).length>=2) {
    console.log('history cluster: /prices/'+encodeURIComponent(id)); process.exit(0);
  }
}
console.log('NONE FOUND — investigate capture');
"
```
Expected: prints a URL. Open it against the preview; the chart renders with real dated points and the KES axis. Confirm a grocery cluster shows **no** chart section at all.

- [ ] **Step 4: Commit**

```bash
git add src/app/pages/ClusterPricesPage.tsx src/app/features/product/components/PriceHistoryChart.tsx
git commit -m "feat(ui): comparison page on real image, stores and price history"
```

---

## Task 11: Homepage on real categories

**Files:**
- Modify: `dealsonline_ui_ux_mock/src/app/pages/HomePage.tsx`
- Modify: `dealsonline_ui_ux_mock/src/app/components/layout/HeroSection.tsx`
- Delete: `dealsonline_ui_ux_mock/src/app/data/homepageMock.ts`

**Interfaces:**
- Consumes: `clustersApi.getManifest()`, `.getDeals()`, `.getCategory(slug)`.

- [ ] **Step 1: Replace the mock-driven rails**

In `src/app/pages/HomePage.tsx`, delete the `homepageMock` import block and load real
data instead:

```tsx
const [manifest, setManifest] = useState<DemoManifest | null>(null);
const [deals, setDeals] = useState<ClusterSummary[]>([]);
const [rails, setRails] = useState<Record<string, ClusterSummary[]>>({});

useEffect(() => {
  let cancelled = false;
  (async () => {
    const [m, d] = await Promise.all([clustersApi.getManifest(), clustersApi.getDeals({ limit: 12 })]);
    if (cancelled) return;
    setManifest(m);
    setDeals(d.results);
    const featured = m.categories.filter((c) => c.comparison_grade).slice(0, 4);
    const loaded = await Promise.all(featured.map((c) => clustersApi.getCategory(c.slug)));
    if (cancelled) return;
    setRails(Object.fromEntries(featured.map((c, i) => [c.slug, loaded[i].slice(0, 6)])));
  })();
  return () => { cancelled = true; };
}, []);
```

Render one rail per comparison-grade category using `<ClusterCard>`, each headed by the
real pool size, e.g. `{cat.count.toLocaleString()} products compared at 2+ stores`.
Add a final "Also tracking" strip listing the non-comparison-grade categories from
`manifest.categories` with their counts.

- [ ] **Step 2: Feed the hero a real cluster**

In `HeroSection.tsx`, replace the hard-coded `SCREEN_ROWS` offer list with the top deal
passed in as a prop: show its real name, its `best_by_store` prices with `storeName`
labels, and mark the lowest. Keep the existing device frame, spread bar and motion.

- [ ] **Step 3: Delete the mock and verify nothing imports it**

```bash
rm src/app/data/homepageMock.ts
grep -rn "homepageMock" src/ || echo "clean"
npm run type-check
```
Expected: `clean`, then exit 0.

- [ ] **Step 4: Verify the homepage renders real data**

Run: `npm run build && npx vite preview --port 4173 --host 127.0.0.1`
Open `http://127.0.0.1:4173/`. Expected: rails headed Groceries (4,272), Phones (1,208),
Laptops (729), Tablets (141); every card shows a real image and a KES price; no
"iPhone 17 Pro Max" placeholder rows remain.

- [ ] **Step 5: Commit**

```bash
git add -A src/app/pages/HomePage.tsx src/app/components/layout/HeroSection.tsx src/app/data
git commit -m "feat(ui): homepage rails on real cluster categories, mock deleted"
```

---

## Task 12: Offline search

**Files:**
- Create: `dealsonline_ui_ux_mock/src/app/pages/SearchPage.tsx`
- Modify: `dealsonline_ui_ux_mock/src/app/routes.ts`
- Modify: `dealsonline_ui_ux_mock/src/app/features/search/components/SearchBar.tsx`

**Interfaces:**
- Consumes: `clustersApi.search`, `clustersApi.getDetail`.

- [ ] **Step 1: Build the page**

Create `src/app/pages/SearchPage.tsx`: read `q` from `useSearchParams`, call
`clustersApi.search(q, { limit: 48 })`, resolve each hit to a summary via the category
files (or render straight from the index fields plus a `getDetail` lazy fetch), and lay
results out with `<ClusterCard>`. Include the three states the guidelines require: a
loading state, a "No products match <q>" empty state with a link back to `/deals`, and
a result count.

- [ ] **Step 2: Route it and point the header search at it**

In `src/app/routes.ts` add `{ path: "search", Component: SearchPage },` (replacing the
existing `BrowsePage` alias for `search`), with
`const SearchPage = lazy(() => import("./pages/SearchPage"));`.

In `SearchBar.tsx`, submit to `/search?q=<encoded>`.

- [ ] **Step 3: Verify**

Run: `npm run build && npx vite preview --port 4173 --host 127.0.0.1`
Search "olive oil" and "elitebook". Expected: both return results with images and KES
prices; a nonsense query shows the empty state, not a blank page.

- [ ] **Step 4: Commit**

```bash
git add src/app/pages/SearchPage.tsx src/app/routes.ts src/app/features/search/components/SearchBar.tsx
git commit -m "feat(ui): offline search over the committed cluster index"
```

---

## Task 13: Retire the fabricated product surfaces

**Files:**
- Modify: `dealsonline_ui_ux_mock/src/app/routes.ts`
- Modify: `dealsonline_ui_ux_mock/src/app/pages/BrowsePage.tsx`, `CategoriesPage.tsx`
- Delete: `dealsonline_ui_ux_mock/src/app/data/mockServices.ts`
- Delete: `dealsonline_ui_ux_mock/src/app/pages/ProductDetailsPage.tsx`
- Delete: `dealsonline_ui_ux_mock/src/app/features/product/components/ReviewSection.tsx`
- Delete: `dealsonline_ui_ux_mock/src/app/features/product/components/StoreComparisonList.tsx`
- Delete: `dealsonline_ui_ux_mock/src/app/features/product/components/ProductHero.tsx`

**Interfaces:**
- Produces: `/product/:productId` and `/browse/:productType` redirect into the cluster surfaces.

- [ ] **Step 1: Redirect the PR routes**

In `src/app/routes.ts`, replace the `product/:productId`, `product/pr/:productId`,
`category/:categoryId` and `browse/:productType` entries with redirects to `/deals`
(via a small `<Navigate to="/deals" replace />` element), and repoint `browse` at a
categories page driven by `manifest.categories`.

Rationale to keep in the commit message: those pages render PriceRunner catalogue
prices, which are GBP magnitudes displayed as KES — issue #1 in
`docs/backend-data-issues.md`.

- [ ] **Step 2: Rebuild CategoriesPage from the manifest**

Replace the PR tree fetch with `clustersApi.getManifest()`, rendering one tile per
category with its real count, comparison-grade categories first, linking to
`/deals?slug=<slug>`.

- [ ] **Step 3: Delete the mock modules and their consumers**

```bash
cd /home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock
rm src/app/data/mockServices.ts \
   src/app/pages/ProductDetailsPage.tsx \
   src/app/features/product/components/ReviewSection.tsx \
   src/app/features/product/components/StoreComparisonList.tsx \
   src/app/features/product/components/ProductHero.tsx
grep -rn "mockServices\|generateStores\|generatePriceHistory\|generateRatingBreakdown\|PLACEHOLDER_REVIEWS" src/ || echo "no fabricated data left"
```
Expected: `no fabricated data left`.

- [ ] **Step 4: Verify**

Run: `npm run type-check && npm run build`
Expected: exit 0 for both. Fix any dangling imports the deletions expose.

- [ ] **Step 5: Commit**

```bash
git add -A src/app
git commit -m "refactor(ui): retire GBP-priced PR pages and all generated mock data"
```

---

## Task 14: Static hosting

**Files:**
- Modify: `dealsonline_ui_ux_mock/vite.config.ts`
- Modify: `dealsonline_ui_ux_mock/src/app/context/AuthContext.tsx`
- Create: `dealsonline_ui_ux_mock/public/_redirects`
- Create: `dealsonline_ui_ux_mock/public/404.html`

- [ ] **Step 1: Stop the boot-time auth probe**

In `src/app/context/AuthContext.tsx`, guard the mount effect so the demo build never
calls the API:

```tsx
const DEMO = import.meta.env.VITE_DEMO_STATIC === 'true';

useEffect(() => {
  if (DEMO) { setLoading(false); return; }   // static demo: no auth backend
  // ...existing session probe
}, []);
```

Add `VITE_DEMO_STATIC=true` to a new `dealsonline_ui_ux_mock/.env.production`.
Hide the header "Sign in" control when `DEMO` is set.

- [ ] **Step 2: Add SPA fallback files**

Create `public/_redirects` (Netlify/Cloudflare):
```
/*    /index.html   200
```

Create `public/404.html` containing a single redirect to `/index.html` preserving the
path, for GitHub Pages.

- [ ] **Step 3: Set the base path**

In `vite.config.ts`, add `base: process.env.VITE_BASE ?? '/'` to the exported config so
a project-subpath deploy can build with `VITE_BASE=/dealsonline/ npm run build`.
`demoSource.ts` already reads `import.meta.env.BASE_URL`, so fixtures follow the base.

- [ ] **Step 4: Verify a real static serve with no backend**

```bash
cd /home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock
npm run build
pkill -f "uvicorn app.main:app" || true   # prove nothing calls the API
npx serve -s dist -l 4173 &
sleep 4
curl -s -o /dev/null -w "home=%{http_code}\n" http://127.0.0.1:4173/
curl -s -o /dev/null -w "deep=%{http_code}\n" http://127.0.0.1:4173/deals
curl -s -o /dev/null -w "manifest=%{http_code}\n" http://127.0.0.1:4173/demo/manifest.json
```
Expected: all `200`. If `serve` is unavailable, use
`apienv/bin/python -m http.server 4173 --directory dist` and accept that deep links 404
under it (that is the host's job, covered by `_redirects`).

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts public/_redirects public/404.html .env.production src/app/context/AuthContext.tsx
git commit -m "build(demo): static hosting config with no runtime backend"
```

---

## Task 15: Full verification with the backend down

**Files:** none modified — this task is the gate.

- [ ] **Step 1: Confirm nothing reaches the network**

```bash
cd /home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux_mock
pkill -f "uvicorn app.main:app" || true
npm run build && npx serve -s dist -l 4173 &
sleep 4
```

Then run a Playwright pass that fails on any request to `/api`:

```python
# /tmp/verify_static.py — run with apienv/bin/python
from playwright.sync_api import sync_playwright
PAGES = ["/", "/deals", "/browse", "/search?q=olive%20oil"]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", headless=True)
    for path in PAGES:
        ctx = b.new_context(viewport={"width": 1440, "height": 900})
        pg = ctx.new_page()
        api_calls, errors = [], []
        pg.on("request", lambda r: api_calls.append(r.url) if "/api/" in r.url else None)
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        pg.goto("http://127.0.0.1:4173" + path, wait_until="networkidle", timeout=45000)
        pg.wait_for_timeout(1500)
        pg.screenshot(path=f"/tmp/static{path.replace('/','_').replace('?','_')}.png", full_page=True)
        print(path, "| api calls:", api_calls, "| errors:", errors[:3])
        ctx.close()
    b.close()
```

Expected: `api calls: []` for every page, and no console errors.

- [ ] **Step 2: Accessibility gate**

```bash
PORT=$(npx -y @accesslint/chrome@latest ensure | node -e 'process.stdin.on("data",d=>process.stdout.write(""+JSON.parse(d).port))')
for u in / /deals /browse; do
  npx -y @accesslint/cli@latest scan "http://127.0.0.1:4173$u" --port "$PORT" --wait-for "h1" --format json | tail -1
done
npx -y @accesslint/chrome@latest stop --all
```
Expected: `"violations":[]` on each. Fix any regression before proceeding.

- [ ] **Step 3: Confirm the honesty invariants hold on screen**

Check by eye against the screenshots from Step 1:
- every price reads `KES …`, none reads `£`;
- every card shows a real product image or the neutral package icon, never a broken image;
- the merge disclosure appears on a merged cluster and is absent on a clean one;
- the price-history chart appears only on device clusters that have one;
- no reviews or star ratings appear anywhere.

- [ ] **Step 4: Commit the verification artefacts and update docs**

Add a "Static demo" section to `dealsonline_ui_ux_mock/DESIGN_HANDOFF.md` recording the
capture command, the fixture layout, and the invariants above.

```bash
git add dealsonline_ui_ux_mock/DESIGN_HANDOFF.md
git commit -m "docs: static demo build and capture workflow"
```

---

## Follow-ups (explicitly out of scope here)

1. **Refresh cadence** — fixtures are a point-in-time capture. Re-running
   `scripts/capture_demo_dataset.py` is the whole update process; decide whether that
   runs on a schedule before the demo is treated as live.
2. **`carrefour` vs `carrefour.ke`** — Task 7 folds them for display only; the
   underlying store identity duplication is a data fix. Add to
   `docs/backend-data-issues.md`.
3. **Grocery price history** — groceries have no `compiled_products` rows, so 65% of the
   demo can never show a trend. Wiring the grocery pipeline into `compiled_products`
   would unlock it.
4. **Images for the 1 remaining cluster** — a single cleanshelf-only cluster has no
   usable image and falls back to the package icon.
5. **`mvp_n_merged` on production clusters** — always `None` there, so the disclosure
   silently disappears if the demo is ever pointed back at `product_clusters`. That is
   correct behaviour but worth stating in the handoff.

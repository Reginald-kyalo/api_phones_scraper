# Category tree — recorded issues

## ⟳ STATUS 2026-08-21 — the tree was republished under this audit

⭐ **Every count in this document describes the tree as of 2026-08-19 and is kept as a historical
record.** Live now: **4,137 nodes · 956 browsable · 102,038 placements** — unchanged in total, but
the phone domain moved: `smartphone` 2,929 → **3,325**, `tablet` 602 → **720**, `phone-tablet`
23,467 → **23,346**, and `phone-11b5d5` is **gone** (folded into `phone`; its URL 404s).

Issue status since this audit: **6** partly resolved by R1 (the `Phones` group is one node now;
`Laptops` ×3 remains) · **7** closed, rejected · **8/9** deferred, and `/shelf/ultra-book` is a
new instance — a *pinned* slug serving `Exercise Books` that `unpin_stale_slugs` cannot see ·
**10/11/13** done · **12** re-ruled out · **orphans**: ⛔ the "417 stocked roots" framing is
superseded — see `phones_scraper/implementation_plans/department_spine_worksheet_2026-08-21.md`.

⭐ Your §1 finding on ordering — that the panel must sort by subtree stock, not own stock — is now
enforced engine-side too: `n_clusters_subtree` is published on every node doc.


Audit of `taxonomy_db.browse_nodes` as served by `/api/clusters/browse-tree`, done while wiring
the canonical tree into the storefront's category surfaces. **Measured live 2026-08-19** against
all 4,185 published nodes (full crawl, `browsable_only=false`).

> ⚠️ **RE-MEASURED AFTER THE ENGINE REBUILD OF 2026-08-19.** Issues 10, 11 and 13 are **fixed**;
> issue 12 is **re-ruled**; issue 8's stated rationale is **withdrawn**. Every count below that
> was taken before the rebuild has moved — see each entry. The tree is now **4,137** nodes,
> **956** browsable, **610** unsorted, **3,124** parentless, **529** browsable roots,
> **102,038** placements. `coarse` is unchanged at 217.

Ordered by who has to fix it: the **UI**, the **API**, or the **engine** (`phones_scraper`,
branch `matching`). Nothing here is speculative — every number is reproducible from the two
endpoints.

---

## 0. First, what is NOT wrong

The tree's structural integrity is **perfect**, and this matters because it is what made the
wiring safe to do at all:

| invariant | violations |
|---|---:|
| nodes with a `parent_slug` that resolves to no node | 0 |
| `ancestors[-1] != parent_slug` | 0 |
| `len(ancestor_labels) != len(ancestors)` | 0 |
| `browsable: true` with zero stock in its subtree | 0 |
| `browsable: false` with stock in its subtree | 0 |
| `unsorted: true` that nevertheless has children | 0 |
| null or empty labels | 0 |

The published counts also verify exactly: **4,185** nodes, **981** browsable, **217** coarse,
**619** unsorted, **3,170** parentless, **553** browsable roots, max depth 5.
⚠️ *Post-rebuild (2026-08-19): **4,137** / **956** / 217 / **610** / **3,124** / **529**, max
depth 5, and all seven invariants above still hold at **0 violations**.*

⭐ So every defect below is **editorial or presentational**, not structural. The shape is sound;
the copy and the groupings are what carry shop-floor mess into the storefront.

---

## FIXED in this change

### 1. `n_clusters` is own stock, and every shelf renders the closure — API 🔴

`browse_nodes.n_clusters` counts what sits **directly** on a shelf. `/clusters/by-node/{slug}`
returns the **descendant closure** by default. So the tree advertised one number and the page one
click later opened at another:

| node | tree said | shelf showed |
|---|---:|---:|
| `food-cupboard` | 2,010 | **6,220** (3.1×) |
| `phone-tablet` | 19,301 | **23,466** |
| `smartphone` | 2,313 | **2,929** |

⛔ **And it was not only a display bug — `/browse-tree` ORDERED by it.** The frontend takes the
top N roots for its menu, and ordering 553 roots on own stock swapped **6 of the top 12**:

```
by OWN n_clusters (what shipped)        by SUBTREE (what shelves show)
 2  Telephony, Computing…      2,018     2  Electronics & Computers   20,772
 9  Kitchenware                  729     6  Home, Garden & Kids        2,801
12  Battery Chargers             553     9  Office & School Supplies   2,074
```

`Electronics & Computers` is the **second-largest department in the corpus** (20,772 clusters)
and own-count ordering put it at rank **20** — cut from a top-12 menu — while promoting `Battery
Chargers` (553 clusters, one shop) into it. Four of the correct top 12 hold **zero** stock of
their own and were invisible entirely.

**Fixed:** `BrowseNodeView.n_clusters_subtree` (`app/api/schemas/clusters.py`), rolled up in one
pass over the materialised `ancestors` in `app/api/routes/clusters.py::_subtree_totals`, cached
on the same 300s TTL as the tree. `browse-tree` now sorts by it. Verified equal to
`by-node.total` on every node checked. `n_clusters` keeps its old meaning — the change is
additive. Guarded by `tests/test_browse_subtree_totals.py` (9 tests).

⚠️ The client could not have fixed this: one honest number would have cost it a 4,185-node crawl.

### 2. `MegaMenu.tsx` was mounted nowhere — UI 🔴

`CATEGORY_TREE_API.md` listed it as "header nav, every page" and called it "the highest-leverage
surface — it is on every page". **Nothing imported it.** It was on zero pages. The header's
"All categories" button called `navigate('/browse')`, so the panel was dead code and the
canonical tree had no entry point anywhere in the product.

**Fixed:** rewritten against `browseApi` and mounted in `Header.tsx`. That single omission is
also why task 1 ("make `/shelf` reachable") had never landed.

### 3. `ShelfPage.shelfCount` said the right thing and did the opposite — UI 🔴

Its comment read *"a shelf's own stock is not the point; what is below it is"* — and its body
returned `n.n_clusters`, which is exactly the shelf's own stock.

**Fixed:** count logic moved to `lib/categories.ts::shelfCount`, which reads
`n_clusters_subtree`, so the three surfaces that render a category count cannot disagree again.

### 4. 274 of 981 browsable labels SHOUT — UI 🟠

28% of the navigable tree is raw shop breadcrumb copy: `OFFICE STATIONERY` (1,095 clusters),
`SOAPS & DETERGENTS` (503), `WHITE GOODS` (341), `PHONES & ACCESSORIES` (194), `AUDIO VISUAL`
(182). Eight more arrive entirely lowercase (`coolants`, `plotters`, `laptop fan`).

**Fixed:** `lib/categories.ts::categoryLabel` normalises **on read only** — the raw label stays
the upstream join key and is never written back. 270 labels are rewritten; mixed-case labels
(`iPhones & iPads`, `MacBook Pro`, `Fresh produce`) pass through untouched, because turning
`iPads` into `Ipads` would be worse than the shouting.

⚠️ One trap found the hard way: `SIM` is **deliberately not** in the acronym list. The tree's
only shouted use of it is `SIM SIM` — the Kenyan name for sesame, a food root — and the one
genuine SIM-card shelf already reads `Sim Cards & Tools` in mixed case.

### 5. 404 and "no children" shared one screen — UI 🟠

The API is deliberate that an unknown node is a 404 and never an empty list, but `ShelfPage`
caught every rejection into a single *"That category could not be loaded."* A broken link was
therefore indistinguishable from a transient outage.

**Fixed:** `ShelfPage` now branches on `ApiError.status === 404` and renders "No such category"
with a route back. Verified by requesting a **spine** slug on the canonical route
(`/shelf/mobile-phones`), which is the exact confusion the two disjoint slug spaces invite.

---

## OPEN — engine-side (`phones_scraper`)

### 6. The tree is 46 shops' taxonomies **unioned, not merged** 🔴 — first slice REQUESTED 2026-08-21

⭐ **The phone/tablet domain is now a concrete re-parenting request**: `REPARENT_REQUEST_PHONES.md`
— 4 confident moves, 6 edges needing a human verdict, predicted counts, and the conservation
check (102,038 placements before and after). Decision taken 2026-08-21: **fix it in the tree, not
in the client**, because `smartphone` and `phone` hold disjoint clusters and `/by-node` takes one
slug, so a display-only fold would promise 3,345 and deliver 2,929.


This is the deepest issue and the one the UI can only paper over.

- **398 of 529 browsable roots (75%) are served by a single store**, and they hold **51,772 of
  102,038 clusters** (subtree closure) — half the catalogue sits in one shop's private vocabulary.
- **55% of browsable nodes are roots** (529 at depth 0 vs 214 at depth 1). The tree is not deep,
  it is wide.
- The same concept resolves in several unconnected places:

| concept | occurrences (identical labels, different parents) |
|---|---|
| `Laptops` | `laptop-2eb1af` (572, under *Electronics*), `laptop` (522, under *Laptops & Tablets*), `laptop-06ffb7` (136, under *Telephony…*) |
| `Phones` | `phone-11b5d5` (495, under *Smartphones*), `phone` (371, under *Phones and tablets*), `phone-1a5a7a` (68, under *Kids Tablets & Phones*) |
| `Audio` | `audio` (5,280), `audio-d9e5f0` (41) |

⛔ **For a price-comparison product this is the load-bearing defect.** The promise is "see every
store's price for one thing", and the navigation splits the catalogue *by store* before the user
reaches a product. 20 label groups are affected.

⚠️ `CATEGORY_TREE_API.md` §6 says these are "not label-identical, so the engine's duplicate fold
cannot touch them". That is true of the *sibling* group under `Smartphones`, but the groups above
**are** label-identical — they simply are not siblings. The fold's scope is per-parent, which is
worth stating explicitly, because the two cases need different remedies: sibling near-duplicates
need a human ruling, cross-parent identical labels need a merge or a canonical alias.

### 7. 40% of placements sit on a coarse node 🟠

`phone-tablet` alone holds 19,310 of 102,038. Known and documented upstream; descendant closure
is the mitigation and it works. Recorded here only so it is not rediscovered as a UI bug.

### 8. 367 slugs carry a collision suffix (202 of them browsable) 🟠

`/shelf/laptop-2eb1af`, `/shelf/phone-11b5d5`, `/shelf/audio-d9e5f0`. These are shareable,
linkable, indexable URLs that read as machine noise. A slug policy (parent-qualified, e.g.
`electronics-laptops`) would fix the readability.

⛔ **CORRECTED 2026-08-19 — the stability half of this is FALSE, and it inverts the cost.** These
slugs **are** stable across a republish: that is exactly what `canonical_slug_pins` exists for.
The readability argument stands on its own; the stability one has to be dropped. And because the
slugs are pinned, issues 8 **and** 9 mean *unpinning* them and accepting **URL churn on 367 live
URLs** — that is the expensive part, not the slugifier. Both remain deferred on that basis.

### 9. Slug lemmatisation artefacts 🟡

`clothe` (label *Clothes*), `light` (*Lightings*), `white-good` (*WHITE GOODS*), `accessory-kit`,
`coolant`, `plotter`. The singulariser is applied to the slug and produces non-words — `clothe`
is a verb. Labels are unaffected; only URLs read oddly.

### 10. Brand-as-category — ✅ FIXED 2026-08-19, but **not as written**

`Macbooks` (143), `iPads` (34), `iPhones & iPads` (18), `NOTHING PHONES` (13), `Macbook Air` (6),
`MacBook Pro 2020` (3), `VivoBook` (1). A brand is a *filter*, not a shelf; these compete with
the real category and fragment it further.

⛔⛔ **APPLIED LITERALLY THIS WAS REFUTED BY MEASUREMENT.** Hiding brand-as-category removes
`Macbooks` — **11 stores, 143 clusters, correctly parented under `laptops`** — the best-attested
node in the entire class and the site's best Apple-laptop page. `iPads` and `Galaxy Tablets`
(4 stores each) go with it.

⭐⭐ **THE DEFECT IS THE POSITION, NOT THE LABEL.** `Core i5` (83 clusters) and `Core i7` (74)
were browsable **roots** — a CPU stepping listed beside `Electronics` and `Groceries`. So the
rule shipped is *demote at the root, keep under a parent*: **15 nodes demoted**, and `Macbooks`,
`iPads` and `Galaxy Tablets` keep their shelves.

⛔ **This entry also missed a whole class.** `Core i5/i7/i3/i9`, `AMD RYZEN 7` and `Intel 7 ULTRA`
are **CPU spec facets**, not brands — no brand list would ever have caught them, and they carried
more clusters than the brand nodes did.

⭐ Demotion clears a flag only: the node, its rows and its placements are untouched, so it still
resolves a breadcrumb for anything placed on it.

### 11. Promotional shelves published as categories — ✅ FIXED 2026-08-19

`August Sale` (8 clusters, child of `phone-tablet` — visible in the live mega panel),
`25th Year Anniversary Sale` (1), `Featured Kitengela` (1). Time-boxed merchandising, not
taxonomy. They will rot.

⭐ Confirmed and larger than listed: **10 shelves** were live (`Promos` 15, `August Sale` 8,
`Phone Brands` 43, `Tv's Shop by Brand` 24, `Cleaning Deals`, `Liqour Deals`, `Top Offers`,
`Badili Discounts`, `Back To School Laptop Offers`, `25th Year Anniversary Sale`) and **41 more**
sat one second store away from joining them.

⛔ **The fix is a HEAD-NOUN rule, not a list of phrases** — the previous whole-label list
structurally could not reach a shop's own banner name. Measured over all **4,263** distinct
labels, the heads `deal` (18), `offer` (10), `brand` (7), `discount` (2), `promo` (1) and
`saving` (1) are **100% merchandising with no exceptions**; `sale` is the only head with real
ones (`Point of sale`, six `… for Sale` classifieds shelves), which are named explicitly.

⛔ It is **not** a substring test: `Brandy` (19 clusters), `Brand New Laptops` (117) and
`ENEGY SAVERS` (42) all contain a merchandising word and all survive — none of them *is* one.

### 12. Misfiled shelves — ⚠️ RE-RULED 2026-08-19 (not an engine task; superseded by §15)

`Memory Cards` (1 cluster but spanning **18 stores**) sits under `Smartphones`.

⚠️ **RE-RULED 2026-08-19 — over-weighted, and not an engine task.** The **1 cluster** is the whole
story: those rows do not cluster across stores, so the shelf renders about one product. The
"18 stores" reads far bigger than the defect is. No rule can catch the edge either —
`drop_unsupported_parent_edges` requires an inversion and 18 < 30, while a rule for
token-disjoint non-inverted edges would take `Beers → Alcohol` and `Fruits → Food Cupboard` with
it. The correct channel is a human parent verdict, and the entry is right that the UI must not
patch it.

⛔⛔ **A SHARPER ONE OF THE SAME KIND, FOUND WHILE CHECKING THIS.** `Wines` — **6 stores, 295
clusters** — renders as a *child* of `Sparkling & Champagne` (1 store, 21), because one shop
writes a product's multiple category tags as a single path. It was invisible to **both** existing
engine safety nets, so it had been silently wrong on the storefront. A new report
(`inverted_under_conjunction`, 17 edges) now surfaces it for a human ruling.

Also seen while
rendering: a cluster branded `LAPTOPS`, titled `8211`, priced KES 398, filed under **Food
Cupboard** and already flagged by the serving layer as *"implausibly low best price — likely a
mis-parsed listing"*. Report upstream; do not patch in the UI.

---

### 15. A rule DOES separate the inverted conjunction edges — the missing term was subtree share 🟠

⭐ **Filed in response to the engine's 2026-08-21 handoff**, which reported `Wines` (6 stores, 295
clusters) rendering as a child of `Sparkling & Champagne` (1 store, 21) and concluded that *"no
rule can catch the edge — a rule for token-disjoint non-inverted edges would take `Beers → Alcohol`
and `Fruits → Food Cupboard` with it."*

That is true of token-disjointness **alone**. Adding the subtree rollup this repo now publishes
(`n_clusters_subtree`, issue 1) separates them cleanly, because the real signal is not that the
labels share no words — it is that the child **is** the parent:

| edge | child share of parent subtree | token-disjoint | verdict |
|---|---:|:---:|---|
| `Wines` → `Sparkling & Champagne` | **93%** | yes | **flagged** |
| `Cameras` → `CCTV and Surveillance` | **100%** | yes | **flagged** (571 clusters, 19 vs 3 stores) |
| `Soft Drinks` → `Juices & Carbonates` | **98%** | yes | **flagged** (926 clusters) |
| `Beers` → `Alcohol` | 9% | yes | passes |
| `Fruits` → `Food Cupboard` | 2% | yes | passes |
| `Fruits` → `Fresh` | 9% | yes | passes |
| `Laundry` → `Cleaning & Household` | 3% | yes | passes |
| `Tablets` → `Computers & Tablets` | 100% | **no** | passes |

⛔ **Both terms are load-bearing and neither works alone.** Subtree share alone flags 99 edges,
including `Tablets → Computers & Tablets` — the doc's own canonical example of a *correct* coarse
edge. Token-disjointness alone is what the engine already rejected. Together:

    child.n_stores > parent.n_stores
    AND child_subtree / parent_subtree >= 0.85
    AND tokens(child) ∩ tokens(parent) == ∅   (singularised, minus and/&/the/of)
    AND child_subtree >= 25                    (drop rounding-noise shelves)

**9 candidates over the whole tree** — a reviewable queue, not the 65 + 17 currently printed. The
eight beyond `Wines` were not previously named, and two are larger than it: `Cameras` (571
clusters, 19 stores) and `Soft Drinks` (926 clusters).

⚠️ One of the nine, `TVs`(248, 22 stores) under `Televisions`(19 stores), is **not** an inversion —
it is issue 6 (the same concept twice) surfacing through this rule. Useful, but it belongs in the
duplicate queue, not the parent-verdict one.

⭐ This does not overturn the engine's call that these need a **human verdict** — it narrows what a
human has to look at, and does it with a field that now exists precisely because of this audit.

---

### 16. ✅ FIXED — the category panel was desktop-only, so mobile had no subcategories at all 🔴 — MINE

⛔⛔ **A DEFECT IN THE WIRING THIS AUDIT SHIPPED.** The panel trigger lives in
`Header.tsx`'s desktop nav, which is `hidden lg:flex`. Measured across three viewports:

| viewport | panel trigger | what the user actually gets |
|---|:---:|---|
| 390px (mobile) | **absent** | one flat `All categories` link in the sheet |
| 900px (tablet) | **absent** | one flat `All categories` link in the sheet |
| 1440px (desktop) | present | the full two-level panel |

So below 1024px the hamburger sheet offers `Home / All categories / Sale / About` and **no
category tree whatsoever** — no departments, no subcategories. The canonical tree reached a
screen, and then only reached a wide one.

⭐ The fix is not to shrink the panel: a 12-column flyout is wrong on a phone. **Fixed
2026-08-21** with `features/categories/MobileCategoryNav.tsx` — an accordion in the sheet:
departments with icons and honest counts, tap to expand children in place, `Show all X →` into
the shelf. One department open at a time, because a 320px sheet already scrolls.

⭐ The fetch, the module-level cache and the top-N cut moved to
`features/categories/useCategoryTree.ts`, **shared by the panel and the sheet**, so the two
surfaces cannot drift about what "the departments" are. `MegaMenu` was refactored onto it rather
than the logic being copied — a second private copy of the top-N is exactly how this repo ended
up with two category trees that disagreed.

### 16b. ✅ FIXED — a second, wider dead zone nobody had reported: 768px to 1023px

Found by adding a tablet viewport to the gate, not by inspection. The hamburger was `md:hidden`
(≤767px) and the desktop nav is `hidden lg:flex` (≥1024px), so **every viewport between them
rendered neither** — no category panel *and* no hamburger. iPad portrait (768), small laptops and
any half-width desktop window had no navigation menu of any kind.

⚠️ Two breakpoints describing the same edge have to be the same value. The hamburger is now
`lg:hidden`. **The lesson is the gate, not the class**: every assertion in this repo ran at
1440px, so a whole band of viewports was unverified and two separate defects lived there. The
gate now runs at 390px, 900px and 1440px — 42 assertions.

### 17. The panel stops at two levels, and five departments waste one of them 🟠 — MINE (OPEN)

The panel shows departments and their direct children; anything deeper is only reachable by
leaving for `/shelf`. That would be a reasonable cut — except that for five of the twelve
departments the single child **restates the heading** (`Home, Garden & Kids` → `Home & Garden`,
100% of its stock; four more in `CATEGORY_NAMING_SPEC.md` §1). Those columns spend the panel's
one level of depth saying nothing.

⚠️ **This is a symptom of the spine, not of the panel.** Adding a third level would show real
subcategories under a redundant one rather than fixing the redundancy. Sequence it after Phase
2.1: the spine collapses the pass-throughs, and only then is it worth deciding whether the panel
needs another level.

---

## OPEN — API-side

### 13. `browse_nodes` had only the `_id_` index — ✅ FIXED 2026-08-19

`/browse-tree`'s docstring claims "`parent` is indexed". It is not — nor are `ancestors`,
`browsable` or `parent_slug`. Every call is a COLLSCAN (**4,185 docs examined to return 553**),
and `_subtree_totals` adds a second full scan per TTL window.

⚠️ Harmless today — the roots call measures **30 ms** — because 4,185 documents is nothing. It is
recorded because the docstring asserts a guarantee the database does not provide, which is how a
performance cliff arrives unannounced when the tree grows. Suggested:
`{parent_slug: 1, browsable: 1}` and `{ancestors: 1}`.

✅ **FIXED 2026-08-19 — both indexes exist, and this was engine-side, not API-side.** They are
created by `publish_browse_tree.write()` rather than by a migration, beside the `node_slug` index
it already wrote for placements. ⭐ **A migration fixes one database; the writer fixes every
environment that ever rebuilds the tree** — and the asymmetry of a publisher that indexed one of
its two collections is why nobody noticed. Verified live: `parent_slug_1_browsable_1` and
`ancestors_1`.

### 14. `/by-node` on a large subtree builds a 23k-member `$in` 🟡

`by-node/phone-tablet` measures **0.56 s** against 0.18 s for `food-cupboard`; it materialises
every placement id in the subtree before querying. Fine at present scale, and the existing
comment explains the trade (paginating placements would lose the best-first sort) — but it is the
one endpoint whose cost grows with the corpus rather than the page.

---

## Corrections to `CATEGORY_TREE_API.md`

The doc is accurate on every count it publishes. ⛔⛔ **THIS PARAGRAPH USED TO VOUCH FOR THE
DISJOINT-SLUG-SPACE WARNING AS WELL, AND THAT ENDORSEMENT WAS WRONG — see 4 below.** Four claims
did not survive measurement, and all four have been corrected in place:

1. §1 listed `MegaMenu` as live on "every page". It was mounted nowhere (issue 2).
2. §6 task 2 advised taking the top ~12 roots as returned. Correct **only now** that ordering is
   by subtree stock (issue 1); as written it excluded the site's second-largest department.
3. §6 said near-duplicate shelves are "not label-identical". True for the `Smartphones` siblings,
   false across the tree (issue 6).
4. ⛔⛔ **NEW 2026-09-04 — §2 said the two slug spaces intersect in "literally ZERO" members.
   They share 12**: `baby-care`, `bakeware`, `clothing`, `cookware`, `dental-care`, `first-aid`,
   `furniture`, `golf`, `jewellery`, `luggage`, `music`, `paint`. ⭐ The practical damage is
   small — 11 are `browsable: false` with 0 clusters, so only `furniture` (9) resolves on both
   routes — which is why nothing broke. **But the reasoning it licensed was the dangerous part.**
   "It will find nothing" invites treating a cross-tree slug as self-correcting; the truth is it
   *usually* finds nothing and *occasionally* finds a plausible wrong page, silently.

   ⇒ And the redesign spine, which is the intended replacement for the department layer, shares
   **95 slugs with `browse_nodes` and 112 with the 424-spine** — so for the tree this storefront
   is about to consume, the claim is not merely off, it is inverted. `CATEGORY_TREE_API.md` §2
   carries the full table; `CATEGORY_ROADMAP.md` Phase 6 carries the wiring plan.

   ⚠️⚠️ **HOW IT SURVIVED, WHICH IS THE REUSABLE LESSON.** Every reproduction agreed — because
   they all measured the same *narrower* population the sentence then over-generalised.
   Verified 2026-09-04:

   | population measured | ∩ `browse_nodes` |
   |---|---:|
   | the **15 slugs clusters actually carry** (`canonical_category_slug`) | **0** ✅ |
   | **all 424 spine nodes** — what "the slug spaces" means | **12** ❌ |

   Both numbers are correct. Only one of them is the claim as written. ⇒ **A reproduction
   confirms the measurement, never the sentence.** When a warning is stated over a population
   ("the slug spaces"), re-derive it over that whole population, not over the subset that
   prompted it.

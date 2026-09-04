# Category scope — what's next

Follows the wiring landed 2026-08-19 (`CATEGORY_TREE_API.md` tasks 1–3) and the audit in
`CATEGORY_DATA_ISSUES.md`. Ordered so that each phase is shippable on its own and nothing
downstream is blocked on a decision that has not been made yet.

⭐ **The organising judgement:** the tree's *structure* is sound and its *editorial* is not. So
the highest-value work is not more navigation surface — it is making 529 roots feel like ~15
departments. Every phase below is scored against that.

⭐⭐ **CONFIRMED FROM THE ENGINE SIDE 2026-08-19, AND PHASE 2.1 IS NOW THE TOP ITEM OVERALL.**
The engine reached the same conclusion independently, and can now size it: **Phase 2.1 adopts 417
shelves, not 3,124 orphans** — see Phase 4. It also unblocks work outside the storefront, so it
is the highest-value item in either repo.

---

## Phase 1 — Finish the surfaces already decided (small, no open questions)

| # | Change | Where | Why |
|---|---|---|---|
| 1.1 | ✅ **DONE** — paginate `/shelf` | `ShelfPage.tsx` | Was capped at 24 under a headline promising 6,220. "Show more" appends, de-duplicates by `cluster_id` (the `n_listings` sort has no tiebreak, so a row can arrive twice), and shows *Showing N of TOTAL*. |
| 1.2 | ✅ **DONE** — `coarse` / `unsorted` treatment | `ShelfPage.tsx` | Both flags now drive copy; `unsorted` reads "a single shelf" instead of implying a missing subcategory grid. |
| 1.3 | ✅ **DONE** — `multi_store_only` toggle | `ShelfPage.tsx` | Lives in the **URL** (`?multi_store=1`), not component state, so a comparable-only view is shareable and survives back. Measured: `food-cupboard` 6,220 → 1,372. |
| 1.4 | Sort control | `ShelfPage.tsx` | Products come back `n_listings` desc only. Needs API support for price/saving sorts — see 3.2. |
| 1.5 | ✅ **DONE 2026-09-04** — per-page `<title>`, description, canonical, OG | `components/common/PageMeta.tsx` + `ShelfPage`, `DepartmentPage`, `ClusterPricesPage` | ⛔ **`HelmetProvider` was mounted in `App.tsx` and NOT ONE PAGE USED IT**, so `index.html`'s title was the title of all ~4,100 shelves, all 21 departments and every comparison page. The breadcrumb half was already done. ⭐ **Titles are deliberately stable and the counts live in the description** — `browse_nodes` moved 4,185 → 4,137 between two gate runs, and a title that churns on a republish is worse than one that says less. |

## Phase 1b — Defects found in review 2026-08-21 (not yet scheduled)

| # | Change | Where | Why |
|---|---|---|---|
| 1b.1 | ✅ **DONE** — category tree in the mobile sheet | `MobileCategoryNav.tsx`, `useCategoryTree.ts`, `Header.tsx` | 🔴 Below 1024px there was **no category tree at all**. Fixed as an accordion; the fetch/cache/top-N moved to a hook the panel now shares. Issue 16. |
| 1b.1b | ✅ **DONE** — the 768–1023px dead zone | `Header.tsx` | 🔴 Hamburger was `md:hidden`, desktop nav is `lg:flex` — **neither rendered** between them. iPad portrait had no menu at all. Found by adding a tablet viewport to the gate. Issue 16b. |
| 1b.2 | ⚠️ **RE-MEASURED 2026-09-04, HALF FIXED, HALF IS YOUR CALL** | `lib/categories.ts:departmentShelves`, `MegaMenu`, `MobileCategoryNav` | See the measurement below — it is **worse** than "five departments", and the sharp end was not redundancy at all. |

### 1b.2 measured — all 21 departments, live, 2026-09-04

**46 adopted shelves across 21 departments. `foldChildren` removed exactly ONE of them**
(`Phones` under `Smartphones`), because `foldsIntoParent` deliberately returns false on an exact
match — in the canonical tree a child is never its parent. But a department **adopts** roots and
is usually *named after* the principal one, so exact restatement is the normal case there.

| finding | count |
|---|---|
| departments offering a shelf that restates their own name | **13 of 21** |
| departments whose second level is a single entry | **8 of 21** |
| adopted shelves that are indistinguishable from a sibling | **3** (all of `Laptops`) |

⛔⛔ **THE SHARP END WAS AMBIGUITY, NOT REDUNDANCY, AND ISSUE 17 DID NOT NAME IT.** The Laptops
department adopts three roots — `laptop`, `laptop-2eb1af`, `laptop-06ffb7` — and **all three are
labelled "Laptops"**. The panel rendered three identical tiles reading 655, 590 and 285 with
nothing to choose between them. That is the cross-parent duplicate the audit filed as issue 6;
adoption unified the **total** (1,530) and the menu was still listing the parts.

✅ **FIXED, IN THE MENUS ONLY:** `departmentShelves` drops such a group **whole**. Keeping the
biggest would link to 655 of 1,530 and lose 875 clusters behind a tile that looks complete.
Asserted in `verify_categories.py` — and the assertion is paired with a check that an empty
second level *says* "X is a single shelf", because `len([]) == len(set([]))` passes vacuously.

⛔ **AND `DepartmentPage` DELIBERATELY DOES NOT DE-DUPLICATE.** A menu tile is a *choice*; that
page's shelf list is *documentation* of what the department is made of, and the gate already
asserts the Laptops page "spans more than one shelf" so its 1,530 heading stays explicable.
Applying the fold there deleted the explanation to tidy a label — caught by that assertion going
RED. The page still shows three identically-labelled rows; disambiguating them (by store count,
or by the shop the shelf came from) is an open UI question.

⏩ **YOUR CALL, AND IT RESHAPES MAIN NAVIGATION.** Dropping shelves that merely restate their
department was implemented, measured and **backed out**: it empties the second level for 8 of 21
departments *including `Smartphones`*, trading one redundant-but-clickable tile for a blank
column. The better answer is probably to drill one level deeper — `smartphone` holds 3,325 in
subtree against 2,181 of its own, so real subdivisions exist below it — but that is a second
request per department and a navigation redesign, which this roadmap reserves for you.

⭐ Storefront defects **outside** the category scope — overstated shop counts, unreachable variant
shops, back-always-goes-to-Deals, the missing price-history chart — are scoped separately in
**`STOREFRONT_DEFECTS.md`**. The shop-count one is the most damaging thing currently live on the
site: on the smartphone shelf, 99 of 100 clusters overstate by a mean of +9.6 shops.

## Phase 1c — Re-parenting requests to the engine (2026-08-21)

⭐ **Decision: the taxonomy is fixed in the TREE, not in a storefront-side spine.** Re-parenting
lets descendant closure do the folding for free and fixes it for every consumer; a client-side
fold would re-create the count/page disagreement this project just spent a session removing.

| # | Request | Status |
|---|---|---|
| 1c.1 | `REPARENT_REQUEST_PHONES.md` | ✅✅ **ANSWERED AND APPLIED 2026-08-21.** R1, R2, R7 ruled in and **published**; R10 decided (`/shelf/phone-11b5d5` **404s**, no alias); R3/R4 deferred (19 clusters); R5 rejected as a re-parent (costs `smart-watch` 72 of 717 and drops it to panel rank #23). ⛔ Two of the four "confident" moves would have made the storefront **worse** as specified — a published slug is a merge SURVIVOR. Reply: `phones_scraper/implementation_plans/reparent_phone_domain_2026-08-21.md` |

⭐ **AND IT DID change Phase 2.1's shape — but not the way this line expected.** The engine
re-parented, and the spine is still needed: a re-parent fixes a *factually wrong edge*, while the
spine *adopts* well-attested shelves wherever they sit. ⛔⛔ Adoption is strictly cheaper —
promoting a shelf to a root **strands the clusters that reached it by refinement** (`smart-watch`
717 → 645) and makes it *less* visible (rank #23 of 530, outside the panel's top 12). **Use
re-parenting only where the tree is factually wrong; adopt for everything else.**

⚠️ *(original note retained)* This changes Phase 2.1's shape: if the engine re-parents, much of the "curated spine" becomes
unnecessary — the spine exists to paper over a tree that cannot be fixed, and this one can.

## Phase 2 — Make 529 roots behave like a storefront (the real work)

⛔ **Do not build more navigation before this.** Adding surfaces on top of an unmerged taxonomy
multiplies the confusion rather than distributing it.

| # | Change | Where | Why |
|---|---|---|---|
| 2.1 | ✅✅ **RULED AND SHIPPED 2026-08-21.** `app/api/departments.py` carries the 21 rows with their provenance; `GET /clusters/departments` and `GET /clusters/by-department/{id}` serve them; `MegaMenu`, `CategoryStrip` and `MobileCategoryNav` render all 21 and `/department/:id` is the landing page. ⭐ **The top-N cut is GONE** — there is no longer a cut to get wrong. ⛔⛔ **AND THE SPINE REACHES ONLY 45% OF PLACED CLUSTERS (46,127 / 102,038) BY DESIGN** — the other 55,911, chiefly `phone-tablet`'s 19,286, are reachable ONLY at `/shelf`, so every department surface keeps an "All categories" door and the gate asserts it. *(original ruling below)* ✅ **THE SPINE IS RULED — 21 departments** (`phones_scraper/implementation_plans/department_spine_worksheet_2026-08-21.md` §8). ⛔⛔ **AND ITS INPUT LIST CHANGED**: `stocked_roots`(417) can only see ROOTS, 306 of them single-store, while the best-attested shelves sit at depth ≥2 — `Tablets`(31 st), `Audio`(19 st/6,275c), `Home Appliances`(24 st). Use `department_candidates()`: **66 shelves, 67,205 clusters = 66% of everything placed**. ⚠️ The ≥10-store cut nests to 15 and its composition is WRONG — four computing departments, `Laptops` twice, **no grocery department at all**. Implementation is API config + `browseApi`; the engine is asked for nothing. | new: API config + `browseApi` | *(original rationale below)* |
| 2.1b | **A curated department spine** — a hand-written list of ~15 canonical departments, each mapping to one or more `browse_nodes` roots. ⭐ **Naming rules, the PriceRunner benchmark and a concrete proposal for the phone/computing domain are now specified in `CATEGORY_NAMING_SPEC.md`.** | new: API config + `browseApi` | The decisive fix. 75% of browsable roots are one shop's private vocabulary (398 of 529); `Laptops` resolves in three places. A shopper should see *Electronics*, not *Electronics & Computers* **and** *Telephony, Computing & Networking* **and** *Electronics & Appliances*. Curation is ~15 rows of judgement and beats any automated fold. |

⭐⭐ **THE INPUT LIST NOW EXISTS, AND THE JOB IS SMALLER THAN "3,124 ORPHANS" IMPLIES.** Of the
3,124 parentless nodes **2,692 hold nothing at all**; **432 hold 42,293 clusters — 41% of
everything placed — and 417 of those are browsable** (135 with ≥10 clusters, 111 reaching ≥2
stores). Those 417 are not orphans awaiting a parent; they **are** the storefront's top level —
`Phones and tablets` (19,310 clusters), `Food Cupboard` (2,010), `Kitchen & Dining` (1,857),
`Beauty & Personal Care` (1,763). The engine's `publish_browse_tree.stocked_roots` prints them
ranked by clusters on every rebuild; curate the spine against that list.
| 2.2 | Suppress promo + brand shelves from navigation | API projection or curated list | `August Sale`, `Macbooks`, `iPads`, `NOTHING PHONES` are merchandising and brands, not categories (issues 10–11). Keep them addressable; stop offering them as departments. |
| 2.3 | Brand as a **filter**, not a shelf | `ShelfPage.tsx` + API facet | The natural home for the brand nodes 2.2 removes. Needs a brand facet on `/by-node`. |
| 2.4 | "Sibling near-duplicate" fold at render time | `lib/categories.ts` | Under `Smartphones`: `Phones`(495), `Smart Phones`(33), `Smart Phones - Refurb`(10). A display-time merge is reversible and needs no republish, unlike an engine change. ⚠️ A stopgap — 6.x is the real fix. |

## Phase 3 — Backend

| # | Change | Where | Why |
|---|---|---|---|
| 3.1 | Indexes on `browse_nodes`: `{parent_slug:1, browsable:1}`, `{ancestors:1}` | migration | Every tree call is a COLLSCAN today and the docstring claims otherwise (issue 13). 30 ms now; the point is the false guarantee, not the current latency. |
| 3.2 | `sort` param on `/by-node` (price asc/desc, saving, recency) | `clusters.py` | Blocks 1.4. `n_listings` desc is a proxy for popularity and nothing else. |
| 3.3 | Brand facet on `/by-node` | `clusters.py` | Blocks 2.3. |
| 3.4 | ✅ **DONE 2026-08-21 — closed by DELETION, not by an admin route.** The API now reads the engine's published `n_clusters_subtree` off each node doc, so `_subtree_totals()` is a fallback that never runs on a current tree. That removes a 4,137-document scan from every tree call and retires the foot-gun rather than adding a route to poke it. ⛔ The fallback STAYS: a dev DB restored from a pre-3.5 dump has no field, and the honest degradation there is the computed closure, not `n_clusters`. | `clusters.py` | — |
| 3.5 | ✅✅ **DONE BOTH SIDES 2026-08-21.** Engine writes `n_clusters_subtree` on every node (0 disagreements over 4,137); **the API now READS it** rather than rolling up. | `phones_scraper` + `clusters.py` | The engine is where the number belongs, and the API stopped computing what it is handed. |

## Phase 4 — Engine (`phones_scraper`, branch `matching`)

Filed from the audit; all are upstream data work, none blocks the storefront:

- **6** — merge cross-parent identical labels (`Laptops` ×3, `Phones` ×3; 20 groups). Subsumed by
  Phase 2.1 — no rule settles these, which is why the engine reports rather than folds them.
- **8 / 9** — ⛔ **deferred, and the stated rationale was withdrawn.** The slugs *are* stable
  (`canonical_slug_pins`), so these mean **unpinning and accepting URL churn on 367 live URLs**.
  That is the cost, not the slugifier. See `CATEGORY_DATA_ISSUES.md` §8.
- **10 / 11** — ✅ **DONE 2026-08-19.** 15 root-level brand/spec facets demoted and 10 promo
  shelves collapsed; `browsable` 981 → **956**. ⛔ Issue 10 was **not** applied literally —
  `Macbooks` (11 stores, 143 clusters) keeps its shelf, because the defect was position, not label.
- **12** — ⚠️ re-ruled: not an engine task. ⭐ The `Wines`/`Sparkling & Champagne` case it names is still open and now sits in a 16-edge human list (was 17 — the top entry was a false positive and is fixed).
- **NEW 2026-08-21** — `/shelf/ultra-book` is a browsable root serving **`Exercise Books`**, 5 stores, on a **pinned** slug. `unpin_stale_slugs` structurally cannot see it (it looks for BRAND slugs). Open engine ruling; it means URL churn.
- **12 (original)** — ⚠️ **re-ruled: not an engine task.** `Memory Cards` is 18 stores but **1 cluster**. A
  sharper case of the same kind *was* found: `Wines` (6 stores, 295 clusters) sitting under
  `Sparkling & Champagne` (1 store, 21), now surfaced by a new report awaiting a human ruling.
- **13** — ✅ **DONE.** Both indexes are created by the publisher, not a migration.
- **Orphan attachment** — 3,124 of 4,137 nodes are parentless, but **only 417 stocked browsable
  roots actually matter** (see Phase 2.1). That is the real denominator.

## Phase 6 — The REDESIGN spine (measured 2026-09-03, not yet started)

⭐⭐ **THE CASE, IN THE STOREFRONT'S OWN UNIT.** `phones_scraper/category_taxonomy/redesign/` holds
a fifth node set — **1,392 designed nodes, 19 departments** — with *zero* consumers. Its own
handoff quotes coverage in product ROWS; re-measured in CLUSTER PLACEMENTS, which is what these
pages render:

| what reaches a department-or-better node | cluster placements | share of 102,038 |
|---|---:|---:|
| **`app/api/departments.py` today** (sum of `n_clusters_subtree` over the 46 adopted slugs) | 46,914 | **46.0%** |
| **the redesign spine** (dept + family + leaf) | 81,525 | **79.9%** |
| the redesign spine including splits | 99,343 | 97.4% |

⇒ **Wiring it roughly doubles browsable reach**, and it answers Phase 2.1's open "55% residue"
question directly rather than with a 22nd catch-all department.

⛔⛔ **IT MUST REPLACE `departments.py`, NOT SIT BESIDE IT.** The storefront already carries four
slug spaces (retired 424-spine → `/browse`; `browse_nodes` → `/shelf`; 21 curated department ids →
`/department`; plus `canonical_slug_pins`). Adding a fifth naively means a shopper sees 21
departments in one nav and 19 in another.

⛔⛔⛔ **AND THE DISJOINTNESS THAT MAKES THAT SAFE ELSEWHERE DOES NOT HOLD HERE. MEASURED
2026-09-03:**

| pair | shared slugs |
|---|---:|
| retired 424-spine ∩ `browse_nodes` | **12** (the documented near-disjointness) |
| **redesign spine ∩ retired 424-spine** | **112** |
| **redesign spine ∩ `browse_nodes`** | **95** |

The trees disagree about what the shared slugs mean — `bathtubs` is level 3 in the 424-spine and
level 2 in the redesign spine; `baby-care` is level 1 in both with different parents. **So the
familiar warning is inverted here.** The engine handoff says a slug-to-slug join "will silently
produce almost nothing"; on this pair 95–112 slugs WILL match and produce a *plausible wrong*
page. A wrong link that 404s is a bug you find; this one you ship.

⇒ **Two rules for whoever starts this.** (1) The redesign spine gets its OWN route prefix and its
slugs are never passed to `shelfHref` or `departmentHref` — a third link builder, per the
discipline in `lib/categories.ts`. (2) The join to it is the RAW LABEL
(`browse_nodes.label` ↔ `label_disposition.raw_label`, verified total: 4,066 of 4,066 labels, 0
product rows unaccounted), never the slug.

⭐ **AND ASK THE ENGINE TO PUBLISH THE BRIDGE RATHER THAN JOINING IT HERE.**
`publish_browse_tree.py` already stamps `n_clusters_subtree` on every node and this API reads it
— that was ruled deliberately in 3.4/3.5 (*"the engine is where the number belongs"*). The same
shape works: stamp `spine_slug` / `spine_department` / `spine_level` / `spine_disposition` onto
each `browse_nodes` doc at publish time. Then the API needs no TSV, no second data source and no
join, the existing indexes keep working, and the slug-collision trap above becomes structurally
unhittable because the client never handles a bare spine slug.

⚠️ **THREE DEPARTMENTS WILL RENDER NEARLY EMPTY** and need an editorial rule before launch:
`gaming-books-media` (13 clusters), `agriculture-agrovet` (20), `sports-outdoors-leisure` (59).
That is matcher coverage — the classifieds exclusion — not a taxonomy defect, so it will not fix
itself upstream in time.

⚠️ **AND 48.3% OF PLACEMENTS LAND ON A DEPARTMENT NODE**, concentrated: **15 labels are 90% of
that mass** and `Phones and tablets` alone is 19,286 (39%). The spine improves *which* department
a cluster reaches, far more than it improves leaf precision (18.0%). Plan the department pages
for depth-1 browsing; do not promise a deep grid the data cannot fill.

---

## Phase 5 — Routes still on the retired spine (needs your call)

`CATEGORY_TREE_API.md` tasks 4 and 5, unchanged and deliberately still open:

- **`/browse`** (`CategoriesPage`) and **`/browse/:productType`** (`BrowsePage`) read the
  424-node spine. ⛔ The spine must stay — `cluster.category_path` is stamped in it and it has a
  live consumer. The question is only whether `/browse` keeps a *nav* entry now that the panel
  and `/shelf` own category navigation. It currently survives via footer links, which is a
  reasonable holding position.
- **`/search`** and **`/category/:id`** also route through `BrowsePage` on spine slugs.
  `/clusters/search` is independent of both trees and is the cleaner target.

---

## Recommended order

✅ **1.1, 1.2, 1.3, 1b.1 and 1b.1b are done** (2026-08-21) and gated by
`scripts/verify_categories.py` — **42 assertions** against the live API in a real browser at
**390px, 900px and 1440px**. ⚠️ The multi-viewport sweep is not optional decoration: every
assertion used to run at 1440px only, and two separate navigation defects were living in the
band nobody rendered. **1.4 and 1.5 remain**, and 1.4 is blocked
on 3.2.

⭐⭐ **2.1 IS SHIPPED (2026-08-21)** — the spine, its two endpoints, the four surfaces and the
`/department/:id` page. 3.4 and 3.5 closed with it. **Next is 1.4 / 1.5** (sort control, blocked
on 3.2; per-shelf `<title>`), then **1b.2 panel depth**, which the roadmap already said to
sequence *after* 2.1 — and 2.1 has changed its shape: the panel's second level is now a
department's adopted shelves, so the "five departments restate the first level" redundancy needs
re-measuring before it is worth fixing. 3.1 is ✅ done engine-side. Phase 4 is another repo's
backlog.

⚠️ **The open question 2.1 did NOT answer: the 55% residue.** 55,911 placed clusters sit outside
every department and are reachable only by the `/shelf` directory — 19,286 of them
undifferentiated on the coarse `phone-tablet` root. That is upstream shallow-breadcrumb data, not
curation, so the storefront's options are a better directory or a 22nd catch-all department, and
neither has been ruled.

⚠️ **On the nav-shape question:** the panel-plus-page split you chose does not need revisiting
when categories grow — that is exactly the case it was built for. The panel takes the top 12 of
529 and hands the rest to `/shelf`. What will need revisiting is 2.1: the panel is only as good
as the twelve things it shows, and today those twelve are shop vocabulary, not departments.

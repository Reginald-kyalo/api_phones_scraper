# Wiring the canonical category tree into the frontend

Reference for the two endpoints that serve **`taxonomy_db.browse_nodes`** — the category tree
built bottom-up from what Kenyan shops actually stock — and what still needs doing on the UI side.

⛔⛔ **THE TREE WAS REPUBLISHED 2026-08-21 AND THIS DOC IS UPDATED FOR IT.** The engine applied
your `REPARENT_REQUEST_PHONES.md` R1, R2 and R7 — see
`phones_scraper/implementation_plans/reparent_phone_domain_2026-08-21.md` for the measured reply,
including **why two of your four "confident" moves would have made the storefront worse as
literally specified**. Four lines below changed; each is marked ⟳. Node totals did not
(**4,137 / 956 browsable / 102,038 placements**), and `npm run verify:categories` is green
against the new tree.

Measured live 2026-08-21. Engine repo: `phones_scraper` (branch `matching`).
API + UI repo: `api_phones_scraper` (branch `clusters-api`).

---

## 0. Revision 2026-09-04 — what changed, and one claim below was WRONG

Everything in this section was measured against the live tree and API on 2026-09-04. Changed
lines are marked ✎.

⛔⛔⛔ **§2's HEADLINE — "the intersection is literally ZERO" — IS FALSE, AND IT IS THE MOST
LOAD-BEARING SENTENCE IN THIS FILE.** The retired 424-node spine and `browse_nodes` share **12
slugs**, not none. §2 is corrected in place. Nothing shipped on the strength of the wrong number,
because the *practical* risk turned out to be small (11 of the 12 are unbrowsable) — but a third
tree is coming and for it the same claim is off by ninety-five.

✅ ✎ **FIXED — THE LIVE CONTRACT VIOLATION FOUND WHILE CHECKING §3.** `/by-node` and
`/browse-tree` returned DIFFERENT `ancestor_labels` for the same node; they now agree. **And the
report above was short by one endpoint: `/by-department`'s `shelves` had it too**, so a
department's subcategory grid carried raw shop slugs on the same field. Verified live across 55
nodes and all 21 departments' 46 adopted shelves — **0 disagreements, 0 crumbs equal to their own
slug**. See §3.

✨ ✎ **AND A SECOND DEFECT AT THE SAME CALL SITE.** `/by-department` also sorted its shelves
with `_subtree_of(d, None)` — no rollup fallback — so on a database predating roadmap 3.5 the
subcategory grid ranked by OWN stock, which is exactly the swap that cut `Electronics &
Computers` out of the top 12 (§6 task 2). Invisible on a current tree, wrong on a restored dump.

✅ **STALE WARNINGS REMOVED.** §7's "⛔ `npm run verify:categories` IS STILL BROKEN — the
`with_server.py` it invokes does not exist at that path" is no longer true: the file is there and
`npm run verify:prices` was run end to end (starts its own dev server, passes, stops it).

✎ **Re-verified unchanged:** 4,137 nodes, 956 browsable, 217 coarse, 609 unsorted, 102,038
placements. §4's counts are still exactly right, six weeks and several republishes later — which
is the flags' whole design working.

✎ **New this pass:** a second render gate (`scripts/verify_prices.py`), per-page `<title>` /
canonical (`components/common/PageMeta.tsx`), a back-navigation contract
(`lib/navigation.ts`), and `departmentShelves` in `lib/categories.ts`. See §5 and §7.

---

## 1. Is the data wired? Partly.

| surface | route | tree it reads | state |
|---|---|---|---|
| `ShelfPage.tsx` | `/shelf`, `/shelf/:slug` | **canonical** (`browseApi`) | ✅ wired, verified against live data |
| **`DepartmentPage.tsx`** | **`/department/:id`** | **the ruled SPINE** (`departmentApi`) | ✅ **NEW — 21 departments** |
| `MegaMenu.tsx` | header panel, every page | **the ruled SPINE** | ✅ ⟳ repointed from roots to departments |
| `CategoryStrip.tsx` | home page | **the ruled SPINE** | ✅ ✎ **GROUPED — 12 tiles, all 21 reachable** + an `/shelf` door |
| `MobileCategoryNav.tsx` | sheet, <1024px | **the ruled SPINE** | ✅ ⟳ repointed |
| `CategoriesPage.tsx` | `/browse` | retired spine (`pricerunnerApi`) | ⛔ deliberately left on the spine |
| `BrowsePage.tsx` | `/browse/:productType`, `/search`, `/category/:id` | retired spine | ⛔ deliberately left on the spine |

⛔⛔ **CORRECTED 2026-08-19 — `MegaMenu` WAS MOUNTED NOWHERE.** This table used to claim it was
live on "every page" and task 2 below called it "the highest-leverage surface — it is on every
page". Nothing imported it: it was dead code reading the retired spine, while the header's "All
categories" button quietly `navigate()`d to `/browse`. So the canonical tree had no entry point
anywhere in the product, and `/shelf` was reachable only by typing the URL. Both are now fixed —
the header button opens the panel, and the panel reads `browseApi`.

⭐ **The panel is the ENTRY; `/shelf` is the DESTINATION.** 529 browsable roots do not fit in a
flyout and never will, so the panel shows the top departments and hands off. Growing the taxonomy
widens the page, not the panel.

⭐⭐ **AND THE TOP-N CUT IS NOW GONE ENTIRELY (2026-08-21).** The panel used to take the top 12 of
529 roots; it renders the **21 ruled departments** instead, so there is no cut left to get wrong.
See §3b.

---

## 2. Two trees exist, and you must not confuse them

| | retired spine | canonical tree |
|---|---|---|
| collection | `taxonomy_db.canonical_categories` | `taxonomy_db.browse_nodes` |
| size | 424 nodes | **4,137 nodes** |
| origin | imported PriceRunner taxonomy | built from 46 Kenyan shops' own breadcrumbs |
| client | `pricerunnerApi` | `browseApi` |
| covers groceries? | 3 nodes total | yes — `food-cupboard` alone holds 2,010 clusters |

⛔⛔ ✎ **CORRECTED 2026-09-04 — THE SLUG SPACES ARE NEARLY DISJOINT, NOT DISJOINT. THIS LINE
SAID "the intersection is literally ZERO" AND THE INTERSECTION IS 12.** Measured against the live
collections:

| pair | shared slugs |
|---|---:|
| retired 424-spine ∩ `browse_nodes` | **12** |
| redesign spine ∩ `browse_nodes` | **95** |
| redesign spine ∩ retired 424-spine | **112** |

The 12 are `baby-care`, `bakeware`, `clothing`, `cookware`, `dental-care`, `first-aid`,
`furniture`, `golf`, `jewellery`, `luggage`, `music`, `paint` — ordinary category words, which is
exactly why they collided. ⭐ **The practical risk today is small and worth stating precisely:
11 of the 12 are `browsable: false` with 0 clusters, so only `furniture` (9 clusters) resolves to
a real page on both routes.** That is why nothing has broken on the strength of the wrong claim.

⇒ **The operational rule is unchanged and still absolute: never pass a slug from one API to the
other.** What changes is *why*. The old reason ("it will find nothing") was comforting and wrong;
the real reason is that a wrong slug **usually** finds nothing and **occasionally** finds a
plausible wrong page, and the second failure is silent. `mobile-phones` is a spine slug and
`smartphone` a canonical one — neither lookup finds the other — but do not rely on the miss.

⛔⛔⛔ **AND FOR THE THIRD TREE THE CLAIM INVERTS COMPLETELY.** `phones_scraper` holds a redesign
spine — 1,392 designed nodes, 19 departments, **currently zero consumers** — which is the
intended long-term replacement for the department layer (it reaches **79.9% of cluster placements
against `departments.py`'s 46.0%**; see `CATEGORY_ROADMAP.md` Phase 6). It shares **95 slugs with
`browse_nodes` and 112 with the 424-spine**, and the trees disagree about what they mean —
`bathtubs` is level 3 in one and level 2 in another. **When that tree is wired, a slug-to-slug
join will not fail loudly; it will produce plausible wrong pages by the dozen.** Give it its own
route prefix and its own link builder, and join it on the RAW LABEL
(`browse_nodes.label` ↔ `label_disposition.raw_label`, verified total: 4,066 of 4,066).

⭐ **AND NOW THAT IT IS WIRED (task 9), THE 95-SLUG FIGURE ABOVE OVERSTATES THE HAZARD FOR WHAT
ACTUALLY SHIPPED.** The 95/112 collisions live almost entirely at spine levels 1–2, which have no
route. Measured across the id space that actually got a page — the 19 spine DEPARTMENTS:

| pair | shared |
|---|---:|
| spine DEPARTMENTS (19) ∩ `browse_nodes` | **0** |
| spine DEPARTMENTS (19) ∩ retired 424-spine | **0** |
| spine DEPARTMENTS (19) ∩ curated ids (21) | **1** — `home-appliances` |
| spine ALL nodes (1,392) ∩ `browse_nodes` | 95 — **43 of them browsable** |

⇒ Wiring departments first was not merely incremental — it was the low-collision subset. The 43
browsable collisions that would resolve to a plausible wrong page live one level down, and this
change gives that level no URLs (§7 of the spec keeps it out of scope on purpose). The one
exception, `home-appliances`, names both a spine department and a curated department; during the
parallel period those are different pages, exactly as `/department/pantry` and `/shelf/pantry`
are — same test.

⛔ **Keep both alive. Do not repoint the spine pages at the canonical tree.** That exact change
was attempted on the API side and measured to delete the storefront's hierarchy — the spine is
what `cluster.category_path` is stamped in, and it is live production data with a consumer.
Migrate by **adding** canonical surfaces, not by swapping the old ones out.

---

## 3. Endpoints

Base path `/api`. Vite already proxies `/api` → `localhost:10000`.
The typed client is **already written** — `src/app/lib/api.ts`, exported as `browseApi`.

### `GET /api/clusters/browse-tree`

One level of the tree: a node's children, or the roots.

| param | type | default | meaning |
|---|---|---|---|
| `parent` | string | *(omitted)* | node whose children to list. Omit for the roots. |
| `browsable_only` | bool | `true` | withhold shelves with no stock anywhere below them |

```jsonc
// GET /api/clusters/browse-tree?parent=smartphone
{
  "parent": {
    "slug": "smartphone",
    "label": "Smartphones",
    "parent_slug": "phone-tablet",
    "ancestors": ["phone-tablet"],
    "ancestor_labels": ["Phones and tablets"],
    "n_clusters": 2181,          // ⟳ was 2313 — R1 moved 132 onto `phone`
    "n_stores": 30,
    "coarse": false,
    "browsable": true,
    "unsorted": false
  },
  "count": 8,                     // ⟳ was 7 — `phone` is now a child
  "results": [ /* BrowseNode[], same shape, ordered by n_clusters desc */ ]
}
```

- ⟳ **NEW — every node doc now carries `n_clusters_subtree`**, written by the engine
  (`publish_browse_tree`, roadmap item 3.5). It is the descendant closure the API currently rolls
  up for itself, cross-checked engine-side against an independently derived count on all 4,137
  nodes with **0 disagreements**. ⭐ The API can read the field instead of computing it, which
  also retires the `reset_subtree_cache()` foot-gun for that number.
- `parent` is `null` when listing roots.
- `results` are **ordered by stock, not alphabetically** — a shopper wants the shelf that has
  something on it. Do not re-sort by label.
- `ancestor_labels` is **index-for-index with `ancestors`**, so a breadcrumb needs no extra call.
  A missing label falls back to its own slug rather than being dropped, because dropping one
  shifts every later crumb by one.

  ✅ ✎ **AND NOW ON EVERY ENDPOINT — FIXED 2026-09-04. IT WAS BROKEN ON TWO, NOT ONE.** The
  same node, the same field, used to give two answers:

  ```
  GET /clusters/browse-tree?parent=smartphone   ancestor_labels: ["Phones and tablets"]   ✅
  GET /clusters/by-node/smartphone              ancestor_labels: ["phone-tablet"]         ❌ → ✅
  GET /clusters/by-node/laptop                  ancestor_labels: ["laptop-tablet"]        ❌ → ✅
  GET /clusters/by-department/tablets .shelves  ancestor_labels: ["computer"]             ❌ → ✅
  ```

  ⛔ **THE FOURTH LINE WAS NOT IN THE ORIGINAL REPORT.** `/by-department` builds its adopted
  shelves through the same constructor and omitted the map in the same way, so a department's
  subcategory grid — a shopper-facing surface — carried raw slugs. Reporting one caller of a
  shared helper and not auditing the rest is how a two-site defect gets recorded as a one-site
  defect. **Grep the callers, not the symptom.**

  Because the fallback is `or slug`, the failure was **silent and plausible** — the field was
  populated, index-for-index, and full of raw shop slugs.

  ⭐ **THE PART WORTH KEEPING IS WHY THE EXISTING GUARD DID NOT CATCH IT.** `_browse_node_view`
  carried the comment *"⛔ ONE construction site for both routes"* — added precisely so the two
  could not diverge. They diverged anyway, because the labels arrived as an **argument
  defaulting to `None`**: `/browse-tree` passed the map, the other two passed nothing. **Sharing
  a constructor moves the divergence into its parameter list rather than removing it.** (Compare
  commit `544e069f`, which fixed this same class for `/browse-tree`'s children and did not reach
  here — the third time this field has been wrong in three different places.)

  ⇒ **THE FIX IS STRUCTURAL, NOT A THIRD `labels=` ARGUMENT.** A new `_browse_node_views(docs)`
  **resolves** the map instead of **accepting** it, and is the only way a route builds a node
  view; `_browse_node_view`'s parameters lost their defaults, so omitting one is a `TypeError`
  rather than a breadcrumb. Two executable guards replace the comment: one asserts the parameter
  has no default, the other walks the AST asserting no route calls the singular constructor at
  all. ⭐ It also collapsed `/browse-tree`'s per-ancestor `find_one` loop into a single `$in`,
  which usually queries nothing because a child's ancestors resolve off a parent already in hand.

  ⭐ **BREADCRUMBS FROM `/by-node` ARE NOW SAFE.** The earlier "do not build one until this is
  fixed" no longer applies. It was never user-visible, by luck rather than design — `ShelfPage`
  reads its breadcrumb off `browseApi.getTree()` and takes only products from `/by-node`.
- An unknown `parent` is **404, never an empty list**. An empty list means "this shelf has no
  children"; a 404 means "there is no such shelf". Render them differently.

### `GET /api/clusters/by-node/{node_slug}`

The products on one shelf **and everything below it** — descendant closure is server-side.

| param | type | default | meaning |
|---|---|---|---|
| `include_descendants` | bool | `true` | include every shelf below this one |
| `multi_store_only` | bool | `false` | only products compared across ≥2 stores |
| `limit` | int | `20` | 1–100 |
| `offset` | int | `0` | pagination |

```jsonc
{
  "node":    { /* BrowseNode, same shape as above */ },
  "count":   24,      // rows on THIS page
  "total":   2929,    // rows matching overall — render this, not `count`
  "results": [ /* ClusterSummary[] — identical shape to /clusters/deals */ ]
}
```

⭐ Descendant closure is why a department is never an empty page: `food-cupboard` holds 2,010
clusters of its own and **6,220** with its subtree. Use `total` for the heading.

⭐ `results` are the same `ClusterSummary` objects `/clusters/deals` returns, so
**`<ClusterDealCard cluster={c} />` works unchanged.**

---

## 3b. The DEPARTMENT SPINE — `/departments` and `/by-department/{id}`

⭐ **WHAT IT IS.** 21 curated departments over the same tree, ruled by a person on 2026-08-21
(`phones_scraper/implementation_plans/department_spine_worksheet_2026-08-21.md` §8) and served
from API config in **`app/api/departments.py`**. The engine is asked for nothing.

⛔⛔ **ADOPTION, NOT RE-PARENTING.** A department *adopts* a shelf **where it already sits** and
takes its whole subtree. Re-parenting was simulated engine-side and **strands** clusters that
only reached a node by refinement — promoting `smart-watch` to a root cost it 72 of 717 and
dropped it to root rank #23 of 530, *less* visible than before.

```jsonc
// GET /api/clusters/departments
{ "count": 21, "n_clusters_total": 46127,
  "results": [
    { "id": "laptops", "label": "Laptops",
      "parent": "Computing",     // ⭐ ✎ NEW — the NAV TILE this sits under, or null to stand alone
      "adopts": ["laptop", "laptop-2eb1af", "laptop-06ffb7"],
      "n_clusters": 1530,        // == `total` from /by-department/laptops, by construction
      "n_stores": 24,            // ⚠️ the WIDEST adopted shelf — a LOWER BOUND, not a union
      "unresolved": [],          // ⛔ non-empty = a human ruling is being silently skipped
      "overlaps": [],            // ruled and deliberate: `tablets` overlaps `computers`
      "notes": [] } ] }

// GET /api/clusters/by-department/laptops?multi_store_only=&limit=&offset=
{ "department": { /* DepartmentView */ },
  "shelves":    [ /* BrowseNode[] — the adopted shelves, stock-ordered */ ],
  "count": 20, "total": 1530, "results": [ /* ClusterSummary[] */ ] }
```

⛔⛔ **THE SPINE REACHES 45% OF THE CATALOGUE, AND THAT IS BY DESIGN.** Measured 2026-08-21:
**46,127 of 102,038** placed clusters. ✎ Re-measured 2026-09-04 by summing `n_clusters_subtree`
over the 46 adopted slugs: **46,914 = 46.0%** — the same answer, drifting with republishes as it
should. The other **~55,000** are *not lost* — they are reachable at `/shelf`, which keeps the
full 529-root directory — but no department adopts them. The largest single residue is
`phone-tablet`'s own **19,286** undifferentiated clusters, which is the known upstream
shallow-breadcrumb defect, not something curation can fix.

⏩ ✎ **AND THIS IS THE NUMBER THE REDESIGN SPINE EXISTS TO MOVE.** Measured on the same
denominator 2026-09-04, that tree reaches **81,525 of 102,038 = 79.9%** at department-or-better
(97.4% counting split labels). It should **replace** `departments.py`, not sit beside it — 21
departments in one nav and 19 in another is the failure mode. `CATEGORY_ROADMAP.md` Phase 6 holds
the full measurement, the slug-collision hazard from §2, and the recommendation that the ENGINE
publish the bridge onto `browse_nodes` (as it already does `n_clusters_subtree`) so this API never
handles a bare spine slug.

⭐ ✎ **`parent` — GROUPING, ADDED 2026-09-05. 21 TILES BECOME 12 AND NONE ARE LOST.** `Laptops`
and `Computers` sat side by side as peers, as did five separate grocery departments. Each
department now carries a `parent` naming the navigation tile it sits under, or `null` to stand
alone. Live: **4 groups + 8 standalone = 12 tiles**.

| tile | departments |
|---|---|
| Phones & Wearables | Smartphones, Tablets, Phone accessories, Wearables |
| Computing | Laptops, Computers |
| Sound & Vision | Audio, Televisions |
| Groceries & Essentials | Drinks, Fresh, Bakery, Pantry, Cleaning |
| *(8 plain links)* | Cameras, Home appliances, Personal care, Kitchen, Stationery, Lighting, Pets, Hardware |

⛔⛔ **GROUPING IS NOT A CUT, AND THAT DISTINCTION IS THE WHOLE POINT.** The old top-12 reached
twelve departments and lost nine. This reaches **all 21** — thirteen of them one click deeper,
inside a popover. `verify_categories.py` opens every group and asserts the union of plain and
popover links equals the set `/departments` published; sabotaging the fold reports **12/21** and
names the missing nine.

⛔ **PRESENTATION ONLY — IT GROUPS TILES, IT DOES NOT NEST DEPARTMENTS.** There is no
`/department/Computing`. Every id keeps its own page and its own totals, and deleting the field
returns the flat 21.

⛔ **THE GROUPS ARE NOT INVENTED.** Each multi-member group is one the DESIGNED spine already
rules (measured 2026-09-05 via `browse_nodes.spine_department`). Grouping `Home appliances` +
`Kitchen` + `Lighting` under a "Home & Living" tile would read just as plausibly and would be a
NEW ruling dressed as a measured one — the designed spine files those three separately, so they
stand alone. `tests/test_department_spine.py` pins exact membership.

⚠️ **TWO MEMBERSHIPS ARE NOT BACKED BY THE DESIGNED SPINE.** `wearables` reaches no designed
department at all (its only shelf `smart-watch` has disposition `split`, one of the 17.5%), and
`tablets` is a genuine disagreement — the retired spine **and** `browse_nodes` both file it under
computing, the designed spine under phones. Ruled toward the designed spine; one line reverses it.

⚠️ **ONLY THE STRIP GROUPS.** The panel and the mobile sheet still render all 21 flat, and that
is deliberate: grouping answers a horizontal-scroll problem, and a vertical column of 21 does not
have it. The demo storefront's own strip made the same call for the same reason.

⇒ ⭐ **EVERY SURFACE RENDERING DEPARTMENTS MUST KEEP AN "ALL CATEGORIES" → `/shelf` DOOR.**
Remove it and half the catalogue becomes unbrowsable while every other assertion still passes.
The render gate asserts the door on the strip, the panel and the mobile sheet.

⛔⛔ **A DEPARTMENT `id` IS A THIRD SLUG SPACE AND IT OVERLAPS `/shelf`'s.** Six ids also name a
node — `audio`, `bakery`, `cleaning`, `fresh`, `hardware`, `pantry` — and the pages differ:

| | department | shelf |
|---|---:|---:|
| `/…/pantry` | **485** (`snack` + `breakfast-cereal`) | **889** (a node no department adopts) |
| `/…/bakery` | 425 (`bakery` + `cake`) | 343 |
| `/…/audio` | 18,359 | 6,275 |

Neither redirects to the other. `lib/categories.ts` exports **`departmentHref`** beside
`shelfHref` for exactly the reason `shelfHref` exists: passing an id to the wrong builder
resolves to a *plausible wrong page* instead of erroring, which is worse than a 404.

⚠️ **Departments deliberately overlap each other.** `tablet` is a descendant of `computer`, so
all **720** of Tablets is also inside Computers, and `phone-1a5a7a` (67) is in Smartphones,
Tablets *and* Computers. Ruled: both stand. The rows therefore sum to 46,914 while
`n_clusters_total` is 46,127 — **do not add the rows up.**

⚠️ **Two defects are adopted knowingly and reported in `notes`**: Drinks contains `Chocolates`
(93 clusters, a child of `Beverages`), and Stationery contains `ultra-book` — a *pinned* slug
labelled *Exercise Books*. Both are cheaper than the stranding a re-parent causes. Name them;
do not patch them in the client.

---

## 4. The three flags, and what the renderer should do with each

The publisher writes these as **flags, never filters** — it deliberately leaves the decision to
the UI. Live counts of 4,137 nodes (rebuilt 2026-08-19):

✎ **All three counts re-verified against the live collection 2026-09-04 and UNCHANGED** —
4,137 nodes, 956 / 217 / 609. Six weeks and several republishes later they have not moved, which
is the flags working as designed rather than a stale doc.

| flag | count | meaning | render as |
|---|---:|---|---|
| `browsable` | **956** | this node or something below it holds stock, **and** it is not a brand line or hardware spec offered as a top-level department | the other 3,181 render an empty page — the endpoint already withholds them by default |
| `coarse` | **217** | a grouping header a bigger child sits under | a section title, not a landing shelf — send people to its children |
| `unsorted` | **609** ⟳ | holds stock and has no children to sort it into | a leaf: show products, no subcategory grid |

⛔⛔ **THE SECOND CLAUSE ON `browsable` IS NEW (2026-08-19) AND IT IS NOT "HAS STOCK".** `Core i5`
(83 clusters) and `Core i7` (74) were browsable **roots** — a CPU stepping listed beside
`Electronics` and `Groceries`. 15 such nodes are now demoted. ⭐ **Demotion is positional, not a
ban on the label**: `Macbooks` (11 stores, 143 clusters) keeps its shelf because it is parented
under `laptops`, and hiding it was the single most expensive thing the audit's issue 10 would
have done if applied literally. The node, its rows and its placements are all untouched — only
the flag moves, so a demoted node still resolves a breadcrumb for anything placed on it.

`coarse` is worth understanding rather than ignoring. `Computers & Tablets` spans 1 store while
its child `Tablets` spans 31 — the edge is *correct*, because only a few shops spell the
department that way. The rule the whole taxonomy turns on: **more words = narrower, EXCEPT
across `&`, where more words = broader.**

⚠️ **40% of all placements sit on a `coarse` node** (`phone-tablet` alone holds 19,310 of
102,038). That is a known upstream data problem — the shops' own breadcrumbs are that shallow —
not something the UI can fix. Design for it: a coarse node must still show stock, which is
exactly what descendant closure gives you.

---

## 5. What's already in the repo

```
src/app/lib/api.ts                 browseApi.getTree(parent?, {includeEmpty})
                                   browseApi.getClusters(slug, {multiStoreOnly, limit, offset})
                                   departmentApi.getAll() / .getClusters(id, …)
                                   interface BrowseNode, DepartmentView, CategoryPath
src/app/lib/categories.ts          EVERY presentation rule for the tree — label normalisation,
                                   shelfHref/departmentHref, icons, shelfCount,
                                   foldChildren (tree) and departmentShelves (spine)
src/app/lib/navigation.ts        ✎ CameFrom / useOrigin / useCameFrom / useHereAs — the
                                   back-navigation contract
src/app/components/common/PageMeta.tsx  ✎ per-page <title>, description, canonical, OG
src/app/pages/ShelfPage.tsx        working reference implementation — tree + breadcrumb + products
src/app/pages/DepartmentPage.tsx   the spine's landing page
src/app/routes.ts                  /shelf, /shelf/:slug, /department/:id
```

`ShelfPage.tsx` is a working example of every call you need; copy from it rather than
re-deriving the contract.

⛔⛔ ✎ **`foldChildren` AND `departmentShelves` ARE NOT INTERCHANGEABLE, AND USING THE WRONG ONE
IS SILENT.** `foldChildren` is for TREE children and deliberately returns false on an exact
label match — in the canonical tree a child is never its parent. A DEPARTMENT adopts roots and is
usually named after the principal one, so exact restatement is normal there: measured over all 21
live departments, `foldChildren` removed **1 of 46** adopted shelves.

⭐ **The sharp end is ambiguity, not redundancy.** The Laptops department adopts three roots —
`laptop`, `laptop-2eb1af`, `laptop-06ffb7` — and **all three are labelled "Laptops"**; the menus
rendered three identical tiles reading 655, 590 and 285. `departmentShelves` drops such a group
**whole**, never collapsing to the biggest, because one tile would link to 655 of the
department's 1,530 and lose 875 clusters behind something that looks complete.

⛔ **`DepartmentPage` deliberately keeps `foldChildren`.** A menu tile is a *choice*; that page's
shelf list is *documentation* of what the department is made of, and `verify_categories.py`
asserts the Laptops page "spans more than one shelf" so its 1,530 heading stays explicable.
Applying the menu fold there deleted the explanation to tidy a label — the gate caught it.

---

## 6. Tasks, in dependency order

**1. ✅ DONE — `/shelf` is reachable.** `Header.tsx` mounts the panel on desktop and links
`/shelf` in the mobile sheet. ⚠️ It was never "one line": the component the plan assumed was
already mounted was mounted nowhere (see §1).

**2. ✅ DONE — `MegaMenu` reads the canonical tree** and is mounted in `Header.tsx`.
`browseApi.getTree()` gives 529 browsable roots; the panel takes the top 12 and calls
`getTree(slug)` for the active column's children.

⛔⛔ **THE TOP-N CUT IS ONLY SAFE BECAUSE THE ORDERING WAS FIXED FIRST.** This step used to say
"ordered by stock", and the endpoint ordered by `n_clusters` — a node's OWN stock, not the
closure the shelf renders. Taking the top 12 that way EXCLUDED `Electronics & Computers`
(20,772 clusters, the second-largest department in the corpus, rank 20 by own stock) and
INCLUDED `Battery Chargers` (553 clusters, one shop). Six of twelve were wrong, and four correct
departments hold zero stock of their own so were invisible entirely. `/browse-tree` now publishes
`n_clusters_subtree` and sorts on it — see `CATEGORY_DATA_ISSUES.md` §1.

**3. ✅ DONE — `CategoryStrip`** on the home page reads the same 12 roots.

**4. ✅ DONE 2026-08-21 — the DEPARTMENT SPINE is wired.** 21 ruled departments,
`app/api/departments.py` + two endpoints + `/department/:id`, and all three navigation surfaces
repointed. See §3b. ⛔ It reaches 45% of the catalogue on purpose; `/shelf` keeps the rest.

**5. ⬜ OPEN — Decide `/browse`'s future.** Options: leave it on the spine and let `/shelf` become the
real browse; or render both and A/B. ⛔ Do not delete the spine path.

**6. ⬜ OPEN — Search and `/category/:id`.** These still route through `BrowsePage` on spine slugs.
`/clusters/search` already exists and is independent of both trees — likely the cleaner target.
⚠️ ✎ Note while you are in there: `/browse/:productType` **lists no products on its own** — it
renders the subcategory tree until a `?cat=<encoded pricerunner url>` leaf is chosen (`?sub=` is
still a tree level). Three query shapes on one route, which is why `useHereAs` captures the live
location instead of rebuilding an href.

**7. ✅ DONE 2026-09-04 — per-page `<title>`, description and canonical** (roadmap 1.5).
⛔ `HelmetProvider` was mounted in `App.tsx` and **not one page used it**, so `index.html`'s title
was the title of all ~4,100 shelves, all 21 departments and every comparison page. ⭐ The canonical
policy is the part worth knowing, because the two cases go **opposite ways**: `?multi_store=1` is a
SUBSET of a shelf and canonicalises away to the bare shelf, while `?facet=` is DISTINCT comparable
content — different prices, different shops — and is canonical to itself. Error-shaped pages
(a stale facet, a missing shelf) render honestly but are `noindex`.

**8. ✅ DONE 2026-09-04 — the menus no longer offer tiles nobody can choose between**
(roadmap 1b.2, partial). `departmentShelves` — see §5. ⏩ The other half is yours: dropping shelves
that merely *restate* their department empties the second level for **8 of 21 departments
including `Smartphones`**, so it was implemented, measured and backed out. `CATEGORY_ROADMAP.md`
§1b.2 carries the numbers.

**9. ✅ DONE 2026-09-05 — the redesign spine has a consumer.** The single largest available
improvement to these surfaces: 46.0% → 79.9% of placements reachable by department. See §2 for
the slug hazard and `CATEGORY_ROADMAP.md` Phase 6 for the numbers and the inversion.

⛔⛔ **THIS WAS NEVER BLOCKED, AND NEITHER WAS THE ENGINE'S SIDE — BOTH REPOS RECORDED A STANDOFF
THAT DIDN'T EXIST.** This line used to say *"Blocked on the engine publishing the bridge"*; the
engine's own HEAD commit (`8114a67`) said the FRONTEND consumer was the next session's job.
Grepped 2026-09-04: no `spine_slug`, `spine_department` or `spine_disposition` existed anywhere.
Neither side was waiting on work in progress. ⭐ The cause was structural, not neglect:
`redesign/HANDOFF.md` isolates that package from the live pipeline on purpose — *"a separate
system until the migration says otherwise"* — and `publish_browse_tree.py` sits on the other
side of that line. Full account: `docs/superpowers/specs/2026-09-04-redesign-spine-bridge-design.md`.

**What shipped:** `redesign/emit_bridge.py` emits `bridge.tsv` (4,066 rows, six columns) — the
package's one outward contract, byte-reproducible. `publish_browse_tree.py` reads only that file
and stamps five additive fields (`spine_slug`, `spine_department`, `spine_department_label`,
`spine_level`, `spine_disposition`) on every node — live: 4,137 nodes, **0** missing
dispositions, **19** departments, mass exactly **81,525** (79.9% of 102,038). `GET
/api/clusters/spine-departments` and `GET /api/clusters/by-spine-department/{id}` read only the
stamped fields — no TSV, no second data source, no request-time join. `/aisle/:id` is live with
its own link builder, `aisleHref` — deliberately **not** linked from any nav yet; the parallel
route is for comparison, and the cutover that retires `departments.py` is a separate change.

⛔⛔ **BEFORE YOU SUM A DEPARTMENT'S MASS: USE `n_clusters`, NOT `n_clusters_subtree` — THE
OPPOSITE OF THE RULE EVERYWHERE ELSE IN THIS DOC** (§5: a coarse node must still show stock,
"which is exactly what descendant closure gives you"). A spine department is a SET of
nodes closed under the label mapping, not a subtree — it already contains its descendants.
Summing `n_clusters_subtree` over a department's nodes gives **167,610** against a corpus of
102,038 (`home-appliances` inflates 6.90×). `CATEGORY_ROADMAP.md` Phase 6 has the full table; the
render gate failed 17 of 19 departments under exactly this regression before it was caught.

⚠️ **The department page takes NO descendant closure**, unlike `/by-department`. Closure pulls in
nodes belonging to OTHER departments, because a descendant's label maps wherever its own label
maps (`home-appliances` 3,182 → 21,821 via closure). A spine department's node set is already
closed; source placements from the department's own stamped nodes only.

### Known rough edges you will see (data, not UI bugs)

- ⛔⛔ **⟳ `stocked_roots` (417) WAS THE WRONG LIST FOR PHASE 2.1, AND THE ENGINE SAYS SO NOW.**
  It can only see ROOTS — 306 of its 417 are single-store — while the best-attested shelves are
  not roots at all: 17 browsable nodes reaching 10+ stores sit at depth ≥2, including `Tablets`
  (31 stores, the widest span in the corpus) and `Audio` (19 stores, 6,275 clusters). The
  replacement is `publish_browse_tree.department_candidates()`: **66 shelves covering 67,205
  clusters = 66% of everything placed**, printed on every rebuild. The spine ruled against it is
  in `phones_scraper/implementation_plans/department_spine_worksheet_2026-08-21.md` — **21
  departments**. ⛔ Adopt where a node sits; do NOT ask for a re-parent to make the tree match
  the spine (it strands clusters — see §5 of the reply doc).
- **529 browsable roots.** 3,124 of 4,137 nodes have no parent. Attaching orphans is open
  engine-side work; top-N by stock is the workaround.
  ⭐⭐ **SIZED 2026-08-19, AND IT IS FAR SMALLER THAN "3,124 ORPHANS".** Of those 3,124 parentless
  nodes **2,692 hold nothing at all**, but **432 hold 42,293 clusters — 41% of everything placed —
  and 417 of them are browsable** (135 with ≥10 clusters, 111 reaching ≥2 stores). Those 417 are
  not orphans awaiting a parent; they **are** the storefront's top level. So a curated spine
  adopts **417 shelves, not 3,124** — `publish_browse_tree.stocked_roots` prints them ranked by
  clusters on every rebuild, which is the list to curate against.
- ⟳ **Near-duplicate sibling shelves — PARTLY RESOLVED.** R1 folded `Phones`(495) into
  `Phones`(1,082) and `/shelf/phone-11b5d5` now **404s** (your R10, decided: no alias). What is
  left under `Smartphones` is `Smart Phones`(9) and `Smart Phones - Refurb`(10) — measured, a
  merge of both moves **19 clusters**, so the engine deferred them under its own
  "motion without effect" bar. ⛔ A merge verb was proposed and **refuted**: 23 near-duplicate
  pairs decompose into channels that already exist, leaving 3 genuine merges tree-wide.
  *(Original note retained below.)*
- **Near-duplicate sibling shelves.** Under `Smartphones` sit `Phones`(495), `Smart Phones`(33),
  `Smart Phones - Refurb`(10), `NOTHING PHONES`(13). Not label-identical, so the engine's
  duplicate fold cannot touch them — they are queued for a human ruling (46 such groups).
  ⚠️ **CORRECTED:** that holds for these SIBLINGS, but 20 label groups elsewhere in the tree ARE
  label-identical under DIFFERENT parents — `Laptops` resolves in three places (572/522/136),
  `Phones` in three. The fold's scope is per-parent. For a price-comparison site this is the
  load-bearing defect: 75% of browsable roots are served by ONE store, so navigation splits the
  catalogue by shop before the shopper reaches a product. See `CATEGORY_DATA_ISSUES.md` §6.
- **The odd misfiled shelf**, e.g. `Memory Cards`(1) under `Smartphones`. Report them; don't
  patch them in the UI. ⚠️ Note the count in that example is the whole story: `Memory Cards`
  spans 18 stores but resolves to **one cluster**, so the shelf renders about one product — the
  store span reads far bigger than the defect is.
- **A wrong parent no rule could see.** `Wines` (6 stores, 295 clusters) renders as a *child* of
  `Sparkling & Champagne` (1 store, 21) — one store writes a product's multiple category tags as
  a single path. It is now surfaced by a new engine report (17 such edges) awaiting a human
  ruling. Report anything similar; the UI must not special-case it.

---

## 7. Running it

⭐ New in this pass: `lib/categories.ts` owns every presentation rule for the tree — label
normalisation (275 of 956 browsable labels SHOUT), the honest count (`n_clusters_subtree`),
`/shelf` link construction, and keyword-matched icons. Read it before rendering a category
anywhere; it exists so the three surfaces cannot disagree.

⚠️ Full audit of the data, including what is still broken upstream, is in
**`CATEGORY_DATA_ISSUES.md`**.

```bash
# API  (repo root)
./apienv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 10000

# UI
cd dealsonline_ui_ux && npm run dev      # proxies /api → :10000

# gates
./apienv/bin/python -m pytest -q         # ✎ 297 passed (was 293), 2026-09-04
cd dealsonline_ui_ux && npx tsc --noEmit
cd dealsonline_ui_ux && npm run build    # the third gate — a type-check is not a build
```

⚠️ **This UI has no test framework** — `package.json` exposed `type-check` only. The gates are
`tsc --noEmit`, a production build, and rendering the page. That third one is now **checked in**:

```bash
# ✎ FIXED 2026-09-04 — the npm scripts WORK. The note that used to sit here ("`npm run
#    verify:categories` IS STILL BROKEN — the `with_server.py` it invokes does not exist at that
#    path") is stale: the file is present and the wrapper starts its own dev server, runs the
#    gate and stops the server. Verified end to end on `verify:prices`.
cd dealsonline_ui_ux
npm run verify:categories      # the category surfaces, 3 viewports
npm run verify:prices          # ✎ NEW — the comparison surface

# Both need the API up; only the dev server is managed for you:
./apienv/bin/python -m app.main &          # ⚠️ NOT `uvicorn app.main:app` — see below

# Against servers you are already running, call the scripts directly:
./apienv/bin/python scripts/verify_categories.py
./apienv/bin/python scripts/verify_prices.py

# ⚠️ ⟳ NO ASSERTION COUNT IS QUOTED HERE, DELIBERATELY. It was given as 28 here, 42 in
#    CATEGORY_ROADMAP.md and 48 in REPARENT_REQUEST_PHONES.md against a per-viewport multiplier,
#    so none of the three was ever checkable. Each script prints its own tally; cite the command.
```

⛔ ✎ **THE API START COMMAND ABOVE IN §7 IS WRONG AND WILL LOOK LIKE A DEAD BACKEND.**
`uvicorn app.main:app` serves an app whose cluster routes are **not** mounted where you expect:
every route in this document is prefixed **`/api`** (`/api/clusters/browse-tree`, not
`/clusters/browse-tree`). Start it as `./apienv/bin/python -m app.main` and hit `/api/...`, or
you will get `{"detail":"Not Found"}` on every example here and conclude the data is missing.

⭐ ✎ **`scripts/verify_prices.py` — the second gate, added 2026-09-04.** It covers
`/prices/:clusterId`: the per-variant comparison, variant permalinks (`?facet=`), the
back-navigation contract, and per-page titles/canonical. Its load-bearing assertion is the same
shape as the category gate's — *the claim on a control equals the rows that control opens* — so a
shop count can never again advertise a comparison the page will not show.

⚠️ **FOUR ASSERTIONS IN THESE GATES HAVE LIED, ALL THE SAME WAY: THEY PASSED ON AN EMPTY
RESULT.** `len([]) == len(set([]))`, `0 openers == 0 variants`, a `_num()` that read *128* out of
"128GB", and a "cold load" that was a same-URL `goto` — which browsers answer from
`window.history.state`, handing the router back the very value the check was meant to prove
absent. Each is now paired with a check that pins the *explanation*, not just the absence. **When
you add an assertion here, run it RED first**; on this surface an empty page passes almost
everything.

⭐ `scripts/verify_categories.py` drives Chromium at 390 / 900 / 1440px and asserts **behaviour,
not figures** — the menu agrees with the page it links to, no link escapes into the retired
spine's slug space, no raw shop label reaches a shopper, a spine slug 404s as "No such category",
pagination appends without repeating, the compare filter narrows and lands in the URL.

⟳ **Added 2026-08-21 with the spine**, each guarding something the departments made newly
possible to get wrong:
- the strip, the panel and the mobile sheet each keep an **"all categories" door to `/shelf`** —
  without it the 55% of the catalogue no department adopts is unreachable, *and every other
  assertion still passes*;
- **departments link to `/department/`, adopted shelves link to `/shelf/`** — the two id spaces
  overlap on six names, so the mistake resolves to a plausible wrong page instead of erroring;
- `/department/pantry` and `/shelf/pantry` **are different pages** (485 vs 889);
- a node slug on the department route reads **"No such department"**, not a transient failure;
- **no department name appears twice** — `Laptops` resolves three times in the tree and the
  spine exists to present each concept once;
- ⟳ the old top-12 ordering guard (`Electronics & Computers` in, `Battery Chargers` out) **moved
  to `/shelf`**, where the ~529 roots are still listed in the API's order, and now asserts
  RELATIVE POSITION rather than membership. It was not dropped — the panel simply no longer
  takes the cut that defect lived in.

⛔ IT EXISTS BECAUSE THIS FRONTEND SITS DOWNSTREAM OF A REPUBLISHING ENGINE. Between two runs of
that file the tree moved 4,185 → 4,137 nodes and 553 → 529 browsable roots with no frontend change
at all, and every assertion still held — which is the point. A gate that pinned counts would have
failed on somebody else's correct work.

⚠️ **The API caches the tree for 300s** (`BROWSE_TTL_SECONDS`). After an engine rebuild
(`python -m category_taxonomy.publish_browse_tree --apply`) the API serves the old tree for up
to five minutes. That is a TTL, not a bug — but it will confuse you at minute two.

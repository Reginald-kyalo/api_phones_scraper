# The redesign spine bridge — design

Wiring `phones_scraper/category_taxonomy/redesign/` (1,392 designed nodes, 19 departments,
**zero consumers**) into the storefront, so a shopper reaches **79.9%** of the catalogue by
department instead of 46.0%.

Measured live 2026-09-04 against `taxonomy_db` and the redesign artifacts at
`phones_scraper` branch `matching` (HEAD `d453476`). API + UI repo: `api_phones_scraper`
branch `clusters-api`.

Prior art this supersedes nothing of: `CATEGORY_TREE_API.md` §2 and task 9,
`CATEGORY_ROADMAP.md` Phase 6.

---

## 0. The standoff this exists to break

⛔⛔ **BOTH REPOS RECORDED THIS WORK AS BLOCKED ON THE OTHER, AND NEITHER WAS.**

| repo | what it says |
|---|---|
| `api_phones_scraper` | `CATEGORY_TREE_API.md` task 9: *"⛔ Blocked on the engine publishing the bridge; it is roughly 30 lines in `publish_browse_tree.py`"* |
| `phones_scraper` | HEAD commit `8114a67`: *"docs(handoff): §0.1 — the live state, and the FRONTEND consumer as the next session's job"* |

Neither side was waiting on work in progress. Grepped 2026-09-04: **no `spine_slug`,
`spine_department`, `spine_level` or `spine_disposition` exists anywhere in the engine repo.**

⭐ **AND THE REASON IS STRUCTURAL, NOT NEGLECT.** `redesign/HANDOFF.md` states the isolation
deliberately: *"This folder is self-contained and is NOT part of the live pipeline. Nothing in
`category_taxonomy/` imports from here, and nothing here imports from there… this is a separate
system until the migration says otherwise."* `publish_browse_tree.py` is in the live pipeline;
the spine is outside it. **The boundary that makes the design package safe is the same boundary
that stopped it shipping.** This document is the "migration says otherwise".

---

## 1. Everything below was measured, not quoted

Reproduce with the snippets in §9. Run against the live `taxonomy_db` on 2026-09-04.

| claim | prior source | measured |
|---|---|---|
| the raw-label join is total | `CATEGORY_TREE_API.md` §2: "4,066 of 4,066" | ✅ **4,137 of 4,137 nodes join EXACTLY** — no casefold, no fuzzy, 0 misses |
| spine reach | roadmap Phase 6: 79.9% | ✅ **81,525 of 102,038 = 79.9%** |
| today's reach | `departments.py`: 46.0% | ✅ 46,914 |
| three departments near-empty | roadmap Phase 6 | ✅ `gaming-books-media` 13, `agriculture-agrovet` 20, `sports-outdoors-leisure` 59 |
| spine ∩ `browse_nodes` | roadmap Phase 6: 95 slugs | ✅ 95 — **and 43 of them are `browsable`** (new) |

### 1.1 ⭐ THE REACH IS WIDE, NOT DEEP — AND THAT DECIDES THE DESIGN

Placements by the best spine level they reach:

| reaches | placements | share |
|---|---:|---:|
| level 0 — the department itself | 49,286 | **48.3%** |
| level 1 — a family | 13,852 | 13.6% |
| level 2 — a leaf | 18,387 | 18.0% |
| `disposition=split` | 17,818 | **17.5%** |
| review / facet / reroute / quarantine / filter | 2,695 | 2.6% |

⇒ Nearly half of everything the spine reaches, it reaches **only at the department door**. The
spine buys *which department a cluster lands in*; it does not buy a deep grid. A design that
renders the spine's own families as the second level ships a shallower page than today's
`/department/:id`, which adopts real `browse_nodes` shelves.

### 1.2 ⭐⭐ THE DEPARTMENT ID SPACE IS ESSENTIALLY COLLISION-FREE, AND THE DEEP ONE IS NOT

§2's slug hazard, measured across all four id spaces:

| pair | shared |
|---|---:|
| **spine DEPARTMENTS (19) ∩ `browse_nodes`** | **0** |
| **spine DEPARTMENTS (19) ∩ retired 424-spine** | **0** |
| **spine DEPARTMENTS (19) ∩ curated ids (21)** | **1** — `home-appliances` |
| spine ALL nodes (1,392) ∩ `browse_nodes` | 95 — **43 of them browsable** |
| spine ALL nodes (1,392) ∩ curated ids | 10 |

⇒ **Wiring departments first is not merely incremental — it is the low-collision subset.** The
43 browsable collisions that would resolve to a *plausible wrong page* on two routes live at
spine levels 1–2, which this change does not give URLs to. §7 keeps them out of scope on
purpose.

⚠️ The one exception is `home-appliances`, which names both a spine department and a curated
department. During the parallel period those are **different pages**, exactly as
`/department/pantry` (485) and `/shelf/pantry` (889) are. It gets the same test.

### 1.3 ⭐ THE DEPARTMENTS ARE DISJOINT, SO THE ROWS MAY BE SUMMED

A cluster has one placement → one node → one label → at most one spine target → one department.
Disjointness is therefore by construction, and the 19 masses total **exactly 81,525**.

⛔ This is the opposite of the curated spine, where `CATEGORY_TREE_API.md` §3b warns *"do not add
the rows up"* (46,914 of rows against a 46,127 total, because `tablet` is inside `computer`).
**Do not carry that caution across.** State the property; a reader who assumes the old rule will
build a needless deduplication.

---

## 2. Decisions taken before designing

| question | ruling |
|---|---|
| **Migration** | **Bridge + parallel route, cut over in a second change.** The roadmap's *"it MUST replace `departments.py`, not sit beside it"* stays the end state. This refuses to make the plumbing and the swap one irreversible step. |
| **Cutover test** | **Reach (46.0% → 79.9%), with depth borrowed from `browse_nodes`** — see §5. Not "no shelf gets worse": the three near-empty departments mean that bar may never pass. |
| **Boundary** | **The redesign package emits a frozen bridge artifact; the live publisher reads only that.** §3. |

---

## 3. Where the bridge is computed

### Approaches considered

**A. The publisher reads the redesign artifacts directly.** `publish_browse_tree.py` loads
`label_disposition.tsv` and `taxonomy_spine.yaml` and stamps the fields. Fewest moving parts —
and the live pipeline now depends on the design package's file formats, its disposition
vocabulary, its facets and its splits. The isolation `HANDOFF.md` built is gone, in exchange for
deleting one generated file.

**B. `redesign/` emits a frozen bridge artifact; the publisher reads only that.** ✅ **CHOSEN.**

**C. A post-publish stamper updates `browse_nodes` afterwards.** The publisher is untouched, but
it breaks its own stated property — *"⛔ Writes ONLY `browse_nodes` and `browse_placements`"* —
by adding a second writer, and leaves a window in which published nodes lack the fields. A
consumer that reads during that window sees `spine_department: null` on every node and cannot
distinguish it from "no department", which is §4's silent-fallback trap with a clock attached.

### Why B

- **The boundary survives.** No code import in either direction. The live pipeline learns one
  four-column file; it never learns what a disposition, a facet or a split is.
- **The contract is reviewable.** A spine change arrives as a diff of `bridge.tsv`, so its effect
  on the storefront is visible in review rather than inferred from a regenerated YAML.
- **`build_documents` stays pure.** The bridge arrives as an argument, exactly as `placements`
  does. ⛔ The existing docstring — *"NO CLOCK. `built_at` is stamped by the writer"* — is the
  standard to hold to; a file read inside that function would break it.
- **It follows the `n_clusters_subtree` precedent**, ruled in roadmap 3.4/3.5: *"the engine is
  where the number belongs… two repos deriving one number is two places for it to drift."*

---

## 4. The stamped contract

✎ **AMENDED DURING PLANNING — FIVE FIELDS, NOT FOUR.** `spine_department` is a slug
(`tv-audio-home-entertainment`); its display name (`TV, Audio & Home Entertainment`) lives only
in `taxonomy_spine.yaml`, which the API must not read. Deriving it by title-casing the slug is
not an option at that spelling. So the bridge carries `spine_department_label` and the publisher
stamps it — denormalised across 4,137 nodes for 19 distinct values, exactly as
`n_clusters_subtree` is.

`redesign/emit_bridge.py` writes `bridge.tsv`, one row per raw label (4,066 today):

```
raw_label	spine_slug	spine_department	spine_department_label	spine_level	spine_disposition
1080P Cameras	cameras	cameras-security-surveillance	Cameras, Security & Surveillance	2	node
12 Place Setting					facet
```

`publish_browse_tree.build_documents` joins it on `label` and stamps four fields per node doc:

| field | when `disposition == node` | otherwise |
|---|---|---|
| `spine_slug` | the redesign node | `null` |
| `spine_department` | the node's own `department:` field, read from `taxonomy_spine.yaml` — **not** re-derived by walking to a level-0 ancestor, which is a second way to compute one number | `null` |
| `spine_department_label` | the department node's `name:` from the spine | `null` |
| `spine_level` | 0 / 1 / 2 | `null` |
| `spine_disposition` | `"node"` | **the real disposition** — `split`, `facet`, `review`, … |

⛔⛔ **`spine_disposition` IS ALWAYS PRESENT, AND THAT IS THE POINT.** It distinguishes *"this
label was never mapped"* from *"this label was deliberately mapped to nothing"*. Without it a
consumer sees `spine_department: null` and cannot tell a 17.5% split from a bug.

⭐ **This repo has now shipped the same silent-fallback defect three times** — commit `544e069f`
(children's `ancestor_labels`), the 2026-09-04 fix (`/by-node` and `/by-department`), and the
`_subtree_of(d, None)` sort found beside it. Each was a field that *looked populated* and carried
the wrong thing. A field that is never null and names its own absence is the cheapest available
defence.

⛔ **A label present in `browse_nodes` and absent from `bridge.tsv` is a HARD FAILURE of the
publish, not a null.** Today the join is 4,137/4,137; if the engine republishes a label the
design package has never seen, the honest answer is to stop and rule on it. Degrading to `null`
would let coverage rot silently, which is the defect class above wearing a different hat.

### 4.1 ⛔⛔ A DEPARTMENT'S MASS IS THE SUM OF `n_clusters`, **NOT** `n_clusters_subtree`

**Measured 2026-09-04, and this inverts the rule that holds everywhere else in this codebase.**

| summing over each department's nodes | total |
|---|---:|
| `n_clusters` (own stock) | **81,525** ✅ exactly the placement count |
| `n_clusters_subtree` | **167,610** ❌ — more than the entire corpus of 102,038 |

Per-department inflation: `home-appliances` **6.90×**, `computing-networking` **5.24×**,
`groceries-everyday-essentials` 1.71×, `phones-wearables` 1.40×.

⭐ **WHY IT INVERTS.** `n_clusters_subtree` exists because a *tree walk* must not understate a
coarse parent — `CATEGORY_TREE_API.md` §5: *"printing `n_clusters` understates a department by
3x"*, and roadmap task 2 records the ordering defect that cost `Electronics & Computers` its
place in the top 12. But a spine department is **not a subtree**: it is a SET of nodes closed
under the label mapping, and that set already contains the descendants. Adding each node's
closure counts every nested node once per ancestor also in the set.

⛔ **THIS IS THE MOST LIKELY WAY TO GET THIS WRONG,** because every existing instruction in this
repo says *use the subtree figure, never the own figure* — and a developer who follows it here
publishes 167,610 clusters across 19 departments, with `home-appliances` seven times its real
size, and no assertion in the current suite notices. §8's sum-to-reach gate exists for this.

---

## 5. Depth borrowing

Each spine department adopts the `browse_nodes` shelves its own clusters sit on, keeping only
those with no ancestor also in the set, ordered by mass.

⛔ ✎ **NOT folded through `departmentShelves`.** That helper is for MENU tiles, and
`CATEGORY_TREE_API.md` §5 records that applying it to a page *"deleted the explanation to tidy
a label"* — `DepartmentPage` deliberately keeps `foldChildren` instead. This change builds no
menu at all (the parallel route is unlinked, §6.3), so no fold applies anywhere in it.

⛔ **ADOPTION, NOT RE-PARENTING — the same ruling as the curated spine.** `departments.py`
records that promoting `smart-watch` to a root was simulated and **stranded 72 of its 717
clusters**, dropping it to root rank #23 of 530. Nothing here asks the engine to move a node.

Measured shelf counts per department: `groceries-everyday-essentials` 243, `computing-networking`
73, `health-beauty-personal-care` 51, `phones-wearables` 44 … `gaming-books-media` 4.

⇒ **The rule, stated so it is not invented during implementation:** keep every adopted shelf in
the API response — the department page's shelf list is *documentation of what the department is
made of*, and `verify_categories.py` already asserts the Laptops page "spans more than one
shelf" for exactly that reason. **The cap belongs to the RENDERER, not the endpoint**: menus and
strips take the top 12 by mass, the page shows all of them. ⛔ `CATEGORY_TREE_API.md` §5 records
what happens when the menu's fold is applied to the page — it *"deleted the explanation to tidy
a label"* and the gate caught it.

⚠️ **BORROWING DEPTH DOES NOT FIX `phones-wearables`, AND THE SPEC SHOULD NOT PRETEND IT DOES.**
19,286 of its 28,152 placements sit on the single coarse shelf `Phones and tablets`, so its
second level is one enormous door and 44 small ones. That is the known upstream
shallow-breadcrumb defect (`CATEGORY_TREE_API.md` §4: *40% of all placements sit on a coarse
node*). This change **relocates** it one level down; it does not solve it, and no curation can.

⚠️ `cameras-security-surveillance` is 92.7% one shelf (`Cameras`) — the only department where a
single shelf swallows more than 90%.

---

## 6. Components

### 6.1 Engine — `phones_scraper` (branch `matching`)

- **`category_taxonomy/redesign/emit_bridge.py`** — new. Reads `taxonomy_spine.yaml` +
  `label_disposition.tsv` (+ `disposition_overrides.tsv`, which wins), writes `bridge.tsv`.
  Joins the redesign package's existing build chain.
- **`category_taxonomy/publish_browse_tree.py`** — reads `bridge.tsv`, passes it into
  `build_documents(nodes, placements, bridge)`, which stamps the four fields. ⛔ Additive: every
  existing field keeps its meaning and its consumers.

### 6.2 API — `api_phones_scraper`

- **`app/api/routes/clusters.py`** — two endpoints reading only stamped fields. No TSV, no second
  data source, no request-time join.
  - `GET /api/clusters/spine-departments` → the 19, with mass and borrowed shelves
  - `GET /api/clusters/by-spine-department/{id}` → `{department, shelves, count, total, results}`
  - ⭐ **Descendant closure, like `/by-department`** — the adopted shelves *and everything below
    them*, server-side, so a department is never an empty page. ⛔ And like `/by-department` it
    offers **no `include_descendants` switch**: a department without its subtrees is not a
    smaller department, it is a wrong one.
- ⭐ **Shelf views go through `_browse_node_views`**, the collective builder added 2026-09-04. A
  new route must not reintroduce a per-route label map — that is the defect §4 cites.
- ⛔ Both routes declared **before** `@router.get("/{cluster_id:path}")`, or they are unreachable
  and the 404 reads as a missing cluster.

### 6.3 Frontend — `dealsonline_ui_ux`

- **`/aisle/:id`** — `:id` is a **spine department slug** (one of the 19, e.g. `phones-wearables`),
  never a spine node slug and never a `browse_nodes` slug — and **`aisleHref(id)`** in
  `lib/categories.ts` — a third link builder, per §2's
  rule and the six-way `/department` ↔ `/shelf` id overlap that made `departmentHref` necessary.
  At cutover `/aisle` becomes `/department` and the old ids 301.
- ⭐ **Every aisle surface keeps its "All categories" → `/shelf` door.** At 79.9% the residue is
  20,513 placements rather than 55,000, but it is not zero and the door is what makes it
  reachable. `CATEGORY_TREE_API.md` §3b: remove it *"and half the catalogue becomes unbrowsable
  while every other assertion still passes."*

---

## 7. Non-goals, stated so they are not quietly attempted

- **Splits** — 17,818 placements, 17.5%, the entire gap between 79.9% and the roadmap's 97.4%.
  They need per-product resolution, not a node mapping.
- **Deep spine pages** — spine levels 1 and 2 get no URLs. This is where **43 browsable slug
  collisions** live (§1.2); giving them routes is a separate design with its own hazard analysis.
- **Deleting `departments.py`** — the second change, after the comparison this one enables.
- **The editorial rule for the three near-empty departments** — a cutover decision, not plumbing.
- **Re-parenting anything upstream.** §5.

---

## 8. Gates

⚠️ `CATEGORY_TREE_API.md` §7: *"FOUR ASSERTIONS IN THESE GATES HAVE LIED, ALL THE SAME WAY: THEY
PASSED ON AN EMPTY RESULT."* **Every assertion below is run RED first**, and each pins an
explanation rather than an absence.

**Engine**
- `bridge.tsv` regenerates byte-identically from unchanged inputs (the package's existing
  reproducibility invariant).
- Every `browse_nodes` label joins — 4,137/4,137 today; a miss fails the publish (§4).
- `spine_disposition` is a closed set; `spine_slug` is non-null **iff** it is `"node"`.
- Department masses sum to the reach total (81,525 today), proving §1.3's disjointness rather
  than assuming it — **and catching the `n_clusters_subtree` inversion of §4.1, which lands at
  167,610.**

**API**
- The slug-space guard extends from three id spaces to **four**: a spine id must 404 on
  `shelfHref`/`departmentHref` and vice versa.
- `/aisle/home-appliances` and `/department/home-appliances` are **different pages** — the
  `pantry` test, one space over.
- A node slug on the aisle route reads *"No such department"*, not a transient failure.

**Render** (`scripts/verify_categories.py`, 390/900/1440px)
- Every aisle surface keeps its `/shelf` door.
- No aisle link escapes into any other slug space.
- No raw shop label reaches a shopper.

---

## 9. Reproducing §1

```bash
# reach, level distribution, per-department shelves
cd api_phones_scraper && ./apienv/bin/python - <<'PY'
import csv, sys, collections, yaml; sys.path.insert(0, ".")
from app.config import settings
from pymongo import MongoClient
RD = "../phones_scraper/category_taxonomy/redesign/"
by_slug = {n["slug"]: n for n in yaml.safe_load(open(RD+"taxonomy_spine.yaml"))["nodes"]}
disp = {r["raw_label"]: r for r in csv.DictReader(open(RD+"label_disposition.tsv"), delimiter="\t")}
db = MongoClient(settings.MONGO_URI)["taxonomy_db"]
nodes = {n["_id"]: n for n in db.browse_nodes.find({}, {"label": 1})}
t = collections.Counter()
for p in db.browse_placements.find({}, {"node_slug": 1}):
    r = disp.get((nodes.get(p["node_slug"]) or {}).get("label"))
    if not r: t["unjoined"] += 1; continue
    if r["disposition"] != "node": t[r["disposition"]] += 1; continue
    tgt = by_slug.get(r["target"])
    t[f"level {tgt['level']}" if tgt else "target missing"] += 1
print(t.most_common())
PY
```

⚠️ **CHECK WHICH SERVER YOU ARE MEASURING.** A `./apienv/bin/python -m app.main` process left
running serves the code it started with; a second launch fails to bind with `[Errno 98]` and the
line scrolls past, so live output can be a day stale. `ps -o lstart -p $(ss -ltnp | grep :10000
| grep -oP 'pid=\K[0-9]+')`. The API also caches the tree for 300s (`BROWSE_TTL_SECONDS`).

---

## 10. Risks

| risk | size | handling |
|---|---|---|
| `phones-wearables` stays one giant door | 19,286 of 28,152 on one coarse shelf | Named, not fixed. Upstream defect; §5. |
| Three departments render near-empty | 13 / 20 / 59 clusters | Out of scope; editorial rule at cutover. |
| A future spine level-1/2 route hits 43 browsable collisions | plausible wrong pages, silent | Not built here; §7. The department space is clean (§1.2). |
| Two department navs during the parallel period | shopper-facing | Time-boxed by the cutover; `/aisle` is not linked from primary nav until the comparison is made. |
| A republished label absent from `bridge.tsv` | coverage rots silently | Hard publish failure, never a null (§4). |

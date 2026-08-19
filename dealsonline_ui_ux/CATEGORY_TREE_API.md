# Wiring the canonical category tree into the frontend

Reference for the two endpoints that serve **`taxonomy_db.browse_nodes`** — the category tree
built bottom-up from what Kenyan shops actually stock — and what still needs doing on the UI side.

Measured live 2026-08-19. Engine repo: `phones_scraper` (branch `matching`).
API + UI repo: `api_phones_scraper` (branch `clusters-api`).

---

## 1. Is the data wired? Partly.

| surface | route | tree it reads | state |
|---|---|---|---|
| `ShelfPage.tsx` | `/shelf`, `/shelf/:slug` | **canonical** (`browseApi`) | ✅ wired, verified against live data |
| `MegaMenu.tsx` | header nav, every page | retired spine (`pricerunnerApi`) | ⛔ not wired |
| `CategoryStrip.tsx` | home page | retired spine | ⛔ not wired |
| `CategoriesPage.tsx` | `/browse` | retired spine | ⛔ not wired |
| `BrowsePage.tsx` | `/browse/:productType`, `/search`, `/category/:id` | retired spine | ⛔ not wired |

⛔ **And `/shelf` is currently reachable only by typing the URL.** Nothing links to it — grep
`src/` for `/shelf` outside `ShelfPage.tsx` and `routes.ts` and you get nothing. That is my
omission, and it is the same defect the tree already suffered one layer down: it works, and no
one can get to it. **Fixing that is task 1 below and it is one line.**

So: the pipe is built and proven, and the storefront's actual navigation does not use it yet.

---

## 2. Two trees exist, and you must not confuse them

| | retired spine | canonical tree |
|---|---|---|
| collection | `taxonomy_db.canonical_categories` | `taxonomy_db.browse_nodes` |
| size | 424 nodes | **4,185 nodes** |
| origin | imported PriceRunner taxonomy | built from 46 Kenyan shops' own breadcrumbs |
| client | `pricerunnerApi` | `browseApi` |
| covers groceries? | 3 nodes total | yes — `food-cupboard` alone holds 2,010 clusters |

⛔⛔ **THE SLUG SPACES ARE DISJOINT — the intersection is literally ZERO.** A slug from one tree
never resolves in the other. `mobile-phones` is a spine slug; `smartphone` is a canonical slug;
they name the same shelf and neither lookup finds the other. **Never pass a slug from one API to
the other**, and never assume a URL containing a category slug works on both routes.

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
    "n_clusters": 2313,
    "n_stores": 30,
    "coarse": false,
    "browsable": true,
    "unsorted": false
  },
  "count": 7,
  "results": [ /* BrowseNode[], same shape, ordered by n_clusters desc */ ]
}
```

- `parent` is `null` when listing roots.
- `results` are **ordered by stock, not alphabetically** — a shopper wants the shelf that has
  something on it. Do not re-sort by label.
- `ancestor_labels` is **index-for-index with `ancestors`**, so a breadcrumb needs no extra call.
  A missing label falls back to its own slug rather than being dropped, because dropping one
  shifts every later crumb by one.
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

## 4. The three flags, and what the renderer should do with each

The publisher writes these as **flags, never filters** — it deliberately leaves the decision to
the UI. Live counts of 4,185 nodes:

| flag | count | meaning | render as |
|---|---:|---|---|
| `browsable` | **981** | this node or something below it holds stock | the other 3,204 render an empty page — the endpoint already withholds them by default |
| `coarse` | **217** | a grouping header a bigger child sits under | a section title, not a landing shelf — send people to its children |
| `unsorted` | **619** | holds stock and has no children to sort it into | a leaf: show products, no subcategory grid |

`coarse` is worth understanding rather than ignoring. `Computers & Tablets` spans 1 store while
its child `Tablets` spans 31 — the edge is *correct*, because only a few shops spell the
department that way. The rule the whole taxonomy turns on: **more words = narrower, EXCEPT
across `&`, where more words = broader.**

⚠️ **40% of all placements sit on a `coarse` node** (`phone-tablet` alone holds 19,301 of
102,124). That is a known upstream data problem — the shops' own breadcrumbs are that shallow —
not something the UI can fix. Design for it: a coarse node must still show stock, which is
exactly what descendant closure gives you.

---

## 5. What's already in the repo

```
src/app/lib/api.ts                 browseApi.getTree(parent?, {includeEmpty})
                                   browseApi.getClusters(slug, {multiStoreOnly, limit, offset})
                                   interface BrowseNode
src/app/pages/ShelfPage.tsx        working reference implementation — tree + breadcrumb + products
src/app/routes.ts                  /shelf and /shelf/:slug
```

`ShelfPage.tsx` is a working example of every call you need; copy from it rather than
re-deriving the contract.

---

## 6. Tasks, in dependency order

**1. Make `/shelf` reachable.** Add one nav link. Until this lands nothing else here is visible
to a user. One line in `Header.tsx` or `MegaMenu.tsx`.

**2. Point `MegaMenu` at the canonical tree.** Highest-leverage surface — it is on every page.
`browseApi.getTree()` gives 553 browsable roots ordered by stock; take the top ~12 for columns
and `getTree(slug)` for each column's children. ⚠️ 553 roots is too many to render flat; the
ordering is what makes a top-N cut safe.

**3. Same for `CategoryStrip`** on the home page — same data, smaller surface.

**4. Decide `/browse`'s future.** Options: leave it on the spine and let `/shelf` become the
real browse; or render both and A/B. ⛔ Do not delete the spine path.

**5. Search and `/category/:id`.** These still route through `BrowsePage` on spine slugs.
`/clusters/search` already exists and is independent of both trees — likely the cleaner target.

### Known rough edges you will see (data, not UI bugs)

- **553 browsable roots.** 3,170 of 4,185 nodes have no parent. Attaching orphans is open
  engine-side work; top-N by stock is the workaround.
- **Near-duplicate sibling shelves.** Under `Smartphones` sit `Phones`(495), `Smart Phones`(33),
  `Smart Phones - Refurb`(10), `NOTHING PHONES`(13). Not label-identical, so the engine's
  duplicate fold cannot touch them — they are queued for a human ruling (46 such groups).
- **The odd misfiled shelf**, e.g. `Memory Cards`(1) under `Smartphones`. Report them; don't
  patch them in the UI.

---

## 7. Running it

```bash
# API  (repo root)
./apienv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 10000

# UI
cd dealsonline_ui_ux && npm run dev      # proxies /api → :10000

# gates
./apienv/bin/python -m pytest -q         # 250 passed
cd dealsonline_ui_ux && npx tsc --noEmit
```

⚠️ **This UI has no test framework** — `package.json` exposes `type-check` only. The gates
available are `tsc --noEmit`, a production build, and rendering the page.

⚠️ **The API caches the tree for 300s** (`BROWSE_TTL_SECONDS`). After an engine rebuild
(`python -m category_taxonomy.publish_browse_tree --apply`) the API serves the old tree for up
to five minutes. That is a TTL, not a bug — but it will confuse you at minute two.

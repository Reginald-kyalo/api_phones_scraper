# Feedback report — data contract

Everything the checklist needs, and how to send it back. **The form design is
yours**; this is only what the backend now guarantees.

Grounded in the dataset's measured failure modes, not invented categories — each
axis below points at a real defect with a number attached.

---

## 1. What you can ask about, and the field that answers it

Read from a **detail** view (`GET /api/clusters/{cluster_id}`, or a
`public/demo/clusters/*.json` shard). All of it is in the captured dataset too.

| # | ask the reader | read from | notes |
|---|---|---|---|
| 1 | **Do these belong together?** | `mvp_merged_members[]` | 🆕 one tickable row each: `{cluster_id, title}` |
| 2 | **Is this the right name?** | `title`, `display_name`, `representative_title`, `best_by_store[].title` | the per-store titles are what each shop calls it |
| 3 | **Is this the right picture?** | `image` | one per cluster; no alternatives exposed |
| 4 | **Is the lowest price right?** | `best_price`, `cheapest_store`, `best_by_store[]` | each offer has `price`, `url`, `title` |
| 5 | **Is this % saving real?** | `spread_basis` | 🆕 names the exact two offers compared |
| 6 | **Is this a deal?** | `comparison_grade`, `data_warning`, `availability_basis`, `freshness_basis`, `n_stores` | the caveats already computed |
| — | wrong category | `category` | slug comes verbatim from the store's own page |
| — | dead link | `best_by_store[].url` | also `availability_basis`, `last_seen` |

### 🆕 `mvp_merged_members` — the grouping question

`mvp_merged_from` is **identity keys** and cannot be shown to a person:

```
groceries::250mlx6+brookside+flavour+strawberry+uht
```

`mvp_merged_members` is the same list, named:

```json
"mvp_merged_members": [
  {"cluster_id": "groceries::daawat+green+label+spaghetti", "title": "Daawat Green Label Spaghetti – 400g"},
  {"cluster_id": "groceries::blue+daawat+label+spaghetti",  "title": "Daawat Spaghetti Blue Label 400G"},
  {"cluster_id": "groceries::daawat+green+lable+spaghetti", "title": "Daawat Spaghetti Green Lable 400G"}
]
```

Render one tickable row per entry and send back the `cluster_id` of each one the
reader rejects. **4,082 of 61,473 clusters are merges** (2026-07-25 corpus; after the 07-26
rebuild it is **6,068 of 88,137** — the ratio is what matters here, not the absolute);
`mvp_n_merged > 1` is the
only reliable signal (`mvp_generated` is true for 33,634 pass-throughs too).

### 🆕 `spread_basis` — the percentage question

The saving was a bare number with no provenance. It now carries its evidence:

```json
"like_for_like_spread_pct": 80.0,
"spread_basis": {
  "facet_label": "400g",
  "spread_pct": 80.0,
  "cheapest": {"store": "quickmart", "price": 90.0,  "title": "Daawat Spaghetti Green Lable 400G", "url": "…"},
  "dearest":  {"store": "carrefour", "price": 162.0, "title": "Daawat Spaghetti Blue Label 400G",  "url": "…"}
}
```

⭐ **Render both titles verbatim.** That example is a real one, and both titles on
screen is the only way its defect is visible: an 80% "like-for-like saving"
comparing **Green Label** against **Blue Label**. The grocery merge unions flavour
and colour variants into a single config, so the pair genuinely can be two
different products. A reader who can see that will tell you precisely.

`null` when no configuration has two priced stores.

---

## 2. What we fixed so the reader judges the data, not our rendering

Reports are only usable if the reader is reacting to a real defect. Three things
would have produced noise:

- **HTML entities in titles — 3,020 clusters (4.91%).**
  `Brown&#8217;s Greek Yoghurt Honey Flavour &#8211; 250ml` rendered literally.
  Asked "is this title right?" a reader says no because of the mojibake. Now
  decoded on every title surface; **0 remain**.
- **Retailer placeholder images — 846 clusters (1.4%).** Carrefour's grey
  `Plus_1_<hash>.svg` looked like a product photo that failed to load. Now
  rejected; 697 found a real photo on another listing.
- **Measurements in the brand slot — 330 clusters.** `14-inch`, `3.1ch`, `6way`
  as the eyebrow. Now blanked.

---

## 3. Sending a report — `POST /api/reports`

One submission = one `reports` row + N `report_facets` rows. **One tick = one
facet**, so a 5-way merge yields five independently usable labels.

```jsonc
{
  "scope": "cluster",              // "cluster" | "deal" | "site"
  "cluster_id": "groceries::…",    // required unless scope is "site"
  "title": "Daawat Spaghetti Blue Label 400G",   // as the reader saw it
  "category": "groceries",
  "captured_at": "2026-07-26T…",   // manifest.captured_at
  "page_url": "https://…/prices/…",
  "note": "the green and blue labels are different products",
  "facets": [
    {"kind": "grouping", "subject": "groceries::daawat+green+label+spaghetti", "value": "wrong"},
    {"kind": "price",    "subject": "quickmart", "value": "115"},
    {"kind": "spread",   "subject": null,        "value": "not the same item at both shops"}
  ]
}
```

### Facet kinds

| kind | `subject` | `value` |
|---|---|---|
| `grouping` | the absorbed `cluster_id` | `"wrong"` / `"ok"` |
| `title` | — | corrected name (optional) |
| `image` | — | — |
| `category` | — | the category it belongs in (optional) |
| `price` | store name | corrected price (optional) |
| `dead_link` | store name | — |
| `lowest_price` | — | the store actually cheapest (optional) |
| `spread` | — | why the % is wrong (optional) |
| `not_a_deal` | — | why (optional) |
| `other` | — | — |

Limits: ≤ 60 facets, `value` ≤ 200 chars, `subject` ≤ 300, `note` ≤ 1000.

**Responses.** `201 {"ok": true, "facets": n}` on success. `400` for an unknown
`scope` or `kind`, a missing `cluster_id` on a non-site report, > 60 facets, or a
submission with **neither a facet nor a note** — an empty report would inflate
every count downstream. `500` if the write fails and `503` if no storage is
configured at all; it never claims success it did not achieve.

### Where the rows land (and how to redirect them)

Storage is behind the endpoint, not in front of it — the browser only knows
`/api/reports`. Swapping it is an environment variable on the Pages project:

| variable | effect |
|---|---|
| *(D1 binding `DB`)* | default: the two tables above |
| `REPORT_WEBHOOK_URL` | POST the whole submission as JSON anywhere |
| `REPORT_SINK` | force `d1` / `webhook`; unset uses whatever is configured |

⭐ **This is the seam to use if you want reports in Mongo next to the clusters.**
Point `REPORT_WEBHOOK_URL` at an endpoint on this API and every submission arrives
as the JSON above plus `country` and `received_at` — the labels would then live
beside the data they label, which is where they are most useful for training. Say
if you want that and we will point it at you rather than at D1.

⚠️ The forward happens **server-side at the edge**, so there is no CORS to
negotiate and no key in the browser bundle. A receiving endpoint only needs to
accept a JSON POST and return 2xx; anything non-2xx is treated as *not stored*.

⚠️ A static preview has no Function behind `/api/reports` and returns the SPA
shell with a 200. Check the response is JSON before showing "sent" — the existing
dialog already does.

### Anchoring — why a report survives a rebuild

- `cluster_id` is **not** a stable key. It is now *reproducible* (two rebuilds
  produce identical ids) but a new merge still absorbs one.
- `mvp_merged_from` is the forwarding address: search it to re-attach a report
  filed against an id that no longer resolves.
- Keep sending `captured_at` and a store `url` where you have one. A listing URL
  is durable against changes clustering cannot express.

---

## 4. Added 2026-07-26 — the four asks from the last round

| field | answers | notes |
|---|---|---|
| `saving_pct` | "is this % right?" | ⛔ **use this, not `like_for_like_spread_pct`** |
| `best_by_store[].stock` | "out of stock **at which shop**" | `in_stock` / `lowstock` / `out_of_stock` / `unknown` |
| `image_candidates[]` | "wrong picture" → now **correctable** | chosen image first; 12,705 clusters have ≥2 |
| `category_path` | nested navigation | `null` for groceries — see below |

### ⛔ `like_for_like_spread_pct` is a MARKUP — confirmed, and now fixed at source

You were right. Verified independently: **3,418 of 3,418** clusters reproduce
`(max-min)/MIN`, and **139 publish a value above 100%**, which is impossible as a
saving. `saving_pct` = `(max-min)/MAX` is now published alongside it, the old
field's description says it is a markup, and `saving_pct` is in `SUMMARY_FIELDS`
so **cards can reach it** — a card could previously only see the markup, which is
exactly how a 3750% badge shipped.

### `category_path` — and why groceries is `null`

```json
"category_path": {
  "slug": "laptops", "name": "Laptops", "parent_slug": "computers", "level": 2,
  "path": ["Computing", "Computers", "Laptops"],
  "path_string": "Computing > Computers > Laptops"
}
```

`manifest.categories[]` now also carries `name`, `group`, `path`, `level`, so the
manifest alone builds a nested menu:

```
Sound & Vision      14,626   Audio Systems · Headphones · Speakers · TVs
Computing            6,903   Laptops · Routers · Tablets · Printers · Desktops · Monitors
Phones & Wearables   6,181   Mobile Phones · Wearables
Photography            129   Digital Cameras
(no group)          33,634   groceries
```

⚠️ **`groceries` — the largest category — has no taxonomy node**, because FMCG came
through its own pipeline. Navigation must not assume every category has a parent.

## 5. Two things NOT exposed

- **Alternative images.** Only the chosen `image` ships, so "wrong picture" can be
  flagged but not corrected. Say if you want candidates.
- **Per-store stock.** `availability_basis` is cluster-level. The capture ships
  only buyable rows, so within the demo it is always `available` or `unknown`;
  the live API serves all four values.

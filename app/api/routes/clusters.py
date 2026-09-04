"""
Cross-store price-comparison API — serves product_matching_db.product_clusters.

One cluster = one product (model family) grouped across marketplaces by the
deterministic model_identity_key. Each endpoint returns the HONEST comparison the
matching engine computes: cheapest NEW price per store within each storage config
(like-for-like — a 128GB phone is not compared to a 256GB one), the canonical
PriceRunner name when matched, and a used/refurb flag so a refurb price is never
shown as the "new" headline.

The `_cluster_view` projection is a faithful copy of
`product_identity/lookup_prices.cluster_view` so the served data cannot drift from
the engine's own read view (asserted by the cross-check test in the engine repo,
`product_identity/tests/test_api_projection_contract.py`).

Responses are typed by `app.api.schemas.clusters`, so every field's meaning —
which price is a retail headline, which is a refurb asking price, which spread is
honest — is published in the OpenAPI schema at /docs rather than living only in
the comments below. ⚠️ A `response_model` FILTERS the response: a field missing
from the model vanishes from the API with no error anywhere, so
`tests/test_cluster_schemas.py` asserts the models stay a superset of this
projection.
"""

import os
import re
import time

from fastapi import APIRouter, HTTPException, Query

from app.api.hygiene import (
    availability,
    best_title,
    canonical_store,
    clean_brand,
    clean_text,
    fold_by_store,
    fold_stores,
    freshness,
    last_seen_at,
    saving_pct,
    spread_basis,
    stock_by_store,
)
from app.api.departments import ADOPTED_SLUGS, BY_ID, DEPARTMENTS, Department
from app.api.taxonomy import BROWSE_TTL_SECONDS, category_path, category_path_for_cluster
from app.api.schemas.clusters import (
    BrowseTreeResponse,
    BrowseNodeView,
    ClusterDealsResponse,
    ClusterNodeResponse,
    ClusterSearchResponse,
    ClusterView,
    DepartmentClustersResponse,
    DepartmentsResponse,
    DepartmentView,
)
from app.database import product_matching_db, taxonomy_db

router = APIRouter(prefix="/api/clusters", tags=["clusters"])

CLUSTERS = product_matching_db[os.getenv("CLUSTERS_COLLECTION", "product_clusters")]
# The PRESENTATION tree. `browse_placements` carries an index on `node_slug` that nothing
# queried until `/by-node` existed — the tree shipped 2026-08-17 and was navigable by nobody.
BROWSE_NODES = taxonomy_db["browse_nodes"]
BROWSE_PLACEMENTS = taxonomy_db["browse_placements"]

# ⛔⛔ `n_clusters` IS OWN STOCK; EVERY PRODUCTS PAGE RENDERS THE CLOSURE. `/by-node/{slug}`
# returns descendants by default, so `food-cupboard` publishes 2,010 on the tree and answers
# 6,220 on the shelf — a menu built from `n_clusters` understates a department by 3x and, worse,
# ORDERS BY IT: sorting the browsable roots on own stock drops `Electronics & Computers` (20,772
# in subtree) to rank 20, out of a top-12 menu, and promotes `Battery Chargers` (553, one shop)
# into it. The client cannot repair this — one honest number costs it a whole-tree crawl.
# (Measured 2026-08-19 over 553 roots / 4,185 nodes; the tree is republished, the defect is not.)
#
# ⭐ ONE PASS, NO RECURSION, because `ancestors` is materialised on every node: each node adds
# its own `n_clusters` to itself and to each of its ancestors.
#
# ⚠️ Cached on the SAME TTL as `taxonomy.load_browse`, and for the same reason — the tree is
# rebuilt by hand, minutes apart at most, and a rollup that never re-reads outlives its tree.
_SUBTREE: dict[str, int] | None = None
_SUBTREE_AT: float = 0.0


def reset_subtree_cache() -> None:
    """Force the next `_subtree_totals` to re-read. For tests and for a post-publish poke."""
    global _SUBTREE, _SUBTREE_AT
    _SUBTREE, _SUBTREE_AT = None, 0.0


# ⭐⭐ ROADMAP 3.5 LANDED ENGINE-SIDE 2026-08-21: `publish_browse_tree` now writes
# `n_clusters_subtree` on every node doc, cross-checked against an independently derived count
# (parent-map walk vs. `ancestors`-array rollup) on all 4,137 nodes with **0 disagreements**.
# Verified live: 4,137 of 4,137 carry it.
#
# ⇒ THE ROLLUP ABOVE IS NOW A FALLBACK, NOT THE SOURCE. On a current tree `_subtree_totals()`
# is never called, so a whole-collection scan and its 300s cache drop off every tree request —
# which also retires the `reset_subtree_cache()` foot-gun in practice (roadmap 3.4) without
# adding an admin route to poke it.
#
# ⛔ THE FALLBACK STAYS, AND IT IS NOT DEAD WEIGHT. A dev database restored from a dump older
# than 2026-08-21 has no such field, and the honest degradation there is the computed closure —
# NOT `n_clusters`, because understating a coarse department is exactly the ordering defect the
# field exists to fix. The rollup is entered only when a row actually lacks the field.
def _needs_rollup(docs: list[dict]) -> bool:
    """True when any doc in hand predates roadmap 3.5 and needs the closure computed."""
    return any(d.get("n_clusters_subtree") is None for d in docs)


def _subtree_of(node: dict, fallback: dict | None) -> int:
    """Clusters on a shelf and everything below it, published field first.

    ⛔ FALLS BACK TO `n_clusters`, never to 0. Publishing 0 would render a stocked department as
    empty, which is worse than the understatement this number exists to fix.
    """
    published = node.get("n_clusters_subtree")
    if published is not None:
        return published
    return (fallback or {}).get(node["_id"], node.get("n_clusters") or 0)


async def _subtree_totals() -> dict[str, int]:
    """slug -> clusters on that shelf AND everything below it. Every node gets an entry.

    ⛔ A node holding nothing of its own must still appear, or the caller falls back to
    `n_clusters` for exactly the coarse departments this exists to fix.
    """
    global _SUBTREE, _SUBTREE_AT
    if _SUBTREE is not None and (time.monotonic() - _SUBTREE_AT) <= BROWSE_TTL_SECONDS:
        return _SUBTREE
    rollup: dict[str, int] = {}
    try:
        async for d in BROWSE_NODES.find({}, {"ancestors": 1, "n_clusters": 1}):
            slug = d["_id"]
            rollup.setdefault(slug, 0)
            n = d.get("n_clusters") or 0
            if not n:
                continue
            rollup[slug] += n
            for anc in d.get("ancestors") or []:
                rollup[anc] = rollup.get(anc, 0) + n
    except Exception:
        # ⛔ Same contract as `load_browse`: navigation degrades to the old, understated number,
        # never to a 500. A menu that sorts imperfectly beats a menu that does not render.
        return _SUBTREE or {}
    _SUBTREE, _SUBTREE_AT = rollup, time.monotonic()
    return rollup


# Every canonical slug holding >=2 multi-store clusters (measured 2026-07-25 against
# product_clusters_mvp). A slug missing here 400s the whole category, which is how
# groceries stayed invisible before 7226de12 — audio-systems (120 multi-store),
# wearables (59), speakers (19), desktop-computers (2) and routers (2) were hidden the
# same way. Reachability is cheap and reversible; comparability is COMPARISON_SLUGS below.
_SLUGS = {
    "mobile-phones", "laptops", "tablets", "headphones", "monitors", "groceries",
    "audio-systems", "wearables", "speakers", "desktop-computers", "routers",
    # Added 2026-07-26. 481 multi-store clusters — the 4th largest pool in the corpus,
    # behind only groceries, mobile-phones and laptops — from 21,058 clusters. It is
    # deliberately NOT in COMPARISON_SLUGS: only 18% of those keep two PRICED stores,
    # against laptops' 49% and groceries' 96%, because 96% of the losses are classifieds
    # (327 of 394 are jiji+jumia, excluded as likely_used). Browse-grade, not deal-grade.
    "mobile-phone-accessories",
    # Added 2026-07-26 for the same reason, once re-clustering made them qualify.
    # All three measured ZERO multi-store on 2026-07-25 and were correctly excluded
    # then; they had been stuck on 2026-06-30 builds. Re-running the clusterer on
    # current compiled data gave tvs 687 -> 5,005 clusters (18 multi-store),
    # digital-cameras 129 -> 619 (6) and printers 342 -> 352 (2).
    # ⚠️ The demo was already shipping all three, so the live API 400d on categories
    # the static dataset served — this closes that split.
    "tvs", "digital-cameras", "printers",
}
# Categories where cross-store comparison actually works with the deterministic identity
# engine. Accessories (headphones/monitors) are structurally non-comparable: only ~0.66% /
# ~3% of their clusters are multi-store, and even branded items (JBL/Anker/Apple) fragment
# across stores because accessory model naming is inconsistent ("JBL Tune 510BT" vs "JBL
# T510BT"). They remain searchable, but the curated deals surface is restricted to these
# real comparison categories. The genuine fix for accessories is a near-duplicate
# (embedding/lexical) matcher, not a deterministic key — deferred to the learned path.
# ⭐ `groceries` belongs here on the same evidence the accessories were excluded on. Measured
# 2026-07-25: 3,712 of 39,731 grocery clusters are multi-store (9.3%) — the LARGEST multi-store
# pool in the corpus, bigger than phones + laptops + tablets combined (2,078) — versus 0.4% for
# headphones and 3.3% for monitors. FMCG is also the first B2B surface. Supermarket titles carry
# a real brand + pack size, so they key far more consistently than accessory model names do.
COMPARISON_SLUGS = {"mobile-phones", "laptops", "tablets", "groceries"}

# Serving-layer trust guards. The engine's outlier price-band only applies to clusters
# with >=3 prices, so 2-listing clusters can carry a mis-parsed junk price (e.g. a "354
# KES" Moto) — which then becomes a fake "best price" / huge spread. A genuine same-config
# cross-store saving is bounded; beyond this it is almost always a data artifact. Until the
# engine fixes small-cluster hygiene, we (a) keep such clusters OUT of the curated deals view
# and (b) flag them so the frontend never headlines a suspect price.
MAX_DEAL_SPREAD_PCT = 80.0
# KES floor for a plausible price — PER CATEGORY, because one global floor cannot work.
# 500 is right for a device: below the cheapest real feature phones (Nokia 105/106, Itel
# basics at ~900-1000) but above the single-listing mis-parses in the data (~269-429).
# ⛔ Applied to groceries that same 500 was silently hiding 78% of the catalogue (2,887 of
# 3,712 multi-store clusters; measured best_price p25=105, p50=215) and cut the grocery deals
# surface from 1,724 to 361. A 500 KES floor on a shop where the median product costs 215 is
# not a trust guard, it is a category filter. 20 KES is below any real FMCG unit price
# (cheapest sachets/sweets sit at ~30-50) while still catching zero/near-zero mis-parses.
DEFAULT_MIN_PLAUSIBLE_PRICE = 500
MIN_PLAUSIBLE_PRICE_BY_SLUG = {"groceries": 20}


def min_plausible_price(slug: str | None) -> float:
    """The floor below which a best_price is treated as a likely mis-parse, per category."""
    return MIN_PLAUSIBLE_PRICE_BY_SLUG.get(slug, DEFAULT_MIN_PLAUSIBLE_PRICE)


def _data_warning(d: dict) -> str | None:
    # Buyability first. Whether the price is a retail or a refurb number is moot if
    # there is nothing to buy — every store carrying it is out of stock, or the
    # listing is gone from the store's site altogether. The engine already gates
    # these out of the headline (`gate_members`) but stamped the verdict on only
    # half the corpus, so hygiene.availability recomputes it from members[].
    avail = availability(d)
    if avail == "delisted":
        return "listing removed from the store's site — this price cannot be verified"
    if avail == "out_of_stock":
        return "out of stock at every store that carries it — not currently buyable"
    # Channel next: when the cluster has no confident new-retail member, the headline
    # best_price is a likely-used fallback (a classifieds/refurb asking price), not a
    # retail price — say so explicitly rather than letting it look like a normal deal.
    if d.get("condition_basis") == "likely_used":
        return "no confident retail price — cheapest is a classifieds/refurb asking price"
    bp = d.get("best_price")
    if isinstance(bp, (int, float)) and 0 < bp < min_plausible_price(d.get("canonical_category_slug")):
        return "implausibly low best price — likely a mis-parsed listing"
    sp = d.get("like_for_like_spread_pct")
    if isinstance(sp, (int, float)) and sp > MAX_DEAL_SPREAD_PCT:
        return "wide price spread — a store price may be an outlier"
    return None


def _by_store(raw: dict, summary: bool, stock: dict | None = None) -> dict:
    """best_by_store → {site: {price,url,title}} (detail) or {site: price} (summary).

    Keys are canonicalised first, so a retailer crawled under both a bare name and
    a domain (`carrefour` / `carrefour.ke`) is one column, not two.
    """
    folded = fold_by_store(raw, cheaper=lambda o: (o or {}).get("price") or float("inf"))
    out = {}
    for site, v in folded.items():
        out[site] = v.get("price") if summary \
            else {"price": v.get("price"), "url": v.get("url"),
                  "title": clean_text(v.get("title")),
                  # so "out of stock" can name the shop it applies to
                  "stock": (stock or {}).get(site, "unknown")}
    return out


def _cluster_view(d: dict, summary: bool = False) -> dict:
    """Consumer-facing projection of a cluster doc.

    `summary=True` drops the per-store URL and title, leaving a bare price — for
    list responses where the click-through is not yet needed.

    ⚠️ THE DEFAULT IS DELIBERATELY THE RICH VIEW, and it used to be the opposite
    (`full=False`). That inversion is the fix for a real outage: the demo capture
    called `_cluster_view(doc)`, got the lossy projection, and shipped the ENTIRE
    dataset with no store URLs — every "Go to store" button dead, which is the one
    thing a price comparison exists to deliver. Nothing raised: prices rendered,
    layout was fine, the suite was green.

    The two failure modes are not symmetric. Forgetting the flag now costs bytes;
    forgetting it before cost the product's whole purpose. The quiet path is the
    safe one. (Requested by the frontend after they found the outage.)
    """
    # Idealo-style feature variants: `configs` are split on the category PRIMARY facet
    # (storage for phones/tablets, CPU for laptops). facet_label is the chip text the UI
    # shows ("256GB", "Intel Core i5"); storage_gb is kept for back-compat.
    configs = []
    for c in d.get("configs") or []:
        configs.append({
            "facet_label": c.get("facet_label") or (f"{c['storage_gb']}GB" if c.get("storage_gb") else None),
            "facet_value": c.get("facet_value", c.get("storage_gb")),
            "storage_gb": c.get("storage_gb"),
            "best_price": c.get("best_price"),
            "cheapest_store": c.get("cheapest_store"),
            "n_stores": c.get("n_stores"),
            "spread_pct": c.get("spread_pct"),
            "by_store": _by_store(c.get("best_by_store"), summary),
        })
    # ⭐ Built ONCE and used twice — as the rendered map and as the comparable-store count — so
    # the number can never disagree with the columns it describes.
    by_store = _by_store(d.get("best_by_store"), summary, stock_by_store(d))
    return {
        "cluster_id": d.get("cluster_id"),
        # clean brand+model title (features go in the facet chips, not the title): prefer the
        # built display_name, then the canonical name, then the raw listing as a last resort.
        # canonical_name stays available separately as the "verified as" reference.
        # ⚠️ hygiene.best_title overrides that order in one provable case: display_name is
        # rebuilt from the normalised identity key, so on 1,463 clusters it is the same bag of
        # tokens as a real listing with the order and casing destroyed ("HT S40R" -> "Ht ...
        # S40r"). When it adds no tokens, the real listing title wins.
        "title": best_title(d),
        "display_name": clean_text(d.get("display_name")),
        "representative_title": clean_text(d.get("representative_title")),
        "category": d.get("canonical_category_slug"),
        # Where this CLUSTER sits in the presentation tree (taxonomy_db.browse_nodes,
        # 4,406 nodes over 47 stores), falling back to the 424-node spine when the
        # cluster has no placement.
        # ⛔ Keyed by CLUSTER ID, not by slug: the presentation tree's slugs
        # ("smartphone") and canonical_category_slug ("mobile-phones") share ZERO
        # members, so a slug lookup against browse_nodes returns None every time.
        "category_path": category_path_for_cluster(
            d.get("_id"), d.get("canonical_category_slug")),
        # which feature the variants/prices are split on (storage | cpu)
        "primary_facet": d.get("primary_facet"),
        # secondary feature variants (display/filter chips, not price-split): the distinct
        # RAM / storage / connectivity present — e.g. {"ram":["8GB","16GB"],"storage":[...]}.
        "spec_facets": d.get("spec_facets") or {},
        # accessories (headphones/monitors) are not a reliable cross-store comparison
        # category — the frontend should not headline them as price comparisons.
        "comparison_grade": d.get("canonical_category_slug") in COMPARISON_SLUGS,
        # Demo-dataset provenance (product_clusters_mvp). Absent on product_clusters, so
        # these are False/None there and the UI disclosure disappears by itself.
        # mvp_n_merged > 1 is the ONLY field implying merge risk: mvp_generated is True for
        # all 4,272 grocery clusters, but 2,256 of those are untouched pass-throughs.
        "mvp_generated": bool(d.get("mvp_generated", False)),
        "mvp_rule": d.get("mvp_rule"),
        "mvp_n_merged": d.get("mvp_n_merged"),
        # The engine cluster_ids this row absorbed. Published because without it a
        # merge is a one-way door: 6,039 ids are absorbed across the corpus and a
        # consumer holding one (a reader report, a bookmark) has no way to learn
        # where it went. This is the list that lets it be re-attached.
        "mvp_merged_from": d.get("mvp_merged_from"),
        # The same absorbed clusters, NAMED, so a consumer can ask a human about
        # them. `mvp_merged_from` is identity keys and cannot be rendered.
        "mvp_merged_members": [
            {"cluster_id": m.get("cluster_id"), "title": clean_text(m.get("title"))}
            for m in (d.get("mvp_merged_members") or [])
        ] or None,
        # None when the keyer put a measurement in the brand slot ("14-inch", "3.5mm").
        "brand": clean_brand(d.get("brand")),
        "canonical_name": d.get("canonical_name"),
        "n_listings": d.get("n_listings"),
        "n_stores": d.get("n_stores"),
        # ⛔⛔ THE CARD SAID 20 SHOPS AND THE TABLE COULD PRICE TWO. `n_stores` counts stores
        # holding a LISTING; `best_by_store` holds the ones that survived the engine's gate
        # (delisted, out-of-stock, implausibly-priced and likely-used members cannot price a
        # headline). Measured 2026-08-21: 99% of the smartphone shelf overstated, mean +9.6.
        # On a price-comparison storefront that number IS the promise, so both are published
        # and the renderer is told which one means "compared across".
        #
        # ⭐ COUNTED OFF `by_store`, NOT THE RAW DOC, so the fold that collapses `carrefour` and
        # `carrefour.ke` into one COLUMN also collapses them in the COUNT. Counting the raw map
        # would swap one wrong number for a quieter one.
        "n_stores_priced": len(by_store),
        "stores": fold_stores(d.get("stores")),
        "is_multi_store": d.get("is_multi_store"),
        # two-tier price: best_price/cheapest_store is the CONFIDENT new-retail headline;
        # likely_used_best_price is the classifieds/refurb "asking" tier, shown separately so
        # it never headlines. condition_basis="likely_used" means even the headline is a
        # fallback (no confident retail member) — see data_warning.
        "best_price": d.get("best_price"),
        "cheapest_store": canonical_store(d.get("cheapest_store")),
        "condition_basis": d.get("condition_basis", "new"),
        "n_confident": d.get("n_confident"),
        "n_likely_used": d.get("n_likely_used", d.get("n_used", 0)),
        "likely_used_best_price": d.get("likely_used_best_price", d.get("used_best_price")),
        # back-compat aliases (deprecated; equal to the *_likely_used fields above)
        "n_used": d.get("n_used", 0),
        "used_best_price": d.get("used_best_price"),
        # like-for-like (same config) is the honest spread; cross_store conflates configs
        # ⚠️ A MARKUP: (max - min) / MIN. 139 clusters publish >100%, which is
        # impossible as a saving. Use `saving_pct` for anything shown to a shopper.
        "like_for_like_spread_pct": d.get("like_for_like_spread_pct"),
        "saving_pct": saving_pct(d.get("like_for_like_spread_pct")),
        # The two offers that number compares, so a consumer can SHOW the saving
        # rather than assert it. Also the only place the flavour-merge defect is
        # visible on a page: strawberry at one shop priced against chocolate at
        # the other, both titles quoted verbatim.
        "spread_basis": spread_basis(d),
        "cross_store_spread_pct": d.get("cross_store_spread_pct"),
        "configs": configs,
        "best_by_store": by_store,
        # Buyability + recency. The engine computes both in `gate_members` but stamped
        # them on only 28,754 of 66,406 clusters (groceries, tvs, printers, routers,
        # wearables, desktop-computers and digital-cameras have neither), and this
        # projection then dropped them entirely — so no consumer could tell a live
        # price from a three-month-old one. Recomputed uniformly from members[].
        "availability_basis": availability(d),
        "freshness_basis": freshness(d),
        "last_seen": (ls.isoformat() if (ls := last_seen_at(d)) else None),
        "data_warning": _data_warning(d),
    }


def _check_slug(slug: str | None) -> None:
    if slug and slug not in _SLUGS:
        raise HTTPException(status_code=400, detail=f"unknown slug; expected one of {sorted(_SLUGS)}")


@router.get("/search", response_model=ClusterSearchResponse)
async def search_clusters(
    q: str = Query(..., min_length=1, description="free-text product query, e.g. 'galaxy a55'"),
    slug: str | None = Query(None, description="restrict to a category slug"),
    multi_store_only: bool = Query(False, description="only products compared across >=2 stores"),
    limit: int = Query(20, ge=1, le=100),
):
    """Search products by title/canonical name; returns summary comparison views."""
    _check_slug(slug)
    rx = re.escape(q.strip())
    query: dict = {"$or": [
        {"representative_title": {"$regex": rx, "$options": "i"}},
        {"canonical_name": {"$regex": rx, "$options": "i"}},
    ]}
    if slug:
        query["canonical_category_slug"] = slug
    if multi_store_only:
        query["is_multi_store"] = True
    rows = await CLUSTERS.find(query).sort("n_listings", -1).to_list(length=limit)
    return {"query": q, "count": len(rows),
            "results": [_cluster_view(d, summary=True) for d in rows]}


@router.get("/deals", response_model=ClusterDealsResponse)
async def best_deals(
    slug: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    min_stores: int = Query(2, ge=2, le=10),
):
    """Best REAL deals: largest same-config (like-for-like) cross-store savings.

    Filters to NEW-priced, multi-store clusters with a like-for-like spread — so the
    saving shown is genuine (same storage, new condition), not a config/condition artifact.
    """
    _check_slug(slug)
    query: dict = {
        "is_multi_store": True,
        "condition_basis": "new",
        "n_stores": {"$gte": min_stores},
        # plausible same-config saving only — excludes junk-low/outlier-driven fake "deals"
        "like_for_like_spread_pct": {"$gt": 0, "$lte": MAX_DEAL_SPREAD_PCT},
    }
    # Default deals to the real comparison categories; accessories are still reachable by
    # explicit slug= but are thin/structurally non-comparable (see COMPARISON_SLUGS).
    # The price floor is per-category, so it is expressed as (slug AND its own floor) rather
    # than one global best_price bound — a single bound would apply the 500 KES device floor
    # to groceries and silently drop 78% of them.
    slugs = [slug] if slug else sorted(COMPARISON_SLUGS)
    query["$or"] = [
        {"canonical_category_slug": s, "best_price": {"$gte": min_plausible_price(s)}}
        for s in slugs
    ]
    rows = await CLUSTERS.find(query).sort("like_for_like_spread_pct", -1).to_list(length=limit)
    return {"count": len(rows), "results": [_cluster_view(d, summary=True) for d in rows]}


@router.get("/by-node/{node_slug}", response_model=ClusterNodeResponse)
async def clusters_by_node(
    node_slug: str,
    include_descendants: bool = Query(
        True, description="include every shelf below this one (descendant closure)"),
    multi_store_only: bool = Query(False, description="only products compared across >=2 stores"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """The products on one shelf of the presentation tree, and everything below it.

    ⭐ WHY THIS EXISTS. `browse_nodes` (4,332) and `browse_placements` (100,158) shipped
    2026-08-17 and **nothing queried them by node** — `browse_placements` carried an index on
    `node_slug` no code path used, and the tree's only contribution was a breadcrumb string on
    cluster detail. A tree nothing navigates is a report.

    ⭐ DESCENDANT CLOSURE IS ONE INDEXED QUERY, because `ancestors` is materialised on every
    node. This is also the capability the scraper factory calls *unsayable* against its flat
    `category_slug_map` ("scrape everything under Phones"); it becomes sayable here first.

    ⛔ 404 on an unknown node, never an empty list — an empty list says "this shelf has
    nothing", a 404 says "there is no such shelf", and collapsing the two hides a broken link.

    ⛔ THIS ROUTE MUST STAY ABOVE `/{cluster_id:path}`. That catch-all swallows anything
    declared after it, and the 404 then reads like a missing cluster rather than a routing
    mistake. Guarded by `tests/test_clusters_by_node.py` and by the engine repo's
    `product_identity/tests/test_api_projection_contract.py`.

    ⚠️ `total` is returned alongside `count` so a capped page is never silent truncation.
    """
    node = await BROWSE_NODES.find_one({"_id": node_slug})
    if not node:
        raise HTTPException(status_code=404, detail=f"unknown browse node {node_slug!r}")

    slugs = [node_slug]
    if include_descendants:
        slugs += [d["_id"] async for d in
                  BROWSE_NODES.find({"ancestors": node_slug}, {"_id": 1})]

    # ⚠️ The id list is bounded by the corpus, not by the page: the largest subtree measured
    # 2026-08-17 is `phone-tablet` at 19,226 placements. `_id` is indexed, so the $in is a
    # batch of point lookups; the alternative — paginating placements — loses the best-first
    # sort, which is the whole value of the page.
    ids = [p["_id"] async for p in
           BROWSE_PLACEMENTS.find({"node_slug": {"$in": slugs}}, {"_id": 1})]

    query: dict = {"_id": {"$in": ids}}
    if multi_store_only:
        query["is_multi_store"] = True
    total = await CLUSTERS.count_documents(query)
    rows = await (CLUSTERS.find(query)
                  .sort("n_listings", -1)
                  .skip(offset)
                  .to_list(length=limit))
    return {
        "node": _browse_node_view(
            node, None, await _subtree_totals() if _needs_rollup([node]) else None),
        "count": len(rows),
        "total": total,
        "results": [_cluster_view(d, summary=True) for d in rows],
    }


def _browse_node_view(
    node: dict, labels: dict | None = None, subtree: dict | None = None,
) -> BrowseNodeView:
    """One `browse_nodes` document as the API publishes it. Pure.

    ⛔ ONE construction site for both routes. A `response_model` FILTERS silently, so a field
    added to the publisher and mapped in only one of two hand-written copies vanishes from the
    other with no error anywhere.

    ⛔ `subtree` FALLS BACK TO `n_clusters`, never to 0. When the rollup is unavailable the
    honest degradation is the understated old number; publishing 0 would render a stocked
    department as empty, which is worse than the bug this field fixes.
    """
    return BrowseNodeView(
        slug=node["_id"],
        label=node.get("label"),
        parent_slug=node.get("parent_slug"),
        ancestors=node.get("ancestors") or [],
        # ⛔ `or slug`, never a skip: a dropped entry shifts every later crumb by one.
        ancestor_labels=[(labels or {}).get(a) or a for a in (node.get("ancestors") or [])],
        n_clusters=node.get("n_clusters") or 0,
        n_clusters_subtree=_subtree_of(node, subtree),
        n_stores=node.get("n_stores") or 0,
        coarse=bool(node.get("coarse")),
        browsable=bool(node.get("browsable")),
        unsorted=bool(node.get("unsorted")),
    )


@router.get("/browse-tree", response_model=BrowseTreeResponse)
async def browse_tree(
    parent: str | None = Query(None, description="node whose children to list; omit for roots"),
    browsable_only: bool = Query(
        True, description="withhold shelves with no stock anywhere below them"),
):
    """One level of the presentation tree — a node's children, or the roots.

    ⭐ WHY THIS EXISTS. `/by-node/{slug}` serves the products on a shelf **if you already know
    the slug**, and nothing served the tree's SHAPE — so no client could discover a root or walk
    to a child. The UI therefore still rendered `/pr/categories/{type}/tree` off the retired
    424-node PriceRunner spine while `browse_nodes` sat unnavigable. A tree you cannot enumerate
    is not navigable; this is the same defect one layer up from *"a tree nothing reads is not a
    taxonomy, it is a report."*

    ⭐ ONE LEVEL, NOT THE WHOLE TREE. Lazy expansion keeps the response bounded by a node's
    fan-out rather than by the corpus, and the client already gets `ancestors` on every node for
    breadcrumbs. `parent` is indexed.

    ⛔ 404 on an unknown `parent`, never an empty list — an empty list says "this shelf has no
    children", a 404 says "there is no such shelf", and collapsing the two hides a broken link.

    ⛔ `browsable_only` DEFAULTS TRUE BUT IS A PARAMETER. 3,181 of 4,137 published nodes hold no
    stock anywhere below them, so offering them is offering an empty page. But `browsable` is a
    FLAG the publisher never filters on — the renderer decides — and an auditing caller must
    still be able to see the whole tree, or this endpoint becomes a second, hidden filter.

    ⛔ THIS ROUTE MUST STAY ABOVE `/{cluster_id:path}`, which swallows anything declared after
    it. Guarded by `tests/test_browse_tree_nav.py` reading the source text.
    """
    node = None
    if parent is not None:
        node = await BROWSE_NODES.find_one({"_id": parent})
        if not node:
            raise HTTPException(status_code=404, detail=f"unknown browse node {parent!r}")

    query: dict = {"parent_slug": parent}
    if browsable_only:
        query["browsable"] = True

    rows = [d async for d in BROWSE_NODES.find(query)]
    # ⭐ Stock first: a shopper wants the shelf that has something on it, not the one that sorts
    # first. Ties break on label so two consecutive calls agree.
    #
    # ⛔⛔ SUBTREE STOCK, NOT OWN STOCK, AND THE DIFFERENCE DECIDES A MENU. The client takes the
    # top N roots; ordering them on `n_clusters` swapped 6 of the top 12 (measured 2026-08-19),
    # cutting
    # `Electronics & Computers` (20,772 in subtree, 2,018 of its own) out in favour of `Battery
    # Chargers` (553, one shop). A department that files everything into children sorts last on
    # own stock — which is precisely backwards, because that is what a department IS.
    #
    # ⭐ The number is READ, not computed — the engine publishes `n_clusters_subtree` on every
    # node (roadmap 3.5), so this sorts on a field already present in the rows just fetched.
    subtree = await _subtree_totals() if _needs_rollup(rows + ([node] if node else [])) else None
    rows.sort(key=lambda d: (-_subtree_of(d, subtree), str(d.get("label") or d["_id"])))

    # Labels for the ancestor slugs anything in this response can name, so a client renders a
    # breadcrumb with no extra round trip. Bounded by tree DEPTH (max 7), not by the corpus.
    #
    # ⛔ THE SAME MAP FEEDS THE CHILDREN, NOT ONLY THE PARENT. A child's ancestors are the
    # parent's ancestors PLUS the parent itself — all already in hand. Building it for the parent
    # alone left every child's `ancestor_labels` echoing its `ancestors`: a field that looks
    # populated and carries nothing. It shipped that way because the test asserted on the parent.
    anc_labels: dict = {}
    for anc in (node or {}).get("ancestors") or []:
        doc = await BROWSE_NODES.find_one({"_id": anc})
        if doc and doc.get("label"):
            anc_labels[anc] = doc["label"]
    if node and node.get("label"):
        anc_labels[node["_id"]] = node["label"]

    return BrowseTreeResponse(
        parent=_browse_node_view(node, anc_labels, subtree) if node else None,
        count=len(rows),
        results=[_browse_node_view(d, anc_labels, subtree) for d in rows],
    )


# ============================================================================================
# THE DEPARTMENT SPINE
# ============================================================================================
#
# ⭐ WHY THESE EXIST. `/browse-tree` publishes the tree's SHAPE and `/by-node` its products, and
# both are faithful to a tree with **529 browsable roots** built from 46 shops' own breadcrumbs.
# Faithful is not navigable: 75% of those roots are one shop's private vocabulary and `Laptops`
# resolves in three places. The spine (`app/api/departments.py`) is 21 ruled departments over
# that tree — a presentation mapping, adopting shelves where they already sit.
#
# ⛔ THE SPINE IS NOT A REPLACEMENT FOR THE TREE. It reaches ~45% of placed clusters BY DESIGN;
# the rest stay reachable at `/shelf`. A client that renders departments and drops the "all
# categories" hand-off makes 55,911 clusters unbrowsable.

_SPINE: tuple[dict, int] | None = None
_SPINE_AT: float = 0.0


def reset_spine_cache() -> None:
    """Force the next `_spine()` to re-read. For tests and for a post-publish poke."""
    global _SPINE, _SPINE_AT
    _SPINE, _SPINE_AT = None, 0.0


async def _spine() -> tuple[dict, int]:
    """`(adopted slug -> node doc, distinct clusters across the whole spine)`.

    ⭐ ONE `$in` OVER 46 IDS, NOT A PLACEMENT SCAN. A department's total is the SUM of
    `n_clusters_subtree` over the shelves it adopts, which is exact because a department's
    adopted shelves are mutually disjoint — no adopted slug is an ancestor of another within one
    department, and `tests/test_department_spine.py` asserts that against the live tree. Adopt a
    parent and its child together and this would double-count in silence.

    ⭐⭐ AND THE SPINE-WIDE TOTAL IS EXACT FOR A TREE REASON. Two subtrees of a tree either NEST
    or are DISJOINT, so the union over all adopted shelves is the sum over the MAXIMAL ones —
    those with no adopted ancestor. Measured 2026-08-21: sum of the 21 rows is 46,914, dropping
    the two nested shelves (`tablet` 720, `phone-1a5a7a` 67) gives **46,127**, which is exactly
    the distinct union counted from `browse_placements`. The 787 difference is `tablet` counted
    twice and `phone-1a5a7a` three times.
    """
    global _SPINE, _SPINE_AT
    if _SPINE is not None and (time.monotonic() - _SPINE_AT) <= BROWSE_TTL_SECONDS:
        return _SPINE
    try:
        docs = {d["_id"]: d async for d in
                BROWSE_NODES.find({"_id": {"$in": list(ADOPTED_SLUGS)}})}
    except Exception:
        # ⛔ Same contract as the tree routes: navigation degrades, never 500s.
        return _SPINE or ({}, 0)
    adopted = set(docs)
    total = sum(_subtree_of(d, None) for slug, d in docs.items()
                if not (set(d.get("ancestors") or []) & adopted))
    _SPINE, _SPINE_AT = (docs, total), time.monotonic()
    return _SPINE


def _department_view(dept: Department, docs: dict) -> DepartmentView:
    """One ruled department as the API publishes it. Pure.

    ⛔ ONE construction site for both routes — a `response_model` FILTERS silently, so a field
    mapped in only one of two hand-written copies vanishes from the other with no error.
    """
    live = [docs[s] for s in dept.adopts if s in docs]
    unresolved = [s for s in dept.adopts if s not in docs]

    # ⭐ Overlap is a TREE fact, read off the materialised `ancestors`: this department overlaps
    # another when one of its shelves sits inside a shelf that one adopts. Ruled and deliberate —
    # `tablet` is a descendant of `computer`, so all 720 of Tablets is also in Computers.
    reach = {s for d in live for s in [d["_id"], *(d.get("ancestors") or [])]}
    mine = set(dept.adopts)
    overlaps = sorted(
        other.id for other in DEPARTMENTS
        if other.id != dept.id and (
            reach & set(other.adopts)
            or mine & {a for s in other.adopts if s in docs
                       for a in (docs[s].get("ancestors") or [])}
        )
    )
    return DepartmentView(
        id=dept.id,
        label=dept.label,
        adopts=list(dept.adopts),
        n_clusters=sum(_subtree_of(d, None) for d in live),
        # ⚠️ A LOWER BOUND, and labelled as one. `browse_nodes` publishes a span per node, not
        # the store list, so the union across shelves is not derivable without walking clusters.
        n_stores=max([d.get("n_stores") or 0 for d in live] or [0]),
        unresolved=unresolved,
        overlaps=overlaps,
        notes=list(dept.notes),
    )


@router.get("/departments", response_model=DepartmentsResponse)
async def departments():
    """The 21 ruled departments — the storefront's curated entry into the presentation tree.

    ⭐ ORDERED EDITORIALLY, NOT BY STOCK, and the order is part of the ruling: phones → computing
    → media → accessories → personal care → grocery → home. `Kitchen` (1,857) sits below
    `Bakery` (425) because a shopper reads a storefront by domain, not by inventory.

    ⭐⭐ AND THERE IS NO TOP-N CUT LEFT TO GET WRONG. A surface renders all 21 of these. The panel
    used to take the top 12 of 529 roots, where ordering on own stock instead of subtree stock
    swapped SIX of the twelve — cutting `Electronics & Computers` (20,772 clusters) in favour of
    `Battery Chargers` (553, one shop). That whole class of defect is gone rather than fixed.

    ⛔ `unresolved` IS THE FIELD TO WATCH. It is normally empty. Non-empty means the engine
    republished the tree without a node a person ruled into a department, so that department is
    quietly smaller than it was ruled to be. `tests/test_department_spine.py` fails on it — the
    endpoint reports rather than 500s, because a storefront that will not render is worse than
    one department short a shelf.

    ⛔ THIS ROUTE MUST STAY ABOVE `/{cluster_id:path}`, which swallows anything declared after
    it. Guarded by `tests/test_departments_api.py` reading the source text.
    """
    docs, total = await _spine()
    return DepartmentsResponse(
        count=len(DEPARTMENTS),
        results=[_department_view(d, docs) for d in DEPARTMENTS],
        n_clusters_total=total,
    )


@router.get("/by-department/{department_id}", response_model=DepartmentClustersResponse)
async def clusters_by_department(
    department_id: str,
    multi_store_only: bool = Query(False, description="only products compared across >=2 stores"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """The products across every shelf a department adopts.

    ⭐ NO `include_descendants` PARAMETER, DELIBERATELY. Adoption *is* the closure — a department
    that adopted a shelf without its subtree would be a different ruling, and offering the switch
    would imply it is one page's choice rather than the spine's meaning.

    ⭐ `total` COMES FROM THE SAME UNION THE MENU'S `n_clusters` DOES, so a department tile and
    the page it links to agree by CONSTRUCTION rather than by care. That is the assertion
    `verify_categories.py` makes, and the defect it exists to catch: `Laptops` adopts three
    shelves totalling 1,530, while `/shelf/laptop` alone renders 655.

    ⛔ 404 on an unknown department, never an empty list — matching `/by-node` and `/browse-tree`.
    An empty list says "this department has nothing"; a 404 says "there is no such department".

    ⛔ THIS ROUTE MUST STAY ABOVE `/{cluster_id:path}`. Guarded by `tests/test_departments_api.py`.
    """
    dept = BY_ID.get(department_id)
    if not dept:
        raise HTTPException(status_code=404, detail=f"unknown department {department_id!r}")

    docs, _ = await _spine()
    live = [s for s in dept.adopts if s in docs]

    # Every shelf below every adopted shelf. `ancestors` is materialised and indexed, so this is
    # one query per adopted root rather than a walk.
    slugs = set(live)
    for root in live:
        slugs.update([d["_id"] async for d in
                      BROWSE_NODES.find({"ancestors": root}, {"_id": 1})])

    ids = [p["_id"] async for p in
           BROWSE_PLACEMENTS.find({"node_slug": {"$in": list(slugs)}}, {"_id": 1})]

    query: dict = {"_id": {"$in": ids}}
    if multi_store_only:
        query["is_multi_store"] = True
    total = await CLUSTERS.count_documents(query)
    rows = await (CLUSTERS.find(query)
                  .sort("n_listings", -1)
                  .skip(offset)
                  .to_list(length=limit))

    # ⭐ The adopted shelves themselves, so a department page renders its subcategory grid with
    # no request per shelf — ordered by stock, like every other listing this API serves.
    shelves = sorted((docs[s] for s in live), key=lambda d: -_subtree_of(d, None))
    return {
        "department": _department_view(dept, docs),
        "shelves": [_browse_node_view(d, None, None) for d in shelves],
        "count": len(rows),
        "total": total,
        "results": [_cluster_view(d, summary=True) for d in rows],
    }


@router.get("/{cluster_id:path}", response_model=ClusterView)
async def cluster_detail(cluster_id: str):
    """Full comparison for one product, including per-store URLs to click through."""
    d = await CLUSTERS.find_one({"_id": cluster_id})
    if not d:
        raise HTTPException(status_code=404, detail="cluster not found")
    return _cluster_view(d)

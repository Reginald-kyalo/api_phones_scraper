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

from fastapi import APIRouter, HTTPException, Query

from app.api.hygiene import (
    availability,
    best_title,
    canonical_store,
    clean_brand,
    fold_by_store,
    fold_stores,
    freshness,
    last_seen_at,
)
from app.api.schemas.clusters import (
    ClusterDealsResponse,
    ClusterSearchResponse,
    ClusterView,
)
from app.database import product_matching_db

router = APIRouter(prefix="/api/clusters", tags=["clusters"])

CLUSTERS = product_matching_db[os.getenv("CLUSTERS_COLLECTION", "product_clusters")]
# Every canonical slug holding >=2 multi-store clusters (measured 2026-07-25 against
# product_clusters_mvp). A slug missing here 400s the whole category, which is how
# groceries stayed invisible before 7226de12 — audio-systems (120 multi-store),
# wearables (59), speakers (19), desktop-computers (2) and routers (2) were hidden the
# same way. Reachability is cheap and reversible; comparability is COMPARISON_SLUGS below.
_SLUGS = {
    "mobile-phones", "laptops", "tablets", "headphones", "monitors", "groceries",
    "audio-systems", "wearables", "speakers", "desktop-computers", "routers",
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


def _by_store(raw: dict, full: bool) -> dict:
    """best_by_store → {site: price} (summary) or {site: {price,url,title}} (detail).

    Keys are canonicalised first, so a retailer crawled under both a bare name and
    a domain (`carrefour` / `carrefour.ke`) is one column, not two.
    """
    folded = fold_by_store(raw, cheaper=lambda o: (o or {}).get("price") or float("inf"))
    out = {}
    for site, v in folded.items():
        out[site] = {"price": v.get("price"), "url": v.get("url"), "title": v.get("title")} if full \
            else v.get("price")
    return out


def _cluster_view(d: dict, full: bool = False) -> dict:
    """Consumer-facing projection of a cluster doc. `full` adds store URLs (detail view)."""
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
            "by_store": _by_store(c.get("best_by_store"), full),
        })
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
        "display_name": d.get("display_name"),
        "representative_title": d.get("representative_title"),
        "category": d.get("canonical_category_slug"),
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
        # None when the keyer put a measurement in the brand slot ("14-inch", "3.5mm").
        "brand": clean_brand(d.get("brand")),
        "canonical_name": d.get("canonical_name"),
        "n_listings": d.get("n_listings"),
        "n_stores": d.get("n_stores"),
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
        "like_for_like_spread_pct": d.get("like_for_like_spread_pct"),
        "cross_store_spread_pct": d.get("cross_store_spread_pct"),
        "configs": configs,
        "best_by_store": _by_store(d.get("best_by_store"), full),
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
    return {"query": q, "count": len(rows), "results": [_cluster_view(d) for d in rows]}


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
    return {"count": len(rows), "results": [_cluster_view(d) for d in rows]}


@router.get("/{cluster_id:path}", response_model=ClusterView)
async def cluster_detail(cluster_id: str):
    """Full comparison for one product, including per-store URLs to click through."""
    d = await CLUSTERS.find_one({"_id": cluster_id})
    if not d:
        raise HTTPException(status_code=404, detail="cluster not found")
    return _cluster_view(d, full=True)

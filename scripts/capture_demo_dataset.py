"""Capture the MVP demo dataset into static JSON for the hosted demo.

Reads `product_matching_db.product_clusters_mvp` (never writes), projects every
cluster through the API's own `_cluster_view` so fixtures match the live
contract by construction, and shards the result into
`dealsonline_ui_ux_mock/public/demo/`.

Usage:
    apienv/bin/python -m scripts.capture_demo_dataset

Mongo and the API module are imported inside main() so the pure helpers below
stay unit-testable without a database.

⭐ NOTHING HERE CAPS THE DATASET FOR SIZE. The first capture took only
`n_stores >= 2` (6,592 of 66,406 clusters) and the top 400 deals. Both were
arbitrary, and the first cost real fidelity: tvs, printers and digital-cameras
have zero multi-store clusters, so three whole categories were missing from a
demo whose corpus actually contains them. The whole catalogue now ships, and
the only filters left are the ones the live API itself applies (`_is_deal`).
Everything that used to be a cap is now a *shard boundary* instead — sizing,
not selection, is what SHARD_TARGET_BYTES and PAGE_SIZE control.
"""
from __future__ import annotations

import hashlib
import json
import math
import os
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from scripts.category_purity import is_off_category

SOURCE_COLLECTION = "product_clusters_mvp"
OUT = Path(__file__).resolve().parents[1] / "dealsonline_ui_ux_mock" / "public" / "demo"

# 1 = the entire catalogue, single-store clusters included. A single-store
# cluster is still a real product page (one store, no comparison) and is what
# makes the corpus look its true size; a comparison site that only lists
# already-compared products looks ~10x emptier than it is.
#
# The floor is 1 rather than 0 on QUALITY, not size: all 3,738 clusters at
# n_stores == 0 have `stores: []` AND `best_price: None` (verified 2026-07-25 —
# zero exceptions), so they would render as a card with no price and no store to
# click. The count is reported in the manifest so the exclusion stays visible.
MIN_STORES = int(os.getenv("DEMO_MIN_STORES", "1"))

# Category listings and the deals feed are paginated, never truncated.
PAGE_SIZE = 500

# Detail shards are addressed by a hash of the cluster_id rather than a lookup
# map: a 6,592-entry shard_of map cost 550 KB in manifest.json, which every
# visitor paid on first paint just to open one product. The frontend recomputes
# this exact function in demoSource.ts — keep the two in lockstep.
#
# Bucket COUNT is per category and derived from measured bytes, so opening one
# product costs roughly the same whether it is a router (2 clusters) or a
# grocery item (33k). A fixed 16 would have made one grocery shard ~2.7 MB.
SHARD_TARGET_BYTES = 400_000
MIN_BUCKETS = 4
MAX_BUCKETS = 999          # shard suffix is zero-padded to 3 digits, both sides
SHARD_DIGITS = 3


def pages_for(n_rows: int, page_size: int = PAGE_SIZE) -> int:
    """Pages a listing of `n_rows` occupies. Always >=1 so an empty category
    still has a fetchable page 0 rather than a 404."""
    return max(1, math.ceil(n_rows / page_size))


def buckets_for(total_bytes: int, target: int = SHARD_TARGET_BYTES) -> int:
    """Detail shards for one category, sized from its ACTUAL serialized bytes.

    Measured rather than assumed: grocery details average ~1.3 KB and device
    details differ enough that a per-doc constant would misplan both.
    """
    return max(MIN_BUCKETS, min(MAX_BUCKETS, math.ceil(total_bytes / target))) \
        if total_bytes > 0 else MIN_BUCKETS


def fnv1a(text: str) -> int:
    """32-bit FNV-1a. Trivially portable to JS; not security-sensitive."""
    h = 0x811C9DC5
    for byte in text.encode("utf-8"):
        h = ((h ^ byte) * 0x01000193) & 0xFFFFFFFF
    return h


def shard_for(cluster_id: str, slug: str, buckets: int) -> str:
    return f"{slug}-{fnv1a(cluster_id) % buckets:0{SHARD_DIGITS}d}"

# cleanshelf listings usually carry no image, and are unreliable when they do.
EXCLUDED_IMAGE_SITES = {"cleanshelf"}

# Measured 2026-07-25: only 798 of 6,592 multi-store clusters (12.1%) have >=2
# real points, and groceries have none. A one-point "trend" is not a trend, so
# the chart is omitted rather than padded.
MIN_HISTORY_POINTS = 2

SUMMARY_FIELDS = [
    "cluster_id", "display_name", "title", "brand", "category", "best_price",
    "n_stores", "n_listings", "cheapest_store", "like_for_like_spread_pct",
    "condition_basis", "data_warning", "comparison_grade", "is_multi_store",
    "off_category", "mvp_generated", "mvp_n_merged", "image",
]


def _usable(url) -> bool:
    return isinstance(url, str) and url.strip().startswith("http")


def pick_image(cluster: dict, device_images: dict) -> str | None:
    """One real image per cluster, chosen randomly but stably.

    Groceries carry images inline on members[]; devices carry none there and
    resolve through compiled_products instead. Selection is seeded on cluster_id
    so a rebuild never reshuffles the page.
    """
    candidates = []
    for member in cluster.get("members") or []:
        if (member.get("site") or "").lower() in EXCLUDED_IMAGE_SITES:
            continue
        if _usable(member.get("image")):
            candidates.append(member["image"].strip())
        elif _usable(device_images.get(member.get("product_id"))):
            candidates.append(device_images[member["product_id"]].strip())
    if not candidates:
        return None
    candidates.sort()
    seed = hashlib.sha256(str(cluster.get("cluster_id", "")).encode()).digest()
    return candidates[int.from_bytes(seed[:8], "big") % len(candidates)]


def build_history(cluster: dict, histories: dict) -> list | None:
    """Longest real price series among a cluster's members, or None."""
    best: list = []
    for member in cluster.get("members") or []:
        series = histories.get(member.get("product_id")) or []
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


def _summary(view: dict) -> dict:
    return {k: view.get(k) for k in SUMMARY_FIELDS}


def _fold(text) -> str:
    return " ".join(str(text or "").lower().split())


def _write(path: Path, payload) -> int:
    text = json.dumps(payload, separators=(",", ":"))
    path.write_text(text)
    return len(text)


def main() -> None:
    os.environ.setdefault("CLUSTERS_COLLECTION", SOURCE_COLLECTION)
    from pymongo import MongoClient

    from app.api.routes.clusters import (
        COMPARISON_SLUGS,
        MAX_DEAL_SPREAD_PCT,
        _cluster_view,
        min_plausible_price,
    )

    db = MongoClient("mongodb://localhost:27017", serverSelectionTimeoutMS=8000)["product_matching_db"]
    source = db[SOURCE_COLLECTION]
    docs = list(source.find({"n_stores": {"$gte": MIN_STORES}}))
    unpriced = source.count_documents({"n_stores": {"$not": {"$gte": MIN_STORES}}})
    print(f"clusters: {len(docs)} (min_stores={MIN_STORES}, {unpriced} unpriced skipped)")

    member_ids = [m.get("product_id") for d in docs for m in (d.get("members") or [])]
    device_images: dict = {}
    histories: dict = {}
    for cp in db["compiled_products"].find(
        {"product_id": {"$in": member_ids}},
        {"product_id": 1, "product_image": 1, "price_history": 1},
    ):
        if cp.get("product_image"):
            device_images[cp["product_id"]] = cp["product_image"]
        if cp.get("price_history"):
            histories[cp["product_id"]] = cp["price_history"]
    print(f"compiled_products: {len(device_images)} images, {len(histories)} histories")

    views = []
    for doc in docs:
        view = _cluster_view(doc)
        view["image"] = pick_image(doc, device_images)
        view["price_history"] = build_history(doc, histories)
        # Demoted, never dropped: the row stays browsable and its detail page still
        # resolves. Category slugs come straight from the store's own category page,
        # so a phone case really can arrive filed as `headphones`.
        view["off_category"] = is_off_category(view.get("title"), view.get("category"))
        views.append(view)

    by_cat: dict = defaultdict(list)
    for view in views:
        by_cat[view.get("category") or "other"].append(view)

    for sub in ("categories", "clusters", "search"):
        (OUT / sub).mkdir(parents=True, exist_ok=True)
    # A re-capture with different bucket counts leaves the previous run's shards
    # behind; stale files would still be served and could shadow a moved cluster.
    for sub in ("categories", "clusters", "search"):
        for old in (OUT / sub).glob("*.json"):
            old.unlink()
    # Pre-pagination layout: single deals.json / search.json at the root.
    for old in list(OUT.glob("deals*.json")) + list(OUT.glob("search.json")):
        old.unlink()

    cat_meta: dict = {}
    for slug, rows in by_cat.items():
        # Comparable products first: spread ranks the multi-store ones, and
        # single-store clusters (spread None -> 0) fall to the tail. Off-category
        # rows sort below everything. cluster_id breaks ties so page N holds the
        # same products on every rebuild — Mongo's scan order is not guaranteed,
        # and without this a re-capture silently reshuffles every listing page.
        # Ranked on signal, then made deterministic. Sorting by cluster_id alone put
        # the alphabetically-first titles on page 1 — which are exactly the worst
        # ones ("14 43", "28 Holes Scarf"), because a junk title tends to start with
        # a number. cluster_id survives only as the final tie-break, because Mongo's
        # scan order is not guaranteed and a re-capture would otherwise reshuffle
        # every listing page under the reader.
        rows.sort(key=lambda r: (
            bool(r.get("off_category")),           # demoted rows last
            not r.get("image"),                    # a card with no image looks broken
            -(r.get("like_for_like_spread_pct") or 0),   # real cross-store savings
            -(r.get("n_stores") or 0),
            -(r.get("n_listings") or 0),           # well-represented products first
            r.get("cluster_id") or "",
        ))

        pages = pages_for(len(rows))
        for page in range(pages):
            chunk = rows[page * PAGE_SIZE:(page + 1) * PAGE_SIZE]
            _write(OUT / "categories" / f"{slug}-{page:0{SHARD_DIGITS}d}.json",
                   [_summary(r) for r in chunk])

        detail_bytes = sum(len(json.dumps(r, separators=(",", ":"))) for r in rows)
        n_buckets = buckets_for(detail_bytes)
        shards: dict = defaultdict(dict)
        for row in rows:
            shards[shard_for(row["cluster_id"], slug, n_buckets)][row["cluster_id"]] = row
        for name, group in shards.items():
            _write(OUT / "clusters" / f"{name}.json", group)

        # Search index sharded by category so a category-scoped search pays only
        # for its own slice; a global search fetches the shards in parallel.
        _write(OUT / "search" / f"{slug}.json", [
            {"id": r["cluster_id"], "t": _fold(r.get("display_name") or r.get("title")),
             "c": r.get("category"), "p": r.get("best_price")}
            for r in rows
        ])

        cat_meta[slug] = {
            "slug": slug,
            "count": len(rows),
            "multi_store": sum(1 for r in rows if r.get("is_multi_store")),
            "comparison_grade": slug in COMPARISON_SLUGS,
            "pages": pages,
            "buckets": n_buckets,
        }

    # Reproduce /api/clusters/deals exactly. Shape fidelity is not enough: without
    # the same guards the fixture surfaces rows the live API filters out — the first
    # run headlined a 10 KES grocery item that the per-category price floor rejects.
    def _is_deal(v: dict) -> bool:
        spread = v.get("like_for_like_spread_pct")
        return (
            bool(v.get("comparison_grade"))
            and not v.get("off_category")
            and bool(v.get("is_multi_store"))
            and v.get("condition_basis") == "new"
            and (v.get("n_stores") or 0) >= 2
            and isinstance(spread, (int, float))
            and 0 < spread <= MAX_DEAL_SPREAD_PCT
            and (v.get("best_price") or 0) >= min_plausible_price(v.get("category"))
        )

    # Every qualifying deal, paginated — not a top-N slice. 400 was an arbitrary
    # number that hid 88% of the real deals the same filter accepts.
    deals = sorted(
        (v for v in views if _is_deal(v)),
        key=lambda r: (-(r.get("like_for_like_spread_pct") or 0), r.get("cluster_id") or ""),
    )
    deal_pages = pages_for(len(deals))
    for page in range(deal_pages):
        _write(OUT / f"deals-{page:0{SHARD_DIGITS}d}.json",
               [_summary(r) for r in deals[page * PAGE_SIZE:(page + 1) * PAGE_SIZE]])

    manifest = {
        "captured_at": datetime.now().isoformat(timespec="seconds"),
        "source_collection": SOURCE_COLLECTION,
        "min_stores": MIN_STORES,
        "page_size": PAGE_SIZE,
        "total_clusters": len(views),
        "multi_store_clusters": sum(1 for v in views if v.get("is_multi_store")),
        # Skipped for having no price and no store, never for size. See MIN_STORES.
        "excluded_unpriced": unpriced,
        "total_stores": len({s for v in views for s in (v.get("stores") or [])}),
        "with_image": sum(1 for v in views if v.get("image")),
        "with_history": sum(1 for v in views if v.get("price_history")),
        "merged": sum(1 for v in views if (v.get("mvp_n_merged") or 0) > 1),
        # Demoted by the title gate, not removed. See scripts/category_purity.py.
        "off_category": sum(1 for v in views if v.get("off_category")),
        "deals": {"count": len(deals), "pages": deal_pages},
        "categories": sorted(cat_meta.values(), key=lambda c: -c["count"]),
    }
    _write(OUT / "manifest.json", manifest)
    print(
        f"wrote {len(views)} clusters "
        f"({manifest['multi_store_clusters']} multi-store), "
        f"{manifest['with_image']} images, {manifest['with_history']} histories, "
        f"{manifest['merged']} merged, {len(deals)} deals over {deal_pages} pages"
    )


if __name__ == "__main__":
    main()

"""Capture the MVP demo dataset into static JSON for the hosted demo.

Reads `product_matching_db.product_clusters_mvp` (never writes), projects every
multi-store cluster through the API's own `_cluster_view` so fixtures match the
live contract by construction, and shards the result into
`dealsonline_ui_ux_mock/public/demo/`.

Usage:
    apienv/bin/python -m scripts.capture_demo_dataset

Mongo and the API module are imported inside main() so the pure helpers below
stay unit-testable without a database.
"""
from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path

SOURCE_COLLECTION = "product_clusters_mvp"
OUT = Path(__file__).resolve().parents[1] / "dealsonline_ui_ux_mock" / "public" / "demo"

TOP_DEALS = 400

# Detail shards are addressed by a hash of the cluster_id rather than a lookup
# map: a 6,592-entry shard_of map cost 550 KB in manifest.json, which every
# visitor paid on first paint just to open one product. The frontend recomputes
# this exact function in demoSource.ts — keep the two in lockstep.
DETAIL_BUCKETS = 16


def fnv1a(text: str) -> int:
    """32-bit FNV-1a. Trivially portable to JS; not security-sensitive."""
    h = 0x811C9DC5
    for byte in text.encode("utf-8"):
        h = ((h ^ byte) * 0x01000193) & 0xFFFFFFFF
    return h


def shard_for(cluster_id: str, slug: str) -> str:
    return f"{slug}-{fnv1a(cluster_id) % DETAIL_BUCKETS:02d}"

# cleanshelf listings usually carry no image, and are unreliable when they do.
EXCLUDED_IMAGE_SITES = {"cleanshelf"}

# Measured 2026-07-25: only 798 of 6,592 clusters (12.1%) have >=2 real points,
# and groceries have none. A one-point "trend" is not a trend, so the chart is
# omitted rather than padded.
MIN_HISTORY_POINTS = 2

SUMMARY_FIELDS = [
    "cluster_id", "display_name", "title", "brand", "category", "best_price",
    "n_stores", "n_listings", "cheapest_store", "like_for_like_spread_pct",
    "condition_basis", "data_warning", "comparison_grade",
    "mvp_generated", "mvp_n_merged", "image",
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


def main() -> None:
    import os

    os.environ.setdefault("CLUSTERS_COLLECTION", SOURCE_COLLECTION)
    from pymongo import MongoClient

    from app.api.routes.clusters import (
        COMPARISON_SLUGS,
        MAX_DEAL_SPREAD_PCT,
        _cluster_view,
        min_plausible_price,
    )

    db = MongoClient("mongodb://localhost:27017", serverSelectionTimeoutMS=8000)["product_matching_db"]
    docs = list(db[SOURCE_COLLECTION].find({"n_stores": {"$gte": 2}}))
    print(f"clusters: {len(docs)}")

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
        views.append(view)

    by_cat: dict = defaultdict(list)
    for view in views:
        by_cat[view.get("category") or "other"].append(view)

    (OUT / "categories").mkdir(parents=True, exist_ok=True)
    (OUT / "clusters").mkdir(parents=True, exist_ok=True)

    for slug, rows in by_cat.items():
        rows.sort(key=lambda r: -(r.get("like_for_like_spread_pct") or 0))
        (OUT / "categories" / f"{slug}.json").write_text(
            json.dumps([_summary(r) for r in rows], separators=(",", ":"))
        )
        buckets: dict = defaultdict(dict)
        for row in rows:
            buckets[shard_for(row["cluster_id"], slug)][row["cluster_id"]] = row
        for name, chunk in buckets.items():
            (OUT / "clusters" / f"{name}.json").write_text(
                json.dumps(chunk, separators=(",", ":"))
            )

    # Reproduce /api/clusters/deals exactly. Shape fidelity is not enough: without
    # the same guards the fixture surfaces rows the live API filters out — the first
    # run headlined a 10 KES grocery item that the per-category price floor rejects.
    def _is_deal(v: dict) -> bool:
        spread = v.get("like_for_like_spread_pct")
        return (
            bool(v.get("comparison_grade"))
            and bool(v.get("is_multi_store"))
            and v.get("condition_basis") == "new"
            and (v.get("n_stores") or 0) >= 2
            and isinstance(spread, (int, float))
            and 0 < spread <= MAX_DEAL_SPREAD_PCT
            and (v.get("best_price") or 0) >= min_plausible_price(v.get("category"))
        )

    deals = sorted(
        (v for v in views if _is_deal(v)),
        key=lambda r: -(r.get("like_for_like_spread_pct") or 0),
    )[:TOP_DEALS]
    (OUT / "deals.json").write_text(json.dumps([_summary(r) for r in deals], separators=(",", ":")))

    (OUT / "search.json").write_text(json.dumps(
        [
            {
                "id": v["cluster_id"],
                "t": _fold(v.get("display_name") or v.get("title")),
                "c": v.get("category"),
                "p": v.get("best_price"),
            }
            for v in views
        ],
        separators=(",", ":"),
    ))

    manifest = {
        "captured_at": datetime.now().isoformat(timespec="seconds"),
        "source_collection": SOURCE_COLLECTION,
        "total_clusters": len(views),
        "total_stores": len({s for v in views for s in (v.get("stores") or [])}),
        "with_image": sum(1 for v in views if v.get("image")),
        "with_history": sum(1 for v in views if v.get("price_history")),
        "merged": sum(1 for v in views if (v.get("mvp_n_merged") or 0) > 1),
        "deals": len(deals),
        "detail_buckets": DETAIL_BUCKETS,
        "categories": sorted(
            (
                {"slug": s, "count": len(r), "comparison_grade": s in COMPARISON_SLUGS}
                for s, r in by_cat.items()
            ),
            key=lambda c: -c["count"],
        ),
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, separators=(",", ":")))
    print(
        f"wrote {len(views)} clusters, {manifest['with_image']} images, "
        f"{manifest['with_history']} histories, {manifest['merged']} merged, "
        f"{len(deals)} deals"
    )


if __name__ == "__main__":
    main()

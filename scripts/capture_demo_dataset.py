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
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from scripts.category_purity import is_off_category

SOURCE_COLLECTION = "product_clusters_mvp"
OUT = Path(__file__).resolve().parents[1] / "dealsonline_ui_ux_mock" / "public" / "demo"

# What actually ships in git. `public/demo/` itself is ignored — see pack_dataset.
ARCHIVE = OUT.parents[1] / "data" / "demo-dataset.tar.gz"

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

# A store's own "no photo" asset is worse than no image at all: the UI renders a
# neutral mark for a missing image, but a grey vector served from a retailer CDN
# looks like a product photo that failed to load.
#
# Measured 2026-07-26: 846 shipped clusters (1.4%) headlined one — 839 of them
# groceries, almost entirely Carrefour's `Plus_1_<hash>.svg` MAF default. Every
# real product photo in the corpus is a raster; no genuine one is an SVG.
_PLACEHOLDER_IMAGE = re.compile(r"\.svg($|\?)|placeholder|no-?image|default[-_]?img", re.I)


def is_placeholder_image(url: str) -> bool:
    return bool(_PLACEHOLDER_IMAGE.search(url or ""))

# A one-point "trend" is not a trend, so the chart is omitted rather than padded.
#
# ⚠️ TWO DISTINCT DATES, not two points. The sources genuinely emit several rows
# carrying the same timestamp (a re-scrape that recorded both an old and a new
# price at one instant), and two prices on one date draws a line that says
# something the data does not.
MIN_HISTORY_POINTS = 2

# Price history lives in two places under three different key spellings, and the
# capture originally read a fourth that exists in neither — so every one of the
# 3,556 series it produced had an EMPTY timestamp on every point. Nothing looked
# wrong: the chart rendered, the tests passed, the count in the manifest was
# real. Same shape as the `full=False` bug.
#
#   compiled_products.price_history   {"at": iso, "price": n}     devices
#   <site>_products.prices            {"timestamp": iso, "amount": n}  every store
#
# ⭐ The second source is why groceries had NO history at all. Grocery cluster
# members are not in `compiled_products` (measured: 0 of them resolve), because
# `cluster_grocery` reads `marketplace_scraper_db` directly. The history was
# always there, in the collection the clusterer itself reads, and nothing looked.
_PRICE_KEYS = ("price", "amount")
_TIME_KEYS = ("at", "timestamp", "date", "t")


def _point(raw: dict) -> dict | None:
    """Normalise one price observation from any of the three source shapes."""
    price = next((raw[k] for k in _PRICE_KEYS if raw.get(k) is not None), None)
    when = next((raw[k] for k in _TIME_KEYS if raw.get(k)), None)
    if price is None or not when:
        return None
    return {"t": str(when), "price": price}


def normalise_series(raw_points) -> list:
    """Sorted, de-duplicated points. Empty when there is no real trend to draw."""
    points = [p for r in (raw_points or []) if (p := _point(r))]
    unique = {(p["t"], p["price"]): p for p in points}
    series = sorted(unique.values(), key=lambda p: p["t"])
    if len({p["t"] for p in series}) < MIN_HISTORY_POINTS:
        return []
    return series

SUMMARY_FIELDS = [
    "cluster_id", "display_name", "title", "brand", "category", "best_price",
    "n_stores", "n_listings", "cheapest_store", "like_for_like_spread_pct",
    # saving_pct rides along because the DISCOUNT BADGE lives on cards, which are
    # built from summaries. Without it the only percentage a card can reach is
    # like_for_like_spread_pct — a markup — which is exactly how a "3750% off"
    # badge shipped.
    "saving_pct",
    "condition_basis", "data_warning", "comparison_grade", "is_multi_store",
    "off_category", "mvp_generated", "mvp_n_merged", "image",
]


def _usable(url) -> bool:
    return (isinstance(url, str) and url.strip().startswith("http")
            and not is_placeholder_image(url))


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
    """Longest real price series among a cluster's members, or None.

    Longest, not merged: two stores' series spliced together would draw a single
    line alternating between two retailers' prices, which reads as volatility
    that never happened. One member, one line.
    """
    best: list = []
    for member in cluster.get("members") or []:
        series = normalise_series(histories.get(member.get("product_id")))
        if len(series) > len(best):
            best = series
    return best or None


# Cluster members name their store the way their pipeline writes it — grocery
# clusters use bare names ("carrefour"), device clusters use domains
# ("jumia.co.ke") — while the raw collections are always "<stem>_products".
_STORE_TLDS = (".co.ke", ".or.ke", ".com", ".net", ".online", ".shop", ".store", ".ke")


def raw_collection_for(site: str | None, existing: set) -> str | None:
    """Raw collection holding a store's listings, or None if it has none.

    Checked against the collections that actually exist rather than constructed
    blindly: a miss must be a silent skip, not a query against a typo'd name that
    returns zero rows and looks like "this store has no history".
    """
    stem = (site or "").lower().strip()
    for tld in _STORE_TLDS:
        if stem.endswith(tld):
            stem = stem[: -len(tld)]
            break
    name = f"{stem}_products"
    return name if stem and name in existing else None


# The chosen image plus the other real photos the cluster's listings carry, so
# "wrong picture" can be CORRECTED and not merely flagged. Measured 2026-07-26:
# 12,705 clusters (20.7% of the 61,473 shipped) have >=2 distinct non-placeholder
# images, counted from the captured shards — the member image and the device-image
# fallback together, which is why a listings-only count comes out at half this.
#
# Capped: a reader choosing between images needs a handful, not thirty, and the
# detail shards are already the largest thing the demo ships.
MAX_IMAGE_CANDIDATES = 6


def image_candidates(cluster: dict, device_images: dict) -> list:
    """Every distinct real image for a cluster, chosen one first."""
    seen = []
    for member in cluster.get("members") or []:
        if (member.get("site") or "").lower() in EXCLUDED_IMAGE_SITES:
            continue
        for url in (member.get("image"), device_images.get(member.get("product_id"))):
            if _usable(url) and url.strip() not in seen:
                seen.append(url.strip())
    chosen = pick_image(cluster, device_images)
    if chosen and chosen in seen:
        seen.remove(chosen)
    return ([chosen] if chosen else []) + seen[: MAX_IMAGE_CANDIDATES - 1]


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

    from app.api.hygiene import STALE_AFTER_DAYS, is_stale, is_unbuyable
    from app.api.taxonomy import category_path
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
    print(f"clusters: {len(docs)} (min_stores={MIN_STORES}, {unpriced} delisted/unpriced skipped)")

    # ⭐ QUALITY EXCLUSIONS — a product nobody can buy is not catalogue, it is noise.
    #
    # Everything else in this script ships the whole corpus on purpose (see the module
    # docstring: the first capture's size caps cost three entire categories). These two
    # filters are the exception, and they are about the product being DEAD, not about size:
    #
    #   unbuyable  192 clusters — every store carrying them is proven out_of_stock. They
    #              render as an ordinary card with a real price and a "Go to store" button
    #              that leads to a page you cannot buy from.
    #   stale    1,003 clusters — nothing in them has been seen since 2026-04 (>60 days).
    #              The price shown is historical; the listing may no longer exist.
    #
    # Measured 2026-07-25: 62,668 -> 61,473 clusters, and the deals feed is unchanged at
    # 3,189. That the curated surface lost nothing is the expected result, not luck — the
    # deals filter already required a fresh multi-store like-for-like spread. The dead rows
    # were all in the browse catalogue, which is exactly where nothing was checking.
    #
    # The fully-delisted case (3,680 clusters) never reaches here: the engine drops them to
    # n_stores == 0 and MIN_STORES already excludes them. That — not "no price" — is what
    # the manifest's excluded count has always actually been measuring, so it is named for
    # that now.
    #
    # ⚠️ Undated clusters are KEPT. 3,960 rows carry no last_seen on any member and they are
    # the entirety of tvs, printers, routers, wearables, desktop-computers and
    # digital-cameras. `freshness()` returns "unknown" for them, never "stale". Dropping
    # unknowns would delete six categories to fix a problem measured in none of them.
    kept, dropped_stale, dropped_unbuyable = [], 0, 0
    for doc in docs:
        if is_unbuyable(doc):
            dropped_unbuyable += 1
        elif is_stale(doc):
            dropped_stale += 1
        else:
            kept.append(doc)
    docs = kept
    print(f"excluded {dropped_unbuyable} unbuyable + {dropped_stale} stale "
          f"(>{STALE_AFTER_DAYS}d) -> {len(docs)} clusters")

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

    # ⭐ Second history source: the raw store collections the crawlers write, which
    # carry a `prices` array on every site. This is the ONLY source groceries have —
    # their cluster members do not exist in `compiled_products` at all, because
    # `cluster_grocery` reads marketplace_scraper_db directly. Measured potential:
    # 5.8% -> 21.4% of clusters, and groceries 0% -> 24.2%.
    #
    # A member found here overrides the compiled copy: `prices` is what the crawler
    # last wrote, while `compiled_products.price_history` is a rebuild-time snapshot
    # of it, and the pipeline has not been run under the freeze.
    raw_db = db.client["marketplace_scraper_db"]
    raw_colls = set(raw_db.list_collection_names())
    wanted: dict = defaultdict(set)
    for doc in docs:
        for m in doc.get("members") or []:
            coll = raw_collection_for(m.get("site"), raw_colls)
            if coll and m.get("product_id"):
                wanted[coll].add(m["product_id"])
    raw_found = 0
    for coll, ids in wanted.items():
        ids = list(ids)
        # Chunked: a single $in of ~30k ids per collection is a 16 MB BSON risk.
        for start in range(0, len(ids), 20_000):
            for row in raw_db[coll].find(
                {"product_id": {"$in": ids[start:start + 20_000]},
                 "prices.1": {"$exists": True}},
                {"product_id": 1, "prices": 1},
            ):
                histories[row["product_id"]] = row["prices"]
                raw_found += 1
    print(f"raw collections: {raw_found} histories over {len(wanted)} stores "
          f"-> {len(histories)} total")

    views = []
    for doc in docs:
        # full=True is what puts {price,url,title} in best_by_store instead of a
        # bare price. Without it the detail shards carry no store URLs at all and
        # every "Go to store" button on the comparison page is a dead link — the
        # one thing the whole comparison exists to provide. Listings are written
        # from _summary(), so they stay small regardless.
        view = _cluster_view(doc)
        view["image"] = pick_image(doc, device_images)
        view["image_candidates"] = image_candidates(doc, device_images)
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

        # Where this category sits in the canonical tree, so the manifest alone is
        # enough to build nested navigation — without it a client has 14 unrelated
        # strings. `group` is None for groceries, which is not a taxonomy node.
        node = category_path(slug) or {}
        cat_meta[slug] = {
            "slug": slug,
            "count": len(rows),
            "multi_store": sum(1 for r in rows if r.get("is_multi_store")),
            "comparison_grade": slug in COMPARISON_SLUGS,
            "pages": pages,
            "buckets": n_buckets,
            "name": node.get("name"),
            "group": (node.get("path") or [None])[0],
            "path": node.get("path") or [],
            "level": node.get("level"),
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
        # Every exclusion is for being DEAD, never for size. See MIN_STORES and the
        # quality-exclusion block above.
        "excluded_unpriced": unpriced,          # n_stores == 0; 3,680 of these are delisted
        "excluded_unbuyable": dropped_unbuyable,  # out of stock at every store
        "excluded_stale": dropped_stale,          # unseen for > STALE_AFTER_DAYS
        "stale_after_days": STALE_AFTER_DAYS,
        # Freshness the demo can actually claim. "unknown" is a source that dates
        # nothing, NOT a staleness claim — see hygiene.freshness.
        "freshness": {
            basis: sum(1 for v in views if v.get("freshness_basis") == basis)
            for basis in ("fresh", "stale", "unknown")
        },
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


def pack_dataset(src: Path = OUT, dest: Path = ARCHIVE) -> Path:
    """Pack `public/demo/` into the single archive that git actually tracks.

    ⭐ THE ARCHIVE IS WHAT IS VERSIONED; the ~430 loose JSON files are not. Git
    stores a compressed snapshot of every changed file forever, and a re-capture
    touches nearly all of them, so tracking them loose cost ~100 MB of permanent
    history per run — on a repo Cloudflare Pages re-clones on every build. The
    same content as one archive is ~15 MB, and unchanged captures cost nothing at
    all because of the determinism below.

    ⚠️ DETERMINISM IS THE WHOLE POINT, and it does not come for free. A tar
    records mtimes, owners and directory order, and gzip stamps its own timestamp
    into the header — so the default output differs on every run even when not one
    byte of data changed, and git would store a fresh 15 MB blob each time. Names
    are sorted and every varying field is zeroed, which makes an unchanged dataset
    re-pack to identical bytes and cost zero objects. `test_packing_is_reproducible`
    pins it.
    """
    import gzip
    import tarfile

    dest.parent.mkdir(parents=True, exist_ok=True)
    paths = sorted(p for p in src.rglob("*") if p.is_file())

    def scrub(info: tarfile.TarInfo) -> tarfile.TarInfo:
        info.mtime = 0
        info.uid = info.gid = 0
        info.uname = info.gname = ""
        # 0o644/0o755 vary with umask; pin them so a fresh clone packs the same.
        info.mode = 0o644
        return info

    # mtime=0 on the GzipFile too: the gzip HEADER carries a timestamp of its own,
    # separate from anything tarfile writes.
    with open(dest, "wb") as raw:
        with gzip.GzipFile(filename="", mode="wb", fileobj=raw, mtime=0) as gz:
            with tarfile.open(fileobj=gz, mode="w", format=tarfile.GNU_FORMAT) as tar:
                for path in paths:
                    tar.add(path, arcname=str(path.relative_to(src.parent)), filter=scrub)
    return dest


if __name__ == "__main__":
    main()
    size = pack_dataset().stat().st_size
    print(f"packed dealsonline_ui_ux_mock/data/demo-dataset.tar.gz ({size / 1e6:.1f} MB)")

"""Capture the redesign-spine shelves (/aisle, /shelf) from the AI catalogue's families.

`capture_demo_dataset.py` writes the category pages (/browse/:slug) from a catalogue source and skips the engine
shelves (`capture_demo_shelves.py` mirrors the live API over the OLD engine clusters, which would put old-cluster
pages beside catalogue ones). This pass rebuilds the shelves from the catalogue itself: every family carries a
spine placement (`spine_slug`, set by phones_scraper's `product_catalogue.storefront_export`), and every spine node
with at least one family in its subtree gets the same files the engine capture wrote, so `demoSource.ts` and the
catalogue function read them unchanged:

    shelves/<slug>/tree.json            the node + its children that hold families (DemoShelfTreeResponse)
    shelves/<slug>/meta.json            pagination (DemoShelfMeta)
    shelves/<slug>/products-NNN.json    100-row pages: the node's own families AND its subtree's
    shelves/<slug>/products-multi-NNN.json   the same, multi-store only
    shelves/manifest.json               every shelf + `detail_buckets` for shelf-details/
    shelf-details/NNN.json              detail views for shelf families no category shard can serve
    navigation.json                     departments -> families -> leaves, for the build (see DEPLOY.md)

⛔ SLUG SPACES. Every slug written here is a SPINE slug. The spine's slugs collide with the 15 legacy category slugs
(`mobile-phones` is both a spine family and a /browse category), so nothing here derives a /browse page from a
spine slug or the reverse: a family's /browse page comes from `canonical_category_slug`, its /shelf page from
`spine_slug`, and the two are never joined by name.

⭐ COUNTS ARE DERIVED FROM THE ROWS THAT SHIP — after the same MIN_STORES / unbuyable / stale exclusions the category
capture applies — never read from a stored count.

⭐ EVERY FAMILY ON A SHELF RESOLVES ON ITS PRODUCT PAGE. `demoSource.getDetail` reads the category shard named by the
id prefix and falls back to `shelf-details/`. A family whose id prefix is not its captured category (every
unshelved family: `other::…` today, spine-prefixed after the next export) is written to shelf-details.

Usage (normally run by capture_demo_dataset's __main__ when DEMO_SOURCE is not the MVP):
    DEMO_SOURCE=catalogue_snapshot.storefront_clusters apienv/bin/python -m scripts.capture_catalogue_shelves
"""
from __future__ import annotations

import json
import math
import os
import shutil
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from scripts.capture_demo_dataset import (
    MIN_STORES,
    OUT,
    SHARD_DIGITS,
    SHARD_TARGET_BYTES,
    SOURCE,
    build_history,
    config_extras,
    fnv1a,
    image_candidates,
    pick_image,
    priced_store_count,
    raw_collection_for,
    _summary,
)
from scripts.category_purity import is_off_category

SPINE_JSON = Path(os.getenv(
    "SPINE_JSON",
    str(Path.home() / "codes" / "phones_scraper" / "category_taxonomy" / "redesign" / "_spine.json"),
))

# ⛔ KEEP IN STEP with SHELF_PAGE_SIZE in demoSource.ts (and capture_demo_shelves.py).
SHELF_PAGE_SIZE = 100
# shelf-details bucket count is sized from bytes (like the category shards) and published in
# shelves/manifest.json as `detail_buckets`, which demoSource.getDetail reads. 3-digit suffix, so <= 999.
MIN_DETAIL_BUCKETS = 4
MAX_DETAIL_BUCKETS = 999
NAVIGATION_VERSION = 1
# Families per Mongo round trip when building views for families no category shard carries.
BATCH = 4_000


# --------------------------------------------------------------------------- pure helpers

def load_spine(path: Path = SPINE_JSON) -> dict[str, dict]:
    """slug -> node (slug, name, parent_slug, level, department)."""
    nodes = json.loads(Path(path).read_text())["nodes"]
    by_slug = {n["slug"]: n for n in nodes}
    assert len(by_slug) == len(nodes), "duplicate spine slug"
    return by_slug


def ancestors(slug: str, nodes: dict[str, dict]) -> list[str]:
    """Root-first ancestor slugs, excluding `slug`."""
    out: list[str] = []
    parent = nodes[slug].get("parent_slug")
    while parent:
        out.append(parent)
        parent = nodes[parent].get("parent_slug")
    return out[::-1]


def rank_key(row: dict):
    """The category capture's listing order (capture_demo_dataset.main) — keep the two identical.

    Off-category last, then rows with a photo, then the real cross-store saving (single-store rows have no spread
    and fall behind the comparable multi-store ones), then store and listing counts; cluster_id makes it stable.
    """
    return (
        bool(row.get("off_category")),
        not row.get("image"),
        -(row.get("like_for_like_spread_pct") or 0),
        -(row.get("n_stores") or 0),
        -(row.get("n_listings") or 0),
        row.get("cluster_id") or "",
    )


def resolves_in_category_shard(cluster_id: str, category: str | None, categories: set[str]) -> bool:
    """Whether `demoSource.getDetail` finds this family in its category shard.

    getDetail reads `clusters/<prefix>-<fnv % buckets(prefix)>.json` where prefix = the id before `::`; the category
    capture wrote it under `shard_for(id, category, buckets(category))`. Same file iff prefix == category.
    """
    return bool(category) and category in categories and cluster_id.split("::", 1)[0] == category


def detail_buckets_for(total_bytes: int, target: int = SHARD_TARGET_BYTES) -> int:
    if total_bytes <= 0:
        return MIN_DETAIL_BUCKETS
    return max(MIN_DETAIL_BUCKETS, min(MAX_DETAIL_BUCKETS, math.ceil(total_bytes / target)))


def place_families(placements: dict[str, str], nodes: dict[str, dict]) -> tuple[dict[str, list[str]], dict[str, list[str]]]:
    """(direct, subtree): spine slug -> family ids placed AT the node / anywhere in its subtree.

    A family placed at a department or a family node is on that node's page (and its ancestors'), not pushed down
    to a leaf. Placements naming a slug the spine does not have are the caller's to report; they are skipped here.
    """
    direct: dict[str, list[str]] = defaultdict(list)
    subtree: dict[str, list[str]] = defaultdict(list)
    for cid, slug in placements.items():
        if slug not in nodes:
            continue
        direct[slug].append(cid)
        for s in (*ancestors(slug, nodes), slug):
            subtree[s].append(cid)
    return dict(direct), dict(subtree)


def node_counts(slug: str, direct: dict, subtree: dict, stores: dict[str, list]) -> dict:
    ids = subtree.get(slug) or []
    return {
        "n_clusters": len(direct.get(slug) or []),
        "n_clusters_subtree": len(ids),
        "n_stores": len({s for cid in ids for s in (stores.get(cid) or [])}),
    }


def browse_node(slug: str, nodes: dict, direct: dict, subtree: dict, stores: dict) -> dict:
    """A DemoBrowseNode (demoTypes.ts) for one spine node."""
    node = nodes[slug]
    anc = ancestors(slug, nodes)
    return {
        "slug": slug,
        "label": node.get("name"),
        "parent_slug": node.get("parent_slug"),
        "ancestors": anc,
        "ancestor_labels": [nodes[a].get("name") for a in anc],
        **node_counts(slug, direct, subtree, stores),
        "coarse": (node.get("level") or 0) < 2,
        "browsable": True,
        "unsorted": False,
        "level": node.get("level"),
    }


def children_with_families(slug: str | None, nodes: dict, subtree: dict) -> list[str]:
    """Child slugs of `slug` (None = departments) that hold >=1 family, biggest first."""
    kids = [s for s, n in nodes.items() if n.get("parent_slug") == slug and subtree.get(s)]
    return sorted(kids, key=lambda s: (-len(subtree[s]), nodes[s].get("name") or s))


def tree_payload(slug: str, nodes: dict, direct: dict, subtree: dict, stores: dict) -> dict:
    """Static `GET /browse-tree?parent=<slug>` (DemoShelfTreeResponse)."""
    results = [browse_node(s, nodes, direct, subtree, stores)
               for s in children_with_families(slug, nodes, subtree)]
    return {"parent": browse_node(slug, nodes, direct, subtree, stores), "count": len(results), "results": results}


def navigation(nodes: dict, direct: dict, subtree: dict, stores: dict, *, source: str, captured_at: str) -> dict:
    """Departments -> spine families -> leaves, only nodes holding families, counts derived from the rows.

    `source_collection` and `captured_at` are the category manifest's: the build uses this file only when both
    match the manifest it ships with, so a stale navigation can never describe a different dataset.
    """
    def entry(slug: str) -> dict:
        return {"slug": slug, "name": nodes[slug].get("name"), **node_counts(slug, direct, subtree, stores)}

    departments = []
    for d in children_with_families(None, nodes, subtree):
        families = []
        for f in children_with_families(d, nodes, subtree):
            families.append({**entry(f), "leaves": [entry(leaf) for leaf in children_with_families(f, nodes, subtree)]})
        departments.append({**entry(d), "families": families})
    return {
        "version": NAVIGATION_VERSION,
        "source_collection": source,
        "captured_at": captured_at,
        "n_families": len({cid for ids in direct.values() for cid in ids}),
        "departments": departments,
    }


def paged(rows: list, size: int = SHELF_PAGE_SIZE) -> list[list]:
    """>=1 page so an empty listing still has a fetchable page 0."""
    return [rows[i:i + size] for i in range(0, len(rows), size)] or [[]]


# --------------------------------------------------------------------------- capture

def _write(path: Path, payload) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, separators=(",", ":"))
    path.write_text(text)
    return len(text)


def _family_views(docs: list[dict], db, raw_db, raw_colls: set) -> list[dict]:
    """Detail views for families the category capture did not ship (no legacy category).

    ⛔ MIRRORS the view loop in capture_demo_dataset.main (image, candidates, priced store count, history, per-version
    extras, off-category flag) — change both together. The histories lookup is the same two sources, per batch.
    """
    from app.api.routes.clusters import _cluster_view

    member_ids = [m.get("product_id") for d in docs for m in (d.get("members") or []) if m.get("product_id")]
    device_images: dict = {}
    histories: dict = {}
    for cp in db["compiled_products"].find({"product_id": {"$in": member_ids}},
                                           {"product_id": 1, "product_image": 1, "price_history": 1}):
        if cp.get("product_image"):
            device_images[cp["product_id"]] = cp["product_image"]
        if cp.get("price_history"):
            histories[cp["product_id"]] = cp["price_history"]
    wanted: dict = defaultdict(set)
    for d in docs:
        for m in d.get("members") or []:
            coll = raw_collection_for(m.get("site"), raw_colls)
            if coll and m.get("product_id"):
                wanted[coll].add(m["product_id"])
    for coll, ids in wanted.items():
        for row in raw_db[coll].find({"product_id": {"$in": list(ids)}, "prices.1": {"$exists": True}},
                                     {"product_id": 1, "prices": 1}):
            histories[row["product_id"]] = row["prices"]

    views = []
    for doc in docs:
        view = _cluster_view(doc)
        view["image"] = pick_image(doc, device_images)
        view["image_candidates"] = image_candidates(doc, device_images)
        view["n_stores_priced"] = priced_store_count(doc)
        view["price_history"] = build_history(doc, histories)
        for cfg, extra in zip(view["configs"], config_extras(doc, device_images, histories)):
            cfg.update(extra)
        view["off_category"] = is_off_category(view.get("title"), view.get("category"))
        # Spine placement, for the product page's breadcrumb (it has no /browse category to name).
        view["spine_slug"] = doc.get("spine_slug")
        views.append(view)
    return views


def _category_rows(manifest: dict) -> tuple[dict[str, dict], dict[str, str]]:
    """Summary rows the category capture shipped (cluster_id -> row) and each row's category."""
    rows: dict[str, dict] = {}
    category: dict[str, str] = {}
    for cat in manifest["categories"]:
        for page in range(cat["pages"]):
            for row in json.loads((OUT / "categories" / f"{cat['slug']}-{page:0{SHARD_DIGITS}d}.json").read_text()):
                rows[row["cluster_id"]] = row
                category[row["cluster_id"]] = cat["slug"]
    return rows, category


def capture_catalogue_shelves(source: str = SOURCE, spine_path: Path = SPINE_JSON) -> dict:
    # As capture_demo_dataset.main: the API module reads its collection name at import.
    os.environ.setdefault("CLUSTERS_COLLECTION", "product_clusters_mvp")
    from pymongo import MongoClient

    from app.api.hygiene import is_stale, is_unbuyable

    nodes = load_spine(spine_path)
    manifest = json.loads((OUT / "manifest.json").read_text())
    if manifest.get("source_collection") != source:
        raise SystemExit(f"shelves: manifest is {manifest.get('source_collection')}, not {source}; capture it first")
    categories = {c["slug"]: c for c in manifest["categories"]}

    client = MongoClient("mongodb://localhost:27017", serverSelectionTimeoutMS=8000)
    db = client["product_matching_db"]
    src_db, src_coll = source.split(".", 1)
    coll = client[src_db][src_coll]

    # 1. Placements. Read for every family; only the ones that ship are kept below.
    placement_of: dict[str, str] = {}
    unknown_slugs: dict[str, int] = defaultdict(int)
    unplaced = 0
    for doc in coll.find({}, {"cluster_id": 1, "spine_slug": 1}):
        slug = doc.get("spine_slug")
        if not slug:
            unplaced += 1
        elif slug not in nodes:
            unknown_slugs[slug] += 1
        else:
            placement_of[doc["cluster_id"]] = slug
    if not placement_of:
        raise SystemExit(f"shelves: no family in {source} carries a spine_slug the spine knows; nothing to capture")

    # 2. Families the category capture shipped: their summary rows, stores, and a detail copy when the product page
    #    could not find them through the id prefix.
    cat_rows, cat_of = _category_rows(manifest)
    rows: dict[str, dict] = {}
    stores: dict[str, list] = {}
    details: dict[str, str] = {}
    for cid, row in cat_rows.items():
        if cid in placement_of:
            rows[cid] = row
    for slug, cat in categories.items():
        for b in range(cat["buckets"]):
            path = OUT / "clusters" / f"{slug}-{b:0{SHARD_DIGITS}d}.json"
            if not path.exists():
                continue
            for cid, view in json.loads(path.read_text()).items():
                if cid not in rows:
                    continue
                stores[cid] = view.get("stores") or []
                if not resolves_in_category_shard(cid, cat_of.get(cid), set(categories)):
                    details[cid] = json.dumps({**view, "spine_slug": placement_of[cid]}, separators=(",", ":"))
    from_categories = len(rows)

    # 3. Placed families with no legacy category (the new stores' products): the same exclusions as the category
    #    capture, then their views, in batches.
    raw_db = client["marketplace_scraper_db"]
    raw_colls = set(raw_db.list_collection_names())
    query = {"source": "catalogue", "canonical_category_slug": None,
             "spine_slug": {"$in": sorted(set(placement_of.values()))}, "n_stores": {"$gte": MIN_STORES}}
    dropped = {"unbuyable": 0, "stale": 0}
    batch: list[dict] = []

    def flush():
        for view in _family_views(batch, db, raw_db, raw_colls):
            cid = view["cluster_id"]
            rows[cid] = _summary(view)
            stores[cid] = view.get("stores") or []
            details[cid] = json.dumps(view, separators=(",", ":"))
        batch.clear()

    for doc in coll.find(query, batch_size=1000):
        if doc.get("cluster_id") in rows:
            continue
        if is_unbuyable(doc):
            dropped["unbuyable"] += 1
        elif is_stale(doc):
            dropped["stale"] += 1
        else:
            batch.append(doc)
            if len(batch) >= BATCH:
                flush()
                print(f"shelves: {len(rows) - from_categories} unshelved families built", flush=True)
    if batch:
        flush()
    from_spine_only = len(rows) - from_categories

    shipped = {cid: placement_of[cid] for cid in rows}
    direct, subtree = place_families(shipped, nodes)

    # 4. Write. Stale shelves would still be served and could shadow a moved family.
    shelf_root, detail_root = OUT / "shelves", OUT / "shelf-details"
    for old in (shelf_root, detail_root):
        if old.exists():
            shutil.rmtree(old)
    shelf_root.mkdir(parents=True)
    detail_root.mkdir(parents=True)

    shelf_meta = []
    for slug in sorted(subtree, key=lambda s: (nodes[s]["level"], s)):
        ranked = sorted((rows[cid] for cid in subtree[slug]), key=rank_key)
        multi = [r for r in ranked if r.get("is_multi_store")]
        base = shelf_root / slug
        pages, multi_pages = paged(ranked), paged(multi)
        for i, chunk in enumerate(pages):
            _write(base / f"products-{i:0{SHARD_DIGITS}d}.json", chunk)
        for i, chunk in enumerate(multi_pages):
            _write(base / f"products-multi-{i:0{SHARD_DIGITS}d}.json", chunk)
        meta = {"slug": slug, "total": len(ranked), "pages": len(pages), "multi_total": len(multi),
                "multi_pages": len(multi_pages), "page_size": SHELF_PAGE_SIZE}
        _write(base / "meta.json", meta)
        _write(base / "tree.json", tree_payload(slug, nodes, direct, subtree, stores))
        shelf_meta.append({**meta, "level": nodes[slug]["level"]})

    n_buckets = detail_buckets_for(sum(len(t) for t in details.values()))
    shards: dict[str, list[str]] = defaultdict(list)
    for cid, text in details.items():
        shards[f"{fnv1a(cid) % n_buckets:0{SHARD_DIGITS}d}"].append(f"{json.dumps(cid)}:{text}")
    for name, items in shards.items():
        (detail_root / f"{name}.json").write_text("{" + ",".join(items) + "}")

    summary = {
        "captured_at": datetime.now().isoformat(timespec="seconds"),
        "source_collection": source,
        "basis": "catalogue_spine",
        "page_size": SHELF_PAGE_SIZE,
        "detail_buckets": n_buckets,
        "count": len(shelf_meta),
        "families": len(rows),
        "families_from_categories": from_categories,
        "families_spine_only": from_spine_only,
        "shelf_details": len(details),
        "excluded_unbuyable": dropped["unbuyable"],
        "excluded_stale": dropped["stale"],
        "unplaced": unplaced,
        "unknown_spine_slugs": dict(unknown_slugs),
        "shelves": shelf_meta,
    }
    _write(shelf_root / "manifest.json", summary)
    _write(OUT / "navigation.json", navigation(nodes, direct, subtree, stores, source=source,
                                               captured_at=manifest["captured_at"]))
    print(f"shelves: {len(shelf_meta)} spine shelves over {len(rows)} families ({from_categories} from category pages, "
          f"{from_spine_only} spine-only); {len(details)} shelf details in {n_buckets} buckets; "
          f"skipped {unplaced} unplaced, {sum(unknown_slugs.values())} unknown-slug, "
          f"{dropped['unbuyable']} unbuyable, {dropped['stale']} stale", flush=True)
    return summary


def main() -> None:
    from scripts.capture_demo_dataset import pack_dataset

    capture_catalogue_shelves()
    archive = pack_dataset()
    print(f"packed {archive} ({archive.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()

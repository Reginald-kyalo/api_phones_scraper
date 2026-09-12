"""Capture the redesign-spine leaf pages for the static demo.

The category/detail catalogue in `public/demo/` is captured from Mongo by
`scripts.capture_demo_dataset.py`.  The redesign-spine pages, however, are
served by two live endpoints:

    GET /api/clusters/browse-tree?parent={slug}
    GET /api/clusters/by-node/{slug}

This script mirrors those two responses into `public/demo/shelves/` so
`dealsonline_ui_ux_mock` can render `/shelf/:slug` exactly like the real app
without any `/api/` dependency at runtime.

Leaf product rows are stored in 100-row pages.  The mock requests 24 rows at a
time, just like the live `ShelfPage`; `demoSource.ts` slices those 24 rows out
of the 100-row pages.  Rows are captured in live `/by-node` order, so tie
ordering cannot drift between the static page and the live page.

The existing category shards do not contain every leaf row (the live API reads
`product_clusters`, while the captured catalogue has historically come from
`product_clusters_mvp`).  Missing rows therefore get a compact fallback detail
shard under `public/demo/shelf-details/`, and `demoSource.getDetail` checks that
location after the existing category shard.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime
from pathlib import Path

os.environ["DEBUG"] = "true"

from pymongo import MongoClient

from app.api.routes.clusters import _cluster_view
from scripts.capture_demo_dataset import (
    ARCHIVE,
    OUT,
    SHARD_DIGITS,
    fnv1a,
    image_candidates,
    pack_dataset,
    pick_image,
)

API = "http://localhost:10000/api/clusters"
LIVE_SPINE_TS = (
    Path(__file__).resolve().parents[1]
    / "dealsonline_ui_ux_mock"
    / "src"
    / "app"
    / "data"
    / "liveSpineShelves.ts"
)

SHELF_PAGE_SIZE = 100
SHELF_DETAIL_BUCKETS = 256


def _read_json(url: str):
    with urllib.request.urlopen(url) as response:
        return json.loads(response.read())


def _parse_spine_shelves() -> list[tuple[str, str, int]]:
    """Read the 483 static leaves already generated into the mock.

    These are the exact slugs used by the static nav, so they are the capture
    list rather than re-querying `/spine-departments` and risking the two lists
    drifting within one build.
    """
    text = LIVE_SPINE_TS.read_text()
    shelves: list[tuple[str, str, int]] = []
    for _, body in re.findall(r'"([^"]+)":\s*\[(.*?)\n  \]', text, re.S):
        for slug, label, count in re.findall(
            r'slug:\s*"([^"]+)",\s*label:\s*"([^"]*)",\s*count:\s*(\d+)',
            body,
        ):
            shelves.append((slug, label, int(count)))
    # A duplicate would make one shelf overwrite the other's static directory.
    assert len(shelves) == len({s for s, _, _ in shelves}), "duplicate shelf slug"
    return shelves


def _load_existing_catalogue() -> tuple[set[str], dict[str, str | None]]:
    """Cluster ids and images already shipped by the category capture."""
    ids: set[str] = set()
    images: dict[str, str | None] = {}
    categories = OUT / "categories"
    if categories.exists():
        for path in categories.glob("*.json"):
            for row in json.loads(path.read_text()):
                cid = row.get("cluster_id")
                if not cid:
                    continue
                ids.add(cid)
                images[cid] = row.get("image")
    return ids, images


def _pages_for(rows: list) -> int:
    return max(1, (len(rows) + SHELF_PAGE_SIZE - 1) // SHELF_PAGE_SIZE)


def _write(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, separators=(",", ":")))


def _capture_shelf(slug: str) -> tuple[list[dict], int]:
    """Exact `/by-node/{slug}` rows, unfiltered, in live page order."""
    rows: list[dict] = []
    total = 0
    offset = 0
    while True:
        query = urllib.parse.urlencode(
            {"limit": SHELF_PAGE_SIZE, "offset": offset}
        )
        payload = _read_json(f"{API}/by-node/{urllib.parse.quote(slug)}?{query}")
        total = int(payload.get("total") or 0)
        chunk = payload.get("results") or []
        rows.extend(chunk)
        if not chunk or len(chunk) < SHELF_PAGE_SIZE or offset + len(chunk) >= total:
            break
        offset += SHELF_PAGE_SIZE
    return rows, total


def _missing_detail_views(
    missing_ids: set[str],
) -> dict[str, dict]:
    """Full detail views for leaf rows not already in the category shards."""
    if not missing_ids:
        return {}
    client = MongoClient("mongodb://localhost:27017", serverSelectionTimeoutMS=8000)
    source = client["product_matching_db"]["product_clusters"]
    compiled = client["product_matching_db"]["compiled_products"]

    views: dict[str, dict] = {}
    for start in range(0, len(missing_ids), 20_000):
        batch = sorted(missing_ids)[start : start + 20_000]
        docs = list(source.find({"_id": {"$in": batch}}))
        member_ids = [
            member.get("product_id")
            for doc in docs
            for member in (doc.get("members") or [])
            if member.get("product_id")
        ]
        device_images: dict[str, str] = {}
        for cp in compiled.find(
            {"product_id": {"$in": member_ids}},
            {"product_id": 1, "product_image": 1},
        ):
            if cp.get("product_image"):
                device_images[cp["product_id"]] = cp["product_image"]

        for doc in docs:
            view = _cluster_view(doc)
            view["image"] = pick_image(doc, device_images)
            view["image_candidates"] = image_candidates(doc, device_images)
            views[doc["_id"]] = view
    return views


def _write_shelf_details(views: dict[str, dict]) -> None:
    if not views:
        return
    shards: dict[str, dict[str, dict]] = defaultdict(dict)
    for cluster_id, view in views.items():
        bucket = fnv1a(cluster_id) % SHELF_DETAIL_BUCKETS
        shards[f"{bucket:0{SHARD_DIGITS}d}"][cluster_id] = view

    out = OUT / "shelf-details"
    for name, group in shards.items():
        _write(out / f"{name}.json", group)


def _hydrate_missing_images(views: dict[str, dict], existing_ids: set[str]) -> None:
    """Put the same real image the fallback detail carries onto leaf cards.

    Leaf rows are captured from `/by-node`, whose summary projection does not
    include `image`.  Rows already in the category capture are hydrated from the
    existing category pages; rows only reached through the leaf capture get the
    image from their generated fallback detail here.
    """
    for pattern in ("products-*.json", "products-multi-*.json"):
        for path in (OUT / "shelves").glob(f"*/{pattern}"):
            rows = json.loads(path.read_text())
            changed = False
            for row in rows:
                cid = row.get("cluster_id")
                if not cid or cid in existing_ids:
                    continue
                image = (views.get(cid) or {}).get("image")
                if row.get("image") != image:
                    row["image"] = image
                    changed = True
            if changed:
                _write(path, rows)


def capture_shelves() -> None:
    shelves = _parse_spine_shelves()
    existing_ids, existing_images = _load_existing_catalogue()

    shelf_root = OUT / "shelves"
    detail_root = OUT / "shelf-details"
    for old in (shelf_root, detail_root):
        if old.exists():
            shutil.rmtree(old)
    shelf_root.mkdir(parents=True, exist_ok=True)
    detail_root.mkdir(parents=True, exist_ok=True)

    missing_ids: set[str] = set()
    shelf_meta: list[dict] = []

    for index, (slug, _label, _count) in enumerate(shelves, 1):
        tree = _read_json(
            f"{API}/browse-tree?{urllib.parse.urlencode({'parent': slug})}"
        )
        _write(shelf_root / urllib.parse.quote(slug, safe="") / "tree.json", tree)

        rows, total = _capture_shelf(slug)
        for row in rows:
            cid = row.get("cluster_id")
            row["image"] = existing_images.get(cid)
            if cid not in existing_ids:
                missing_ids.add(cid)

        multi_rows = [row for row in rows if row.get("is_multi_store")]
        base = shelf_root / urllib.parse.quote(slug, safe="")
        for page in range(_pages_for(rows)):
            _write(
                base / f"products-{page:0{SHARD_DIGITS}d}.json",
                rows[page * SHELF_PAGE_SIZE : (page + 1) * SHELF_PAGE_SIZE],
            )
        for page in range(_pages_for(multi_rows)):
            _write(
                base / f"products-multi-{page:0{SHARD_DIGITS}d}.json",
                multi_rows[page * SHELF_PAGE_SIZE : (page + 1) * SHELF_PAGE_SIZE],
            )

        meta = {
            "slug": slug,
            "total": total,
            "pages": _pages_for(rows),
            "multi_total": len(multi_rows),
            "multi_pages": _pages_for(multi_rows),
            "page_size": SHELF_PAGE_SIZE,
        }
        _write(base / "meta.json", meta)
        shelf_meta.append(meta)
        print(f"[{index}/{len(shelves)}] {slug}: {total} rows, "
              f"{len(multi_rows)} multi-store", flush=True)

    _write(
        shelf_root / "manifest.json",
        {
            "captured_at": datetime.now().isoformat(timespec="seconds"),
            "page_size": SHELF_PAGE_SIZE,
            "detail_buckets": SHELF_DETAIL_BUCKETS,
            "count": len(shelves),
            "shelves": shelf_meta,
        },
    )

    print(f"missing leaf details: {len(missing_ids)}", flush=True)
    views = _missing_detail_views(missing_ids)
    _write_shelf_details(views)
    _hydrate_missing_images(views, existing_ids)


def main() -> None:
    capture_shelves()
    archive = pack_dataset()
    print(f"packed {archive} ({archive.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()

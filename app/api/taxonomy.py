"""Where a category sits in the canonical tree.

⭐ WHY THIS EXISTS. The API published `category` as a flat slug, so a consumer had
14 unrelated strings and no way to nest them. A full hierarchy was already sitting
in `taxonomy_db.canonical_categories` and nothing read it.

Measured 2026-07-26:

    canonical_categories   424 nodes — 125 at level 1, 289 at level 2, 10 at level 3
                           every node has `parent_slug`, `level`, `path_string`
    shop_category_mappings 1,439 store-path -> canonical-slug mappings
    compiled_products      270 distinct slugs, 188 of them real taxonomy nodes
                           (400,601 products)
    clusters               14 slugs

So the 14 are not the taxonomy's limit — they are the slugs somebody ran the
clusterer for. The tree that groups them was there the whole time:

    Sound & Vision  > Home Audio > Audio Systems
                    > Headphones / Speakers / TVs
    Computing       > Computers  > Laptops / Tablets / Desktop Computers
                    > Peripherals> Monitors / Printers
                    > Networking > Routers
    Phones & Wearables > Mobile Phones / Wearables
    Photography     > Digital Cameras

⚠️ THE 14 ARE ALREADY LEAVES. Nothing in the taxonomy hangs *below* them, so this
cannot produce sub-sub-categories under "laptops". What it produces is the tree
ABOVE them — which is what turns a flat list of 14 into a browsable hierarchy of
4 groups. Drilling further down requires clustering more slugs, not more taxonomy.

⛔ `groceries` is NOT a taxonomy node. It comes from the FMCG pipeline, which has
its own keyer and never went through the PriceRunner-derived taxonomy. It resolves
to None here and the projection falls back to the bare slug — the one category that
cannot be placed in the tree is also the largest, which is worth knowing before
building navigation that assumes every category has a parent.
"""
from __future__ import annotations

import os

_TAXONOMY: dict[str, dict] | None = None


def _load(db) -> dict[str, dict]:
    """Slug -> {name, parent_slug, level, path}. 424 rows; read once."""
    out: dict[str, dict] = {}
    for row in db["canonical_categories"].find(
        {}, {"slug": 1, "name": 1, "parent_slug": 1, "level": 1,
             "path_string": 1, "full_path": 1, "product_type": 1},
    ):
        slug = row.get("slug")
        if not slug:
            continue
        out[slug] = {
            "name": row.get("name"),
            "parent_slug": row.get("parent_slug"),
            "level": row.get("level"),
            "path_string": row.get("path_string"),
            "full_path": row.get("full_path") or [],
            "product_type": row.get("product_type"),
        }
    return out


def load_taxonomy(client=None) -> dict[str, dict]:
    """Cached taxonomy. Falls back to empty so the API still serves without it.

    An empty taxonomy must degrade to "no hierarchy", never to an error: the
    category tree is an enhancement to navigation, and a comparison page that
    500s because a lookup collection is missing would be a far worse failure than
    a flat category list.
    """
    global _TAXONOMY
    if _TAXONOMY is None:
        try:
            if client is None:
                from pymongo import MongoClient
                client = MongoClient(
                    os.getenv("MONGO_URI", "mongodb://localhost:27017"),
                    serverSelectionTimeoutMS=5_000,
                )
            _TAXONOMY = _load(client["taxonomy_db"])
        except Exception:
            _TAXONOMY = {}
    return _TAXONOMY


def category_path(slug: str | None, taxonomy: dict | None = None) -> dict | None:
    """Where `slug` sits in the tree, or None when it is not a taxonomy node.

    None is a real answer, not a failure — `groceries` and 81 other in-use slugs
    genuinely are not in the canonical taxonomy.
    """
    if not slug:
        return None
    node = (taxonomy if taxonomy is not None else load_taxonomy()).get(slug)
    if not node:
        return None
    return {
        "slug": slug,
        "name": node["name"],
        "parent_slug": node["parent_slug"],
        "level": node["level"],
        "path": node["full_path"],
        "path_string": node["path_string"],
        "product_type": node["product_type"],
    }

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
import time

_TAXONOMY: dict[str, dict] | None = None

#: The presentation tree, cached like `_TAXONOMY`. `(nodes, placements)`.
#: nodes:      v2 slug   -> {name, parent_slug, level, full_path, unsorted}
#: placements: cluster id -> v2 slug
_BROWSE: tuple[dict, dict] | None = None
_BROWSE_AT: float = 0.0

#: ⛔⛔ A CACHE WITH NO INVALIDATION SERVES A TREE THAT NO LONGER EXISTS. `_BROWSE` was read
#: once per process, so after every `publish_browse_tree --apply` this API served the PREVIOUS
#: tree until somebody restarted it — the engine repo's own "a long-running console serves the
#: code it started with", arrived in production. A TTL is enough: the tree is rebuilt by hand,
#: minutes apart at most, and `reset_browse_cache()` is there for a deliberate poke.
BROWSE_TTL_SECONDS = int(os.getenv("BROWSE_TTL_SECONDS", "300"))


def reset_browse_cache() -> None:
    """Force the next `load_browse` to re-read. For tests and for a post-publish poke."""
    global _BROWSE, _BROWSE_AT
    _BROWSE, _BROWSE_AT = None, 0.0


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


# --------------------------------------------------------------------------------------------
# The PRESENTATION tree (`taxonomy_db.browse_nodes` + `browse_placements`)
#
# ⛔⛔ THE JOIN KEY IS THE CLUSTER ID, NOT THE SLUG. `category_path` above is keyed by
# `canonical_category_slug` ("mobile-phones", "groceries"); the presentation tree is keyed by
# v2 slugs ("smartphone", "phone-tablet"), and the two spaces share ZERO members. Repointing
# `_load` at `browse_nodes` would return None for every cluster and delete the hierarchy while
# every test stayed green. The edge that does exist is `browse_placements: cluster_id -> node`.
#
# ⭐ The 424-node spine stays as the FALLBACK until this path is verified live. A per-cluster
# miss degrades to the old answer, never to nothing.
# --------------------------------------------------------------------------------------------

def _load_browse(db) -> tuple[dict, dict]:
    """`(nodes, placements)` from the presentation tree. Read once."""
    raw = list(db["browse_nodes"].find(
        {}, {"label": 1, "parent_slug": 1, "ancestors": 1, "unsorted": 1, "n_clusters": 1}))
    # ⛔ `full_path` must hold LABELS, not slugs. The 424-node spine published names
    # ("Sound & Vision > Home Audio > Audio Systems") and the UI renders the path
    # verbatim; emitting slugs would ship "cable-accessory > computer > tablet" to a
    # shopper. Two passes, because an ancestor's label needs the whole index first.
    label_of = {r["_id"]: (r.get("label") or r["_id"]) for r in raw}
    nodes = {}
    for row in raw:
        chain = list(row.get("ancestors") or []) + [row["_id"]]
        nodes[row["_id"]] = {
            "name": row.get("label"),
            "parent_slug": row.get("parent_slug"),
            "level": len(row.get("ancestors") or []),
            "full_path": [label_of.get(s, s) for s in chain],
            "unsorted": bool(row.get("unsorted")),
        }
    placements = {row["_id"]: row.get("node_slug")
                  for row in db["browse_placements"].find({}, {"node_slug": 1})}
    return (nodes, placements)


def load_browse(client=None) -> tuple[dict, dict]:
    """Cached presentation tree. Degrades to empty, never to an error — same contract as
    `load_taxonomy`: a comparison page that 500s because a lookup collection is missing is a
    far worse failure than a flat category list."""
    global _BROWSE, _BROWSE_AT
    if _BROWSE is None or (time.monotonic() - _BROWSE_AT) > BROWSE_TTL_SECONDS:
        try:
            if client is None:
                from pymongo import MongoClient
                client = MongoClient(
                    os.getenv("MONGO_URI", "mongodb://localhost:27017"),
                    serverSelectionTimeoutMS=5_000,
                )
            _BROWSE = _load_browse(client["taxonomy_db"])
        except Exception:
            _BROWSE = ({}, {})
        _BROWSE_AT = time.monotonic()
    return _BROWSE


def category_path_for_cluster(cluster_id, slug=None, browse=None, taxonomy=None) -> dict | None:
    """Where one CLUSTER sits in the category tree.

    ⭐ Returns the same projection shape `category_path` returns, so the response contract
    does not move while the two paths coexist.

    ⛔⛔ THE SPINE WINS WHERE IT HAS AN ANSWER, AND THAT ORDER IS DELIBERATE. Measured over
    5,000 live clusters 2026-08-17, browse-tree-first gave **2,115 clusters a SHALLOWER path
    against 1,511 deeper** — `tvs` moved from `Sound & Vision > TVs` to `... > Audio & Music
    Equipment`, `laptops` lost its leaf, `tablets` rooted under `Cables Accessories`.

    ⭐ The cause is upstream, not here: cluster placement takes the MAJORITY member node, and
    member rows sit on coarse shelves (`phone-tablet` absorbs 108,086 rows / 24% of the
    corpus), so the fine leaves the taxonomy does have — `smartphone` spans 30 stores — never
    win the vote. Until the tree is deepened, the presentation layer's honest role is to fill
    the gaps the spine cannot reach, not to replace it.

    ⇒ This is therefore STRICTLY ADDITIVE: every cluster that has a path today keeps exactly
    the path it has, and `groceries` — the largest category in the corpus and the one the
    module docstring above says "resolves to None here" — gains one for the first time.
    """
    spine = category_path(slug, taxonomy)
    if spine:
        return spine
    nodes, placements = browse if browse is not None else load_browse()
    node_slug = placements.get(str(cluster_id)) if cluster_id is not None else None
    node = nodes.get(node_slug) if node_slug else None
    if not node:
        return None
    return {
        "slug": node_slug,
        "name": node["name"],
        "parent_slug": node["parent_slug"],
        "level": node["level"],
        "path": node["full_path"],
        "path_string": " > ".join(node["full_path"]),
        "product_type": None,
        "unsorted": node["unsorted"],
    }

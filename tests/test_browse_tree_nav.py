"""Discovering the presentation tree — roots and children.

⛔⛔ WHY THIS EXISTS. `/by-node/{slug}` shipped 2026-08-17 and serves the products on a shelf
**if you already know the slug**. Nothing served the tree's SHAPE, so no client could discover a
root or walk to a child: the UI still rendered `/pr/categories/{type}/tree` off the retired
424-node PriceRunner spine. A tree you cannot enumerate is not navigable, which is the same
defect one layer up from "a tree nothing reads is not a taxonomy, it is a report".

⚠️ NO `pytest.mark.asyncio` — this repo has no pytest-asyncio, so such a mark runs the coroutine
as a no-op and the test passes without executing. Async paths are driven with `asyncio.run`
against stubbed collections, exactly as `test_clusters_by_node.py` does.
"""
import asyncio
from pathlib import Path

import pytest
from fastapi import HTTPException

from app.api.routes import clusters as route_mod
from app.api.schemas.clusters import BrowseNodeView, BrowseTreeResponse

SOURCE = Path(route_mod.__file__).read_text()


class _Nodes:
    """A stand-in for the `browse_nodes` motor collection."""

    def __init__(self, docs):
        self.docs = docs

    async def find_one(self, q, *a, **k):
        for d in self.docs:
            if d["_id"] == q.get("_id"):
                return d
        return None

    def find(self, q, *a, **k):
        def match(d):
            for k_, v in q.items():
                if k_ == "_id":
                    # ⛔ `{"_id": {"$in": [...]}}` MUST filter. Skipping `_id` outright handed
                    # every caller the whole collection, so a route that looks up a bounded set
                    # of slugs — the ancestor label map, the adopted shelves — passed here on
                    # rows Mongo would never have returned. A stub that cannot say "no" cannot
                    # prove the query asked for the right thing.
                    if isinstance(v, dict) and "$in" in v and d["_id"] not in v["$in"]:
                        return False
                    continue
                if isinstance(v, dict) and "$ne" in v:
                    if d.get(k_) == v["$ne"]:
                        return False
                elif d.get(k_) != v:
                    return False
            if "parent_slug" in q and not isinstance(q["parent_slug"], dict):
                if d.get("parent_slug") != q["parent_slug"]:
                    return False
            return True

        class _Cur:
            def __init__(self, rows):
                self.rows = rows

            def __aiter__(self):
                async def gen():
                    for r in self.rows:
                        yield r
                return gen()

        return _Cur([d for d in self.docs if match(d)])


def _n(slug, label, parent=None, clusters=0, browsable=True, stores=1):
    return {"_id": slug, "label": label, "parent_slug": parent, "ancestors": [],
            "n_clusters": clusters, "n_stores": stores, "coarse": False,
            "browsable": browsable, "unsorted": False}


TREE = [
    _n("electronics", "Electronics", clusters=0, stores=9),
    {**_n("laptop", "Laptops", parent="electronics", clusters=349, stores=24),
     "ancestors": ["electronics"]},
    _n("tablet", "Tablets", parent="electronics", clusters=476, stores=31),
    _n("ghost", "Discontinued", parent="electronics", clusters=0, browsable=False),
    _n("grocery", "Groceries", clusters=12, stores=5),
]


def _run(**kw):
    original = route_mod.BROWSE_NODES
    route_mod.BROWSE_NODES = _Nodes(TREE)
    try:
        return asyncio.run(route_mod.browse_tree(**kw))
    finally:
        route_mod.BROWSE_NODES = original


# --------------------------------------------------------------------------- routing

def test_the_route_is_declared_BEFORE_the_catch_all():
    """⛔⛔ `/{cluster_id:path}` swallows anything declared after it, and the 404 then reads
    like a missing cluster rather than a routing mistake. A decorated function object carries
    no ordering information, so this must read the SOURCE TEXT."""
    route = SOURCE.find('"/browse-tree"')
    catch_all = SOURCE.find('"/{cluster_id:path}"')
    assert route != -1, "the browse-tree route is not declared at all"
    assert catch_all != -1, "the catch-all moved; re-check this guard"
    assert route < catch_all, (
        "⛔ /browse-tree is declared AFTER the catch-all and is therefore unreachable")


# --------------------------------------------------------------------------- shape

def test_no_parent_returns_the_ROOTS():
    got = _run(parent=None)
    assert {n.slug for n in got.results} == {"electronics", "grocery"}
    assert got.parent is None, "a root listing has no parent node"


def test_a_parent_returns_ITS_CHILDREN_and_echoes_the_parent():
    got = _run(parent="electronics")
    assert {n.slug for n in got.results} == {"laptop", "tablet"}
    assert got.parent is not None and got.parent.slug == "electronics", (
        "the parent is echoed so a client can render a breadcrumb without a second call")


def test_an_UNKNOWN_parent_is_a_404_not_an_empty_list():
    """⛔ An empty list says "this shelf has no children"; a 404 says "there is no such shelf"."""
    with pytest.raises(HTTPException) as exc:
        _run(parent="no-such-shelf")
    assert exc.value.status_code == 404


def test_UNBROWSABLE_children_are_withheld_by_default():
    """⛔ 3,198 of 4,185 published nodes hold no stock anywhere below them. Offering them is
    offering a shelf that renders an empty page — the flag exists precisely so the RENDERER can
    decline, which is this endpoint's job."""
    assert "ghost" not in {n.slug for n in _run(parent="electronics").results}


def test_but_UNBROWSABLE_can_be_asked_for_EXPLICITLY():
    """⛔ `browsable` is a FLAG, never a filter in the publisher. A caller auditing the tree must
    still be able to see every node, or this endpoint becomes a second, hidden filter."""
    got = _run(parent="electronics", browsable_only=False)
    assert "ghost" in {n.slug for n in got.results}


def test_children_are_ordered_by_STOCK_not_alphabetically():
    """⭐ A shopper wants the shelf that has something on it first. `Tablets` (476) outranks
    `Laptops` (349) even though `Laptops` sorts first."""
    assert [n.slug for n in _run(parent="electronics").results] == ["tablet", "laptop"]


def test_a_COUNT_is_returned_so_a_capped_page_is_never_silent():
    got = _run(parent="electronics")
    assert got.count == len(got.results)


def test_the_response_publishes_the_flags_the_RENDERER_needs():
    """⛔ A `response_model` FILTERS: a field the model omits vanishes with no error anywhere."""
    for name in ("parent", "count", "results"):
        assert name in BrowseTreeResponse.model_fields, f"{name} missing from BrowseTreeResponse"
    for name in ("slug", "label", "n_clusters", "coarse", "browsable", "unsorted"):
        assert name in BrowseNodeView.model_fields, f"{name} missing from BrowseNodeView"

# --------------------------------------------------------------- breadcrumb labels

def test_the_parent_carries_ANCESTOR_LABELS_not_just_slugs():
    """⛔ CAUGHT BY RENDERING IT. `ancestors` is a list of SLUGS, so the breadcrumb read
    "All categories > phone-tablet > Smartphones" — a raw slug in the middle of a shopper-facing
    trail. The labels live on `browse_nodes` and the client would otherwise need one extra
    request per ancestor to render one line.

    ⭐ ADDITIVE: `ancestors` keeps its meaning and `ancestor_labels` sits alongside it, index for
    index, so no existing consumer changes."""
    got = _run(parent="laptop")
    assert got.parent is not None
    assert got.parent.ancestor_labels == ["Electronics"], (
        "the parent echoes a LABEL per ancestor slug, in the same order")


def test_ancestor_labels_line_up_INDEX_FOR_INDEX_with_ancestors():
    got = _run(parent="laptop")
    assert len(got.parent.ancestor_labels) == len(got.parent.ancestors), (
        "a missing label must still occupy its slot or the breadcrumb silently reorders")


def test_an_ancestor_MISSING_from_the_tree_falls_back_to_its_slug():
    """⛔ A label lookup that drops the entry shifts every later crumb by one."""
    original = route_mod.BROWSE_NODES
    route_mod.BROWSE_NODES = _Nodes(TREE + [
        {"_id": "orphan", "label": "Orphan", "parent_slug": None, "ancestors": ["vanished"],
         "n_clusters": 1, "n_stores": 1, "coarse": False, "browsable": True, "unsorted": False}])
    try:
        got = asyncio.run(route_mod.browse_tree(parent="orphan"))
    finally:
        route_mod.BROWSE_NODES = original
    assert got.parent.ancestor_labels == ["vanished"], "an unknown ancestor shows its slug"

def test_the_CHILDREN_carry_real_ancestor_labels_too():
    """⛔ SHIPPED BROKEN AND CAUGHT BY READING THE LIVE JSON. The label map was built for the
    parent and never passed to the children's views, so every child's `ancestor_labels` silently
    echoed `ancestors` — a field that looks populated and is useless. The original test only
    asserted on the parent, which is exactly how it got through.

    ⭐ A child's ancestors are the parent's ancestors PLUS the parent itself, all already in
    hand — no extra query."""
    got = _run(parent="electronics")
    kid = next(n for n in got.results if n.slug == "laptop")
    assert kid.ancestor_labels == ["Electronics"], (
        "a child resolves its ancestors' labels, not just the parent")



def test_the_label_map_is_REQUIRED_not_an_optional_argument():
    """⛔⛔ THIS IS THE DEFECT'S ACTUAL SHAPE. `_browse_node_view` carries the comment "ONE
    construction site for both routes", added precisely so the two could not diverge — and they
    diverged anyway, because the labels arrive as an ARGUMENT DEFAULTING TO `None`. Sharing the
    constructor moved the divergence into its parameter list rather than removing it, and two of
    three callers took the default.

    ⭐ A comment cannot enforce this; a signature can. With no default, omitting the map is a
    `TypeError` at import-exercising time rather than a raw shop slug in a shopper's breadcrumb."""
    import inspect

    param = inspect.signature(route_mod._browse_node_view).parameters["labels"]
    assert param.default is inspect.Parameter.empty, (
        "⛔ `labels` has a default again — the next caller can forget it exactly as /by-node did")


def test_NO_ROUTE_builds_a_node_view_directly():
    """⛔ The stronger half of the same guard. A required argument still lets a route pass its
    own map — or `None` — so the singular constructor must be unreachable from route code: every
    call site belongs to `_browse_node_views`, which RESOLVES the labels instead of ACCEPTING
    them. That is the difference between one construction site and one construction site with a
    parameter for getting it wrong.

    ⭐ Reads the AST rather than the text: a formatting change must not break this, and a call
    split across lines must not hide from it."""
    import ast

    tree = ast.parse(SOURCE)
    builder = next((n for n in ast.walk(tree)
                    if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
                    and n.name == "_browse_node_views"), None)
    assert builder is not None, "the collective builder `_browse_node_views` does not exist"

    inside = {id(n) for n in ast.walk(builder)}
    strays = [n.lineno for n in ast.walk(tree)
              if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)
              and n.func.id == "_browse_node_view" and id(n) not in inside]
    assert strays == [], (
        f"⛔ `_browse_node_view` is called outside `_browse_node_views` at lines {strays} — "
        "that caller supplies its own label map and can supply the wrong one")

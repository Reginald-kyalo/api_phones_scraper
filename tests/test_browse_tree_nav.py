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
    _n("laptop", "Laptops", parent="electronics", clusters=349, stores=24),
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

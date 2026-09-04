"""Navigating the presentation tree.

⛔⛔ THE TRAP THIS FILE EXISTS FOR. `clusters.py` ends with `@router.get("/{cluster_id:path}")`
— a catch-all. Any route declared after it is unreachable, and the resulting 404 reads like a
missing cluster rather than a routing mistake. `test_the_route_is_declared_BEFORE_the_catch_all`
is the guard, and it reads the SOURCE TEXT: a decorated function object carries no ordering
information, so nothing importable can answer this question.

⚠️ NO `pytest.mark.asyncio` HERE. This repo has no pytest-asyncio and no async tests; an
`@pytest.mark.asyncio` would be an unknown mark that pytest warns about and runs as a no-op
coroutine, i.e. a test that passes without executing. The one async contract worth unit-testing
(404 on an unknown node) is driven with `asyncio.run` against a stubbed collection instead.
"""
import asyncio
from pathlib import Path

import pytest
from fastapi import HTTPException

from app.api.routes import clusters as route_mod
from app.api.schemas.clusters import BrowseNodeView, ClusterNodeResponse

SOURCE = Path(route_mod.__file__).read_text()


def test_the_route_is_declared_BEFORE_the_catch_all():
    by_node = SOURCE.find('"/by-node/{node_slug}"')
    catch_all = SOURCE.find('"/{cluster_id:path}"')
    assert by_node != -1, "the by-node route is not declared at all"
    assert catch_all != -1, "the catch-all moved; re-check this guard"
    assert by_node < catch_all, (
        "⛔ /by-node is declared AFTER the catch-all and is therefore unreachable")


def test_the_response_model_carries_the_node_and_a_TOTAL():
    fields = ClusterNodeResponse.model_fields
    assert "node" in fields and "results" in fields
    assert "total" in fields, (
        "⛔ without `total` a capped page is silent truncation — the cap-starvation lesson")


def test_the_node_view_publishes_the_flags_the_publisher_writes():
    """⛔ A `response_model` FILTERS the response: a field the model omits vanishes with no
    error anywhere. `coarse` and `browsable` are the two the renderer needs."""
    for name in ("slug", "label", "parent_slug", "ancestors", "n_clusters", "n_stores",
                 "coarse", "browsable", "unsorted"):
        assert name in BrowseNodeView.model_fields, f"{name} is missing from BrowseNodeView"


def test_load_browse_REREADS_once_the_TTL_has_passed():
    """⛔⛔ `_BROWSE` was a process global read ONCE with no invalidation, so after every
    `publish_browse_tree --apply` this API served the PREVIOUS tree until somebody restarted
    it. The engine's own handoff records this exact shape — "a long-running console serves the
    code it started with" — and it had reached production.

    ⭐ Drives `load_browse`, not `_load_browse`: the inner reader was never the cache, so
    asserting on it proves nothing about invalidation."""
    from app.api import taxonomy as tax

    calls = []

    def fake_load(db):
        calls.append(1)
        return ({}, {})

    orig_load, orig_ttl = tax._load_browse, tax.BROWSE_TTL_SECONDS
    tax._load_browse, tax.BROWSE_TTL_SECONDS = fake_load, 0
    tax.reset_browse_cache()
    try:
        tax.load_browse(client={"taxonomy_db": None})
        tax.load_browse(client={"taxonomy_db": None})
        assert len(calls) == 2, "a zero TTL must re-read on every call"
    finally:
        tax._load_browse, tax.BROWSE_TTL_SECONDS = orig_load, orig_ttl
        tax.reset_browse_cache()


def test_load_browse_still_CACHES_inside_the_TTL():
    """⛔ The fix must not turn a cached read into a per-request Mongo round trip for 100,158
    placements. Inside the window it stays cached."""
    from app.api import taxonomy as tax

    calls = []

    def fake_load(db):
        calls.append(1)
        return ({}, {})

    orig_load, orig_ttl = tax._load_browse, tax.BROWSE_TTL_SECONDS
    tax._load_browse, tax.BROWSE_TTL_SECONDS = fake_load, 3600
    tax.reset_browse_cache()
    try:
        tax.load_browse(client={"taxonomy_db": None})
        tax.load_browse(client={"taxonomy_db": None})
        assert len(calls) == 1, "inside the TTL the tree is served from cache"
    finally:
        tax._load_browse, tax.BROWSE_TTL_SECONDS = orig_load, orig_ttl
        tax.reset_browse_cache()


def test_reset_browse_cache_forces_the_next_read():
    from app.api import taxonomy as tax
    tax._BROWSE = ({"x": {}}, {})
    tax.reset_browse_cache()
    assert tax._BROWSE is None, "reset clears the cached tree"


def test_an_unknown_node_is_a_404_not_an_empty_list():
    """⛔ An empty list says "this shelf has nothing"; a 404 says "there is no such shelf".
    Collapsing the two hides a broken link forever.

    ⭐ Stubs the collection rather than reaching Mongo: the 404 path returns before it touches
    placements or clusters, so this stays a unit test."""

    class _Missing:
        async def find_one(self, *a, **k):
            return None

    original = route_mod.BROWSE_NODES
    route_mod.BROWSE_NODES = _Missing()
    try:
        with pytest.raises(HTTPException) as exc:
            asyncio.run(route_mod.clusters_by_node(node_slug="no-such-node-xyz"))
        assert exc.value.status_code == 404
    finally:
        route_mod.BROWSE_NODES = original


# --------------------------------------------------------------- breadcrumb labels

class _NoPlacements:
    """`browse_placements` with nothing on any shelf — this file asserts on `node`, not rows."""

    def find(self, q, *a, **k):
        class _Cur:
            def __aiter__(self):
                async def gen():
                    return
                    yield  # pragma: no cover - an empty async generator
                return gen()
        return _Cur()


class _NoClusters:
    async def count_documents(self, q):
        return 0

    def find(self, q, *a, **k):
        class _Cur:
            def sort(self, *a, **k): return self
            def skip(self, n): return self
            async def to_list(self, length=None): return []
        return _Cur()


def _by_node(slug):
    from tests.test_browse_tree_nav import TREE, _Nodes

    saved = (route_mod.BROWSE_NODES, route_mod.BROWSE_PLACEMENTS, route_mod.CLUSTERS)
    route_mod.BROWSE_NODES = _Nodes(TREE)
    route_mod.BROWSE_PLACEMENTS = _NoPlacements()
    route_mod.CLUSTERS = _NoClusters()
    try:
        return asyncio.run(route_mod.clusters_by_node(node_slug=slug))
    finally:
        (route_mod.BROWSE_NODES, route_mod.BROWSE_PLACEMENTS, route_mod.CLUSTERS) = saved


def test_by_node_carries_REAL_ancestor_labels_not_raw_SHOP_SLUGS():
    """⛔⛔ MEASURED LIVE 2026-09-04 AND SHIPPED BROKEN. The same node, the same field, two
    answers: `/browse-tree?parent=smartphone` returned `["Phones and tablets"]` while
    `/by-node/smartphone` returned `["phone-tablet"]`. Because the fallback is `or slug` the
    failure is SILENT and PLAUSIBLE — the field is populated, index for index, and full of raw
    shop slugs, so any breadcrumb built here renders `phone-tablet` to a shopper.

    ⭐ The shared constructor did NOT prevent this. `_browse_node_view` carries the comment
    "ONE construction site for both routes" and the two diverged anyway, because the labels
    arrived as an ARGUMENT that this route passed as `None`."""
    node = _by_node("laptop")["node"]
    assert node.ancestors == ["electronics"]
    assert node.ancestor_labels == ["Electronics"], (
        "a breadcrumb built from /by-node must not render a raw shop slug")

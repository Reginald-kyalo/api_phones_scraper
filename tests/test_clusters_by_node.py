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

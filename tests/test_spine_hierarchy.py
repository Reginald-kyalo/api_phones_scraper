"""The published taxonomy hierarchy at ``/clusters/spine-hierarchy``.

The publisher is the only authority for names and relationships.  These tests
use complete stamped node documents so the API is verified at its boundary
without importing a second taxonomy definition.
"""
import asyncio
from pathlib import Path

import pytest
from fastapi import HTTPException

from app.api.routes import clusters as route_mod
from app.api.schemas.clusters import SpineHierarchyResponse, SpineNodeClustersResponse


class _Nodes:
    def __init__(self, docs):
        self.docs = docs

    def find(self, query, *args, **kwargs):
        def matches(doc):
            for key, value in query.items():
                if isinstance(value, dict) and "$ne" in value:
                    if doc.get(key) == value["$ne"]:
                        return False
                elif doc.get(key) != value:
                    return False
            return True

        class _Cursor:
            def __init__(self, rows):
                self.rows = rows

            def __aiter__(self):
                async def rows():
                    for row in self.rows:
                        yield row
                return rows()

        return _Cursor([doc for doc in self.docs if matches(doc)])


def _node(source_id, spine_slug, name, parent, department, clusters):
    return {
        "_id": source_id,
        "label": source_id,
        "spine_slug": spine_slug,
        "spine_name": name,
        "spine_parent_slug": parent,
        "spine_department": department,
        "n_clusters": clusters,
    }


TREE = [
    _node("phones-source", "phones", "Phones, Tablets & Wearables", None, "phones", 2),
    _node("wearables-source", "wearables", "Wearables", "phones", "phones", 3),
    _node("smartwatch-source", "smartwatches", "Smartwatches", "wearables", "phones", 5),
    _node("empty-source", "empty", "Empty family", "phones", "phones", 0),
    _node("pantry-source", "pantry", "Pantry", None, "groceries", 7),
    # A second source node may publish into the same canonical type. It must add
    # to direct stock rather than creating a duplicate navigation node.
    _node("smartwatch-source-2", "smartwatches", "Smartwatches", "wearables", "phones", 4),
]


def _run(tree=TREE):
    saved = route_mod.BROWSE_NODES
    route_mod.BROWSE_NODES = _Nodes(tree)
    try:
        return asyncio.run(route_mod.spine_hierarchy())
    finally:
        route_mod.BROWSE_NODES = saved


def test_the_response_schema_exposes_recursive_stable_navigation_nodes():
    assert {"count", "results"} <= set(SpineHierarchyResponse.model_fields)
    node = SpineHierarchyResponse.model_fields["results"].annotation.__args__[0]
    assert {"id", "label", "parentId", "departmentId", "children", "directTotal", "total"} <= set(node.model_fields)


def test_hierarchy_uses_published_ids_and_parents_and_rolls_up_direct_stock():
    got = _run()

    assert [node.id for node in got.results] == ["phones", "pantry"]
    phones = next(node for node in got.results if node.id == "phones")
    assert phones.label == "Phones, Tablets & Wearables"
    assert phones.parentId is None
    assert phones.directTotal == 2
    assert phones.total == 14
    assert [child.id for child in phones.children] == ["wearables"]
    wearables = phones.children[0]
    assert wearables.parentId == "phones"
    assert wearables.directTotal == 3
    assert wearables.total == 12
    assert wearables.children[0].directTotal == 9


def test_unstocked_nodes_are_excluded_without_hiding_stocked_descendants():
    got = _run()
    phones = next(node for node in got.results if node.id == "phones")
    assert [child.id for child in phones.children] == ["wearables"]


def test_orphaned_published_nodes_remain_reachable_as_roots():
    got = _run(TREE + [
        _node("orphan-source", "orphan", "Unresolved", "missing-parent", "other", 1),
    ])
    orphan = next(node for node in got.results if node.id == "orphan")
    assert orphan.parentId is None
    assert orphan.total == 1


def test_the_route_is_declared_before_the_cluster_catch_all():
    source = Path(route_mod.__file__).read_text()
    assert source.find('"/spine-hierarchy"') < source.find('"/{cluster_id:path}"')


class _Placements:
    def __init__(self, by_source):
        self.by_source = by_source

    def find(self, query, *args, **kwargs):
        wanted = set(query["node_slug"]["$in"])
        rows = [{"_id": cluster_id} for source in wanted
                for cluster_id in self.by_source.get(source, [])]

        class _Cursor:
            def __aiter__(self):
                async def rows_iter():
                    for row in rows:
                        yield row
                return rows_iter()
        return _Cursor()


class _Clusters:
    def __init__(self):
        self.docs = [
            {"_id": "P", "cluster_id": "P", "n_listings": 3, "is_multi_store": True},
            {"_id": "W", "cluster_id": "W", "n_listings": 2, "is_multi_store": False},
            {"_id": "S", "cluster_id": "S", "n_listings": 1, "is_multi_store": True},
        ]

    def _match(self, query):
        ids = set(query["_id"]["$in"])
        return [doc for doc in self.docs if doc["_id"] in ids and
                (not query.get("is_multi_store") or doc["is_multi_store"])]

    async def count_documents(self, query):
        return len(self._match(query))

    def find(self, query, *args, **kwargs):
        rows = self._match(query)

        class _Cursor:
            def sort(self, key, direction):
                rows.sort(key=lambda row: row.get(key, 0), reverse=direction < 0)
                return self

            def skip(self, offset):
                self.rows = rows[offset:]
                return self

            async def to_list(self, length):
                return getattr(self, "rows", rows)[:length]
        return _Cursor()


def _node_listing(node_id, **kwargs):
    kwargs.setdefault("multi_store_only", False)
    kwargs.setdefault("limit", 20)
    kwargs.setdefault("offset", 0)
    saved = route_mod.BROWSE_NODES, route_mod.BROWSE_PLACEMENTS, route_mod.CLUSTERS
    route_mod.BROWSE_NODES = _Nodes(TREE)
    route_mod.BROWSE_PLACEMENTS = _Placements({
        "phones-source": ["P"], "wearables-source": ["W"], "smartwatch-source": ["S"],
        "smartwatch-source-2": ["S"],
    })
    route_mod.CLUSTERS = _Clusters()
    try:
        return asyncio.run(route_mod.spine_node_clusters(node_id, **kwargs))
    finally:
        route_mod.BROWSE_NODES, route_mod.BROWSE_PLACEMENTS, route_mod.CLUSTERS = saved


def test_spine_node_listing_includes_the_exact_node_and_its_descendants_once():
    got = _node_listing("phones")
    assert got.total == 3
    assert [row.cluster_id for row in got.results] == ["P", "W", "S"]


def test_spine_node_listing_preserves_existing_comparison_filters_and_pagination():
    got = _node_listing("wearables", multi_store_only=True, limit=1, offset=0)
    assert got.total == 1
    assert got.count == 1
    assert [row.cluster_id for row in got.results] == ["S"]


def test_spine_node_listing_returns_404_for_an_unknown_published_node():
    with pytest.raises(HTTPException) as exc:
        _node_listing("unknown")
    assert exc.value.status_code == 404


def test_spine_node_listing_has_a_typed_node_total_and_results_contract():
    assert {"node", "count", "total", "results"} <= set(SpineNodeClustersResponse.model_fields)

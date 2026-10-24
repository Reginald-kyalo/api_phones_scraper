"""Pure-function tests for the catalogue spine-shelf capture (scripts/capture_catalogue_shelves.py).

A tiny spine stands in for `_spine.json`: one department, two families, three leaves. Families are placed at
every level, because the export places some at a department or family node rather than a leaf, and those must
show on that node's own page.
"""
import json

import pytest

from scripts.capture_catalogue_shelves import (
    MAX_DETAIL_BUCKETS,
    MIN_DETAIL_BUCKETS,
    SHELF_PAGE_SIZE,
    ancestors,
    browse_node,
    children_with_families,
    detail_buckets_for,
    load_spine,
    navigation,
    node_counts,
    paged,
    place_families,
    rank_key,
    resolves_in_category_shard,
    tree_payload,
)
from scripts.capture_demo_dataset import SHARD_DIGITS

NODES = {n["slug"]: n for n in [
    {"slug": "phones-wearables", "name": "Phones & Wearables", "parent_slug": None, "level": 0, "department": "phones-wearables"},
    {"slug": "mobile-phones", "name": "Mobile Phones", "parent_slug": "phones-wearables", "level": 1, "department": "phones-wearables"},
    {"slug": "smartphones", "name": "Smartphones", "parent_slug": "mobile-phones", "level": 2, "department": "phones-wearables"},
    {"slug": "feature-phones", "name": "Feature Phones", "parent_slug": "mobile-phones", "level": 2, "department": "phones-wearables"},
    {"slug": "wearables", "name": "Wearables", "parent_slug": "phones-wearables", "level": 1, "department": "phones-wearables"},
    {"slug": "smartwatches", "name": "Smartwatches", "parent_slug": "wearables", "level": 2, "department": "phones-wearables"},
    {"slug": "groceries", "name": "Groceries", "parent_slug": None, "level": 0, "department": "groceries"},
]}

PLACED = {
    "mobile-phones::a": "smartphones",
    "mobile-phones::b": "smartphones",
    "other::c": "feature-phones",
    "other::d": "mobile-phones",      # family level
    "other::e": "phones-wearables",   # department level
    "other::f": "not-a-spine-slug",
}
STORES = {"mobile-phones::a": ["jumia", "kilimall"], "mobile-phones::b": ["jumia"], "other::c": ["avechi"],
          "other::d": ["jumia"], "other::e": ["x"]}


@pytest.fixture
def placed():
    return place_families(PLACED, NODES)


def test_ancestors_are_root_first_and_exclude_self():
    assert ancestors("smartphones", NODES) == ["phones-wearables", "mobile-phones"]
    assert ancestors("phones-wearables", NODES) == []


def test_families_show_on_their_own_node_and_every_ancestor(placed):
    direct, subtree = placed
    assert direct["mobile-phones"] == ["other::d"]
    assert direct["phones-wearables"] == ["other::e"]
    assert set(subtree["mobile-phones"]) == {"mobile-phones::a", "mobile-phones::b", "other::c", "other::d"}
    assert len(subtree["phones-wearables"]) == 5
    # never pushed down to a leaf
    assert "other::d" not in subtree["smartphones"]


def test_a_slug_the_spine_does_not_have_is_skipped(placed):
    direct, subtree = placed
    assert "not-a-spine-slug" not in direct and "not-a-spine-slug" not in subtree
    assert all("other::f" not in ids for ids in subtree.values())


def test_counts_are_derived_from_the_rows(placed):
    direct, subtree = placed
    assert node_counts("smartphones", direct, subtree, STORES) == {
        "n_clusters": 2, "n_clusters_subtree": 2, "n_stores": 2}
    assert node_counts("mobile-phones", direct, subtree, STORES) == {
        "n_clusters": 1, "n_clusters_subtree": 4, "n_stores": 3}


def test_only_nodes_holding_families_are_children(placed):
    _, subtree = placed
    assert children_with_families(None, NODES, subtree) == ["phones-wearables"]   # groceries holds none
    assert children_with_families("phones-wearables", NODES, subtree) == ["mobile-phones"]  # wearables holds none
    assert children_with_families("mobile-phones", NODES, subtree) == ["smartphones", "feature-phones"]  # biggest first


def test_tree_payload_has_the_browse_tree_shape(placed):
    direct, subtree = placed
    tree = tree_payload("mobile-phones", NODES, direct, subtree, STORES)
    assert tree["count"] == 2 == len(tree["results"])
    parent = tree["parent"]
    for key in ("slug", "label", "parent_slug", "ancestors", "ancestor_labels", "n_clusters",
                "n_clusters_subtree", "n_stores", "coarse", "browsable", "unsorted"):
        assert key in parent
    assert parent["ancestor_labels"] == ["Phones & Wearables"]
    assert [c["slug"] for c in tree["results"]] == ["smartphones", "feature-phones"]
    leaf = browse_node("smartphones", NODES, direct, subtree, STORES)
    assert leaf["coarse"] is False and parent["coarse"] is True


def test_navigation_lists_departments_families_leaves_and_is_stamped(placed):
    direct, subtree = placed
    nav = navigation(NODES, direct, subtree, STORES, source="db.coll", captured_at="2026-10-24T16:00:00")
    assert nav["source_collection"] == "db.coll" and nav["captured_at"] == "2026-10-24T16:00:00"
    assert nav["n_families"] == 5
    [dept] = nav["departments"]
    assert (dept["slug"], dept["n_clusters"], dept["n_clusters_subtree"]) == ("phones-wearables", 1, 5)
    [family] = dept["families"]
    assert family["slug"] == "mobile-phones" and family["n_clusters"] == 1
    assert [leaf["slug"] for leaf in family["leaves"]] == ["smartphones", "feature-phones"]
    json.dumps(nav)  # the build imports it as JSON


def test_rank_key_puts_comparable_multi_store_first_and_demoted_last():
    rows = [
        {"cluster_id": "x::single", "image": "i", "n_stores": 1},
        {"cluster_id": "x::off", "image": "i", "off_category": True, "like_for_like_spread_pct": 50},
        {"cluster_id": "x::multi", "image": "i", "n_stores": 3, "like_for_like_spread_pct": 12},
        {"cluster_id": "x::noimage", "image": None, "like_for_like_spread_pct": 80},
    ]
    assert [r["cluster_id"] for r in sorted(rows, key=rank_key)] == ["x::multi", "x::single", "x::noimage", "x::off"]


def test_a_family_resolves_in_its_category_shard_only_when_the_id_prefix_is_that_category():
    cats = {"mobile-phones", "groceries"}
    assert resolves_in_category_shard("mobile-phones::a", "mobile-phones", cats)
    assert not resolves_in_category_shard("other::c", None, cats)
    # a spine-prefixed id whose prefix happens to be a legacy slug, filed under another category
    assert not resolves_in_category_shard("mobile-phones::z", "groceries", cats)
    assert not resolves_in_category_shard("tvs::a", "tvs", cats)  # category not captured


def test_detail_buckets_fit_the_three_digit_suffix():
    assert detail_buckets_for(0) == MIN_DETAIL_BUCKETS
    assert detail_buckets_for(10**12) == MAX_DETAIL_BUCKETS
    assert len(str(MAX_DETAIL_BUCKETS)) == SHARD_DIGITS


def test_paging_never_returns_no_pages():
    assert paged([]) == [[]]
    assert [len(p) for p in paged(list(range(SHELF_PAGE_SIZE + 1)))] == [SHELF_PAGE_SIZE, 1]


def test_page_size_matches_the_frontend():
    from pathlib import Path
    ts = (Path(__file__).parents[1] / "dealsonline_ui_ux_mock/src/app/lib/demoSource.ts").read_text()
    assert f"const SHELF_PAGE_SIZE = {SHELF_PAGE_SIZE};" in ts


def test_load_spine_reads_nodes(tmp_path):
    path = tmp_path / "_spine.json"
    path.write_text(json.dumps({"nodes": list(NODES.values()), "cross_refs": []}))
    assert load_spine(path)["smartphones"]["parent_slug"] == "mobile-phones"

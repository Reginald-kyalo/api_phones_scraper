"""A shelf's size is what is BELOW it, not what sits directly on it.

⛔⛔ WHY THIS EXISTS. `browse_nodes.n_clusters` is OWN stock only, and every products page
(`/by-node/{slug}`) renders the DESCENDANT CLOSURE. Measured live 2026-08-19 against 4,185
published nodes:

    food-cupboard        n_clusters 2,010  ->  by-node total  6,220   (3.1x)
    phone-tablet         n_clusters 19,301 ->  by-node total 23,466
    smartphone           n_clusters 2,313  ->  by-node total  2,929

So a menu that prints `n_clusters` promises 2,010 products and delivers 6,220. The UI cannot
compute the real figure itself — it would have to crawl all 4,185 nodes to add up one number.

⛔ AND IT IS NOT ONLY A DISPLAY BUG. `/browse-tree` ORDERS BY `n_clusters`, and the frontend
takes the top N roots for its menu. Ordering 553 browsable roots by own stock instead of subtree
stock swaps 6 of the top 12: `Electronics & Computers` (20,772 in subtree — the second largest
department in the corpus) falls to rank 20 and is CUT from the menu, while `Battery Chargers`
(553 clusters, one shop) is promoted into it. The ordering is the bug; the number is the symptom.

⭐ ONE PASS, NO RECURSION. `ancestors` is materialised on every node, so each node contributes
its own `n_clusters` to itself and to each of its ancestors in a single scan.

⚠️ NO `pytest.mark.asyncio` — this repo has no pytest-asyncio, so such a mark runs the coroutine
as a no-op and the test passes without executing. Async paths are driven with `asyncio.run`
against stubbed collections, exactly as `test_browse_tree_nav.py` does.
"""
import asyncio

from app.api.routes import clusters as route_mod
from app.api.schemas.clusters import BrowseNodeView

from tests.test_browse_tree_nav import _Nodes, _n


#   dept (0 own)
#     ├── big   (10 own)
#     │     └── bigger (500 own)
#     └── small (100 own)
#   loner (7 own)
#
# `dept` holds NOTHING of its own and 610 below it; `small` outranks `big` on own stock and is
# outranked on subtree stock. That inversion is the whole point of the fixture.
DEEP = [
    _n("dept", "Department", clusters=0),
    {**_n("big", "Big", parent="dept", clusters=10), "ancestors": ["dept"]},
    {**_n("bigger", "Bigger", parent="big", clusters=500), "ancestors": ["dept", "big"]},
    {**_n("small", "Small", parent="dept", clusters=100), "ancestors": ["dept"]},
    _n("loner", "Loner", clusters=7),
]


def _with_tree(docs, coro):
    original = route_mod.BROWSE_NODES
    route_mod.BROWSE_NODES = _Nodes(docs)
    route_mod.reset_subtree_cache()
    try:
        return asyncio.run(coro())
    finally:
        route_mod.BROWSE_NODES = original
        route_mod.reset_subtree_cache()


# --------------------------------------------------------------------------- the rollup

def test_a_shelf_with_no_own_stock_still_reports_what_is_BELOW_it():
    """⭐ This is why a coarse department is never an empty page."""
    totals = _with_tree(DEEP, route_mod._subtree_totals)
    assert totals["dept"] == 610, "0 own + 10 + 500 + 100"


def test_the_rollup_reaches_GRANDCHILDREN_not_just_direct_children():
    """⛔ Summing one level would give `big` 10 and lose `bigger`'s 500 entirely."""
    totals = _with_tree(DEEP, route_mod._subtree_totals)
    assert totals["big"] == 510, "10 own + 500 from its grandchild"


def test_a_LEAF_reports_its_own_stock_unchanged():
    totals = _with_tree(DEEP, route_mod._subtree_totals)
    assert totals["bigger"] == 500
    assert totals["loner"] == 7


def test_EVERY_node_gets_an_entry_even_one_holding_nothing():
    """⛔ A missing key would make the caller fall back to `n_clusters` for exactly the coarse
    nodes the rollup exists to fix."""
    totals = _with_tree(DEEP, route_mod._subtree_totals)
    assert set(totals) == {"dept", "big", "bigger", "small", "loner"}


# --------------------------------------------------------------------------- the contract

def test_the_response_PUBLISHES_the_subtree_total():
    """⛔ A `response_model` FILTERS: a field the model omits vanishes with no error anywhere."""
    assert "n_clusters_subtree" in BrowseNodeView.model_fields


def test_n_clusters_stays_OWN_stock_so_no_existing_consumer_moves():
    """⭐ ADDITIVE. `n_clusters` keeps its meaning; the closure sits alongside it."""
    got = _with_tree(DEEP, lambda: route_mod.browse_tree(parent="dept"))
    big = next(n for n in got.results if n.slug == "big")
    assert big.n_clusters == 10, "own stock, unchanged"
    assert big.n_clusters_subtree == 510, "the closure, alongside it"


def test_the_PARENT_echo_carries_the_subtree_total_too():
    """⛔ The parent is what a page headline renders; it needs the honest number most."""
    got = _with_tree(DEEP, lambda: route_mod.browse_tree(parent="dept"))
    assert got.parent is not None
    assert got.parent.n_clusters == 0 and got.parent.n_clusters_subtree == 610


# --------------------------------------------------------------------------- the ordering

def test_children_are_ordered_by_SUBTREE_stock_not_own_stock():
    """⛔⛔ THE ACTUAL DEFECT. `small` (100 own) beats `big` (10 own) on the old sort, but `big`
    carries 510 below it. On the live tree this is what cut `Electronics & Computers` — 20,772
    clusters — out of a top-12 menu in favour of a 553-cluster single-shop shelf."""
    got = _with_tree(DEEP, lambda: route_mod.browse_tree(parent="dept"))
    assert [n.slug for n in got.results] == ["big", "small"]


def test_ROOTS_are_ordered_by_subtree_stock_too():
    """The menu takes the top N ROOTS, so this is the ordering that actually ships."""
    got = _with_tree(DEEP, lambda: route_mod.browse_tree(parent=None))
    assert [n.slug for n in got.results] == ["dept", "loner"], (
        "`dept` holds 0 of its own and must still outrank a 7-cluster leaf")

"""The REDESIGN spine's departments — the parallel route.

⚠️ NO `pytest.mark.asyncio` — this repo has no pytest-asyncio, so such a mark runs the
coroutine as a no-op and the test passes without executing.
"""
import asyncio
from pathlib import Path

# ⭐ `pytest` and `HTTPException` are unused HERE — kept because Task 4 (the
# `/by-spine-department/{dept_id}` coverage, not in scope for this round) adds tests that
# need both: `pytest.raises` around the 404, and `HTTPException` to assert on it directly.
import pytest
from fastapi import HTTPException

from app.api.routes import clusters as route_mod

from tests.test_browse_tree_nav import _n
from tests.test_departments_api import _Clusters, _Placements, _TreeNodes

SOURCE = Path(route_mod.__file__).read_text()


def _s(slug, label, dept, dept_label, level, clusters, parent=None, ancestors=(), subtree=None):
    return {**_n(slug, label, parent=parent, clusters=clusters),
            "ancestors": list(ancestors),
            # ⛔⛔ `subtree` DEFAULTS TO `clusters` ONLY FOR A LEAF. Real data never has
            # `n_clusters_subtree == n_clusters` on a node with children — the subtree rolls
            # up descendants, so a parent's own stock UNDERSTATES it. Leaving both fields
            # equal on `phone` made `test_a_departments_mass_SUMS_OWN_STOCK_not_the_subtree`
            # vacuous: summing `n_clusters` and summing `n_clusters_subtree` landed on the
            # same 130 either way, so the test could not have caught the regression it is
            # named for. `phone` now passes `subtree=130` explicitly (100 own + case's 30).
            "n_clusters_subtree": clusters if subtree is None else subtree,
            "spine_slug": f"x-{slug}", "spine_department": dept,
            "spine_department_label": dept_label, "spine_level": level,
            "spine_disposition": "node"}


#   phones/  'Phones'(100, subtree 130) -> phones-wearables, and its CHILD 'Cases'(30) in the
#            same dept — the subtree rolls Cases up, own stock does not
#   audio/   'Audio'(40)    -> tv-audio
#   loose/   'Salt'(5)      -> a facet: mapped to NOTHING, must not appear
TREE = [
    _s("phone", "Phones", "phones-wearables", "Phones & Wearables", 0, 100, subtree=130),
    _s("case", "Cases", "phones-wearables", "Phones & Wearables", 2, 30,
       parent="phone", ancestors=("phone",)),
    _s("audio", "Audio", "tv-audio", "TV & Audio", 0, 40),
    {**_n("salt", "Salt", clusters=5), "n_clusters_subtree": 5, "spine_slug": None,
     "spine_department": None, "spine_department_label": None, "spine_level": None,
     "spine_disposition": "facet"},
]

PLACED = {"phone": [f"P{i}" for i in range(100)], "case": [f"C{i}" for i in range(30)],
          "audio": [f"A{i}" for i in range(40)], "salt": ["S0"]}
ALL_IDS = [c for v in PLACED.values() for c in v]


def _with_tree(coro, tree=TREE):
    saved = (route_mod.BROWSE_NODES, route_mod.BROWSE_PLACEMENTS, route_mod.CLUSTERS)
    route_mod.BROWSE_NODES = _TreeNodes(tree)
    route_mod.BROWSE_PLACEMENTS = _Placements(PLACED)
    route_mod.CLUSTERS = _Clusters(ALL_IDS)
    route_mod.reset_spine_departments_cache()
    try:
        return asyncio.run(coro())
    finally:
        (route_mod.BROWSE_NODES, route_mod.BROWSE_PLACEMENTS, route_mod.CLUSTERS) = saved
        route_mod.reset_spine_departments_cache()


def test_the_routes_are_declared_BEFORE_the_catch_all():
    """⛔⛔ `/{cluster_id:path}` swallows anything declared after it, and the 404 then reads
    like a missing cluster rather than a routing mistake."""
    catch_all = SOURCE.find('"/{cluster_id:path}"')
    for route in ('"/spine-departments"', '"/by-spine-department/{dept_id}"'):
        at = SOURCE.find(route)
        assert at != -1, f"{route} is not declared at all"
        assert at < catch_all, f"⛔ {route} is declared AFTER the catch-all and is unreachable"


def test_the_departments_are_discovered_from_the_STAMPED_FIELD():
    """⭐ No curated config. The departments ARE whatever the engine stamped, so a spine
    change reaches the storefront through a republish rather than a code edit."""
    got = _with_tree(route_mod.spine_departments)
    assert {d.id for d in got["results"]} == {"phones-wearables", "tv-audio"}


def test_a_department_carries_the_STAMPED_LABEL_not_a_title_cased_slug():
    """⛔ `tv-audio-home-entertainment` does not title-case into `TV, Audio & Home
    Entertainment`. The label is published, which is why the bridge carries it."""
    got = _with_tree(route_mod.spine_departments)
    assert {d.id: d.label for d in got["results"]}["phones-wearables"] == "Phones & Wearables"


def test_a_departments_mass_SUMS_OWN_STOCK_not_the_subtree():
    """⛔⛔ THIS INVERTS THE RULE THAT HOLDS EVERYWHERE ELSE IN THIS CODEBASE. Measured live
    2026-09-04: summing `n_clusters_subtree` over each department's nodes gives 167,610
    against a corpus of 102,038 — `home-appliances` inflates 6.90x — because a spine
    department is a SET closed under the label mapping, not a subtree, so it already
    contains its descendants. Here `Cases`(30, subtree 30) is a child of `Phones`(100, own;
    subtree 130 because it rolls Cases up) in the SAME department: the answer is 130 (own
    stock summed: 100 + 30), and the subtree sum would say 160 (130 + 30) — inflated because
    Phones' subtree already contains Cases, and summing both counts Cases twice."""
    got = _with_tree(route_mod.spine_departments)
    assert {d.id: d.n_clusters for d in got["results"]}["phones-wearables"] == 130


def test_a_node_mapped_to_NOTHING_reaches_no_department():
    """⛔ `Salt` is a `facet` disposition — ruled, not missing. It must not invent a
    department, and it must not land in someone else's."""
    got = _with_tree(route_mod.spine_departments)
    assert all(d.id for d in got["results"]), "a null department became an id"
    assert sum(d.n_clusters for d in got["results"]) == 170, "the facet's 5 leaked in"


def test_the_departments_are_ordered_by_STOCK():
    got = _with_tree(route_mod.spine_departments)
    assert [d.id for d in got["results"]] == ["phones-wearables", "tv-audio"]

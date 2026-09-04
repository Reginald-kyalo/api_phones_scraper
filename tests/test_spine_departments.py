"""The REDESIGN spine's departments — the parallel route.

⚠️ NO `pytest.mark.asyncio` — this repo has no pytest-asyncio, so such a mark runs the
coroutine as a no-op and the test passes without executing.
"""
import asyncio
from pathlib import Path

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


# ================================================================================================
# `/by-spine-department/{dept_id}` — Task 4, RE-SCOPED.
#
# ⛔ THE ROUTE WAS ALREADY IMPLEMENTED (Task 3's own route-ordering test required it be
# declared). It sources placements from `_spine_departments()`'s FULL stamped node set for
# `dept_id`, not from descendant closure over the maximal shelves — a spine department is
# already a set closed under the label mapping (see `_a_departments_mass_SUMS_OWN_STOCK`
# above), so nothing is lost by not walking `ancestors` again. Walking `ancestors` from the
# maximal shelves would be WRONG here: a descendant's label maps wherever ITS OWN label maps,
# not its ancestor's, so closure pulls in nodes belonging to OTHER departments (measured live
# 2026-09-04: `home-appliances` 3,182 -> 21,821, a 6.90x inflation).
# ================================================================================================

def _dept(i, **kw):
    kw.setdefault("multi_store_only", False)
    kw.setdefault("limit", 20)
    kw.setdefault("offset", 0)
    return lambda: route_mod.spine_department_clusters(i, **kw)


def test_the_page_COVERS_every_node_the_department_claims():
    """⭐ NOT descendant closure — renamed from a brief that assumed one. `Cases`(30) is a
    child of `Phones`(100) in the SAME department, so `total` sums placements over the
    department's full stamped node set (both `phone` and `case`), landing on 130 — not
    because a closure walk found `case` below `phone`, but because `case` is simply a member
    of `phones-wearables` in its own right, exactly like `phone` is.

    RED: in `spine_department_clusters`, replacing the full `{"spine_department": dept_id}`
    query with `[s["_id"] for s in g["shelves"]]` (maximal shelves only) drops `case` and
    this fails on 100 != 130."""
    assert _with_tree(_dept("phones-wearables"))["total"] == 130


def test_the_page_offers_NO_include_descendants_SWITCH():
    """⛔ A department without its subtrees is not a smaller department, it is a wrong one.

    RED: adding `include_descendants: bool = Query(True)` to the route's signature makes
    this fail."""
    import inspect
    assert "include_descendants" not in inspect.signature(
        route_mod.spine_department_clusters).parameters


def test_the_menu_and_the_page_AGREE():
    """⛔⛔ THE LOAD-BEARING ASSERTION. The claim on a control must equal the rows that
    control opens, or a department advertises a page it will not show.

    RED: the same maximal-shelves-only mutation as the COVERS test above makes the page
    answer 100 while the menu still says 130 — this fails on 100 != 130."""
    menu = {d.id: d.n_clusters for d in _with_tree(route_mod.spine_departments)["results"]}
    page = _with_tree(_dept("phones-wearables"))
    assert page["total"] == menu["phones-wearables"]


def test_the_page_returns_MAXIMAL_shelves_only():
    """⛔ `Cases` is inside `Phones` and both are in the department. Offering both renders
    the same products behind two doors and makes the counts look like they double.

    RED: inverting the filter in `_spine_departments()` from
    `not (set(d.get("ancestors") or []) & mine)` to `(set(d.get("ancestors") or []) & mine)`
    flips which node is "maximal" — `case` (whose ancestor `phone` IS in the department)
    passes instead of `phone` — and this fails on ["case"] != ["phone"]. Verified live: this
    exact inversion currently passes the whole suite untouched."""
    got = _with_tree(_dept("phones-wearables"))
    assert [s.slug for s in got["shelves"]] == ["phone"]


# A separate small tree, because `phones-wearables`'s only maximal shelf (`phone`) has NO
# ancestors — asserting on `zip(s.ancestors, s.ancestor_labels)` there would pass vacuously
# on an empty zip, which is exactly the "lied by passing on an empty result" failure mode
# this task calls out. `gizmo` carries a real ancestor outside its own department, with a
# label that differs from its slug, so the comparison has something to compare.
_ANCESTOR_TREE = [
    {**_n("electronics-global", "Electronics Global", clusters=0),
     "n_clusters_subtree": 0, "spine_slug": None, "spine_department": None,
     "spine_department_label": None, "spine_level": None, "spine_disposition": "facet"},
    _s("gizmo", "Gizmos", "gadgets", "Gadgets", 0, 50,
       parent="electronics-global", ancestors=("electronics-global",)),
]


def test_the_shelves_carry_REAL_ancestor_labels():
    """⛔ Built through `_browse_node_views`, never `_browse_node_view` — the collective
    builder resolves the label map, and a route that supplies its own is how /by-node and
    /by-department shipped raw shop slugs in a shopper's breadcrumb.

    RED: replacing `_browse_node_view`'s `ancestor_labels=[labels.get(a) or a for a in ...]`
    with `ancestor_labels=node.get("ancestors") or []` (echoing slugs back as labels) makes
    every pair equal and this fails."""
    got = _with_tree(_dept("gadgets"), tree=_ANCESTOR_TREE)
    assert got["shelves"], "no shelves at all — the assertion below would be vacuous"
    assert any(s.ancestors for s in got["shelves"]), \
        "no ancestors to compare — the zip below would be vacuous"
    assert all(a != l for s in got["shelves"]
               for a, l in zip(s.ancestors, s.ancestor_labels))


def test_an_unknown_department_is_a_404_not_an_empty_list():
    """⛔ An empty list says "this department has nothing"; a 404 says "there is no such
    department".

    RED: changing the route's `raise HTTPException(status_code=404, ...)` to
    `status_code=200` (or dropping the raise and returning an empty page) makes this fail."""
    with pytest.raises(HTTPException) as exc:
        _with_tree(_dept("no-such-department"))
    assert exc.value.status_code == 404
    assert "department" in str(exc.value.detail).lower()


def test_a_NODE_SLUG_on_the_department_route_is_a_404():
    """⛔⛔ A FOURTH SLUG SPACE. `phone` names a browse_nodes shelf, not a spine department;
    resolving it here would render a plausible wrong page instead of erroring.

    RED: same guard as the test above — `phone` is not a key of `_spine_departments()`'s
    grouped dict (which is keyed by department id, e.g. `phones-wearables`), so removing or
    weakening the 404 guard makes this fail exactly as it does there."""
    with pytest.raises(HTTPException) as exc:
        _with_tree(_dept("phone"))
    assert exc.value.status_code == 404

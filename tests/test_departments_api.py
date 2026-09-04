"""The department endpoints — `/clusters/departments` and `/clusters/by-department/{id}`.

⛔⛔ WHY THESE ROUTES EXIST. `/browse-tree` and `/by-node` are faithful to a tree with 529
browsable roots built from 46 shops' own breadcrumbs, and faithful is not navigable: 75% of
those roots are one shop's private vocabulary and `Laptops` resolves in three places. The spine
is 21 ruled departments over that tree.

⭐ THE ASSERTION THAT MATTERS MOST IS `test_the_menu_and_the_page_AGREE`. A department's tile
prints `n_clusters` and the page it links to prints `total`; if those are computed two ways they
drift, and the storefront has already paid for that once — `food-cupboard` advertised 2,010 and
delivered 6,220. Here both come from the same sum, and this pins that they keep doing so.

⚠️ NO `pytest.mark.asyncio` — this repo has no pytest-asyncio, so such a mark runs the coroutine
as a no-op and the test passes without executing. Async paths are driven with `asyncio.run`
against stubbed collections, exactly as `test_browse_tree_nav.py` and `test_clusters_by_node.py`
do. `tests/test_department_spine.py` covers the live tree.
"""
import asyncio
from pathlib import Path

import pytest
from fastapi import HTTPException

from app.api import departments as spine_mod
from app.api.departments import Department
from app.api.routes import clusters as route_mod
from app.api.schemas.clusters import DepartmentClustersResponse, DepartmentsResponse, DepartmentView

from tests.test_browse_tree_nav import _Nodes, _n

SOURCE = Path(route_mod.__file__).read_text()


#   computers (0 own, 40 subtree)
#     └── tablet (40 own/subtree)          <- adopted by BOTH, the ruled overlap in miniature
#   laptop  (100)      lap2 (30)           <- one department, two disjoint shelves
#   ghost                                   <- adopted but NOT in the tree: the silent-shrink case
TREE = [
    {**_n("computers", "Computers", clusters=0, stores=16), "n_clusters_subtree": 40},
    {**_n("tablet", "Tablets", parent="computers", clusters=40, stores=31),
     "ancestors": ["computers"], "n_clusters_subtree": 40},
    {**_n("laptop", "Laptops", clusters=100, stores=24), "n_clusters_subtree": 100},
    {**_n("lap2", "Laptops", clusters=30, stores=10), "n_clusters_subtree": 30},
]

SPINE = (
    Department(id="laptops", label="Laptops", adopts=("laptop", "lap2"), why="two shelves"),
    Department(id="tablets", label="Tablets", adopts=("tablet",), why="inside computers"),
    Department(id="computers", label="Computers", adopts=("computers",), why="contains tablets"),
    Department(id="ghosts", label="Ghosts", adopts=("ghost", "laptop-gone"), why="reaped"),
)


class _TreeNodes(_Nodes):
    """`_Nodes` with Mongo's ARRAY-CONTAINMENT semantics for `ancestors`.

    ⛔ The shared stub compares `d["ancestors"] != "computers"` — a list against a string — so
    every descendant lookup returns empty and a department page silently loses its subtrees.
    Mongo matches `{"ancestors": "x"}` when the ARRAY CONTAINS `x`, and the whole point of
    adoption is the closure, so a stub that cannot express it tests the wrong thing.
    """

    def find(self, q, *a, **k):
        anc = q.get("ancestors")
        if isinstance(anc, str):
            rows = [d for d in self.docs if anc in (d.get("ancestors") or [])]

            class _Cur:
                def __aiter__(self):
                    async def gen():
                        for r in rows:
                            yield r
                    return gen()
            return _Cur()
        return super().find(q, *a, **k)


class _Placements:
    """`browse_placements` — one doc per cluster, keyed by the node it sits on."""

    def __init__(self, by_node):
        self.by_node = by_node

    def find(self, q, *a, **k):
        wanted = set(q.get("node_slug", {}).get("$in", []))
        rows = [{"_id": cid} for slug in wanted for cid in self.by_node.get(slug, [])]

        class _Cur:
            def __aiter__(self):
                async def gen():
                    for r in rows:
                        yield r
                return gen()
        return _Cur()


class _Clusters:
    def __init__(self, ids):
        self.ids = ids

    async def count_documents(self, q):
        return len(self._match(q))

    def _match(self, q):
        keep = set(q.get("_id", {}).get("$in", []))
        rows = [i for i in self.ids if i in keep]
        return rows

    def find(self, q, *a, **k):
        rows = self._match(q)

        class _Cur:
            def sort(self, *a, **k): return self
            def skip(self, n): self.rows = rows[n:]; return self
            async def to_list(self, length=None): return [
                # ⛔ `_cluster_view` reads `cluster_id`, NOT `_id`.
                {"_id": i, "cluster_id": i, "n_listings": 1}
                for i in getattr(self, "rows", rows)[:length]]
        return _Cur()


PLACED = {"laptop": [f"L{i}" for i in range(100)],
          "lap2": [f"P{i}" for i in range(30)],
          "tablet": [f"T{i}" for i in range(40)]}
ALL_IDS = [c for v in PLACED.values() for c in v]


def _with_spine(coro, tree=TREE, spine=SPINE):
    saved = (route_mod.BROWSE_NODES, route_mod.BROWSE_PLACEMENTS, route_mod.CLUSTERS,
             route_mod.DEPARTMENTS, route_mod.BY_ID, spine_mod.ADOPTED_SLUGS,
             route_mod.ADOPTED_SLUGS)
    route_mod.BROWSE_NODES = _TreeNodes(tree)
    route_mod.BROWSE_PLACEMENTS = _Placements(PLACED)
    route_mod.CLUSTERS = _Clusters(ALL_IDS)
    route_mod.DEPARTMENTS = spine
    route_mod.BY_ID = {d.id: d for d in spine}
    route_mod.ADOPTED_SLUGS = tuple(dict.fromkeys(s for d in spine for s in d.adopts))
    route_mod.reset_spine_cache()
    try:
        return asyncio.run(coro())
    finally:
        (route_mod.BROWSE_NODES, route_mod.BROWSE_PLACEMENTS, route_mod.CLUSTERS,
         route_mod.DEPARTMENTS, route_mod.BY_ID, spine_mod.ADOPTED_SLUGS,
         route_mod.ADOPTED_SLUGS) = saved
        route_mod.reset_spine_cache()


def _dept(i, **kw):
    kw.setdefault("multi_store_only", False)
    kw.setdefault("limit", 20)
    kw.setdefault("offset", 0)
    return lambda: route_mod.clusters_by_department(i, **kw)


# --------------------------------------------------------------------------- routing

def test_both_routes_are_declared_BEFORE_the_catch_all():
    """⛔⛔ `/{cluster_id:path}` swallows anything declared after it, and the 404 then reads like
    a missing cluster rather than a routing mistake. A decorated function object carries no
    ordering information, so this must read the SOURCE TEXT."""
    catch_all = SOURCE.find('"/{cluster_id:path}"')
    assert catch_all != -1, "the catch-all moved; re-check this guard"
    for route in ('"/departments"', '"/by-department/{department_id}"'):
        at = SOURCE.find(route)
        assert at != -1, f"{route} is not declared at all"
        assert at < catch_all, f"⛔ {route} is declared AFTER the catch-all and is unreachable"


# --------------------------------------------------------------------------- the contract

def test_the_response_models_publish_what_a_renderer_NEEDS():
    """⛔ A `response_model` FILTERS: a field the model omits vanishes with no error anywhere."""
    for name in ("id", "label", "adopts", "n_clusters", "n_stores",
                 "unresolved", "overlaps", "notes"):
        assert name in DepartmentView.model_fields, f"{name} missing from DepartmentView"
    assert "n_clusters_total" in DepartmentsResponse.model_fields
    for name in ("department", "shelves", "count", "total", "results"):
        assert name in DepartmentClustersResponse.model_fields


def test_by_department_offers_NO_include_descendants_switch():
    """⭐ Adoption IS the closure. Offering the switch would imply a department without its
    subtrees is one page's choice rather than a different ruling."""
    sig = SOURCE[SOURCE.find("async def clusters_by_department"):]
    sig = sig[:sig.find(")")]
    assert "include_descendants" not in sig


# --------------------------------------------------------------------------- totals

def test_a_department_total_SUMS_its_adopted_shelves():
    got = _with_spine(route_mod.departments)
    laptops = next(d for d in got.results if d.id == "laptops")
    assert laptops.n_clusters == 130, "100 + 30, two disjoint shelves"


def test_the_spine_total_counts_a_NESTED_shelf_ONCE():
    """⛔⛔ THE ARITHMETIC THE ENDPOINT TURNS ON. `tablet` sits inside `computers` and both are
    adopted, so the rows sum to 210 while only 170 distinct clusters exist. The union is the sum
    over shelves with no adopted ancestor — two subtrees of a tree nest or are disjoint."""
    got = _with_spine(route_mod.departments)
    assert sum(d.n_clusters for d in got.results) == 210, "rows double-count `tablet`"
    assert got.n_clusters_total == 170, "100 + 30 + 40; `tablet` counted once, not twice"


def test_n_stores_is_the_WIDEST_adopted_shelf():
    """⚠️ A lower bound, and documented as one — `browse_nodes` publishes a span per node, not
    the store list, so a true union is not derivable without walking every cluster."""
    got = _with_spine(route_mod.departments)
    assert next(d for d in got.results if d.id == "laptops").n_stores == 24


# --------------------------------------------------------------------------- the guards

def test_an_unresolvable_adopted_slug_is_REPORTED_not_fatal():
    """⛔⛔ A published slug is a MERGE SURVIVOR — `phone-11b5d5` was a live 495-cluster shelf
    and is reaped. If a department's shelf vanishes the department shrinks in silence, so the
    endpoint names it. ⭐ It REPORTS rather than 500s: a storefront that will not render is
    worse than one department short a shelf. `test_department_spine.py` is where it fails."""
    got = _with_spine(route_mod.departments)
    ghosts = next(d for d in got.results if d.id == "ghosts")
    assert ghosts.unresolved == ["ghost", "laptop-gone"]
    assert ghosts.n_clusters == 0


def test_the_RULED_overlap_is_reported_both_ways():
    """⭐ `tablet` is a descendant of `computers`, so the two departments share clusters. Ruled
    and deliberate — reported so it stays visible rather than becoming folklore."""
    got = _with_spine(route_mod.departments)
    by_id = {d.id: d for d in got.results}
    assert by_id["tablets"].overlaps == ["computers"]
    assert by_id["computers"].overlaps == ["tablets"]
    assert by_id["laptops"].overlaps == [], "disjoint shelves do not overlap anything"


def test_departments_are_served_in_RULED_order_not_by_stock():
    """⭐ The order is part of the ruling: domain, not inventory. Sorting by stock would put
    `computers` first here and `Kitchen` above `Bakery` live."""
    got = _with_spine(route_mod.departments)
    assert [d.id for d in got.results] == ["laptops", "tablets", "computers", "ghosts"]


# --------------------------------------------------------------------------- the page

def test_an_unknown_department_is_a_404_not_an_empty_list():
    """⛔ An empty list says "this department has nothing"; a 404 says "there is no such
    department". Matches `/by-node` and `/browse-tree`."""
    with pytest.raises(HTTPException) as exc:
        _with_spine(_dept("no-such-department"))
    assert exc.value.status_code == 404


def test_the_menu_and_the_page_AGREE():
    """⛔⛔ THE DEFECT THIS WHOLE SHAPE EXISTS TO PREVENT. `Laptops` adopts three shelves
    totalling 1,530 live, while `/shelf/laptop` alone renders 655 — a tile that links to a page
    contradicting it. Both numbers come from the same sum, and this pins that."""
    menu = _with_spine(route_mod.departments)
    page = _with_spine(_dept("laptops", limit=1))
    assert page["total"] == next(d.n_clusters for d in menu.results if d.id == "laptops") == 130


def test_the_page_returns_the_adopted_SHELVES_ordered_by_stock():
    """⭐ So a department page renders its subcategory grid with no request per shelf."""
    page = _with_spine(_dept("laptops"))
    assert [s.slug for s in page["shelves"]] == ["laptop", "lap2"], "100 before 30"


def test_a_department_page_spans_EVERY_adopted_shelf():
    """⚠️ `limit` caps at 100, so the PAGE cannot show all 130 — which is exactly why `total`
    is published beside `count`. A capped page must never be silent truncation."""
    page = _with_spine(_dept("laptops", limit=100))
    assert page["total"] == 130, "the department spans both shelves"
    assert page["count"] == 100, "one page is capped; `total` is how the caller knows"
    rest = _with_spine(_dept("laptops", limit=100, offset=100))
    seen = {c["cluster_id"][0] for c in page["results"] + rest["results"]}
    assert seen == {"L", "P"}, "rows come from BOTH adopted shelves, not just the first"


def test_a_department_page_includes_the_DESCENDANTS_of_an_adopted_shelf():
    """⭐ Adoption takes the subtree: `computers` holds nothing of its own and must still serve
    `tablet`'s 40. This is why a coarse department is never an empty page."""
    page = _with_spine(_dept("computers", limit=100))
    assert page["total"] == 40 and len(page["results"]) == 40


def test_pagination_APPENDS_without_repeating():
    a = _with_spine(_dept("laptops", limit=5, offset=0))
    b = _with_spine(_dept("laptops", limit=5, offset=5))
    assert not ({c["cluster_id"] for c in a["results"]} & {c["cluster_id"] for c in b["results"]})
    assert a["total"] == b["total"] == 130, "`total` is the whole department, not the page"

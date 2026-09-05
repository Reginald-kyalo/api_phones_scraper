"""The ruled department spine, and the invariants that make its arithmetic safe.

⛔⛔ WHY THIS EXISTS. `app/api/departments.py` is a HUMAN RULING (worksheet §8, 2026-08-21)
keyed on PUBLISHED SLUGS, and the engine's own reply doc records what that costs:

    a published slug is a MERGE SURVIVOR, not a stable address for the thing it names

`phone-11b5d5` was a live 495-cluster shelf on 2026-08-20 and is reaped today. If a slug a
department adopts disappears the same way, the department silently shrinks and nothing anywhere
raises. The engine's override channel answers this with a hard fail at build time; the API's
equivalent is this file — `test_every_adopted_slug_RESOLVES` is the guard, and the endpoint's
`unresolved` field is the runtime report.

⭐ THE DISJOINTNESS TEST IS LOAD-BEARING, NOT HYGIENE. A department's total is a plain SUM of
`n_clusters_subtree` over the shelves it adopts. That is exact only because those shelves are
mutually disjoint. Adopt a parent and its child together and every count the storefront prints
for that department is inflated, with no error anywhere.

⚠️ THE LIVE-TREE TESTS SKIP WITHOUT MONGO. They are the valuable ones and they cannot be
stubbed — the whole point is agreement with a tree this repo does not own. A green run that
skipped them has verified the config's shape and nothing about its truth.
"""
import re

import pytest

from app.api.departments import ADOPTED_SLUGS, BY_ID, DEPARTMENTS


def _tree():
    """The live `browse_nodes`, or a skip. Read once per test; the collection is small."""
    try:
        from pymongo import MongoClient

        from app.config import settings
        uri = getattr(settings, "MONGO_URI", None) or "mongodb://localhost:27017"
        db = MongoClient(uri, serverSelectionTimeoutMS=1500)["taxonomy_db"]
        db.command("ping")
    except Exception as exc:                                    # pragma: no cover - env dependent
        pytest.skip(f"live browse_nodes unavailable: {exc}")
    return db


def _adopted_docs(db):
    return {d["_id"]: d for d in db.browse_nodes.find({"_id": {"$in": list(ADOPTED_SLUGS)}})}


# --------------------------------------------------------------------------- shape (no DB)

def test_the_spine_is_the_TWENTY_ONE_that_were_ruled():
    """⭐ This pins a RULING, not a measurement.

    ⚠️ This doc set's standing rule is that a prose count goes stale the moment it is written —
    `browse_nodes` has been 4,357 / 4,185 / 4,137 inside one week. That rule is about MEASURED
    figures. 21 is a decision a person made, so a diff here should be a deliberate re-ruling and
    is worth failing over. ⛔ It is NOT 15: the tight >=10-store cut nests to 15 but contains no
    grocery department at all, and the ruled grocery split adds four where a benchmark saw none.
    """
    assert len(DEPARTMENTS) == 21


def test_ids_are_unique_and_URL_SAFE():
    """An id is a path segment (`/department/{id}`) and must survive one unencoded."""
    ids = [d.id for d in DEPARTMENTS]
    assert len(ids) == len(set(ids)), "duplicate department id"
    for i in ids:
        assert re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", i), f"{i!r} is not a clean path segment"


def test_no_shelf_is_adopted_by_TWO_departments():
    """⛔ Two departments claiming one shelf is a curation conflict, not an overlap.

    ⚠️ Distinct from the RULED overlap: `tablet` sits inside `computer`'s subtree, so Tablets
    and Computers share clusters. That is a tree fact and is reported. This asserts the weaker,
    absolute thing — no slug appears in two `adopts` lists, which would be a mistake.
    """
    seen: dict[str, str] = {}
    for d in DEPARTMENTS:
        for s in d.adopts:
            assert s not in seen, f"{s!r} adopted by both {seen[s]!r} and {d.id!r}"
            seen[s] = d.id


def test_every_department_adopts_something_and_records_WHY():
    """⭐ A ruling with no reason cannot be re-ruled by the next person to read it."""
    for d in DEPARTMENTS:
        assert d.adopts, f"{d.id} adopts nothing and would render an empty page"
        assert d.why.strip(), f"{d.id} carries no rationale"
        assert d.ruled_on and d.ruled_by, f"{d.id} carries no provenance"


def test_the_two_KNOWINGLY_adopted_defects_stay_named():
    """⛔ Named, never patched in the client — that is the ruling.

    `Chocolates` is a child of `Beverages`, so Drinks contains chocolate (93 clusters); and
    `ultra-book` is a pinned slug labelled *Exercise Books*. Both are cheaper than the stranding
    a re-parent causes. If a note is dropped the defect becomes folklore.
    """
    assert any("hocolate" in n for n in BY_ID["drinks"].notes)
    assert any("ultra-book" in n for n in BY_ID["stationery"].notes)
    assert "ultra-book" in BY_ID["stationery"].adopts


# --------------------------------------------------------------------------- the live tree

def test_every_adopted_slug_RESOLVES():
    """⛔⛔ THE GUARD. A published slug is a merge survivor — `phone-11b5d5` was a live
    495-cluster shelf and is reaped. An unresolvable slug means a human ruling is being skipped
    in silence and a department is quietly smaller than it was ruled to be."""
    docs = _adopted_docs(_tree())
    missing = [s for s in ADOPTED_SLUGS if s not in docs]
    assert not missing, (
        f"⛔ {len(missing)} adopted slug(s) no longer resolve in browse_nodes: {missing}. "
        "Re-rule them against `department_candidates()`; do NOT silently drop them.")


def test_adopted_shelves_are_DISJOINT_within_a_department():
    """⛔⛔ THIS IS WHAT MAKES THE SUM A UNION.

    A department's total sums `n_clusters_subtree` over its adopted shelves. Adopt a shelf and
    an ancestor of it and that sum double-counts everything between them — inflating the number
    the menu prints and the number the page prints, identically, so they would still AGREE while
    both being wrong.
    """
    docs = _adopted_docs(_tree())
    for d in DEPARTMENTS:
        adopted = set(d.adopts)
        for s in d.adopts:
            inside = set(docs.get(s, {}).get("ancestors") or []) & adopted
            assert not inside, (
                f"⛔ {d.id}: {s!r} sits inside {sorted(inside)}, which {d.id!r} also adopts — "
                f"its total would double-count {s!r}'s whole subtree")


def test_no_department_is_EMPTY_on_the_live_tree():
    docs = _adopted_docs(_tree())
    for d in DEPARTMENTS:
        total = sum((docs[s].get("n_clusters_subtree") or 0) for s in d.adopts if s in docs)
        assert total > 0, f"{d.id} adopts only empty shelves and would render a dead department"


def test_the_spine_total_is_the_SUM_OF_MAXIMAL_shelves_and_that_equals_the_real_union():
    """⭐⭐ Proves the shortcut the `/departments` endpoint relies on.

    Two subtrees of a tree either NEST or are DISJOINT, so the union over every adopted shelf is
    the sum over those with no adopted ancestor. Measured 2026-08-21: the 21 rows sum to 46,914,
    dropping the two nested shelves (`tablet` 720, `phone-1a5a7a` 67) gives 46,127 — exactly the
    distinct count from `browse_placements`. Without this, `n_clusters_total` would need a
    placement scan on every cold request.

    ⚠️ Asserts the IDENTITY, never the figures: the tree is republished by another repo, and a
    test that pinned 46,127 would fail on somebody else's correct work.
    """
    db = _tree()
    docs = _adopted_docs(db)
    adopted = set(docs)
    maximal = [d for d in docs.values() if not (set(d.get("ancestors") or []) & adopted)]
    shortcut = sum(d.get("n_clusters_subtree") or 0 for d in maximal)

    slugs = set(docs)
    for root in docs:
        slugs.update(d["_id"] for d in db.browse_nodes.find({"ancestors": root}, {"_id": 1}))
    real = len({p["_id"] for p in
                db.browse_placements.find({"node_slug": {"$in": list(slugs)}}, {"_id": 1})})

    assert shortcut == real, (
        f"the maximal-shelf shortcut gives {shortcut} and the real union is {real} — "
        "`n_clusters_total` is no longer exact and must go back to a placement scan")


def test_a_department_total_equals_the_union_of_its_OWN_placements():
    """⭐ The same identity per department — this is the number a tile prints."""
    db = _tree()
    docs = _adopted_docs(db)
    for d in DEPARTMENTS:
        live = [s for s in d.adopts if s in docs]
        summed = sum(docs[s].get("n_clusters_subtree") or 0 for s in live)
        slugs = set(live)
        for root in live:
            slugs.update(x["_id"] for x in db.browse_nodes.find({"ancestors": root}, {"_id": 1}))
        real = len({p["_id"] for p in
                    db.browse_placements.find({"node_slug": {"$in": list(slugs)}}, {"_id": 1})})
        assert summed == real, f"{d.id}: sum {summed} != union {real}"


def test_the_ID_SLUG_COLLISIONS_are_the_known_six():
    """⚠️ `/department/bakery` and `/shelf/bakery` are DIFFERENT PAGES sharing a name.

    ⭐ `pantry` is the sharp one: the NODE `pantry` (889) is adopted by nothing, while the ruled
    Pantry department is `snack` + `breakfast-cereal` (485). The shelf is BIGGER than the
    department that shares its name and neither is wrong.

    This pins the set so a seventh collision is a deliberate choice. ⛔ It is not a failure
    condition — the route prefix is a real namespace — but it is the kind of fact that becomes
    folklore the moment nothing records it.
    """
    db = _tree()
    ids = {d.id for d in DEPARTMENTS}
    collide = {d["_id"] for d in db.browse_nodes.find({"_id": {"$in": list(ids)}}, {"_id": 1})}
    assert collide == {"audio", "bakery", "cleaning", "fresh", "hardware", "pantry"}, (
        f"the department-id/node-slug collision set moved to {sorted(collide)} — confirm the new "
        "one is intended and update this test")


# --------------------------------------------------------------- the PARENT grouping

#: The group vocabulary. ⛔ CLOSED ON PURPOSE — a typo'd parent would silently create a
#: one-member tile that looks deliberate, which is exactly the class of defect a flat list
#: does not have. Widen this only alongside a ruling that says why.
PARENTS = {"Phones & Wearables", "Computing", "Sound & Vision", "Groceries & Essentials"}


def test_every_department_declares_a_PARENT_or_stands_alone():
    """⛔ `parent` is None or a member of the closed vocabulary — never a free string."""
    for d in DEPARTMENTS:
        assert d.parent is None or d.parent in PARENTS, (
            f"{d.id}: parent {d.parent!r} is not in the ruled vocabulary")


def test_the_GROUPS_are_exactly_the_ones_the_DESIGNED_SPINE_rules():
    """⛔⛔ THE GROUPING IS NOT MINE TO INVENT. Every multi-member group here exists because
    `browse_nodes.spine_department` puts those departments' shelves under one designed
    department — measured 2026-09-05. Grouping `Home appliances` + `Kitchen` + `Lighting`
    under a "Home & Living" tile would read plausibly and be a NEW ruling wearing the
    clothes of a measured one: the designed spine files those three in three different
    departments (`home-appliances`, `kitchen-dining-cookware`, `home-furniture-decor`).

    ⚠️ Two members are backed by the RETIRED spine rather than the designed one, and that is
    recorded rather than hidden: `wearables` reaches no designed department at all (its only
    shelf `smart-watch` has disposition `split`), and `tablets` is a genuine disagreement —
    the retired spine and `browse_nodes` both file it under computing, the designed spine
    under phones. Ruled toward the designed spine; a one-line change reverses it.
    """
    groups: dict[str, set[str]] = {}
    for d in DEPARTMENTS:
        if d.parent:
            groups.setdefault(d.parent, set()).add(d.id)

    assert groups == {
        "Phones & Wearables": {"smartphones", "tablets", "phone-accessories", "wearables"},
        "Computing": {"laptops", "computers"},
        "Sound & Vision": {"audio", "televisions"},
        "Groceries & Essentials": {"drinks", "fresh", "bakery", "pantry", "cleaning"},
    }


def test_no_group_has_exactly_ONE_member():
    """⛔ A group of one is a popover hiding a single destination — worse than no grouping.
    The renderer collapses such a group to a plain link, so a one-member group here means
    the vocabulary and the renderer disagree about what a tile is."""
    counts: dict[str, int] = {}
    for d in DEPARTMENTS:
        if d.parent:
            counts[d.parent] = counts.get(d.parent, 0) + 1
    singles = [p for p, n in counts.items() if n == 1]
    assert singles == [], f"one-member groups: {singles}"


def test_the_grouping_LOSES_NO_DEPARTMENT():
    """⛔ 21 tiles become 12; all 21 destinations must still be reachable. A department that
    is neither grouped nor standalone would vanish from the strip with nothing raised."""
    reachable = {d.id for d in DEPARTMENTS if d.parent} | {d.id for d in DEPARTMENTS if not d.parent}
    assert reachable == {d.id for d in DEPARTMENTS}
    assert len({d.parent for d in DEPARTMENTS if d.parent}) + \
           len([d for d in DEPARTMENTS if not d.parent]) == 12, "expected 4 groups + 8 singles"

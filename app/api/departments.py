"""The DEPARTMENT SPINE — 21 curated departments over `taxonomy_db.browse_nodes`.

⭐ WHAT THIS IS. A presentation mapping, ruled by a person on 2026-08-21 and recorded in
`phones_scraper/implementation_plans/department_spine_worksheet_2026-08-21.md` §8. It exists
because the canonical tree has **529 browsable roots** built from 46 Kenyan shops' own
breadcrumbs, and a shopper needs ~20 departments, not a directory. 75% of those roots are one
shop's private vocabulary; `Laptops` resolves in three places.

⛔⛔ ADOPTION, NOT RE-PARENTING — AND THE DIFFERENCE IS MEASURED, NOT STYLISTIC. A department
*adopts* a node **where it already sits** and takes its whole subtree. It never asks the engine
to move anything, because moving a node **strands every cluster that only reached it by
refinement**: promoting `smart-watch` to a root was simulated and cost the shelf 72 of its 717
clusters, and dropped it from the #2 child of the #1 department to root rank #23 of 530 — *less*
visible than before. Adoption costs nothing and loses nothing. (Reply doc §5.)

⛔ THIS IS A PRESENTATION LAYER AND IT OWNS NOTHING UPSTREAM. `browse_nodes.label` is the
engine's join key and its duplicate-fold reasons about it, so a department renames freely here
and **nothing is written back**. `Kitchen & Dining` presents as *Kitchen*, `OFFICE STATIONERY` as
*Stationery*, `Smart watches` as *Wearables*. The engine is asked for nothing by this file.

⛔ AND IT DOES NOT REPLACE THE TREE. Measured 2026-08-21: the spine reaches **46,127 of 102,038**
placed clusters (45.2%). The other **55,911** are not lost — they are reachable at `/shelf`,
which keeps the full 529-root directory — but they are deliberately not offered as departments.
The largest single residue is `phone-tablet`'s own **19,286** clusters, sitting undifferentiated
on a coarse root; that is the known upstream shallow-breadcrumb defect, not something curation
can fix. ⇒ **Every navigation surface that renders departments MUST also offer "All categories"
→ `/shelf`,** or half the catalogue stops being reachable by browsing.

⚠️ TWO INHERITED DEFECTS ARE ADOPTED DELIBERATELY. Naming them is the ruling; patching them in
the client is not:
  - `Chocolates` (93 clusters) is a child of `Beverages`, so **Drinks contains chocolate**. That
    is the price of adopting instead of re-parenting, and it is cheaper than the stranding a
    re-parent causes.
  - `ultra-book` is a PINNED slug whose label moved to a different concept — it serves
    *Exercise Books* (85 clusters, 5 stores). **Stationery is the right department; the slug is
    wrong and pinned.** Unpinning is an open engine ruling with its own URL-churn cost.

⚠️ A DEPARTMENT `id` MAY COLLIDE WITH A NODE SLUG, AND THE TWO ARE DIFFERENT PAGES. Measured
2026-08-21, **six** ids also name a node — `audio`, `bakery`, `cleaning`, `fresh`, `hardware`,
`pantry`. The route prefix is the namespace, and the pages genuinely differ:

    /department/bakery   bakery + cake             425      /shelf/bakery    343
    /department/pantry   snack + breakfast-cereal  485      /shelf/pantry    889   <- larger!
    /department/audio    audio-music-equipment…  18,359     /shelf/audio   6,275

⭐ `pantry` is the one to know: the NODE `pantry` (889) is not adopted by anything — the ruled
Pantry department is `snack` + `breakfast-cereal`. So the shelf is bigger than the department
that shares its name, and neither is wrong. `tests/test_department_spine.py` pins the collision
set so a seventh is a deliberate choice rather than a discovery.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Department:
    """One ruled department. `adopts` are `browse_nodes` slugs, each taken with its subtree.

    ⛔ `adopts` MUST BE MUTUALLY DISJOINT WITHIN A DEPARTMENT — no adopted slug may be an
    ancestor of another. That is what lets the total be a plain SUM of the engine's published
    `n_clusters_subtree` instead of a placement scan, and `tests/test_department_spine.py`
    asserts it against the live tree. Adopt a parent and its child together and the department
    would double-count silently.
    """

    id: str
    label: str
    adopts: tuple[str, ...]
    why: str
    #: ⭐ The tile this department sits under in a navigation strip, or None to stand alone.
    #: ⛔⛔ PRESENTATION ONLY — it groups TILES, it does not nest departments. `/department/:id`
    #: is untouched, every id keeps its own page, and deleting this field returns the flat 21.
    #: ⛔ THE GROUPS ARE NOT INVENTED HERE. Each multi-member group is one the DESIGNED spine
    #: already rules, measured 2026-09-05 via `browse_nodes.spine_department`. Grouping
    #: `Home appliances` + `Kitchen` + `Lighting` under a "Home & Living" tile would read just
    #: as plausibly and would be a NEW ruling dressed as a measured one — the designed spine
    #: files those three separately, so they stand alone. `tests/test_department_spine.py`
    #: pins the exact group membership against that measurement.
    parent: str | None = None
    ruled_on: str = "2026-08-21"
    ruled_by: str = "user"
    notes: tuple[str, ...] = field(default_factory=tuple)


# ⭐ ORDER IS EDITORIAL AND IT IS THE PUBLISHED ORDER. Phones → computing → media → accessories
# → personal care → grocery → home. It is NOT a stock ranking: `Kitchen` (1,857) sits below
# `Bakery` (425) because a shopper reads a storefront by domain, not by inventory.
#
# ⭐⭐ AND WITH 21 ROWS THERE IS NO TOP-N CUT LEFT TO GET WRONG. The panel used to take the top
# 12 of 529 roots, and ordering them on own stock instead of subtree stock swapped SIX of the
# twelve — cutting `Electronics & Computers` (20,772) for `Battery Chargers` (553, one shop).
# A surface renders all 21 of these, so that entire class of defect is gone rather than fixed.
DEPARTMENTS: tuple[Department, ...] = (
    Department(
        id="smartphones", label="Smartphones", parent="Phones & Wearables",
        adopts=("smartphone", "phone-1a5a7a"),
        why="30 stores, the best-attested shelf in the corpus. `phone` folded into `smartphone` "
            "by the engine's R1 (published 2026-08-21).",
        notes=("`phone-1a5a7a` (67 clusters, 9 stores) resolves under Tablets after the engine's "
               "R2 — coherent inside its parent, wrong at the top, so it is adopted here too. "
               "That is a deliberate 67-cluster overlap with Tablets and Computers.",),
    ),
    Department(
        id="tablets", label="Tablets", parent="Phones & Wearables",
        adopts=("tablet",),
        why="31 stores — the WIDEST store span in the whole corpus. Sits at depth 2 under "
            "`computer`, which is why the roots-only list could never see it.",
        notes=("Wholly contained in Computers (`tablet` is a descendant of `computer`). Ruled: "
               "both stand. 720 clusters reachable two ways.",),
    ),
    Department(
        id="laptops", label="Laptops", parent="Computing",
        adopts=("laptop", "laptop-2eb1af", "laptop-06ffb7"),
        why="The cross-parent duplicate the audit named: `Laptops` resolves in three places "
            "(655 / 590 / 285). Adoption unifies them without a merge the engine refuted.",
        notes=("`macbook` (11 stores, 149 clusters) rides along inside `laptop-06ffb7`. Its "
               "shelf survived the 2026-08-19 root-facet demotion because the defect was "
               "POSITION, not label.",),
    ),
    Department(
        id="computers", label="Computers", parent="Computing",
        adopts=("computer", "desktop", "computer-accessory", "networking", "printer-scanner"),
        why="The tight ≥10-store cut split one computing shelf four ways. Folded here, with "
            "`keyboard` and `printer` riding along inside their parents.",
        notes=("Contains all of Tablets (720). Ruled: both stand.",),
    ),
    Department(
        id="audio", label="Audio", parent="Sound & Vision",
        adopts=("audio-music-equipment", "speaker", "earphone-headphone-6836d5"),
        why="The department's real mass is `audio-music-equipment` — 11,646 clusters sitting "
            "DIRECTLY on a two-store node, the largest undifferentiated shelf after "
            "`phone-tablet`. Adopting `audio` (6,275) alone would strand all of it.",
        notes=("`audio` is the shelf a shopper wants and is the principal child; the department "
               "adopts its parent so nothing is stranded above it.",),
    ),
    Department(
        id="televisions", label="Televisions", parent="Sound & Vision",
        adopts=("television", "interactive-display"),
        why="`tv` (22 stores) sits under `television` (19) — an inversion already on the "
            "engine's human-ruling list. Adoption takes the child without needing the edge "
            "fixed first, which is most of why adoption is the cheaper instrument.",
    ),
    Department(
        id="cameras", label="Cameras",
        adopts=("camera",),
        why="19 stores. `camera-accessory-26aa1b` rides along inside it.",
    ),
    Department(
        id="phone-accessories", label="Phone accessories", parent="Phones & Wearables",
        adopts=("phone-accessory", "charger-7dd0d2"),
        why="11 stores, 3,707 clusters after the engine's R7 moved `phone-tablet-accesorry` "
            "here. `mobile-accessory` and `screen-protector` ride along inside.",
    ),
    Department(
        id="wearables", label="Wearables", parent="Phones & Wearables",
        adopts=("smart-watch",),
        why="10 stores. ⛔ Renamed, NOT promoted — promoting `smart-watch` to a root was "
            "measured to cost it 72 of 717 clusters and drop it to root rank #23.",
    ),
    Department(
        id="home-appliances", label="Home appliances",
        adopts=("home-appliance", "fridge"),
        why="24 stores, at depth 2 — another shelf the roots-only list structurally could not see.",
    ),
    Department(
        id="personal-care", label="Personal care",
        adopts=("personal-care-1b4b37", "health-wellness"),
        why="10 stores. `body-care`, `hair-care`, `oral-care` and `facial-tissue` ride along "
            "inside `personal-care-1b4b37`.",
    ),
    Department(
        id="drinks", label="Drinks", parent="Groceries & Essentials",
        adopts=("beverage", "soft-drink", "wine", "beer"),
        why="One of four grocery departments. ⛔ No external benchmark contributed — PriceRunner "
            "has no grocery department at all, and its keyword bucketing files every food shelf "
            "under `Home & Interior`.",
        notes=("Contains `Chocolates` (93 clusters), a child of `Beverages`. Named, not patched.",),
    ),
    Department(
        id="fresh", label="Fresh", parent="Groceries & Essentials",
        adopts=("frozen-food", "yoghurt", "cheese", "deli", "fruit", "exotic-fruit"),
        why="Groceries are the largest multi-store pool in the corpus and no single shelf "
            "dominates it, so one grocery name would bury it. Four departments, ruled by hand.",
        notes=("`fruit` and `exotic-fruit` are a cross-parent duplicate pair (109 / 113), "
               "already on the engine's `disjoint_label_groups` report.",),
    ),
    Department(
        id="bakery", label="Bakery", parent="Groceries & Essentials",
        adopts=("bakery", "cake"),
        why="One of four grocery departments.",
    ),
    Department(
        id="pantry", label="Pantry", parent="Groceries & Essentials",
        adopts=("snack", "breakfast-cereal"),
        why="One of four grocery departments.",
    ),
    Department(
        id="kitchen", label="Kitchen",
        adopts=("kitchen-dining",),
        why="Renamed from `Kitchen & Dining`: naming rule 2 forbids a conjunction as a "
            "department name, and the ruling authorises renaming at zero cost.",
    ),
    Department(
        id="cleaning", label="Cleaning", parent="Groceries & Essentials",
        adopts=("cleaning", "detergent"),
        why="`SOAPS & DETERGENTS` folded in under a plain noun.",
    ),
    Department(
        id="stationery", label="Stationery",
        adopts=("office-stationery", "ultra-book"),
        why="Renamed from `OFFICE STATIONERY` — 275 of 956 browsable labels SHOUT.",
        notes=("⛔ `ultra-book` is a PINNED slug labelled *Exercise Books*. The department is "
               "right; the slug names an ultrabook. Open engine ruling, with URL churn.",),
    ),
    Department(
        id="lighting", label="Lighting",
        adopts=("light",),
        why="Renamed from `Lightings`. 10 stores at root.",
    ),
    Department(
        id="pets", label="Pets",
        adopts=("pet",),
        why="5 stores, 459 clusters.",
    ),
    Department(
        id="hardware", label="Hardware",
        adopts=("hardware",),
        why="5 stores, 980 clusters.",
    ),
)

BY_ID: dict[str, Department] = {d.id: d for d in DEPARTMENTS}

#: Every slug any department adopts. One `$in` lookup covers the whole spine.
ADOPTED_SLUGS: tuple[str, ...] = tuple(dict.fromkeys(s for d in DEPARTMENTS for s in d.adopts))

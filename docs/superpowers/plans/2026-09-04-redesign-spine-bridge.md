# Redesign Spine Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the redesign spine's department mapping onto `browse_nodes`, and serve it on a parallel `/aisle/:id` route so a shopper reaches 79.9% of the catalogue by department instead of 46.0%.

**Architecture:** The redesign package emits one frozen artifact, `bridge.tsv`; the live publisher joins it on `browse_nodes.label` and stamps five `spine_*` fields; the API serves two endpoints reading only those stamped fields; the frontend gets a third link builder and a parallel route. No repo imports the other, and no request-time join exists.

**Tech Stack:** Python 3 / pytest (both repos), MongoDB (`taxonomy_db`), FastAPI + Pydantic (API), React + react-router + TypeScript (UI), Playwright via `scripts/verify_categories.py` (render gate).

**Spec:** `docs/superpowers/specs/2026-09-04-redesign-spine-bridge-design.md`

## Global Constraints

- **Two repos.** Engine tasks 1–2 are in `/home/reginaldkyalo/codes/phones_scraper` (branch `matching`). Tasks 3–6 are in `/home/reginaldkyalo/codes/api_phones_scraper` (branch `clusters-api`). **Commit in the repo the task names; never stage across repos.**
- **⛔ Confirm with the user before the first engine commit.** `phones_scraper` is a separate repository with its own workflow; this plan does not assume permission to push there.
- Engine tests: `cd phones_scraper && python3 -m pytest -q`. API tests: `cd api_phones_scraper && ./apienv/bin/python -m pytest -q` (297 passing at plan time).
- **⛔ No `pytest.mark.asyncio` in the API repo** — it has no `pytest-asyncio`, so the mark runs the coroutine as a no-op and the test passes without executing. Drive async paths with `asyncio.run` against stubbed collections.
- **⛔ Run every new assertion RED before making it pass.** `CATEGORY_TREE_API.md` §7: four gate assertions have lied by passing on an empty result.
- **⛔ A department's mass is `sum(n_clusters)`, never `sum(n_clusters_subtree)`** — spec §4.1. The subtree figure totals 167,610 against a 102,038 corpus.
- **⛔ Additive only.** Every existing field, route and consumer keeps its meaning. Do not modify `departments.py` or `/department/:id`.
- API start command is `./apienv/bin/python -m app.main` (routes are under `/api`), **not** `uvicorn app.main:app`. A server may already own port 10000 and serve stale code — check `ps -o lstart` on the listener before trusting live output.

---

## File Structure

**Engine — `phones_scraper`**

| File | Responsibility |
|---|---|
| `category_taxonomy/redesign/emit_bridge.py` | **Create.** Emits `bridge.tsv` from `_spine.json` + `label_disposition.tsv`. The package's only outward contract. |
| `category_taxonomy/redesign/bridge.tsv` | **Create (generated, checked in).** 4,066 rows, 6 columns. |
| `category_taxonomy/redesign/test_package.py` | **Modify.** Bridge reproducibility + shape invariants. |
| `category_taxonomy/publish_browse_tree.py` | **Modify.** `load_bridge()` + `stamp_spine()`; driver applies them. |
| `category_taxonomy/tests/test_publish_browse_tree.py` | **Modify.** `stamp_spine` unit tests. |

**API — `api_phones_scraper`**

| File | Responsibility |
|---|---|
| `app/api/schemas/clusters.py` | **Modify.** `SpineDepartmentView`, `SpineDepartmentsResponse`, `SpineDepartmentClustersResponse`. |
| `app/api/routes/clusters.py` | **Modify.** `_spine_departments()` loader + two routes. |
| `tests/test_spine_departments.py` | **Create.** Both endpoints, stubbed collections. |

**UI — `dealsonline_ui_ux`**

| File | Responsibility |
|---|---|
| `src/app/lib/api.ts` | **Modify.** `spineApi` + `SpineDepartmentView`. |
| `src/app/lib/categories.ts` | **Modify.** `aisleHref`. |
| `src/app/pages/AislePage.tsx` | **Create.** The parallel department page. |
| `src/app/routes.ts` | **Modify.** `/aisle/:id`. |
| `scripts/verify_categories.py` | **Modify.** Four-space slug guard + the `home-appliances` collision. |

---

## Task 1: The bridge artifact

**Repo:** `phones_scraper`

**Files:**
- Create: `category_taxonomy/redesign/emit_bridge.py`
- Create (generated): `category_taxonomy/redesign/bridge.tsv`
- Test: `category_taxonomy/redesign/test_package.py` (append)

**Interfaces:**
- Consumes: `_spine.json` (`nodes[].slug/name/level/department`), `label_disposition.tsv` (`raw_label`, `disposition`, `target`).
- Produces: `bridge.tsv` with header `raw_label, spine_slug, spine_department, spine_department_label, spine_level, spine_disposition`. Task 2 reads it.

- [ ] **Step 1: Write the failing tests**

Append to `category_taxonomy/redesign/test_package.py`:

```python
# ---------------------------------------------------------------- the bridge artifact

BRIDGE = HERE / "bridge.tsv"
BRIDGE_COLUMNS = ("raw_label", "spine_slug", "spine_department",
                  "spine_department_label", "spine_level", "spine_disposition")


def _bridge_rows():
    import csv
    with open(BRIDGE, newline="") as fh:
        return list(csv.DictReader(fh, delimiter="\t"))


def test_bridge_emit_is_byte_reproducible():
    """⛔ Same reason as the spine emit: a dirty diff on every regeneration means a real
    change cannot be seen. This file is the live pipeline's ONLY input from this package,
    so churn here is churn in the storefront's review."""
    import hashlib
    _run("emit_bridge.py")
    first = hashlib.sha256(BRIDGE.read_bytes()).hexdigest()
    _run("emit_bridge.py")
    assert hashlib.sha256(BRIDGE.read_bytes()).hexdigest() == first


def test_bridge_carries_exactly_the_agreed_columns():
    """⛔ THE COLUMN LIST IS THE CONTRACT. Widening it widens what the live pipeline knows
    about a package HANDOFF.md keeps deliberately separate."""
    assert tuple(_bridge_rows()[0].keys()) == BRIDGE_COLUMNS


def test_every_raw_label_appears_exactly_once():
    rows = _bridge_rows()
    labels = [r["raw_label"] for r in rows]
    assert len(labels) == len(set(labels)), "a duplicated label makes the join ambiguous"
    import csv
    with open(HERE / "label_disposition.tsv", newline="") as fh:
        src = {r["raw_label"] for r in csv.DictReader(fh, delimiter="\t")}
    assert set(labels) == src, "the bridge must cover every disposed label, and no others"


def test_spine_disposition_is_written_for_EVERY_row():
    """⛔⛔ THIS IS THE FIELD THAT PREVENTS A SILENT NULL. It distinguishes 'never mapped'
    from 'deliberately mapped to nothing' — a 17.5% split bucket from a bug."""
    blank = [r["raw_label"] for r in _bridge_rows() if not r["spine_disposition"]]
    assert blank == [], f"{len(blank)} rows carry no disposition, e.g. {blank[:3]}"


def test_spine_disposition_is_a_CLOSED_SET():
    """⛔ A disposition the consumer has never heard of is a silent behaviour change: the API
    groups on `spine_department` and a new bucket would simply vanish from the storefront with
    nothing raised. Widen this list deliberately, in a commit that says why."""
    # ⛔ EXACTLY the nine values measured in label_disposition.tsv 2026-09-04. An earlier
    # draft of this list carried seven more (`brand`, `model_code`, `organic`, …) read out of
    # the TARGET column by mistake — which would have let a genuinely new disposition named
    # `brand` pass a test whose whole purpose is to catch a new disposition.
    KNOWN = {"node", "split", "facet", "review", "quarantine", "reroute", "classifieds",
             "filter", "gap"}
    seen = {r["spine_disposition"] for r in _bridge_rows()}
    assert seen <= KNOWN, f"unknown disposition(s): {sorted(seen - KNOWN)}"


def test_a_target_is_present_IFF_the_disposition_is_node():
    """⛔ Both directions. A slug on a `facet` row would send a shopper to a page that
    disagrees with the ruling; a missing slug on a `node` row silently drops coverage."""
    for r in _bridge_rows():
        if r["spine_disposition"] == "node":
            assert r["spine_slug"], f"{r['raw_label']!r}: node disposition with no target"
            assert r["spine_department"], f"{r['raw_label']!r}: no department"
            assert r["spine_department_label"], f"{r['raw_label']!r}: no department label"
            assert r["spine_level"] in ("0", "1", "2"), r["raw_label"]
        else:
            assert not r["spine_slug"], (
                f"{r['raw_label']!r}: disposition {r['spine_disposition']!r} carries a target")


def test_department_and_level_agree_with_the_spine(spine):
    """⭐ The bridge must not become a second place the spine is described."""
    by_slug = {n["slug"]: n for n in spine["nodes"]}
    for r in _bridge_rows():
        if r["spine_disposition"] != "node":
            continue
        n = by_slug[r["spine_slug"]]
        assert r["spine_department"] == n["department"], r["raw_label"]
        assert r["spine_level"] == str(n["level"]), r["raw_label"]
        assert r["spine_department_label"] == by_slug[n["department"]]["name"], r["raw_label"]
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd /home/reginaldkyalo/codes/phones_scraper && python3 -m pytest category_taxonomy/redesign/test_package.py -q -k bridge`
Expected: FAIL — `emit_bridge.py` does not exist, so `_run` raises and `bridge.tsv` is absent.

- [ ] **Step 3: Write `emit_bridge.py`**

```python
"""Emit bridge.tsv — the ONE file the live pipeline reads from this package.

⛔⛔ THIS FILE IS THE ENTIRE CONTRACT between the design package and
`publish_browse_tree.py`. The publisher joins it on `browse_nodes.label` and learns nothing
else about this folder: not what a disposition is, not what a facet is, not what a split is.
`HANDOFF.md` keeps this package out of the live pipeline on purpose — "a separate system
until the migration says otherwise" — and six columns is what the migration costs. Add a
seventh only with a reason.

⛔ `spine_disposition` IS WRITTEN FOR EVERY ROW, including rows with no target. It is what
lets a consumer tell "this label was never mapped" from "this label was deliberately mapped
to nothing" — 17.5% of placements are `split`, and without this column they are
indistinguishable from a bug.

⭐ `spine_department_label` is denormalised: 19 distinct values over 4,066 rows. The
alternative is the API reading `taxonomy_spine.yaml`, which is the boundary this file exists
to avoid crossing.
"""
import csv
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / 'bridge.tsv'
COLUMNS = ('raw_label', 'spine_slug', 'spine_department', 'spine_department_label',
           'spine_level', 'spine_disposition')

by_slug = {n['slug']: n for n in json.load(open(HERE / '_spine.json'))['nodes']}

rows = []
for r in csv.DictReader(open(HERE / 'label_disposition.tsv'), delimiter='\t'):
    node = by_slug.get(r['target']) if r['disposition'] == 'node' else None
    dept = by_slug.get(node['department']) if node else None
    rows.append((
        r['raw_label'],
        node['slug'] if node else '',
        node['department'] if node else '',
        dept['name'] if dept else '',
        str(node['level']) if node else '',
        r['disposition'] or '',
    ))

# ⛔ SORTED, and the tie-break is load-bearing for the same reason emit_spine_yaml's is:
# `key=str.lower` alone ties on case variants and the tie falls out in input order, so two
# runs differ. This file is reviewed as a diff; churn hides real change.
rows.sort(key=lambda t: (t[0].lower(), t[0]))

with open(OUT, 'w', newline='') as fh:
    w = csv.writer(fh, delimiter='\t')
    w.writerow(COLUMNS)
    w.writerows(rows)

mapped = sum(1 for r in rows if r[1])
print(f'bridge.tsv: {len(rows)} rows, {mapped} mapped to a spine node, '
      f'{len({r[2] for r in rows if r[2]})} departments')
```

- [ ] **Step 4: Generate and run the tests**

```bash
cd /home/reginaldkyalo/codes/phones_scraper/category_taxonomy/redesign
python3 emit_bridge.py     # expect: 4066 rows, 2877 mapped, 19 departments
cd /home/reginaldkyalo/codes/phones_scraper && python3 -m pytest category_taxonomy/redesign/test_package.py -q
```
Expected: PASS, and the whole package's existing invariants still green.

- [ ] **Step 5: Commit**

```bash
cd /home/reginaldkyalo/codes/phones_scraper
git add category_taxonomy/redesign/emit_bridge.py category_taxonomy/redesign/bridge.tsv \
        category_taxonomy/redesign/test_package.py
git commit -m "feat(redesign): emit bridge.tsv — the package's one contract with the live pipeline

The design package has been isolated from the live pipeline on purpose since
it was written. This is the single narrow file that crosses: raw_label ->
spine slug, department, department label, level, disposition. The publisher
joins it on browse_nodes.label and learns nothing else about this folder.

spine_disposition is written for EVERY row, including rows with no target,
so a consumer can tell 'never mapped' from 'deliberately mapped to nothing'
— 17.5% of placements are splits and would otherwise look like a bug.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: Stamp the spine onto `browse_nodes`

**Repo:** `phones_scraper`

**Files:**
- Modify: `category_taxonomy/publish_browse_tree.py` (add `load_bridge`, `stamp_spine`; driver at `:1160`)
- Test: `category_taxonomy/tests/test_publish_browse_tree.py` (append)

**Interfaces:**
- Consumes: `bridge.tsv` from Task 1.
- Produces: `load_bridge(path=None) -> dict[str, dict]` and `stamp_spine(node_docs: list[dict], bridge: dict) -> list[dict]`. Every `browse_nodes` doc gains `spine_slug`, `spine_department`, `spine_department_label`, `spine_level` (all `str | None`, level `int | None`) and `spine_disposition` (`str`, never `None`).

**⛔ `build_documents(nodes, placements)` KEEPS ITS TWO-ARGUMENT SIGNATURE.** It has 15 call sites in the test suite, and this repo has just been burned by an optional argument on a shared constructor (`api_phones_scraper` commit fixing `ancestor_labels`, where two of three callers took the default). Stamping is a separate pure function applied by the driver, so there is no default to forget and no call site to update.

- [ ] **Step 1: Write the failing tests**

Append to `category_taxonomy/tests/test_publish_browse_tree.py`:

```python
# ----------------------------------------------------------------------------- stamp_spine

from category_taxonomy.publish_browse_tree import load_bridge, stamp_spine

_BRIDGE = {
    "Phones": {"spine_slug": "smartphones", "spine_department": "phones-wearables",
               "spine_department_label": "Phones & Wearables", "spine_level": "1",
               "spine_disposition": "node"},
    "128GB":  {"spine_slug": "", "spine_department": "", "spine_department_label": "",
               "spine_level": "", "spine_disposition": "facet"},
}


def test_stamp_spine_writes_the_five_fields():
    docs = [{"_id": "p", "label": "Phones"}]
    got = stamp_spine(docs, _BRIDGE)[0]
    assert got["spine_slug"] == "smartphones"
    assert got["spine_department"] == "phones-wearables"
    assert got["spine_department_label"] == "Phones & Wearables"
    assert got["spine_level"] == 1, "the level is an int, not the TSV's string"
    assert got["spine_disposition"] == "node"


def test_an_unmapped_label_keeps_its_DISPOSITION_and_nulls_the_rest():
    """⛔⛔ THE WHOLE POINT OF THE DISPOSITION COLUMN. `spine_department: None` alone cannot
    be told from a bug; `spine_disposition: 'facet'` says a person ruled on it."""
    got = stamp_spine([{"_id": "f", "label": "128GB"}], _BRIDGE)[0]
    assert got["spine_slug"] is None and got["spine_department"] is None
    assert got["spine_level"] is None
    assert got["spine_disposition"] == "facet"


def test_an_UNJOINED_label_is_a_HARD_FAILURE_not_a_null():
    """⛔⛔ COVERAGE MUST NOT ROT SILENTLY. If the engine republishes a label the design
    package has never seen, the honest answer is to stop and rule on it. Degrading to null
    is the same silent-fallback class that has already shipped three times in this codebase
    (544e069f, /by-node, /by-department)."""
    import pytest
    with pytest.raises(ValueError) as exc:
        stamp_spine([{"_id": "x", "label": "Never Seen Before"}], _BRIDGE)
    assert "Never Seen Before" in str(exc.value)


def test_stamp_spine_is_PURE():
    """⛔ The publisher's idempotence test rests on build_documents being pure; a stamp that
    mutated its input would move the impurity one function along."""
    docs = [{"_id": "p", "label": "Phones"}]
    stamp_spine(docs, _BRIDGE)
    assert "spine_slug" not in docs[0], "stamp_spine mutated its argument"


def test_stamp_spine_preserves_every_existing_field():
    """⛔ ADDITIVE. A publisher field dropped here vanishes from the API with no error."""
    doc = {"_id": "p", "label": "Phones", "n_clusters": 7, "browsable": True,
           "ancestors": ["e"], "n_clusters_subtree": 9}
    got = stamp_spine([doc], _BRIDGE)[0]
    for k, v in doc.items():
        assert got[k] == v, f"{k} was altered or dropped"


def test_load_bridge_reads_the_checked_in_artifact():
    """⭐ Not a fixture — the real file, so a regenerated bridge that breaks the reader is
    caught here rather than in production."""
    bridge = load_bridge()
    assert len(bridge) > 4000, f"only {len(bridge)} rows; is bridge.tsv generated?"
    assert all("spine_disposition" in r for r in bridge.values())
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd /home/reginaldkyalo/codes/phones_scraper && python3 -m pytest category_taxonomy/tests/test_publish_browse_tree.py -q -k "stamp or bridge"`
Expected: FAIL at import — `cannot import name 'load_bridge'`.

- [ ] **Step 3: Implement**

Add to `category_taxonomy/publish_browse_tree.py`, immediately after `build_documents`:

```python
REDESIGN_BRIDGE = Path(__file__).resolve().parent / "redesign" / "bridge.tsv"


def load_bridge(path=None) -> dict:
    """`raw_label -> bridge row`. The ONLY thing this pipeline reads from `redesign/`.

    ⛔ `redesign/` is deliberately isolated from the live pipeline (`redesign/HANDOFF.md`:
    "a separate system until the migration says otherwise"). This function is the migration,
    and it is six columns wide on purpose — no YAML, no dispositions logic, no import.
    """
    with open(path or REDESIGN_BRIDGE, newline="") as fh:
        return {r["raw_label"]: r for r in csv.DictReader(fh, delimiter="\t")}


def stamp_spine(node_docs: list, bridge: dict) -> list:
    """Stamp the redesign spine's five fields onto every node doc. Pure.

    ⛔⛔ AN UNJOINED LABEL IS A HARD FAILURE, NEVER A NULL. Measured 2026-09-04 the join is
    total — 4,137 of 4,137 nodes — so a miss means the engine published a label the design
    package has never ruled on. Stamping `None` there would let coverage rot invisibly,
    which is the silent-fallback defect this codebase has already shipped three times.

    ⛔ `spine_disposition` is stamped even when there is no target: it is what separates
    "never mapped" from "deliberately mapped to nothing" (17.5% of placements are splits).
    """
    missing = sorted({d.get("label") for d in node_docs if d.get("label") not in bridge})
    if missing:
        raise ValueError(
            f"{len(missing)} browse_nodes labels are absent from bridge.tsv, e.g. "
            f"{missing[:5]!r} — regenerate the redesign package "
            f"(python3 category_taxonomy/redesign/emit_bridge.py) or rule on the new "
            f"labels. Stamping null here would let coverage rot silently.")

    out = []
    for d in node_docs:
        r = bridge[d["label"]]
        lvl = r["spine_level"]
        out.append({**d,
                    "spine_slug": r["spine_slug"] or None,
                    "spine_department": r["spine_department"] or None,
                    "spine_department_label": r["spine_department_label"] or None,
                    "spine_level": int(lvl) if lvl else None,
                    "spine_disposition": r["spine_disposition"]})
    return out
```

Ensure `import csv` and `from pathlib import Path` are present at the top of the module.

Then change the driver at `category_taxonomy/publish_browse_tree.py:1160`:

```python
    node_docs, place_docs = build_documents(nodes, placements)
    # ⭐ Stamped after building, not inside it: `build_documents` keeps its two-argument
    # signature and its 15 call sites, and the file read stays out of a pure function.
    node_docs = stamp_spine(node_docs, load_bridge())
```

- [ ] **Step 4: Run the tests**

```bash
cd /home/reginaldkyalo/codes/phones_scraper && python3 -m pytest -q
```
Expected: PASS, including the 15 existing `build_documents` call sites untouched.

- [ ] **Step 5: Republish and verify the live tree**

```bash
cd /home/reginaldkyalo/codes/phones_scraper
python3 -m category_taxonomy.publish_browse_tree --apply
cd /home/reginaldkyalo/codes/api_phones_scraper && ./apienv/bin/python - <<'PY'
import sys, collections; sys.path.insert(0, ".")
from app.config import settings
from pymongo import MongoClient
db = MongoClient(settings.MONGO_URI)["taxonomy_db"]
n = list(db.browse_nodes.find({}, {"spine_department":1,"spine_disposition":1,"n_clusters":1}))
print("nodes:", len(n), "| missing disposition:", sum(1 for d in n if not d.get("spine_disposition")))
m = collections.Counter()
for d in n:
    if d.get("spine_department"): m[d["spine_department"]] += d.get("n_clusters") or 0
print("departments:", len(m), "| mass:", f"{sum(m.values()):,}", "(expect 81,525)")
PY
```
Expected: 4,137 nodes, **0** missing dispositions, 19 departments, mass **81,525**.
⚠️ The API caches the tree for 300s (`BROWSE_TTL_SECONDS`) — this reads Mongo directly, so it is immediate.

- [ ] **Step 6: Commit**

```bash
cd /home/reginaldkyalo/codes/phones_scraper
git add category_taxonomy/publish_browse_tree.py category_taxonomy/tests/test_publish_browse_tree.py
git commit -m "feat(publish): stamp the redesign spine onto every browse_node

Five additive fields per node doc, joined on label against redesign/bridge.tsv.
Same shape as n_clusters_subtree (roadmap 3.5): the engine publishes it, the
API reads it, and no consumer ever handles a bare spine slug — which is what
makes the 95-slug collision between the two trees structurally unhittable.

build_documents KEEPS its two-argument signature and its 15 call sites.
Stamping is a separate pure function applied by the driver, because an
optional argument on a shared constructor is exactly how the API's
ancestor_labels diverged on two of three routes.

An unjoined label raises rather than stamping null. The join is total today
(4,137/4,137); a miss means a label nobody has ruled on, and a null there
would let coverage rot invisibly.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: `GET /api/clusters/spine-departments`

**Repo:** `api_phones_scraper`

**Files:**
- Modify: `app/api/schemas/clusters.py`
- Modify: `app/api/routes/clusters.py`
- Create: `tests/test_spine_departments.py`

**Interfaces:**
- Consumes: the five stamped fields from Task 2.
- Produces: `_spine_departments() -> dict[str, dict]` (id → `{"label", "n_clusters", "shelves"}`, `shelves` a list of node docs) and the route `spine_departments()`. Task 4 consumes `_spine_departments`.

- [ ] **Step 1: Write the failing tests**

Create `tests/test_spine_departments.py`:

```python
"""The REDESIGN spine's departments — the parallel route.

⚠️ NO `pytest.mark.asyncio` — this repo has no pytest-asyncio, so such a mark runs the
coroutine as a no-op and the test passes without executing.
"""
import asyncio
from pathlib import Path

import pytest
from fastapi import HTTPException

from app.api.routes import clusters as route_mod

from tests.test_browse_tree_nav import _Nodes, _n
from tests.test_departments_api import _Clusters, _Placements, _TreeNodes

SOURCE = Path(route_mod.__file__).read_text()


def _s(slug, label, dept, dept_label, level, clusters, parent=None, ancestors=()):
    return {**_n(slug, label, parent=parent, clusters=clusters),
            "ancestors": list(ancestors),
            "n_clusters_subtree": clusters,
            "spine_slug": f"x-{slug}", "spine_department": dept,
            "spine_department_label": dept_label, "spine_level": level,
            "spine_disposition": "node"}


#   phones/  'Phones'(100)  -> phones-wearables, and its CHILD 'Cases'(30) in the same dept
#   audio/   'Audio'(40)    -> tv-audio
#   loose/   'Salt'(5)      -> a facet: mapped to NOTHING, must not appear
TREE = [
    _s("phone", "Phones", "phones-wearables", "Phones & Wearables", 0, 100),
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
    contains its descendants. Here `Cases`(30) is a child of `Phones`(100) in the SAME
    department: the answer is 130, and the subtree sum would say 230."""
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
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd /home/reginaldkyalo/codes/api_phones_scraper && ./apienv/bin/python -m pytest tests/test_spine_departments.py -q`
Expected: FAIL — `module 'app.api.routes.clusters' has no attribute 'reset_spine_departments_cache'`.

- [ ] **Step 3: Add the schemas**

Append to `app/api/schemas/clusters.py`:

```python
class SpineDepartmentView(BaseModel):
    """One department of the REDESIGN spine, discovered from stamped `browse_nodes` fields.

    ⛔ NOT a `DepartmentView`. That is the 21 curated departments from `app/api/departments.py`
    over the same tree; this is the 19 designed ones. The id spaces overlap on
    `home-appliances` and the pages differ, so the two must never share a link builder.
    """

    id: str = Field(description="spine department slug, e.g. `phones-wearables`")
    label: str = Field(description="published display name — NEVER derived from the slug")
    n_clusters: int = Field(
        description="placements reaching this department: the SUM OF `n_clusters`, never of "
                    "`n_clusters_subtree`. A spine department is a set closed under the label "
                    "mapping, not a subtree, so it already contains its descendants; summing "
                    "closures gives 167,610 against a 102,038 corpus.")
    n_shelves: int = Field(description="adopted `browse_nodes` shelves, before any render fold")


class SpineDepartmentsResponse(BaseModel):
    count: int
    n_clusters_total: int = Field(
        description="⭐ The rows DO sum to this, unlike the curated spine's — one placement, "
                    "one node, one label, one department.")
    results: list[SpineDepartmentView]


class SpineDepartmentClustersResponse(BaseModel):
    department: SpineDepartmentView
    shelves: list[BrowseNodeView] = Field(
        description="the adopted shelves, stock-ordered, maximal only (no shelf whose ancestor "
                    "is also adopted by this department)")
    count: int
    total: int
    results: list[ClusterSummary]
```

- [ ] **Step 4: Implement the loader and route**

Add to `app/api/routes/clusters.py`, **before** `@router.get("/{cluster_id:path}")`:

```python
# ============================================================================================
# THE REDESIGN SPINE — 19 designed departments, discovered from stamped fields
# ============================================================================================
#
# ⭐ WHAT THIS IS. `publish_browse_tree` stamps `spine_department` on every node from
# `redesign/bridge.tsv`. These routes read that field and nothing else: no TSV, no YAML, no
# second data source, no request-time join. The client never handles a bare spine slug, which
# is what makes the 95-slug collision between the two trees structurally unhittable.
#
# ⛔ IT DOES NOT REPLACE `departments.py` YET. Both are live; `/aisle` is the parallel route
# and the cutover is a separate change.

_SPINE_DEPTS: dict | None = None
_SPINE_DEPTS_AT: float = 0.0


def reset_spine_departments_cache() -> None:
    """Force the next `_spine_departments` to re-read. For tests and a post-publish poke."""
    global _SPINE_DEPTS, _SPINE_DEPTS_AT
    _SPINE_DEPTS, _SPINE_DEPTS_AT = None, 0.0


async def _spine_departments() -> dict:
    """`id -> {"label", "n_clusters", "shelves"}`, built from stamped fields.

    ⛔⛔ `n_clusters` IS THE SUM OF OWN STOCK, NOT OF `n_clusters_subtree`, AND THAT INVERTS
    THE RULE EVERYWHERE ELSE IN THIS FILE. `n_clusters_subtree` exists because a TREE WALK
    must not understate a coarse parent. A spine department is not a subtree — it is the set
    of nodes carrying one `spine_department`, and that set already contains the descendants.
    Measured live 2026-09-04: summing closures gives 167,610 against a corpus of 102,038,
    inflating `home-appliances` 6.90x. Summing own stock gives 81,525, exactly the placement
    count.

    ⭐ SHELVES ARE MAXIMAL ONLY. A shelf whose ancestor is also in the department is already
    inside it; offering both renders the same products behind two doors.
    """
    global _SPINE_DEPTS, _SPINE_DEPTS_AT
    if _SPINE_DEPTS is not None and (time.monotonic() - _SPINE_DEPTS_AT) <= BROWSE_TTL_SECONDS:
        return _SPINE_DEPTS
    try:
        docs = [d async for d in
                BROWSE_NODES.find({"spine_department": {"$ne": None}})]
    except Exception:
        # ⛔ Same contract as every other tree route: navigation degrades, never 500s.
        return _SPINE_DEPTS or {}

    grouped: dict = {}
    for d in docs:
        g = grouped.setdefault(d["spine_department"], {
            "label": d.get("spine_department_label") or d["spine_department"],
            "n_clusters": 0, "nodes": []})
        g["n_clusters"] += d.get("n_clusters") or 0
        g["nodes"].append(d)

    for g in grouped.values():
        mine = {d["_id"] for d in g["nodes"]}
        maximal = [d for d in g["nodes"] if not (set(d.get("ancestors") or []) & mine)]
        g["shelves"] = sorted(maximal, key=lambda d: (-(d.get("n_clusters_subtree") or 0),
                                                      str(d.get("label") or d["_id"])))
        del g["nodes"]

    _SPINE_DEPTS, _SPINE_DEPTS_AT = grouped, time.monotonic()
    return grouped


def _spine_department_view(dept_id: str, g: dict) -> SpineDepartmentView:
    """One spine department as the API publishes it. Pure.

    ⛔ ONE construction site for both routes — a `response_model` FILTERS silently.
    """
    return SpineDepartmentView(id=dept_id, label=g["label"],
                               n_clusters=g["n_clusters"], n_shelves=len(g["shelves"]))


@router.get("/spine-departments", response_model=SpineDepartmentsResponse)
async def spine_departments():
    """The REDESIGN spine's departments, discovered from what the engine stamped.

    ⭐ There is no curated config behind this. A spine change reaches the storefront through
    a republish, not a code edit — which is the whole reason the bridge is published rather
    than joined here.
    """
    grouped = await _spine_departments()
    rows = sorted(grouped.items(), key=lambda kv: (-kv[1]["n_clusters"], kv[0]))
    return {
        "count": len(rows),
        # ⭐ These rows DO sum, unlike the curated spine's: one placement, one node, one
        # label, one department. §1.3 of the spec proves the disjointness.
        "n_clusters_total": sum(g["n_clusters"] for _, g in rows),
        "results": [_spine_department_view(i, g) for i, g in rows],
    }
```

Add `SpineDepartmentView`, `SpineDepartmentsResponse` and `SpineDepartmentClustersResponse` to the schema imports at the top of `clusters.py`.

- [ ] **Step 5: Run the tests**

Run: `cd /home/reginaldkyalo/codes/api_phones_scraper && ./apienv/bin/python -m pytest tests/test_spine_departments.py -q`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
cd /home/reginaldkyalo/codes/api_phones_scraper
git add app/api/schemas/clusters.py app/api/routes/clusters.py tests/test_spine_departments.py
git commit -m "feat(api): serve the redesign spine's departments from stamped fields

19 departments discovered from browse_nodes.spine_department — no curated
config, so a spine change reaches the storefront through a republish rather
than a code edit. Reads only stamped fields: no TSV, no YAML, no join.

⛔ A department's mass sums n_clusters, NOT n_clusters_subtree, and that
inverts the rule everywhere else in this file. A spine department is a set
closed under the label mapping, not a subtree, so it already contains its
descendants; summing closures gives 167,610 against a 102,038 corpus and
inflates home-appliances 6.90x. Measured live 2026-09-04.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: `GET /api/clusters/by-spine-department/{dept_id}`

**Repo:** `api_phones_scraper`

**Files:**
- Modify: `app/api/routes/clusters.py`
- Test: `tests/test_spine_departments.py` (append)

**Interfaces:**
- Consumes: `_spine_departments()`, `_spine_department_view()`, `_browse_node_views()` from Task 3 and the existing codebase.
- Produces: the route `clusters_by_spine_department(dept_id, multi_store_only, limit, offset)`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_spine_departments.py`:

```python
def _dept(i, **kw):
    kw.setdefault("multi_store_only", False)
    kw.setdefault("limit", 20)
    kw.setdefault("offset", 0)
    return lambda: route_mod.clusters_by_spine_department(i, **kw)


def test_the_page_INCLUDES_DESCENDANTS_of_an_adopted_shelf():
    """⭐ Descendant closure server-side, like /by-department: a department is never an empty
    page. `Cases` is below `Phones`, so its 30 are in the 130."""
    assert _with_tree(_dept("phones-wearables"))["total"] == 130


def test_the_page_offers_NO_include_descendants_SWITCH():
    """⛔ A department without its subtrees is not a smaller department, it is a wrong one."""
    import inspect
    assert "include_descendants" not in inspect.signature(
        route_mod.clusters_by_spine_department).parameters


def test_the_menu_and_the_page_AGREE():
    """⛔⛔ THE LOAD-BEARING ASSERTION. The claim on a control must equal the rows that
    control opens, or a department advertises a page it will not show."""
    menu = {d.id: d.n_clusters for d in _with_tree(route_mod.spine_departments)["results"]}
    page = _with_tree(_dept("phones-wearables"))
    assert page["total"] == menu["phones-wearables"]


def test_the_page_returns_MAXIMAL_shelves_only():
    """⛔ `Cases` is inside `Phones` and both are in the department. Offering both renders
    the same products behind two doors and makes the counts look like they double."""
    got = _with_tree(_dept("phones-wearables"))
    assert [s.slug for s in got["shelves"]] == ["phone"]


def test_the_shelves_carry_REAL_ancestor_labels():
    """⛔ Built through `_browse_node_views`, never `_browse_node_view` — the collective
    builder resolves the label map, and a route that supplies its own is how /by-node and
    /by-department shipped raw shop slugs in a shopper's breadcrumb."""
    got = _with_tree(_dept("phones-wearables"))
    assert all(a != l for s in got["shelves"]
               for a, l in zip(s.ancestors, s.ancestor_labels))


def test_an_unknown_department_is_a_404_not_an_empty_list():
    with pytest.raises(HTTPException) as exc:
        _with_tree(_dept("no-such-department"))
    assert exc.value.status_code == 404
    assert "department" in str(exc.value.detail).lower()


def test_a_NODE_SLUG_on_the_department_route_is_a_404():
    """⛔⛔ A FOURTH SLUG SPACE. `phone` names a browse_nodes shelf, not a spine department;
    resolving it here would render a plausible wrong page instead of erroring."""
    with pytest.raises(HTTPException) as exc:
        _with_tree(_dept("phone"))
    assert exc.value.status_code == 404
```

- [ ] **Step 2: Run to verify they fail**

Run: `./apienv/bin/python -m pytest tests/test_spine_departments.py -q -k "page or menu or unknown or NODE_SLUG or shelves"`
Expected: FAIL — `has no attribute 'clusters_by_spine_department'`.

- [ ] **Step 3: Implement**

Add to `app/api/routes/clusters.py`, immediately after `spine_departments` and still before the catch-all:

```python
@router.get("/by-spine-department/{dept_id}", response_model=SpineDepartmentClustersResponse)
async def clusters_by_spine_department(
    dept_id: str,
    multi_store_only: bool = Query(False, description="only products compared across >=2 stores"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """The products in one designed department, and everything below its shelves.

    ⛔ NO `include_descendants` SWITCH, deliberately — same as `/by-department`. A department
    without its subtrees is not a smaller department, it is a wrong one.

    ⛔ `dept_id` IS A FOURTH SLUG SPACE. It is not a `browse_nodes` slug, not a curated
    department id and not a retired-spine slug. `home-appliances` names both a designed and a
    curated department and the pages differ, so an unknown id must 404 rather than resolve.
    """
    grouped = await _spine_departments()
    g = grouped.get(dept_id)
    if not g:
        raise HTTPException(status_code=404, detail=f"unknown spine department {dept_id!r}")

    slugs = {s["_id"] for s in g["shelves"]}
    for shelf in g["shelves"]:
        slugs |= {d["_id"] async for d in
                  BROWSE_NODES.find({"ancestors": shelf["_id"]}, {"_id": 1})}

    ids = [p["_id"] async for p in
           BROWSE_PLACEMENTS.find({"node_slug": {"$in": list(slugs)}}, {"_id": 1})]
    query: dict = {"_id": {"$in": ids}}
    if multi_store_only:
        query["is_multi_store"] = True
    total = await CLUSTERS.count_documents(query)
    rows = await (CLUSTERS.find(query)
                  .sort("n_listings", -1)
                  .skip(offset)
                  .to_list(length=limit))

    return {
        "department": _spine_department_view(dept_id, g),
        "shelves": await _browse_node_views(g["shelves"]),
        "count": len(rows),
        "total": total,
        "results": [_cluster_view(d, summary=True) for d in rows],
    }
```

- [ ] **Step 4: Run the full API suite**

Run: `cd /home/reginaldkyalo/codes/api_phones_scraper && ./apienv/bin/python -m pytest -q`
Expected: PASS — 297 existing plus 13 new.

- [ ] **Step 5: Verify live, and prove the assertion is not vacuous**

```bash
cd /home/reginaldkyalo/codes/api_phones_scraper
PORT=10077 ./apienv/bin/python -m app.main > /tmp/api.log 2>&1 &
sleep 5
curl -s localhost:10077/api/clusters/spine-departments | ./apienv/bin/python -c '
import sys, json; d = json.load(sys.stdin)
print("departments:", d["count"], "| total:", f"{d[\"n_clusters_total\"]:,}")
assert d["count"] == 19 and d["n_clusters_total"] == 81525, "reach regressed"
for r in d["results"][:3]: print(" ", r["id"], r["label"], f"{r[\"n_clusters\"]:,}", r["n_shelves"])'
# the menu must agree with the page it links to, for EVERY department
./apienv/bin/python - <<'PY'
import json, urllib.request
B = "http://localhost:10077/api/clusters"
g = lambda u: json.load(urllib.request.urlopen(u))
bad = []
for r in g(f"{B}/spine-departments")["results"]:
    p = g(f"{B}/by-spine-department/{r['id']}?limit=1")
    if p["total"] != r["n_clusters"]:
        bad.append((r["id"], r["n_clusters"], p["total"]))
print("departments checked:", 19, "| disagreements:", len(bad), bad[:3])
assert not bad
PY
```
Expected: 19 departments, 81,525 total, **0** disagreements. ⚠️ Kill the test server afterwards; do not kill whatever already owns port 10000.

- [ ] **Step 6: Commit**

```bash
cd /home/reginaldkyalo/codes/api_phones_scraper
git add app/api/routes/clusters.py tests/test_spine_departments.py
git commit -m "feat(api): the designed department page, with descendant closure

/by-spine-department/{id} — the products in one designed department and
everything below its adopted shelves. No include_descendants switch, for the
same reason /by-department has none: a department without its subtrees is
not a smaller department, it is a wrong one.

Shelves are MAXIMAL only — a shelf whose ancestor is also in the department
is already inside it, and offering both renders the same products behind two
doors. Built through _browse_node_views so the breadcrumbs cannot regress to
raw shop slugs.

dept_id is a FOURTH slug space; a node slug or a curated id must 404 rather
than resolve to a plausible wrong page.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: The `/aisle/:id` route

**Repo:** `api_phones_scraper` (`dealsonline_ui_ux/`)

**Files:**
- Modify: `src/app/lib/api.ts`
- Modify: `src/app/lib/categories.ts`
- Create: `src/app/pages/AislePage.tsx`
- Modify: `src/app/routes.ts`

**Interfaces:**
- Consumes: `/api/clusters/spine-departments`, `/api/clusters/by-spine-department/{id}` from Tasks 3–4.
- Produces: `aisleHref(id: string): string`, `spineApi.getDepartments()`, `spineApi.getClusters(id, opts)`, route `/aisle/:id`.

**⛔ This UI has no test framework.** The gates are `npx tsc --noEmit`, a production build, and the render gate in Task 6.

- [ ] **Step 1: Add the API client**

In `src/app/lib/api.ts`, beside the existing `departmentApi`:

```ts
/**
 * ⛔⛔ A FOURTH SLUG SPACE. `SpineDepartmentView.id` is a REDESIGN spine department
 * (`phones-wearables`), not a `browse_nodes` slug, not a curated department id and not a
 * retired-spine slug. Measured 2026-09-04: the 19 designed ids share ZERO slugs with
 * `browse_nodes` and zero with the retired spine, but `home-appliances` names both a designed
 * and a curated department and the two pages differ. Route ids through `aisleHref` only.
 */
export interface SpineDepartmentView {
  id: string;
  label: string;
  /** ⛔ Already the summed OWN stock — do not add `n_clusters_subtree` to it. */
  n_clusters: number;
  n_shelves: number;
}

export const spineApi = {
  getDepartments: () =>
    get<{ count: number; n_clusters_total: number; results: SpineDepartmentView[] }>(
      "/clusters/spine-departments"),

  getClusters: (id: string, opts: { multiStoreOnly?: boolean; limit?: number; offset?: number } = {}) =>
    get<{
      department: SpineDepartmentView;
      shelves: BrowseNode[];
      count: number;
      total: number;
      results: ClusterSummary[];
    }>(`/clusters/by-spine-department/${encodeURIComponent(id)}`, {
      multi_store_only: opts.multiStoreOnly,
      limit: opts.limit,
      offset: opts.offset,
    }),
};
```

Match the existing `get<T>()` helper's signature in that file rather than inventing one.

- [ ] **Step 2: Add the third link builder**

In `src/app/lib/categories.ts`, immediately after `departmentHref`:

```ts
/**
 * ⛔⛔ THE FOURTH SLUG SPACE, AND THE REASON IT GETS ITS OWN BUILDER. `shelfHref` exists
 * because a canonical slug handed to `/browse` finds nothing; `departmentHref` exists because
 * six curated ids also name a shelf. This exists because `home-appliances` names BOTH a
 * designed department and a curated one, and `/aisle/home-appliances` and
 * `/department/home-appliances` are genuinely different pages — neither redirects to the other.
 *
 * ⛔ Measured 2026-09-04: the 19 designed department ids collide with `browse_nodes` on ZERO
 * slugs. That safety does NOT extend to the spine's 1,392 nodes, of which 95 collide with
 * `browse_nodes` and 43 of those are browsable — so a spine node slug must never be passed
 * here. This builder takes DEPARTMENT ids only.
 */
export function aisleHref(id: string): string {
  return `/aisle/${encodeURIComponent(id)}`;
}
```

- [ ] **Step 3: Create the page**

Create `src/app/pages/AislePage.tsx`, copying the structure of `DepartmentPage.tsx` (read it first — it is the working reference for the loading, error, pagination and `PageMeta` contracts) with these differences, each of which matters:

```tsx
// 1. data source
const [dept, setDept] = useState<SpineDepartmentView | null>(null);
useEffect(() => {
  spineApi.getClusters(id!, { limit: PAGE, multiStoreOnly })
    .then((r) => {
      setDept(r.department);
      setShelves(r.shelves);
      setTotal(r.total);
      setClusters(r.results);
    })
    .catch(() => setError(true))
    .finally(() => setLoading(false));
}, [id, multiStoreOnly]);

// 2. ⛔ shelf links use shelfHref — an adopted shelf is a browse_nodes slug, NOT an aisle id.
//    The two spaces overlap and the mistake resolves to a plausible wrong page.
<Link to={shelfHref(shelf.slug)}>…</Link>

// 3. ⛔ the count is `total` from the endpoint, never a sum of the shelves' counts:
//    the shelves are maximal but their subtrees are what the page actually lists.
<h1>{dept.label}</h1><p>{formatCount(total)} products</p>

// 4. ⭐ REQUIRED — the "All categories" door. At 79.9% reach the residue is 20,513
//    placements, not zero, and without this door they are unreachable by browsing while
//    every other assertion still passes.
<Link to="/shelf">All categories</Link>

// 5. ⛔ 404 copy must say DEPARTMENT, so a wrong id space reads as a wrong id space.
if (error) return <PageMeta noindex title="No such department" />;

// 6. ⛔ DO NOT apply `departmentShelves` here. `DepartmentPage` deliberately keeps
//    `foldChildren` because a page's shelf list is DOCUMENTATION of what the department is
//    made of; the menu fold deleted that explanation and the gate caught it.
```

- [ ] **Step 4: Register the route**

In `src/app/routes.ts`, after the `department/:id` entry:

```ts
      // The REDESIGN spine's 19 designed departments (browse_nodes.spine_department).
      // ⛔⛔ A FOURTH SLUG SPACE, PARALLEL TO /department ON PURPOSE. This is the migration
      // target for the 21 curated departments — 79.9% of placements reachable vs 46.0% — and
      // the two run side by side only until the cutover. `home-appliances` names a department
      // in BOTH spaces and the pages differ, so `aisleHref` and `departmentHref` are separate
      // builders and an id is never passed to the wrong one.
      { path: "aisle/:id", Component: AislePage },
```

with `const AislePage = lazy(() => import("./pages/AislePage"));` beside the other lazy imports.

⛔ Do **not** link `/aisle` from the header, the strip or the mobile sheet. The parallel route is for comparison; two department navs in front of a shopper is the failure mode the roadmap names.

- [ ] **Step 5: Run the gates**

```bash
cd /home/reginaldkyalo/codes/api_phones_scraper/dealsonline_ui_ux
npx tsc --noEmit
npm run build     # ⛔ the third gate — a type-check is not a build
```
Expected: both clean.

- [ ] **Step 6: Commit**

```bash
cd /home/reginaldkyalo/codes/api_phones_scraper
git add dealsonline_ui_ux/src/app/lib/api.ts dealsonline_ui_ux/src/app/lib/categories.ts \
        dealsonline_ui_ux/src/app/pages/AislePage.tsx dealsonline_ui_ux/src/app/routes.ts
git commit -m "feat(ui): /aisle — the designed departments, parallel to /department

A fourth slug space and therefore a third link builder. shelfHref exists
because a canonical slug handed to /browse finds nothing; departmentHref
because six curated ids also name a shelf; aisleHref because
home-appliances names BOTH a designed and a curated department and the two
pages differ.

Not linked from any nav. The parallel route is for comparison — 21
departments in one nav and 19 in another is the failure mode the roadmap
names, and the cutover is a separate change.

Keeps the 'All categories' -> /shelf door: at 79.9% reach the residue is
20,513 placements, and without the door they are unreachable by browsing
while every other assertion still passes.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: Extend the render gate to four slug spaces

**Repo:** `api_phones_scraper` (`dealsonline_ui_ux/`)

**Files:**
- Modify: `scripts/verify_categories.py`

**Interfaces:**
- Consumes: `/aisle/:id` from Task 5, both endpoints from Tasks 3–4.
- Produces: no code interface — this task's deliverable is the gate.

**⛔ Run each assertion RED first.** `CATEGORY_TREE_API.md` §7: four assertions in these gates have lied by passing on an empty result (`len([]) == len(set([]))`, `0 openers == 0 variants`, a `_num()` that read *128* out of `"128GB"`, and a "cold load" that was a same-URL `goto`). Each new one below pins an explanation, not an absence.

- [ ] **Step 1: Add the assertions**

Append to `scripts/verify_categories.py`, following the file's existing assertion style and its 390/900/1440px viewport loop:

```python
# ---------------------------------------------------------------- the fourth slug space

def check_aisle_and_department_are_DIFFERENT_pages(page, api):
    """⛔⛔ `home-appliances` NAMES A DEPARTMENT IN BOTH SPACES. This is `/department/pantry`
    (485) vs `/shelf/pantry` (889) one space over: neither redirects to the other, and a
    shared link builder would send a shopper to a plausible wrong page.
    """
    a = api(f"/clusters/by-spine-department/home-appliances?limit=1")["total"]
    d = api(f"/clusters/by-department/home-appliances?limit=1")["total"]
    assert a and d, f"one side is empty ({a}, {d}) — this check would pass vacuously"
    assert a != d, (
        f"⛔ /aisle/home-appliances and /department/home-appliances both report {a}. "
        f"Either the routes have been merged or one is reading the other's id space.")


def check_a_NODE_SLUG_on_the_aisle_route_reads_as_a_MISSING_DEPARTMENT(page, base):
    """⛔ A wrong id space must read as a wrong id space, not as a transient failure."""
    page.goto(f"{base}/aisle/smartphone")          # a browse_nodes slug, never an aisle id
    page.wait_for_load_state("networkidle")
    body = page.inner_text("body").lower()
    assert "no such department" in body, (
        f"⛔ /aisle/smartphone did not report a missing DEPARTMENT; got: {body[:120]!r}")


def check_every_aisle_keeps_its_ALL_CATEGORIES_door(page, base, api):
    """⭐ At 79.9% reach the residue is 20,513 placements. Remove this door and they are
    unreachable by browsing WHILE EVERY OTHER ASSERTION STILL PASSES — which is exactly why
    it is asserted rather than assumed."""
    ids = [d["id"] for d in api("/clusters/spine-departments")["results"]]
    assert len(ids) == 19, f"expected 19 designed departments, got {len(ids)}"
    for i in ids:
        page.goto(f"{base}/aisle/{i}")
        page.wait_for_load_state("networkidle")
        assert page.locator('a[href="/shelf"]').count() > 0, (
            f"⛔ /aisle/{i} has no 'All categories' door to /shelf")


def check_no_aisle_link_ESCAPES_into_another_slug_space(page, base, api):
    """⛔ The shelves on an aisle page are `browse_nodes` slugs and must link to /shelf/.
    Linking them to /aisle/ resolves 43 of them to a plausible wrong page rather than a 404 —
    measured 2026-09-04, that is how many spine slugs are also BROWSABLE browse_nodes."""
    page.goto(f"{base}/aisle/phones-wearables")
    page.wait_for_load_state("networkidle")
    hrefs = page.eval_on_selector_all("main a", "els => els.map(e => e.getAttribute('href'))")
    shelf_links = [h for h in hrefs if h and h.startswith("/shelf/")]
    assert shelf_links, "no shelf links found — this check would pass vacuously"
    stray = [h for h in hrefs if h and h.startswith("/aisle/") and h != "/aisle/phones-wearables"]
    assert not stray, f"⛔ an adopted shelf linked into the aisle id space: {stray[:3]}"


def check_the_menu_claim_EQUALS_the_page_it_opens(api):
    """⛔⛔ THE SAME LOAD-BEARING SHAPE AS THE OTHER TWO GATES: the claim on a control equals
    the rows that control opens. A department can never advertise a page it will not show."""
    rows = api("/clusters/spine-departments")["results"]
    assert rows, "no departments — this check would pass vacuously"
    for r in rows:
        total = api(f"/clusters/by-spine-department/{r['id']}?limit=1")["total"]
        assert total == r["n_clusters"], (
            f"⛔ {r['id']}: the menu claims {r['n_clusters']:,} and the page shows {total:,}")
```

- [ ] **Step 2: Run each RED first**

For each check, break the thing it pins and confirm it fails, then restore:

| check | sabotage | expected |
|---|---|---|
| `..._DIFFERENT_pages` | point `aisleHref` at `/department/` | FAIL, both totals equal |
| `..._MISSING_DEPARTMENT` | change the 404 copy to "Not found" | FAIL on the copy |
| `..._ALL_CATEGORIES_door` | delete the `/shelf` link from `AislePage` | FAIL naming the department |
| `..._ESCAPES...` | link shelves with `aisleHref` | FAIL listing the stray hrefs |
| `..._EQUALS_the_page...` | sum `n_clusters_subtree` in `_spine_departments` | FAIL at 167,610 |

- [ ] **Step 3: Run the gate green**

```bash
cd /home/reginaldkyalo/codes/api_phones_scraper
./apienv/bin/python -m app.main &            # ⛔ NOT `uvicorn app.main:app`
cd dealsonline_ui_ux && npm run verify:categories
```
Expected: PASS at all three viewports. The script prints its own assertion tally — **cite the command, never a hard-coded count** (the three docs quoted 28, 42 and 48 for the same gate).

- [ ] **Step 4: Commit**

```bash
cd /home/reginaldkyalo/codes/api_phones_scraper
git add dealsonline_ui_ux/scripts/verify_categories.py
git commit -m "test(gate): the render gate learns the fourth slug space

Five assertions, each run RED first: /aisle/home-appliances and
/department/home-appliances are different pages; a node slug on the aisle
route reads 'No such department'; every one of the 19 keeps its
'All categories' door; no adopted shelf link escapes into the aisle id
space; and the menu's claim equals the page it opens.

Each pins an explanation rather than an absence. Four assertions in these
gates have already lied by passing on an empty result, so every check above
asserts its own inputs are non-empty before asserting on them.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7: Reconcile the docs both repos were waiting on

**Repo:** `api_phones_scraper` (+ a note in `phones_scraper`)

**Files:**
- Modify: `dealsonline_ui_ux/CATEGORY_TREE_API.md` (task 9, §2)
- Modify: `dealsonline_ui_ux/CATEGORY_ROADMAP.md` (Phase 6)
- Modify: `phones_scraper/category_taxonomy/redesign/HANDOFF.md`

- [ ] **Step 1: Correct the standoff**

In `CATEGORY_TREE_API.md` task 9, replace *"⛔ Blocked on the engine publishing the bridge"* with what actually happened: **both repos recorded this as blocked on the other and neither was**; the engine now publishes five `spine_*` fields; `/aisle` is live in parallel; the cutover is the remaining step. Add the measured department-space collision figures from spec §1.2, because §2's "95 slugs" is what made this look more dangerous than the department layer is.

- [ ] **Step 2: Update Phase 6**

Mark the bridge landed, record the reproduced 79.9%, and add spec §4.1's `n_clusters` / `n_clusters_subtree` inversion — it is the single most likely way to get this wrong and no existing doc warns about it.

- [ ] **Step 3: Note it engine-side**

In `redesign/HANDOFF.md`, record that the package now has one outward contract (`bridge.tsv` via `emit_bridge.py`) and that the isolation otherwise stands: nothing imports across, and the live pipeline still knows nothing about dispositions, facets or splits.

- [ ] **Step 4: Commit both repos separately**

```bash
cd /home/reginaldkyalo/codes/api_phones_scraper
git add dealsonline_ui_ux/CATEGORY_TREE_API.md dealsonline_ui_ux/CATEGORY_ROADMAP.md
git commit -m "docs(category): the spine bridge landed, and the standoff that delayed it

Both repos recorded this work as blocked on the other. Neither was: no
spine_* field existed anywhere, and the cause was the deliberate isolation
of redesign/ from the live pipeline, not neglect.

Records the reproduced measurement (81,525/102,038 = 79.9% vs 46.0%), the
department id space being collision-free where the deep spine is not (0 vs
43 browsable collisions), and the n_clusters/n_clusters_subtree inversion —
summing closures gives 167,610 against a 102,038 corpus.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"

cd /home/reginaldkyalo/codes/phones_scraper
git add category_taxonomy/redesign/HANDOFF.md
git commit -m "docs(redesign): the package has one outward contract now

bridge.tsv, emitted by emit_bridge.py and read by publish_browse_tree. The
isolation otherwise stands — nothing imports across, and the live pipeline
still knows nothing about dispositions, facets or splits.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Done when

- `bridge.tsv` regenerates byte-identically; the engine suite is green.
- Every `browse_nodes` doc carries `spine_disposition`; **0** nulls; 19 departments; mass **81,525**.
- API suite green (297 + 13 new).
- `/api/clusters/spine-departments` reports 19 and 81,525; every department's menu figure equals its page `total`.
- `npx tsc --noEmit` and `npm run build` clean; `npm run verify:categories` green at three viewports.
- Both repos' docs say what is true.

**Not done here, by design (spec §7):** splits (17.5%), deep spine pages and their 43 browsable collisions, deleting `departments.py`, and the editorial rule for the three near-empty departments.

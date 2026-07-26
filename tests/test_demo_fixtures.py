"""Integrity of the captured demo dataset, and the contract the frontend reads it by.

Two failure modes this exists for, both silent:

1. **Stale shards.** Bucket counts are derived from measured bytes, so a re-capture
   after the corpus grows moves clusters between shards. A run that wrote new files
   without clearing old ones would serve a cluster from a file the frontend no
   longer addresses — every product page 404s, with the fixtures still "present".

2. **Padding drift.** `demoSource.ts` re-implements `shard_for` in TypeScript. The
   suffix was 2 digits when there were 16 buckets; groceries now needs 117, so
   bucket 100 and bucket 00 would collide under the old width. Nothing in either
   language would raise — the wrong file would simply be fetched.

Skips cleanly when the capture has not been run.
"""
import json
import re
from pathlib import Path

import pytest

from scripts.capture_demo_dataset import OUT, SHARD_DIGITS, pages_for, shard_for

DEMO_SOURCE_TS = (
    Path(__file__).resolve().parents[1]
    / "dealsonline_ui_ux_mock/src/app/lib/demoSource.ts"
)


def _manifest():
    path = OUT / "manifest.json"
    if not path.exists():
        pytest.skip("demo dataset not captured")
    return json.loads(path.read_text())


# ----------------------------------------------------- cross-language contract

def test_typescript_pads_shard_suffixes_to_the_same_width():
    """The TS zero-pad width must equal SHARD_DIGITS, or bucket 100 collides with
    bucket 00 and every detail page in a large category 404s.

    Checks the VALUE, not a spelling: `padStart(3, '0')` and `padStart(PAD, '0')`
    with `const PAD = 3` are both fine. An earlier version asserted the literal
    string `const PAD = 3;` and went red when the constant was inlined — a real
    false positive, since the behaviour was identical.
    """
    if not DEMO_SOURCE_TS.exists():
        pytest.skip("frontend not present")
    source = DEMO_SOURCE_TS.read_text()

    calls = re.findall(r"padStart\(\s*([A-Za-z_$][\w$]*|\d+)\s*,", source)
    assert calls, "demoSource.ts no longer zero-pads shard suffixes at all"

    widths = set()
    for arg in calls:
        if arg.isdigit():
            widths.add(int(arg))
            continue
        const = re.search(rf"\b{re.escape(arg)}\s*=\s*(\d+)", source)
        assert const, f"padStart({arg}, …) but {arg} has no numeric definition"
        widths.add(int(const.group(1)))

    assert widths == {SHARD_DIGITS}, \
        f"TS pads to {sorted(widths)}, capture pads to {SHARD_DIGITS}"


def test_typescript_uses_the_same_fnv1a_constants():
    if not DEMO_SOURCE_TS.exists():
        pytest.skip("frontend not present")
    source = DEMO_SOURCE_TS.read_text()
    for constant in ("0x811c9dc5", "0x01000193"):
        assert constant in source, f"demoSource.ts lost FNV constant {constant}"


def test_typescript_reads_the_per_category_bucket_count():
    """A hard-coded bucket count addresses the wrong shard for every category
    whose size differs from the assumed one."""
    if not DEMO_SOURCE_TS.exists():
        pytest.skip("frontend not present")
    assert "meta.buckets" in DEMO_SOURCE_TS.read_text()


# ------------------------------------------------------------ fixture integrity

def test_every_cluster_resolves_to_a_shard_that_exists_and_contains_it():
    manifest = _manifest()
    missing = []
    for category in manifest["categories"]:
        slug, buckets = category["slug"], category["buckets"]
        rows = json.loads((OUT / "categories" / f"{slug}-000.json").read_text())
        for row in rows[:25]:
            cid = row["cluster_id"]
            shard = OUT / "clusters" / f"{shard_for(cid, slug, buckets)}.json"
            if not shard.exists():
                missing.append(f"{cid}: no {shard.name}")
            elif cid not in json.loads(shard.read_text()):
                missing.append(f"{cid}: absent from {shard.name}")
    assert not missing, missing[:5]


def test_no_shard_is_orphaned_by_a_changed_bucket_count():
    """Every file on disk must be one a current bucket count can still address."""
    manifest = _manifest()
    addressable = {
        f"{c['slug']}-{i:0{SHARD_DIGITS}d}.json"
        for c in manifest["categories"]
        for i in range(c["buckets"])
    }
    stale = {p.name for p in (OUT / "clusters").glob("*.json")} - addressable
    assert not stale, f"stale shards from an earlier capture: {sorted(stale)[:5]}"


def test_every_listing_page_the_manifest_promises_exists():
    manifest = _manifest()
    for category in manifest["categories"]:
        for page in range(category["pages"]):
            path = OUT / "categories" / f"{category['slug']}-{page:0{SHARD_DIGITS}d}.json"
            assert path.exists(), f"missing listing page {path.name}"
    for page in range(manifest["deals"]["pages"]):
        assert (OUT / f"deals-{page:0{SHARD_DIGITS}d}.json").exists()


def test_pagination_accounts_for_every_row():
    """The whole point of paginating instead of capping: nothing is dropped."""
    manifest = _manifest()
    for category in manifest["categories"]:
        rows = sum(
            len(json.loads(
                (OUT / "categories" / f"{category['slug']}-{p:0{SHARD_DIGITS}d}.json").read_text()))
            for p in range(category["pages"])
        )
        assert rows == category["count"], f"{category['slug']}: {rows} rows vs {category['count']}"
        assert category["pages"] == pages_for(category["count"], manifest["page_size"])

    deals = sum(
        len(json.loads((OUT / f"deals-{p:0{SHARD_DIGITS}d}.json").read_text()))
        for p in range(manifest["deals"]["pages"])
    )
    assert deals == manifest["deals"]["count"]


def test_the_capture_is_not_size_capped():
    """Regression guard on the original defect: the first capture kept only
    multi-store clusters and the top 400 deals."""
    manifest = _manifest()
    assert manifest["min_stores"] == 1
    assert manifest["total_clusters"] > manifest["multi_store_clusters"], \
        "single-store clusters are missing — the catalogue is being filtered again"
    # tvs/printers/digital-cameras have zero multi-store clusters; their presence
    # is exactly what the n_stores>=2 filter used to destroy.
    slugs = {c["slug"] for c in manifest["categories"]}
    assert {"tvs", "printers", "digital-cameras"} <= slugs
    assert manifest["deals"]["count"] > 400


def test_search_index_covers_every_category():
    manifest = _manifest()
    for category in manifest["categories"]:
        rows = json.loads((OUT / "search" / f"{category['slug']}.json").read_text())
        assert len(rows) == category["count"]


# ------------------------------------------------------------- dead products
# The catalogue ships single-store clusters, undated categories and low-value
# rows on purpose. What it must never ship is a product that cannot be bought:
# out of stock at every store, delisted, or last seen three months ago. Those
# render as an ordinary card with a real price and a dead click-through.

def test_no_captured_cluster_is_unbuyable():
    manifest = _manifest()
    for category in manifest["categories"]:
        for bucket in range(category["buckets"]):
            name = f"{category['slug']}-{bucket:0{SHARD_DIGITS}d}.json"
            path = OUT / "clusters" / name
            if not path.exists():
                continue
            for cluster_id, row in json.loads(path.read_text()).items():
                # Presence asserted first: `.get()` on an absent field returns
                # None, which would pass the check below without proving anything.
                assert "availability_basis" in row, f"{cluster_id} carries no availability"
                assert row["availability_basis"] not in {"out_of_stock", "delisted"}, \
                    f"{cluster_id} is unbuyable but shipped"


def test_no_captured_cluster_is_stale():
    """No stale row ships — and NO CATEGORY IS DROPPED to achieve that.

    ⚠️ This used to assert `"unknown" in seen_bases`, because six categories
    (tvs, printers, routers, wearables, desktop-computers, digital-cameras) were
    last clustered 2026-06-30 — before the freshness gate existed — so they dated
    nothing and shipped as `unknown`. Re-clustering them on 2026-07-26 stamped
    them properly and the `unknown` bucket went to zero, which broke the old
    assertion even though the data got strictly better.

    What that assertion was really protecting is kept below: an undated category
    must never be silently excluded (the n_stores>=2 mistake). That is now checked
    directly — every manifest category must actually ship rows — instead of via a
    proxy that a data fix invalidates.
    """
    manifest = _manifest()
    seen_bases = set()
    shipped_per_category = {}
    for category in manifest["categories"]:
        n = 0
        for bucket in range(category["buckets"]):
            path = OUT / "clusters" / f"{category['slug']}-{bucket:0{SHARD_DIGITS}d}.json"
            if not path.exists():
                continue
            for cluster_id, row in json.loads(path.read_text()).items():
                basis = row.get("freshness_basis")
                seen_bases.add(basis)
                n += 1
                assert basis != "stale", f"{cluster_id} is stale but shipped"
        shipped_per_category[category["slug"]] = n

    empty = [s for s, n in shipped_per_category.items() if n == 0]
    assert not empty, f"categories in the manifest but shipping no rows: {empty}"
    assert "fresh" in seen_bases


def test_every_captured_price_point_carries_a_real_timestamp():
    """⛔ The defect this pins: all 3,556 series once shipped with `"t": ""` on
    every point. The chart drew, the manifest counted them, the suite was green —
    the capture was reading a key (`date`) that neither source has ever written.
    """
    manifest = _manifest()
    checked = 0
    for category in manifest["categories"]:
        for bucket in range(category["buckets"]):
            path = OUT / "clusters" / f"{category['slug']}-{bucket:0{SHARD_DIGITS}d}.json"
            if not path.exists():
                continue
            for cluster_id, row in json.loads(path.read_text()).items():
                for point in row.get("price_history") or []:
                    assert point.get("t"), f"{cluster_id} has an undated price point"
                    assert point.get("price") is not None
                    checked += 1
    assert checked, "no price points read — the guard proved nothing"


def test_price_history_reaches_groceries():
    """Groceries are the largest category and had ZERO history until the raw
    store collections were read — their members are not in compiled_products."""
    manifest = _manifest()
    with_history = 0
    for bucket in range(next(c["buckets"] for c in manifest["categories"]
                             if c["slug"] == "groceries")):
        path = OUT / "clusters" / f"groceries-{bucket:0{SHARD_DIGITS}d}.json"
        if not path.exists():
            continue
        with_history += sum(1 for row in json.loads(path.read_text()).values()
                            if row.get("price_history"))
    assert with_history > 1000, f"groceries history collapsed to {with_history}"


def test_a_series_never_puts_two_prices_on_one_date():
    manifest = _manifest()
    for category in manifest["categories"]:
        path = OUT / "clusters" / f"{category['slug']}-000.json"
        if not path.exists():
            continue
        for cluster_id, row in json.loads(path.read_text()).items():
            series = row.get("price_history") or []
            stamps = [p["t"] for p in series]
            assert len(set(stamps)) == len(stamps), f"{cluster_id} has duplicate dates"


def test_the_manifest_reports_what_was_excluded_and_why():
    manifest = _manifest()
    for key in ("excluded_unpriced", "excluded_unbuyable", "excluded_stale"):
        assert key in manifest, f"{key} missing — an exclusion is happening invisibly"
    assert manifest["freshness"]["stale"] == 0
    assert manifest["freshness"]["fresh"] > 0


def test_no_captured_cluster_names_a_retailer_twice():
    """carrefour / carrefour.ke folded to one identity before the capture.

    Read from the DETAIL shards: `stores` and `best_by_store` are not in
    SUMMARY_FIELDS, so the listing pages would pass this vacuously.
    """
    from app.api.hygiene import STORE_ALIASES

    manifest = _manifest()
    checked = 0
    for category in manifest["categories"]:
        path = OUT / "clusters" / f"{category['slug']}-000.json"
        if not path.exists():
            continue
        for cluster_id, row in json.loads(path.read_text()).items():
            for store in (row.get("stores") or []):
                assert store not in STORE_ALIASES, f"{cluster_id}: {store} should have folded"
            for store in (row.get("best_by_store") or {}):
                assert store not in STORE_ALIASES, f"{cluster_id}: {store} should have folded"
            checked += 1
    assert checked, "no detail shards read — the guard proved nothing"

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

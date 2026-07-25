"""The head of every listing must be presentable.

Guards the ranking shipped in `4702a523`. Listings sort
`off_category > image > spread > stores > listings`, with `cluster_id` only as a
final tie-break, because two earlier orderings were measurably bad:

  - **no tie-break at all** — rows with no spread kept Mongo's *unguaranteed*
    scan order, so a re-capture silently reshuffled every page. This is why two
    reads of the same file disagreed and produced a wrong contamination report.
  - **cluster_id alone** — junk titles tend to start with a number, so page 1
    of headphones opened on "14 43" and "28 Holes Scarf".

Neither failure raises anything; both are visible only by looking, which is what
a test is for. Nothing here asserts a rendering — only that the data at the head
of a listing is complete enough to render at all.
"""
import json

import pytest

from scripts.capture_demo_dataset import OUT, SHARD_DIGITS

# The categories a browse surface leads with: COMPARISON_SLUGS plus tvs.
HEADLINE_SLUGS = ["mobile-phones", "laptops", "groceries", "tvs"]
HEAD = 10


def _manifest():
    path = OUT / "manifest.json"
    if not path.exists():
        pytest.skip("demo dataset not captured")
    return json.loads(path.read_text())


def _page(name: str):
    return json.loads((OUT / name).read_text())


def _presentable(row) -> bool:
    return bool(row.get("best_price")) and bool(row.get("image")) and not row.get("off_category")


@pytest.mark.parametrize("slug", HEADLINE_SLUGS)
def test_the_head_of_each_listing_is_presentable(slug):
    assert slug in {c["slug"] for c in _manifest()["categories"]}, f"{slug} missing from the capture"
    rows = _page(f"categories/{slug}-{0:0{SHARD_DIGITS}d}.json")
    bad = [r["cluster_id"] for r in rows[:HEAD] if not _presentable(r)]
    assert not bad, f"{slug}: unpresentable rows at the head of page 0: {bad}"


def test_the_head_of_the_deals_feed_is_presentable():
    rows = _page(f"deals-{0:0{SHARD_DIGITS}d}.json")
    bad = [r["cluster_id"] for r in rows[:HEAD] if not _presentable(r)]
    assert not bad, f"unpresentable deals at the head of page 0: {bad}"


def test_head_rows_carry_a_name_a_price_and_a_picture():
    for row in _page(f"deals-{0:0{SHARD_DIGITS}d}.json")[:HEAD]:
        assert row.get("display_name") or row.get("title"), row["cluster_id"]
        assert isinstance(row["best_price"], (int, float)) and row["best_price"] > 0
        assert str(row["image"]).startswith("http")


@pytest.mark.parametrize("slug", HEADLINE_SLUGS)
def test_demoted_rows_never_reach_the_first_page(slug):
    """off_category is the first sort key, so a flagged row may never appear
    before an unflagged one."""
    rows = _page(f"categories/{slug}-{0:0{SHARD_DIGITS}d}.json")
    assert not [r["cluster_id"] for r in rows if r.get("off_category")]


@pytest.mark.parametrize("slug", HEADLINE_SLUGS)
def test_the_sort_key_is_total_so_the_order_is_reproducible(slug):
    """Every page must already be in the documented order, and no two rows may
    tie on every component — otherwise their relative order is arbitrary and a
    re-capture can reshuffle them."""
    rows = _page(f"categories/{slug}-{0:0{SHARD_DIGITS}d}.json")
    keys = [
        (bool(r.get("off_category")), not r.get("image"),
         -(r.get("like_for_like_spread_pct") or 0), -(r.get("n_stores") or 0),
         -(r.get("n_listings") or 0), r.get("cluster_id") or "")
        for r in rows
    ]
    assert keys == sorted(keys), f"{slug}: page 0 is not in the documented sort order"
    assert len(set(keys)) == len(keys), f"{slug}: sort key is not total"

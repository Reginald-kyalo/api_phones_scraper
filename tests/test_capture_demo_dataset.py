"""Pure-function tests for the demo dataset capture.

The helpers encode measured facts about the corpus (2026-07-25):
  - groceries carry images inline on members[]; devices carry none there and
    resolve through compiled_products instead. Both paths are required.
  - cleanshelf listings usually have no image, and are unreliable when they do.
  - only 798 of 6,592 multi-store clusters (12.1%) have >=2 real price points.

The sizing helpers exist so the dataset is never truncated for size: pages and
shards absorb a bigger corpus instead of a cap dropping rows.
"""
import math

from scripts.capture_demo_dataset import (
    MAX_BUCKETS,
    MIN_BUCKETS,
    MIN_HISTORY_POINTS,
    MIN_STORES,
    PAGE_SIZE,
    SHARD_DIGITS,
    SHARD_TARGET_BYTES,
    build_history,
    buckets_for,
    fnv1a,
    pages_for,
    pick_image,
    shard_for,
)


# ------------------------------------------------- shard addressing
# demoSource.ts reimplements fnv1a/shard_for in TypeScript. If these values
# change, every committed detail shard is unreachable from the frontend.

def test_fnv1a_matches_known_vectors():
    assert fnv1a("") == 0x811C9DC5
    assert fnv1a("a") == 0xE40C292C
    assert fnv1a("foobar") == 0xBF9CF968


def test_shard_name_is_slug_prefixed_and_zero_padded():
    name = shard_for("groceries::aerosol+axe+excite", "groceries", 16)
    assert name.startswith("groceries-")
    assert len(name.split("-")[-1]) == SHARD_DIGITS


def test_padding_is_wide_enough_for_the_largest_bucket_count():
    """groceries needs ~110 buckets; a 2-digit suffix would collide 100 with 00."""
    assert len(str(MAX_BUCKETS)) == SHARD_DIGITS
    assert shard_for("groceries::x", "groceries", 999).split("-")[-1].isdigit()


def test_shard_is_deterministic():
    assert shard_for("laptops::hp::x", "laptops", 8) == shard_for("laptops::hp::x", "laptops", 8)


def test_shards_spread_across_buckets():
    names = {shard_for(f"groceries::item{i}", "groceries", 16) for i in range(400)}
    assert len(names) == 16


def test_bucket_count_changes_the_shard_a_cluster_lands_in():
    """Guards the manifest contract: the frontend MUST read the per-category
    bucket count, because the same id addresses a different file without it."""
    differ = [i for i in range(50)
              if shard_for(f"g::{i}", "g", 16) != shard_for(f"g::{i}", "g", 110)]
    assert differ, "bucket count must participate in shard addressing"


# ------------------------------------------------- sizing, not capping

def test_the_whole_catalogue_is_captured():
    """MIN_STORES=1. The first capture used 2 and silently dropped 59,814
    clusters plus three entire categories (tvs, printers, digital-cameras)."""
    assert MIN_STORES == 1


def test_pages_cover_every_row():
    for n in (0, 1, PAGE_SIZE - 1, PAGE_SIZE, PAGE_SIZE + 1, 33_692):
        assert pages_for(n) * PAGE_SIZE >= n


def test_an_empty_category_still_has_one_page():
    assert pages_for(0) == 1


def test_a_full_page_does_not_allocate_an_empty_extra():
    assert pages_for(PAGE_SIZE) == 1
    assert pages_for(PAGE_SIZE + 1) == 2


def test_buckets_keep_a_shard_near_the_target_size():
    total = 44_000_000                      # measured grocery detail bytes, near enough
    n = buckets_for(total)
    assert total / n <= SHARD_TARGET_BYTES


def test_tiny_categories_get_a_floor_not_one_giant_bucket():
    assert buckets_for(10) == MIN_BUCKETS
    assert buckets_for(0) == MIN_BUCKETS


def test_bucket_count_is_bounded_by_the_filename_width():
    assert buckets_for(10**12) == MAX_BUCKETS
    assert MAX_BUCKETS <= 10 ** SHARD_DIGITS - 1


def test_buckets_scale_with_size():
    assert buckets_for(SHARD_TARGET_BYTES * 100) == math.ceil(100)


# ---------------------------------------------------------------- images

def test_grocery_image_comes_from_members():
    cluster = {"cluster_id": "groceries::a", "members": [
        {"product_id": "p1", "site": "carrefour", "image": "https://cdn/a.jpg"},
    ]}
    assert pick_image(cluster, {}) == "https://cdn/a.jpg"


def test_cleanshelf_images_are_never_used():
    cluster = {"cluster_id": "groceries::b", "members": [
        {"product_id": "p1", "site": "cleanshelf", "image": "https://cdn/bad.jpg"},
        {"product_id": "p2", "site": "naivas", "image": "https://cdn/good.jpg"},
    ]}
    assert pick_image(cluster, {}) == "https://cdn/good.jpg"


def test_cleanshelf_only_cluster_yields_no_image():
    cluster = {"cluster_id": "groceries::c", "members": [
        {"product_id": "p1", "site": "cleanshelf", "image": "https://cdn/bad.jpg"},
    ]}
    assert pick_image(cluster, {}) is None


def test_device_image_comes_from_compiled_products():
    cluster = {"cluster_id": "laptops::d", "members": [
        {"product_id": "p9", "site": "jumia.co.ke"},
    ]}
    assert pick_image(cluster, {"p9": "https://cdn/laptop.jpg"}) == "https://cdn/laptop.jpg"


def test_non_http_values_are_rejected():
    cluster = {"cluster_id": "groceries::f", "members": [
        {"product_id": "p1", "site": "naivas", "image": "   "},
        {"product_id": "p2", "site": "naivas", "image": "data:image/png;base64,xxx"},
    ]}
    assert pick_image(cluster, {}) is None


def test_choice_is_random_but_stable_across_runs():
    cluster = {"cluster_id": "groceries::e", "members": [
        {"product_id": f"p{i}", "site": "naivas", "image": f"https://cdn/{i}.jpg"}
        for i in range(8)
    ]}
    assert len({pick_image(cluster, {}) for _ in range(25)}) == 1


def test_different_clusters_do_not_all_pick_the_same_index():
    picks = set()
    for c in range(30):
        cluster = {"cluster_id": f"groceries::{c}", "members": [
            {"product_id": f"p{i}", "site": "naivas", "image": f"https://cdn/{i}.jpg"}
            for i in range(8)
        ]}
        picks.add(pick_image(cluster, {}))
    assert len(picks) > 1


# --------------------------------------------------------------- history

def test_single_point_history_is_dropped():
    cluster = {"members": [{"product_id": "p1"}]}
    assert build_history(cluster, {"p1": [{"date": "2026-06-01", "price": 100}]}) is None


def test_two_points_are_kept_and_sorted():
    cluster = {"members": [{"product_id": "p1"}]}
    hist = {"p1": [{"date": "2026-06-08", "price": 90},
                   {"date": "2026-06-01", "price": 100}]}
    assert build_history(cluster, hist) == [
        {"t": "2026-06-01", "price": 100},
        {"t": "2026-06-08", "price": 90},
    ]


def test_longest_member_series_wins():
    cluster = {"members": [{"product_id": "short"}, {"product_id": "long"}]}
    hist = {
        "short": [{"date": "2026-06-01", "price": 10}, {"date": "2026-06-02", "price": 11}],
        "long": [{"date": "2026-06-01", "price": 20}, {"date": "2026-06-02", "price": 21},
                 {"date": "2026-06-03", "price": 22}],
    }
    assert len(build_history(cluster, hist)) == 3


def test_points_without_a_price_are_dropped():
    cluster = {"members": [{"product_id": "p1"}]}
    hist = {"p1": [{"date": "2026-06-01", "price": 100},
                   {"date": "2026-06-02", "price": None}]}
    assert build_history(cluster, hist) is None


def test_cluster_with_no_history_returns_none():
    assert build_history({"members": [{"product_id": "p1"}]}, {}) is None


def test_minimum_is_two_points():
    assert MIN_HISTORY_POINTS == 2

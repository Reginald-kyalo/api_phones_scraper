"""Pure-function tests for the demo dataset capture.

Both helpers encode measured facts about the corpus (2026-07-25):
  - groceries carry images inline on members[]; devices carry none there and
    resolve through compiled_products instead. Both paths are required.
  - cleanshelf listings usually have no image, and are unreliable when they do.
  - only 798 of 6,592 clusters (12.1%) have >=2 real price points.
"""
from scripts.capture_demo_dataset import (
    DETAIL_BUCKETS,
    MIN_HISTORY_POINTS,
    build_history,
    fnv1a,
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
    name = shard_for("groceries::aerosol+axe+excite", "groceries")
    assert name.startswith("groceries-")
    assert len(name.split("-")[-1]) == 2


def test_shard_is_deterministic():
    assert shard_for("laptops::hp::x", "laptops") == shard_for("laptops::hp::x", "laptops")


def test_shards_spread_across_buckets():
    names = {shard_for(f"groceries::item{i}", "groceries") for i in range(400)}
    assert len(names) == DETAIL_BUCKETS


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

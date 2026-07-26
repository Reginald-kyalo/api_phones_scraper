"""Pure-function tests for the demo dataset capture.

The helpers encode measured facts about the corpus (2026-07-25):
  - groceries carry images inline on members[]; devices carry none there and
    resolve through compiled_products instead. Both paths are required.
  - cleanshelf listings usually have no image, and are unreliable when they do.
  - only 798 of 6,592 multi-store clusters (12.1%) have >=2 real price points.

The sizing helpers exist so the dataset is never truncated for size: pages and
shards absorb a bigger corpus instead of a cap dropping rows.
"""
import json
import math
from pathlib import Path

import pytest

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
    normalise_series,
    pages_for,
    pick_image,
    raw_collection_for,
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


# ------------------------------------------------- history: the REAL shapes
# ⛔ WHY THESE EXIST. Every test above uses a `date` key. Production uses `at`
# (compiled_products) or `timestamp` (the raw store collections) and has never
# once written `date`. So the suite was green while all 3,556 captured series
# carried `"t": ""` on every point — the chart drew, the manifest counted them,
# and no timestamp survived. Fixtures invented in the shape of the code under
# test prove only that the code matches itself.

def test_compiled_products_shape_keeps_its_timestamps():
    """`compiled_products.price_history` — {"at": ..., "price": ...}."""
    cluster = {"members": [{"product_id": "p1"}]}
    hist = {"p1": [{"at": "2026-07-02T16:55:58+00:00", "price": 9297},
                   {"at": "2026-07-10T16:24:03+00:00", "price": 8499}]}
    series = build_history(cluster, hist)
    assert [p["t"] for p in series] == ["2026-07-02T16:55:58+00:00",
                                        "2026-07-10T16:24:03+00:00"]
    assert [p["price"] for p in series] == [9297, 8499]


def test_raw_store_shape_keeps_its_timestamps():
    """`<site>_products.prices` — {"timestamp": ..., "amount": ...}. The only
    source groceries have."""
    cluster = {"members": [{"product_id": "p1"}]}
    hist = {"p1": [{"timestamp": "2026-06-19T22:50:13+0300", "amount": 169},
                   {"timestamp": "2026-06-29T22:15:30+0300", "amount": 184}]}
    series = build_history(cluster, hist)
    assert [p["t"] for p in series] == ["2026-06-19T22:50:13+0300",
                                        "2026-06-29T22:15:30+0300"]
    assert [p["price"] for p in series] == [169, 184]


def test_no_point_ever_ships_an_empty_timestamp():
    """The exact defect: a series that renders but carries no dates."""
    cluster = {"members": [{"product_id": "p1"}]}
    hist = {"p1": [{"timestamp": "2026-06-19T22:50:13+0300", "amount": 169},
                   {"at": "2026-06-29T22:15:30+0300", "price": 184}]}
    for point in build_history(cluster, hist):
        assert point["t"], "a point shipped without a timestamp"


def test_two_prices_on_one_date_is_not_a_trend():
    """Real data re-records an old and a new price at the same instant."""
    cluster = {"members": [{"product_id": "p1"}]}
    hist = {"p1": [{"at": "2026-07-10T16:24:03+00:00", "price": 8499},
                   {"at": "2026-07-10T16:24:03+00:00", "price": 9297}]}
    assert build_history(cluster, hist) is None


def test_exact_duplicate_observations_collapse():
    cluster = {"members": [{"product_id": "p1"}]}
    hist = {"p1": [{"at": "2026-07-01", "price": 100},
                   {"at": "2026-07-01", "price": 100},
                   {"at": "2026-07-05", "price": 90}]}
    assert build_history(cluster, hist) == [{"t": "2026-07-01", "price": 100},
                                            {"t": "2026-07-05", "price": 90}]


# ------------------------------------------- raw collection name resolution

EXISTING = {"carrefour_products", "jumia_products", "naivas_products",
            "kilimall_products", "cleanshelf_products", "quickmart_products"}


@pytest.mark.parametrize("site,expected", [
    ("carrefour", "carrefour_products"),        # grocery clusters: bare name
    ("jumia.co.ke", "jumia_products"),          # device clusters: domain
    ("kilimall.com", "kilimall_products"),
    ("cleanshelf.online", "cleanshelf_products"),
    ("quickmart.co.ke", "quickmart_products"),  # the aliased form still resolves
    ("NAIVAS", "naivas_products"),
])
def test_store_names_resolve_to_their_raw_collection(site, expected):
    assert raw_collection_for(site, EXISTING) == expected


def test_a_store_with_no_raw_collection_is_skipped_not_guessed():
    """A miss must be None, not a constructed name that queries nothing and
    looks like "this store has no history"."""
    assert raw_collection_for("nosuchstore.co.ke", EXISTING) is None
    assert raw_collection_for("", EXISTING) is None
    assert raw_collection_for(None, EXISTING) is None


@pytest.fixture
def demo_dir() -> Path:
    """The captured dataset. Skips when it has not been generated yet."""
    out = Path(__file__).resolve().parents[1] / "dealsonline_ui_ux_mock" / "public" / "demo"
    if not (out / "manifest.json").exists():
        pytest.skip("demo dataset not captured; run scripts.capture_demo_dataset")
    return out


def test_detail_shards_carry_store_urls(demo_dir):
    """Detail views must use the full projection, not the summary one.

    `_cluster_view(doc)` defaults to full=False, which writes best_by_store as
    {store: price}. The page still renders — prices show, layout is fine — but
    every "Go to store" link loses its href, silently removing the click-through
    the comparison exists to provide. Proven red by reverting to full=False.
    """
    shards = sorted((demo_dir / "clusters").glob("*.json"))
    assert shards, "no detail shards captured"

    checked = 0
    for shard in shards[:12]:
        for cluster in json.loads(shard.read_text()).values():
            offers = cluster.get("best_by_store") or {}
            if not offers:
                continue
            for store, offer in offers.items():
                assert isinstance(offer, dict), (
                    f"{cluster['cluster_id']} store {store!r} is a bare price "
                    f"({offer!r}) — captured with the summary projection, so the "
                    f"store URL is gone"
                )
                assert str(offer.get("url", "")).startswith("http"), (
                    f"{cluster['cluster_id']} store {store!r} has no usable url"
                )
            checked += 1
            if checked >= 200:
                return
    assert checked, "no priced clusters found to check"


def test_spa_deeplink_restore_runs_before_modules():
    """The 404.html restore must be a classic inline script in index.html <head>.

    ES imports are hoisted, so anything placed in main.tsx runs AFTER routes.ts
    has already called createBrowserRouter — which snapshots location.pathname.
    Putting the restore there looks correct and silently sends every deep link to
    the homepage on any host without a rewrite rule (GitHub Pages). Proven red by
    moving the block into main.tsx.
    """
    root = Path(__file__).resolve().parents[1] / "dealsonline_ui_ux_mock"
    index = (root / "index.html").read_text()
    head = index.split("</head>")[0]

    assert "spa-redirect" in head, "deep-link restore is not in index.html <head>"
    assert 'type="module"' not in head.split("spa-redirect")[0].rsplit("<script", 1)[-1], (
        "the restore script is a module — it would run after the router is built"
    )
    assert "spa-redirect" not in (root / "src" / "main.tsx").read_text(), (
        "restore lives in main.tsx, where import hoisting makes it too late"
    )
    assert "spa-redirect" in (root / "public" / "404.html").read_text(), (
        "404.html no longer parks the requested URL"
    )

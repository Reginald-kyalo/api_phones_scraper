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
import os
import re
import tarfile
import time
from pathlib import Path

import pytest

from scripts import capture_demo_dataset as capture
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


# ------------------------------------------------------- placeholder images

def test_a_retailer_placeholder_svg_is_not_an_image():
    """A store's own "no photo" vector is worse than no image: the UI draws a
    neutral mark for a missing image, but a grey SVG from a retailer CDN reads as
    a product photo that failed to load. 846 clusters headlined one."""
    real = "https://cdn.example.com/product/12345.jpg"
    cluster = {"cluster_id": "c1", "members": [
        {"site": "carrefour",
         "image": "http://cdnprod.mafretailproxy.com//assets/images/Plus_1_cc73c93eda.svg"},
        {"site": "naivas", "image": real},
    ]}
    assert pick_image(cluster, {}) == real


def test_a_cluster_with_only_placeholders_has_no_image():
    cluster = {"cluster_id": "c1", "members": [
        {"site": "carrefour", "image": "http://x/assets/Plus_1_abc.svg"},
        {"site": "naivas", "image": "https://y/img/placeholder.png"},
        {"site": "eastmatt", "image": "https://z/no-image.png"},
    ]}
    assert pick_image(cluster, {}) is None


def test_a_real_raster_is_never_mistaken_for_a_placeholder():
    for url in ["https://cdn.x/p/nescafe-gold-200g.jpg",
                "https://cdn.x/media/catalog/svgomatic-blender.png",  # 'svg' mid-word
                "https://cdn.x/img/default-brand-bag.jpeg"]:          # 'default' but not an img token
        cluster = {"cluster_id": "c", "members": [{"site": "naivas", "image": url}]}
        assert pick_image(cluster, {}) == url, url


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
    """Detail views must carry the per-store URL.

    The original defect: `_cluster_view(doc)` defaulted to the LOSSY projection,
    writing best_by_store as {store: price}. The page still rendered — prices
    showed, layout was fine — but every "Go to store" link lost its href,
    silently removing the click-through the comparison exists to provide.

    The default has since been inverted (`summary=False`), so the quiet path is
    now the safe one and this guard should be hard to trip. It stays because the
    property it protects is the product's whole purpose, not the flag's spelling.
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


def test_detail_shards_carry_the_evidence_the_ui_asks_the_reader_to_judge(demo_dir):
    """Merged clusters must ship `mvp_merged_members`; spreads must ship their basis.

    Same shape as the store-URL defect above, and the reason it gets its own
    guard: both fields go missing SILENTLY. The comparison page keeps rendering,
    the percentage keeps showing and the merge notice keeps saying "grouped from
    3" — it just stops naming the three, and the report dialog quietly drops from
    a per-cluster verdict to one unattributed "wrong". The reports still arrive;
    they are simply no longer labels anyone can act on.

    A merge with no members list is the worse half: `mvp_merged_from` is identity
    keys, unshowable to a person, so there is no fallback to render.
    """
    shards = sorted((demo_dir / "clusters").glob("*.json"))
    assert shards, "no detail shards captured"

    merges = spreads = 0
    for shard in shards:
        for cluster in json.loads(shard.read_text()).values():
            if (cluster.get("mvp_n_merged") or 0) > 1:
                members = cluster.get("mvp_merged_members") or []
                assert len(members) == cluster["mvp_n_merged"], (
                    f"{cluster['cluster_id']} says it merged "
                    f"{cluster['mvp_n_merged']} clusters but names {len(members)}"
                )
                assert all(m.get("cluster_id") and m.get("title") for m in members), (
                    f"{cluster['cluster_id']} has a member with no id or no title — "
                    f"nothing to render, and nothing to report a verdict against"
                )
                merges += 1

            basis = cluster.get("spread_basis")
            if cluster.get("like_for_like_spread_pct") and basis:
                for end in ("cheapest", "dearest"):
                    offer = basis.get(end) or {}
                    assert offer.get("title"), (
                        f"{cluster['cluster_id']} spread_basis.{end} has no title — "
                        f"the two titles side by side are the only way a "
                        f"variant-merge is visible to the reader"
                    )
                    assert offer.get("price") is not None, (
                        f"{cluster['cluster_id']} spread_basis.{end} has no price"
                    )
                spreads += 1

    assert merges > 1000, f"only {merges} merged clusters found — expected ~4,000"
    assert spreads > 1000, f"only {spreads} spreads with a basis — expected ~4,500"


def test_packing_is_reproducible(tmp_path):
    """The same dataset must pack to the same bytes, whatever the clock says.

    This is the property the archive is worth having FOR. `public/demo/` is no
    longer tracked loose because a re-capture rewrote ~430 files and cost ~100 MB
    of permanent git history each time; the archive is ~15 MB. But git stores a
    whole new blob for any byte that differs, and gzip stamps the current time
    into its header while tar records mtimes and owners — so a naive pack differs
    on every run, and re-running the capture on unchanged data would still cost
    15 MB. Non-determinism would quietly give back most of the saving.

    Proven red by dropping `mtime=0` from the GzipFile: the two packs differ.
    """
    src = tmp_path / "demo"
    (src / "clusters").mkdir(parents=True)
    (src / "manifest.json").write_text('{"total_clusters": 2}')
    (src / "clusters" / "a-000.json").write_text('{"x": 1}')

    first = capture.pack_dataset(src, tmp_path / "one.tar.gz").read_bytes()

    # Touch every file with a different mtime and repack: the content is
    # identical, so the archive must be too.
    later = time.time() + 5000
    for path in src.rglob("*"):
        os.utime(path, (later, later))
    second = capture.pack_dataset(src, tmp_path / "two.tar.gz").read_bytes()

    assert first == second, "pack is not reproducible — every capture costs a new blob"

    # ⚠️ Checked as a HEADER FIELD, not by comparing two packs. gzip writes the
    # wall clock into bytes 4..8, and both packs above run inside the same second,
    # so equality alone cannot see this regression — it would only appear later,
    # as a mysterious 15 MB blob on a capture that changed nothing.
    assert first[4:8] == b"\x00\x00\x00\x00", "gzip stamped the current time"


def test_packing_round_trips_every_file(tmp_path):
    """Unpacking the archive must reproduce the tree exactly.

    The archive is now the only copy in git, so a lossy pack loses the dataset
    outright rather than degrading it.
    """
    src = tmp_path / "demo"
    (src / "clusters").mkdir(parents=True)
    written = {
        "manifest.json": '{"total_clusters": 1}',
        "clusters/a-000.json": '{"x": 1}',
        "search/groceries.json": '["milk"]',
    }
    for name, body in written.items():
        path = src / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(body)

    archive = capture.pack_dataset(src, tmp_path / "demo.tar.gz")
    out = tmp_path / "unpacked"
    out.mkdir()
    with tarfile.open(archive) as tar:
        tar.extractall(out)

    for name, body in written.items():
        assert (out / "demo" / name).read_text() == body, f"{name} did not survive"


def test_every_route_has_a_spa_redirect_rule():
    """public/_redirects must cover every top-level route in routes.ts.

    ⛔ There is no catch-all to fall back on. `/*` matches `/` itself, which trips
    Cloudflare's loop detector, so the old single line `/*  /index.html  200`
    parsed as ZERO valid rules — the file looked correct and did nothing. Rules
    are enumerated instead, which means adding a route to routes.ts and
    forgetting this file silently costs that route its clean 200.

    Verified in `wrangler pages dev`, which reproduces production: with the rules
    below every deep link is 200 with the path intact; without them it is a 404
    served through the bounce page.
    """
    root = Path(__file__).resolve().parents[1] / "dealsonline_ui_ux_mock"
    routes_src = (root / "src" / "app" / "routes.ts").read_text()
    rules = (root / "public" / "_redirects").read_text()

    covered = {
        line.split()[0].rstrip("*").rstrip("/")
        for line in rules.splitlines()
        if line.strip() and not line.startswith("#")
    }

    # `path: "browse/:productType"` -> "browse"; index/splat routes are not paths.
    declared = {
        m.group(1).split("/")[0]
        for m in re.finditer(r'path:\s*"([^"]+)"', routes_src)
        if m.group(1) not in ("/", "*")
    }
    assert declared, "no routes parsed from routes.ts — the regex has gone stale"

    missing = {p for p in declared if f"/{p}" not in covered}
    assert not missing, (
        f"routes with no _redirects rule: {sorted(missing)}. On Cloudflare these "
        f"deep-link to a 404 that bounces via 404.html instead of resolving 200."
    )


def test_spa_redirects_never_target_index_html():
    """The destination must be `/`, never `/index.html`.

    Pages strips `.html` and `index` from URLs. A wildcard rule aimed at
    /index.html is rejected as an infinite loop; a non-wildcard one is silently
    downgraded to a **308 redirect to `/`**, which drops the path — so a shared
    link to /prices/<id> opens the homepage. Both failures are quiet: the file
    parses, the deploy succeeds, and only the URL bar shows it.
    """
    rules = (
        Path(__file__).resolve().parents[1]
        / "dealsonline_ui_ux_mock" / "public" / "_redirects"
    ).read_text()
    for line in rules.splitlines():
        if line.strip() and not line.startswith("#"):
            assert "index.html" not in line, (
                f"rule targets index.html and will 308 away the path: {line!r}"
            )


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

"""Tests for the serving-layer hygiene rules.

Every fixture below is a REAL cluster from `product_clusters_mvp` (2026-07-25),
because each of these rules exists to fix something the frontend actually
reported and three of the four obvious fixes are measurably wrong.

The bar differs per rule and is stated at each block:
  - brand   : precision. Blanking a real brand is worse than showing "3.5mm".
  - title   : losslessness. The swap may never drop a token.
  - stores  : safety. Folding may never raise a price or merge two retailers.
  - freshness: undated must never be reported as stale (six categories are undated).
"""
from datetime import datetime, timedelta, timezone

import pytest

from app.api.hygiene import (
    STALE_AFTER_DAYS,
    availability,
    best_title,
    canonical_store,
    clean_brand,
    fold_by_store,
    fold_stores,
    freshness,
    is_stale,
    is_unbuyable,
    last_seen_at,
)

NOW = datetime(2026, 7, 25, tzinfo=timezone.utc)


def seen(days_ago: int) -> str:
    return (NOW - timedelta(days=days_ago)).isoformat()


def member(**kw) -> dict:
    base = {"site": "jumia.co.ke", "price": 100, "delisted": False,
            "stock_status": "in_stock", "last_seen": seen(10)}
    base.update(kw)
    return base


# ---------------------------------------------------------------- brand ----
# Real values measured in the brand slot of 330 shipped clusters.
MEASUREMENTS = [
    "3.5mm", "15inch", "14-inch", "18inch", "12inch", "16-inch", "13-inch",
    "12 inch", "15 inch", "6 inch", "15 inches", "11mm", "8gb", "3mm", "22cm",
    "8mm", "10km", "21g",              # length / size / capacity
    "3.1ch", "2.1ch", "5.1ch", "8ch", "4 channel", "8channel", "16 channels",
    "24channel",                       # audio configuration
    "6way", "4way", "2way", "2-pin",   # wiring
    "2pc", "2pcs", "2 pcs", "1 pair", "2pk",   # pack count
    "2 in", "3 in", "3-in-1", "5-in-1",        # "N in 1"
    "3d", "4d", "1000watts", "74x54x6",        # other specs
]

# ⛔ REGRESSION GUARD. Every one of these leads with a digit, and every one is a
# REAL brand in this corpus. The tempting rule ("a brand cannot start with a
# number") blanks all of them. `3m` is not in the corpus today but 3M is a real
# manufacturer, which is why `m` is excluded from the unit list.
REAL_BRANDS = ["sony", "dormans", "lg", "tcl", "jx", "oraimo", "vitron", "amtec",
               "hp", "apple", "samsung", "ailyons", "haision",
               "7up", "4th", "5tea", "4us", "3m", "888s", "666s", "3266b",
               "116 plus", "2fold", "6ups"]


@pytest.mark.parametrize("brand", MEASUREMENTS)
def test_measurements_are_not_brands(brand):
    assert clean_brand(brand) is None


@pytest.mark.parametrize("brand", REAL_BRANDS)
def test_real_brands_survive(brand):
    assert clean_brand(brand) == brand


def test_brand_passthrough_of_empty():
    assert clean_brand(None) is None
    assert clean_brand("") is None


# ---------------------------------------------------------------- title ----
def test_reordered_display_name_yields_the_real_listing_title():
    """The reported bug: the model identifier is torn apart and lower-cased."""
    doc = {
        "display_name": "Sony Ht 5.1ch Home Cinema With Wireless Rear Speakers S40r",
        "representative_title": "Sony 5.1ch Home Cinema with Wireless Rear Speakers | HT S40R",
    }
    assert best_title(doc) == doc["representative_title"]


def test_recased_display_name_yields_the_real_listing_title():
    doc = {"display_name": "Tcl Sound Q65h Bar", "representative_title": "Q65h TCL Sound Bar"}
    assert best_title(doc) == "Q65h TCL Sound Bar"


def test_display_name_wins_when_it_actually_differs():
    """display_name exists to strip store noise. When it removes tokens it must win."""
    doc = {
        "display_name": "Samsung Galaxy A55",
        "representative_title": "BRAND NEW Samsung Galaxy A55 256GB - FREE DELIVERY Nairobi",
    }
    assert best_title(doc) == "Samsung Galaxy A55"


def test_title_swap_is_lossless():
    """The swap may only fire when no token would be lost."""
    doc = {
        "display_name": "Sony Ht 5.1ch Home Cinema With Wireless Rear Speakers S40r",
        "representative_title": "Sony 5.1ch Home Cinema with Wireless Rear Speakers | HT S40R",
    }
    chosen = best_title(doc)
    tokens = lambda s: sorted(t for t in s.lower().replace("|", " ").split())
    assert tokens(chosen) == tokens(doc["display_name"])


def test_title_falls_back_when_display_name_missing():
    assert best_title({"canonical_name": "Apple iPhone 15"}) == "Apple iPhone 15"
    assert best_title({"representative_title": "raw listing"}) == "raw listing"


# --------------------------------------------------------------- stores ----
def test_the_five_measured_aliases_fold():
    for domain, bare in [("carrefour.ke", "carrefour"), ("quickmart.co.ke", "quickmart"),
                         ("greenspoon.co.ke", "greenspoon"), ("cleanshelf.online", "cleanshelf"),
                         ("naivas.online", "naivas")]:
        assert canonical_store(domain) == bare


def test_distinct_retailers_are_never_merged():
    """A generic TLD strip would be tempting and would collide future stores."""
    for site in ["jumia.co.ke", "jiji.co.ke", "kilimall.com", "masoko.com", "eastmatt",
                 "smartphonesplanet.co.ke", "smartphonestorekenya.com", "le.co.ke"]:
        assert canonical_store(site) == site


def test_fold_stores_dedupes_and_keeps_order():
    assert fold_stores(["carrefour", "jumia.co.ke", "carrefour.ke"]) == ["carrefour", "jumia.co.ke"]
    assert fold_stores(None) is None


def test_folding_never_raises_a_price():
    """No cluster names both identities today, but the map is data-driven."""
    cheaper = lambda o: (o or {}).get("price") or float("inf")
    folded = fold_by_store({"carrefour": {"price": 990}, "carrefour.ke": {"price": 2575}}, cheaper)
    assert folded == {"carrefour": {"price": 990}}
    folded = fold_by_store({"carrefour": {"price": 2575}, "carrefour.ke": {"price": 990}}, cheaper)
    assert folded == {"carrefour": {"price": 990}}


# ------------------------------------------------------------ freshness ----
def test_recent_cluster_is_fresh():
    doc = {"members": [member(last_seen=seen(10))]}
    assert freshness(doc, NOW) == "fresh"
    assert is_stale(doc, NOW) is False


def test_long_unseen_cluster_is_stale():
    doc = {"members": [member(last_seen=seen(120))]}
    assert freshness(doc, NOW) == "stale"
    assert is_stale(doc, NOW) is True


def test_freshest_member_decides():
    """One recently-verified listing keeps the cluster alive."""
    doc = {"members": [member(last_seen=seen(120)), member(last_seen=seen(9))]}
    assert freshness(doc, NOW) == "fresh"


def test_undated_is_unknown_and_never_stale():
    """⚠️ The whole of tvs/printers/routers/wearables/desktops/cameras is undated.
    Reporting them stale would delete six categories from the demo."""
    doc = {"members": [member(last_seen=None), {"site": "x", "price": 1}]}
    assert freshness(doc, NOW) == "unknown"
    assert is_stale(doc, NOW) is False


def test_unparseable_date_does_not_crash():
    doc = {"members": [member(last_seen="not a date")]}
    assert freshness(doc, NOW) == "unknown"


def test_last_seen_uses_the_real_corpus_offset_format():
    doc = {"members": [member(last_seen="2026-06-30T09:52:15+0300")]}
    assert last_seen_at(doc).year == 2026


def test_stale_boundary_is_inclusive_of_the_threshold():
    assert freshness({"members": [member(last_seen=seen(STALE_AFTER_DAYS))]}, NOW) == "fresh"
    assert freshness({"members": [member(last_seen=seen(STALE_AFTER_DAYS + 1))]}, NOW) == "stale"


# --------------------------------------------------------- availability ----
def test_all_out_of_stock_is_unbuyable():
    doc = {"members": [member(stock_status="out_of_stock")]}
    assert availability(doc) == "out_of_stock"
    assert is_unbuyable(doc) is True


def test_one_in_stock_member_makes_it_available():
    doc = {"members": [member(stock_status="out_of_stock"), member(stock_status="in_stock")]}
    assert availability(doc) == "available"
    assert is_unbuyable(doc) is False


def test_unknown_stock_status_fails_open():
    """The engine's B1 lesson: an unknown stock status stays eligible."""
    doc = {"members": [member(stock_status=None)]}
    assert availability(doc) == "available"


def test_all_delisted_is_delisted():
    doc = {"members": [member(delisted=True), member(delisted=True)]}
    assert availability(doc) == "delisted"
    assert is_unbuyable(doc) is True


def test_a_delisted_member_does_not_condemn_a_live_cluster():
    doc = {"members": [member(delisted=True), member(delisted=False)]}
    assert availability(doc) == "available"


def test_engine_stamp_is_the_fallback_when_there_are_no_members():
    assert availability({"members": [], "availability_basis": "delisted"}) == "delisted"
    assert availability({}) == "unknown"


# ------------------------------------------------ the projection uses it ----
# Rules that are correct but unwired are the failure mode `_cluster_view`
# already has a guard for (the `full=False` bug shipped a whole dataset with no
# store URLs and nothing looked wrong). These assert the wiring, not the rule.

def test_the_projection_blanks_a_measurement_brand():
    from app.api.routes.clusters import _cluster_view

    view = _cluster_view({"brand": "14-inch", "canonical_category_slug": "laptops"})
    assert view["brand"] is None


def test_the_projection_folds_duplicate_store_identities():
    from app.api.routes.clusters import _cluster_view

    view = _cluster_view({
        "stores": ["carrefour.ke", "naivas.online"],
        "cheapest_store": "carrefour.ke",
        "best_by_store": {"carrefour.ke": {"price": 990}},
        "canonical_category_slug": "groceries",
    }, full=True)
    assert view["stores"] == ["carrefour", "naivas"]
    assert view["cheapest_store"] == "carrefour"
    assert list(view["best_by_store"]) == ["carrefour"]


def test_the_projection_prefers_the_real_listing_title():
    from app.api.routes.clusters import _cluster_view

    view = _cluster_view({
        "display_name": "Sony Ht S20r Soundbar",
        "representative_title": "Sony HT S20R Soundbar",
        "canonical_category_slug": "audio-systems",
    })
    assert view["title"] == "Sony HT S20R Soundbar"


def test_the_projection_surfaces_availability_and_freshness():
    from app.api.routes.clusters import _cluster_view

    view = _cluster_view({"members": [member()], "canonical_category_slug": "groceries"})
    assert view["availability_basis"] == "available"
    assert view["freshness_basis"] == "fresh"
    assert view["last_seen"] is not None


def test_an_unbuyable_cluster_warns_the_consumer():
    """A real price at a store that has none of it is the case the UI must caveat."""
    from app.api.routes.clusters import _cluster_view

    view = _cluster_view({
        "members": [member(stock_status="out_of_stock")],
        "best_price": 4199, "canonical_category_slug": "audio-systems",
    })
    assert view["availability_basis"] == "out_of_stock"
    assert "not currently buyable" in view["data_warning"]


def test_buyability_outranks_the_refurb_caveat():
    """Both apply; the one that means "you cannot buy this at all" is shown."""
    from app.api.routes.clusters import _cluster_view

    view = _cluster_view({
        "members": [member(stock_status="out_of_stock")],
        "condition_basis": "likely_used", "canonical_category_slug": "laptops",
    })
    assert "not currently buyable" in view["data_warning"]


def test_a_healthy_cluster_still_has_no_warning():
    from app.api.routes.clusters import _cluster_view

    view = _cluster_view({
        "members": [member()], "best_price": 990, "condition_basis": "new",
        "canonical_category_slug": "groceries",
    })
    assert view["data_warning"] is None

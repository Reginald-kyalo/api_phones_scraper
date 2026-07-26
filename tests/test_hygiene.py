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


def test_html_entities_are_decoded_for_display():
    """3,020 clusters (4.91%) ship raw entities. A reader asked "is this title
    right?" would say no because of the mojibake, not because of a matching
    error — the label would be unusable."""
    from app.api.hygiene import clean_text

    assert clean_text("Brown&#8217;s Greek Yoghurt Honey Flavour &#8211; 250ml") == \
        "Brown’s Greek Yoghurt Honey Flavour – 250ml"
    assert clean_text("Nice&amp;Lovely Glycerine Lotion 600ml") == \
        "Nice&Lovely Glycerine Lotion 600ml"
    assert clean_text('Samsung 55&#8243; TV') == 'Samsung 55″ TV'
    assert clean_text("Cotton  Buds  200s") == "Cotton Buds 200s"


def test_decoding_leaves_clean_titles_untouched():
    from app.api.hygiene import clean_text

    for title in ["Sony HT S40R Soundbar", "Dormans Fine Instant Coffee 1.6Gx36"]:
        assert clean_text(title) == title
    assert clean_text(None) is None


def test_the_projection_decodes_every_title_surface():
    from app.api.routes.clusters import _cluster_view

    view = _cluster_view({
        "canonical_category_slug": "groceries",
        "display_name": "Too Good Raspberry Yoghurt &#8211; 450g",
        "representative_title": "Too Good Raspberry Yoghurt &#8211; 450g",
        "best_by_store": {"naivas": {"price": 90, "url": "https://n/x",
                                     "title": "Brown&#8217;s Yoghurt"}},
        "mvp_merged_members": [{"cluster_id": "groceries::a",
                                "title": "Daawat Green Label Spaghetti &#8211; 400g"}],
    })
    assert "&#" not in view["title"]
    assert "&#" not in view["display_name"]
    assert "&#" not in view["representative_title"]
    assert "&#" not in view["best_by_store"]["naivas"]["title"]
    assert "&#" not in view["mvp_merged_members"][0]["title"]


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
    })
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


def test_the_quiet_path_is_the_rich_one():
    """⚠️ Requested by the frontend after `full=False` shipped a whole dataset with
    no store URLs. Calling the projection with no flag must now yield the view a
    consumer can actually click through, not the lossy one."""
    from app.api.routes.clusters import _cluster_view

    doc = {"best_by_store": {"jumia.co.ke": {"price": 100, "url": "https://j/x",
                                             "title": "T"}},
           "canonical_category_slug": "laptops"}
    offer = _cluster_view(doc)["best_by_store"]["jumia.co.ke"]
    assert isinstance(offer, dict) and offer["url"] == "https://j/x"

    bare = _cluster_view(doc, summary=True)["best_by_store"]["jumia.co.ke"]
    assert bare == 100, "summary=True should still drop to a bare price"


def test_merged_from_is_published_so_an_absorbed_id_can_be_re_attached():
    """⛔ Frontend ASK. 6,039 engine cluster_ids are absorbed by merges; without
    this list a report or bookmark keyed on one has no way to find where it went."""
    from app.api.routes.clusters import _cluster_view

    view = _cluster_view({
        "cluster_id": "groceries::a", "mvp_n_merged": 3,
        "mvp_merged_from": ["groceries::a", "groceries::b", "groceries::c"],
        "canonical_category_slug": "groceries",
    })
    assert view["mvp_merged_from"] == ["groceries::a", "groceries::b", "groceries::c"]
    assert len(view["mvp_merged_from"]) == view["mvp_n_merged"]


# ---------------------------------------------------- spread provenance ----
# The headline saving is one number with no provenance. These pin that the two
# offers behind it are published, because that is what lets a reader CHECK it.

BROOKSIDE = {
    "canonical_category_slug": "groceries",
    "like_for_like_spread_pct": 2.4,
    "configs": [{
        "facet_label": "6x250ml", "spread_pct": 2.4, "n_stores": 2,
        "best_by_store": {
            "carrefour": {"price": 410.0, "url": "https://c/x",
                          "title": "Brookside UHT Flavour Strawberry 250mlx6"},
            "quickmart": {"price": 420.0, "url": "https://q/y",
                          "title": "Brookside Uht Flavour Chocolate 250Mlx6"},
        },
    }],
}


def test_the_spread_names_both_offers_it_compares():
    from app.api.hygiene import spread_basis

    basis = spread_basis(BROOKSIDE)
    assert basis["spread_pct"] == 2.4 and basis["facet_label"] == "6x250ml"
    assert basis["cheapest"]["store"] == "carrefour" and basis["cheapest"]["price"] == 410.0
    assert basis["dearest"]["store"] == "quickmart" and basis["dearest"]["price"] == 420.0


def test_the_spread_basis_quotes_both_store_titles():
    """⭐ The whole point. Quoting both titles is what makes the grocery
    variant-merge visible: strawberry priced against chocolate."""
    from app.api.hygiene import spread_basis

    basis = spread_basis(BROOKSIDE)
    assert "Strawberry" in basis["cheapest"]["title"]
    assert "Chocolate" in basis["dearest"]["title"]


def test_the_spread_basis_carries_click_through_urls():
    from app.api.hygiene import spread_basis

    basis = spread_basis(BROOKSIDE)
    assert basis["cheapest"]["url"] and basis["dearest"]["url"]


def test_spread_basis_is_the_config_that_owns_the_headline():
    """Identity with the headline, not a re-derivation — the published number and
    the published evidence must never disagree."""
    from app.api.hygiene import spread_basis

    doc = {**BROOKSIDE, "like_for_like_spread_pct": 40.0, "configs": [
        BROOKSIDE["configs"][0],
        {"facet_label": "12x250ml", "spread_pct": 40.0, "n_stores": 2,
         "best_by_store": {"a": {"price": 100.0, "title": "A"},
                           "b": {"price": 140.0, "title": "B"}}},
    ]}
    assert spread_basis(doc)["facet_label"] == "12x250ml"


def test_no_spread_no_basis():
    from app.api.hygiene import spread_basis

    assert spread_basis({"like_for_like_spread_pct": None, "configs": []}) is None
    # a single-store config cannot be a comparison
    assert spread_basis({"like_for_like_spread_pct": 5.0, "configs": [
        {"spread_pct": 5.0, "n_stores": 1,
         "best_by_store": {"a": {"price": 10.0}}}]}) is None


def test_the_projection_publishes_the_spread_basis():
    from app.api.routes.clusters import _cluster_view

    view = _cluster_view(BROOKSIDE)
    assert view["spread_basis"]["dearest"]["store"] == "quickmart"


def test_merged_members_are_nameable_not_just_keys():
    """⛔ `mvp_merged_from` is identity keys. Nothing can ask a human about
    'groceries::250mlx6+brookside+flavour+strawberry+uht'."""
    from app.api.routes.clusters import _cluster_view

    view = _cluster_view({
        "canonical_category_slug": "groceries", "mvp_n_merged": 2,
        "mvp_merged_from": ["groceries::a", "groceries::b"],
        "mvp_merged_members": [
            {"cluster_id": "groceries::a", "title": "Aquamist Frutz Orange 500ml"},
            {"cluster_id": "groceries::b", "title": "Aquamist Frutz Apple 500ml"},
        ],
    })
    members = view["mvp_merged_members"]
    assert [m["title"] for m in members] == ["Aquamist Frutz Orange 500ml",
                                             "Aquamist Frutz Apple 500ml"]
    # every rendered row carries the id it must report back
    assert all(m["cluster_id"] for m in members)
    assert len(members) == view["mvp_n_merged"]


def test_an_unmerged_cluster_reports_no_merge_provenance():
    from app.api.routes.clusters import _cluster_view

    assert _cluster_view({"canonical_category_slug": "laptops"})["mvp_merged_from"] is None


def test_a_healthy_cluster_still_has_no_warning():
    from app.api.routes.clusters import _cluster_view

    view = _cluster_view({
        "members": [member()], "best_price": 990, "condition_basis": "new",
        "canonical_category_slug": "groceries",
    })
    assert view["data_warning"] is None


# ------------------------------------------------------ category tree ------
# The API published 14 flat slugs with no way to nest them, while a 424-node
# hierarchy sat unread in taxonomy_db. These pin the join and, more importantly,
# the two places it legitimately returns nothing.

TAXONOMY = {
    "laptops": {"name": "Laptops", "parent_slug": "computers", "level": 2,
                "path_string": "Computing > Computers > Laptops",
                "full_path": ["Computing", "Computers", "Laptops"],
                "product_type": "computing"},
    "headphones": {"name": "Headphones", "parent_slug": "sound-vision", "level": 1,
                   "path_string": "Sound & Vision > Headphones",
                   "full_path": ["Sound & Vision", "Headphones"],
                   "product_type": "sound_vision"},
}


def test_a_slug_resolves_to_its_place_in_the_tree():
    from app.api.taxonomy import category_path

    node = category_path("laptops", TAXONOMY)
    assert node["path"] == ["Computing", "Computers", "Laptops"]
    assert node["parent_slug"] == "computers" and node["level"] == 2


def test_groceries_has_no_place_in_the_tree_and_that_is_correct():
    """⚠️ The LARGEST category is not a taxonomy node — FMCG came through its own
    pipeline. Navigation must not assume every category has a parent."""
    from app.api.taxonomy import category_path

    assert category_path("groceries", TAXONOMY) is None
    assert category_path(None, TAXONOMY) is None


def test_an_unknown_slug_returns_none_rather_than_guessing():
    from app.api.taxonomy import category_path

    assert category_path("vehicle-parts", TAXONOMY) is None


def test_a_missing_taxonomy_degrades_to_flat_not_to_an_error():
    """Navigation is an enhancement; a comparison page must never 500 because a
    lookup collection is absent."""
    from app.api.taxonomy import category_path

    assert category_path("laptops", {}) is None

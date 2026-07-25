"""Tests for the off-category gate.

Every case below is a REAL title from the corpus (2026-07-25). The gate exists
because `canonical_category_slug` is whatever the store's category page said —
the semantic categoriser has never been run — so jumia's headphone pages ship
power extensions and TV remotes as `headphones`.

The bar this gate must clear is precision, not recall: it demotes products in a
browse listing, so a false positive hides a real product. Two earlier attempts
failed that bar and are pinned here as regression tests:
  - rejecting by category PATH flagged 61.2% of headphones, nearly all genuine
  - flagging any accessory word flagged bundles ("Earbuds ... Power Bank")
"""
import pytest

from scripts.category_purity import JUDGED_SLUGS, is_off_category

# Real titles that ARE mis-categorised.
OFF_CATEGORY = [
    ("Power King Home Best 4way Power Extension With Long Cable", "headphones"),
    ("Apple iPhone 16 Case/cover Liquid Soft Anti-scratch Microfibre", "headphones"),
    ("Samsung Galaxy S23 Case/cover Liquid Soft Anti-scratch", "headphones"),
    ("Tcl Android Tv Mini-led Qled 4k Uhd Smart Tv Remote Control", "headphones"),
    ("Xiaomi Magnetic Power Bank", "mobile-phones"),
    ("Bluetooth Music Bulb E27 Led Remote Control Rgb Color", "audio-systems"),
    ("Cover Thin Sandstone Matte 2 Shockproof Full Protect Bumper", "wearables"),
    ("High Astra Tv Guard Voltage Stabilizer", "headphones"),
]

# Real titles that are CORRECTLY categorised and must survive. The first four are
# the bundle case: a genuine product whose title names a bundled accessory.
ON_CATEGORY = [
    ("Samsung Wireless F9 Earbuds Pods Power Bank Air Pro", "headphones"),
    ("Oraimo Wireless F9 Earbuds With Power Bank Air Pro", "headphones"),
    ("Oraimo Earbud F9 Superior Sound Tripod Selfie Stick Pro", "headphones"),
    ("Wireless Earbuds, Bluetooth Headphones, Lightweight Neckband", "headphones"),
    ("Samsung Galaxy Tab S9 Plus", "tablets"),
    ("Samsung Galaxy Watch5 Pro", "wearables"),
    ("LG 43 Inch 43un7106 Smart 4k Uhd Webos Tv", "tvs"),
    ("Nexo PS-12 INCH SINGLE SPEAKER 10000181063", "speakers"),
]


@pytest.mark.parametrize("title,slug", OFF_CATEGORY)
def test_accessories_are_flagged(title, slug):
    assert is_off_category(title, slug) is True


@pytest.mark.parametrize("title,slug", ON_CATEGORY)
def test_real_products_survive(title, slug):
    assert is_off_category(title, slug) is False


def test_a_bundled_accessory_word_does_not_flag_the_product():
    """The override that took device precision from ~14/20 to ~19/20."""
    assert is_off_category("Earbuds With Power Bank", "headphones") is False
    assert is_off_category("Power Bank", "headphones") is True


def test_groceries_are_never_judged():
    """⛔ Measured: a supermarket genuinely sells pouches, covers and cables.
    Flagging them was ~0/7 correct on inspection."""
    for title in ("Vim Lemon Fresh Pouch 500gm", "Teepee Plastic Coated Book Cover 5 Metres",
                  "Prestige Extension Cable - 5 Way", "Veda Pencil Pouch Pb07",
                  "Deekee Laptop Bag #22"):
        assert is_off_category(title, "groceries") is False
    assert "groceries" not in JUDGED_SLUGS


def test_unknown_categories_and_empty_titles_are_left_alone():
    assert is_off_category("Some Case/cover", "some-new-slug") is False
    assert is_off_category(None, "headphones") is False
    assert is_off_category("", "headphones") is False


def test_the_gate_does_not_fire_on_ordinary_titles():
    assert is_off_category("Sony 55 Inch 55x85j 4k Hdr Smart Android Google Tv", "tvs") is False
    assert is_off_category("HP Pavilion 15 Core i5", "laptops") is False


def test_every_judged_slug_has_product_nouns():
    """A judged slug with no own-nouns would flag its whole catalogue, since the
    override could never fire."""
    from scripts.category_purity import OWN_NOUNS
    assert JUDGED_SLUGS <= set(OWN_NOUNS), sorted(JUDGED_SLUGS - set(OWN_NOUNS))

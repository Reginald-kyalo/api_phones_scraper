"""Reachability and comparability of cluster categories.

Reachability != comparability. A slug missing from _SLUGS makes the whole
category return HTTP 400 from /deals and /search; COMPARISON_SLUGS is the
separate, stricter trust signal that drives `comparison_grade` in the UI.
"""
from app.api.routes.clusters import _SLUGS, COMPARISON_SLUGS

# Categories with >=2 multi-store clusters, measured 2026-07-25 against
# product_matching_db.product_clusters_mvp.
CATEGORIES_WITH_DATA = {
    "groceries",           # 4272
    "mobile-phones",       # 1208
    "laptops",             # 729
    "tablets",             # 141
    "audio-systems",       # 120
    "wearables",           # 59
    "headphones",          # 30
    "speakers",            # 19
    "monitors",            # 10
    "desktop-computers",   # 2
    "routers",             # 2
}

# Multi-store rate >= 12%: phones 23.0, tablets 16.7, laptops 14.7,
# groceries 12.7. The next category down is wearables at 4.0, so the
# boundary is a real gap in the data, not a round number.
HIGH_RATE_SLUGS = {"mobile-phones", "tablets", "laptops", "groceries"}


def test_every_category_with_data_is_reachable():
    assert CATEGORIES_WITH_DATA - _SLUGS == set()


def test_comparison_grade_stays_on_high_rate_categories_only():
    assert COMPARISON_SLUGS == HIGH_RATE_SLUGS

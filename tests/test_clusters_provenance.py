"""Demo-dataset provenance must survive the API projection.

The UI discloses automatic merges, so it needs to tell a merged cluster from an
engine-clean one. mvp_generated alone cannot do that: on product_clusters_mvp it
is True for all 4,272 grocery clusters, of which only 2,016 were actually merged
(mvp_n_merged > 1) and 2,256 are untouched pass-throughs.
"""
from app.api.routes.clusters import _cluster_view

BASE = {
    "cluster_id": "groceries::x",
    "canonical_category_slug": "groceries",
    "representative_title": "Test Product 1L",
    "n_stores": 2,
    "n_listings": 3,
    "best_price": 100,
    "members": [],
}


def test_merged_cluster_exposes_provenance():
    view = _cluster_view({
        **BASE,
        "mvp_generated": True,
        "mvp_n_merged": 3,
        "mvp_rule": "TF-IDF char_wb(3-5) cosine TOP-K(k=10) >= 0.82 over TITLES",
    })
    assert view["mvp_generated"] is True
    assert view["mvp_n_merged"] == 3
    assert view["mvp_rule"].startswith("TF-IDF")


def test_pass_through_cluster_is_distinguishable_from_a_merge():
    # mvp_generated but never merged — the UI must NOT warn on these.
    view = _cluster_view({**BASE, "mvp_generated": True, "mvp_n_merged": 1})
    assert view["mvp_generated"] is True
    assert view["mvp_n_merged"] == 1


def test_production_cluster_reports_no_provenance():
    # Docs from product_clusters carry no mvp_* keys at all.
    view = _cluster_view(BASE)
    assert view["mvp_generated"] is False
    assert view["mvp_n_merged"] is None
    assert view["mvp_rule"] is None

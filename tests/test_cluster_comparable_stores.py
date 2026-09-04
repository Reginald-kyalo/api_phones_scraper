"""How many shops a shopper can actually compare — not how many carry the thing.

⛔⛔ WHY THIS EXISTS. Every card on the storefront rendered `n_stores` as "N shops".
`n_stores` counts stores holding a LISTING. The comparison table renders `best_by_store`, which
holds stores with a USABLE, GATED price — the engine already excludes delisted, out-of-stock,
implausibly-priced and likely-used members from pricing a headline. The two are different
numbers and the gap is not small. Measured live 2026-08-21 over 100 clusters per surface:

    /clusters/deals        52% overstate, mean +4.0 shops   (Google Pixel 8: says 16, prices 2)
    /by-node/smartphone    99% overstate, mean +9.6 shops   (Galaxy S23 Ultra: says 20, prices 2)

On a price-comparison storefront "20 shops" is the entire promise, and the page delivers two.

⭐ THE COUNT MUST BE TAKEN AFTER CANONICALISATION, NOT BEFORE. `_by_store` folds
`carrefour` and `carrefour.ke` into one column via `fold_by_store`, so `len(best_by_store)` on
the raw doc can exceed the number of columns the page renders. Counting the raw map would
replace one wrong number with a second, quieter wrong number.

⭐ ADDITIVE, like `n_clusters_subtree` before it: `n_stores` keeps its meaning and its consumers,
and the honest figure sits alongside it. The client cannot derive this itself — the gating and
the folding both live server-side.

⚠️ NO `pytest.mark.asyncio` — this repo has no pytest-asyncio. `_cluster_view` is sync anyway.
"""
from app.api.routes.clusters import _cluster_view
from app.api.schemas.clusters import ClusterView


def _doc(**over):
    """A cluster doc shaped like the ones in product_clusters."""
    d = {
        "_id": "phones::samsung::galaxy-s23-ultra",
        "title": "Samsung Galaxy S23 Ultra",
        "n_listings": 24,
        "n_stores": 20,
        "stores": ["a.co.ke", "b.co.ke", "c.co.ke"],
        "best_price": 100.0,
        "cheapest_store": "a.co.ke",
        "best_by_store": {
            "a.co.ke": {"price": 100.0, "url": "u1", "title": "t1"},
            "b.co.ke": {"price": 120.0, "url": "u2", "title": "t2"},
        },
        "members": [],
    }
    d.update(over)
    return d


# --------------------------------------------------------------------- the count

def test_the_comparable_count_is_the_stores_that_can_PRICE_it():
    """⛔⛔ THE DEFECT. 20 stores carry it; two can price it. The card said 20."""
    v = _cluster_view(_doc(), summary=True)
    assert v["n_stores"] == 20, "unchanged — this still means 'carried by'"
    assert v["n_stores_priced"] == 2, "the number a shopper can actually compare"


def test_it_matches_the_columns_the_page_actually_renders():
    """The invariant that makes the number honest: it equals what `best_by_store` renders."""
    v = _cluster_view(_doc(), summary=True)
    assert v["n_stores_priced"] == len(v["best_by_store"])


def test_it_is_taken_AFTER_store_canonicalisation():
    """⛔ `carrefour` and `carrefour.ke` are ONE column on the page. Counting the raw map would
    publish 3 for a table that renders 2 — a second wrong number in place of the first."""
    v = _cluster_view(_doc(best_by_store={
        "carrefour": {"price": 100.0},
        "carrefour.ke": {"price": 90.0},
        "b.co.ke": {"price": 120.0},
    }), summary=True)
    assert len(v["best_by_store"]) == 2, "fold_by_store collapsed the duplicate retailer"
    assert v["n_stores_priced"] == 2, "the count followed the fold"


def test_a_cluster_nothing_can_price_reports_zero_not_its_listing_count():
    """⛔ Every member gated out is exactly when the old number lied hardest."""
    v = _cluster_view(_doc(best_by_store={}), summary=True)
    assert v["n_stores"] == 20
    assert v["n_stores_priced"] == 0


def test_a_missing_best_by_store_does_not_explode():
    v = _cluster_view(_doc(best_by_store=None), summary=True)
    assert v["n_stores_priced"] == 0


def test_the_DETAIL_projection_carries_it_too():
    """⛔ Summary and detail are two hand-written copies; a field added to one silently vanishes
    from the other, which is the defect `_browse_node_view` was consolidated to prevent."""
    v = _cluster_view(_doc(), summary=False)
    assert v["n_stores_priced"] == 2


# --------------------------------------------------------------------- the contract

def test_the_response_model_PUBLISHES_it():
    """⛔ A `response_model` FILTERS: a field the model omits vanishes with no error anywhere."""
    assert "n_stores_priced" in ClusterView.model_fields


def test_summary_and_detail_report_the_SAME_count():
    """⛔ The two projections shape `best_by_store` differently — summary maps site->price, detail
    maps site->{price,url,title,stock}. The COUNT must not depend on which one you asked for, or
    a card and the page it opens disagree about how many shops there are."""
    doc = _doc()
    assert _cluster_view(doc, summary=True)["n_stores_priced"] == \
           _cluster_view(doc, summary=False)["n_stores_priced"]

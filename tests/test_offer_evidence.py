"""Per-offer evidence: condition / likely_used / observed_at / stock_status / delisted /
facet_value ride on each detail offer, joined from the member row by url (else product_id).
Absent when no member matches -- never guessed. Member values arrive as strings in places."""
from app.api.routes.clusters import _cluster_view
from app.api.schemas.clusters import ClusterView


def _doc():
    return {
        "_id": "phones::x::y", "title": "X Y", "n_stores": 1, "stores": ["a.co.ke"],
        "best_price": 100.0, "cheapest_store": "a.co.ke",
        "best_by_store": {"a.co.ke": {"price": 100.0, "url": "u64", "title": "t"}},
        "configs": [
            {"facet_label": "64GB", "facet_value": 64, "storage_gb": 64, "best_price": 100.0,
             "best_by_store": {"a.co.ke": {"price": 100.0, "url": "u64", "title": "t"}}},
            {"facet_label": "i5", "facet_value": "Intel Core i5", "best_price": 150.0,
             "best_by_store": {"a.co.ke": {"price": 150.0, "url": "u128", "title": "t2"}}},
            {"facet_label": "?", "facet_value": 256, "storage_gb": 256, "best_price": 200.0,
             "best_by_store": {"a.co.ke": {"price": 200.0, "url": "nomatch", "title": "t3"}}},
        ],
        "members": [
            {"site": "a.co.ke", "url": "u64", "price": 100.0, "condition": "New",
             "likely_used": "False", "last_seen": "2026-10-20T10:00:00", "stock_status": "in_stock",
             "delisted": False},
            {"site": "a.co.ke", "url": "u128", "price": 150.0, "condition": "refurb",
             "likely_used": "True", "last_seen": "None", "stock_status": "None", "delisted": "True"},
        ],
    }


def test_each_config_offer_carries_its_own_facet_and_member_evidence():
    v = _cluster_view(_doc())
    a, b = (c["by_store"]["a.co.ke"] for c in v["configs"][:2])
    assert a["facet_value"] == "64" and b["facet_value"] == "Intel Core i5"
    assert a["condition"] == "new" and b["condition"] == "refurbished"
    assert a["observed_at"] == "2026-10-20T10:00:00" and b["observed_at"] is None
    assert a["likely_used"] is False and b["likely_used"] is True
    assert a["delisted"] is False and b["delisted"] is True


def test_stock_status_literal_None_is_null():
    v = _cluster_view(_doc())
    assert v["configs"][0]["by_store"]["a.co.ke"]["stock_status"] == "in_stock"
    assert v["configs"][1]["by_store"]["a.co.ke"]["stock_status"] is None


def test_unmatched_offer_has_no_evidence_fields():
    o = _cluster_view(_doc())["configs"][2]["by_store"]["a.co.ke"]
    for k in ("condition", "likely_used", "observed_at", "stock_status", "delisted"):
        assert k not in o
    assert o["facet_value"] == "256"  # the config's own fact, not a member guess


def test_top_level_offer_has_evidence_but_no_facet_value():
    o = _cluster_view(_doc())["best_by_store"]["a.co.ke"]
    assert o["condition"] == "new" and "facet_value" not in o


def test_unknown_condition_is_null_and_product_id_fallback():
    d = _doc()
    d["members"][0]["condition"] = "mint"
    d["members"][0]["product_id"] = "p1"
    d["best_by_store"]["a.co.ke"] = {"price": 100.0, "url": "changed", "title": "t", "product_id": "p1"}
    o = _cluster_view(d)["best_by_store"]["a.co.ke"]
    assert o["condition"] is None and o["observed_at"] == "2026-10-20T10:00:00"


def test_summary_unchanged_and_schema_passes_fields_through():
    assert _cluster_view(_doc(), summary=True)["best_by_store"] == {"a.co.ke": 100.0}
    dumped = ClusterView(**_cluster_view(_doc())).model_dump(exclude_unset=True)
    assert dumped["configs"][0]["by_store"]["a.co.ke"]["facet_value"] == "64"
    assert dumped["best_by_store"]["a.co.ke"]["condition"] == "new"


def test_missing_flags_are_null_not_false():
    d = _doc()
    del d["members"][0]["likely_used"]
    del d["members"][0]["delisted"]
    o = _cluster_view(d)["configs"][0]["by_store"]["a.co.ke"]
    assert o["likely_used"] is None and o["delisted"] is None
    d["members"][0]["delisted"] = None
    assert _cluster_view(d)["configs"][0]["by_store"]["a.co.ke"]["delisted"] is None

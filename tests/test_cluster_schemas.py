"""The response models must not silently drop fields.

⚠️ THE FAILURE THIS EXISTS FOR. A FastAPI `response_model` **filters** the
response. If `ClusterView` omits a field that `_cluster_view` returns, the
endpoint still computes it, FastAPI strips it, the consumer never sees it, and
**nothing raises anywhere** — not in the route, not in the tests, not in the
logs. Adding a field to the projection without adding it to the model is a
one-line change that ships a silently truncated API.

So the schema is only safe if something asserts it stays a superset of the
projection. That is this file.
"""
import json
from pathlib import Path

import pytest

from app.api.routes.clusters import _cluster_view
from app.api.schemas.clusters import (
    ClusterConfig,
    ClusterDealsResponse,
    ClusterSearchResponse,
    ClusterView,
    StoreOffer,
)

# A cluster doc exercising every branch of the projection: configs, two-tier
# pricing, spec facets, per-store offers and mvp provenance.
DOC = {
    "cluster_id": "mobile-phones::samsung::galaxy-a55",
    "display_name": "Samsung Galaxy A55",
    "representative_title": "New Samsung Galaxy A55 128 GB Awesome Navy",
    "canonical_name": "Samsung Galaxy A55 5G 128GB",
    "canonical_category_slug": "mobile-phones",
    "brand": "Samsung",
    "primary_facet": "storage",
    "spec_facets": {"ram": ["8GB"], "storage": ["128GB", "256GB"]},
    "n_listings": 7,
    "n_stores": 3,
    "stores": ["jumia.co.ke", "avechi.co.ke", "masoko.com"],
    "is_multi_store": True,
    "best_price": 42999,
    "cheapest_store": "jumia.co.ke",
    "condition_basis": "new",
    "n_confident": 5,
    "n_likely_used": 2,
    "likely_used_best_price": 33000,
    "n_used": 2,
    "used_best_price": 33000,
    "like_for_like_spread_pct": 12.4,
    "cross_store_spread_pct": 31.0,
    "mvp_generated": True,
    "mvp_rule": "topk",
    "mvp_n_merged": 2,
    "configs": [{
        "facet_label": "128GB", "facet_value": 128, "storage_gb": 128,
        "best_price": 42999, "cheapest_store": "jumia.co.ke", "n_stores": 3, "spread_pct": 12.4,
        "best_by_store": {"jumia.co.ke": {"price": 42999, "url": "https://x/y", "title": "A55"}},
    }],
    "best_by_store": {"jumia.co.ke": {"price": 42999, "url": "https://x/y", "title": "A55"}},
}


def test_the_model_covers_every_field_the_projection_returns():
    """The whole point. A missing field here is an invisible API truncation."""
    produced = set(_cluster_view(DOC))
    declared = set(ClusterView.model_fields)
    assert not produced - declared, \
        f"response_model would SILENTLY DROP: {sorted(produced - declared)}"


def test_the_config_model_covers_every_config_field():
    produced = set(_cluster_view(DOC)["configs"][0])
    assert not produced - set(ClusterConfig.model_fields), \
        f"config fields would be dropped: {sorted(produced - set(ClusterConfig.model_fields))}"


def test_the_model_declares_nothing_the_projection_never_produces():
    """A field in the schema but not in the projection documents an endpoint
    behaviour that does not exist — it shows up in /docs and always reads null."""
    extra = set(ClusterView.model_fields) - set(_cluster_view(DOC))
    assert not extra, f"schema promises fields the API never returns: {sorted(extra)}"


def test_a_real_projection_validates_unchanged():
    """Round-trip: validating must not alter a single value."""
    view = _cluster_view(DOC)
    dumped = ClusterView.model_validate(view).model_dump()
    differing = {k: (view[k], dumped[k]) for k in view
                 if k not in ("configs", "best_by_store") and dumped[k] != view[k]}
    assert not differing, f"validation changed values: {differing}"


def test_summary_mode_keeps_bare_prices_and_detail_mode_keeps_urls():
    """`by_store` is a price in summary views and an object in detail views. The
    union type must accept BOTH — a stricter model would erase click-through."""
    summary = ClusterView.model_validate(_cluster_view(DOC, summary=True))
    assert summary.best_by_store["jumia.co.ke"] == 42999

    detail = ClusterView.model_validate(_cluster_view(DOC))
    offer = detail.best_by_store["jumia.co.ke"]
    assert isinstance(offer, StoreOffer) and offer.url == "https://x/y"


def test_condition_basis_is_constrained_to_the_two_real_values():
    with pytest.raises(Exception):
        ClusterView.model_validate({**_cluster_view(DOC), "condition_basis": "refurbished"})


def test_a_grocery_cluster_with_no_brand_or_canonical_name_validates():
    """Optionality is descriptive: FMCG has no PriceRunner equivalent, so these
    are genuinely None across the whole grocery corpus."""
    doc = {"cluster_id": "groceries::x", "display_name": "Borges Olive Oil 1L",
           "canonical_category_slug": "groceries", "n_stores": 3, "best_price": 990}
    view = ClusterView.model_validate(_cluster_view(doc))
    assert view.brand is None and view.canonical_name is None
    assert view.comparison_grade is True


def test_the_envelope_models_wrap_the_view():
    view = _cluster_view(DOC)
    assert ClusterSearchResponse.model_validate(
        {"query": "a55", "count": 1, "results": [view]}).results[0].cluster_id == DOC["cluster_id"]
    assert ClusterDealsResponse.model_validate({"count": 1, "results": [view]}).count == 1


def test_the_endpoints_actually_declare_the_models():
    """Schemas that exist but are not attached document nothing."""
    source = Path("app/api/routes/clusters.py").read_text()
    for decorator, model in (
        ('@router.get("/search"', "ClusterSearchResponse"),
        ('@router.get("/deals"', "ClusterDealsResponse"),
        ('@router.get("/{cluster_id:path}"', "ClusterView"),
    ):
        line = next(l for l in source.splitlines() if l.startswith(decorator))
        assert f"response_model={model}" in line, f"{decorator} is missing response_model={model}"


def test_every_field_a_consumer_could_misread_carries_a_description():
    """The models exist to publish MEANING. These are the fields where guessing
    wrong produces a wrong price on someone's screen."""
    must_document = [
        "condition_basis", "likely_used_best_price", "like_for_like_spread_pct",
        "cross_store_spread_pct", "data_warning", "comparison_grade", "mvp_n_merged",
        "is_multi_store", "best_price",
    ]
    undocumented = [f for f in must_document
                    if not (ClusterView.model_fields[f].description or "").strip()]
    assert not undocumented, f"load-bearing fields with no description: {undocumented}"


def test_the_openapi_schema_can_be_generated():
    """A model that cannot serialise to OpenAPI breaks /docs for the whole app."""
    schema = ClusterView.model_json_schema()
    assert "properties" in schema and "best_price" in schema["properties"]
    json.dumps(schema)

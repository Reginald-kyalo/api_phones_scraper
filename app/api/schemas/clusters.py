"""Response schemas for the cross-store comparison API.

These exist to make the contract *readable* — the endpoints publish twenty-odd
fields whose meaning is load-bearing (which price is a retail headline, which is
a refurb asking price, which spread is honest) and until now that meaning lived
only in comments inside `_cluster_view`. Attaching these as `response_model`
puts every one of them in the OpenAPI schema at /docs, where a consumer can
actually find it.

⚠️ A `response_model` FILTERS the response. Any field the model omits silently
disappears from the API — the endpoint keeps returning it, FastAPI strips it,
and no error is raised anywhere. That makes these classes a place where a real
outage can hide, so `tests/test_cluster_schemas.py` asserts the model covers
every key `_cluster_view` actually produces.

Optionality here is descriptive, not aspirational: the corpus genuinely has
grocery clusters with no `brand` and no `canonical_name` (there is no
PriceRunner equivalent for FMCG), so those are `None`, not absent.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class StoreOffer(BaseModel):
    """One store's cheapest offer. Detail views only — summaries carry a bare price."""

    price: float | None = None
    url: str | None = Field(None, description="click-through to the store's product page")
    title: str | None = Field(None, description="the listing title as that store wrote it")


class ClusterConfig(BaseModel):
    """One feature variant, split on the category's PRIMARY facet (storage for
    phones/tablets, CPU for laptops). Prices are compared WITHIN a config, never
    across — a 128GB phone is not a cheaper version of the 256GB one."""

    model_config = ConfigDict(populate_by_name=True)

    facet_label: str | None = Field(None, description='chip text, e.g. "256GB" or "Intel Core i5"')
    facet_value: object | None = Field(None, description="raw facet value behind the label")
    storage_gb: int | None = Field(None, description="deprecated; kept for back-compat")
    best_price: float | None = None
    cheapest_store: str | None = None
    n_stores: int | None = None
    spread_pct: float | None = Field(None, description="(max - min) / min * 100 within this config")
    by_store: dict[str, StoreOffer | float | None] = Field(
        default_factory=dict,
        description="{site: price} in summary views, {site: {price,url,title}} in detail views",
    )


class SpreadOffer(BaseModel):
    """One end of the headline saving."""

    store: str | None = None
    price: float | None = None
    title: str | None = Field(None, description="the listing title as that store wrote it")
    url: str | None = None


class SpreadBasis(BaseModel):
    """The two offers `like_for_like_spread_pct` is computed from.

    Published so a consumer can SHOW the saving instead of asserting it — and so a
    reader can check it. Quoting both store titles is also the only way the known
    grocery variant-merge defect becomes visible on a page: the MVP merge unions
    FMCG flavours into one config, so the "like-for-like" pair can be strawberry at
    one shop against chocolate at the other.
    """

    facet_label: str | None = Field(None, description="the configuration both offers share")
    spread_pct: float | None = None
    cheapest: SpreadOffer | None = None
    dearest: SpreadOffer | None = None


class MergedCluster(BaseModel):
    """One engine cluster absorbed into this row, named so it can be shown."""

    cluster_id: str | None = None
    title: str | None = Field(None, description="human-readable name; mvp_merged_from is keys")


class ClusterView(BaseModel):
    """One product, compared across the stores that carry it."""

    cluster_id: str | None = None

    # ---- naming ---------------------------------------------------------
    title: str | None = Field(
        None,
        description="display_name, else canonical_name, else the raw listing title",
    )
    display_name: str | None = Field(None, description="cleaned brand + model, features stripped")
    representative_title: str | None = Field(None, description="a real listing title, verbatim")
    brand: str | None = None
    canonical_name: str | None = Field(
        None, description='the PriceRunner name when matched — the "verified as" reference'
    )

    # ---- category -------------------------------------------------------
    category: str | None = Field(None, description="canonical category slug")
    comparison_grade: bool = Field(
        False,
        description=(
            "false for accessories (headphones/monitors): reachable and searchable, but only "
            "~0.4-3% of their clusters are multi-store, so a price comparison is not reliable"
        ),
    )
    primary_facet: str | None = Field(None, description="which feature the prices are split on")
    spec_facets: dict[str, list[str]] = Field(
        default_factory=dict,
        description='secondary variants for chips/filters, e.g. {"ram": ["8GB", "16GB"]}',
    )

    # ---- coverage -------------------------------------------------------
    n_listings: int | None = None
    n_stores: int | None = None
    stores: list[str] | None = None
    is_multi_store: bool | None = Field(
        None, description="false ⇒ a real product page, but nothing to compare against"
    )

    # ---- price ----------------------------------------------------------
    # Two tiers, deliberately separate: a refurb asking price must never be
    # presented as the new-retail headline.
    best_price: float | None = Field(None, description="cheapest CONFIDENT new-retail price")
    cheapest_store: str | None = None
    condition_basis: Literal["new", "likely_used"] = Field(
        "new",
        description=(
            '"likely_used" ⇒ the cluster has no confident retail member, so even the headline '
            "is a classifieds/refurb asking price. See data_warning."
        ),
    )
    n_confident: int | None = None
    n_likely_used: int | None = None
    likely_used_best_price: float | None = Field(
        None, description="cheapest classifieds/refurb asking price; never headlines"
    )
    n_used: int | None = Field(None, description="DEPRECATED alias of n_likely_used")
    used_best_price: float | None = Field(
        None, description="DEPRECATED alias of likely_used_best_price"
    )

    # ---- spread ---------------------------------------------------------
    like_for_like_spread_pct: float | None = Field(
        None,
        description=(
            "⚠️ A MARKUP, not a saving: (max - min) / MIN * 100 within one "
            "configuration — the dearest store as a premium over the cheapest. "
            "100% means the dearest charges twice the cheapest. 139 clusters "
            "publish more than 100%, which is impossible as a saving. Do not show "
            "this to a shopper; use saving_pct."
        ),
    )
    saving_pct: float | None = Field(
        None,
        description=(
            "what a shopper actually keeps by buying at the cheapest store: "
            "(max - min) / MAX * 100. Always < 100. This is the number to render "
            "as a discount badge."
        ),
    )
    spread_basis: SpreadBasis | None = Field(
        None,
        description=(
            "the two offers behind like_for_like_spread_pct, with both store titles. "
            "None when no configuration has two priced stores."
        ),
    )
    cross_store_spread_pct: float | None = Field(
        None, description="conflates configurations — do not headline this one"
    )

    configs: list[ClusterConfig] = Field(default_factory=list)
    best_by_store: dict[str, StoreOffer | float | None] = Field(default_factory=dict)

    # ---- trust ----------------------------------------------------------
    availability_basis: Literal["available", "out_of_stock", "delisted", "unknown"] = Field(
        "unknown",
        description=(
            '"out_of_stock" ⇒ every store carrying it is out of stock; "delisted" ⇒ the '
            'listings are gone from the stores\' sites. Both mean the price is real but not '
            'buyable. "unknown" ⇒ the source carries no stock field, not that it is in stock.'
        ),
    )
    freshness_basis: Literal["fresh", "stale", "unknown"] = Field(
        "unknown",
        description=(
            '"stale" ⇒ nothing in this cluster has been seen for over 60 days, so the price '
            'is historical. "unknown" ⇒ the source dates nothing (tvs, printers, routers, '
            "wearables, desktop-computers, digital-cameras) — it is NOT a staleness claim."
        ),
    )
    last_seen: str | None = Field(
        None,
        description="ISO timestamp of the most recently verified listing in the cluster",
    )
    data_warning: str | None = Field(
        None,
        description=(
            "set when the headline should not be trusted at face value: nothing buyable "
            "(out of stock / delisted), a likely-used fallback, an implausibly low price "
            "(per-category floor), or an outlier spread"
        ),
    )

    # ---- demo-dataset provenance ---------------------------------------
    # Present only when serving product_clusters_mvp; None/False on production
    # clusters, so a consumer's disclosure disappears by itself.
    mvp_generated: bool = False
    mvp_rule: str | None = Field(None, description="the merge rule that produced this cluster")
    mvp_n_merged: int | None = Field(
        None,
        description=(
            "clusters merged into this one. >1 is the ONLY value implying merge risk — "
            "mvp_generated is true for pass-throughs that were never merged."
        ),
    )
    mvp_merged_from: list[str] | None = Field(
        None,
        description=(
            "the engine cluster_ids this row absorbed, including its own. Use it to "
            "re-attach anything keyed on an absorbed id — a reader report, a stored "
            "bookmark — after a rebuild makes that id stop existing. Includes the "
            "surviving id, so `len(...) == mvp_n_merged`. Keys, not names — to show "
            "these to a person use mvp_merged_members."
        ),
    )
    mvp_merged_members: list[MergedCluster] | None = Field(
        None,
        description=(
            "the same absorbed clusters with human-readable titles. This is what to "
            'render when asking "do these belong together?" — one tickable row per '
            "entry, each carrying the cluster_id to report back."
        ),
    )


class ClusterSearchResponse(BaseModel):
    query: str
    count: int = Field(description="rows returned, which is bounded by `limit`")
    results: list[ClusterView]


class ClusterDealsResponse(BaseModel):
    count: int = Field(description="rows returned, which is bounded by `limit`")
    results: list[ClusterView]

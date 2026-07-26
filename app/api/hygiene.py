"""Serving-layer hygiene for cluster documents — pure, measured, no rebuilds.

WHY THIS EXISTS. Four defects the frontend reported (`docs/backend-data-issues.md`
#5, #6 and the UI's store-identity ask) all originate in the matching engine's
keyer, and the keyer is under the review freeze: no parser/keyer/clusterer change
and no cluster rebuild until the manual review completes. So these are fixed where
`category_purity.is_off_category` is fixed — in the projection, never in the data.
Nothing here rewrites Mongo.

Each rule below is followed by what it was MEASURED against on 2026-07-25 over the
62,668 shipped clusters of `product_clusters_mvp`, because three of the four
obvious fixes are wrong in a way that only measurement shows.
"""
from __future__ import annotations

import html
import re
from datetime import datetime, timezone

# --------------------------------------------------------------------------
# 1. Brand slot holds size/spec tokens  (backend-data-issues #5)
# --------------------------------------------------------------------------
# The keyer takes the leading token of a title as the brand, so "14-Inch Laptop
# Pouch WB11" keys as brand `14-inch`. The report cited one laptop cluster; the
# family is far wider. Measured over the 62,668 shipped clusters, this rule blanks
# 330 of them (78 distinct values), in these shapes:
#
#   length/size   3.5mm(14) 12 inch(11) 15 inch(9) 15inch(7) 14-inch(7) 6 inch(7)
#                 18inch(6) 12inch(5) 10 inch(5) 16-inch(4) 8 inch(4) 15 inches(4)
#                 11mm 3mm 8mm 22cm 13-inch 15-inch 10km
#   audio config  3.1ch(18) 4 channel(13) 2.1ch(12) 16 channel(8) 8 channel(8)
#                 5.1ch(8) 8channel(6) 8ch(3) 24channel(3)
#   wiring        6way(17) 4way(5) 2way(4) 5way(3) 3way 2-pin
#   pack count    2pc(4) 2pcs(4) 2 pcs(4) 4pc(2) 1 pc(2) 6pc 2pk 1 pair
#   "N in 1"      2 in(7) 3 in(6) 3-in-1(5) 7 in(4) 5-in-1(3) 5 in
#   other spec    21g(4) 74x54x6(4) 1000watts(3) 8gb 3d(2) 4d(2)
#
# ⛔ THE OBVIOUS RULE OVER-REACHES, AND THE CORPUS PROVES IT. "Brand starts with a
# digit ⇒ not a brand" would blank real ones: `7up` (7Up 330Ml), `4th` (4th Street
# Sweet Red 5L), `5tea` (5Tea Ginger Tea Leaves), `4us` (4US Tetra Fino UHT). It
# would also blank model numbers that are at least *specific* — 888s, 666s, 3266b,
# 116 plus — where showing the token beats showing nothing.
#
# ⚠️ `m` for metres is deliberately EXCLUDED from the unit list even though the
# corpus has `30m` and `60m` cable lengths, because `3M` is a real brand. Two
# cluster eyebrows reading "30M" is the accepted cost of never blanking 3M. Same
# doctrine as the off-category gate: any doubt resolves in favour of the product.
#
# Deliberately NOT an allow-list of known brands. The corpus is long-tail Kenyan
# and Chinese (JX, Oraimo, Vitron, Amtec, Ailyons, Haision); a curated list would
# blank far more real brands than it would ever fix.
_UNIT = (
    r'inches|inch|in|"|mm|cm|km|kg|g|ml|l|gb|tb|mb|ghz|mhz|hz|mah|wh|watts|watt|w|v'
    r"|oz|ohms|ohm|k|channels|channel|ch|way|pin|pcs|pc|pk|pack|pair|ply|d"
)
_MEASUREMENT = re.compile(rf"^\d+(?:\.\d+)?\s*-?\s*(?:{_UNIT})$", re.I)
_BARE_NUMBER = re.compile(r"^\d+(?:\.\d+)?$")
# "3-in-1", "5 in 1" — a configuration count, never a brand.
_N_IN_N = re.compile(r"^\d+\s*-?\s*in\s*-?\s*\d+$", re.I)
# "74x54x6" — raw dimensions that leaked in as the leading token.
_DIMENSIONS = re.compile(r"^\d+(?:\.\d+)?(?:\s*[x*]\s*\d+(?:\.\d+)?)+$", re.I)


def clean_brand(brand: str | None) -> str | None:
    """The brand, or None when the slot actually holds a measurement.

    None rather than a guess: the UI already renders a missing brand as no
    eyebrow at all, which is honest. Inventing "Apple" from "MacBook" here would
    be a second guess layered on the keyer's first one.
    """
    if not brand:
        return None
    token = brand.strip()
    if (_MEASUREMENT.match(token) or _BARE_NUMBER.match(token)
            or _N_IN_N.match(token) or _DIMENSIONS.match(token)):
        return None
    return brand


# --------------------------------------------------------------------------
# 2. display_name reorders and re-cases model tokens  (backend-data-issues #6)
# --------------------------------------------------------------------------
# `display_name` is title-cased FROM THE NORMALISED IDENTITY KEY, so it loses
# both the token order and the casing of every real listing:
#
#   representative_title  'Sony 5.1ch Home Cinema with Wireless Rear Speakers | HT S40R'
#   display_name          'Sony Ht 5.1ch Home Cinema With Wireless Rear Speakers S40r'
#
# The model identifier "HT S40R" is torn in half and lower-cased. Measured: 1,463
# clusters (2.3%) where display_name is a pure permutation of every member title.
#
# ⛔ THE REPORTED FIX IS WRONG. #6 asks display_name to "follow the majority token
# order of member titles". Member tokens as the keyer stores them are folded and
# lower-case, so rebuilding from them yields "ht s20r sony" — worse than the bug.
# The information wanted is already in `representative_title`, which is a real
# listing verbatim, correctly cased.
#
# The rule is therefore conservative to the point of being provably lossless:
# swap ONLY when the two are the same bag of tokens, so display_name is adding
# nothing that would be lost. When display_name genuinely differs (it stripped
# store noise or feature junk, which is what it is for) it still wins.


# --------------------------------------------------------------------------
# 2b. Titles ship raw HTML entities
# --------------------------------------------------------------------------
# Scraped straight from store markup and never decoded, so 3,020 clusters (4.91%)
# render mojibake: "Brown&#8217;s Greek Yoghurt Honey Flavour &#8211; 250ml".
# Measured entity counts: #8211 en-dash 2,541 | #8243 inch-mark 402 | amp 245 |
# #8217 apostrophe 177 | #8221 60 | #215 multiply 28 | #038 9 | quot 4 | nbsp 2.
#
# ⚠️ NOT the same as the `html_entity` finding on the MATCHING side, which records
# that `html.unescape` merges zero additional clusters and is the wrong fix for
# recall. That is about keying; this is about what a human reads. Decoding for
# display is unambiguously right and changes no key — nothing here touches Mongo.
#
# It also matters for feedback quality: a reader asked "is this title right?" would
# say no because of the mojibake rather than because the matching is wrong, and the
# label would be unusable.


def clean_text(text: str | None) -> str | None:
    """Decode HTML entities and collapse whitespace, for display only."""
    if not text:
        return text
    return " ".join(html.unescape(str(text)).split()) or None


def _tokens(text: str | None) -> list[str]:
    return [t for t in re.split(r"[^a-z0-9]+", str(text or "").lower()) if t]


def best_title(doc: dict) -> str | None:
    """The most readable real name for a cluster.

    Precedence is unchanged (display_name, then canonical_name, then the raw
    listing) except for the one provable case: display_name being a reordered,
    re-cased copy of a real listing title.
    """
    display = doc.get("display_name")
    representative = doc.get("representative_title")
    if display and representative and display != representative:
        if sorted(_tokens(display)) == sorted(_tokens(representative)):
            return clean_text(representative)
    return clean_text(display or doc.get("canonical_name") or representative)


# --------------------------------------------------------------------------
# 3. One retailer, two identities  (UI ask #2)
# --------------------------------------------------------------------------
# Grocery scrapers write bare names, device scrapers write domains, and five
# retailers are crawled by both. Measured counts over shipped clusters:
#
#   cleanshelf 13,821 / cleanshelf.online   23
#   carrefour   9,270 / carrefour.ke        29
#   naivas      7,007 / naivas.online        7
#   quickmart   6,023 / quickmart.co.ke     82
#   greenspoon  2,795 / greenspoon.co.ke    34
#
# ✅ Measured harmless to comparisons: ZERO clusters name a retailer under both
# identities, so folding can never collapse two offers within one cluster, and
# no cluster was ever falsely multi-store because of it. The damage is confined
# to per-store aggregates and store facets, exactly as the UI reported.
#
# ⚠️ An explicit map, not a TLD regex. The frontend's `storeIdentity.ts` strips
# TLDs generically for DISPLAY, which is safe for a label but not for data:
# generic stripping would silently merge any two future stores that share a stem.
# These five pairs are the measured, verified set.
STORE_ALIASES = {
    "carrefour.ke": "carrefour",
    "quickmart.co.ke": "quickmart",
    "greenspoon.co.ke": "greenspoon",
    "cleanshelf.online": "cleanshelf",
    "naivas.online": "naivas",
}


def canonical_store(site: str | None) -> str | None:
    if not site:
        return site
    return STORE_ALIASES.get(site.strip().lower(), site)


def fold_stores(sites) -> list | None:
    """Canonicalise a store list, preserving order and dropping duplicates."""
    if sites is None:
        return None
    out: list = []
    for site in sites:
        canon = canonical_store(site)
        if canon not in out:
            out.append(canon)
    return out


def fold_by_store(by_store: dict, cheaper) -> dict:
    """Canonicalise the keys of a best_by_store map.

    On a collision (none exist today, but the map is data-driven) the CHEAPER
    offer survives, so folding can never raise a headline price.
    """
    out: dict = {}
    for site, offer in (by_store or {}).items():
        canon = canonical_store(site)
        if canon in out and cheaper(out[canon]) <= cheaper(offer):
            continue
        out[canon] = offer
    return out


# --------------------------------------------------------------------------
# 4. Availability and freshness are computed, then thrown away
# --------------------------------------------------------------------------
# `gate_members` in the engine already decides honestly which members may price a
# headline, and stamps `availability_basis` / `freshness_basis` on the cluster.
# `_cluster_view` never read them, so nothing downstream could tell that a price
# is unbuyable or three months old.
#
# ⚠️ And those stamps only exist for HALF the corpus: 28,754 of 66,406 clusters.
# Groceries, wearables, routers, tvs, printers, desktop-computers and
# digital-cameras come from a pipeline that never wrote them. So the basis is
# recomputed here from `members[]`, which every cluster does carry, and the
# engine's stamp is used only as a fallback.
#
# ⛔ NOT the members' `fresh` flag. It is a snapshot taken at rebuild time against
# a 14-day window and it has itself gone stale: 99,258 members are flagged
# fresh=True while the entire corpus is now 8-30 days old. `last_seen` is the only
# non-circular evidence.
#
# Measured cluster age (freshest member, ref 2026-07-25):
#   8-14d 14,800 | 15-30d 42,684 | 31-60d 210 | 61-90d 0 | >90d 1,014 | none 3,960
#
# 60 days sits inside a genuinely empty band (nothing at all falls between 61 and
# 90 days), so the cut is insensitive to the exact number — anything from 61 to 90
# selects the same 1,014 clusters, all last seen in 2026-04.
STALE_AFTER_DAYS = 60


def _parse_seen(value) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value))
    except (TypeError, ValueError):
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def last_seen_at(doc: dict) -> datetime | None:
    """Freshest evidence anywhere in the cluster, or None if nothing is dated."""
    seen = [s for m in (doc.get("members") or []) if (s := _parse_seen(m.get("last_seen")))]
    return max(seen) if seen else None


def freshness(doc: dict, now: datetime | None = None) -> str:
    """"fresh" | "stale" | "unknown" — recomputed from last_seen, not the flag.

    ⚠️ "unknown" is NOT stale. 3,960 shipped clusters carry no date on any member,
    and they are the whole of tvs, printers, routers, wearables, desktop-computers
    and digital-cameras. Treating undated as stale would delete six entire
    categories — the same mistake the `n_stores >= 2` cap made when it removed
    three of them. Undated rows ship; they simply carry no freshness claim.
    """
    seen = last_seen_at(doc)
    if seen is None:
        return "unknown"
    now = now or datetime.now(timezone.utc)
    return "stale" if (now - seen).days > STALE_AFTER_DAYS else "fresh"


def availability(doc: dict) -> str:
    """"available" | "out_of_stock" | "delisted" | "unknown".

    Recomputed from members so groceries get a verdict too, falling back to the
    engine's own stamp when a cluster has no members to judge.
    """
    members = doc.get("members") or []
    if not members:
        return doc.get("availability_basis") or "unknown"
    live = [m for m in members if not m.get("delisted")]
    if not live:
        return "delisted"
    # Mirrors gate_members: only a PROVEN out_of_stock disqualifies. An unknown
    # stock status stays eligible — the fail-open lesson the engine records.
    if any(m.get("stock_status") != "out_of_stock" for m in live):
        return "available"
    return "out_of_stock"


def is_unbuyable(doc: dict) -> bool:
    """Every live listing is proven out of stock, or every listing is gone.

    Measured: 192 shipped clusters are wholly out of stock and 0 are wholly
    delisted (the engine already drops those to n_stores == 0, which is what the
    capture's MIN_STORES floor removes). Such a cluster renders as a normal card
    with a real price and a "Go to store" button that leads to a dead end.

    ⚠️ 192, not the 212 the engine's own `availability_basis` stamp reports. The
    stamp is computed over `price_members` — the survivors of the condition gate —
    whereas this reads every live member. The 20 clusters in the gap still have a
    listing whose stock is `lowstock` or simply unknown, and an unknown stock
    status must not condemn a product (the engine's own fail-open rule).
    """
    return availability(doc) in {"out_of_stock", "delisted"}


def is_stale(doc: dict, now: datetime | None = None) -> bool:
    return freshness(doc, now) == "stale"


# --------------------------------------------------------------------------
# 5. Which two offers the headline saving actually compares
# --------------------------------------------------------------------------
# `like_for_like_spread_pct` is a single number with no provenance: it is the
# LARGEST per-config spread, and nothing in the payload says which config it came
# from or which two shops it compared. A consumer wanting to show "12% = 410 at
# Carrefour vs 420 at Quickmart" had to float-match `spread_pct` across configs,
# which ties and rounds badly.
#
# ⭐ Publishing the basis is what lets a reader CHECK the number instead of just
# doubting it, and that matters more here than anywhere else in the payload,
# because the spread is where the dataset's sharpest known defect shows up:
#
#   Brookside UHT 250mlx6 — "like-for-like" 2.4%
#     low   carrefour 410  "Brookside UHT Flavour STRAWBERRY 250mlx6"
#     high  quickmart 420  "Brookside Uht Flavour CHOCOLATE 250Mlx6"
#
# The MVP merge unions FMCG flavour variants but keeps `primary_facet: size`, so
# they collapse into one config and the "like-for-like" spread is computed ACROSS
# flavours. Surfacing both titles makes that visible on the page — the reader sees
# strawberry priced against chocolate and can say so precisely.


def spread_basis(doc: dict) -> dict | None:
    """The two offers behind `like_for_like_spread_pct`, or None.

    Chosen by identity with the config that owns the headline spread rather than
    by re-deriving it, so the published number and the published evidence can
    never disagree.
    """
    headline = doc.get("like_for_like_spread_pct")
    if not isinstance(headline, (int, float)):
        return None
    for config in doc.get("configs") or []:
        spread = config.get("spread_pct")
        if not isinstance(spread, (int, float)) or (config.get("n_stores") or 0) < 2:
            continue
        if abs(spread - headline) > 1e-9:
            continue
        offers = [(site, o) for site, o in (config.get("best_by_store") or {}).items()
                  if isinstance((o or {}).get("price"), (int, float))]
        if len(offers) < 2:
            continue
        offers.sort(key=lambda pair: pair[1]["price"])
        (low_site, low), (high_site, high) = offers[0], offers[-1]
        as_offer = lambda site, o: {
            "store": canonical_store(site), "price": o.get("price"),
            "title": clean_text(o.get("title")), "url": o.get("url"),
        }
        return {
            "facet_label": config.get("facet_label"),
            "spread_pct": spread,
            "cheapest": as_offer(low_site, low),
            "dearest": as_offer(high_site, high),
        }
    return None

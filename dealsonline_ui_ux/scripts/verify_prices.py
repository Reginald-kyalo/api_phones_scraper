#!/usr/bin/env python3
"""Render-and-assert gate for the price COMPARISON surface (`/prices/:clusterId`).

⛔⛔ WHY A SECOND GATE. `verify_categories.py` covers the category surfaces and stops at the
shelf. The comparison page is where this site makes its actual promise — *these N shops sell
this thing at these prices* — and it had no gate at all, which is how
`STOREFRONT_DEFECTS.md` #2 and #3 stayed live after being written down.

⭐ THE ASSERTIONS ARE RELATIONSHIPS, NOT FIGURES — same discipline as the category gate. Prices
and store counts move every republish; what must not move is *the page never states a comparison
it will not show you*. Every check below is of that form.

⚠️ Requires the dev server (:5173) AND the API (:10000), because the point is live data.

    npm run verify:prices
    ../apienv/bin/python scripts/verify_prices.py
"""
import json
import os
import re
import sys
import urllib.parse
import urllib.request

from playwright.sync_api import sync_playwright

UI = os.environ.get("UI_BASE", "http://localhost:5173")
API = os.environ.get("API_BASE", "http://localhost:10000/api")
SHOTS = os.environ.get("SHOT_DIR", "")

# ⚠️ PRE-EXISTING on HEAD — the same two the category gate excludes, for the same reason:
# asserting on a clean console rather than on NEW console errors makes this file fail on
# somebody else's bug and get ignored.
PRE_EXISTING = ("Function components cannot be given refs", "401 (Unauthorized)")

fails: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    print(("  PASS  " if cond else "  FAIL  ") + name + (f"   {detail}" if detail else ""))
    if not cond:
        fails.append(name)


def shot(page, name: str) -> None:
    if SHOTS:
        page.screenshot(path=os.path.join(SHOTS, name), full_page=True)


def _get(url: str):
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.load(r)


def _num(text: str) -> int | None:
    """First comma-grouped integer in `text`, or None."""
    m = re.search(r"(\d[\d,]*)", text or "")
    return int(m.group(1).replace(",", "")) if m else None


def _compared(text: str) -> int | None:
    """The COMPARISON CLAIM in a variant header, as `comparedLabel` writes it.

    ⛔ NOT `_num`. A variant header opens with its facet label, and the first integer on the
    line is `128` out of "128GB" — so the naive read compared a storage size against a row
    count and failed a page that was correct. Parse the phrase, not the first digits.
    """
    t = text or ""
    if "no comparison" in t:  # `comparedLabel(1)`
        return 1
    if "no price available" in t:  # `comparedLabel(0)`
        return 0
    m = re.search(r"compared across (\d+) shops", t)
    return int(m.group(1)) if m else None


def find_multi_config_cluster() -> tuple[str, dict] | tuple[None, None]:
    """A live cluster with 2+ configs, at least one of which prices 2+ shops.

    ⛔ PICKED FROM THE API, NEVER HARDCODED. A cluster id is a match-engine artefact and the
    engine re-clusters; pinning one here would make this gate fail on somebody else's rebuild.
    """
    for node in ("smartphone", "laptop", "tablet"):
        try:
            listing = _get(f"{API}/clusters/by-node/{node}?limit=40")
        except Exception:
            continue
        for row in listing.get("results", []):
            cid = row["cluster_id"]
            try:
                full = _get(f"{API}/clusters/{urllib.parse.quote(cid, safe=':/')}")
            except Exception:
                continue
            cfgs = full.get("configs") or []
            if len(cfgs) > 1 and any(len(c.get("by_store") or {}) >= 2 for c in cfgs):
                return cid, full
    return None, None


def main() -> int:
    cid, cluster = find_multi_config_cluster()
    if not cid:
        print("FAIL  no live multi-config cluster found — is the API on :10000 with data?")
        return 1

    configs = cluster["configs"]
    # The variant that actually holds a comparison — the one the page is accused of hiding.
    rich = max(configs, key=lambda c: len(c.get("by_store") or {}))
    rich_stores = sorted(
        (s for s, o in (rich.get("by_store") or {}).items()
         if (o.get("price") if isinstance(o, dict) else o)),
        key=lambda s: (rich["by_store"][s].get("price")
                       if isinstance(rich["by_store"][s], dict) else rich["by_store"][s]),
    )
    print(f"\n== SUBJECT ==\n  {cid}")
    print(f"  {len(configs)} configs; richest = {rich.get('facet_label')} "
          f"over {len(rich_stores)} priced shops {rich_stores}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1200})
        errs: list[str] = []
        page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errs.append(str(e)))

        url = f"{UI}/prices/{urllib.parse.quote(cid, safe='')}"
        page.goto(url, wait_until="networkidle")
        page.wait_for_timeout(2000)

        # ------------------------------------------------------- the variant comparison
        print("\n== BY CONFIGURATION (STOREFRONT_DEFECTS #2) ==")
        block = page.locator('section[aria-label="By configuration"]')
        check("the variant block is a labelled region", block.count() > 0)

        variants = page.locator('[data-testid="variant"]')
        vn = variants.count()
        check(f"every config renders ({vn} of {len(configs)})", vn == len(configs))

        # ⛔ THE DEFECT ITSELF. The block used to state `· N shops` as dead text with no way to
        # see the N. A number that names a comparison must be openable.
        openers = page.locator('[data-testid="variant"] button[aria-expanded]')
        # ⛔ `openers == vn` alone PASSES VACUOUSLY at 0 == 0, which is exactly the state the
        # defect leaves the page in. Caught by running this file RED before the fix.
        check("each variant's shop count is an expandable control",
              vn > 0 and openers.count() == vn, f"{openers.count()} openers for {vn} variants")

        if openers.count() > 0:
            # Open the richest variant and assert the rows it promised.
            target = page.locator('[data-testid="variant"]', has_text=str(rich.get("facet_label") or ""))
            opener = (target.locator("button[aria-expanded]").first
                      if target.count() > 0 else openers.first)
            claim = _compared(opener.inner_text())
            opener.click()
            page.wait_for_timeout(600)
            rows = page.locator('[data-testid="variant"] [data-testid="variant-offer"]')
            shown = rows.count()
            check(f"expanding a variant shows its per-store offers ({shown} rows)", shown > 0)
            # ⭐ THE INVARIANT THE CATEGORY GATE ESTABLISHED, APPLIED HERE: the claim on the
            # control equals the rows the control opens. This is what stops the two drifting.
            check(f"the variant's claimed shop count equals the rows it opens "
                  f"(claims {claim}, shows {shown})",
                  claim is not None and claim == shown)
            body = page.inner_text("body")
            for store in rich_stores[:2]:
                check(f"the variant names the shop it compares ({store})", store in body)
            # Real click-through, exactly like the cluster-level list.
            links = page.locator('[data-testid="variant-offer"] a[href^="http"]')
            check("variant offers link out to the shop", links.count() >= shown)

        # ⭐ The number a comparison page is FOR, and it was computed, served and shown nowhere.
        spreads = [c for c in configs if (c.get("spread_pct") or 0) > 0]
        if spreads:
            body = page.inner_text("body")
            want = round(spreads[0]["spread_pct"])
            check(f"a variant's own price spread is shown ({want}%)",
                  re.search(rf"\b{want}%", body) is not None)

        shot(page, "10_variants.png")

        # ------------------------------------------------------- the variant's own page
        print("\n== VARIANT AS ITS OWN PAGE (STOREFRONT_DEFECTS #2b) ==")
        # ⛔ THE ROUTE KEY IS `String(facet_value)`. It is an int for storage and a str for cpu,
        # so this builds the URL exactly as the page does; if the page ever compares the raw
        # value instead, every storage variant stops resolving and this check catches it.
        key = str(rich.get("facet_value") if rich.get("facet_value") is not None
                  else rich.get("facet_label"))
        vurl = (f"{UI}/prices/{urllib.parse.quote(cid, safe='')}"
                f"?facet={urllib.parse.quote(key)}")
        page.goto(vurl, wait_until="networkidle")
        page.wait_for_timeout(2500)
        vbody = page.inner_text("body")
        check(f"a variant URL resolves (?facet={key})",
              page.locator('[data-testid="facet-missing"]').count() == 0)
        check("the heading names the configuration",
              str(rich.get("facet_label") or "") in page.locator("h1").first.inner_text())
        check("it says it is comparing one configuration only",
              "one configuration only" in vbody)
        check("and offers a way back to the whole product",
              page.locator('[data-testid="all-configurations"]').count() > 0)

        # ⭐⭐ THE POINT OF THE WHOLE FEATURE: the list on a variant page is that variant's
        # shops, not the cluster's mixed-configuration `best_by_store`.
        vrows = page.locator('[data-testid="offer"]')
        check(f"the price list is the VARIANT's shops ({vrows.count()} rows, "
              f"expected {len(rich_stores)})",
              vrows.count() == len(rich_stores))
        vclaim = _compared(page.inner_text("body"))
        check(f"and the headline count matches those rows (claims {vclaim})",
              vclaim == vrows.count())

        # ⛔ `n_stores` is a CLUSTER fact — printing "carried by N shops" over a variant's two
        # rows would re-introduce defect #1 where its fix never looked.
        check("the cluster's carried-shops line is NOT shown over a variant",
              "Carried by" not in vbody)

        if len(configs) > 1:
            check("the other configurations are offered as a switcher",
                  page.locator('[data-testid="variant-switch"]').count() >= 1)

        # ⛔⛔ A STALE VARIANT LINK MUST FAIL LOUDLY, NOT FALL BACK. Configs are rebuilt on every
        # re-cluster, so a shared link WILL go stale; silently rendering the mixed-config view
        # would show a cross-configuration spread to someone who thinks they picked one variant.
        page.goto(f"{UI}/prices/{urllib.parse.quote(cid, safe='')}?facet=__no_such_config__",
                  wait_until="networkidle")
        page.wait_for_timeout(2500)
        check("an unknown ?facet= says so rather than silently showing the cluster",
              page.locator('[data-testid="facet-missing"]').count() > 0)

        # ------------------------------------------------------- back control
        print("\n== BACK CONTROL (STOREFRONT_DEFECTS #3) ==")
        # Arriving from a shelf and pressing the page's own back control must not dump the
        # shopper into Deals — a section they may never have visited.
        page.goto(f"{UI}/shelf/smartphone", wait_until="networkidle")
        page.wait_for_timeout(2500)
        card = page.locator('a[href^="/prices/"]').first
        check("the shelf lists comparison links", card.count() > 0)
        if card.count() > 0:
            card.click()
            page.wait_for_timeout(2500)
            back = page.locator('[data-testid="back-link"]').first
            check("the comparison page has a back control", back.count() > 0)
            if back.count() > 0:
                label = back.inner_text().strip()
                href = back.get_attribute("href") or ""
                check(f"arriving from a shelf, back returns to that shelf (href={href!r})",
                      href.startswith("/shelf/"))
                check(f"and it is labelled with where it goes ({label!r})",
                      "deals" not in label.lower())
                back.click()
                page.wait_for_timeout(2000)
                check("following it lands on the shelf",
                      "/shelf/" in page.url, page.url)

        # ⭐⭐ THE FILTER MUST SURVIVE THE ROUND TRIP. `?multi_store=1` is kept in the URL
        # deliberately, so that a "only things I can actually compare" view is shareable and
        # survives a back button. Rebuilding the origin from the shelf SLUG silently dropped it
        # and returned the shopper to an unfiltered shelf — a regression this gate caught in the
        # first version of the fix, which is why the assertion exists.
        print("\n== THE BACK LINK PRESERVES THE FILTER ==")
        page.goto(f"{UI}/shelf/smartphone?multi_store=1", wait_until="networkidle")
        page.wait_for_timeout(2500)
        fcard = page.locator('a[href^="/prices/"]').first
        if fcard.count() > 0:
            fcard.click()
            page.wait_for_timeout(2500)
            fback = page.locator('[data-testid="back-link"]').first
            fhref = fback.get_attribute("href") if fback.count() > 0 else ""
            check(f"back from a FILTERED shelf keeps the filter (href={fhref!r})",
                  "multi_store=1" in (fhref or ""))

        # ------------------------------------------------------- the product page
        # ⛔ `ProductDetailsPage` had NO back control at all (STOREFRONT_DEFECTS #3b). It has a
        # breadcrumb, which is why it was the quieter half: the trail says where you ARE and
        # nothing offered to take you back.
        print("\n== PRODUCT PAGE BACK CONTROL (STOREFRONT_DEFECTS #3b) ==")
        # ⛔ NOT via /favorites: that list lives in this browser profile's localStorage and is
        # empty in a fresh headless context, so the check would SKIP rather than assert.
        # `/browse/:productType` is served from the API and always has products.
        ptype = (_get(f"{API}/pr/product-types")["productTypes"][0])["id"]
        # ⛔ `/browse/:type` ALONE LISTS NO PRODUCTS — it renders the subcategory tree until a
        # `?sub=` is chosen. Which is the whole argument for capturing the live location as the
        # origin rather than rebuilding `/browse/${productType}`: the query string IS the page.
        page.goto(f"{UI}/browse/{ptype}", wait_until="networkidle")
        page.wait_for_timeout(3000)
        # ⛔ `?sub=` IS STILL A TREE LEVEL, NOT A PRODUCT LIST — it opens deeper subcategories.
        # `?cat=<pricerunner url>` is the leaf that actually lists products, and its value is a
        # percent-encoded URL. Three query shapes on one route is the strongest possible case for
        # capturing the live location as the origin instead of rebuilding it from a param.
        cat = page.locator('a[href*="?cat="]').first
        check(f"/browse/{ptype} offers a product-listing leaf", cat.count() > 0)
        browse_url = ""
        if cat.count() > 0:
            cat.click()
            page.wait_for_timeout(5000)
            browse_url = page.url
            prod = page.locator('a[href^="/product/"]').first
            check("a browse leaf lists products", prod.count() > 0)
            if prod.count() > 0:
                prod.click()
                page.wait_for_timeout(3500)
                pb = page.locator('[data-testid="back-link"]').first
                check("the product page has a back control at all", pb.count() > 0)
                if pb.count() > 0:
                    href = pb.get_attribute("href") or ""
                    check(f"arriving from browse, it returns THERE, not to /deals (href={href!r})",
                          href.startswith(f"/browse/{ptype}"))
                    # ⭐ And the LEAF survives — the filter-preservation invariant again, on the
                    # other tree. Without it the shopper lands on a bare product-type page that
                    # lists no products at all.
                    check("and the ?cat= leaf it came from survives the round trip",
                          "cat=" in href)

        # ⭐ AND COLD, the fallback is the product's OWN category — never a site-wide default.
        # A generic default is exactly what defect #3 was, wearing a new name.
        #
        # ⛔⛔ A `goto` TO THE SAME URL IS NOT A COLD LOAD, AND THIS ASSERTION PASSED FALSELY
        # UNTIL IT WAS FIXED. Browsers restore `window.history.state` when an entry is reloaded,
        # so React Router got its `from` back and the check was reading the CARRIED origin while
        # claiming to test the fallback. A genuinely cold arrival needs a fresh context — which
        # is what a shared link in a new browser actually is.
        product_url = page.url
        cold_ctx = browser.new_context(viewport={"width": 1440, "height": 1200})
        cold = cold_ctx.new_page()
        cold.goto(product_url, wait_until="networkidle")
        cold.wait_for_timeout(3500)
        cb = cold.locator('[data-testid="back-link"]').first
        check("a cold product load still has a back control", cb.count() > 0)
        if cb.count() > 0:
            href = cb.get_attribute("href") or ""
            check(f"cold, it falls back to the product's own category (href={href!r})",
                  href.startswith("/browse/") and "cat=" not in href)
        cold_ctx.close()

        # The comparison page, arrived at cold. ⛔ FRESH CONTEXT, for the `history.state`
        # reason documented above — a same-URL `goto` would hand the origin straight back.
        print("\n== COLD ARRIVAL AT THE COMPARISON PAGE ==")
        cctx = browser.new_context(viewport={"width": 1440, "height": 1200})
        cpage = cctx.new_page()
        cpage.goto(url, wait_until="networkidle")
        cpage.wait_for_timeout(2500)
        cold2 = cpage.locator('[data-testid="back-link"]').first
        check("a cold load still has a back control", cold2.count() > 0)
        if cold2.count() > 0:
            href = cold2.get_attribute("href") or ""
            check(f"and it falls back to the declared default (href={href!r})", href == "/deals")
        cctx.close()

        # ------------------------------------------------------- titles / canonical
        # ⛔⛔ EVERY PAGE SHARED ONE TITLE UNTIL 2026-09-04 — `HelmetProvider` was mounted and no
        # page used it. These assert that titles DIFFER and that canonical policy is applied,
        # never that a particular string is present: copy is allowed to change, sameness is not.
        print("\n== TITLES AND CANONICAL (roadmap 1.5) ==")

        def meta(u: str) -> tuple[str, str | None, bool]:
            page.goto(u, wait_until="networkidle")
            page.wait_for_timeout(2000)
            t = page.title()
            link = page.locator('link[rel="canonical"]')
            c = link.first.get_attribute("href") if link.count() else None
            robots = page.locator('meta[name="robots"]')
            nx = "noindex" in ((robots.first.get_attribute("content") or "")
                               if robots.count() else "")
            return t, c, nx

        base = f"{UI}/prices/{urllib.parse.quote(cid, safe='')}"
        t_shelf, c_shelf, _ = meta(f"{UI}/shelf/smartphone")
        t_shelf2, _, _ = meta(f"{UI}/shelf/laptop")
        t_cluster, c_cluster, _ = meta(base)
        t_variant, c_variant, _ = meta(vurl)

        check(f"a shelf has its own title ({t_shelf!r})", "|" in t_shelf and t_shelf.strip() != "")
        check("two different shelves have different titles", t_shelf != t_shelf2)
        check("a comparison page differs from a shelf", t_cluster != t_shelf)
        check(f"a VARIANT page differs from its cluster ({t_variant!r})", t_variant != t_cluster)

        # ⛔ `?multi_store=1` is a SUBSET of the same shelf — it must canonicalise away, or the
        # filtered and unfiltered URLs compete for one query.
        _, c_filtered, _ = meta(f"{UI}/shelf/smartphone?multi_store=1")
        check(f"the filtered shelf canonicalises to the unfiltered one ({c_filtered!r})",
              c_filtered is not None and c_filtered == c_shelf)

        # ⛔ A VARIANT IS NOT A SUBSET — different prices from different shops. It is canonical
        # to ITSELF, which is the opposite call, and getting these two the same way round is the
        # only part of this that is a judgement rather than a mechanism.
        check(f"a variant page is canonical to ITSELF ({c_variant!r})",
              c_variant is not None and "facet=" in c_variant)
        check("a cluster page is canonical to itself without a facet",
              c_cluster is not None and "facet=" not in c_cluster)

        # ⛔⛔ EVERYTHING BELOW THIS LINE DELIBERATELY PROVOKES FAILURES, so the console check
        # must not count them. Marking the index is honest; adding "404" to PRE_EXISTING would
        # have silenced real broken requests everywhere else in the run.
        clean_errs = len(errs)

        # ⛔ Error-shaped pages stay renderable but must not be offered to anyone else.
        _, _, nx_stale = meta(f"{base}?facet=__no_such_config__")
        check("a stale variant URL is noindex", nx_stale)
        _, _, nx_shelf = meta(f"{UI}/shelf/__no_such_shelf__")
        check("a missing shelf is noindex", nx_shelf)

        # ------------------------------------------------------- console
        print("\n== CONSOLE ==")
        # Only the errors seen BEFORE the deliberate 404 probes — see `clean_errs`.
        new = [e for e in errs[:clean_errs] if not any(p in e for p in PRE_EXISTING)]
        check("no new console errors", not new, "; ".join(new[:3]))
        print(f"  note  {len(errs) - clean_errs} console error(s) after the error-state probes, "
              f"which is what those probes are for")

        browser.close()

    print("\n" + ("ALL CHECKS PASSED" if not fails else f"{len(fails)} FAILED: {fails}"))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())

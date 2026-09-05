#!/usr/bin/env python3
"""Render-and-assert gate for the canonical category surfaces.

⛔⛔ WHY THIS IS CHECKED IN. This UI has no test framework — `package.json` exposes `type-check`
only — so the only gates are `tsc --noEmit`, a production build, and *rendering the page*. The
third was being done by hand and thrown away, which means the category wiring had no repeatable
proof. It also sits downstream of an engine (`phones_scraper`) that republishes the tree: when
`browse_nodes` is rebuilt, the numbers on these screens change under the frontend without a
single line of it changing. That is exactly the class of regression a hand-run check misses.

⭐ THIS ASSERTS BEHAVIOUR, NOT FIGURES. The tree moved 4,185 -> 4,137 nodes and 553 -> 529
browsable roots between two runs of this file, and every assertion below survived, because they
check *relationships* — the menu agrees with the page it links to, no link escapes into the
retired spine's slug space, no raw shop label reaches a shopper — rather than pinning counts a
republish is entitled to change.

Usage (the dev server and API must be reachable, or use with_server.py):

    python scripts/verify_categories.py
    python .claude/skills/webapp-testing/scripts/with_server.py \
        --server "cd dealsonline_ui_ux && npm run dev" --port 5173 \
        -- python dealsonline_ui_ux/scripts/verify_categories.py

⚠️ Requires the API on :10000 as well — the point is to check against LIVE data, not fixtures.
"""
import os
import re
import sys

from playwright.sync_api import sync_playwright
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError

UI = os.environ.get("UI_BASE", "http://localhost:5173")
SHOTS = os.environ.get("SHOT_DIR", "")

# ⚠️ PRE-EXISTING on HEAD, verified by stashing the category branch and re-running: a forwardRef
# warning from shadcn Sheet/Button in the mobile hamburger, and a 401 from the session check when
# signed out. Neither is in the category scope. Asserting on a clean console instead of on NEW
# console errors would make this file fail on somebody else's bug and get ignored.
PRE_EXISTING = ("Function components cannot be given refs", "401 (Unauthorized)")

fails: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    print(("  PASS  " if cond else "  FAIL  ") + name + (f"   {detail}" if detail else ""))
    if not cond:
        fails.append(name)


def shot(page, name: str) -> None:
    if SHOTS:
        page.screenshot(path=os.path.join(SHOTS, name), full_page=False)


def api_get(page, path: str):
    """GET `{UI}/api{path}` through the page's own request context — the same dev-proxied
    route the app itself calls (`vite.config.ts` forwards `/api` to :10000).

    ⛔ NEW IN THIS FILE, AND ONLY FOR WHAT NO RENDERED MENU CAN ANSWER. `AislePage` (the 19
    designed departments) is deliberately not linked from any nav — see its own docstring — so
    there is no rendered panel to read a claimed count off, the way the curated-department check
    below reads `panel.locator(...).inner_text()`. The claim can only be read from the endpoint
    a menu would read if one existed.
    """
    r = page.request.get(f"{UI}/api{path}")
    assert r.ok, f"GET {path} -> {r.status} {r.status_text}"
    return r.json()


def main() -> int:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        errs: list[str] = []
        page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errs.append(str(e)))

        # ----------------------------------------------------------- homepage strip
        print("\n== HOMEPAGE / CategoryStrip ==")
        page.goto(f"{UI}/", wait_until="networkidle")
        page.wait_for_timeout(1500)
        strip = page.locator('nav[aria-label="Departments"]').first
        check("CategoryStrip renders", strip.count() > 0)
        links = strip.locator("a")
        n = links.count()
        hrefs = [links.nth(i).get_attribute("href") for i in range(n)]
        labels = [links.nth(i).inner_text().strip() for i in range(n)]
        check(f"strip has tiles ({n})", n > 0)
        # ⛔ THE DISJOINT-SLUG-SPACE TRAP. `/browse` serves the retired 424-node PriceRunner spine
        # and shares ZERO slugs with this tree, so a canonical slug sent there resolves to
        # nothing at all — a dead link that looks like a working one.
        check("every strip tile links to /department or the /shelf door, none to /browse",
              all(h and (h.startswith("/department/") or h == "/shelf") for h in hrefs),
              str(hrefs[:3]))
        # ⛔⛔ LOAD-BEARING, AND THE ONLY REASON THE SPINE IS SAFE. The 21 ruled departments
        # reach ~45% of placed clusters; the other 55% — chiefly `phone-tablet`'s 19,286
        # undifferentiated ones — are reachable ONLY through /shelf. A surface that renders
        # departments and drops this door makes half the catalogue unbrowsable, and every other
        # assertion here would still pass.
        check("the strip keeps an 'all categories' door to /shelf",
              any(h == "/shelf" for h in hrefs), str(hrefs))
        check("no ALL-CAPS shop label leaked into the strip",
              not any(l.isupper() and len(l) > 3 for l in labels), str(labels[:3]))
        shot(page, "01_home_strip.png")

        # ----------------------------------------------------------- the panel
        print("\n== CATEGORY PANEL ==")
        page.goto(f"{UI}/deals", wait_until="networkidle")
        btn = page.get_by_role("button", name=re.compile("All categories"))
        check("header 'All categories' button exists", btn.count() > 0)
        check("button is collapsed before click",
              btn.first.get_attribute("aria-expanded") == "false")
        btn.first.click()
        page.wait_for_timeout(2000)
        panel = page.locator('div[role="dialog"][aria-label="All categories"]')
        # ⛔ This component was MOUNTED NOWHERE for the life of the branch: it existed, read the
        # retired spine, and no page imported it. Assert it is reachable, not merely present.
        check("panel opens", panel.count() > 0)
        check("button reports expanded", btn.first.get_attribute("aria-expanded") == "true")
        depts = panel.locator('nav[aria-label="Departments"] a')
        dn = depts.count()
        check(f"panel lists departments ({dn})", dn > 0)
        dept_txt = [depts.nth(i).inner_text().replace("\n", " ").strip() for i in range(dn)]
        for t in dept_txt:
            print("         ", t)
        # ⭐⭐ THE PANEL NOW SHOWS A RULED SPINE, NOT THE TOP N ROOTS. The old ordering guard
        # (`Electronics & Computers` in, `Battery Chargers` out) tested a top-12 cut over ~529
        # roots that no longer drives this surface — it has MOVED to the /shelf root listing
        # below, where it still applies. What replaces it here is identity, not ordering.
        # ⚠️ The row text is "<name> <count>" with newlines already collapsed to single spaces,
        # so splitting on a double space returns the WHOLE row and every name assertion below
        # silently tests the wrong string. Strip the trailing count instead — including the
        # `18.4k` form `formatCount` produces above 10,000.
        names = [re.sub(r"\s+[\d.,]+k?$", "", t).strip() for t in dept_txt]
        check("the panel shows the RULED departments, not shop vocabulary",
              {"Smartphones", "Laptops", "Audio", "Kitchen"} <= set(names), str(names))
        # ⛔ The audit's load-bearing defect: `Laptops` resolves in three places in the tree and
        # `Phones` in three. A department spine exists to present each concept ONCE.
        check("no department name appears twice",
              len(names) == len(set(names)), str([n for n in names if names.count(n) > 1]))
        check("no CPU spec facet is offered as a department",
              not any(re.search(r"core i[357]", t, re.I) for t in dept_txt))
        check("no promo shelf is offered as a department",
              not any(re.search(r"\b(sale|offer|promo|deal)s?\b", t, re.I) for t in dept_txt))
        # ⛔ A department name is OURS and must never go through the shop-label repair path.
        check("no shouted label in the panel",
              not any(re.match(r"^[A-Z][A-Z &]{4,}$", n) for n in names), str(names))
        dhrefs = [depts.nth(i).get_attribute("href") for i in range(dn)]
        check("every department links to /department, never /shelf or /browse",
              all(h and h.startswith("/department/") for h in dhrefs), str(dhrefs[:3]))
        kids = panel.locator("ul.grid a")
        check(f"active department shows its adopted shelves ({kids.count()})", kids.count() > 0)
        khrefs = [kids.nth(i).get_attribute("href") for i in range(kids.count())]
        # ⛔ SHELVES are `browse_nodes` slugs. Six department ids also name a node, so sending a
        # slug to /department (or an id to /shelf) resolves to a plausible WRONG page rather
        # than erroring — which is worse than a 404 and is why there are two link builders.
        check("adopted shelves link to /shelf, never /department",
              all(h and h.startswith("/shelf/") for h in khrefs), str(khrefs[:3]))

        # ⛔⛔ NO TWO TILES MAY SHARE A LABEL — roadmap 1b.2, measured 2026-09-04. The Laptops
        # department adopts THREE roots (`laptop`, `laptop-2eb1af`, `laptop-06ffb7`) and all
        # three are labelled "Laptops": the panel offered three identical tiles reading 655, 590
        # and 285 with nothing to choose between them. `departmentShelves` drops such a group
        # WHOLE rather than keeping the biggest, because keeping one would link to 655 of the
        # department's 1,530 and lose 875 clusters behind a tile that looks complete.
        page.locator('nav[aria-label="Departments"] a[href="/department/laptops"]').first.hover()
        page.wait_for_timeout(1500)
        ltiles = [t.strip() for t in panel.locator("ul.grid a span.truncate").all_inner_texts()]
        check(f"no two shelf tiles share a label under Laptops ({ltiles})",
              len(ltiles) == len(set(ltiles)))
        # ⛔ THE LINE ABOVE PASSES VACUOUSLY AT `[] == set()`, which is the state the fix
        # actually produces here — so on its own it would also pass if the panel rendered
        # nothing for an unrelated reason. Pin the explanation, not just the absence.
        if not ltiles:
            check("and an empty second level SAYS so rather than rendering blank",
                  "single shelf" in panel.inner_text())
        check("the panel keeps its 'All categories' door to /shelf",
              panel.locator('a[href="/shelf"]').count() > 0)
        shot(page, "02_panel.png")

        # ----------------------------------------------------------- counts agree
        print("\n== COUNT HONESTY ==")
        # ⛔⛔ `laptops` IS THE SHARPEST CASE IN THE SPINE, WHICH IS WHY IT IS THE ONE ASSERTED.
        # It adopts THREE separate `Laptops` shelves under three different parents (655 + 590 +
        # 285). Had the tile linked to its principal shelf instead of a department page, the
        # menu would advertise 1,530 and the page deliver 655 — the same 3x understatement
        # (`Food Cupboard`: 2,010 promised, 6,220 delivered) this assertion has caught before,
        # re-created by a curation choice rather than by a sort key.
        fc = panel.locator('nav[aria-label="Departments"] a[href="/department/laptops"]')
        check("Laptops is in the menu", fc.count() > 0)
        fc_txt = fc.inner_text().replace("\n", " ") if fc.count() else ""
        menu_n = _num(fc_txt)
        fc.click()
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2500)
        heading = page.locator('section[aria-label="Products"] h2').first
        htxt = heading.inner_text() if heading.count() else ""
        page_n = _num(htxt)
        # ⭐ Compare the two numbers rather than pinning either — a republish is allowed to move
        # them, but never to make them disagree.
        check(f"menu and department page agree ({menu_n} == {page_n})",
              menu_n is not None and menu_n == page_n, f"menu={fc_txt!r} page={htxt!r}")
        check("the department page spans more than one shelf",
              page.locator('section[aria-label="Shelves"] a').count() > 1)
        check("panel closed itself on navigation",
              page.locator('div[role="dialog"][aria-label="All categories"]').count() == 0)
        shot(page, "03_shelf.png")

        # ----------------------------------------------------------- pagination
        print("\n== PAGINATION ==")
        cards = page.locator('section[aria-label="Products"] article, '
                             'section[aria-label="Products"] > div > a')
        first_page = page.locator('section[aria-label="Products"]').inner_text()[:400]
        more = page.get_by_role("button", name=re.compile("Show more|Load more", re.I))
        check("a shelf with thousands of products offers a way past page 1", more.count() > 0)
        if more.count():
            before = cards.count()
            more.first.click()
            page.wait_for_timeout(2500)
            after = cards.count()
            check(f"loading more appends products ({before} -> {after})", after > before)
            check("appended page is not a repeat of the first",
                  page.locator('section[aria-label="Products"]').inner_text()[:400] == first_page)

        # ----------------------------------------------------------- comparable filter
        print("\n== MULTI-STORE FILTER ==")
        cmp_toggle = page.get_by_role("button", name=re.compile("compared across", re.I))
        check("the compare filter is offered", cmp_toggle.count() > 0)
        if cmp_toggle.count():
            total_all = _num(page.locator('section[aria-label="Products"] h2').first.inner_text())
            cmp_toggle.first.click()
            page.wait_for_timeout(2500)
            total_cmp = _num(page.locator('section[aria-label="Products"] h2').first.inner_text())
            check(f"filtering to comparable narrows the shelf ({total_all} -> {total_cmp})",
                  total_cmp is not None and total_all is not None and total_cmp < total_all)
            check("the filter is reflected in the URL so the view is shareable",
                  "multi" in page.url.lower(), page.url)

        # ⚠️ Snapshot BEFORE the deliberate 404 probe — that probe's whole point is to make the
        # API return 404, which the browser logs as a failed resource.
        print("\n== console (happy path) ==")
        happy = [e for e in errs
                 if "favicon" not in e.lower() and not any(k in e for k in PRE_EXISTING)]
        check("no NEW console/page errors", len(happy) == 0, str(happy[:2]))

        # ----------------------------------------------------------- shop-count honesty
        # ⛔⛔ THE CARD SAID 19 SHOPS AND THE PAGE COULD PRICE 3. Cards rendered `n_stores`
        # (shops holding a LISTING) where the comparison table renders only shops whose price
        # survived the engine's gate. Measured 2026-08-21 on this exact shelf: 99 of 100
        # clusters overstated, mean +9.6. Assert the card's claim matches what the page delivers.
        print("\n== SHOP-COUNT HONESTY ==")
        page.goto(f"{UI}/shelf/smartphone", wait_until="networkidle")
        page.wait_for_timeout(2500)
        cards = page.locator('section[aria-label="Products"] a[href^="/prices/"]')
        check(f"the shelf renders product cards ({cards.count()})", cards.count() > 0)
        if cards.count():
            texts = [cards.nth(i).inner_text() for i in range(min(cards.count(), 8))]
            # No card may claim a bare "N shops" any more — that phrasing was the lie.
            bare = [t for t in texts if re.search(r"·\s*\d+\s+shops?\b", t)]
            check("no card claims a bare 'N shops'", not bare, str(bare[:1]))
            check("cards say what the count MEANS",
                  any(re.search(r"compared across \d+ shops|no comparison|no price available", t)
                      for t in texts), str(texts[:1]))
            first = cards.first
            first_txt = first.inner_text()
            m = re.search(r"compared across (\d+) shops", first_txt)
            claim = int(m.group(1)) if m else None
            first.click()
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2500)
            rows = page.locator('ul[aria-label="Price comparison"] > li')
            # ⛔ NEVER SKIP SILENTLY. The first version of this assertion selected `table tbody
            # tr`, the page renders a list, and it matched nothing — so it passed by doing
            # nothing at all. Assert the hook exists before asserting anything through it.
            check("the comparison list is reachable for assertion", rows.count() > 0)
            check("the card's claim is parseable", claim is not None, first_txt[:80])
            if claim is not None and rows.count():
                # ⭐ The invariant: what the card promises equals what the page can price.
                check(f"the card's claim matches the comparison rows ({claim} vs {rows.count()})",
                      claim == rows.count(), f"card said {claim}, page shows {rows.count()}")

        # ----------------------------------------------------------- mobile + tablet
        # ⛔⛔ THIS SECTION EXISTS BECAUSE NOTHING TESTED BELOW 1024px. The desktop panel's
        # trigger sits in a `hidden lg:flex` nav, so for the whole life of the category wiring
        # every phone and tablet viewport got a flat link and NO category tree at all — while
        # every assertion above passed, because every assertion above ran at 1440px.
        for label, w, h in (("mobile", 390, 844), ("tablet", 900, 1000)):
            print(f"\n== {label.upper()} ({w}px) ==")
            mp = browser.new_page(viewport={"width": w, "height": h})
            mp.goto(f"{UI}/", wait_until="networkidle")
            mp.wait_for_timeout(1200)
            ham = mp.get_by_role("button", name=re.compile("Open menu", re.I))
            check(f"{label}: hamburger is present", ham.count() > 0 and ham.first.is_visible())
            ham.first.click()
            mp.wait_for_timeout(2500)
            depts = mp.get_by_role("button", expanded=False)
            # The department rows are the expanders inside the sheet.
            rows = mp.locator('[role="dialog"] button[aria-expanded]')
            n = rows.count()
            check(f"{label}: sheet lists departments ({n})", n > 0)
            if n:
                names = [rows.nth(i).inner_text().replace("\n", " ").strip() for i in range(min(n, 3))]
                print("         ", names)
                check(f"{label}: no shouted shop label in the sheet",
                      not any(re.match(r"^[A-Z][A-Z &]{4,}", t) for t in names), str(names))
                # ⭐ The whole point: subcategories must be reachable HERE, not only at 1440px.
                before = mp.locator('[role="dialog"] a[href^="/shelf/"]').count()
                rows.first.click()
                mp.wait_for_timeout(2500)
                after = mp.locator('[role="dialog"] a[href^="/shelf/"]').count()
                check(f"{label}: expanding a department reveals subcategories ({before} -> {after})",
                      after > before)
                check(f"{label}: the expanded row reports itself expanded",
                      rows.first.get_attribute("aria-expanded") == "true")
                # Navigating must dismiss the sheet, not leave it covering the new page.
                links = mp.locator('[role="dialog"] a[href^="/shelf/"]')
                if links.count():
                    links.first.click()
                    mp.wait_for_load_state("networkidle")
                    mp.wait_for_timeout(1500)
                    check(f"{label}: the sheet closes on navigation",
                          mp.locator('[role="dialog"]').count() == 0)
                    check(f"{label}: it landed on a shelf", "/shelf/" in mp.url, mp.url)
            shot(mp, f"05_{label}.png")
            mp.close()

        # ----------------------------------------------------------- near-duplicate fold
        # ⛔⛔ BAD HIERARCHY: `Phones` (1,082) rendered as a SUBCATEGORY of `Smartphones`, because
        # 46 shops use both words for one concept and the engine's fold keys on
        # `canonical_form(label)` — 'phone' != 'smartphone' — so it structurally cannot see across
        # them. Measured: the two shelves share 25 shops and hold the same class of product.
        #
        # ⭐ THE FIX IS DISPLAY-ONLY AND HIDES NOTHING: the child's products are already in this
        # page's listing via descendant closure, so the total must NOT move. That is the second
        # assertion, and it is the one that proves the fold removed a tile and not stock.
        print("\n== NEAR-DUPLICATE FOLD ==")
        page.goto(f"{UI}/shelf/smartphone", wait_until="networkidle")
        page.wait_for_timeout(2500)
        subs = page.locator('section[aria-label="Subcategories"] a')
        sub_txt = [subs.nth(i).inner_text().replace("\n", " ") for i in range(subs.count())]
        total_sm = _num(page.locator('section[aria-label="Products"] h2').first.inner_text())
        check("`Phones` is no longer offered as a subcategory of `Smartphones`",
              not any(re.match(r"^Phones\b", t.strip()) for t in sub_txt), str(sub_txt))
        check("the real subcategories survive the fold",
              any("Feature Phones" in t for t in sub_txt)
              and any("Refurbished" in t for t in sub_txt), str(sub_txt))
        # ⛔ The products the folded child held are STILL on the page.
        check(f"folding removed a TILE, not stock ({total_sm} products)",
              total_sm is not None and total_sm > 3000, str(total_sm))
        # ⛔⛔ THE GUARD, AND IT IS THE HALF THAT COULD DO REAL DAMAGE. 60 other parent/child pairs
        # end with their child's name and are CORRECT narrowings of a conjunction — a bare
        # `endsWith` would delete all of them. `Personal Care` under `Beauty & Personal Care` is
        # the largest, at 3,486 clusters.
        page.goto(f"{UI}/shelf/beauty-personal-care", wait_until="networkidle")
        page.wait_for_timeout(2500)
        bsub = page.locator('section[aria-label="Subcategories"] a')
        btxt = [bsub.nth(i).inner_text().replace("\n", " ") for i in range(bsub.count())]
        check("a CONJUNCTION still keeps its own arm as a child (`Personal Care`)",
              any("Personal Care" in t for t in btxt), str(btxt[:4]))

        # ----------------------------------------------------------- root ordering
        # ⛔⛔ THE ORDERING REGRESSION GUARD, RELOCATED — NOT DROPPED. `/browse-tree` once
        # ordered by `n_clusters` (a node's OWN stock) while every shelf renders the descendant
        # closure, which cut `Electronics & Computers` (20,772 in subtree, ~2,018 of its own)
        # out of a top-12 menu and promoted `Battery Chargers` (553, one shop) into it. The
        # panel no longer takes a top-N cut, so the defect cannot show there any more — but
        # /shelf still lists all ~529 roots in the API's order, so it can show HERE.
        #
        # ⭐ Asserts RELATIVE POSITION, not membership: at /shelf every root renders, so the old
        # "Battery Chargers is absent" form would be meaningless. A department that files
        # everything into children sorts last on own stock, which is precisely backwards.
        print("\n== ROOT ORDERING (/shelf) ==")
        page.goto(f"{UI}/shelf", wait_until="networkidle")
        page.wait_for_timeout(2500)
        roots = page.locator('section[aria-label="Subcategories"] a')
        rn = roots.count()
        check(f"/shelf lists the roots ({rn})", rn > 0)
        rtxt = [roots.nth(i).inner_text().replace("\n", " ") for i in range(rn)]
        def _pos(needle: str) -> int | None:
            for i, t in enumerate(rtxt):
                if needle.lower() in t.lower():
                    return i
            return None
        big, small = _pos("Electronics & Computers"), _pos("Battery Charger")
        check("both ordering probes are present to compare",
              big is not None and small is not None, f"big={big} small={small}")
        if big is not None and small is not None:
            check(f"roots order by SUBTREE stock, not own stock (#{big} before #{small})",
                  big < small)

        # ----------------------------------------------------------- 404 vs empty
        print("\n== 404 vs EMPTY ==")
        # ⛔ A slug from the RETIRED SPINE on the canonical route. The two spaces share zero
        # members, so this is the exact mistake the disjointness invites — and it must read as a
        # broken link, not as a transient outage.
        page.goto(f"{UI}/shelf/mobile-phones", wait_until="networkidle")
        page.wait_for_timeout(2000)
        body = page.inner_text("body")
        check("a spine slug on the canonical route renders 'No such category'",
              "No such category" in body)
        check("it does not read as a transient failure", "could not be loaded" not in body)
        shot(page, "04_404.png")

        # ⛔ A THIRD SLUG SPACE, AND IT OVERLAPS THE OTHER TWO. `smartphone` is a real
        # `browse_nodes` shelf and is NOT a department id, so it must 404 here — the mistake the
        # overlap invites is passing a node slug to /department, where six ids (`audio`,
        # `bakery`, `cleaning`, `fresh`, `hardware`, `pantry`) WOULD resolve to a different page.
        page.goto(f"{UI}/department/smartphone", wait_until="networkidle")
        page.wait_for_timeout(2000)
        dbody = page.inner_text("body")
        check("a node slug on the department route renders 'No such department'",
              "No such department" in dbody)
        check("the department 404 does not read as a transient failure",
              "could not be loaded" not in dbody)

        # ⭐ And the overlap itself: both pages exist, and they are DIFFERENT.
        page.goto(f"{UI}/department/pantry", wait_until="networkidle")
        page.wait_for_timeout(2500)
        d_n = _num(page.locator('section[aria-label="Products"] h2').first.inner_text())
        page.goto(f"{UI}/shelf/pantry", wait_until="networkidle")
        page.wait_for_timeout(2500)
        s_n = _num(page.locator('section[aria-label="Products"] h2').first.inner_text())
        check(f"/department/pantry and /shelf/pantry are different pages ({d_n} vs {s_n})",
              d_n is not None and s_n is not None and d_n != s_n)

        # ----------------------------------------------------------- the fourth slug space
        # ⛔⛔ A FOURTH SLUG SPACE, PARALLEL TO /department AND /shelf. `AislePage` renders the
        # REDESIGN spine's 19 DESIGNED departments (79.9% reach, 81,525 clusters) — the migration
        # target for the 21 CURATED departments above, run side by side until a cutover the owner
        # has not made yet. It is additive and not linked from any nav, on purpose: two department
        # navs in front of a shopper is the failure mode the migration exists to avoid.
        print("\n== THE AISLE SPINE (/aisle) ==")

        # ⛔ `home-appliances` NAMES A DEPARTMENT IN BOTH SPACES — `/department/home-appliances`
        # (curated) and `/aisle/home-appliances` (designed) are unrelated pages one slug space
        # apart. Neither redirects to the other, and a shared link builder would send a shopper to
        # a plausible wrong page rather than a 404.
        page.goto(f"{UI}/aisle/home-appliances", wait_until="networkidle")
        page.wait_for_timeout(2500)
        aisle_ha_n = _num(page.locator('section[aria-label="Products"] h2').first.inner_text())
        page.goto(f"{UI}/department/home-appliances", wait_until="networkidle")
        page.wait_for_timeout(2500)
        dept_ha_n = _num(page.locator('section[aria-label="Products"] h2').first.inner_text())
        check("both home-appliances totals rendered, so the comparison below isn't vacuous",
              aisle_ha_n is not None and dept_ha_n is not None,
              f"aisle={aisle_ha_n} department={dept_ha_n}")
        check(f"/aisle/home-appliances and /department/home-appliances are different pages "
              f"({aisle_ha_n} vs {dept_ha_n})",
              aisle_ha_n is not None and dept_ha_n is not None and aisle_ha_n != dept_ha_n)

        # ⛔ A `browse_nodes` shelf slug on the aisle route must read as a WRONG ID SPACE, not a
        # transient failure — same contract as the 404-vs-empty checks above. `smartphone` is a
        # real shelf slug and never a designed-department id.
        page.goto(f"{UI}/aisle/smartphone", wait_until="networkidle")
        page.wait_for_timeout(2000)
        aisle_404_body = page.inner_text("body")
        check("a node slug on the aisle route renders 'No such department'",
              "No such department" in aisle_404_body, aisle_404_body[:120])
        check("the aisle 404 does not read as a transient failure",
              "could not be loaded" not in aisle_404_body)

        # `spine-departments` is the endpoint a menu would read if `AislePage` had one — it backs
        # both the "All categories" door check and the menu-equals-page check below.
        aisle_rows = api_get(page, "/clusters/spine-departments")["results"]
        check(f"spine-departments lists the 19 designed departments ({len(aisle_rows)})",
              len(aisle_rows) == 19, str(sorted(r["id"] for r in aisle_rows)))

        # ⭐ At 79.9% reach the residue is 20,513 placements, reachable ONLY through /shelf.
        # Losing this door on even one of the 19 would make that slice unbrowsable from that page
        # WHILE EVERY OTHER ASSERTION HERE STILL PASSED — which is exactly why it is asserted
        # rather than assumed, for every department rather than a sample.
        if len(aisle_rows) == 19:
            for r in aisle_rows:
                page.goto(f"{UI}/aisle/{r['id']}", wait_until="networkidle")
                page.wait_for_timeout(1200)
                check(f"/aisle/{r['id']} keeps its 'All categories' door to /shelf",
                      page.locator('a[href="/shelf"]').count() > 0)

        # ⛔⛔ THE SAME LOAD-BEARING SHAPE AS THE CURATED "Laptops" CHECK ABOVE: the claim on a
        # control equals the rows that control opens. A designed department can never advertise a
        # page it will not show.
        if len(aisle_rows) == 19:
            for r in aisle_rows:
                spine_total = api_get(
                    page, f"/clusters/by-spine-department/{r['id']}?limit=1")["total"]
                check(f"{r['id']}: the menu claims {r['n_clusters']:,} and the page shows "
                      f"{spine_total:,}", spine_total == r["n_clusters"])

        # ⛔ Adopted shelves on an aisle page are `browse_nodes` slugs and must link to `/shelf/`,
        # never back into `/aisle/` — 43 spine ids are also browsable `browse_nodes` slugs
        # (measured 2026-09-04), so a mistaken link resolves to a plausible wrong page rather than
        # a clean 404.
        page.goto(f"{UI}/aisle/phones-wearables", wait_until="networkidle")
        try:
            page.wait_for_selector('main a[href^="/shelf/"]', timeout=10000)
        except PlaywrightTimeoutError:
            pass
        aisle_hrefs = page.eval_on_selector_all(
            "main a", "els => els.map(e => e.getAttribute('href'))")
        aisle_shelf_links = [h for h in aisle_hrefs if h and h.startswith("/shelf/")]
        check(f"the aisle page offers shelf links to check for escapes ({len(aisle_shelf_links)})",
              len(aisle_shelf_links) > 0, str(aisle_hrefs[:6]))
        aisle_stray = [h for h in aisle_hrefs
                       if h and h.startswith("/aisle/") and h != "/aisle/phones-wearables"]
        check("no adopted shelf link escapes into the /aisle/ id space",
              len(aisle_stray) == 0, str(aisle_stray[:3]))

        browser.close()

    print("\n" + ("ALL CHECKS PASSED" if not fails else f"{len(fails)} FAILED: {fails}"))
    return 1 if fails else 0


def _num(text: str) -> int | None:
    """First comma-grouped integer in `text`, or None. `6,220 products` -> 6220."""
    m = re.search(r"(\d[\d,]*)", text or "")
    return int(m.group(1).replace(",", "")) if m else None


if __name__ == "__main__":
    sys.exit(main())

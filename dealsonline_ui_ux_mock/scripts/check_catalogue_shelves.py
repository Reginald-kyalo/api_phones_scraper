"""Render-and-assert a catalogue build's aisles and spine shelves on a preview server. Fresh context per page.

Checks, against the captured files (public/demo/navigation.json, shelves/<slug>/*):
  aisle   /aisle/<department>: every family in the navigation is a heading, every family shelf link is present
  shelf   /shelf/<slug>: the product count, the first page's cards in capture order, a later page (pagination,
          across the 100-row file boundary), and that a clicked card opens its product page (h1 = the row's name)
  wiring  (--every-nav) EVERY category a shopper can reach from the menus has products: every /shelf and /browse link
          on the 19 aisle pages and the All-categories page renders at least one product card and never the empty
          state, and every captured comparison category (manifest.json) is linked from an aisle and from /browse

Usage: ALLOW_PUBLIC_CATALOGUE=1 npm run build && npx vite preview --port 4181 --strictPort, then
    ../apienv/bin/python scripts/check_catalogue_shelves.py [--port 4181] [--departments N] [--shelves N]
"""
import argparse
import json
import random
import urllib.parse
from pathlib import Path

from playwright.sync_api import sync_playwright

DEMO = Path(__file__).resolve().parents[1] / "public" / "demo"
PAGE_SIZE = 48          # src/app/lib/listing.ts PAGE_SIZE: what /shelf asks for per page
FILE_ROWS = 100         # shelves/<slug>/products-NNN.json

ap = argparse.ArgumentParser()
ap.add_argument("--port", type=int, default=4181)
ap.add_argument("--departments", type=int, default=6)
ap.add_argument("--shelves", type=int, default=12)
ap.add_argument("--seed", type=int, default=20261024)
ap.add_argument("--every-nav", action="store_true", help="render every linked category page (~1,250 pages, ~15 min)")
args = ap.parse_args()
BASE = f"http://localhost:{args.port}"
rng = random.Random(args.seed)

nav = json.loads((DEMO / "navigation.json").read_text())
ok, fails = [], []


def check(cond, msg):
    (ok if cond else fails).append(("ok   " if cond else "FAIL ") + msg)
    return cond


def shelf_rows(slug, start, n):
    rows = []
    page = start // FILE_ROWS
    while len(rows) < (start % FILE_ROWS) + n:
        path = DEMO / "shelves" / slug / f"products-{page:03d}.json"
        if not path.exists():
            break
        rows.extend(json.loads(path.read_text()))
        page += 1
    return rows[start % FILE_ROWS:start % FILE_ROWS + n]


def name_of(row):
    return (row.get("display_name") or row.get("title") or "").strip()


def wait_cards(pg, want):
    """The SPA renders after the document loads; wait (up to 10 s) for the grid to show `want`."""
    try:
        pg.wait_for_function(
            """(want) => { const a = [...document.querySelectorAll("section[aria-label='Products'] a[href^='/prices/']")]
                 .map(e => decodeURIComponent(e.getAttribute('href').slice(8))); return a.length === want.length && a.every((x, i) => x === want[i]); }""",
            arg=want, timeout=10_000)
    except Exception:
        pass
    return card_hrefs(pg)


def card_hrefs(pg):
    return pg.locator("section[aria-label='Products'] a[href^='/prices/']").evaluate_all(
        "els => els.map(e => decodeURIComponent(e.getAttribute('href').slice('/prices/'.length)))")


EMPTY_TEXTS = ("No products listed in this category yet", "No products found", "Category not found")


def check_every_nav(browser):
    """Every category link the aisles and /browse show leads to a page with products on it."""
    manifest = json.loads((DEMO / "manifest.json").read_text())
    ctx = browser.new_context(viewport={"width": 1280, "height": 1600})
    pg = ctx.new_page()
    linked, from_aisle, from_index = {}, set(), set()
    pages = [f"/aisle/{d['slug']}" for d in nav["departments"]] + ["/browse"]
    for src in pages:
        pg.goto(f"{BASE}{src}", wait_until="domcontentloaded")
        pg.wait_for_selector("h1.page-title", timeout=15_000)
        try:
            pg.wait_for_selector("a[href^='/browse/'], a[href^='/shelf/']", timeout=10_000)
        except Exception:
            pass
        for href in pg.locator("main a[href^='/shelf/'], main a[href^='/browse/']").evaluate_all(
                "els => els.map(e => e.getAttribute('href'))"):
            href = href.split("#")[0]
            linked.setdefault(href, src)
            (from_aisle if src.startswith("/aisle/") else from_index).add(href)
    for cat in manifest["categories"]:
        check(f"/browse/{cat['slug']}" in from_aisle, f"wiring: comparison category /browse/{cat['slug']} linked from an aisle")
        check(f"/browse/{cat['slug']}" in from_index, f"wiring: comparison category /browse/{cat['slug']} linked from /browse")
    empty = 0
    for href, src in sorted(linked.items()):
        pg.goto(f"{BASE}{href}", wait_until="domcontentloaded")
        try:
            pg.wait_for_selector("main a[href^='/prices/']", timeout=12_000)
        except Exception:
            pass
        n_cards = pg.locator("main a[href^='/prices/']").count()
        blank = sum(pg.get_by_text(t, exact=False).count() for t in EMPTY_TEXTS)
        if not check(n_cards > 0 and not blank, f"wiring: {href} (linked from {src}) shows products ({n_cards} cards)"):
            empty += 1
    ok.append(f"note wiring: {len(linked)} category links from {len(pages)} pages, {empty} without products")
    ctx.close()


# Aisles: the biggest department, the smallest, and a random sample in between.
departments = nav["departments"]
picked = {departments[0]["slug"], departments[-1]["slug"]}
picked.update(d["slug"] for d in rng.sample(departments, min(len(departments), args.departments)))
shelf_pool = {}
with sync_playwright() as p:
    browser = p.chromium.launch()

    def page():
        ctx = browser.new_context(viewport={"width": 1280, "height": 1600})
        return ctx, ctx.new_page()

    for dept in [d for d in departments if d["slug"] in picked]:
        ctx, pg = page()
        pg.goto(f"{BASE}/aisle/{dept['slug']}", wait_until="domcontentloaded")
        pg.wait_for_selector("h2.section-title", timeout=15_000)
        headings = [h.strip() for h in pg.locator("main h2, h2.section-title").all_inner_texts()]
        links = set(pg.locator("a[href^='/shelf/']").evaluate_all("els => els.map(e => e.getAttribute('href'))"))
        for fam in dept["families"]:
            check(any(h.startswith(fam["name"]) for h in headings), f"aisle {dept['slug']}: family heading '{fam['name']}'")
            check(f"/shelf/{fam['slug']}" in links, f"aisle {dept['slug']}: family page link /shelf/{fam['slug']}")
            for leaf in fam["leaves"]:
                if not check(f"/shelf/{leaf['slug']}" in links, f"aisle {dept['slug']}: leaf link /shelf/{leaf['slug']}"):
                    continue
                shelf_pool[leaf["slug"]] = leaf
            shelf_pool.setdefault(fam["slug"], fam)
        if dept["n_clusters_subtree"]:
            check(f"/shelf/{dept['slug']}" in links, f"aisle {dept['slug']}: department page link")
            shelf_pool.setdefault(dept["slug"], dept)
        ok.append(f"note aisle {dept['slug']}: {len(dept['families'])} families, "
                  f"{sum(len(f['leaves']) for f in dept['families'])} leaves")
        ctx.close()

    # Shelves: the biggest leaf (for deep pagination) plus a random sample of leaves, families and departments.
    leaves = [s for s in shelf_pool if json.loads((DEMO / "shelves" / s / "meta.json").read_text())["total"] > 0]
    biggest = max(leaves, key=lambda s: shelf_pool[s]["n_clusters_subtree"])
    sample = [biggest] + rng.sample([s for s in leaves if s != biggest], min(len(leaves) - 1, args.shelves - 1))
    products_opened = 0
    for slug in sample:
        meta = json.loads((DEMO / "shelves" / slug / "meta.json").read_text())
        ctx, pg = page()
        pg.goto(f"{BASE}/shelf/{slug}", wait_until="domcontentloaded")
        want = [r["cluster_id"] for r in shelf_rows(slug, 0, PAGE_SIZE)]
        wait_cards(pg, want)
        h1 = pg.locator("h1.page-title").first.inner_text().strip()
        check(h1 != slug, f"shelf {slug}: titled '{h1}'")
        count_text = f"{meta['total']:,} product" + ("" if meta["total"] == 1 else "s")
        check(pg.get_by_text(count_text, exact=True).count() > 0, f"shelf {slug}: says '{count_text}'")
        got = wait_cards(pg, want)
        check(got == want, f"shelf {slug}: page 1 cards = capture order ({len(got)} cards)")
        pages = -(-meta["total"] // PAGE_SIZE)
        if pages >= 3:
            pg.goto(f"{BASE}/shelf/{slug}?page=3", wait_until="domcontentloaded")   # rows 96-143: crosses a file
            want3 = [r["cluster_id"] for r in shelf_rows(slug, 2 * PAGE_SIZE, PAGE_SIZE)]
            check(wait_cards(pg, want3) == want3, f"shelf {slug}: page 3 cards = capture rows 96-{96 + len(want3) - 1}")
            pg.goto(f"{BASE}/shelf/{slug}", wait_until="domcontentloaded")
        if pages >= 2:
            wait_cards(pg, want)
            pg.locator("nav[aria-label='Pages'] button").get_by_text("2", exact=True).first.click()
            want2 = [r["cluster_id"] for r in shelf_rows(slug, PAGE_SIZE, PAGE_SIZE)]
            check(wait_cards(pg, want2) == want2 and "page=2" in pg.url, f"shelf {slug}: Pagination click -> page 2 ({len(want2)} cards)")
            pg.goto(f"{BASE}/shelf/{slug}", wait_until="domcontentloaded")
        # Open up to two products from the page: the first card and one at random.
        rows = shelf_rows(slug, 0, PAGE_SIZE)
        chosen = {r["cluster_id"]: r for r in ([rows[0], rng.choice(rows)] if rows else [])}
        for row in chosen.values():
            pg.goto(f"{BASE}/shelf/{slug}", wait_until="domcontentloaded")
            wait_cards(pg, want)
            href = "/prices/" + urllib.parse.quote(row["cluster_id"], safe="-_.!~*'()")  # = encodeURIComponent
            card = pg.locator(f'section[aria-label="Products"] a[href="{href}"]').first
            card.click()
            pg.wait_for_url("**/prices/**")
            try:   # the product page is a lazy chunk + a detail fetch
                pg.wait_for_function("(name) => [...document.querySelectorAll('h1.page-title')].some(h => h.innerText.trim().toLowerCase() === name)",
                                     arg=name_of(row).lower(), timeout=10_000)
            except Exception:
                pass
            title = pg.locator("h1.page-title").first.inner_text().strip() if pg.locator("h1.page-title").count() else ""
            missing = pg.get_by_text("couldn't find", exact=False).count() + pg.get_by_text("not found", exact=False).count()
            check(bool(title) and not missing and title.lower() == name_of(row).lower(),
                  f"shelf {slug}: card '{name_of(row)[:50]}' opens its page (h1 '{title[:50]}')")
            products_opened += 1
        ctx.close()
    if args.every_nav:
        check_every_nav(browser)
    browser.close()

print("\n".join(ok + fails))
print(f"\n{len(picked)} aisles, {len(sample)} shelves, {products_opened} products opened: "
      f"{sum(1 for o in ok if o.startswith('ok'))} ok, {len(fails)} failed")

if fails:
    raise SystemExit(1)

"""Render-and-assert catalogue-capture product pages on a preview server (:4180). Fresh context per page.

Usage: npm run build (ALLOW_PUBLIC_CATALOGUE=1, local only) && npx vite preview --port 4180, then
    ../apienv/bin/python scripts/check_catalogue_pages.py <screenshot dir> <cluster_id>...
"""
import json, sys, glob, urllib.parse
from pathlib import Path
from playwright.sync_api import sync_playwright

DEMO = Path.home() / ".cache/phones_scraper_agents/wt-storefront-catalogue/dealsonline_ui_ux_mock/public/demo/clusters"
OUT = Path(sys.argv[1])
IDS = sys.argv[2:]
views = {}
for f in glob.glob(str(DEMO / "*.json")):
    d = json.load(open(f))
    for k in IDS:
        if k in d:
            views[k] = d[k]

fails, notes = [], []


def check(cond, msg):
    (notes if cond else fails).append(("ok  " if cond else "FAIL") + " " + msg)


with sync_playwright() as p:
    b = p.chromium.launch()
    for cid in IDS:
        v = views.get(cid)
        if not v:
            fails.append(f"FAIL {cid}: not in the captured dataset")
            continue
        ctx = b.new_context(viewport={"width": 1280, "height": 1800})
        pg = ctx.new_page()
        pg.goto(f"http://localhost:4180/prices/{urllib.parse.quote(cid, safe=':+~')}", wait_until="networkidle")
        h1 = pg.locator("h1.page-title").inner_text().strip()
        check(h1.lower() == (v.get("display_name") or v["title"]).lower(), f"{cid}: h1 '{h1}' vs display_name '{v.get('display_name')}'")
        configs = [c for c in v["configs"] if any((o or {}).get("price") for o in (c.get("by_store") or {}).values())]
        chips = pg.locator("[role=radiogroup][aria-label='Choose version'] [role=radio]")
        n = chips.count()
        labels = [chips.nth(i).inner_text().strip() for i in range(n)]
        check(all(lbl and lbl != "—" for lbl in labels), f"{cid}: no bare dash chip ({labels[:6]}…)")
        if len(configs) > 1:
            check(n == len(configs) + 1, f"{cid}: {n} chips for {len(configs)} priced versions + All")
        for i in range(min(n - 1, 3)) if n > 1 else []:
            chips.nth(i).click()
            pg.wait_for_timeout(300)
            label = labels[i]
            cfg = next(c for c in configs if c["facet_label"] == label)
            sub = pg.locator("h1.page-title + p").first.inner_text().strip()
            check(sub == label, f"{cid} [{label}]: subtitle '{sub}'")
            img = pg.locator("img").evaluate_all("els => els.map(e => e.getAttribute('src'))")
            if cfg.get("image"):
                if cfg["image"] in img:
                    check(True, f"{cid} [{label}]: shows its own image")
                elif pg.get_by_text("Image unavailable").count():
                    notes.append(f"WARN {cid} [{label}]: its own image was REQUESTED and the host refused it: {cfg['image'][:70]}")
                else:
                    check(False, f"{cid} [{label}]: shows its own image")
            rows = pg.locator("ul[aria-label$=' prices'] > li").count()
            priced = sum(1 for o in (cfg.get("by_store") or {}).values() if (o or {}).get("price"))
            check(rows == priced, f"{cid} [{label}]: {rows} price rows vs {priced} priced stores")
            has_hist = pg.locator("#price-history").count() > 0
            ph = [x for x in (cfg.get("price_history") or []) if x["price"] >= 1]
            med = sorted(x["price"] for x in ph)[len(ph) // 2] if ph else 0
            want = len({x["t"] for x in ph if med / 5 <= x["price"] <= med * 5}) >= 2   # usablePriceHistory
            check(has_hist == want, f"{cid} [{label}]: history shown={has_hist} expected={want}")
            pg.screenshot(path=str(OUT / f"{cid.replace(':', '_').replace('+', '-')}_{i}.png"), full_page=False)
        if n > 1:
            chips.nth(n - 1).click()
            pg.wait_for_timeout(300)
            check(pg.locator("#price-history").count() == 0, f"{cid} [All versions]: no mixed-version history chart")
        ctx.close()
    b.close()

print("\n".join(notes + fails))
print(f"\n{len(notes)} ok, {len(fails)} failed")

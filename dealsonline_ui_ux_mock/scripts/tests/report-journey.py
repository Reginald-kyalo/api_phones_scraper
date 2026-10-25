#!/usr/bin/env python3
"""Browser journey for the report dialog's acknowledgement and retry behaviour.

Everything is synthetic: the catalogue detail and manifest AND `/api/reports`
are intercepted with Playwright route handlers, so no real endpoint is called
and no report is ever stored. Requires a dev server built for the API read mode:

    VITE_CATALOGUE=api npx vite --port 5199        # from dealsonline_ui_ux_mock/
    UI_BASE=http://localhost:5199 \
      /path/to/apienv/bin/python scripts/tests/report-journey.py

Asserts relationships, not copy-of-copy: success is only shown for a receipt
bearing the request's own key; a lost response is retried under the SAME key
and the "server" still holds exactly one report; an edit gets a NEW key and a
warning; invalid receipts, HTML 200s and arbitrary JSON never show success.
"""
import json
import os
import sys
import uuid

from playwright.sync_api import sync_playwright

UI = os.environ.get("UI_BASE", "http://localhost:5199").rstrip("/")
URL = f"{UI}/prices/synthetic-1"
SUCCESS = "Report received. Thank you."
FAILURE = "We couldn’t save your report. Your text is still here. Try again."

fails: list[str] = []


def check(name, cond, detail=""):
    print(("  PASS  " if cond else "  FAIL  ") + name + (f"   {detail}" if detail else ""))
    if not cond:
        fails.append(name)


def offer(price):
    return {"price": price, "url": "https://shop.example/p", "title": "Synthetic Phone"}


DETAIL = {
    "cluster_id": "synthetic-1", "title": "Synthetic Phone", "display_name": "Synthetic Phone",
    "representative_title": "Synthetic Phone", "category": "smartphones", "primary_facet": "storage",
    "spec_facets": {}, "comparison_grade": True, "brand": "Synthetic", "canonical_name": "Synthetic Phone",
    "n_listings": 4, "n_stores": 3, "stores": ["alpha", "beta", "gamma"], "is_multi_store": True,
    "best_price": 20000, "cheapest_store": "alpha", "condition_basis": "new", "n_confident": 3,
    "n_likely_used": 0, "likely_used_best_price": None, "n_used": 0, "used_best_price": None,
    "like_for_like_spread_pct": 10, "cross_store_spread_pct": 10, "data_warning": None,
    "best_by_store": {"alpha": offer(20000), "beta": offer(21000), "gamma": offer(22000)},
    "configs": [
        {"facet_label": "128GB", "facet_value": 128, "storage_gb": 128, "best_price": 20000,
         "cheapest_store": "alpha", "n_stores": 2, "n_stores_priced": 2, "spread_pct": 5,
         "by_store": {"alpha": offer(20000), "beta": offer(21000)}},
        {"facet_label": "256GB", "facet_value": 256, "storage_gb": 256, "best_price": 25000,
         "cheapest_store": "gamma", "n_stores": 3, "n_stores_priced": 3, "spread_pct": 8,
         "by_store": {"alpha": offer(26000), "beta": offer(27000), "gamma": offer(25000)}},
    ],
    "mvp_n_merged": 1,
}
MANIFEST = {"captured_at": "2026-10-01T00:00:00Z", "total_clusters": 1, "multi_store_clusters": 1,
            "total_stores": 3, "deals": {"count": 0}, "categories": []}


class FakeReports:
    """A server stand-in. Committed reports are keyed, so a replay is visible."""

    def __init__(self):
        self.mode = "ok"            # ok | lose-first | conflict | unavailable | other-key | html | json
        self.committed: dict[str, dict] = {}
        self.requests: list[dict] = []
        self.lost_once = False
        self.status_requests: list[str] = []
        self.report_status = "received"
        self.outcome = None

    def status(self, route, request):
        """GET /api/reports/<id>: only the four public fields."""
        rid = request.url.rsplit("/", 1)[-1]
        self.status_requests.append(rid)
        if rid == "r-missing":
            return route.fulfill(status=404, content_type="application/json",
                                 body='{"error":"report not found"}', headers={"cache-control": "no-store"})
        body = {"ok": True, "report_id": rid, "status": self.report_status,
                "outcome": self.outcome, "status_updated_at": None}
        return route.fulfill(status=200, content_type="application/json", body=json.dumps(body),
                             headers={"cache-control": "no-store"})

    def handle(self, route, request):
        key = request.headers.get("idempotency-key")
        body = json.loads(request.post_data or "{}")
        self.requests.append({"key": key, "body": body})
        receipt = lambda k: {"ok": True, "report_id": f"r-{len(self.committed)}", "submission_key": k}
        hdr = {"cache-control": "no-store"}
        if self.mode == "html":
            return route.fulfill(status=200, content_type="text/html", body="<!doctype html><html></html>")
        if self.mode == "json":
            return route.fulfill(status=200, content_type="application/json", body='{"hello":"world"}')
        if self.mode == "other-key":
            return route.fulfill(status=201, content_type="application/json",
                                 body=json.dumps(receipt(str(uuid.uuid4()))))
        if self.mode == "conflict":
            return route.fulfill(status=409, content_type="application/json", body='{"ok":false}')
        if self.mode == "unavailable":
            return route.fulfill(status=503, content_type="application/json", body='{"ok":false}',
                                 headers={**hdr, "retry-after": "2"})
        replay = key in self.committed
        if not replay:
            self.committed[key] = body
        if self.mode == "lose-first" and not self.lost_once:
            self.lost_once = True
            return route.abort("connectionreset")   # committed, but the browser never hears
        return route.fulfill(status=200 if replay else 201, content_type="application/json",
                             body=json.dumps(receipt(key)), headers=hdr)


def open_dialog(page, server, theme):
    page.add_init_script(f"try{{localStorage.setItem('theme','{theme}')}}catch(e){{}}")
    page.route("**/api/reports", server.handle)
    page.route("**/api/reports/*", server.status)
    # Later routes win in Playwright, so the catch-all goes first.
    page.route("**/api/catalogue/**", lambda r: r.fulfill(status=404, json={}))
    page.route("**/api/catalogue/detail*", lambda r: r.fulfill(json=DETAIL))
    page.route("**/api/catalogue/manifest*", lambda r: r.fulfill(json=MANIFEST))
    page.goto(URL)
    page.get_by_role("button", name="Report a problem").click()
    page.get_by_role("dialog").wait_for()


def pick_reason(page, label="Incorrect price"):
    page.get_by_label(label).check()


def send(page):
    page.get_by_role("button", name="Send report").or_(page.get_by_role("button", name="Try again")).click()


def run(pw, theme):
    print(f"== {theme} theme")
    browser = pw.chromium.launch()

    def fresh(mode):
        ctx = browser.new_context()
        page = ctx.new_page()
        server = FakeReports()
        server.mode = mode
        open_dialog(page, server, theme)
        return ctx, page, server

    # 1. Keyboard-only completion, 201.
    ctx, page, server = fresh("ok")
    check(f"[{theme}] dark class matches theme",
          page.evaluate("document.documentElement.classList.contains('dark')") == (theme == "dark"))
    page.get_by_label("Incorrect price").focus()
    page.keyboard.press("Space")
    page.keyboard.press("Tab")                       # shop select or details
    page.get_by_label("Details (optional)").focus()
    page.keyboard.type("keyboard only")
    page.keyboard.press("Tab"); page.keyboard.press("Tab")   # Cancel -> Send
    focused = page.evaluate("document.activeElement.textContent")
    check(f"[{theme}] keyboard reaches Send report", "Send report" in (focused or ""), focused)
    page.keyboard.press("Enter")
    page.get_by_text(SUCCESS).wait_for()
    check(f"[{theme}] success shown after a valid receipt", True)
    req = server.requests[0]
    check(f"[{theme}] request carries a UUID Idempotency-Key", len(req["key"] or "") == 36)
    check(f"[{theme}] explicit version field is the selected configuration", req["body"]["version"] == "256GB",
          str(req["body"].get("version")))
    check(f"[{theme}] title keeps the human-readable version", req["body"]["title"].endswith("· 256GB"))
    # 1b. The reference: shown, copyable, and linked to a status page.
    check(f"[{theme}] reference is shown after the receipt", page.get_by_text("Your reference: r-1").count() == 1)
    check(f"[{theme}] a copy control is offered", page.get_by_role("button", name="Copy reference").count() == 1)
    link = page.get_by_role("link", name="Check this report’s status")
    check(f"[{theme}] link points at /report/<id>", (link.get_attribute("href") or "").endswith("/report/r-1"),
          str(link.get_attribute("href")))
    link.click()
    page.get_by_text("Report status", exact=True).wait_for()
    page.get_by_text("We have not reviewed this yet.").wait_for()
    check(f"[{theme}] status page shows Received, reached", page.get_by_role("listitem").filter(has_text="Received").get_attribute("aria-current") == "step")
    check(f"[{theme}] Reviewed and Resolved are not yet reached",
          page.get_by_role("listitem").filter(has_text="Resolved").get_attribute("aria-current") is None)
    check(f"[{theme}] dialog closed on navigation", page.get_by_role("dialog").count() == 0)
    check(f"[{theme}] status page asked for the id only", server.status_requests == ["r-1"], str(server.status_requests))
    # An operator outcome is shown verbatim, and Resolved becomes the current step.
    server.report_status, server.outcome = "resolved", "We split the two listings."
    page.reload()
    page.get_by_text("We split the two listings.").wait_for()
    check(f"[{theme}] outcome shown, no 'not reviewed' line", page.get_by_text("We have not reviewed this yet.").count() == 0)
    check(f"[{theme}] Resolved is the current step",
          page.get_by_role("listitem").filter(has_text="Resolved").get_attribute("aria-current") == "step")
    # An unknown reference.
    page.goto(f"{UI}/report/r-missing")
    page.get_by_text("We couldn’t find a report with that reference.").wait_for()
    check(f"[{theme}] unknown reference says so", True)
    ctx.close()

    # 2. Response lost after commit -> retry same key -> one stored report.
    ctx, page, server = fresh("lose-first")
    pick_reason(page); page.get_by_label("Details (optional)").fill("price is wrong")
    send(page)
    page.get_by_text(FAILURE).wait_for()
    check(f"[{theme}] lost response: failure copy, no success", page.get_by_text(SUCCESS).count() == 0)
    check("[%s] text kept after failure" % theme, page.get_by_label("Details (optional)").input_value() == "price is wrong")
    check(f"[{theme}] failure is announced (role=alert)", page.get_by_role("alert").count() == 1)
    send(page)
    page.get_by_text(SUCCESS).wait_for()
    keys = [r["key"] for r in server.requests]
    check(f"[{theme}] retry reused the same key", len(keys) == 2 and keys[0] == keys[1], str(keys))
    check(f"[{theme}] server holds exactly one report", len(server.committed) == 1, str(len(server.committed)))
    ctx.close()

    # 3. Edit after an uncertain failure -> warning + new key.
    ctx, page, server = fresh("lose-first")
    pick_reason(page); page.get_by_label("Details (optional)").fill("first wording")
    send(page)
    page.get_by_text(FAILURE).wait_for()
    check(f"[{theme}] no edit warning before editing", page.get_by_text("may already have arrived").count() == 0)
    page.get_by_label("Details (optional)").fill("second wording")
    page.get_by_text("may already have arrived").wait_for()
    check(f"[{theme}] editing after an uncertain outcome warns", True)
    send(page)
    page.get_by_text(SUCCESS).wait_for()
    keys = [r["key"] for r in server.requests]
    check(f"[{theme}] edit created a new submission key", keys[0] != keys[1], str(keys))
    check(f"[{theme}] the warned edit is stored as a second report", len(server.committed) == 2, str(len(server.committed)))
    ctx.close()

    # 4. Server says 409 / 503(Retry-After) / invalid receipts.
    for mode, label in (("conflict", "409"), ("html", "HTML 200"), ("json", "arbitrary JSON 200"),
                        ("other-key", "receipt for another key")):
        ctx, page, server = fresh(mode)
        pick_reason(page); send(page)
        page.get_by_text(FAILURE).wait_for()
        check(f"[{theme}] {label}: failure copy and no success", page.get_by_text(SUCCESS).count() == 0)
        ctx.close()

    ctx, page, server = fresh("unavailable")
    pick_reason(page); send(page)
    page.get_by_text(FAILURE).wait_for()
    btn = page.get_by_role("button", name="Try again")
    check(f"[{theme}] 503 Retry-After disables Try again", btn.is_disabled())
    check(f"[{theme}] cooldown is stated", page.get_by_text("You can try again in").count() == 1)
    page.wait_for_timeout(2600)
    check(f"[{theme}] Try again re-enabled after Retry-After", btn.is_enabled())
    page.wait_for_timeout(1500)
    check(f"[{theme}] no automatic retry happened", len(server.requests) == 1, str(len(server.requests)))
    ctx.close()
    browser.close()


with sync_playwright() as pw:
    for theme in ("light", "dark"):
        run(pw, theme)

print(f"\n{len(fails)} failure(s)")
sys.exit(1 if fails else 0)

#!/usr/bin/env python3
"""Download each shop's icon once and serve it from public/shop-icons/.

Hosts are read from the captured dataset (every offer URL), so a new shop in
a re-capture is picked up by re-running this. Icons come from Google's
favicon endpoint at 64px; a host with no real icon (Google returns its
default globe with HTTP 404) is skipped so the UI falls back to an
initial tile.

Writes public/shop-icons/<host>.<ext> and public/shop-icons/index.json
({host: file} for every host that has an icon, read by StoreMark).

Usage: python3 scripts/fetch_shop_icons.py
"""
import glob
import json
import os
import urllib.request
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEMO = os.path.join(ROOT, "public", "demo")
OUT = os.path.join(ROOT, "public", "shop-icons")
# Magic bytes -> extension. Google re-encodes most icons as PNG, but passes
# some through as ICO, GIF or JPEG.
FORMATS = [
    (b"\x89PNG\r\n\x1a\n", "png"),
    (b"\x00\x00\x01\x00", "ico"),
    (b"GIF8", "gif"),
    (b"\xff\xd8\xff", "jpg"),
]
ENDPOINT = "https://www.google.com/s2/favicons?domain={}&sz=64"


def hosts() -> set[str]:
    found = set()
    for path in glob.glob(os.path.join(DEMO, "clusters", "*.json")) + glob.glob(
        os.path.join(DEMO, "shelf-details", "*.json")
    ):
        with open(path) as fh:
            for row in json.load(fh).values():
                for offer in (row.get("best_by_store") or {}).values():
                    host = urlparse((offer or {}).get("url") or "").hostname
                    if host:
                        found.add(host.removeprefix("www."))
    return found


def fetch(host: str) -> bytes:
    with urllib.request.urlopen(ENDPOINT.format(host), timeout=20) as res:
        return res.read()


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    have: dict[str, str] = {}
    for host in sorted(hosts()):
        try:
            body = fetch(host)
        except Exception as exc:  # 404 = no icon (the globe); either way, initial tile
            print(f"skip {host}: {exc}")
            continue
        ext = next((e for magic, e in FORMATS if body.startswith(magic)), None)
        if ext is None:
            print(f"skip {host}: not an image ({body[:8]!r})")
            continue
        name = f"{host}.{ext}"
        with open(os.path.join(OUT, name), "wb") as fh:
            fh.write(body)
        have[host] = name
        print(f"ok   {host} ({len(body)} B)")
    with open(os.path.join(OUT, "index.json"), "w") as fh:
        json.dump(have, fh, indent=1, sort_keys=True)
        fh.write("\n")
    print(f"{len(have)} icons written to {OUT}")


if __name__ == "__main__":
    main()

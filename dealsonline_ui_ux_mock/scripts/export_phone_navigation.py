"""Export the approved phone branch from the authored taxonomy spine.

The checked-in JSON lets static builds avoid depending on a sibling checkout.
Use ``--check`` in repository checks: it renders the release in memory and
exits non-zero rather than modifying a stale generated file.
"""

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

import yaml


DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / "src/app/data/phoneNavigation.json"
PINNED_SOURCE_COMMIT = "e5e36c9cdd28c5e983c2a810b192b13361fbec4e"
SHORTCUTS = (
    {"id": "iphones", "label": "iPhones", "parentId": "smartphones", "kind": "shortcut", "synonyms": []},
    {"id": "ipads", "label": "iPads", "parentId": "tablets", "kind": "shortcut", "synonyms": []},
)


class NavigationError(ValueError):
    """The authored navigation cannot form a safe category tree."""


def _validate(nodes: list[dict[str, Any]]) -> None:
    by_id: dict[str, dict[str, Any]] = {}
    for node in nodes:
        node_id = node["id"]
        if node_id in by_id:
            raise NavigationError(f"duplicate navigation id: {node_id}")
        by_id[node_id] = node

    for node in nodes:
        parent_id = node["parentId"]
        if parent_id is not None and parent_id not in by_id:
            raise NavigationError(f"missing parent {parent_id!r} for {node['id']!r}")
        if node["kind"] == "shortcut" and (
            parent_id is None or by_id[parent_id]["kind"] != "category"
        ):
            raise NavigationError(
                f"shortcut {node['id']!r} must have a canonical category parent"
            )

    for node in nodes:
        seen: set[str] = set()
        current: str | None = node["id"]
        while current is not None:
            if current in seen:
                raise NavigationError(f"category cycle involving {current!r}")
            seen.add(current)
            current = by_id[current]["parentId"]


def build_release(content: bytes, source_commit: str = PINNED_SOURCE_COMMIT) -> dict[str, Any]:
    spine = yaml.safe_load(content)
    if not isinstance(spine, dict) or not isinstance(spine.get("nodes"), list):
        raise NavigationError("source must contain a nodes list")

    source_rows = spine["nodes"]
    source_ids: set[str] = set()
    for row in source_rows:
        if not isinstance(row, dict) or not isinstance(row.get("slug"), str):
            raise NavigationError("every source node must have a string slug")
        if row["slug"] in source_ids:
            raise NavigationError(f"duplicate source id: {row['slug']}")
        source_ids.add(row["slug"])

    # Do not filter leaf nodes by product count: approved empty categories are
    # part of the navigation contract and must remain in generated output.
    nodes = [
        {
            "id": row["slug"],
            "label": row["name"],
            "parentId": row["parent_slug"],
            "kind": "category",
            "synonyms": row.get("synonyms", []),
        }
        for row in source_rows
        if row.get("department") == "phones-wearables"
    ]
    # Validate the authored branch before adding local shortcuts so an invalid
    # source reports its own defect rather than a shortcut's missing parent.
    _validate(nodes)
    nodes.extend(dict(shortcut) for shortcut in SHORTCUTS)
    _validate(nodes)
    return {
        "source_commit": source_commit,
        "source_sha256": hashlib.sha256(content).hexdigest(),
        "nodes": nodes,
    }


def render_release(content: bytes, source_commit: str = PINNED_SOURCE_COMMIT) -> str:
    return json.dumps(build_release(content, source_commit), ensure_ascii=False, indent=2) + "\n"


def export(source: Path, output: Path, source_commit: str, check: bool = False) -> None:
    rendered = render_release(source.read_bytes(), source_commit)
    if check:
        if not output.exists() or output.read_text() != rendered:
            raise SystemExit(
                f"{output} is stale; regenerate it from phones_scraper {source_commit}"
            )
        return
    output.write_text(rendered)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--source-commit", default=PINNED_SOURCE_COMMIT)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    export(args.source, args.output, args.source_commit, args.check)

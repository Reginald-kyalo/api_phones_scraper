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
DEFAULT_SOURCE = Path(__file__).resolve().parents[1] / "data/phone-navigation/taxonomy_spine.yaml"
PINNED_SOURCE_COMMIT = "e5e36c9cdd28c5e983c2a810b192b13361fbec4e"
PINNED_SOURCE_SHA256 = "7fb474cade66b3c89c7b6037e7fcc1ab9d2b9a7fa3966d40ec2838c2a715f598"
SHORTCUTS = (
    {"id": "iphones", "label": "iPhones", "parentId": "smartphones", "kind": "shortcut", "synonyms": []},
    {"id": "ipads", "label": "iPads", "parentId": "tablets", "kind": "shortcut", "synonyms": []},
)
ROOT_ID = "phones-wearables"


class NavigationError(ValueError):
    """The authored navigation cannot form a safe category tree."""


def _validate(nodes: list[dict[str, Any]]) -> None:
    by_id: dict[str, dict[str, Any]] = {}
    for node in nodes:
        if not isinstance(node, dict):
            raise NavigationError("every navigation node must be an object")
        node_id = node.get("id")
        if not isinstance(node_id, str) or not node_id.strip():
            raise NavigationError("every navigation node must have a non-empty string id")
        if not isinstance(node.get("label"), str) or not node["label"].strip():
            raise NavigationError(f"navigation node {node_id!r} must have a non-empty string label")
        if node.get("kind") not in {"category", "shortcut"}:
            raise NavigationError(f"navigation node {node_id!r} has an invalid kind")
        parent_id = node.get("parentId")
        if parent_id is not None and (not isinstance(parent_id, str) or not parent_id.strip()):
            raise NavigationError(f"navigation node {node_id!r} has an invalid parentId")
        synonyms = node.get("synonyms")
        if not isinstance(synonyms, list) or any(not isinstance(value, str) for value in synonyms):
            raise NavigationError(f"navigation node {node_id!r} must have string synonyms")
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
    roots = [node["id"] for node in nodes if node["parentId"] is None]
    if roots != [ROOT_ID]:
        raise NavigationError(f"navigation must have exactly one {ROOT_ID!r} root")

    for node in nodes:
        current = node["id"]
        while by_id[current]["parentId"] is not None:
            current = by_id[current]["parentId"]
        if current != ROOT_ID:
            raise NavigationError(f"navigation node {node['id']!r} is not reachable from {ROOT_ID!r}")


def build_release(content: bytes, source_commit: str = PINNED_SOURCE_COMMIT) -> dict[str, Any]:
    source_sha256 = hashlib.sha256(content).hexdigest()
    if source_commit == PINNED_SOURCE_COMMIT and source_sha256 != PINNED_SOURCE_SHA256:
        raise NavigationError(
            f"source bytes do not match pinned phones_scraper commit {PINNED_SOURCE_COMMIT}"
        )
    spine = yaml.safe_load(content)
    if not isinstance(spine, dict) or not isinstance(spine.get("nodes"), list):
        raise NavigationError("source must contain a nodes list")

    source_rows = spine["nodes"]
    source_ids: set[str] = set()
    for row in source_rows:
        if not isinstance(row, dict) or not isinstance(row.get("slug"), str) or not row["slug"].strip():
            raise NavigationError("every source node must have a non-empty string slug")
        if row["slug"] in source_ids:
            raise NavigationError(f"duplicate source id: {row['slug']}")
        source_ids.add(row["slug"])

    # Do not filter leaf nodes by product count: approved empty categories are
    # part of the navigation contract and must remain in generated output.
    nodes = []
    for row in source_rows:
        if row.get("department") != ROOT_ID:
            continue
        nodes.append({
            "id": row["slug"],
            "label": row.get("name"),
            "parentId": row.get("parent_slug"),
            "kind": "category",
            "synonyms": row.get("synonyms", []),
        })
    # Validate the authored branch before adding local shortcuts so an invalid
    # source reports its own defect rather than a shortcut's missing parent.
    _validate(nodes)
    nodes.extend(dict(shortcut) for shortcut in SHORTCUTS)
    _validate(nodes)
    return {
        "source_commit": source_commit,
        "source_sha256": source_sha256,
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
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--source-commit", default=PINNED_SOURCE_COMMIT)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    export(args.source, args.output, args.source_commit, args.check)

"""Export the reviewed phone branch from the authored taxonomy spine.

Usage: python3 scripts/export_phone_navigation.py --source /path/to/taxonomy_spine.yaml
The JSON is checked in so static builds do not depend on the sibling checkout.
"""

import argparse
import hashlib
import json
from pathlib import Path

import yaml


DEFAULT_OUTPUT = Path(__file__).resolve().parents[1] / "src/app/data/phoneNavigation.json"


def export(source: Path, output: Path) -> None:
    content = source.read_bytes()
    spine = yaml.safe_load(content)
    nodes = [
        {
            "id": row["slug"],
            "label": row["name"],
            "parentId": row["parent_slug"],
            "kind": "category",
            "synonyms": row.get("synonyms", []),
        }
        for row in spine["nodes"]
        if row["department"] == "phones-wearables"
    ]
    # Brand shortcuts express shopper intent. They are not product assignments.
    nodes.extend([
        {"id": "iphones", "label": "iPhones", "parentId": "smartphones", "kind": "shortcut", "synonyms": []},
        {"id": "ipads", "label": "iPads", "parentId": "tablets", "kind": "shortcut", "synonyms": []},
    ])
    release = {"source_sha256": hashlib.sha256(content).hexdigest(), "nodes": nodes}
    output.write_text(json.dumps(release, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    export(args.source, args.output)

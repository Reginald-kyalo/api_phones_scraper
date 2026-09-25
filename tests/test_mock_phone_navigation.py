"""Contract for the reviewed Phones, Tablets & Wearables navigation release."""

import json
import importlib.util
from pathlib import Path

import pytest
import yaml


DATA = Path(__file__).resolve().parents[1] / "dealsonline_ui_ux_mock/src/app/data/phoneNavigation.json"
EXPORTER = DATA.parents[3] / "scripts/export_phone_navigation.py"
PINNED_COMMIT = "e5e36c9cdd28c5e983c2a810b192b13361fbec4e"
PINNED_SHA256 = "7fb474cade66b3c89c7b6037e7fcc1ab9d2b9a7fa3966d40ec2838c2a715f598"

spec = importlib.util.spec_from_file_location("export_phone_navigation", EXPORTER)
exporter = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(exporter)


def source_bytes(nodes):
    return yaml.safe_dump({"nodes": nodes}, sort_keys=False).encode()


def row(slug, parent=None, *, department="phones-wearables", name=None, count=None):
    value = {
        "slug": slug,
        "name": name or slug.replace("-", " ").title(),
        "parent_slug": parent,
        "department": department,
    }
    if count is not None:
        value["count"] = count
    return value


def test_phone_navigation_has_distinct_types_and_brand_shortcuts():
    release = json.loads(DATA.read_text())
    assert release["source_commit"] == PINNED_COMMIT
    assert release["source_sha256"] == PINNED_SHA256
    nodes = {node["id"]: node for node in release["nodes"]}
    assert len(nodes) == len(release["nodes"])
    assert nodes["mobile-phones"]["parentId"] == "phones-wearables"
    assert nodes["tablets-e-readers"]["parentId"] == "phones-wearables"
    assert nodes["iphones"]["parentId"] == "smartphones"
    assert nodes["ipads"]["parentId"] == "tablets"
    assert nodes["iphones"]["kind"] == nodes["ipads"]["kind"] == "shortcut"
    assert not {"phone-tablet", "computer-tablet", "iphone-ipad"} & nodes.keys()


def test_phone_navigation_preserves_legacy_category_fallback():
    route_source = (Path(__file__).resolve().parents[1] / "dealsonline_ui_ux_mock/src/app/pages/PhoneCategoryPage.tsx").read_text()
    assert '<Navigate to="/browse" replace />' in route_source


def test_phone_navigation_has_only_valid_parents():
    release = json.loads(DATA.read_text())
    nodes = {node["id"]: node for node in release["nodes"]}
    for node in nodes.values():
        assert node["parentId"] is None or node["parentId"] in nodes
        seen = {node["id"]}
        parent = node["parentId"]
        while parent is not None:
            assert parent not in seen
            seen.add(parent)
            parent = nodes[parent]["parentId"]


def test_exporter_is_repeatable_and_keeps_empty_approved_categories():
    content = source_bytes([
        row("phones-wearables", count=4),
        row("smartphones", "phones-wearables", count=2),
        row("tablets", "phones-wearables", count=0),
    ])
    first = exporter.render_release(content)
    second = exporter.render_release(content)
    assert first == second
    release = json.loads(first)
    assert release["source_commit"] == PINNED_COMMIT
    assert "tablets" in {node["id"] for node in release["nodes"]}


@pytest.mark.parametrize(
    ("nodes", "message"),
    [
        ([row("phones-wearables"), row("phones-wearables")], "duplicate source id"),
        ([row("phones-wearables"), row("smartphones", "missing")], "missing parent"),
        ([row("phones-wearables", "smartphones"), row("smartphones", "phones-wearables")], "cycle"),
    ],
)
def test_exporter_rejects_invalid_source_trees(nodes, message):
    with pytest.raises(exporter.NavigationError, match=message):
        exporter.build_release(source_bytes(nodes))


def test_exporter_rejects_shortcut_with_noncanonical_parent():
    with pytest.raises(exporter.NavigationError, match="canonical category parent"):
        exporter._validate([
            {"id": "first", "parentId": "second", "kind": "shortcut"},
            {"id": "second", "parentId": None, "kind": "shortcut"},
        ])


def test_check_mode_detects_stale_file(tmp_path):
    source = tmp_path / "taxonomy_spine.yaml"
    output = tmp_path / "phoneNavigation.json"
    source.write_bytes(source_bytes([
        row("phones-wearables"),
        row("smartphones", "phones-wearables"),
        row("tablets", "phones-wearables"),
    ]))
    exporter.export(source, output, PINNED_COMMIT)
    exporter.export(source, output, PINNED_COMMIT, check=True)
    output.write_text("{}\n")
    with pytest.raises(SystemExit, match="is stale"):
        exporter.export(source, output, PINNED_COMMIT, check=True)


def test_navigation_contract_separates_categories_from_legacy_collections():
    root = DATA.parents[3]
    taxonomy = (root / "src/app/data/taxonomyTree.ts").read_text()
    directory = (root / "src/app/pages/CatalogueCategoriesPage.tsx").read_text()
    shelf_page = (root / "src/app/pages/DemoShelfPage.tsx").read_text()
    assert "Legacy collection links" in taxonomy
    assert "phoneNavigation.json" in taxonomy
    assert "`/shelf/:slug`" in taxonomy
    assert "Counts below are collection counts" in directory
    assert "may contain mixed product types" in directory
    assert "legacy collection and may contain mixed product types" in shelf_page

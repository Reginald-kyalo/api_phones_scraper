"""Contract for the reviewed Phones, Tablets & Wearables navigation release."""

import json
from pathlib import Path


DATA = Path(__file__).resolve().parents[1] / "dealsonline_ui_ux_mock/src/app/data/phoneNavigation.json"


def test_phone_navigation_has_distinct_types_and_brand_shortcuts():
    release = json.loads(DATA.read_text())
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

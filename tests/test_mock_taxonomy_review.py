"""Static gates for the hand-reviewed home taxonomy batch.

The mock is TypeScript and intentionally consumes the checked-in API capture.
These tests guard the review boundary without introducing a second executable
taxonomy: placements are read from the source table itself.
"""
import json
import re
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).parents[1]
TREE = ROOT / "dealsonline_ui_ux_mock/src/app/data/taxonomyTree.ts"
CAPTURE = ROOT / "dealsonline_ui_ux_mock/src/app/data/liveSpineShelves.ts"
PHONE_NAVIGATION = ROOT / "dealsonline_ui_ux_mock/src/app/data/phoneNavigation.json"
VALIDATION = ROOT / "dealsonline_ui_ux_mock/src/app/data/taxonomyValidation.ts"
REVIEWED = {
    "baby-kids-toys",
    "building-electrical-hardware",
    "cameras-security-surveillance",
    "computing-networking",
    "fashion-accessories",
    "groceries-everyday-essentials",
    "health-beauty-personal-care",
    "home-appliances",
    "home-furniture-decor",
    "kitchen-dining-cookware",
    "office-school-stationery",
    "phones-wearables",
    "power-solar-energy",
    "tv-audio-home-entertainment",
}


def _placement_keys():
    source = TREE.read_text()
    keys = re.findall(r"^  '([^']+)': \{", source, re.MULTILINE)
    for group in re.findall(r"addReviewedGroup\(\[([^\]]*)\]", source):
        keys.extend(re.findall(r"'([^']+)'", group))
    return keys


def _captured_shelves():
    departments = {}
    current = None
    for line in CAPTURE.read_text().splitlines():
        opening = re.match(r'  "([^"]+)": \[', line)
        if opening:
            current = opening.group(1)
            departments[current] = []
            continue
        shelf = re.search(r'slug: "([^"]+)"', line)
        if current and shelf:
            departments[current].append(shelf.group(1))
        if current and line.strip() == "],":
            current = None
    return departments


def test_every_shelf_in_a_reviewed_source_department_has_one_disposition():
    keys = Counter(_placement_keys())
    captured = _captured_shelves()

    for department in REVIEWED:
        assert captured[department], f"capture missing reviewed department {department}"
        assert not [slug for slug in captured[department] if keys[slug] != 1]


def test_reviewed_departments_fail_closed_instead_of_using_keyword_fallbacks():
    source = TREE.read_text()
    for department in REVIEWED:
        assert f"  '{department}'," in source
    assert "Reviewed taxonomy shelf has no disposition" in VALIDATION.read_text()


def test_cleaning_tools_and_consumables_have_one_household_owner():
    source = TREE.read_text()
    expected = {
        "cleaning-household": "cleaning-household-essentials",
        "broom-8a72bd": "cleaning-tools",
        "cloth-peg-ab1381": "laundry-accessories",
        "dish-washing-liquid": "dishwashing",
        "facial-tissue": "household-paper",
        "vacuum-cleaner-steam-mop": "powered-cleaning",
    }
    for slug, family in expected.items():
        row = re.search(rf"^  '{re.escape(slug)}': \{{ ([^\n]+) \}},$", source, re.MULTILINE)
        assert row
        assert "departmentId: 'household-cleaning'" in row.group(1)
        assert f"family: '{family}'" in row.group(1)


def test_small_appliance_intents_are_not_collapsed_into_food_preparation():
    source = TREE.read_text()
    for family in (
        "food-preparation",
        "coffee-hot-drinks",
        "countertop-cooking",
        "breakfast-baking",
        "dessert-ice-making",
    ):
        assert f"family: '{family}'" in source
    assert re.search(
        r"'home-appliance': \{ family: 'home-appliances'", source
    ), "the broad legacy shelf must not be reused as Food Preparation"


def test_pass_two_keeps_baby_and_pet_products_out_of_groceries():
    source = TREE.read_text()
    for slug in ("baby-food", "baby-toddler-formula"):
        assert re.search(
            rf"'{slug}': \{{ departmentId: 'baby-kids-toys'", source
        )
    for slug in ("pet-care", "pet-accessory-toy", "pet-pet-accessory-pet-food"):
        assert re.search(
            rf"'{slug}': \{{ departmentId: 'pet-supplies'", source
        )


def test_live_animals_remain_classifieds_and_are_not_retail_pet_nodes():
    source = TREE.read_text()
    for slug in ("pet", "poultry"):
        row = re.search(rf"^  '{slug}': \{{ ([^\n]+) \}},$", source, re.MULTILINE)
        assert row
        assert "departmentId" not in row.group(1)
        assert "live-pets-livestock" in row.group(1)


def test_evidence_review_resolves_coarse_grocery_shelves_by_stable_intent():
    source = TREE.read_text()
    expected = {
        "food-cupboard": "pantry",
        "fresh": "fresh-food",
        "cooking": "sauces-condiments",
        "healthy-snack-beverage": "nuts-seeds-dried-fruit",
        "ice-cream-dessert": "frozen-desserts",
        "long-life-62b199": "dairy",
    }
    for slug, family in expected.items():
        assert re.search(
            rf"addReviewedGroup\([^\n]*'{re.escape(slug)}'[^\n]*, "
            rf"\{{ family: '{family}'",
            source,
        )


def test_evidence_review_corrects_non_grocery_product_types():
    source = TREE.read_text()
    corrections = {
        "house-hold-d1c761": ("household-cleaning", "dishwashing"),
        "paper-plastic": ("home-furniture-decor", "plastic-housewares"),
        "fire-lighter-match": ("kitchen-dining-cookware", "cooking-fuel-fire-lighting"),
    }
    for slug, (department, family) in corrections.items():
        row = re.search(
            rf"addReviewedGroup\(\[[^\]]*'{re.escape(slug)}'[^\]]*\], ([^\n]+)\);",
            source,
        )
        assert row
        assert f"departmentId: '{department}'" in row.group(1)
        assert f"family: '{family}'" in row.group(1)


def test_grocery_format_and_mislabel_shelves_follow_product_evidence():
    source = TREE.read_text()
    expected = {
        "baking-flour-4d6f18": ("kitchen-dining-cookware", "baking-accessories"),
        "cold-drink": ("kitchen-dining-cookware", "tea-coffee-accessories"),
        "coconut-powder": ("baby-kids-toys", "baby-care"),
        "wipe": ("baby-kids-toys", "baby-care"),
    }
    for slug, (department, family) in expected.items():
        row = re.search(
            rf"addReviewedGroup\(\[[^\]]*'{re.escape(slug)}'[^\]]*\], ([^\n]+)\);",
            source,
        )
        assert row
        assert f"departmentId: '{department}'" in row.group(1)
        assert f"family: '{family}'" in row.group(1)


def test_pantry_families_cover_the_requested_stable_shopper_intents():
    source = TREE.read_text()
    for family in (
        "staples-grains-pulses",
        "flour-baking",
        "breakfast-cereals",
        "oils-fats",
        "herbs-spices-seasonings",
        "sauces-condiments",
        "ready-meals",
    ):
        assert f"family: '{family}'" in source


def test_pass_three_separates_devices_accessories_parts_and_storage():
    source = TREE.read_text()
    for family in (
        "laptops",
        "desktop-computers",
        "computer-accessories",
        "laptop-parts",
        "monitors-displays",
        "networking",
        "storage",
        "phones",
        "mobile-accessories",
        "power-charging",
        "headphones-earbuds",
        "audio-video-accessories",
    ):
        assert f"family: '{family}'" in source


def test_pass_three_corrects_cross_department_electronics_shelves():
    source = TREE.read_text()
    expected = {
        "external-hard-drive": ("computing-networking", "storage"),
        "laptop-tablet": ("computing-networking", "laptops"),
        "screen-replacement": ("computing-networking", "laptop-parts"),
        "accessory-kit": ("cameras-security-surveillance", "content-creation-accessories"),
        "watch-3bab17": ("fashion-accessories", "watches-jewellery"),
    }
    for slug, (department, family) in expected.items():
        assert department in source and family in source
        row = re.search(rf"^  '{re.escape(slug)}': \{{ ([^\n]+) \}},$", source, re.MULTILINE)
        if row:
            assert f"departmentId: '{department}'" in row.group(1)
            assert f"family: '{family}'" in row.group(1)
        else:
            grouped = re.search(
                rf"addReviewedGroup\(\[[^\]]*'{re.escape(slug)}'[^\]]*\], ([^\n]+)\);",
                source,
            )
            assert grouped
            assert f"departmentId: '{department}'" in grouped.group(1)
            assert f"family: '{family}'" in grouped.group(1)


def test_pass_three_deep_review_uses_product_type_over_source_label():
    source = TREE.read_text()
    expected_family = {
        "telephony-computing-networking": "laptops",
        "computer-accessory-component": "computer-parts-components",
        "point-sale-retail-technology": "printers-scanners",
        "office-accessory": "networking",
        "tv-entertainment": "headphones-earbuds",
        "cctv-surveillance": "cameras-surveillance",
    }
    for slug, family in expected_family.items():
        row = next(line for line in source.splitlines() if "addReviewedGroup(" in line and f"'{slug}'" in line)
        assert f"family: '{family}'" in row

    assert re.search(
        r"addReviewedGroup\(\['interactive-display'\], "
        r"\{ departmentId: 'computing-networking', family: 'displays-replacement-screens'",
        source,
    )


def test_pass_four_accounts_for_the_full_office_capture_once():
    office_shelves = _captured_shelves()["office-school-stationery"]
    keys = Counter(_placement_keys())
    assert len(office_shelves) == 23
    assert len(set(office_shelves)) == 23
    assert not [slug for slug in office_shelves if keys[slug] != 1]


def test_pass_four_uses_product_evidence_for_office_boundaries():
    source = TREE.read_text()
    expected = {
        "notebook": ("computing-networking", "laptops"),
        "packaging-bag": (None, "packaging-supplies"),
        "empty-carton": (None, "packaging-supplies"),
        "document-bag-274de3": (None, "pencil-cases-school-storage"),
    }
    for slug, (department, family) in expected.items():
        row = next(line for line in source.splitlines() if "addReviewedGroup(" in line and f"'{slug}'" in line)
        if department:
            assert f"departmentId: '{department}'" in row
        assert f"family: '{family}'" in row

    for mixed_slug in ("ultra-book", "pen", "tape-glue"):
        row = next(line for line in source.splitlines() if "addReviewedGroup(" in line and f"'{mixed_slug}'" in line)
        assert "family: 'needs-review'" in row


def test_pass_four_keeps_printers_separate_from_office_consumables():
    source = TREE.read_text()
    printer_row = next(line for line in source.splitlines() if "addReviewedGroup(" in line and "'point-sale-retail-technology'" in line)
    paper_row = next(line for line in source.splitlines() if "'photocopy-paper':" in line)
    assert "departmentId:" not in printer_row
    assert "family: 'printers-scanners'" in printer_row
    assert "departmentId: 'office-school-stationery'" in paper_row
    assert "family: 'paper-notebooks'" in paper_row


def test_pass_four_accounts_for_the_full_building_capture_once():
    building_shelves = _captured_shelves()["building-electrical-hardware"]
    keys = Counter(_placement_keys())
    assert len(building_shelves) == 11
    assert len(set(building_shelves)) == 11
    assert not [slug for slug in building_shelves if keys[slug] != 1]


def test_pass_four_corrects_building_cross_parent_contamination():
    source = TREE.read_text()
    expected = {
        "nut": ("groceries-everyday-essentials", "nuts-seeds-dried-fruit"),
        "tool-home-improvement": ("home-furniture-decor", "rugs-mats-home-accessories"),
        "crate": ("office-school-stationery", "packaging-supplies"),
        "electrical-mount-box-bracket": ("tv-audio-home-entertainment", "tv-mounts-brackets"),
        "detector-sensor": ("cameras-security-surveillance", "smart-home-sensors"),
    }
    for slug, (department, family) in expected.items():
        row = next(line for line in source.splitlines() if "addReviewedGroup(" in line and f"'{slug}'" in line)
        assert f"departmentId: '{department}'" in row
        assert f"family: '{family}'" in row


def test_pass_four_keeps_contaminated_building_shelves_reviewable():
    source = TREE.read_text()
    for mixed_slug in ("hardware", "industrial-raw-material", "plate-box"):
        row = next(line for line in source.splitlines() if "addReviewedGroup(" in line and f"'{mixed_slug}'" in line)
        assert "family: 'needs-review'" in row

    tape_row = next(line for line in source.splitlines() if "addReviewedGroup(" in line and "'tape-glue'" in line)
    assert "family: 'needs-review'" in tape_row


def test_pass_four_accounts_for_the_full_power_capture_once():
    power_shelves = _captured_shelves()["power-solar-energy"]
    keys = Counter(_placement_keys())
    assert len(power_shelves) == 10
    assert len(set(power_shelves)) == 10
    assert not [slug for slug in power_shelves if keys[slug] != 1]


def test_pass_four_separates_energy_systems_from_device_accessories():
    source = TREE.read_text()
    expected = {
        "battery-charger-accessory": ("phones-wearables", "power-charging"),
        "extention-6cdc4d": ("building-electrical-hardware", "electrical-supplies-accessories"),
        "power-electrical": ("computing-networking", "laptops"),
        "battery-power-storage": ("computing-networking", "laptop-parts"),
    }
    for slug, (department, family) in expected.items():
        row = next(line for line in source.splitlines() if "addReviewedGroup(" in line and f"'{slug}'" in line)
        assert f"departmentId: '{department}'" in row
        assert f"family: '{family}'" in row

    solar_row = next(line for line in source.splitlines() if "addReviewedGroup(" in line and "'portable-powerstation'" in line)
    assert "family: 'solar-lighting'" in solar_row


def test_pass_four_keeps_battery_collections_broad():
    source = TREE.read_text()
    battery_row = next(line for line in source.splitlines() if "addReviewedGroup(" in line and "'battery-b1164a'" in line)
    assert all(f"'{slug}'" in battery_row for slug in ("battery-b1164a", "battery", "drycell"))
    assert "family: 'batteries-power-storage'" in battery_row


def test_pass_five_accounts_for_the_full_fashion_capture_once():
    fashion_shelves = _captured_shelves()["fashion-accessories"]
    keys = Counter(_placement_keys())
    assert len(fashion_shelves) == 13
    assert len(set(fashion_shelves)) == 13
    assert not [slug for slug in fashion_shelves if keys[slug] != 1]


def test_pass_five_separates_fashion_from_device_and_mislabeled_shelves():
    source = TREE.read_text()
    expected = {
        "brush": ("household-cleaning", "cleaning-tools"),
        "ethnic-ae09df": ("groceries-everyday-essentials", "ready-meals"),
        "shoe-jewelry-watch-accessory": ("tv-audio-home-entertainment", "headphones-earbuds"),
    }
    for slug, (department, family) in expected.items():
        row = next(line for line in source.splitlines() if "addReviewedGroup(" in line and f"'{slug}'" in line)
        assert f"departmentId: '{department}'" in row
        assert f"family: '{family}'" in row

    watch_accessory_row = next(line for line in source.splitlines() if "'smart-watch-accessory':" in line)
    assert "departmentId: 'phones-wearables'" in watch_accessory_row
    assert "family: 'wearables'" in watch_accessory_row


def test_pass_five_keeps_mixed_fashion_collections_reviewable():
    source = TREE.read_text()
    row = next(line for line in source.splitlines() if "addReviewedGroup(" in line and "'fashion-accessory'" in line)
    assert "'luggage-bag-133a33'" in row
    assert "family: 'needs-review'" in row


def test_pass_five_does_not_silently_overturn_the_accepted_watch_move():
    source = TREE.read_text()
    row = next(line for line in source.splitlines() if "'watch-3bab17':" in line)
    assert "departmentId: 'fashion-accessories'" in row
    assert "family: 'watches-jewellery'" in row


def test_phone_and_tablet_intents_are_separate_from_mixed_legacy_shelves():
    source = TREE.read_text()
    assert "family: 'phones', familyLabel: 'Phones'" in source
    assert "family: 'tablets', familyLabel: 'Tablets'" in source
    assert "family: 'phones-tablets'" not in source
    assert re.search(
        r"addReviewedGroup\(\['phone-tablet', 'computer-tablet'\], "
        r"\{ family: 'mixed-mobile-compatibility'",
        source,
    )
    nodes = {node["id"]: node for node in json.loads(PHONE_NAVIGATION.read_text())["nodes"]}
    assert nodes["iphones"] == {
        "id": "iphones", "label": "iPhones", "parentId": "smartphones", "kind": "shortcut", "synonyms": [],
    }
    assert nodes["ipads"] == {
        "id": "ipads", "label": "iPads", "parentId": "tablets", "kind": "shortcut", "synonyms": [],
    }

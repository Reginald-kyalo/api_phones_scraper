# Pass 1 category evidence and disposition ledger

> Scope: Home Appliances; Kitchen & Dining; Home, Furniture & Décor; and Household Cleaning & Essentials.

## Review basis

The second audit used the checked-in shelf product fixtures in addition to source labels, legacy slugs, source paths, and counts. Stable broad shopper intents remain broad; mixed shelves stay in **Needs Review**. Legacy slugs remain listing URL keys.

## Home Appliances

| Disposition | After | Legacy shelves accounted for |
| --- | --- | --- |
| unresolved | **Needs Review** (`home-appliances`) | `electronic` |
| retained / grouped | **Home Appliances** (`home-appliances`) | `home-appliance` |
| retained / grouped | **Major Appliances** (`home-appliances`) | `white-good` |
| retained / grouped | **Refrigeration** (`home-appliances`) | `fridge`, `fridge-freezer`, `chiller` |
| retained / grouped | **Coffee & Hot Drinks** (`home-appliances`) | `kettle-a2f55f`, `coffee-maker-b61796` |
| retained / grouped | **Countertop Cooking** (`home-appliances`) | `rice-cooker-fryer`, `electric-cooker-hot-plate` |
| retained / grouped | **Cooking Appliances** (`home-appliances`) | `microwave-oven`, `stand-alone-cooker` |
| retained / grouped | **Water Dispensers** (`home-appliances`) | `hot-cold`, `water-dispenser-cooler`, `hot-norm-8265e7`, `hot-normal-cold`, `bottom-load-a1672b`, `portable`, `table-top-8055cc` |
| retained / grouped | **Laundry Appliances** (`home-appliances`) | `washing-machine`, `washer-dryer` |
| retained / grouped | **Food Preparation** (`home-appliances`) | `blender-juicer`, `blender-mixer-food-processor`, `hand-mixer` |
| retained / grouped | **Heating & Air Treatment** (`home-appliances`) | `room-heater` |
| moved | **Lighting** (`home-furniture-decor`) | `bulb` |
| retained / grouped | **Breakfast & Baking** (`home-appliances`) | `sandwich-maker-55538d`, `sandwich-maker-toaster-coffee-maker`, `toaster` |
| retained / grouped | **Dessert & Ice Making** (`home-appliances`) | `donut-maker-b8a278` |
| moved | **Smart Home Sensors** (`cameras-security-surveillance`) | `sensor` |
| moved | **Powered Cleaning** (`household-cleaning`) | `vacuum-cleaner-steam-mop` |

## Kitchen & Dining

| Disposition | After | Legacy shelves accounted for |
| --- | --- | --- |
| retained / grouped | **Kitchen & Dining** (`kitchen-dining-cookware`) | `kitchen-dining` |
| retained / grouped | **Kitchen Essentials** (`kitchen-dining-cookware`) | `kitchenware` |
| moved | **Plastic Housewares** (`home-furniture-decor`) | `plastic` |
| retained / grouped | **Cookware & Bakeware** (`kitchen-dining-cookware`) | `cookware-bakeware`, `frying-pan` |
| moved | **Baby Care** (`baby-kids-toys`) | `holder` |
| retained / grouped | **Tableware** (`kitchen-dining-cookware`) | `party-tableware`, `bowl`, `tray`, `crockery`, `dinner-set-ba0436` |
| retained / grouped | **Utensils & Kitchen Tools** (`kitchen-dining-cookware`) | `kitchen-accessory`, `sieve-strainer`, `funnel`, `grater`, `knive` |
| retained / grouped | **Food Storage** (`kitchen-dining-cookware`) | `hotpot`, `plastic-wrap-foil`, `air-tight-container`, `food-storage-foil-cling-film`, `kitchen-foil-c6aa11`, `clingfilm-food-bag`, `lunch-box` |
| unresolved | **Needs Review** (`kitchen-dining-cookware`) | `cooking-equipment-fuel-c23ce7` |
| retained / grouped | **Drinkware** (`kitchen-dining-cookware`) | `bottle-6b4dbe`, `flask-088dba`, `jug`, `plastic-glass-cup`, `water-cup-d8a8d4`, `wine-glass-0b5674` |
| retained / grouped | **Gas Cooking Equipment** (`kitchen-dining-cookware`) | `regulator`, `gas-pipe-656542` |
| retained / grouped | **Kitchen Organisation** (`kitchen-dining-cookware`) | `dish-rack-3cd990` |

## Home, Furniture & Décor

| Disposition | After | Legacy shelves accounted for |
| --- | --- | --- |
| unresolved | **Needs Review** (`home-furniture-decor`) | `home-garden-kid` |
| retained / grouped | **Bedding & Linen** (`home-furniture-decor`) | `bedding-linen`, `home-textile`, `duvet-pillow`, `duvet-d523a9`, `pillow`, `blanket-duvet` |
| retained / grouped | **Home Décor** (`home-furniture-decor`) | `decoration`, `candle`, `gift-wrapper-7b578e` |
| retained / grouped | **Lighting** (`home-furniture-decor`) | `light`, `enegy-saver` |
| moved | **Laundry Accessories** (`household-cleaning`) | `cleaning-laundry-accessory`, `cloth-peg-ab1381` |
| retained / grouped | **Home Fragrance & Air Care** (`home-furniture-decor`) | `home-kitchen-office` |
| moved | **Buckets & Basins** (`household-cleaning`) | `basin-bucket-basket` |
| moved | **Cleaning Tools** (`household-cleaning`) | `broom-8a72bd`, `mop-mop-head-5ef380`, `brush-scrubber` |
| retained / grouped | **Furniture** (`home-furniture-decor`) | `home-furniture-appliance`, `chair-table`, `table`, `plastic-furniture-set`, `stool` |
| retained / grouped | **Mattresses** (`home-furniture-decor`) | `mattress` |
| retained / grouped | **Bath Linen** (`home-furniture-decor`) | `towel`, `hand-towel` |
| moved | **Waste Disposal** (`household-cleaning`) | `dust-pan-bin-23a0ce` |
| retained / grouped | **Bathroom Accessories** (`home-furniture-decor`) | `soapdish-f8cba4` |
| retained / grouped | **Household Storage** (`home-furniture-decor`) | `cabinet-storage`, `clothe-hanger` |

## Evidence-led corrections

- `home-appliance` contains kettles, microwaves, dispensers, freezers, fans, and irons, so its broad Home Appliances meaning is retained rather than narrowed to Food Preparation.
- `portable` contains portable water dispensers and joins Water Dispensers; `sensor` contains a Xiaomi door/window sensor and moves to Smart Home Sensors.
- `home-kitchen-office` is air freshener and candle stock; `home-furniture-appliance` is chairs, stools, sofas, and cabinets.
- `basin-bucket-basket` is dominated by buckets and basins and moves to Household Cleaning.
- `holder` is actually diapers and wet wipes and moves to Baby Care. `cooking-equipment-fuel-c23ce7` remains unresolved because it mixes fuel gel, matches, and utensils in one legacy shelf.

## Compatibility checks

- Every captured shelf in each reviewed source department has exactly one explicit disposition.
- A future shelf in a reviewed source fails closed until reviewed.
- Existing legacy slugs remain unchanged and the global integrity assertion requires each captured shelf exactly once.
- No generated capture, bridge, or backend fixture is edited.

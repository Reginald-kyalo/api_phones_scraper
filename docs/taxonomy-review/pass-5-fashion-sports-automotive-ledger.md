# Pass 5 fashion, sports and automotive category disposition ledger

> Scope complete: Fashion & Accessories; Sports & Outdoors; and Automotive & Motorcycle.

## Evidence basis

The declared Fashion source inventory is the 13 rows under `fashion-accessories` in `liveSpineShelves.ts`. Product and descendant evidence comes from the read-only demo capture made at `2026-09-05T15:11:13` from `product_clusters_mvp`, stored in `data/demo-dataset.tar.gz` (SHA-256 `432064d4c6e235e4eaebc9164d37c084d463cb0dc96948ac0be0949f6ff83aca`). Evidence locations are `public/demo/shelves/<slug>/{tree.json,meta.json,products-*.json}` after the existing `demo:prepare` materialization; generated files were not edited or committed.

All captured products were inspected for each source shelf. The largest source shelf has 801 products from one retailer, while the mixed `fashion-accessory` shelf has 308 records from Jumia. Single-retailer evidence limits purity claims, so broad families remain broad and materially conflicting collections remain in **Needs Review**. Every legacy URL remains `/shelf/<slug>`.

## Fashion & Accessories inventory and decisions

| Source shelf / full captured breadcrumb | Evidence and coverage | Disposition / destination | Rationale |
| --- | --- | --- | --- |
| `clothe` — Clothes | all 801 / Cleanshelf | retained/grouped → **Clothing** | Underwear, nightwear, dresses, jeans, baby clothes and swimwear support a broad clothing family. Incidental belts do not justify a narrower apparel type. |
| `fashion-accessory` — PHONES & ACCESSORIES › Accessories › Fashion Accessories | all 308 / Jumia | unresolved → **Needs Review** | Ordinary watches and straps coexist with phone lens protectors, holders, screen accessories and other device items. Neither Fashion nor Phones is pure enough for a silent cross-parent move. |
| `golf-apparel-footwear` — Golf Apparel & Footwear › Footwear | all 146 / Cleanshelf and Quickmart | retained/renamed → **Footwear** | Shoes, sandals, slippers, boots and clogs dominate; the evidence does not support a golf-specific meaning. |
| `bag-umbrella` — Bags/Umbrellas | all 132 / Cleanshelf | retained/grouped → **Bags, Luggage & Umbrellas** | Handbags, trolley cases, duffels, document bags and umbrellas form the stated broad carry/weather intent. |
| `luggage-bag-133a33` — Luggage & Bags › Bags › Packaging Bags | all 74 / 3 retailers | unresolved → **Needs Review** | Sixty-eight descendant records are packaging bags, boxes, punnets and cartons, while the direct parent adds a few actual trolley and gunny bags. The broad URL is preserved without calling the collection pure fashion or pure packaging. |
| `shoe-care-accessory` — Shoe Care & Accessories › Shoe Care | all 70 / 4 retailers | retained/grouped → **Shoe Care** | Polish, dye, shoe cream and shoe brushes support one stable shoe-care intent. |
| `brush` — Brushes | all 23 / Eastmatt | moved → Household Cleaning › **Cleaning Tools** | Toilet, floor, carpet, scrubbing and dustpan brushes are cleaning tools, not fashion or shoe brushes. |
| `smart-watch-accessory` — Audio, Video and Accessories › Accessories › Smart Watch Accessories | all 22 / Jumia | moved → Phones & Wearables › **Wearables** | Captured records are smartwatches, fitness/health watches, straps and a magnetic watch charger. The broad Wearables family avoids claiming accessory-only purity. |
| `ethnic-ae09df` — Ethnic | all 4 / Quickmart | moved → Groceries & Drinks › **Ready Meals** | Every product is an instant cup or wok noodle; label similarity provides no fashion evidence. |
| `shoe-polish-c-4bfea2` — SHOE POLISH & C | all 4 / Eastmatt | grouped → **Shoe Care** | All products are shoe polish, shoe cream or leather dye. |
| `laptop-backpack` — Electronics & Computers › Electronics › Laptops › BACKPACK | all 3 / Eastmatt and Mobile Hub | retained/grouped → **Bags & Backpacks** | One laptop-oriented backpack and two general/kids backpacks support a broad fashion-bag family, not a device-specific case family. |
| `umbrella` — UMBRELLAS | all 2 / Naivas | grouped → **Bags, Luggage & Umbrellas** | Both products are ordinary umbrellas. |
| `shoe-jewelry-watch-accessory` — Shoe, Jewelry & Watch Accessories › Jewelry | sole product / MyBigOrder | moved → TV, Audio & Music › **Headphones & Earbuds** | The only product is Oraimo true-wireless earbuds; the captured product contradicts every part of the source label. |

## Incoming boundary checks

These checks are not counted again in the 13-shelf Fashion source inventory.

| Incoming or adjacent shelf | Current placement | Boundary result |
| --- | --- | --- |
| `watch-3bab17` | Phones & Wearables › **Wearables** | The complete current capture has five Samsung/Huawei bands and smartwatches. The user approved correcting the prior Fashion placement; the stable shelf URL and membership remain unchanged. |
| `tablet-bag-cover` | Phones › Cases, Covers & Wallets | All three products are device-specific back covers, so the accepted Phones placement remains supported despite the word “bag.” |
| `bag-fd8696` and `packaging-bag` | Office › Packaging Supplies | Product evidence is packaging bags, boxes, punnets and cartons. These are not fashion bags; the accepted Office placement remains supported. |
| `smartwatch` | Phones › Wearables | Device-specific smartwatches remain distinct from an ordinary-watch family. The incoming `smart-watch-accessory` joins this broad Wearables destination. |

## Reconciliation and compatibility

- **Originating inventory:** 13 examined, 13 explicitly dispositioned exactly once, 11 decided at evidence-supported broad/grouped/moved granularity, and 2 unresolved (`fashion-accessory`, `luggage-bag-133a33`).
- **Incoming checks:** 4 boundary groups, counted separately.
- All stable shelf IDs, URLs and listing membership remain unchanged. No product assignment or source capture was edited.
- `fashion-accessories` joins `reviewedSourceDepartments` only after complete explicit coverage; future shelves fail closed.
- “Smart Watch Accessories” is not treated as ordinary jewellery, and device-specific covers are not treated as general fashion bags.

## Evidence-backed disagreement: accepted watch move

1. **Current assumption:** Pass 3 says `watch-3bab17` contains ordinary watches and belongs in Fashion › Watches & Jewellery.
2. **Contradicting evidence:** the current checked-in capture at `public/demo/shelves/watch-3bab17/products-000.json` contains five wearable devices: Samsung Galaxy Fit3, Huawei Band 11, and Huawei GT 3/3 Pro/4. This is complete captured-product evidence. It does not establish whether the older Pass 3 review used a different capture, so that historical discrepancy remains uncertain.
3. **Alternative:** move `watch-3bab17` to Phones & Wearables › Wearables, matching its current captured products, while retaining its stable shelf URL.
4. **Impact:** one accepted cross-parent collection-navigation decision and its tests/Pass 3 ledger would change; IDs, URL and listing membership would not. Product reassignment and canonical publication remain out of scope.
5. **Disposition:** approved by the user and applied. `watch-3bab17` now joins Phones & Wearables › Wearables; the Pass 3 ledger and regression expectations are reconciled.

## Sports & Outdoors inventory and decisions

The same capture revision and evidence conventions apply. All products were inspected for each of the five source shelves; the inventory is small enough that no sampling inference is needed. Retailer coverage is still limited to one to three general retailers per shelf.

| Source shelf / full captured breadcrumb | Evidence and coverage | Disposition / destination | Rationale |
| --- | --- | --- | --- |
| `sport-fitness` — Sports and Fitness | all 25 / 3 retailers | unresolved → **Needs Review** | Seventeen grocery products coexist with seven sports balls and one skipping rope. The collection is neither a coherent sports shelf nor safely movable to one grocery family. |
| `ball` — Sexual Health › Health & Wellness › BALLS | all 17 / 3 retailers | unresolved → **Needs Review** | Cotton wool/buds coexist with toilet and moth balls. The source and ancestor labels are both misleading, and the products cross Health, Baby and Household Cleaning boundaries. |
| `sport-accessory` — Sports Accessories | all 8 / Naivas | retained/renamed → **Ball Sports Equipment** | Every product is a football, table-tennis ball or volleyball. The family describes sporting equipment without retaining the unsupported generic-accessory claim. |
| `rope-72c0d9` — Ropes & Padlocks › ROPES | all 6 / Eastmatt | moved → Building, Electrical & Hardware › **Ropes & Chains** | All products are utility rope or heavy-duty clothesline; no captured climbing, skipping or sports rope supports an Outdoors placement. |
| `torch` — Bulbs & Torches › TORCHES | all 3 / Eastmatt | moved → Building, Electrical & Hardware › **Electrical Supplies & Accessories** | Rechargeable torches and an emergency light are general electrical products, not evidenced outdoor equipment. |

## Sports incoming boundary checks

| Incoming or adjacent shelf | Current placement | Boundary result |
| --- | --- | --- |
| `golf-apparel-footwear` | Fashion › Footwear | All 146 captured products are ordinary shoes, sandals, slippers, boots or clogs. No golf evidence supports moving it to Sports. |
| `manilla-twine-rope` | Building › Ropes & Chains | Utility rope, clothesline and dog chain support the same Building family as `rope-72c0d9`, not sporting equipment. |
| `tool-home-improvement` | Home › Rugs, Mats & Home Accessories | Carpets and home mats are not outdoor sporting equipment; the accepted Home placement remains supported. |
| `hardware` | Building › Needs Review | Garden tools and isolated outdoor items occur inside a heavily contaminated 980-product collection. It remains unresolved rather than being moved wholesale into Sports or Garden. |

## Sports reconciliation and compatibility

- **Originating inventory:** 5 examined, 5 explicitly dispositioned exactly once, 3 decided at evidence-supported retained/moved granularity, and 2 unresolved (`sport-fitness`, `ball`).
- **Incoming checks:** 4 boundary groups, counted separately.
- Every stable shelf ID, `/shelf/:slug` URL and listing membership remains unchanged. No product assignment, capture or canonical category was edited.
- `sports-outdoors-leisure` joins `reviewedSourceDepartments` only after complete explicit coverage; future shelves fail closed.
- The absence of a clean outdoor-equipment source shelf is recorded as an evidence limitation, not filled using label or keyword fallback.

## Automotive & Motorcycle inventory and decisions

The same capture revision and evidence conventions apply. All products were inspected for each of the seven source shelves. The broad 290-product Automotive capture spans five general retailers; narrower shelves range from one specialist retailer to five general retailers.

| Source shelf / full captured breadcrumb | Evidence and coverage | Disposition / destination | Rationale |
| --- | --- | --- | --- |
| `automotive` — Auto & Cycle Marts › Automotive | all 290 / 5 retailers | retained/grouped → **Automotive Accessories & Care** | Car air fresheners, cleaning and dashboard products, wipers, mats, first-aid kits and other vehicle accessories support a broad vehicle-use family. It is not narrowed to one part type. |
| `coolant` — coolants | all 124 / Laptop Clinic | moved → Computing & Networking › **Laptop Parts** | Every captured product is a CPU cooling fan or heatsink for a laptop. The label does not provide evidence for automotive coolant. |
| `lubricant-oil-fluid` — Lubricants, Oils & Fluids › Oils | all 54 / 5 retailers | unresolved → **Needs Review** | Cooking oils/fats, petroleum jelly, baby/body/hair oils and gift packs coexist, with no coherent automotive-fluid intent. Products cross Groceries, Health and Baby boundaries, so no single move is asserted. |
| `car-accessory` — Audio, Video and Accessories › Accessories › Car Accessories | all 29 / Jumia | retained/grouped → **In-Car Phone & Charging Accessories** | Car chargers, phone mounts, holders, FM transmitters and in-car organizers are defined by vehicle use. The placement remains Automotive rather than treating them as general phone accessories. |
| `carcare-a0f017` — CARCARE | all 7 / Eastmatt | retained/grouped → **Car Care** | Every product is dashboard cleaner or polish. |
| `additive` — ADDITIVES | all 2 / Eastmatt | moved → Groceries & Drinks › **Pantry** | Citric acid and apple-cider vinegar are food/pantry inputs, not vehicle additives. |
| `tool-garage` — Tools & Garage › Tools | all 2 / Naivas | moved → Building, Electrical & Hardware › **Hand Tools** | A magnetic screwdriver and garden rake are general hand/garden tools. The same two products occur under the already moved child `tool`; neither is vehicle-specific. |

## Automotive incoming boundary checks

| Incoming or adjacent shelf | Current placement | Boundary result |
| --- | --- | --- |
| `tool` | Phones → Building › Hand Tools | Complete evidence matches the `tool-garage` parent: screwdriver and rake. Both collection links share Building without deduplicating products or URLs. |
| `battery-b1164a` | Power › Batteries & Power Storage | Household, power-bank and laptop batteries are mixed; there is no evidence to relabel the broad collection as automotive batteries. |
| `electrical-plug-cap` | Building › Plugs & Surge Protection | Appliance protectors, a UK plug and a Starlink adapter are general electrical accessories, not vehicle electronics. |
| `car-accessory` boundary | Automotive › In-Car Phone & Charging Accessories | Although products interact with phones, their mounts, chargers and holders are designed for in-car use. Vehicle context is the stable shopper intent; this is navigation placement, not reassignment. |

## Automotive reconciliation and compatibility

- **Originating inventory:** 7 examined, 7 explicitly dispositioned exactly once, 6 decided at evidence-supported broad/grouped/moved granularity, and 1 unresolved (`lubricant-oil-fluid`).
- **Incoming checks:** 4 boundary groups, counted separately.
- Every shelf ID, `/shelf/:slug` URL and listing membership remains unchanged. The misleading `coolant` and `additive` slugs remain compatibility keys.
- `automotive-motorcycle` joins `reviewedSourceDepartments` only after complete explicit coverage; future shelves fail closed.
- No product assignment, generated capture, canonical category, backend fixture or phone release changed.

## Pass 5 batch reconciliation

Across the three source parents, 25 originating shelves were examined and dispositioned exactly once: Fashion 13 (11 decided, 2 unresolved), Sports 5 (3 decided, 2 unresolved), and Automotive 7 (6 decided, 1 unresolved). Incoming boundary checks are separate and not double-counted. The next parent is Garden, Agriculture & Agrovet in the Pass 6 ledger.

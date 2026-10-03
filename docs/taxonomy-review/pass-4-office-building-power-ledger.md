# Pass 4 office, building and power category disposition ledger

> Scope complete: Office, School & Stationery; Building, Electrical & Hardware; and Power, Solar & Energy.

## Evidence basis

The declared Office source inventory is the 23 rows under `office-school-stationery` in `liveSpineShelves.ts`. Product and descendant evidence comes from the read-only demo capture made at `2026-09-05T15:11:13` from `product_clusters_mvp`, stored in `data/demo-dataset.tar.gz` (SHA-256 `432064d4c6e235e4eaebc9164d37c084d463cb0dc96948ac0be0949f6ff83aca`) and materialized by the existing `demo:prepare` script. The archive and shelf inventory last changed at repository revision `409a1ff93d71befa4a09f7aa6359a5d8ee1e04dc`.

Evidence locations below use `public/demo/shelves/<slug>/{tree.json,meta.json,products-*.json}` after materialization; those generated files remain read-only and uncommitted. Every legacy URL is `/shelf/<slug>`. Product review covered all products for the 22 shelves of 85 or fewer products and the full 2,074-product broad source shelf. Retailer coverage varies: the broad shelf spans Carrefour, Cleanshelf, Eastmatt, Naivas, Quickmart and specialist computer stores, while many small shelves have only one retailer. A placement describes collection navigation, not the purity or reassignment of every product.

## Office, School & Stationery inventory and decisions

| Source shelf / full captured breadcrumb | Evidence and coverage | Disposition / destination | Rationale |
| --- | --- | --- | --- |
| `office-school-supply` — Office & School Supplies | `office-school-supply/tree.json`, 2,074 products / 7 observed seller labels | retained → **Office & School Supplies** | A deliberately broad direct-parent collection; representative and full-title review includes paper, writing, adhesive, geometry and craft supplies. It is not narrowed to one consumable type. |
| `ultra-book` — Exercise Books | `ultra-book/products-000.json`, all 85 / 3 retailers | unresolved → **Needs Review** | Materially mixed: exercise books and actual Dell/HP laptops. The stable misleading slug is preserved; neither product type is asserted as pure. |
| `packaging-bag` — Luggage & Bags › Bags › Packaging Bags | `packaging-bag/products-000.json`, all 64 / Cleanshelf | retained/grouped → **Packaging Supplies** | Cake boxes, carrier/grocery bags, punnets and cartons are packaging rather than stationery. |
| `receipt-note-book` — RECEIPTS & NOTE BOOKS | all 54 / Cleanshelf and Naivas | retained/grouped → **Paper & Notebooks** | Exercise, graph, colouring and diary books support the broad paper/notebook intent. |
| `notebook` — Notebooks | all 34 / 3 computer retailers | moved → Computing & Networking › **Laptops** | Despite its label, every captured title is a notebook computer such as HP Pavilion, Envy or Compaq. This is the equipment/consumables boundary correction. |
| `pen` — Pens (child: Galaxy S Pen) | all 18 / Eastmatt and Price Point | unresolved → **Needs Review** | Writing pens and Samsung S Pen device accessories share the collection; evidence does not justify presenting it as pure stationery. |
| `scissor` — Scissors & Cutters › SCISSORS | all 11 / Cleanshelf | retained/grouped → **Cutting, Sewing & Craft Tools** | Scissors are mixed with crochet hooks, knitting needles and a sewing kit, so the family remains broader than office scissors. |
| `tape-glue` — Tape & Glue › Labels & Tapes | all 9 / Eastmatt | unresolved → **Needs Review** | The capture contains masking and clear tape but also electrical insulating tape; the installation-hardware boundary remains ambiguous. |
| `eraser-sharpener-e53643` — ERASER/SHARPENER | all 8 / Eastmatt | grouped → **School Writing & Drawing** | Erasers and pencil sharpeners are school writing accessories. |
| `remarkable-marker` — MARKERS | all 6 / Eastmatt | grouped → **Writing & Correction** | Whiteboard/permanent markers and a correction pen share a writing/correction intent. |
| `file` — Files | all 5 / Eastmatt | grouped → **Filing & Document Storage** | Spring, project, lever-arch and manila files are document-storage supplies. |
| `pencil-4ab379` — PENCILS | all 5 / Cleanshelf and Eastmatt | grouped → **School Writing & Drawing** | Graphite and colour pencils support the stated intent. |
| `geometrical-set-e1deb5` — GEOMETRICAL SET | all 3 / Eastmatt | grouped → **School Writing & Drawing** | All captured products are mathematical sets. |
| `chalk-b9b791` — CHALK | all 2 / Eastmatt | grouped → **School Writing & Drawing** | White and coloured school chalk. |
| `crayon` — CRAYONS | all 2 / Eastmatt | grouped → **School Writing & Drawing** | Captured coloured pencils fit the broader drawing family without asserting literal crayon purity. |
| `calculator` — Calculators & Dictionaries › Calculators | all 2 / Eastmatt | retained/grouped → **Calculators** | Both products are calculators; no printer or paper conflation. |
| `diary-941f52` — DIARY | all 2 / Eastmatt | grouped → **Paper & Notebooks** | A5 diary and school diary. |
| `packaging-logistic-storage-supply` — Packaging, Logistics & Storage Supplies › Bags, Sacks & Flexible Packaging | all 2 / Eastmatt | retained/grouped → **Packaging Supplies** | Laminated non-woven and shopping bags are packaging supplies. |
| `ruler-d60084` — RULER | all 2 / Eastmatt | grouped → **School Writing & Drawing** | Both products are 30 cm school rulers. |
| `cash-book-c5d621` — CASH BOOK | sole product / Eastmatt | grouped → **Paper & Notebooks** | The only product is a cash-sale book. |
| `cover-file-document-wallet` — COVERS FILES & DOCUMENT WALLETS › DOCUMENT WALLET | sole product / Eastmatt | grouped → **Filing & Document Storage** | The captured card holder belongs with document filing/storage. |
| `document-bag-274de3` — DOCUMENT BAG | sole product / Eastmatt | grouped → **Pencil Cases & School Storage** | Product evidence says pencil pouch, so the label alone is not used to classify it as packaging. |
| `empty-carton` — EMPTY CARTONS | sole product / Cleanshelf | grouped → **Packaging Supplies** | The only product is a 1 kg carton. |

## Incoming boundary checks

These are not counted again in the 23-shelf Office source inventory.

| Incoming shelf | Prior source | Decision checked | Boundary result |
| --- | --- | --- | --- |
| `photocopy-paper` | Computing & Networking | Office › **Paper & Notebooks** | All four products are A4 photocopy paper. Paper remains an Office consumable; printers/scanners remain Computing equipment. |
| `bag-fd8696` | Phones & Wearables | Office › **Packaging Supplies** | The 68-product collection is dominated by the same packaging descendants as `packaging-bag`; its preserved broad URL remains a collection move, not a product reassignment. |
| `point-sale-retail-technology` | Computing & Networking | Computing › **Printers & Scanners** | Prior evidence covers printers, scanners, copiers and label printers. No evidence warrants moving the equipment merely because its consumables sit in Office. |

## Reconciliation and compatibility

- **Originating inventory:** 23 examined, 23 explicitly dispositioned exactly once, 20 decided into evidence-supported broad/grouped/moved families, and 3 unresolved (`ultra-book`, `pen`, `tape-glue`).
- **Incoming checks:** 3 boundary checks, counted separately.
- Existing `/shelf/:slug` URLs and captured membership remain unchanged. No capture, backend assignment, phone source, or canonical publication data was edited.
- `office-school-stationery` joins `reviewedSourceDepartments` only with complete explicit coverage. New shelves fail closed; stale dispositions, duplicate capture slugs and duplicate sibling labels remain errors.
- The source label `notebook` is not treated as stationery when its entire capture is laptop computers. Conversely, printer equipment is not moved into Office merely because paper is an Office consumable.

## Deviations and challenged assumptions

1. **Current assumption:** the boundary prompt can be resolved as “printers versus paper” by colocating both.
2. **Contradicting evidence:** `photocopy-paper` contains only paper, while the previously reviewed `point-sale-retail-technology` collection contains printers, scanners, copiers and label printers. This is captured-product evidence, not an inference from labels.
3. **Alternative:** keep printer equipment in Computing › Printers & Scanners and paper in Office › Paper & Notebooks.
4. **Impact:** no IDs, URLs, membership or accepted prior semantics change; tests now pin both sides of the boundary.
5. **Disposition:** applied within scope because it preserves the accepted Pass 3 decision and separates equipment from consumables.

## Building, Electrical & Hardware inventory and decisions

The same capture provenance and evidence paths described above apply. All products were inspected for each of the 11 source shelves. The broad `hardware` capture spans six general retailers; several smaller shelves have only one retailer, so those decisions are deliberately no narrower than their evidence.

| Source shelf / full captured breadcrumb | Evidence and coverage | Disposition / destination | Rationale |
| --- | --- | --- | --- |
| `hardware` — Hardware & Other › Hardware | all 980 / 6 retailers; one `spoil-your-pet` child | unresolved → **Needs Review** | Genuine hand tools, fasteners, plumbing and safety stock coexist with cleaning tools, pet food, household containers, solar items and agricultural goods. A pure Hardware label would overclaim the collection. |
| `industrial-raw-material` — Industrial Raw Materials | all 378 / Cleanshelf | unresolved → **Needs Review** | The shelf is largely commercial bakery ingredients, prepared foods, labels and food packaging, with occasional blades and cleaning inputs. Neither “industrial hardware” nor one grocery family describes it safely. |
| `electrical-accessory` — Electrical Accessories › Electrical Cables | all 115 / 4 retailers | retained/grouped → **Electrical Supplies & Accessories** | Extensions, plugs, surge protectors, lamps, batteries, testers and cables form a broad electrical-supplies intent. A few unrelated toothpick records prevent narrower purity claims but do not change the broad navigation meaning. |
| `nut` — Food Cupboard › NUTS | all 73 / 4 retailers | moved → Groceries & Drinks › **Nuts, Seeds & Dried Fruit** | Products are cashews, peanuts, macadamias and mixed nuts; “nut” is food evidence, not a fastener inference. |
| `tool-home-improvement` — Tools & Home Improvement › Home Improvement | all 19 / Carrefour and Quickmart | moved → Home, Furniture & Décor › **Rugs, Mats & Home Accessories** | Seventeen products are carpets, rugs or mats; a mirror and wall hooks are still home accessories. No captured product is a general tool. |
| `manilla-twine-rope` — MANILLA TWINES & ROPES | all 10 / Cleanshelf | retained/grouped → **Ropes & Chains** | Rope, clothesline and dog-chain products support a broad rope/chain hardware family. |
| `plate-box` — Plates and Boxes › Electric Cookers & Hot Plates | all 7 / Eastmatt and Naivas | unresolved → **Needs Review** | Plates, cookers and perfumes are materially unrelated. No navigation family can imply a coherent product type. |
| `electrical-plug-cap` — Electrical Plug Caps | all 4 / Naivas | retained/grouped → **Plugs & Surge Protection** | Three voltage/fridge protectors and a UK top plug support this electrical-accessory grouping; the Starlink adapter remains a noted contaminant. |
| `crate` — EMPTY BOTTLES & CRATES › CRATES | all 2 / Cleanshelf and Eastmatt | moved → Office, School & Stationery › **Packaging Supplies** | Beer and bread crates are transport/packaging containers, not installation hardware. This reuses the accepted broad packaging family without changing membership. |
| `electrical-mount-box-bracket` — Electrical Mount Boxes & Brackets | all 2 / Naivas | moved → TV, Audio & Music › **TV Mounts & Brackets** | Both products are television wall brackets, so device-use evidence overrides the electrical label. |
| `detector-sensor` — Detectors & Sensors › Sensors | sole product / Gadget World | moved → Cameras, Security & Surveillance › **Smart Home Sensors** | The only product is the Xiaomi door/window sensor already represented by the descendant `sensor` collection. Both links share one navigation family; no product deduplication is claimed. |

## Building incoming boundary checks

| Incoming or adjacent shelf | Prior source / current placement | Boundary result |
| --- | --- | --- |
| `tool` | Phones & Wearables → Building › Hand Tools | Two products are a magnetic screwdriver and garden rake. The accepted move remains supported; it is not a phone repair-parts shelf. |
| `tape-glue` | Office › Needs Review | Seven clear/masking tape products and two insulating tapes make the Office-versus-installation boundary genuinely mixed. It remains unresolved rather than being silently moved into electrical supplies. |
| `shower-water-heater` | Home Appliances › Water Heating & Treatment | The captured electric shower head is a finished appliance, not merely installation hardware; the accepted placement remains supported. |
| `bulb` | Home, Furniture & Décor › Lighting | All ten products are finished LED bulbs. The existing shopper-facing Lighting placement remains supported; no installation-parts claim is introduced. |
| `sensor` | Cameras, Security & Surveillance › Smart Home Sensors | Same Xiaomi door/window product as the Building source parent. This confirms the shared destination family for the incoming `detector-sensor` collection. |

## Building reconciliation and compatibility

- **Originating inventory:** 11 examined, 11 explicitly dispositioned exactly once, 8 decided into retained/grouped/moved families, and 3 unresolved (`hardware`, `industrial-raw-material`, `plate-box`).
- **Incoming checks:** 5 boundary checks, counted separately.
- All legacy URLs remain collection links. No product assignment, capture, source bridge, canonical node or phone release changed.
- Cross-parent destinations reuse current stable department IDs. The new TV mounts family describes the two captured mount products without narrowing or reusing an unrelated category ID.
- `building-electrical-hardware` joins `reviewedSourceDepartments` only after complete explicit coverage; future unreviewed shelves fail closed.

## Power, Solar & Energy inventory and decisions

The same capture provenance and evidence paths described above apply. All products were inspected for each of the ten source shelves. The 553-product `battery-charger` shelf is single-retailer and broad; decisions therefore distinguish navigation intent without asserting clean product-level assignment.

| Source shelf / full captured breadcrumb | Evidence and coverage | Disposition / destination | Rationale |
| --- | --- | --- | --- |
| `battery-charger` — Battery Chargers | all 553 / Jumia | retained/grouped → **Charging & Portable Power** | Phone chargers, charging cables and battery chargers coexist with portable power stations, rechargeable cells and solar controllers. The broad family exposes the collection without claiming one device type. |
| `battery-b1164a` — Batteries & Adapters › Batteries (children: alkaline, packs, laptop batteries) | all 70 / 7 retailers | retained/grouped → **Batteries & Power Storage** | Household cells, power banks and laptop batteries are materially mixed but share a broad stored-power intent. It is not narrowed to household batteries or reassigned as pure laptop parts. |
| `battery-charger-accessory` — Batteries, Chargers & Accessories › Chargers | all 58 / 4 device retailers | moved → Phones & Wearables › **Power & Charging** | Device chargers, cables, MagSafe packs and power banks dominate. A few phone/wearable records remain contamination; the placement is a broad device-charging collection, not a purity claim. |
| `battery` — Batteries | all 35 / Eastmatt and Jumia | retained/grouped → **Batteries & Power Storage** | Phone, camera, tool and household cells coexist with controllers and portable power, plus two pasta contaminants. Broad placement is safer than type inference or a false pure family. |
| `drycell` — DRYCELLS | all 28 / Cleanshelf | grouped → **Batteries & Power Storage** | All products are disposable or rechargeable household/watch cells. It joins the broad battery family without creating a chemistry-specific category. |
| `extention-6cdc4d` — EXTENTIONS | all 8 / Cleanshelf and Eastmatt | moved → Building, Electrical & Hardware › **Electrical Supplies & Accessories** | Every product is a multi-way extension or surge-protected extension cable: installation/electrical accessory rather than an energy system. |
| `power-electrical` — Power & Electricals › Generators & Portable Power | all 2 / LE | moved → Computing & Networking › **Laptops** | Both products are used HP/Lenovo laptops; the captured breadcrumb is contradicted by complete product evidence. |
| `battery-power-storage` — Batteries and Power Storage | sole product / Digital Store | moved → Computing & Networking › **Laptop Parts** | The only product is an HP TouchSmart-series replacement battery, a device repair part rather than a general energy system. |
| `portable-powerstation` — Portable Powerstation | sole product / Overtech | retained/renamed → **Solar Lighting** | The only product is an Itel solar-light kit with two bulbs, not a portable power station. The stable shelf ID and URL remain unchanged. |
| `shower-water-heater` — Showers and water heaters › WATER HEATER | sole product / Eastmatt | retained prior move → Home Appliances › **Water Heating & Treatment** | A finished 220 V shower head/water heater belongs with the appliance outcome rather than installation hardware or general energy storage. |

## Power incoming boundary checks

| Incoming or adjacent shelf | Prior source / current placement | Boundary result |
| --- | --- | --- |
| `electrical-accessory` | Building › Electrical Supplies & Accessories | Extensions, plugs, protectors, bulbs, cells and testers remain a broad electrical-supplies collection. It is not promoted to an energy-system family. |
| `hardware` | Building › Needs Review | The broad contaminated shelf includes isolated solar panels, batteries and an inverter among hundreds of hardware, cleaning, pet and agricultural products. It remains unresolved rather than being moved wholesale. |
| `charger-7dd0d2`, `power-bank`, `phone-battery`, `cable-4b1baf` | Phones › Power & Charging | These accepted device-specific collections remain with Phones. The incoming `battery-charger-accessory` shares their broad navigation family. |
| `adapter-charger` | Computing › Power & Adapters | Computing-specific power adapters remain with their device family; no label-only move into general energy is made. |
| `laptop-battery`, `charger-6a5f2e` | Computing › Laptop Parts | Replacement laptop power parts remain distinct from general batteries, supporting the move of `battery-power-storage` while leaving the mixed `battery-b1164a` broad. |

## Power reconciliation and compatibility

- **Originating inventory:** 10 examined, 10 explicitly dispositioned exactly once, 10 decided at evidence-supported broad/grouped/moved granularity, and 0 unresolved. The broad battery families explicitly do not claim product purity.
- **Incoming checks:** 5 boundary groups, counted separately.
- Existing shelf IDs, URLs and listing membership remain unchanged. The misleading `power-electrical`, `portable-powerstation` and `battery-power-storage` slugs are preserved as compatibility keys.
- `power-solar-energy` joins `reviewedSourceDepartments` only after complete explicit coverage; new shelves fail closed.
- No product assignment, generated capture, backend fixture, canonical publication, or pinned phone hierarchy changed.

## Pass 4 batch reconciliation

Across the three source parents, 44 originating shelves were examined and dispositioned exactly once: Office 23 (20 decided, 3 unresolved), Building 11 (8 decided, 3 unresolved), and Power 10 (10 decided, 0 unresolved). Incoming boundary checks are reported separately and are not double-counted. The next parent is Fashion & Accessories in the Pass 5 ledger.

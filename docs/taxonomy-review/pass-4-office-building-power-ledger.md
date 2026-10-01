# Pass 4 office, building and power category disposition ledger

> Incremental scope: Office, School & Stationery is complete. Building, Electrical & Hardware and Power, Solar & Energy remain pending and are not represented as reviewed.

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

## Remaining batch work

Building, Electrical & Hardware is the next parent. Power, Solar & Energy follows it. No status for either parent is advanced by this ledger section.

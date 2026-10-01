# Pass 5 fashion, sports and automotive category disposition ledger

> Incremental scope: Fashion & Accessories is complete. Sports & Outdoors and Automotive & Motorcycle remain pending.

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
| `watch-3bab17` | Phones & Wearables → Fashion › Watches & Jewellery | The current capture has five Samsung/Huawei bands and smartwatches, contradicting the prior “ordinary watches” rationale. This accepted semantic move is parked for user decision rather than silently overturned. |
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
5. **Disposition:** proposed for user decision and left unchanged in implementation because overturning an accepted semantic decision requires approval. Independent Fashion source review is complete.

## Remaining batch work

Sports & Outdoors is the next parent. Automotive & Motorcycle follows it. The disputed incoming watch move does not block either independent review.

# Pass 6 garden, classifieds and media category disposition ledger

> Incremental scope: Garden, Agriculture & Agrovet is complete. Classifieds and Gaming, Books & Media remain pending.

## Evidence basis

The declared Garden source inventory is the four rows under the stable source ID `agriculture-agrovet` in `liveSpineShelves.ts`. Product and descendant evidence comes from the read-only demo capture made at `2026-09-05T15:11:13` from `product_clusters_mvp`, stored in `data/demo-dataset.tar.gz` (SHA-256 `432064d4c6e235e4eaebc9164d37c084d463cb0dc96948ac0be0949f6ff83aca`). Evidence locations are `public/demo/shelves/<slug>/{tree.json,meta.json,products-*.json}` after the existing `demo:prepare` materialization; generated evidence was not edited or committed.

All products were inspected for all four shelves. The largest collection spans seven general retailers, while each of the three small shelves has only one retailer. Collection placement remains separate from product reassignment, and the display label “Garden, Agriculture & Agrovet” remains an override on the stable `agriculture-agrovet` ID.

## Garden, Agriculture & Agrovet inventory and decisions

| Source shelf / full captured breadcrumb | Evidence and coverage | Disposition / destination | Rationale |
| --- | --- | --- | --- |
| `farm-animal-pet` — Farm, Animals & Pets › Animal Feeds & Pets | all 466 / 7 retailers | moved → Pet Supplies › **Pet Care** | The collection is overwhelmingly retail dog/cat food, litter, shampoo, collars and related supplies; a handful of beverage contaminants do not provide evidence of live-animal listings. The broad Pet Care family does not claim product purity. |
| `insecticide` — INSECTICIDES | all 8 / Eastmatt | moved → Household Cleaning › **Pest Control** | Household insect spray, mosquito coils, an electric mat vaporizer and refill are indoor pest-control consumables, not agricultural crop treatments. |
| `udongo-1b3b46` — UDONGO | all 3 / Eastmatt | unresolved → **Needs Review** | Packaged “udongo” and roasted clay products provide no evidence of potting soil or another garden input. Their consumption/use intent is insufficiently documented, so label similarity is rejected. |
| `planter-af536f` — PLANTERS | all 2 / Eastmatt | retained/grouped → **Planters & Pots** | Both products are household/garden planters with dishes. This is the only clean garden-goods collection in the source inventory. |

## Incoming boundary checks

These checks are separate from the four-shelf Garden source inventory.

| Incoming or adjacent shelf | Current placement | Boundary result |
| --- | --- | --- |
| `pet` | Classifieds-style **Live Pets & Livestock** | The current 459-product capture is retail pet food, litter, shampoo, collars and accessories, with beverage contaminants and no observed live-animal listing. This contradicts the accepted Pass 2 rationale and is parked for user approval. |
| `poultry` | Classifieds-style **Live Pets & Livestock** | The current 66-product capture contains fresh/frozen chicken, turkey products and sausages, not live poultry. This contradicts the accepted Pass 2 rationale and is parked for user approval. |
| `pet-care`, `pet-accessory-toy`, `pet-pet-accessory-pet-food` | Pet Supplies | Retail food, collars, leashes, toys and care products support keeping retail supplies separate from genuine live-animal classifieds. |
| `hardware` | Building › Needs Review | Garden tools, sprayers, fertilizer and pet products are embedded in a heavily contaminated 980-product collection. It remains unresolved rather than being moved wholesale into Garden. |
| `tool` / `tool-garage` | Building › Hand Tools | The rake shares a collection with a screwdriver; broad hand-tools placement remains safer than asserting a pure garden-tools collection. |

## Reconciliation and compatibility

- **Originating inventory:** 4 examined, 4 explicitly dispositioned exactly once, 3 decided at evidence-supported broad/moved/retained granularity, and 1 unresolved (`udongo-1b3b46`).
- **Incoming checks:** 5 boundary groups, counted separately.
- Every shelf ID, `/shelf/:slug` URL and listing membership remains unchanged. No capture, product assignment or canonical category was edited.
- `agriculture-agrovet` joins `reviewedSourceDepartments` only after complete explicit coverage; future shelves fail closed.
- The source contains no evidenced live-animal collection. That absence is not filled by inferring from “Farm, Animals & Pets.”

## Evidence-backed disagreement: `pet` and `poultry`

1. **Current assumption:** Pass 2 treats `pet` and `poultry` as live-animal classifieds and keeps both in **Live Pets & Livestock**.
2. **Contradicting evidence:** the complete current `pet` capture has 459 retail supply records and no observed live animal; the complete `poultry` capture has 66 fresh/frozen poultry-food products and no observed live animal. This is fact from the checked-in capture. It remains uncertain whether Pass 2 used different evidence or inferred semantics from labels.
3. **Alternative:** move `pet` to Pet Supplies › Pet Care and `poultry` to Groceries & Drinks › Meat, Fish & Seafood (or a poultry-specific grocery family if later evidence justifies one), retaining both URLs.
4. **Impact:** two accepted Pass 2 semantic decisions, tests and ledger rows would change. Shelf IDs, URLs and membership would not; product reassignment and canonical publication remain out of scope. The Classifieds review must account for the absence of an evidenced live-animal shelf if approved.
5. **Disposition:** proposed for user decision and left unchanged in implementation. Independent Garden source review is complete.

## Remaining batch work

Classifieds is the next parent. Gaming, Books & Media follows it. The disputed incoming `pet` and `poultry` moves affect the Classifieds boundary, so their user decision should be incorporated while reviewing that parent.

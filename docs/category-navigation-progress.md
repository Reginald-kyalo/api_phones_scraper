# Category navigation review

## Release baseline

The approved Phones & Wearables category hierarchy is pinned to `phones_scraper` commit `e5e36c9cdd28c5e983c2a810b192b13361fbec4e`, authored from `taxonomy_redesign.md` §5, with source SHA-256 `7fb474cade66b3c89c7b6037e7fcc1ab9d2b9a7fa3966d40ec2838c2a715f598`. The repository contains the exact approved source snapshot and provenance metadata under `dealsonline_ui_ux_mock/data/phone-navigation/`. The generated navigation contains all 60 approved source nodes plus the iPhones and iPads shortcuts.

Run `npm run check:phone-navigation --prefix dealsonline_ui_ux_mock` to verify the snapshot checksum, regenerate in memory, compare `phoneNavigation.json` byte-for-byte, and run the navigation contracts. Advancing the source is an explicit release update: replace the snapshot, update its provenance, update the pinned commit and checksum in the exporter and progress record, and regenerate the JSON together.

## 2026-10-01 continuation verification

Implementation resumed from `3ebcd2ddcc061887dfd38830492a91f59bb5cde6`, which matched the refreshed `origin/clusters-api` ref with a clean worktree. The phone regression seam now executes the same fail-closed input validation, department-retention rule, and collection detector used by the application. A consistent fixture with no captured phone shelves and no phone dispositions remains valid and keeps the Phones & Wearables department routable. Separate executable cases confirm that a stale disposition and a new unreviewed shelf still fail, while exact-slug and ancestor collection detection reject an unrelated ancestor.

This verification changes neither the pinned phone source nor any collection disposition. It extracts dependency-free policy helpers solely so fixture tests can execute the behavior without adding a test framework or loading the React application.

## What is implemented

The mock desktop menu, mobile menu, category directory, aisle page, and nested category pages use the approved phone hierarchy. Mobile Phones, Tablets & E-Readers, Wearables, power/cables, protection/carry, audio/add-ons, phone parts, tablet accessories, and office telephony remain distinct. Canonical categories and shortcuts intentionally show no unverified counts.

Legacy shelves remain collection links on their original `/shelf/:slug` URLs. The evidence ledgers in `docs/taxonomy-review/` and the explicit placement table record a disposition for every captured shelf in all nineteen original source departments: Home Appliances; Home, Furniture & Décor; Kitchen & Dining; Groceries & Drinks; Health, Beauty & Personal Care; Baby, Kids & Toys; Computing & Networking; Phones & Wearables; TV, Audio & Music; Cameras, Security & Surveillance; Office, School & Stationery; Building, Electrical & Hardware; Power, Solar & Energy; Fashion & Accessories; Sports & Outdoors; Automotive & Motorcycle; Garden, Agriculture & Agrovet; Classifieds; and Gaming, Books & Media. Captures for these sources fail closed when a shelf lacks a disposition. Recorded cross-parent moves are collection-navigation decisions, not product reassignment.

For Phones & Wearables specifically, mixed and contaminated legacy shelves now have explicit collection dispositions. `phone-tablet` and `computer-tablet` remain clearly labelled mixed mobile collections; `laptop-tablet`, `screen-replacement`, `charger-6a5f2e`, `bag-fd8696`, `glass`, `watch-3bab17`, `tool`, and `accessory-kit` are grouped with the documented destination collection families. This resolves the legacy-navigation disposition question without asserting that every product inside those collections is pure or reassigned.

## Remaining review work

Explicit placement coverage proves that every captured shelf has a navigation disposition. It does **not** prove product purity, complete product-level splitting, published-production parity, or completion of both ends of every semantic boundary review. Those claims remain open until supported by product evidence and a comparison with the published production hierarchy.

All nine continuation parents are reviewed. Pass 6 is complete: Garden has three decided and one unresolved shelf, Classifieds has four decided and none unresolved, and Gaming, Books & Media has three decided plus one moved-but-unresolved hardware shelf. The stable empty Classifieds aisle remains routable, and no uncaptured books/media family was invented. The next action is navigation-wide reconciliation; product purity, product assignment and production publication remain separate incomplete phases.

## Completed navigation reconciliation

The collection-navigation review covers all **483 captured shelves across all 19 original source departments**. Every source shelf has exactly one explicit disposition, including unresolved outcomes, and every original `/shelf/:slug` remains available. The placement table and fail-closed tests—not the prose status alone—are the enforcement source of truth.

| Stable source ID | Current display label | Captured shelves | Explicitly unresolved | Evidence ledger |
| --- | --- | ---: | ---: | --- |
| `phones-wearables` | Phones & Wearables | 34 | 0 | [Pass 3](taxonomy-review/pass-3-electronics-ledger.md#phones-tablets--wearables) |
| `groceries-everyday-essentials` | Groceries & Drinks | 158 | 0 | [Pass 2](taxonomy-review/pass-2-grocery-health-baby-pet-ledger.md#groceries--drinks) |
| `tv-audio-home-entertainment` | TV, Audio & Music | 27 | 0 | [Pass 3](taxonomy-review/pass-3-electronics-ledger.md#tv-audio--music) |
| `computing-networking` | Computing & Networking | 42 | 1 | [Pass 3](taxonomy-review/pass-3-electronics-ledger.md#computing--networking) |
| `health-beauty-personal-care` | Health, Beauty & Personal Care | 33 | 0 | [Pass 2](taxonomy-review/pass-2-grocery-health-baby-pet-ledger.md#health-beauty--personal-care) |
| `home-appliances` | Home Appliances | 32 | 1 | [Pass 1](taxonomy-review/pass-1-home-ledger.md#home-appliances) |
| `home-furniture-decor` | Home, Furniture & Décor | 31 | 1 | [Pass 1](taxonomy-review/pass-1-home-ledger.md#home-furniture--décor) |
| `kitchen-dining-cookware` | Kitchen & Dining | 33 | 1 | [Pass 1](taxonomy-review/pass-1-home-ledger.md#kitchen--dining) |
| `office-school-stationery` | Office, School & Stationery | 23 | 3 | [Pass 4](taxonomy-review/pass-4-office-building-power-ledger.md#office-school--stationery-inventory-and-decisions) |
| `building-electrical-hardware` | Building, Electrical & Hardware | 11 | 3 | [Pass 4](taxonomy-review/pass-4-office-building-power-ledger.md#building-electrical--hardware-inventory-and-decisions) |
| `fashion-accessories` | Fashion & Accessories | 13 | 2 | [Pass 5](taxonomy-review/pass-5-fashion-sports-automotive-ledger.md#fashion--accessories-inventory-and-decisions) |
| `power-solar-energy` | Power, Solar & Energy | 10 | 0 | [Pass 4](taxonomy-review/pass-4-office-building-power-ledger.md#power-solar--energy-inventory-and-decisions) |
| `baby-kids-toys` | Baby, Kids & Toys | 8 | 0 | [Pass 2](taxonomy-review/pass-2-grocery-health-baby-pet-ledger.md#baby-kids--toys) |
| `classifieds` | Classifieds | 4 | 0 | [Pass 6](taxonomy-review/pass-6-garden-classifieds-media-ledger.md#classifieds-inventory-and-decisions) |
| `cameras-security-surveillance` | Cameras, Security & Surveillance | 4 | 0 | [Pass 3](taxonomy-review/pass-3-electronics-ledger.md#cameras-security--surveillance) |
| `automotive-motorcycle` | Automotive & Motorcycle | 7 | 1 | [Pass 5](taxonomy-review/pass-5-fashion-sports-automotive-ledger.md#automotive--motorcycle-inventory-and-decisions) |
| `sports-outdoors-leisure` | Sports & Outdoors | 5 | 2 | [Pass 5](taxonomy-review/pass-5-fashion-sports-automotive-ledger.md#sports--outdoors-inventory-and-decisions) |
| `agriculture-agrovet` | Garden, Agriculture & Agrovet | 4 | 1 | [Pass 6](taxonomy-review/pass-6-garden-classifieds-media-ledger.md#garden-agriculture--agrovet-inventory-and-decisions) |
| `gaming-books-media` | Gaming, Books & Media | 4 | 1 | [Pass 6](taxonomy-review/pass-6-garden-classifieds-media-ledger.md#gaming-books--media-inventory-and-decisions) |

Two collection-navigation destinations were added outside the original 19 stable source departments: `household-cleaning`, displayed as **Household Cleaning & Essentials**, and `pet-supplies`, displayed as **Pet Supplies**. They collect evidence-backed incoming shelves and are not counted as additional source inventories.

### Explicit unresolved collections

Seventeen collections remain explicitly visible under **Needs Review**: `plotter`; `electronic`; `home-garden-kid`; `cooking-equipment-fuel-c23ce7`; `ultra-book`; `pen`; `tape-glue`; `hardware`; `industrial-raw-material`; `plate-box`; `fashion-accessory`; `luggage-bag-133a33`; `lubricant-oil-fluid`; `sport-fitness`; `ball`; `udongo-1b3b46`; and `hardware-other`. Their ledger rows record the conflicting evidence and safe current destination. No material cross-parent approval is currently pending: the previously disputed `watch-3bab17`, `pet`, and `poultry` corrections were user-approved and reconciled.

### Work intentionally not completed by navigation review

- **Product purity:** a broad or decided collection may still contain contaminated individual products; sampling and collection placement do not prove purity.
- **Product assignment:** no backend listing or product was reassigned by these navigation decisions.
- **Canonical taxonomy publication:** the phone hierarchy pin was not advanced, and no production taxonomy release was activated.
- **Production parity:** no separately identified published hierarchy was compared end-to-end, so production parity is not claimed.

The subsequent phase is product-level assignment and canonical publication planning, with production-parity comparison treated as its own evidenced deliverable.

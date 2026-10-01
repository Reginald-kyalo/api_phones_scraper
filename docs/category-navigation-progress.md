# Category navigation review

## Release baseline

The approved Phones & Wearables category hierarchy is pinned to `phones_scraper` commit `e5e36c9cdd28c5e983c2a810b192b13361fbec4e`, authored from `taxonomy_redesign.md` §5, with source SHA-256 `7fb474cade66b3c89c7b6037e7fcc1ab9d2b9a7fa3966d40ec2838c2a715f598`. The repository contains the exact approved source snapshot and provenance metadata under `dealsonline_ui_ux_mock/data/phone-navigation/`. The generated navigation contains all 60 approved source nodes plus the iPhones and iPads shortcuts.

Run `npm run check:phone-navigation --prefix dealsonline_ui_ux_mock` to verify the snapshot checksum, regenerate in memory, compare `phoneNavigation.json` byte-for-byte, and run the navigation contracts. Advancing the source is an explicit release update: replace the snapshot, update its provenance, update the pinned commit and checksum in the exporter and progress record, and regenerate the JSON together.

## 2026-10-01 continuation verification

Implementation resumed from `3ebcd2ddcc061887dfd38830492a91f59bb5cde6`, which matched the refreshed `origin/clusters-api` ref with a clean worktree. The phone regression seam now executes the same fail-closed input validation, department-retention rule, and collection detector used by the application. A consistent fixture with no captured phone shelves and no phone dispositions remains valid and keeps the Phones & Wearables department routable. Separate executable cases confirm that a stale disposition and a new unreviewed shelf still fail, while exact-slug and ancestor collection detection reject an unrelated ancestor.

This verification changes neither the pinned phone source nor any collection disposition. It extracts dependency-free policy helpers solely so fixture tests can execute the behavior without adding a test framework or loading the React application.

## What is implemented

The mock desktop menu, mobile menu, category directory, aisle page, and nested category pages use the approved phone hierarchy. Mobile Phones, Tablets & E-Readers, Wearables, power/cables, protection/carry, audio/add-ons, phone parts, tablet accessories, and office telephony remain distinct. Canonical categories and shortcuts intentionally show no unverified counts.

Legacy shelves remain collection links on their original `/shelf/:slug` URLs. The evidence ledgers in `docs/taxonomy-review/` and the explicit placement table record a disposition for every captured shelf in thirteen reviewed source departments: Home Appliances; Home, Furniture & Décor; Kitchen & Dining; Groceries & Drinks; Health, Beauty & Personal Care; Baby, Kids & Toys; Computing & Networking; Phones & Wearables; TV, Audio & Music; Cameras, Security & Surveillance; Office, School & Stationery; Building, Electrical & Hardware; and Power, Solar & Energy. Captures for these sources fail closed when a shelf lacks a disposition. Recorded cross-parent moves are collection-navigation decisions, not product reassignment.

For Phones & Wearables specifically, mixed and contaminated legacy shelves now have explicit collection dispositions. `phone-tablet` and `computer-tablet` remain clearly labelled mixed mobile collections; `laptop-tablet`, `screen-replacement`, `charger-6a5f2e`, `bag-fd8696`, `glass`, `watch-3bab17`, `tool`, and `accessory-kit` are grouped with the documented destination collection families. This resolves the legacy-navigation disposition question without asserting that every product inside those collections is pure or reassigned.

## Remaining review work

Explicit placement coverage proves that every captured shelf has a navigation disposition. It does **not** prove product purity, complete product-level splitting, published-production parity, or completion of both ends of every semantic boundary review. Those claims remain open until supported by product evidence and a comparison with the published production hierarchy.

Six source parents remain for the agreed later review batches: Fashion & Accessories; Sports, Outdoors & Leisure; Automotive & Motorcycle; Agriculture & Agrovet; Classifieds; and Gaming, Books & Media. Pass 4 is complete: Office has 20 decided and three unresolved shelves, Building has eight decided and three unresolved shelves, and Power has ten decided with none unresolved. Continue with Fashion & Accessories using the existing evidence-ledger and fail-closed placement conventions. Revisit a reviewed parent only when a specific cross-parent boundary decision requires it.

# Department naming and structure — the spec for Phase 2.1

Input for the curated department spine (`CATEGORY_ROADMAP.md` Phase 2.1). This is **not** a
request to rename nodes in `browse_nodes`: the shop's label is the upstream join key and the
engine's duplicate fold reasons about it. This specifies the **presentation spine** — the ~15
departments a shopper sees, and which `browse_nodes` roots each one adopts.

**Measured live 2026-08-21** against 4,137 nodes / 956 browsable / 529 browsable roots.

## ✅ THE SPINE IS RULED — 21 departments, 2026-08-21

This spec's rules were applied to the engine's candidate list and ruled on. Result:
`phones_scraper/implementation_plans/department_spine_worksheet_2026-08-21.md` §8.

⛔⛔ **RULE 7 IS REFUTED AS A RANKING — and it stays valid as a tie-break.** *"Weight by stores
before clusters"* is exactly right when choosing between two candidates for **one concept** (it
is what makes `Smartphones`/30 beat `Phones`/12 beyond argument). As an **ordering of
departments** it is wrong, and bluntly: ranking this tree's roots by store span puts `Gaming`
(**9 clusters**, 21 stores) first and `Power Banks` (38 clusters) second. Store span is a
**filter**, never a sort key. This project has been misled by a store count three times.

⭐ **§4's proposal is superseded by the ruled spine**, though its direction held. Three changes:
- **`Electronics` is retired.** Measured, it is **90% audio** (this doc says 86% — re-measure),
  and its remainder is **1,464 unsorted clusters** plus a `Laptops` shelf another department
  already claims. It has no content of its own.
- ⛔ **Audio must adopt `audio-music-equipment`, not `audio`.** The department's mass is **11,646
  clusters sitting DIRECTLY on a two-store node**, not the 6,275 shelf beneath it. Adopting
  `audio` alone strands those 11,646 above the department claiming them — the "menu says X, page
  shows Y" defect, re-created by a curation choice.
- ⛔⛔ **Do not promote a shelf to a root to make it a department.** Measured: detaching from a
  coarse ancestor **strands every cluster that reached it by refinement** (`smart-watch`
  717 → 645), and as roots `Tablets` and `Wearables` rank **#24 and #23 of 530** — outside the
  panel's top 12, i.e. *less* visible than today. **Adopt where the node sits.**

⭐ **USER RULINGS 2026-08-21:** groceries split **four** ways (Drinks / Fresh / Bakery / Pantry) ·
department names are **presentation and may be renamed freely**, so rule 2 costs nothing
(⛔ `browse_nodes` labels stay untouched — they are the join key).

⚠️ **On §3's PriceRunner benchmark: it gives exactly one usable result and then stops.** Their 14
departments vs our 15 corroborates the *size*. A label join is dead — **0** of 66 candidates match
a spine top-level department, 26% match any of its 424 nodes — and its vocabulary contains `phone`
but not `smartphone`, `tv` but not `television`: the same one-word problem, a third time. Worth one
afternoon of reading and zero lines of code.

---

## 1. Why the current top level reads wrong

Every complaint below is reproducible from `/api/clusters/browse-tree` today. They are not
opinions about wording — each one is a case where **the label is false about its contents**.

### ⛔ `Phones and tablets` (23,467) contains no tablets

`Tablets` — 602 clusters across **31 stores**, the widest-stocked node in the entire tree — sits
under `Computers & Tablets`, under a **third root** (`Computers`). What the department actually
holds:

| child | subtree | stores | note |
|---|---:|---:|---|
| `Smartphones` | 2,929 | 30 | |
| `Smart watches` | 717 | 10 | not a phone |
| `Phones` | 416 | 12 | **duplicate of Smartphones** |
| `Kids Tablets & Phones` | 74 | 1 | tablets, but not under Tablets |
| `iPhones & iPads` | 18 | 1 | brand facet |
| `Phones & Tablets Accesorries` | 3 | 1 | misspelled; real accessories are elsewhere |

⭐ So the name promises two things and delivers one, and the 19,310 clusters sitting directly on
the root are unsorted into any of it.

⛔⛔ **AND THE DOMAIN IS SPLIT ACROSS FIVE ROOTS, NOT ONE.** Phones, computing and their
accessories are spread over five separate top-level shelves that no navigation connects:

| root | subtree | stores | holds |
|---|---:|---:|---|
| `Phones and tablets` | 23,467 | 12 | phones, watches — no tablets |
| `Electronics & Computers` | 20,772 | 1 | 86% audio; two laptop shelves |
| `PHONES & ACCESSORIES` | 4,206 | 1 | phone accessories + *fashion* accessories |
| `Telephony, Computing & Networking` | 2,303 | 1 | a third laptop shelf |
| `Computers` | 754 | 12 | **Tablets (31 stores)** |

⚠️ Three of the five are single-store roots — one shop's breadcrumb promoted to a department. A
shopper looking for a tablet has to guess which of five departments a shop happened to file it
under. **This is the concrete face of "46 taxonomies unioned, not merged"** (issue 6), and it is
why the spine is worth more than any renaming.

### ⛔ `Electronics & Computers` (20,772) is 86% audio

Its dominant branch is `Audio & Music Equipment` (17,921) → `Audio` (6,275, 19 stores). The
second-largest department on the site is an **audio** department wearing a computing label.
Worse, it holds *two* laptop shelves in different branches: `Laptops` (590) under `Electronics`,
and `Computers & Laptops` (471) as a sibling. One of its nodes is literally
`Computers & Laptops, Computers` (1 cluster) — a breadcrumb-join artifact.

### ⛔ `PHONES & ACCESSORIES` → `Accessories` (308) is *fashion* accessories

`Accessories`(308) resolves entirely to `Fashion Accessories`(308). A clothing shelf is filed
under a phones department, at real scale.

### ⛔ Five departments are pass-throughs

One browsable child holds **100%** of the parent's stock, so the menu column shows a single entry
that restates its own heading:

| department | its only child | share |
|---|---|---:|
| `Home, Garden & Kids` | `Home & Garden` | 100% |
| `Cleaning, Household & Personal Care` | `Cleaning & Household` | 100% |
| `Office & School Supplies` | `OFFICE STATIONERY` | 100% |
| `Food & Beverages` | `Beverages` | 100% |
| `Computer and Counters` | `Back Counter` | 100% |

⚠️ These are the same shape as the inversions in `CATEGORY_DATA_ISSUES.md` §15 but are **not**
caught by it, because parent and child share tokens. They are a spine problem, not a data
problem: the spine should adopt whichever of the pair is the real shelf and drop the other.

---

## 2. Naming rules

Derived from the defects above, in priority order. Each one exists because it was broken.

1. **A department's name must be true of everything it claims.** `Phones and tablets` fails this
   outright. If the tablets are not in it, the name does not say tablets.
2. **No conjunctions in a department name.** `A & B` is how a shop wrote its breadcrumb, not how a
   shopper searches. It also creates the coarse-node problem the whole taxonomy already suffers
   from: `Computers & Tablets` spans 1 store while its child `Tablets` spans 31. Name the
   department for the one thing it is; put the other thing beside it as its own department.
3. **One concept, one shelf.** `Smartphones`(2,929) and `Phones`(416) are the same shelf. Adopt
   the better-attested one — more stores first, then more clusters — and fold the other into it.
4. **Narrower goes under broader.** `Kids Tablets & Phones` belongs under `Tablets`, not beside
   the department. Same for `iPhones & iPads`.
5. **Name it what a shopper types.** Plural common noun: `Laptops`, `Smartphones`, `Televisions`.
   Never a shop's banner (`Back Counter`, `OFFICE STATIONERY`, `Computer and Counters`).
6. **Brand is a filter, never a department.** Already agreed with the engine and applied at the
   root; the spine must not reintroduce it one level down (`iPhones & iPads`, `EliteBook`).
7. **Weight by stores before clusters.** A node on 31 stores with 602 clusters is a better
   department than one on 1 store with 2,018 — cross-store breadth *is* the product.

---

## 3. PriceRunner as benchmark — what to take, what not to

⭐ Worth benchmarking, **not copying**. What their tree gets right and this one does not:

- **A shallow, fixed top level.** ~14 product types that do not change when a shop is added. Ours
  has 529 roots that move on every rebuild.
- **Unambiguous plural nouns.** `Mobile Phones`, `Laptops`, `TVs` — no `&`, no store vocabulary.
- **Brand and spec are facets inside a shelf**, never shelves.
- **The department is a landing page with intent**, not a pass-through to one child.

⛔ What **not** to take: their depth and category granularity assume a catalogue with consistent
supplier feeds. This tree is built bottom-up from 46 Kenyan shops' breadcrumbs, where 75% of roots
come from a single store. A PriceRunner-shaped tree cannot be imposed — it has to be **adopted
onto** what the shops actually stock, which is exactly what Phase 2.1's 417 stocked roots are for.

⚠️ Their category set is also wrong for this market: it has no grocery department, and groceries
are the largest multi-store pool in this corpus.

---

## 4. Proposed spine — the phone and computing domain

Concrete proposal for the part the current top level gets most wrong. The rest of the ~15
departments should be built the same way against `publish_browse_tree.stocked_roots`.

| department | adopts | why |
|---|---|---|
| **Smartphones** | `smartphone` (2,929 / 30 stores), folding `phone`(416) and `iphone-ipad`(18) | Rule 3. The best-attested phone shelf in the tree; `Phones` is the same shelf under a worse name. |
| **Tablets** | `tablet` (602 / **31 stores**), adopting `kid-tablet-phone`(74) | Rule 4. Buried two levels under a 754-cluster root (`Computers` → `Computers & Tablets`) despite the widest store span on the site. |
| **Phone accessories** | `phone-accessory` (3,704 / 11 stores) | Real, well-stocked, and currently buried under a root called `PHONES & ACCESSORIES` whose other branch is fashion. |
| **Wearables** | `smart-watch` (717 / 10 stores) | Rule 1. A smart watch is not a phone; it should not be a child of a phone department. |
| **Laptops** | `laptop-2eb1af`(590 / 10) + `laptop`(522) + `computer-laptop`(471) | Rule 3 across branches — three laptop shelves in two departments. |
| **Audio** | `audio-music-equipment` (17,921) / `audio` (6,275 / 19 stores) | Rule 1. This is what `Electronics & Computers` mostly is; promote it and stop mislabelling it. |

⛔ **`Phones and tablets` should not survive as a department name** under any of these. On the
user's suggestion of `Phones and accessories`: it reads better but still breaks rule 2, and the
accessories sit in a *different root* (`landline-phone-accessory`) from the phones. Two
departments — **Smartphones** and **Phone accessories** — say the true thing and are each
independently navigable.

⚠️ **Where do the 19,310 clusters sitting directly on `phone-tablet` go?** They are the
department's own unsorted stock, 82% of it. Splitting the name does not sort them — that needs
placement work upstream, and until it happens whichever department adopts that root inherits a
very large undifferentiated shelf. **This is the open question Phase 2.1 has to answer**, and it
is bigger than the naming.

---

## 5. What this unblocks

The panel already orders departments honestly (by subtree stock) and the count it shows agrees
with the page it links to. What it cannot fix is that **the twelve things it shows are shop
vocabulary**. Every defect in §1 is visible in the live mega panel right now. The spine is the
fix; the naming rules above are its acceptance criteria.

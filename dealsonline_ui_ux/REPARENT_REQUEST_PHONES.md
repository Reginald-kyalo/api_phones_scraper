# Re-parenting request — the phone and tablet domain

## ✅✅ ANSWERED AND APPLIED 2026-08-21 — read this before the request below

**R1, R2 and R7 are ruled in, published, and verified node by node.** R10 is decided.
R3/R4 are deferred. Full measured reply:
`phones_scraper/implementation_plans/reparent_phone_domain_2026-08-21.md`.

⭐ **Every measurement in this request reproduced exactly** — including the disjointness claim
(`smartphone` ∩ `phone` clusters = **0**) and the conservation assertion (102,038, held across
all five variants simulated). The request was sound.

⚠️ **NOT TO BE CONFUSED WITH THE *SLUG-SPACE* DISJOINTNESS CLAIM, WHICH DID NOT HOLD.** The one
above is about CLUSTER MEMBERSHIP between two nodes and is correct. `CATEGORY_TREE_API.md` §2
separately claimed the two *trees'* slug spaces intersect in "literally ZERO" members; measured
2026-09-04 they share **12**, and the redesign spine shares 95 with `browse_nodes`. Corrected
there and in `CATEGORY_DATA_ISSUES.md`. Nothing in this request depends on it. The disagreements below are about
**mechanism**, and they are the reason it was simulated rather than applied.

⛔⛔ **TWO OF THE FOUR "CONFIDENT" MOVES WOULD HAVE MADE THE STOREFRONT WORSE AS SPECIFIED.**
A published `browse_nodes` slug is a **merge SURVIVOR**, not an address: `phone` is five source
nodes folded into the one with the most rows. Re-parent that slug on the raw source and the other
four stay behind, re-merge, and elect a **new** survivor — R1 applied literally produced
`phone-0b70f2` *Phones*, 288 clusters, **still at the top level**: the exact duplicate this
request exists to remove. Fixed by ORDERING, not by a different ruling — overrides now apply
after `merge_duplicate_siblings` and re-run it.

⛔ **The predicted effects were arithmetic on subtree sums, and a re-parent is not a rigid move
of a subtree.** `place_cluster` refines placements *within an ancestry*, so moving a node changes
the counts being moved:

| node | you predicted | measured, applied |
|---|---:|---:|
| `phone-tablet` | 23,393 | **23,346** |
| `smartphone` | 3,345 | **3,325** |
| `tablet` | 676 | **720** |
| `computer` | 828 | **872** |

⚠️ **R2 applied literally would have moved 6 clusters, not 74** — 65 of the 74 only ever reached
`kid-tablet-phone` by refining down from a `phone-tablet` majority. Applied correctly it moves 118.

**Verdicts:** R1 ✅ · R2 ✅ · R7 ✅ · R3/R4 ⛔ deferred (19 clusters between them) ·
R5 ⛔ **not as a re-parent** — promoting `smart-watch` costs it **72 of its 717 clusters** and
drops it to panel rank #23 of 530, *less* visible than today · R6 ✅ your reading of
`is_root_facet` was right · R8 ⚠️ the rule cannot take it either —
`is_root_facet('NOTHING PHONES')` is **False**; recommend leaving it · R9 ✅ agreed, and R1
already drains it 53 → 18, but an engine rule for it was **measured and refuted** ·
R10 ✅ **decided — `phone` survives and `/shelf/phone-11b5d5` 404s**, no alias.

⭐ Your §4 ("what NOT to do") was right, and its rule-2 point — token-subset misses
`Phones`/`Smartphones` because "smartphone" is one word — turned out to be a defect in **our**
report too: `inverted_under_conjunction`'s top entry was that exact false positive. Fixed, 17 → 16.

⚠️ One correction: your §4 caveat says the *more words = narrower, EXCEPT across `&`* rule
"breaks on `Kids Tablets & Phones`". It does not — the `&` makes it broader **over its arms**
and *Kids* makes it narrower **over the domain**; both hold at once, and `conjunction_arms`
already implements that reading.

---


**To:** `phones_scraper`, branch `matching` · **From:** storefront · **2026-08-21**

A verdict-ready worklist, not a rule. The storefront's top level shows `Smartphones`, `Phones`
and `Kids Tablets & Phones` as siblings, and this asks for that to be fixed **in the tree**
rather than papered over in the client.

⭐ **WHY THE TREE AND NOT THE CLIENT.** `smartphone` (2,313 clusters) and `phone` (371) hold
**disjoint** cluster sets — measured, intersection is exactly 0 — and `/by-node/{slug}` takes one
slug. So a display-only fold would give a menu entry promising 3,345 products that opens a page
showing 2,929: the same "menu says X, page shows Y" defect the subtree rollup was just built to
remove. Re-parent instead and **descendant closure does the rest for free**, for every consumer.

---

## 1. What the shopper sees today

```
Phones and tablets                       23,467   12 stores    ⛔ contains no tablets
├─ Smartphones            smartphone      2,929   30 stores
│   ├─ Phones             phone-11b5d5      495    7 stores    ⛔ label collides with `phone`
│   ├─ Refurbished (Boxed) Phones           53     2           ⚠️ a CONDITION, not a category
│   ├─ Smart Phones       smart-phone        33     1           ⛔ duplicate of the parent
│   ├─ NOTHING PHONES     nothing-phone      13     6           ⚠️ brand
│   ├─ Feature Phones     feature-phone      11     1           ✅ a real sub-type
│   ├─ Smart Phones - Refurb                10     1           ⛔ duplicate + condition
│   └─ Memory Cards       memory-card         1    18           ⛔ misfiled (engine issue 12)
├─ Smart watches          smart-watch       717   10 stores    ⚠️ not a phone
├─ Phones                 phone             416   12 stores    ⛔ same concept as Smartphones
├─ Kids Tablets & Phones  kid-tablet-phone   74    1 store     ⛔ tablets, not under Tablets
├─ iPhones & iPads        iphone-ipad        18    1 store     ⚠️ brand facet
└─ Phones & Tablets Accesorries              3    1 store     ⚠️ misspelled; 3 clusters
```

Meanwhile `Tablets` (`tablet`) — **602 clusters across 31 stores, the widest store span in the
whole tree** — sits under `Computers & Tablets` under a third root, `Computers`.

---

## 2. Confident — please apply

| # | Move | From | To | Evidence |
|---|---|---|---|---|
| R1 | `phone` | `phone-tablet` | `smartphone` | Same concept. `smartphone` wins on **both** axes — 30 stores vs 12, 2,313 own clusters vs 371 — so the direction is not a judgement call. |
| R2 | `kid-tablet-phone` | `phone-tablet` | `tablet` | It is tablets. 1 store, 74 clusters; nothing about it belongs beside a 30-store phone shelf. |
| R3 | `smart-phone` | `smartphone` | merge into `phone-11b5d5` | Label-identical to its own grandparent's concept; 1 store, 33 clusters. |
| R4 | `smart-phone-refurb` | `smartphone` | merge into `refurbished-boxed-phone` | Two refurb shelves under one parent, 1 and 2 stores. |

### Predicted effect, for you to check against

| node | before | after | delta |
|---|---:|---:|---:|
| `phone-tablet` | 23,467 | 23,393 | −74 |
| `smartphone` | 2,929 | **3,345** | +416 |
| `tablet` | 602 | **676** | +74 |
| `computer` (root above `tablet`) | 754 | 828 | +74 |

⭐ **Total placements are conserved at 102,038** — recomputed after applying R1 and R2 to the
full tree. A re-parent moves stock between subtrees; it must never change the total, and that is
the cheapest post-publish assertion available.

---

## 3. Needs your ruling — I have a view, not a verdict

| # | Node | Question | My view |
|---|---|---|---|
| R5 | `smart-watch` (717, 10 st) | A watch is not a phone. Promote to its own department? | **Yes.** It is the second-largest child of a department whose name does not describe it. |
| R6 | `iphone-ipad` (18, 1 st) | Brand facet spanning two product types. | **Demote**, per your issue-10 precedent — but it is not at root, so your rule may not reach it. |
| R7 | `phone-tablet-accesorry` (3, 1 st) | Misspelled ("Accesorries"), and real phone accessories live at `phone-accessory` (3,704, 11 st) under a different root. | **Merge into `phone-accessory`** or demote; 3 clusters either way. |
| R8 | `nothing-phone` (13, **6 st**) | Brand, but 6 stores — better attested than several real shelves. | Brand-as-shelf, so demote — though the store span argues it is a real thing people search. |
| R9 | `refurbished-boxed-phone` (53, 2 st) | Refurbished is a **condition**, not a category — the API already models condition via `condition_basis` / `likely_used`. | Condition belongs in a filter, not the tree. Structural, so yours to call. |
| R10 | `phone` vs `phone-11b5d5` | Both are labelled **`Phones`**, in different branches, with different store sets (overlap: `avechi`, `badili`). | After R1 they are parent and child of the same concept — they should probably be **one node**. This is issue 6 in miniature. |

---

## 4. ⛔ What NOT to do — three mechanical rules, three failure modes

Recorded because each looked reasonable and each is wrong, and a rule applied at scale would do
real damage.

1. **Direction by store count.** Produces `Mouse` (14 clusters, 10 st) as the **parent** of
   `Keyboards and mouse` (346 clusters, 3 st), and `BREAKFAST CEREALS` as the parent of
   `Breakfast`. Store span picks the better-attested node, which is not the broader one.
2. **Token-subset matching.** Misses the pair this whole request is about — `Phones` and
   `Smartphones` share no token, because "smartphone" is one word.
3. **Head-noun substring.** Catches it, but also pairs `Smart watches` with `Smartphones` on
   "smart", and `iPhones & iPads` with everything containing "phone".

⭐ Your existing conclusion stands and this is the evidence for it: these need **human verdicts**.
What is offered here is a ranked list with the measurements attached, not another rule.

⚠️ One caveat on the taxonomy's own stated rule — *"more words = narrower, EXCEPT across `&`,
where more words = broader"*. It breaks on `Kids Tablets & Phones`: the `&` is there, but "Kids"
is a qualifier, so the node is **narrower**, not broader. Worth knowing before the rule is
leaned on.

---

## 5. After you publish

The storefront needs no change — `n_clusters_subtree` and the panel already read whatever the
tree says, and `browse-tree` sorts by subtree stock, so the departments reorder correctly on
their own. Two things to be aware of:

- ⚠️ **The API caches the tree for 300s** (`BROWSE_TTL_SECONDS`), and the subtree rollup caches on
  the same TTL. Expect up to five minutes of the old shape.
- ⭐ `npm run verify:categories` (48 assertions, live API, three viewports) is the regression
  check. It asserts **relationships, not counts** — it survived your 2026-08-19 rebuild unchanged
  — so it should stay green across this one too. If it does not, the shape moved in a way the
  storefront cannot render, and that is worth knowing within minutes rather than at the next
  screenshot.

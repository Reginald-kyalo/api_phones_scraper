/**
 * Presentation rules for the CANONICAL category tree (`taxonomy_db.browse_nodes`).
 *
 * ⭐ WHY THIS EXISTS. The tree is built bottom-up from 46 Kenyan shops' own breadcrumbs, so its
 * labels are shop copy, not our copy. Measured 2026-08-21 over the 956 browsable nodes: **270
 * SHOUT** (`OFFICE STATIONERY`, `SOAPS & DETERGENTS`, `WHITE GOODS`) and **5 more arrive entirely
 * lowercase** (`coolants`, `plotters`), so `categoryLabel` rewrites **275** of them. The counts
 * also mean something other than what a shopper reads them as. Every surface that renders a
 * category needs the same answers, so they live here once rather than three times.
 *
 * ⚠️ These figures move on every engine republish and are a snapshot, not a contract — the
 * BEHAVIOUR is the contract, and `scripts/verify_categories.py` asserts that instead.
 *
 * ⛔ NORMALISE ON READ, NEVER WRITE BACK. These are display rules, not data repairs — the shop's
 * label is the join key upstream and the engine's duplicate-fold reasons about it. Rewriting a
 * label in the client and then sending it anywhere would corrupt exactly that.
 */
import {
  Apple, Armchair, Baby, BatteryCharging, Beef, BookOpen, Cable, Camera, Car, Coffee, Cookie,
  Dumbbell, Flower2, Gamepad2, Headphones, HeartPulse, Home, Laptop, Lightbulb, Milk, Monitor,
  Package, PawPrint, Pencil, Pill, Printer, Refrigerator, Router, Shirt, ShoppingBasket, Sofa,
  Speaker, Smartphone, Sparkles, SprayCan, Tablet, Tv, UtensilsCrossed, Watch, WashingMachine,
  Wine, Wrench, type LucideIcon,
} from 'lucide-react';
import type { BrowseNode } from './api';

// ---------------------------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------------------------

/**
 * Tokens that must survive title-casing. Everything else in a SHOUTED label is an ordinary
 * word — measured over the live tree, the short tokens are `BABY`, `INCH`, `HOT`, `MILK`… so a
 * blanket "short means acronym" rule would be wrong far more often than right.
 */
const ACRONYMS = new Set([
  'TV', 'TVS', 'DVD', 'CD', 'PC', 'PCS', 'USB', 'LED', 'LCD', 'HD', 'HDMI', 'CCTV', 'AC', 'DC',
  'SD', 'GPS', 'UPS', 'LPG', 'UHT', 'PVC', 'RAM', 'SSD', 'HDD', 'IT', 'ID', 'MP3', 'MP4',
  '3D', '4K', 'USA', 'UK', 'DIY', 'BBQ', 'SPF', 'UV',
  // ⛔ `SIM` IS DELIBERATELY ABSENT. The live tree's only shouted use of it is `SIM SIM` — the
  // Kenyan name for sesame, a food root — and the one genuine SIM-card shelf already reads
  // `Sim Cards & Tools` in mixed case, which this function never touches. Keeping `SIM` would
  // shout a grocery term to protect a shelf that needs no protecting.
]);

/** Lowercased inside a title, never at the start. */
const MINOR = new Set(['and', 'or', 'of', 'the', 'a', 'an', 'to', 'for', 'with', 'in', 'on', 'at']);

/** Title-case one whitespace-delimited token, descending through `-` and `/` compounds. */
function titleToken(token: string, isFirst: boolean): string {
  if (/[-/]/.test(token)) {
    // ⛔ Split on the separator and KEEP it: `PENS MATH-SETS` must not become `Pens Mathsets`.
    return token
      .split(/([-/])/)
      .map((part, i) => (/[-/]/.test(part) ? part : titleToken(part, isFirst && i === 0)))
      .join('');
  }
  const bare = token.replace(/[^A-Za-z0-9]/g, '');
  if (bare && ACRONYMS.has(bare.toUpperCase())) return token.toUpperCase();
  const lower = token.toLowerCase();
  if (!isFirst && MINOR.has(lower)) return lower;
  return lower.replace(/[a-z]/, (c) => c.toUpperCase());
}

/**
 * A category label fit to render.
 *
 * ⛔ ONLY SHOUTED LABELS ARE TOUCHED. `iPhones & iPads`, `MacBook Pro` and `Fresh produce` carry
 * deliberate casing that a blanket title-caser would destroy — turning `iPads` into `Ipads` is a
 * worse bug than the shouting, because it is wrong rather than merely loud.
 */
export function categoryLabel(node: Pick<BrowseNode, 'slug' | 'label'>): string {
  const raw = (node.label ?? '').trim();
  // ⛔ Falls back to the SLUG, never to empty: a nameless tile is unclickable in practice.
  if (!raw) return node.slug;
  const shouting = raw === raw.toUpperCase() && /[A-Z]{2,}/.test(raw);
  if (shouting) return raw.split(/\s+/).map((t, i) => titleToken(t, i === 0)).join(' ');
  // The mirror case: `coolants`, `plotters`, `laptop fan` arrive entirely lowercase. Only
  // ENTIRELY lowercase, though — `iPads` and `iPhones & iPads` carry a deliberate capital and
  // must pass through untouched.
  if (raw === raw.toLowerCase()) {
    return raw.replace(/^[a-z]/, (c) => c.toUpperCase());
  }
  return raw;
}

// ---------------------------------------------------------------------------------------------
// Near-duplicate children
// ---------------------------------------------------------------------------------------------

/**
 * ⛔⛔ A BARE SUBSTRING TEST WAS NEVER AN OPTION, AND THE ENGINE PROVED IT FIRST: `phone` ⊂
 * `headphone` and `phone` ⊂ `microphone`, and BOTH labels exist in this tree. So the shape below
 * is deliberately narrow — the PARENT's canonical form must END WITH the child's, and the
 * leftover prefix must itself be a known modifier.
 *
 * ⭐ This is the same vocabulary the engine ships as `_ARM_MODIFIERS` in its conjunction-arm
 * test, kept identical on purpose: two repos guessing separately at "what counts as a modifier"
 * is how the two category trees came to disagree in the first place.
 */
const MODIFIERS = new Set(['smart', 'mobile', 'cell', 'feature']);

/** Lowercase, drop punctuation and spaces, strip a trailing plural. `Smartphones` → `smartphone`. */
function canonicalForm(label: string | null): string {
  return (label ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, '')
    .replace(/s$/, '');
}

/**
 * Does this child restate its own parent, only less specifically?
 *
 * ⭐⭐ MEASURED OVER THE WHOLE LIVE TREE BEFORE IT SHIPPED: it fires on **exactly one** parent/
 * child pair — `Phones` (1,082) under `Smartphones` — and the modifier guard suppresses **60**
 * others, every one of which is a CONJUNCTION correctly containing one of its own arms:
 * `Personal Care` under `Beauty & Personal Care`, `Tablets` under `Computers & Tablets`,
 * `Desktops` under `Laptops & Desktops`. Folding those would delete real hierarchy.
 *
 * ⭐ THE GUARD BUYS NOTHING ON TODAY'S CORPUS — WHICH IS EXACTLY WHY IT IS IN. Dropping it and
 * keeping the bare `endsWith` measures identically green right now, and goes wrong the first time
 * a shop files `Headphones` under a `Phones` shelf. That is the lesson this project already paid
 * for once upstream.
 *
 * ⛔ DISPLAY ONLY, AND IT HIDES NOTHING. A folded child's products are ALREADY in the parent's
 * listing — `/by-node` and `/by-department` both return the descendant closure — so this removes
 * a redundant navigation tile and no stock. The child's own URL keeps working; it just stops
 * being offered as a subdivision of a shelf it is a synonym for.
 *
 * ⛔ AND IT IS NOT A DATA REPAIR. The engine measured a merge verb for exactly this class and
 * REFUTED it: 23 near-duplicate pairs decompose into channels that already exist, leaving 3
 * genuine merges tree-wide, and merging here would reap `/shelf/phone` — a live 1,082-cluster
 * URL. Fixing the presentation is reversible; fixing the tree is not.
 */
export function foldsIntoParent(
  child: Pick<BrowseNode, 'label'>,
  parentLabel: string | null,
): boolean {
  const c = canonicalForm(child.label);
  const p = canonicalForm(parentLabel);
  if (!c || !p || c === p || !p.endsWith(c) || p.length <= c.length) return false;
  return MODIFIERS.has(p.slice(0, p.length - c.length));
}

/** The children worth offering as subdivisions — the parent's own synonyms removed. */
export function foldChildren<T extends Pick<BrowseNode, 'label'>>(
  children: T[],
  parentLabel: string | null,
): T[] {
  return children.filter((c) => !foldsIntoParent(c, parentLabel));
}

/**
 * The adopted shelves worth offering as subdivisions OF A DEPARTMENT — roadmap 1b.2.
 *
 * ⛔⛔ A DEPARTMENT IS NOT A TREE NODE, AND `foldChildren` IS THE WRONG TOOL FOR IT.
 * `foldsIntoParent` deliberately returns false on `c === p`, because in the canonical tree a
 * child never *is* its parent. A department ADOPTS roots, and it is usually named after the
 * principal one — so exact restatement is the normal case there, not an impossible one.
 * Measured over all 21 live departments 2026-09-04: **46 adopted shelves, and `foldChildren`
 * removed exactly ONE of them** (`Phones` under `Smartphones`), leaving 13 departments offering
 * a "subdivision" that is their own name.
 *
 * ⛔⛔ AND THE WORST CASE IS NOT REDUNDANCY, IT IS AMBIGUITY. The Laptops department adopts
 * three roots — `laptop`, `laptop-2eb1af`, `laptop-06ffb7` — and **all three are labelled
 * "Laptops"**. The panel rendered three identical tiles reading 655, 590 and 285, with nothing
 * to choose between them. That is the cross-parent duplicate the audit filed as issue 6, which
 * `departments.py` says adoption "unifies without a merge the engine refuted" — and adoption
 * does unify the TOTAL (1,530), but the menu was still listing the parts.
 *
 * ⭐ SO DUPLICATES ARE DROPPED WHOLE, NEVER COLLAPSED TO ONE. Keeping the biggest tile would
 * link a shopper to `/shelf/laptop` — 655 of the department's 1,530 — and quietly lose 875
 * clusters behind a tile that looks like the whole thing. Dropping all three sends them to the
 * department page, which holds every one.
 *
 * ⛔ MORE-SPECIFIC CHILDREN ARE KEPT. `Soft Drinks` under `Drinks` and `Exercise Books` under
 * `Stationery` are real subdivisions; only ambiguity is removed.
 *
 * ⛔⛔ A SHELF THAT MERELY RESTATES ITS DEPARTMENT IS DELIBERATELY **KEPT**, AND THAT IS A
 * SCOPE DECISION, NOT AN OVERSIGHT. Dropping those was implemented, measured and backed out:
 * it empties the second level for **8 of 21 departments including `Smartphones`, the site's
 * flagship**, trading one redundant-but-clickable tile for a blank column. The better answer is
 * probably to drill one level deeper — `smartphone` holds 3,325 in subtree against 2,181 of its
 * own, so real subdivisions do exist below it — but that needs a second request per department
 * and reshapes the main navigation, which the roadmap reserves for the owner (1b.2, "sequence
 * after 2.1"). Measured for that decision: 13 of 21 departments offer a shelf that restates
 * their own name.
 *
 * ⛔ AND THIS HIDES NO STOCK, for the same reason `foldChildren` does not: `/by-department`
 * returns the descendant closure over every adopted root, so a dropped shelf's products are
 * already in the department's own listing. Its URL keeps working; it stops being offered as a
 * subdivision nobody can choose. An empty result is a supported state — the panel already
 * renders "X is a single shelf".
 */
export function departmentShelves<T extends Pick<BrowseNode, 'label'>>(
  shelves: T[],
  departmentLabel: string | null,
): T[] {
  const seen = new Map<string, number>();
  for (const s of shelves) {
    const k = canonicalForm(s.label);
    if (k) seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  return shelves.filter((s) => {
    const k = canonicalForm(s.label);
    if (!k) return false;
    if ((seen.get(k) ?? 0) > 1) return false; // indistinguishable from a sibling
    return !foldsIntoParent(s, departmentLabel); // the existing modifier-guarded case
  });
}

// ---------------------------------------------------------------------------------------------
// Counts
// ---------------------------------------------------------------------------------------------

/**
 * How many products a shelf actually leads to.
 *
 * ⛔⛔ NOT `n_clusters`. That is the node's OWN stock and the shelf page renders the descendant
 * closure, so `Food Cupboard` advertised 2,010 and delivered 6,220 — a 3x understatement on the
 * exact departments (the coarse ones) that most need an honest number. `n_clusters_subtree` is
 * the same figure `/by-node/{slug}` returns as `total`, so the menu and the page it links to
 * agree by construction.
 *
 * ⚠️ `?? n_clusters` guards an API older than the field rather than rendering 0 products for a
 * stocked department.
 */
export function shelfCount(node: Pick<BrowseNode, 'n_clusters' | 'n_clusters_subtree'>): number {
  return node.n_clusters_subtree ?? node.n_clusters ?? 0;
}

/** `6220` → `6,220`; `23466` → `23.5k`, because a menu column has no room for five digits. */
export function formatCount(n: number): string {
  if (n >= 10_000) return `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}k`.replace('.0k', 'k');
  return n.toLocaleString();
}

// ---------------------------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------------------------

/**
 * ⛔ THE CANONICAL TREE LIVES UNDER `/shelf`, NEVER `/browse`. `/browse` serves the retired
 * 424-node PriceRunner spine and the two slug spaces share ZERO members, so a canonical slug
 * handed to `/browse` resolves to nothing at all. Routing through one helper is what stops that
 * from being re-derived — and mis-derived — at each call site.
 */
export function shelfHref(slug: string): string {
  return `/shelf/${encodeURIComponent(slug)}`;
}

/**
 * ⛔⛔ A DEPARTMENT ID IS A THIRD SLUG SPACE, AND IT OVERLAPS THE OTHER TWO. Six ruled ids
 * (`audio`, `bakery`, `cleaning`, `fresh`, `hardware`, `pantry`) also name a `browse_nodes`
 * shelf, and the pages are genuinely different — `/department/pantry` is `snack` +
 * `breakfast-cereal` (485) while `/shelf/pantry` is a node holding 889 that no department
 * adopts. Neither is wrong and neither redirects to the other.
 *
 * ⛔ So `departmentHref` and `shelfHref` are the ONLY two link builders, for exactly the reason
 * `shelfHref` exists: passing an id to the wrong one resolves to a plausible, wrong page instead
 * of erroring. That is worse than a 404, and the render gate asserts against it.
 */
export function departmentHref(id: string): string {
  return `/department/${encodeURIComponent(id)}`;
}

/**
 * ⛔⛔ THE FOURTH SLUG SPACE, AND THE REASON IT GETS ITS OWN BUILDER. `shelfHref` exists because
 * a canonical slug handed to `/browse` finds nothing; `departmentHref` exists because six
 * curated ids also name a shelf. This exists because `home-appliances` names BOTH a designed
 * department and a curated one, and `/aisle/home-appliances` and `/department/home-appliances`
 * are genuinely different pages — neither redirects to the other.
 *
 * ⛔ Measured 2026-09-04: the 19 designed department ids collide with `browse_nodes` on ZERO
 * slugs. That safety does NOT extend to the spine's 1,392 nodes, of which 95 collide with
 * `browse_nodes` and 43 of those are browsable — so a spine node slug must never be passed here.
 * This builder takes DEPARTMENT ids only.
 */
export function aisleHref(id: string): string {
  return `/aisle/${encodeURIComponent(id)}`;
}

// ---------------------------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------------------------

/**
 * ⭐ KEYWORD-MATCHED, NOT SLUG-KEYED. The retired spine had 14 fixed product types and a literal
 * `Record<slug, Icon>` was exhaustive. This tree has ~529 browsable roots, is rebuilt from shop
 * breadcrumbs, and its slugs carry collision suffixes (`laptop-2eb1af`) — a lookup table would be
 * stale on the next publish. Matching the LABEL degrades to a sensible default instead of a hole.
 *
 * ⚠️ Order matters: the first hit wins, so narrower terms sit above the departments that contain
 * them (`tablet` before `phone`, `laptop` before `computer`).
 */
const ICON_RULES: ReadonlyArray<readonly [RegExp, LucideIcon]> = [
  [/\btablet|ipad\b/i, Tablet],
  [/\bphone|mobile|smartphone|telephony\b/i, Smartphone],
  [/\blaptop|macbook|notebook\b/i, Laptop],
  [/\bmonitor|display|screen\b/i, Monitor],
  [/\bprinter|toner|cartridge\b/i, Printer],
  [/\brouter|network|wifi|modem\b/i, Router],
  [/\bcomputer|computing|electronic|gadget\b/i, Laptop],
  [/\bheadphone|earphone|earbud\b/i, Headphones],
  [/\bspeaker|audio|sound|music\b/i, Speaker],
  [/\btv\b|television|visual\b/i, Tv],
  [/\bcamera|photograph\b/i, Camera],
  [/\bwatch|wearable\b/i, Watch],
  [/\bcable|charger|power bank\b/i, Cable],
  [/\bbattery\b/i, BatteryCharging],
  [/\bgaming|game|console|toy\b/i, Gamepad2],
  [/\bfridge|freezer|refrigerat\b/i, Refrigerator],
  [/\bwashing|laundry|white good\b/i, WashingMachine],
  [/\bkitchen|cookware|dining|utensil\b/i, UtensilsCrossed],
  [/\bbedding|linen|mattress\b/i, Sofa],
  [/\bfurniture|sofa|chair|seat\b/i, Armchair],
  [/\blight|lamp|bulb|electrical\b/i, Lightbulb],
  [/\bclean|detergent|soap|household\b/i, SprayCan],
  [/\bbeauty|cosmetic|fragrance|personal care|skin|hair\b/i, Sparkles],
  [/\bhealth|pharmac|medic|supplement|vitamin\b/i, Pill],
  [/\bfitness|sport|gym|exercise\b/i, Dumbbell],
  [/\bbaby|infant|diaper|kid\b/i, Baby],
  [/\bpet\b|\bdog\b|\bcat\b/i, PawPrint],
  [/\bbook|stationer|office|school|pen\b/i, BookOpen],
  [/\bwriting|pencil\b/i, Pencil],
  [/\bcloth|apparel|fashion|shoe|wear\b/i, Shirt],
  [/\bgarden|plant|flower|outdoor\b/i, Flower2],
  [/\bcar\b|\bauto|motor|vehicle|cycle\b/i, Car],
  [/\btool|hardware|diy|industrial|building\b/i, Wrench],
  [/\balcohol|wine|beer|spirit|liquor\b/i, Wine],
  [/\bcoffee|tea\b|beverage|drink\b/i, Coffee],
  [/\bdairy|milk|cheese|yoghurt|yogurt\b/i, Milk],
  [/\bmeat|butcher|poultry|beef|fish\b/i, Beef],
  [/\bsnack|confectioner|biscuit|sweet|chocolate\b/i, Cookie],
  [/\bfruit|vegetable|fresh|produce|organic\b/i, Apple],
  [/\bfood|grocer|cupboard|cereal|pantry\b/i, ShoppingBasket],
  [/\bhome|house|interior|decor\b/i, Home],
];

/** An icon for a shelf. Always returns one — `Package` is the honest "we have no better idea". */
export function categoryIcon(node: Pick<BrowseNode, 'slug' | 'label'>): LucideIcon {
  const hay = `${node.label ?? ''} ${node.slug}`;
  for (const [re, icon] of ICON_RULES) if (re.test(hay)) return icon;
  return Package;
}

/**
 * An icon for a ruled DEPARTMENT.
 *
 * ⭐ The same keyword rules, and they work BETTER here: a department's label is ours and is
 * already a plural common noun (`Smartphones`, `Personal care`), where a node's label is shop
 * copy that may SHOUT or carry a collision-suffixed slug.
 *
 * ⛔ AND THERE IS DELIBERATELY NO `departmentLabel`. `categoryLabel` exists to repair 275 of 956
 * SHOUTING shop labels; a department name was written by a person and must be rendered exactly
 * as ruled. Passing one through a title-caser would be the client quietly editing a ruling.
 */
export function departmentIcon(dept: { id: string; label: string }): LucideIcon {
  return categoryIcon({ slug: dept.id, label: dept.label });
}

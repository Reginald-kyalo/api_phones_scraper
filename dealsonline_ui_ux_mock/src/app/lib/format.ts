/**
 * Shared formatting helpers.
 *
 * Currency is the single source of truth for how prices render across the app.
 * The product data is Kenyan (KES); historically some components hardcoded "£"
 * from the original scrape — always go through formatPrice instead.
 */

const KES = new Intl.NumberFormat('en-KE', {
  maximumFractionDigits: 0,
});

/** Format a numeric price as Kenyan Shillings, e.g. 12999 → "KES 12,999". */
export function formatPrice(value: number | null | undefined): string {
  // Guard junk/placeholder prices (the feed has items priced at 0.1 that would
  // otherwise round to "KES 0").
  if (value == null || Number.isNaN(value) || value < 1) return 'Price N/A';
  return `KES ${KES.format(Math.round(value))}`;
}

/** Compact count, e.g. 1 → "1 shop", 6 → "6 shops". */
export function shopLabel(n: number): string {
  return `${n} ${n === 1 ? 'shop' : 'shops'}`;
}

/**
 * How many shops this product can actually be COMPARED across.
 *
 * Below two there is no comparison, and saying so is better than a confident
 * "1 shop" above an expander with nothing worth opening.
 */
export function comparedLabel(n: number): string {
  if (n <= 0) return 'no price available';
  if (n === 1) return 'only 1 shop — no comparison';
  return `compared across ${n} shops`;
}

/**
 * What a shopper actually saves by buying at the cheapest store, as a percentage.
 *
 * ⛔ `like_for_like_spread_pct` IS NOT A SAVING and must never be rendered as
 * one. The engine computes it as `(dearest - cheapest) / cheapest` — a markup
 * over the low price. The saving divides by the price you avoid paying:
 *
 *     67 -> 112     spread  = 45/67  = 67%     <- what the API publishes
 *                   saving  = 45/112 = 40%     <- what the shopper gets
 *
 * Measured over the 4,595 shipped clusters with a spread: the two agree closely
 * for most (median gap 0.4pp) but diverge badly in the tail — 312 clusters (7%)
 * overstate the saving by 20 points or more, and the worst renders a "3750%"
 * badge against a real saving of 97%. A saving above 100% is impossible, which
 * is how you can tell at a glance that the raw spread is the wrong number for a
 * shopping surface.
 *
 * Algebra: saving = s / (1 + s), so the conversion is exact and needs no prices.
 * Returns null where there is no spread to convert, so callers keep hiding the
 * badge rather than rendering "0%".
 */
export function savingPct(spreadPct: number | null | undefined): number | null {
  if (spreadPct == null || Number.isNaN(spreadPct) || spreadPct <= 0) return null;
  return (spreadPct / (100 + spreadPct)) * 100;
}

/**
 * Savings above this are almost always a mismatched pair (a 1-pack against a
 * 2-pack, a used phone against a new one), not a deal. See DESIGN_RULES.md §5.
 */
export const MAX_DISPLAY_SAVING_PCT = 60;
/** A saving smaller than this in cash is noise, whatever its percentage. */
export const MIN_DISPLAY_SAVING_KES = 50;

export interface DisplaySaving {
  /** Rounded percentage the shopper keeps, always 1 to MAX_DISPLAY_SAVING_PCT. */
  pct: number;
  /** Cash saved buying at the cheapest shop instead of the dearest. */
  kes: number;
}

/**
 * The ONE saving a shopper may see. Every badge, filter and sentence that
 * mentions a saving goes through here, so a product carries one number on
 * every page.
 *
 * Takes the engine's spread (a markup over the cheapest price) and the cheapest
 * price, converts to a real saving, and returns null — render nothing — when
 * the number is implausible (over 60%) or trivial (under KES 50).
 */
export function displaySaving(
  spreadPct: number | null | undefined,
  lowestPrice: number | null | undefined,
): DisplaySaving | null {
  const pct = savingPct(spreadPct);
  if (pct == null || lowestPrice == null || lowestPrice < 1) return null;
  const kes = Math.round((lowestPrice * (spreadPct as number)) / 100);
  if (pct > MAX_DISPLAY_SAVING_PCT || kes < MIN_DISPLAY_SAVING_KES) return null;
  const rounded = Math.round(pct);
  return rounded >= 1 ? { pct: rounded, kes } : null;
}

/** Convenience for anything shaped like a cluster row. */
export function clusterSaving(cluster: {
  like_for_like_spread_pct: number | null;
  best_price: number | null;
  n_stores_priced?: number | null;
  n_stores: number | null;
}): DisplaySaving | null {
  // A saving between shops needs two shops with a price. Some rows carry a
  // spread from shops that no longer quote one, which read "Save 35%" above
  // "lowest of 1 shop".
  if (pricedShopCount(cluster) < 2) return null;
  return displaySaving(cluster.like_for_like_spread_pct, cluster.best_price);
}

/**
 * The one shop count. `n_stores` counts shops that CARRY a product; a page can
 * only show the ones that quote a price, so that is the number every surface
 * renders. Falls back for fixtures captured before `n_stores_priced` existed.
 */
export function pricedShopCount(cluster: {
  n_stores_priced?: number | null;
  n_stores: number | null;
}): number {
  return cluster.n_stores_priced ?? cluster.n_stores ?? 0;
}

/** True when a price is real enough to put in a price slot. */
export function hasPrice(value: number | null | undefined): value is number {
  return value != null && !Number.isNaN(value) && value >= 1;
}

/** Short form for chart axes: 52000 → "52k", 1250000 → "1.3m". */
export function shortKes(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(Math.round(value));
}

/** "2 h ago", "3 days ago", "12 Sep 2026". For "checked …" lines. */
export function checkedAgo(iso: string | null | undefined, now = Date.now()): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const hours = Math.max(0, Math.round((now - then) / 3_600_000));
  if (hours < 1) return 'under an hour ago';
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days <= 14) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Brands and units that are written in capitals. The capture title-cases
 * names ("Jbl Bar 1000 Mk2", "Tcl 55 Inch Led Tv"); a shopper reads JBL, TCL,
 * LED and TV. Only title-cased words are touched, so "Oppo" and "Sony" stay.
 */
const CAPS = new Set([
  'jbl', 'tcl', 'hp', 'lg', 'tp', 'jvc', 'aoc', 'msi', 'zte', 'htc', 'akg', 'rca', 'hmd',
  'usb', 'hdmi', 'led', 'oled', 'qled', 'tv', 'ssd', 'hdd', 'ram', 'uhd', 'fhd', 'hd',
  'nfc', 'gps', 'ac', 'dc', 'lcd', 'cpu', 'gpu',
]);

function tidyWords(text: string): string {
  return text
    .replace(/\b([A-Za-z]+)\b/g, (word) =>
      CAPS.has(word.toLowerCase()) && word !== word.toUpperCase() ? word.toUpperCase() : word,
    )
    // 128Gb, 2Tb, 4k: the unit in capitals, as on the box.
    .replace(/\b(\d+)(gb|tb|mb|k)\b/gi, (_, n: string, unit: string) => `${n}${unit.toUpperCase()}`);
}

/** The name to show for a product, with brand and unit capitals restored. */
export function productName(row: { display_name?: string | null; title: string }): string {
  return tidyWords(row.display_name ?? row.title);
}

/** A brand as written by the brand: "jbl" → "JBL", "samsung" → "Samsung". */
export function brandName(brand: string): string {
  return tidyWords(brand.replace(/(^|[\s-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase()));
}

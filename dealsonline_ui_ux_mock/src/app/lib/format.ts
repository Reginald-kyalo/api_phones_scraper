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
  if (value == null || Number.isNaN(value) || value < 1) return 'Price unavailable';
  return `KES ${KES.format(Math.round(value))}`;
}

/** Compact count, e.g. 1 → "1 shop", 6 → "6 shops". */
export function shopLabel(n: number): string {
  return `${n} ${n === 1 ? 'shop' : 'shops'}`;
}

/**
 * The difference between the dearest and cheapest shop, as a percentage of
 * the dearest price: what a shopper keeps by choosing the cheapest.
 *
 * ⛔ `like_for_like_spread_pct` IS NOT that number and must never be rendered
 * as one. The engine computes it as `(dearest - cheapest) / cheapest` — a
 * markup over the low price. The difference divides by the price you avoid
 * paying:
 *
 *     67 -> 112     spread     = 45/67  = 67%     <- what the API publishes
 *                   difference = 45/112 = 40%     <- what the shopper keeps
 *
 * Measured over the 4,595 shipped clusters with a spread: the two agree closely
 * for most (median gap 0.4pp) but diverge badly in the tail — 312 clusters (7%)
 * overstate it by 20 points or more, and the worst renders a "3750%" badge
 * against a real difference of 97%. A difference above 100% is impossible,
 * which is how you can tell at a glance that the raw spread is the wrong
 * number for a shopping surface.
 *
 * Algebra: difference = s / (1 + s), so the conversion is exact and needs no
 * prices. Returns null where there is no spread to convert, so callers keep
 * hiding the badge rather than rendering "0%".
 */
export function savingPct(spreadPct: number | null | undefined): number | null {
  if (spreadPct == null || Number.isNaN(spreadPct) || spreadPct <= 0) return null;
  return (spreadPct / (100 + spreadPct)) * 100;
}

/**
 * Differences above this are almost always a mismatched pair (a 1-pack
 * against a 2-pack, a used phone against a new one), not two prices for one
 * product. See DESIGN_RULES.md §5.
 */
export const MAX_DISPLAY_SAVING_PCT = 60;
/** A difference smaller than this in cash is noise, whatever its percentage. */
export const MIN_DISPLAY_SAVING_KES = 50;

export interface DisplaySaving {
  /** Rounded percentage lower than the dearest shop, always 1 to MAX_DISPLAY_SAVING_PCT. */
  pct: number;
  /** Cash difference between the cheapest and the dearest shop. */
  kes: number;
}

/**
 * The ONE price difference a shopper may see. Every badge, filter and sentence
 * that mentions one goes through here, so a product carries one number on
 * every page.
 *
 * Takes the engine's spread (a markup over the cheapest price) and the cheapest
 * price, converts to the shopper's percentage, and returns null — render
 * nothing — when the number is implausible (over 60%) or trivial (under KES 50).
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
  condition_basis?: string | null;
}): DisplaySaving | null {
  // A difference between shops needs two shops with a price. Some rows carry a
  // spread from shops that no longer quote one, which read "12% lower" above
  // "lowest of 1 shop".
  if (pricedShopCount(cluster) < 2) return null;
  // Used and refurbished listings are asking prices for items of unknown
  // grade: two of them are not the same product at two prices, so no
  // percentage is claimed between them (design audit 2026-10-21, T02).
  if (cluster.condition_basis === 'likely_used') return null;
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

const DAY_MS = 86_400_000;

/**
 * "2 h ago" within the last day, then the date: "18 Jul 2026". For "Checked …"
 * lines. A relative time reads as fresh, so it is only used while it is; an
 * older check is shown as the date it happened (design audit, §7).
 */
export function checkedAgo(iso: string | null | undefined, now = Date.now()): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const hours = Math.max(0, Math.round((now - then) / 3_600_000));
  if (hours < 1) return 'under an hour ago';
  if (hours < 24) return `${hours} h ago`;
  return checkedDate(iso);
}

/** "18 Jul 2026": the day a price was checked. */
export function checkedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi',
  });
}

/** "10 Jul 2026, 15:36" in Kenyan time: the exact moment a price was checked. */
export function checkedAt(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: 'Africa/Nairobi',
  });
}

/** A check older than this is shown as a recorded price, not a current one. */
export const STALE_AFTER_DAYS = 30;

/**
 * Decided when the page is viewed, not when the data was captured: a price
 * checked in July is historical in October whatever the capture said.
 * Unknown dates are not stale; they are unknown, and say so elsewhere.
 */
export function isStale(iso: string | null | undefined, now = Date.now()): boolean {
  if (!iso) return false;
  const then = new Date(iso).getTime();
  return !Number.isNaN(then) && now - then > STALE_AFTER_DAYS * DAY_MS;
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

/**
 * Shop titles typed in capitals ("ALWAYS MAXI THICK ROXANNE LITE") read as
 * shouting in a grid; set them in title case, then restore real capitals.
 */
function unshout(text: string): string {
  const letters = text.replace(/[^A-Za-z]/g, '');
  if (letters.length < 4 || letters !== letters.toUpperCase()) return text;
  return text.toLowerCase().replace(/(^|[\s/(-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** The name to show for a product, with brand and unit capitals restored. */
export function productName(row: { display_name?: string | null; title: string }): string {
  return tidyWords(unshout(row.display_name ?? row.title));
}

/** Categories whose brand field is reliable: electronics, sold by maker name. */
const BRANDED = new Set([
  'mobile-phones', 'laptops', 'tablets', 'tvs', 'monitors', 'digital-cameras', 'audio-systems',
  'headphones', 'speakers', 'printers', 'mobile-phone-accessories',
]);

/**
 * The eyebrow above a product name: the brand where it can be trusted,
 * else the category. Outside electronics the brand is extracted from the
 * title and is often a stray first word ("mosquito", "eggplant", "de"),
 * which shown alone looks like a bug.
 */
export function eyebrow(row: { brand?: string | null; category?: string | null; display_name?: string | null; title: string }, categoryName: (slug: string) => string): string {
  const brand = row.brand?.trim();
  const name = (row.display_name ?? row.title).toLowerCase();
  if (brand && BRANDED.has(row.category ?? '') && name.startsWith(brand.toLowerCase())) return brandName(brand);
  return row.category ? categoryName(row.category) : 'Product';
}

/** A brand as written by the brand: "jbl" → "JBL", "samsung" → "Samsung". */
export function brandName(brand: string): string {
  return tidyWords(brand.replace(/(^|[\s-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase()));
}

/**
 * The recorded prices a chart or a verdict may use, oldest first: dated,
 * positive, and within 5x of the series median (the capture has a few
 * misplaced decimal points: KES 1,159,900 for an 11,599 phone). The product
 * page and the chart both read this, so the "Price history" link is only
 * offered where the chart will actually draw (design audit, C05).
 */
export function usablePriceHistory(
  history: { t: string; price: number }[] | null | undefined,
): { t: string; price: number }[] {
  if (!history?.length) return [];
  const valid = history.filter((p) => p.price >= 1 && !Number.isNaN(Date.parse(p.t)));
  const ordered = valid.map((p) => p.price).sort((a, b) => a - b);
  const median = ordered[Math.floor(ordered.length / 2)] ?? 0;
  return valid
    .filter((p) => median === 0 || (p.price <= median * 5 && p.price >= median / 5))
    .sort((a, b) => Date.parse(a.t) - Date.parse(b.t));
}

/**
 * One line placing today's lowest price against what we recorded, from the
 * price history. Null unless the data supports it: three or more recorded
 * prices in the last 90 days, counted from today (not from the newest
 * record, which would call a July series "the last 90 days" in October), and
 * a record within the last 30 days so the comparison is with a live series.
 * Never says "deal" or "cheap": it states where the price sits.
 */
export function priceVerdict(
  history: { t: string; price: number }[] | null | undefined,
  current: number | null | undefined,
  now = Date.now(),
): string | null {
  if (!hasPrice(current)) return null;
  const sane = usablePriceHistory(history);
  if (!sane.length) return null;
  const newest = Date.parse(sane[sane.length - 1].t);
  if (now - newest > STALE_AFTER_DAYS * DAY_MS) return null;
  const recent = sane.filter((p) => Date.parse(p.t) >= now - 90 * DAY_MS);
  if (recent.length < 3) return null;
  const prices = recent.map((p) => p.price);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const low = Math.min(...prices);
  const threshold = Math.max(50, avg * 0.03);
  if (current <= low && Math.max(...prices) - low >= threshold) return 'The lowest price we have recorded in the last 90 days.';
  if (avg - current >= threshold) return `${formatPrice(avg - current)} below the average we recorded over 90 days.`;
  if (current - avg >= threshold) return `${formatPrice(current - avg)} above the average we recorded over 90 days.`;
  return 'About the average we recorded over the last 90 days.';
}

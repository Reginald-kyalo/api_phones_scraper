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

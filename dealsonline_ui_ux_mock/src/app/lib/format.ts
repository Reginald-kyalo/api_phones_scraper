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

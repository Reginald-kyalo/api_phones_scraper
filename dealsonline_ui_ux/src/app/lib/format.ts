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
 * ⛔⛔ NOT `n_stores`. That counts shops holding a listing; this counts shops whose price
 * survived the engine's gate (delisted, out of stock, implausibly priced, or a used/refurb
 * listing cannot price a headline). Measured 2026-08-21 on the smartphone shelf: 99 of 100
 * clusters overstated, by a mean of +9.6 shops — `Samsung Galaxy S23 Ultra` advertised 20 and
 * the comparison table could show 2. On a price-comparison storefront that number IS the
 * promise, so it has to be the honest one.
 *
 * ⭐ BELOW TWO THERE IS NO COMPARISON, and saying so is better than a confident "1 shop": 29%
 * of that same shelf cannot be compared at all, and a shopper deserves to know before clicking.
 */
export function comparedLabel(n: number): string {
  if (n <= 0) return 'no price available';
  if (n === 1) return 'only 1 shop — no comparison';
  return `compared across ${n} shops`;
}

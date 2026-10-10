/**
 * Ad slot contract (DESIGN_RULES.md §5, design review §4).
 *
 * Every slot is designed into the layout now, even while nothing is sold, so
 * ads never have to be retrofitted into a page. Rules the components enforce:
 *
 * - Native slots use the site's own card, type and tokens, labelled
 *   "Sponsored" with a "Why is this here?" link.
 * - Nothing paid ever sits inside the price-sorted list.
 * - Each slot reserves a fixed height, so a late fill never shifts the page.
 * - An unsold slot is decided at BUILD time (this mode), never collapsed at
 *   runtime after the page has laid out.
 *
 * Modes:
 *   off      — slots render nothing (production default until something sells)
 *   preview  — slots render a labelled, dashed placeholder at their reserved
 *              size (dev default, so the layout can be reviewed)
 */
export type AdMode = 'off' | 'preview';

export const AD_MODE: AdMode =
  (import.meta.env.VITE_AD_SLOTS as AdMode | undefined) ?? (import.meta.env.DEV ? 'preview' : 'off');

export type Placement =
  | 'product-sponsored-shop'
  | 'product-rail'
  | 'listing-tile'
  | 'search-top'
  | 'home-featured-shop';

/** Reserved size and plain description of each placement. */
export const PLACEMENTS: Record<Placement, { label: string; height: number; desktopOnly?: boolean }> = {
  // Native shop card above the offer list (PriceRunner model). The most valuable slot.
  'product-sponsored-shop': { label: 'Sponsored shop, above the price list', height: 92 },
  // 300×250 programmatic or a second native card, under the best-price card.
  'product-rail': { label: '300 × 250, right rail', height: 250, desktopOnly: true },
  // Native product card at fixed grid positions, one per 8–12 organic cards.
  'listing-tile': { label: 'Sponsored product card', height: 0 },
  // One native result above organic search results.
  'search-top': { label: 'Sponsored result, above results', height: 92 },
  // One band per homepage, after the second organic rail.
  'home-featured-shop': { label: 'Featured shop band, 4–6 products', height: 180 },
};

/** Grid positions (0-based) for sponsored tiles on a 48-card page: 3rd and 15th. */
export const LISTING_TILE_POSITIONS = [2, 14];

/**
 * Shopper-facing names for captured category slugs. In lib (not a page) so
 * the header search can use it without pulling a lazy page into the main
 * bundle.
 */
const LABELS: Record<string, string> = {
  'groceries': 'Groceries',
  'mobile-phones': 'Phones',
  'mobile-phone-accessories': 'Phone accessories',
  'laptops': 'Laptops',
  'tablets': 'Tablets',
  'audio-systems': 'Audio systems',
  'headphones': 'Headphones',
  'wearables': 'Wearables',
  'speakers': 'Speakers',
  'routers': 'Routers',
  'monitors': 'Monitors',
  'tvs': 'TVs',
  'printers': 'Printers',
  'digital-cameras': 'Cameras',
  'desktop-computers': 'Desktops',
};

/** Every captured comparison category the storefront names. */
export const CATEGORY_SLUGS: readonly string[] = Object.keys(LABELS);

export const categoryLabel = (slug: string) => LABELS[slug] ?? slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());

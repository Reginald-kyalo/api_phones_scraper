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

export const categoryLabel = (slug: string) => LABELS[slug] ?? slug.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());

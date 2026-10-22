/**
 * Display-only labels for navigation built from the taxonomy review.
 *
 * The review files a family it has not placed yet as `needs-review` /
 * "Needs Review". That is pipeline vocabulary (DESIGN_RULES.md §6): a shopper
 * sees "Other" instead. The data keeps its own label, which the taxonomy
 * tests assert on.
 */
export function familyDisplayLabel(family: { id: string; label: string }): string {
  return family.id === 'needs-review' ? 'Other' : family.label;
}

/**
 * The one shopper-facing name of each department, in sentence case, used by
 * the homepage strip, both category menus, the department page, breadcrumbs,
 * the footer and the prerender. The taxonomy keeps its own longer label
 * ("Groceries & Everyday Essentials"); this is what the shopper reads.
 *
 * A display label is a name, not a reclassification: a mixed department
 * keeps a broad, honest name.
 */
const DEPARTMENT_DISPLAY: Record<string, string> = {
  'phones-wearables': 'Phones & wearables',
  'groceries-everyday-essentials': 'Groceries',
  'tv-audio-home-entertainment': 'TV & audio',
  'computing-networking': 'Computers & networking',
  'health-beauty-personal-care': 'Health & beauty',
  'home-appliances': 'Home appliances',
  'home-furniture-decor': 'Home & furniture',
  'kitchen-dining-cookware': 'Kitchen & dining',
  'office-school-stationery': 'Office & school supplies',
  'building-electrical-hardware': 'Building & hardware',
  'fashion-accessories': 'Fashion & accessories',
  'power-solar-energy': 'Power & solar',
  'baby-kids-toys': 'Baby, kids & toys',
  'classifieds': 'Classifieds',
  'cameras-security-surveillance': 'Cameras & security',
  'automotive-motorcycle': 'Car & motorcycle',
  'sports-outdoors-leisure': 'Sports & outdoors',
  'agriculture-agrovet': 'Garden & agrovet',
  'gaming-books-media': 'Gaming, books & media',
  'household-cleaning': 'Cleaning',
  'pet-supplies': 'Pets',
};

export function departmentDisplayLabel(department: { id: string; label: string }): string {
  return DEPARTMENT_DISPLAY[department.id] ?? department.label;
}

/** Render a shop-written browse-node label without echoing its ALL-CAPS form. */
export function browseLabel(node: { slug: string; label: string | null }): string {
  const raw = (node.label ?? '').trim();
  if (!raw) return node.slug;
  if (raw === raw.toUpperCase() && /[A-Z]{2,}/.test(raw)) {
    return raw.toLowerCase().replace(/(^|[\s/()-])([a-z])/g, (_: string, sep: string, ch: string) => sep + ch.toUpperCase());
  }
  if (raw === raw.toLowerCase()) return raw.replace(/^[a-z]/, (c) => c.toUpperCase());
  return raw;
}

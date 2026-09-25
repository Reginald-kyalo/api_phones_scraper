import type { LucideIcon } from 'lucide-react';
import { PawPrint, SprayCan } from 'lucide-react';
import { LIVE_SPINE_SHELVES, spineShelfDisplay, type LiveSpineShelf } from './liveSpineShelves';
import { SPINE_DEPARTMENTS, type DemoSpineDepartment } from './spineDepartments';

/**
 * The mock's navigation tree.  It is derived from the generated shelf capture,
 * rather than maintaining a second list of menu leaves.  The small disposition
 * table only records deliberate corrections and family names; every captured
 * shelf remains in exactly one family and continues to use its original URL.
 */
export interface TaxonomyFamily {
  id: string;
  label: string;
  shelves: LiveSpineShelf[];
}

export interface TaxonomyDepartment extends Omit<DemoSpineDepartment, 'n_shelves'> {
  n_shelves: number;
  families: TaxonomyFamily[];
}

type Placement = { departmentId?: string; family: string; familyLabel: string };

const explicitPlacements: Record<string, Placement> = {
  'pet-care': { departmentId: 'pet-supplies', family: 'food-treats', familyLabel: 'Food & Treats' },
  'pet-accessory-toy': { departmentId: 'pet-supplies', family: 'toys-accessories', familyLabel: 'Toys & Accessories' },
  'pet-pet-accessory-pet-food': { departmentId: 'pet-supplies', family: 'food-treats', familyLabel: 'Food & Treats' },
  'spoil-your-pet': { departmentId: 'pet-supplies', family: 'toys-accessories', familyLabel: 'Toys & Accessories' },
  'pet': { family: 'live-pets-livestock', familyLabel: 'Live Pets & Livestock' },
  'poultry': { family: 'live-pets-livestock', familyLabel: 'Live Pets & Livestock' },
  'baby-food': { departmentId: 'baby-kids-toys', family: 'baby-food-formula', familyLabel: 'Baby Food & Formula' },
  'baby-toddler-formula': { departmentId: 'baby-kids-toys', family: 'baby-food-formula', familyLabel: 'Baby Food & Formula' },
  'baby-soap-shampoo': { departmentId: 'baby-kids-toys', family: 'baby-care', familyLabel: 'Baby Care' },
  'skin-cream-0cb845': { departmentId: 'health-beauty-personal-care', family: 'skincare', familyLabel: 'Skincare' },
  'slimming-cream': { departmentId: 'health-beauty-personal-care', family: 'health-wellness', familyLabel: 'Health & Wellness' },
  'shaving-cream-6bc9f0': { departmentId: 'health-beauty-personal-care', family: 'grooming', familyLabel: 'Grooming' },
  'external-hard-drive': { departmentId: 'computing-networking', family: 'storage', familyLabel: 'Storage' },
  'smart-watch-accessory': { departmentId: 'phones-wearables', family: 'wearables', familyLabel: 'Wearables' },
  'watch-3bab17': { departmentId: 'fashion-accessories', family: 'watches-jewellery', familyLabel: 'Watches & Jewellery' },
  'bulb': { departmentId: 'home-furniture-decor', family: 'lighting', familyLabel: 'Lighting' },
  'shower-water-heater': { departmentId: 'home-appliances', family: 'water-heating-treatment', familyLabel: 'Water Heating & Treatment' },
  'photocopy-paper': { departmentId: 'office-school-stationery', family: 'paper-notebooks', familyLabel: 'Paper & Notebooks' },
  'cleaning-household': { departmentId: 'household-cleaning', family: 'surface-cleaning', familyLabel: 'Surface Cleaning' },
  'cleaning': { departmentId: 'household-cleaning', family: 'surface-cleaning', familyLabel: 'Surface Cleaning' },
  'soap-detergent': { departmentId: 'household-cleaning', family: 'laundry-detergents', familyLabel: 'Laundry Detergents' },
  'cleaning-laundry-accessory': { departmentId: 'household-cleaning', family: 'laundry-accessories', familyLabel: 'Laundry Accessories' },
  'broom-8a72bd': { departmentId: 'household-cleaning', family: 'cleaning-tools', familyLabel: 'Cleaning Tools' },
  'mop-mop-head-5ef380': { departmentId: 'household-cleaning', family: 'cleaning-tools', familyLabel: 'Cleaning Tools' },
  'brush-scrubber': { departmentId: 'household-cleaning', family: 'cleaning-tools', familyLabel: 'Cleaning Tools' },
  'dust-pan-bin-23a0ce': { departmentId: 'household-cleaning', family: 'waste-disposal', familyLabel: 'Waste Disposal' },
};

const departmentOverrides: Record<string, Pick<TaxonomyDepartment, 'label'>> = {
  'phones-wearables': { label: 'Phones & Wearables' },
  'groceries-everyday-essentials': { label: 'Groceries & Drinks' },
  'tv-audio-home-entertainment': { label: 'TV, Audio & Music' },
  'home-furniture-decor': { label: 'Home, Furniture & Décor' },
  'kitchen-dining-cookware': { label: 'Kitchen & Dining' },
  'sports-outdoors-leisure': { label: 'Sports & Outdoors' },
  'agriculture-agrovet': { label: 'Garden, Agriculture & Agrovet' },
};

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function defaultFamily(sourceId: string, shelf: LiveSpineShelf): Placement {
  const text = `${shelf.slug} ${shelf.label}`.toLowerCase();
  const match = (words: string[]) => words.some((word) => text.includes(word));
  if (sourceId === 'groceries-everyday-essentials') {
    if (match(['drink', 'tea', 'coffee', 'juice', 'cordial'])) return { family: 'non-alcoholic-drinks', familyLabel: 'Non-alcoholic Drinks' };
    if (match(['alcohol', 'spirit', 'champagne'])) return { family: 'alcohol', familyLabel: 'Alcohol' };
    if (match(['fresh', 'fruit', 'veg', 'meat', 'fish', 'pork', 'lamb', 'goat'])) return { family: 'fresh-food', familyLabel: 'Fresh Food' };
    if (match(['snack', 'confection', 'cookie', 'popcorn', 'mabuyu'])) return { family: 'snacks-confectionery', familyLabel: 'Snacks & Confectionery' };
    if (match(['bread', 'cake', 'pastry', 'mandazi', 'scone', 'bun'])) return { family: 'bakery', familyLabel: 'Bakery' };
    return { family: 'pantry', familyLabel: 'Pantry' };
  }
  if (sourceId === 'home-appliances') {
    if (match(['blender', 'mixer', 'processor', 'juicer'])) return { family: 'food-preparation', familyLabel: 'Food Preparation' };
    if (match(['kettle', 'coffee'])) return { family: 'coffee-hot-drinks', familyLabel: 'Coffee & Hot Drinks' };
    if (match(['toaster', 'sandwich', 'donut'])) return { family: 'breakfast-baking', familyLabel: 'Breakfast & Baking' };
    if (match(['fridge', 'chiller'])) return { family: 'refrigeration', familyLabel: 'Refrigeration' };
    if (match(['washer', 'washing'])) return { family: 'laundry-appliances', familyLabel: 'Laundry Appliances' };
    return { family: 'home-appliances', familyLabel: 'Home Appliances' };
  }
  if (sourceId === 'computing-networking') {
    if (match(['laptop', 'chromebook', 'netbook', 'ultrabook', 'razer', 'x380'])) return { family: 'laptops', familyLabel: 'Laptops' };
    if (match(['desktop', 'tower', 'all-in-one', 'workstation'])) return { family: 'desktop-computers', familyLabel: 'Desktop Computers' };
    if (match(['router', 'network', 'tp-link'])) return { family: 'networking', familyLabel: 'Networking' };
    if (match(['monitor', 'display', 'peripheral'])) return { family: 'monitors-peripherals', familyLabel: 'Monitors & Peripherals' };
    return { family: 'computers', familyLabel: 'Computers' };
  }
  if (sourceId === 'health-beauty-personal-care') {
    if (match(['hair', 'extension', 'shampoo', 'curl'])) return { family: 'haircare', familyLabel: 'Haircare' };
    if (match(['tooth', 'oral'])) return { family: 'oral-care', familyLabel: 'Oral Care' };
    if (match(['sexual', 'condom', 'medical', 'pharmaceutical', 'nutrition'])) return { family: 'health-wellness', familyLabel: 'Health & Wellness' };
    return { family: 'bath-body', familyLabel: 'Bath & Body' };
  }
  if (sourceId === 'classifieds') return { family: 'classifieds', familyLabel: 'Classifieds' };
  return { family: slug(sourceId), familyLabel: departmentOverrides[sourceId]?.label ?? sourceId.replace(/-/g, ' ') };
}

function makeDepartment(base: DemoSpineDepartment, families: Map<string, TaxonomyFamily>): TaxonomyDepartment {
  const override = departmentOverrides[base.id];
  return { ...base, ...override, n_shelves: [...families.values()].reduce((sum, family) => sum + family.shelves.length, 0), families: [...families.values()] };
}

const departmentMap = new Map<string, { base: DemoSpineDepartment; families: Map<string, TaxonomyFamily> }>();
for (const department of SPINE_DEPARTMENTS) departmentMap.set(department.id, { base: department, families: new Map() });
departmentMap.set('household-cleaning', {
  base: { id: 'household-cleaning', label: 'Household Cleaning & Essentials', n_clusters: 0, n_shelves: 0, Icon: SprayCan, capturedSlugs: [] },
  families: new Map(),
});
departmentMap.set('pet-supplies', {
  base: { id: 'pet-supplies', label: 'Pet Supplies', n_clusters: 0, n_shelves: 0, Icon: PawPrint, capturedSlugs: [] },
  families: new Map(),
});

for (const [sourceId, shelves] of Object.entries(LIVE_SPINE_SHELVES)) {
  for (const shelf of shelves) {
    const placement = explicitPlacements[shelf.slug] ?? defaultFamily(sourceId, shelf);
    const targetId = placement.departmentId ?? sourceId;
    const target = departmentMap.get(targetId);
    if (!target) throw new Error(`Unknown taxonomy department: ${targetId}`);
    const family = target.families.get(placement.family) ?? { id: placement.family, label: placement.familyLabel, shelves: [] };
    family.shelves.push(shelf);
    target.families.set(placement.family, family);
  }
}

export const TAXONOMY_DEPARTMENTS = [...departmentMap.values()]
  .map(({ base, families }) => makeDepartment(base, families))
  .filter((department) => department.families.length > 0);

export const taxonomyDepartmentById = (id: string | undefined) =>
  TAXONOMY_DEPARTMENTS.find((department) => department.id === id);

/** Fails fast if a capture or disposition change drops or duplicates a shelf. */
export function assertTaxonomyIntegrity(): void {
  const source = Object.values(LIVE_SPINE_SHELVES).flat().map((shelf) => shelf.slug).sort();
  const derived = TAXONOMY_DEPARTMENTS.flatMap((department) => department.families.flatMap((family) => family.shelves.map((shelf) => shelf.slug))).sort();
  if (source.length !== derived.length || source.some((id, index) => id !== derived[index])) {
    throw new Error('The derived taxonomy must contain every captured shelf exactly once.');
  }
}

assertTaxonomyIntegrity();

export { spineShelfDisplay };

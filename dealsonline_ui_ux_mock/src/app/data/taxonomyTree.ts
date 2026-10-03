import type { LucideIcon } from 'lucide-react';
import { PawPrint, SprayCan } from 'lucide-react';
import { LIVE_SPINE_SHELVES, spineShelfDisplay, type LiveSpineShelf } from './liveSpineShelves';
import { SPINE_DEPARTMENTS, type DemoSpineDepartment } from './spineDepartments';
import {
  createCollectionDetector,
  shouldRetainTaxonomyDepartment,
  validateReviewedTaxonomyInputs,
} from './taxonomyValidation';

/**
 * Legacy collection links derived from the generated shelf capture. This is
 * not the approved phone category hierarchy (see phoneNavigation.json). The
 * disposition table only records collection groupings; every captured shelf
 * remains in exactly one family and preserves its original `/shelf/:slug` URL.
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
  // Pass 1: every captured shelf from the three source departments below is
  // deliberately placed. `reviewedSourceDepartments` makes omissions fatal.
  'electronic': { family: 'needs-review', familyLabel: 'Needs Review' },
  'home-appliance': { family: 'home-appliances', familyLabel: 'Home Appliances' },
  'white-good': { family: 'major-appliances', familyLabel: 'Major Appliances' },
  'fridge': { family: 'refrigeration', familyLabel: 'Refrigeration' },
  'kettle-a2f55f': { family: 'coffee-hot-drinks', familyLabel: 'Coffee & Hot Drinks' },
  'rice-cooker-fryer': { family: 'countertop-cooking', familyLabel: 'Countertop Cooking' },
  'microwave-oven': { family: 'cooking-appliances', familyLabel: 'Cooking Appliances' },
  'hot-cold': { family: 'water-dispensers', familyLabel: 'Water Dispensers' },
  'stand-alone-cooker': { family: 'cooking-appliances', familyLabel: 'Cooking Appliances' },
  'washing-machine': { family: 'laundry-appliances', familyLabel: 'Laundry Appliances' },
  'blender-juicer': { family: 'food-preparation', familyLabel: 'Food Preparation' },
  'blender-mixer-food-processor': { family: 'food-preparation', familyLabel: 'Food Preparation' },
  'fridge-freezer': { family: 'refrigeration', familyLabel: 'Refrigeration' },
  'room-heater': { family: 'heating-air-treatment', familyLabel: 'Heating & Air Treatment' },
  'water-dispenser-cooler': { family: 'water-dispensers', familyLabel: 'Water Dispensers' },
  'electric-cooker-hot-plate': { family: 'countertop-cooking', familyLabel: 'Countertop Cooking' },
  'hot-norm-8265e7': { family: 'water-dispensers', familyLabel: 'Water Dispensers' },
  'hot-normal-cold': { family: 'water-dispensers', familyLabel: 'Water Dispensers' },
  'hand-mixer': { family: 'food-preparation', familyLabel: 'Food Preparation' },
  'sandwich-maker-55538d': { family: 'breakfast-baking', familyLabel: 'Breakfast & Baking' },
  'sandwich-maker-toaster-coffee-maker': { family: 'breakfast-baking', familyLabel: 'Breakfast & Baking' },
  'washer-dryer': { family: 'laundry-appliances', familyLabel: 'Laundry Appliances' },
  'bottom-load-a1672b': { family: 'water-dispensers', familyLabel: 'Water Dispensers' },
  'coffee-maker-b61796': { family: 'coffee-hot-drinks', familyLabel: 'Coffee & Hot Drinks' },
  'portable': { family: 'water-dispensers', familyLabel: 'Water Dispensers' },
  'chiller': { family: 'refrigeration', familyLabel: 'Refrigeration' },
  'donut-maker-b8a278': { family: 'dessert-ice-making', familyLabel: 'Dessert & Ice Making' },
  'sensor': { departmentId: 'cameras-security-surveillance', family: 'smart-home-sensors', familyLabel: 'Smart Home Sensors' },
  'table-top-8055cc': { family: 'water-dispensers', familyLabel: 'Water Dispensers' },
  'toaster': { family: 'breakfast-baking', familyLabel: 'Breakfast & Baking' },
  'vacuum-cleaner-steam-mop': { departmentId: 'household-cleaning', family: 'powered-cleaning', familyLabel: 'Powered Cleaning' },

  'home-garden-kid': { family: 'needs-review', familyLabel: 'Needs Review' },
  'bedding-linen': { family: 'bedding-linen', familyLabel: 'Bedding & Linen' },
  'decoration': { family: 'home-decor', familyLabel: 'Home Décor' },
  'light': { family: 'lighting', familyLabel: 'Lighting' },
  'home-kitchen-office': { family: 'home-fragrance-air-care', familyLabel: 'Home Fragrance & Air Care' },
  'home-textile': { family: 'bedding-linen', familyLabel: 'Bedding & Linen' },
  'enegy-saver': { family: 'lighting', familyLabel: 'Lighting' },
  'duvet-pillow': { family: 'bedding-linen', familyLabel: 'Bedding & Linen' },
  'candle': { family: 'home-decor', familyLabel: 'Home Décor' },
  'basin-bucket-basket': { departmentId: 'household-cleaning', family: 'buckets-basins', familyLabel: 'Buckets & Basins' },
  'home-furniture-appliance': { family: 'furniture', familyLabel: 'Furniture' },
  'mattress': { family: 'mattresses', familyLabel: 'Mattresses' },
  'towel': { family: 'bath-linen', familyLabel: 'Bath Linen' },
  'chair-table': { family: 'furniture', familyLabel: 'Furniture' },
  'duvet-d523a9': { family: 'bedding-linen', familyLabel: 'Bedding & Linen' },
  'pillow': { family: 'bedding-linen', familyLabel: 'Bedding & Linen' },
  'soapdish-f8cba4': { family: 'bathroom-accessories', familyLabel: 'Bathroom Accessories' },
  'table': { family: 'furniture', familyLabel: 'Furniture' },
  'blanket-duvet': { family: 'bedding-linen', familyLabel: 'Bedding & Linen' },
  'cloth-peg-ab1381': { departmentId: 'household-cleaning', family: 'laundry-accessories', familyLabel: 'Laundry Accessories' },
  'cabinet-storage': { family: 'household-storage', familyLabel: 'Household Storage' },
  'clothe-hanger': { family: 'household-storage', familyLabel: 'Household Storage' },
  'gift-wrapper-7b578e': { family: 'home-decor', familyLabel: 'Home Décor' },
  'hand-towel': { family: 'bath-linen', familyLabel: 'Bath Linen' },
  'plastic-furniture-set': { family: 'furniture', familyLabel: 'Furniture' },
  'stool': { family: 'furniture', familyLabel: 'Furniture' },

  'kitchen-dining': { family: 'kitchen-dining', familyLabel: 'Kitchen & Dining' },
  'kitchenware': { family: 'kitchen-essentials', familyLabel: 'Kitchen Essentials' },
  'plastic': { departmentId: 'home-furniture-decor', family: 'plastic-housewares', familyLabel: 'Plastic Housewares' },
  'cookware-bakeware': { family: 'cookware-bakeware', familyLabel: 'Cookware & Bakeware' },
  'holder': { departmentId: 'baby-kids-toys', family: 'baby-care', familyLabel: 'Baby Care' },
  'party-tableware': { family: 'tableware', familyLabel: 'Tableware' },
  'kitchen-accessory': { family: 'utensils-kitchen-tools', familyLabel: 'Utensils & Kitchen Tools' },
  'hotpot': { family: 'food-storage', familyLabel: 'Food Storage' },
  'bowl': { family: 'tableware', familyLabel: 'Tableware' },
  'cooking-equipment-fuel-c23ce7': { family: 'needs-review', familyLabel: 'Needs Review' },
  'plastic-wrap-foil': { family: 'food-storage', familyLabel: 'Food Storage' },
  'tray': { family: 'tableware', familyLabel: 'Tableware' },
  'air-tight-container': { family: 'food-storage', familyLabel: 'Food Storage' },
  'crockery': { family: 'tableware', familyLabel: 'Tableware' },
  'food-storage-foil-cling-film': { family: 'food-storage', familyLabel: 'Food Storage' },
  'kitchen-foil-c6aa11': { family: 'food-storage', familyLabel: 'Food Storage' },
  'clingfilm-food-bag': { family: 'food-storage', familyLabel: 'Food Storage' },
  'frying-pan': { family: 'cookware-bakeware', familyLabel: 'Cookware & Bakeware' },
  'bottle-6b4dbe': { family: 'drinkware', familyLabel: 'Drinkware' },
  'flask-088dba': { family: 'drinkware', familyLabel: 'Drinkware' },
  'jug': { family: 'drinkware', familyLabel: 'Drinkware' },
  'lunch-box': { family: 'food-storage', familyLabel: 'Food Storage' },
  'sieve-strainer': { family: 'utensils-kitchen-tools', familyLabel: 'Utensils & Kitchen Tools' },
  'plastic-glass-cup': { family: 'drinkware', familyLabel: 'Drinkware' },
  'regulator': { family: 'gas-cooking-equipment', familyLabel: 'Gas Cooking Equipment' },
  'dinner-set-ba0436': { family: 'tableware', familyLabel: 'Tableware' },
  'dish-rack-3cd990': { family: 'kitchen-organisation', familyLabel: 'Kitchen Organisation' },
  'funnel': { family: 'utensils-kitchen-tools', familyLabel: 'Utensils & Kitchen Tools' },
  'gas-pipe-656542': { family: 'gas-cooking-equipment', familyLabel: 'Gas Cooking Equipment' },
  'grater': { family: 'utensils-kitchen-tools', familyLabel: 'Utensils & Kitchen Tools' },
  'knive': { family: 'utensils-kitchen-tools', familyLabel: 'Utensils & Kitchen Tools' },
  'water-cup-d8a8d4': { family: 'drinkware', familyLabel: 'Drinkware' },
  'wine-glass-0b5674': { family: 'drinkware', familyLabel: 'Drinkware' },
  'pet-care': { departmentId: 'pet-supplies', family: 'food-treats', familyLabel: 'Food & Treats' },
  'pet-accessory-toy': { departmentId: 'pet-supplies', family: 'pet-care', familyLabel: 'Pet Care' },
  'pet-pet-accessory-pet-food': { departmentId: 'pet-supplies', family: 'food-treats', familyLabel: 'Food & Treats' },
  'spoil-your-pet': { departmentId: 'pet-supplies', family: 'toys-accessories', familyLabel: 'Toys & Accessories' },
  'pet': { departmentId: 'pet-supplies', family: 'pet-care', familyLabel: 'Pet Care' },
  'poultry': { departmentId: 'groceries-everyday-essentials', family: 'meat-fish-seafood', familyLabel: 'Meat, Fish & Seafood' },
  'baby-food': { departmentId: 'baby-kids-toys', family: 'baby-food-formula', familyLabel: 'Baby Food & Formula' },
  'baby-toddler-formula': { departmentId: 'baby-kids-toys', family: 'baby-food-formula', familyLabel: 'Baby Food & Formula' },
  'baby-soap-shampoo': { departmentId: 'baby-kids-toys', family: 'baby-care', familyLabel: 'Baby Care' },
  'skin-cream-0cb845': { departmentId: 'health-beauty-personal-care', family: 'skincare', familyLabel: 'Skincare' },
  'slimming-cream': { departmentId: 'health-beauty-personal-care', family: 'skincare', familyLabel: 'Skincare' },
  'shaving-cream-6bc9f0': { departmentId: 'health-beauty-personal-care', family: 'hair-removal', familyLabel: 'Hair Removal' },
  'external-hard-drive': { departmentId: 'computing-networking', family: 'storage', familyLabel: 'Storage' },
  'smart-watch-accessory': { departmentId: 'phones-wearables', family: 'wearables', familyLabel: 'Wearables' },
  'watch-3bab17': { departmentId: 'phones-wearables', family: 'wearables', familyLabel: 'Wearables' },
  'bulb': { departmentId: 'home-furniture-decor', family: 'lighting', familyLabel: 'Lighting' },
  'shower-water-heater': { departmentId: 'home-appliances', family: 'water-heating-treatment', familyLabel: 'Water Heating & Treatment' },
  'photocopy-paper': { departmentId: 'office-school-stationery', family: 'paper-notebooks', familyLabel: 'Paper & Notebooks' },
  'cleaning-household': { departmentId: 'household-cleaning', family: 'cleaning-household-essentials', familyLabel: 'Cleaning & Household Essentials' },
  'cleaning': { departmentId: 'household-cleaning', family: 'cleaning-tools', familyLabel: 'Cleaning Tools' },
  'soap-detergent': { departmentId: 'household-cleaning', family: 'cleaning-laundry', familyLabel: 'Cleaning & Laundry' },
  'cleaning-laundry-accessory': { departmentId: 'household-cleaning', family: 'laundry-accessories', familyLabel: 'Laundry Accessories' },
  'broom-8a72bd': { departmentId: 'household-cleaning', family: 'cleaning-tools', familyLabel: 'Cleaning Tools' },
  'mop-mop-head-5ef380': { departmentId: 'household-cleaning', family: 'cleaning-tools', familyLabel: 'Cleaning Tools' },
  'brush-scrubber': { departmentId: 'household-cleaning', family: 'cleaning-tools', familyLabel: 'Cleaning Tools' },
  'dust-pan-bin-23a0ce': { departmentId: 'household-cleaning', family: 'waste-disposal', familyLabel: 'Waste Disposal' },
  'facial-tissue': { departmentId: 'household-cleaning', family: 'household-paper', familyLabel: 'Household Paper' },
  'napkin': { departmentId: 'household-cleaning', family: 'household-paper', familyLabel: 'Household Paper' },
  'multi-purpose-cleaner': { departmentId: 'household-cleaning', family: 'surface-cleaning', familyLabel: 'Surface Cleaning' },
  'toilet-cleaner': { departmentId: 'household-cleaning', family: 'surface-cleaning', familyLabel: 'Surface Cleaning' },
  'toilet-cleaner-powder-d7459a': { departmentId: 'household-cleaning', family: 'surface-cleaning', familyLabel: 'Surface Cleaning' },
  'toilet-block-1d4a00': { departmentId: 'household-cleaning', family: 'surface-cleaning', familyLabel: 'Surface Cleaning' },
  'carpet-cleaner': { departmentId: 'household-cleaning', family: 'surface-cleaning', familyLabel: 'Surface Cleaning' },
  'floor-cleaner': { departmentId: 'household-cleaning', family: 'surface-cleaning', familyLabel: 'Surface Cleaning' },
  'glass-cleaner': { departmentId: 'household-cleaning', family: 'surface-cleaning', familyLabel: 'Surface Cleaning' },
  'dish-washing-liquid': { departmentId: 'household-cleaning', family: 'dishwashing', familyLabel: 'Dishwashing' },
  'dish-washing-paste': { departmentId: 'household-cleaning', family: 'dishwashing', familyLabel: 'Dishwashing' },
  'washing-powder-sat-8bfa04': { departmentId: 'household-cleaning', family: 'laundry-detergents', familyLabel: 'Laundry Detergents' },
  'washing-powder-jar-59ed89': { departmentId: 'household-cleaning', family: 'laundry-detergents', familyLabel: 'Laundry Detergents' },
  'housekeeping-7ac99d': { departmentId: 'household-cleaning', family: 'waste-disposal', familyLabel: 'Waste Disposal' },
};

/** Add a reviewed group without allowing a later batch to overwrite a ruling. */
function addReviewedGroup(slugs: string[], placement: Placement): void {
  for (const shelfSlug of slugs) {
    if (explicitPlacements[shelfSlug]) {
      throw new Error(`Reviewed taxonomy shelf has two dispositions: ${shelfSlug}`);
    }
    explicitPlacements[shelfSlug] = placement;
  }
}

// Pass 2: Groceries & Drinks. Broad retailer shelves stay reviewable; product
// types are grouped by shopper intent rather than by label substrings.
addReviewedGroup(['food-cupboard'], { family: 'pantry', familyLabel: 'Pantry' });
addReviewedGroup(['food-beverage'], { family: 'food-drinks', familyLabel: 'Food & Drinks' });
addReviewedGroup(['fresh'], { family: 'fresh-food', familyLabel: 'Fresh Food' });
addReviewedGroup(['frozen-food-consignment-19f7fd'], { family: 'frozen-food', familyLabel: 'Frozen Food' });
addReviewedGroup(['fresh-produce', 'fruit-vegetable', 'veg', 'pre-cut-fruit', 'pre-cut-veg', 'grape'], { family: 'fresh-produce', familyLabel: 'Fresh Produce' });
addReviewedGroup(['soft-drink', 'carbonated-2bb44b', 'syrup-cordial', 'tetra-one-litre-b521c1', 'can-a6b58d'], { family: 'non-alcoholic-drinks', familyLabel: 'Non-alcoholic Drinks' });
addReviewedGroup(['malt-based-ad3e2a', 'soya'], { family: 'malted-powdered-drinks', familyLabel: 'Malted & Powdered Drinks' });
addReviewedGroup(['loose-leaf-tea-bag', 'infusion-de4b3b'], { family: 'tea-coffee-hot-drinks', familyLabel: 'Tea, Coffee & Hot Drinks' });
addReviewedGroup(['alcohol', 'sparkling-champagne', 'spirit-cocktail'], { family: 'alcohol', familyLabel: 'Alcohol' });
addReviewedGroup(['grain-rice', 'maize-fedaa2', 'puls-pasta-rice-b57b66', 'wheat-13533e', 'premium-maize-3487b3', 'cassava-fcf7f8', 'githeri-0d04af'], { family: 'staples-grains-pulses', familyLabel: 'Staples, Grains & Pulses' });
addReviewedGroup(['sugar-sweetener', 'food-colour-4b639b', 'bakeaid-0d581e', 'essence-2ff760', 'atta-mark-gram-cake-mix-575529', 'bread-crumb-0fc34b'], { family: 'flour-baking', familyLabel: 'Flour & Baking' });
addReviewedGroup(['porridge'], { family: 'breakfast-cereals', familyLabel: 'Breakfast Cereals' });
addReviewedGroup(['oil', 'butter-margarine', 'cooking-fat', 'premium-oil-cb60ab', 'coconut-oil-5bff2b', 'ghee'], { family: 'oils-fats', familyLabel: 'Oils & Fats' });
addReviewedGroup(['herb-spice-seasoning', 'herb', 'mchuzi-mix-5fadcb', 'beef-chicken-cube-ebf425', 'sim-sim-8036d4'], { family: 'herbs-spices-seasonings', familyLabel: 'Herbs, Spices & Seasonings' });
addReviewedGroup(['condiment', 'sauce', 'mayonnaise', 'tomato-paste-270ba0', 'vinegar', 'cooking'], { family: 'sauces-condiments', familyLabel: 'Sauces & Condiments' });
addReviewedGroup(['ready-to-heat', 'ready-to-consume', 'ready-to-eat', 'soup', 'frozen-dumpling-samosa', 'frozen-pizza-lasagna', 'pizza-dfb708', 'pie-quiche', 'sphaghetti-6992a0'], { family: 'ready-meals', familyLabel: 'Ready Meals' });
addReviewedGroup(['cake-bread-960cd1', 'pastry-fresh-food', 'cake-cupcake-muffin', 'cake-pastry-pie', 'bun-608562', 'mandazi-2c3956', 'chapati-ff52aa', 'scone-461280', 'tortilla-nacho'], { family: 'bakery', familyLabel: 'Bakery' });
addReviewedGroup(['snack-confectionery', 'confectionery', 'cookie', 'healthy-snack', 'mabuyu-470857', 'popcorn-d6b969', 'chevda-c9dfb7', 'confectionery-sweet-c045ed'], { family: 'snacks-confectionery', familyLabel: 'Snacks & Confectionery' });
addReviewedGroup(['healthy-snack-beverage'], { family: 'nuts-seeds-dried-fruit', familyLabel: 'Nuts, Seeds & Dried Fruit' });
addReviewedGroup(['butter-cheese', 'longlife-milk', 'long-life-62b199', 'cooking-whipping-cream', 'cream-ac593b', 'atm-milk', 'lala-27b88c', 'milk-powder-e13c55', 'flavoured-ad50fc'], { family: 'dairy', familyLabel: 'Dairy' });
addReviewedGroup(['dairy-alternative', 'milk-substitute', 'coconut-milk', 'dairy-alternative-7e5718'], { family: 'dairy-alternatives', familyLabel: 'Dairy Alternatives' });
addReviewedGroup(['fish-seafood', 'pork', 'goat-meat', 'lamb', 'bacon', 'brawn-0a96f8', 'capon-245a7c', 'chicken-meat-917c94', 'fishfinger-pop-01e791', 'fish-omena', 'fish-fillet-ac64bb', 'hot-dog-3196a9', 'kebab-35782c', 'matumbo-6576e1'], { family: 'meat-fish-seafood', familyLabel: 'Meat, Fish & Seafood' });
addReviewedGroup(['meat-product-egg-6249b6'], { family: 'meat-eggs', familyLabel: 'Meat & Eggs' });
addReviewedGroup(['dairy-cheese-egg'], { family: 'eggs', familyLabel: 'Eggs' });
addReviewedGroup(['meat-alternative', 'meat-substitute'], { family: 'plant-based-food', familyLabel: 'Plant-based Food' });
addReviewedGroup(['ice-cream-dessert'], { family: 'frozen-desserts', familyLabel: 'Frozen Desserts' });
addReviewedGroup(['cafe-naiva'], { family: 'ready-meals', familyLabel: 'Ready Meals' });
addReviewedGroup(['s-woo'], { departmentId: 'household-cleaning', family: 'cleaning-tools', familyLabel: 'Cleaning Tools' });
addReviewedGroup(['candle-air-freshener', 'airfreshner-gel-69737b'], { departmentId: 'household-cleaning', family: 'air-care', familyLabel: 'Air Care' });
addReviewedGroup(['incense-stick-6eb3f2'], { departmentId: 'home-furniture-decor', family: 'home-fragrance', familyLabel: 'Home Fragrance' });
addReviewedGroup(['wipe'], { departmentId: 'baby-kids-toys', family: 'baby-care', familyLabel: 'Baby Care' });
addReviewedGroup(['cistern-block'], { departmentId: 'household-cleaning', family: 'surface-cleaning', familyLabel: 'Surface Cleaning' });
addReviewedGroup(['barsoap-tablet-b794ba'], { departmentId: 'household-cleaning', family: 'laundry-detergents', familyLabel: 'Laundry Detergents' });
addReviewedGroup(['kitchen-towel-serviette'], { departmentId: 'household-cleaning', family: 'household-paper', familyLabel: 'Household Paper' });
addReviewedGroup(['scouring-powder-4906d5'], { departmentId: 'household-cleaning', family: 'surface-cleaning', familyLabel: 'Surface Cleaning' });
addReviewedGroup(['scouring-pad-dba4cb'], { departmentId: 'household-cleaning', family: 'cleaning-tools', familyLabel: 'Cleaning Tools' });
addReviewedGroup(['house-hold-d1c761'], { departmentId: 'household-cleaning', family: 'dishwashing', familyLabel: 'Dishwashing' });
addReviewedGroup(['wrapping-material'], { departmentId: 'household-cleaning', family: 'household-consumables', familyLabel: 'Household Consumables' });
addReviewedGroup(['paper-plastic'], { departmentId: 'home-furniture-decor', family: 'plastic-housewares', familyLabel: 'Plastic Housewares' });
addReviewedGroup(['fire-lighter-match', 'match-box-1dcac5'], { departmentId: 'kitchen-dining-cookware', family: 'cooking-fuel-fire-lighting', familyLabel: 'Cooking Fuel & Fire Lighting' });
addReviewedGroup(['cold-drink'], { departmentId: 'kitchen-dining-cookware', family: 'tea-coffee-accessories', familyLabel: 'Tea & Coffee Accessories' });
addReviewedGroup(['baking-flour-4d6f18'], { departmentId: 'kitchen-dining-cookware', family: 'baking-accessories', familyLabel: 'Baking Accessories' });
addReviewedGroup(['coconut-powder'], { departmentId: 'baby-kids-toys', family: 'baby-care', familyLabel: 'Baby Care' });
addReviewedGroup(['antiseptic-liquid'], { departmentId: 'health-beauty-personal-care', family: 'first-aid', familyLabel: 'First Aid' });
addReviewedGroup(['toothpick'], { departmentId: 'health-beauty-personal-care', family: 'oral-care', familyLabel: 'Oral Care' });

// Pass 2: Health, Beauty & Personal Care.
addReviewedGroup(['beauty-personal-care'], { family: 'personal-care', familyLabel: 'Personal Care' });
addReviewedGroup(['spray-cc8d75'], { family: 'fragrance', familyLabel: 'Fragrance' });
addReviewedGroup(['bath-soap-c475f9', 'soap-hand-wash', 'shower-bath-42e971'], { family: 'bath-body', familyLabel: 'Bath & Body' });
addReviewedGroup(['sexual-health', 'condom-lubricant'], { family: 'sexual-wellness', familyLabel: 'Sexual Wellness' });
addReviewedGroup(['women-fragrance', 'perfume-54648e', 'body-spalsh-6f0062'], { family: 'fragrance', familyLabel: 'Fragrance' });
addReviewedGroup(['sanitary-1809e2', 'sanitary-pad-c4eb06', 'panty-liner-fe2e35', 'inner-pad'], { family: 'period-care', familyLabel: 'Period Care' });
addReviewedGroup(['toothpaste', 'toothbrush'], { family: 'oral-care', familyLabel: 'Oral Care' });
addReviewedGroup(['extension-e526d4'], { family: 'hair-extensions', familyLabel: 'Hair Extensions' });
addReviewedGroup(['roll-ons-ce1ad9', 'deodorant-spray-ae4078'], { family: 'deodorants', familyLabel: 'Deodorants' });
addReviewedGroup(['pharmaceutical-health-produc', 'medical-equipment-supply'], { family: 'healthcare', familyLabel: 'Healthcare' });
addReviewedGroup(['facial-care-f0b8b1', 'glycerine', 'skin-oil-4f1b44'], { family: 'skincare', familyLabel: 'Skincare' });
addReviewedGroup(['sport-nutrition'], { family: 'sports-nutrition', familyLabel: 'Sports Nutrition' });
addReviewedGroup(['hair-gel-cb97f5', 'hair-food-a3a64c', 'shampoo-conditioner', 'curl-activator-e212d6'], { family: 'haircare', familyLabel: 'Haircare' });
addReviewedGroup(['cotton-bud'], { family: 'personal-care-essentials', familyLabel: 'Personal Care Essentials' });
addReviewedGroup(['nail-polish'], { family: 'nail-care', familyLabel: 'Nail Care' });
addReviewedGroup(['shaver-razor-7b34c4'], { family: 'shaving-grooming', familyLabel: 'Shaving & Grooming' });

// Pass 2: Baby, Kids & Toys. Formula, toiletries, and maternity stay here.
addReviewedGroup(['baby-kid'], { family: 'baby-essentials', familyLabel: 'Baby Essentials' });
addReviewedGroup(['wipe-holder'], { family: 'baby-care', familyLabel: 'Baby Care' });
addReviewedGroup(['toy-game-bike'], { family: 'toys-games', familyLabel: 'Toys & Games' });
addReviewedGroup(['feeding-bottle-bc5af4'], { family: 'feeding', familyLabel: 'Feeding' });
addReviewedGroup(['maternity-pad-3a5a0a'], { family: 'maternity-care', familyLabel: 'Maternity Care' });
addReviewedGroup(['baby-soother-06745c'], { family: 'soothers-teethers', familyLabel: 'Soothers & Teethers' });
addReviewedGroup(['baby-powder'], { family: 'baby-care', familyLabel: 'Baby Care' });
addReviewedGroup(['potty'], { family: 'potty-training', familyLabel: 'Potty Training' });

// Pass 3: Computing & Networking.
addReviewedGroup(['electronic-computer', 'computing'], { family: 'computing', familyLabel: 'Computing' });
addReviewedGroup(['telephony-computing-networking'], { family: 'laptops', familyLabel: 'Laptops' });
addReviewedGroup(['computer'], { family: 'computers', familyLabel: 'Computers' });
addReviewedGroup(['laptop', 'chromebook', 'netbook', 'ultrabook', 'laptop-for-student-new', 'mac', 'razer-blade', 'x380'], { family: 'laptops', familyLabel: 'Laptops' });
addReviewedGroup(['desktop', 'tower-desktop', 'all-in-one-pc', 'desktop-accessory'], { family: 'desktop-computers', familyLabel: 'Desktop Computers' });
addReviewedGroup(['computing-workstation'], { family: 'workstations', familyLabel: 'Workstations' });
addReviewedGroup(['accessory-peripheral', 'laptop-accessory'], { family: 'computer-accessories', familyLabel: 'Computer Accessories' });
addReviewedGroup(['computer-accessory-component'], { family: 'computer-parts-components', familyLabel: 'Computer Parts & Components' });
addReviewedGroup(['laptop-battery', 'laptop-fan'], { family: 'laptop-parts', familyLabel: 'Laptop Parts' });
addReviewedGroup(['monitor-tft', 'monitor-display-screen', 'v2com'], { family: 'monitors-displays', familyLabel: 'Monitors & Displays' });
addReviewedGroup(['networking', 'router', 'tp-link', 'dongle'], { family: 'networking', familyLabel: 'Networking' });
addReviewedGroup(['server'], { family: 'servers', familyLabel: 'Servers' });
addReviewedGroup(['flash-disk', 'memory-card'], { family: 'storage', familyLabel: 'Storage' });
addReviewedGroup(['adapter-charger'], { family: 'computer-power-adapters', familyLabel: 'Power & Adapters' });
addReviewedGroup(['antivirus-security'], { family: 'software-security', familyLabel: 'Software & Security' });
addReviewedGroup(['point-sale-retail-technology', 'printer-3394f0'], { family: 'printers-scanners', familyLabel: 'Printers & Scanners' });
addReviewedGroup(['plotter'], { family: 'needs-review', familyLabel: 'Needs Review' });
addReviewedGroup(['telecom-ict-product'], { departmentId: 'phones-wearables', family: 'mobile-services-accessories', familyLabel: 'Mobile Services & Accessories' });
addReviewedGroup(['storage-organization'], { departmentId: 'household-cleaning', family: 'household-consumables', familyLabel: 'Household Consumables' });
addReviewedGroup(['office-accessory'], { family: 'networking', familyLabel: 'Networking' });
addReviewedGroup(['power-supply-backup'], { departmentId: 'home-appliances', family: 'water-dispensers', familyLabel: 'Water Dispensers' });

// Pass 3: Phones, Tablets & Wearables.
addReviewedGroup(['phone-tablet', 'computer-tablet'], { family: 'mixed-mobile-compatibility', familyLabel: 'Mixed Mobile Shelves' });
addReviewedGroup(['kid-tablet', 'tab', 'elimu-tab'], { family: 'tablets', familyLabel: 'Tablets' });
addReviewedGroup(['laptop-tablet'], { departmentId: 'computing-networking', family: 'laptops', familyLabel: 'Laptops' });
addReviewedGroup(['screen-replacement', 'charger-6a5f2e'], { departmentId: 'computing-networking', family: 'laptop-parts', familyLabel: 'Laptop Parts' });
addReviewedGroup(['smartphone-tablet-wearable', 'original-brand-accessory'], { family: 'mobile-accessories', familyLabel: 'Mobile Accessories' });
addReviewedGroup(['landline-phone-accessory'], { family: 'phones-accessories', familyLabel: 'Phones & Accessories' });
addReviewedGroup(['original-accessory', 'tablet-bag-cover', 'magsafe-wallet'], { family: 'cases-covers-wallets', familyLabel: 'Cases, Covers & Wallets' });
addReviewedGroup(['phone-accesory-2fa304'], { family: 'smart-trackers', familyLabel: 'Smart Trackers' });
addReviewedGroup(['charger-7dd0d2', 'power-bank', 'phone-battery', 'cable-4b1baf'], { family: 'power-charging', familyLabel: 'Power & Charging' });
addReviewedGroup(['certified-pre-loved-smartphone', 'foldable-phone', 'new-phone', 'ip-feature-phone', 'deskphone', 'gaming-phone', 'kabambe-phone-mulika-mwizi', 'neon-phone'], { family: 'phones', familyLabel: 'Phones' });
addReviewedGroup(['sim-card-tool'], { family: 'replacement-parts', familyLabel: 'Replacement Parts' });
addReviewedGroup(['smartwatch'], { family: 'wearables', familyLabel: 'Wearables' });
addReviewedGroup(['accessory-kit'], { departmentId: 'cameras-security-surveillance', family: 'content-creation-accessories', familyLabel: 'Content Creation Accessories' });
addReviewedGroup(['bag-fd8696'], { departmentId: 'office-school-stationery', family: 'packaging-supplies', familyLabel: 'Packaging Supplies' });
addReviewedGroup(['glass'], { departmentId: 'kitchen-dining-cookware', family: 'drinkware', familyLabel: 'Drinkware' });
addReviewedGroup(['tool'], { departmentId: 'building-electrical-hardware', family: 'hand-tools', familyLabel: 'Hand Tools' });

// Pass 3: TV, Audio & Music.
addReviewedGroup(['audio', 'audio-visual'], { family: 'audio-entertainment', familyLabel: 'Audio & Entertainment' });
addReviewedGroup(['tv-entertainment'], { family: 'headphones-earbuds', familyLabel: 'Headphones & Earbuds' });
addReviewedGroup(['television-video', 'tv-projector'], { family: 'televisions-projectors', familyLabel: 'Televisions & Projectors' });
addReviewedGroup(['audio-video-accessory'], { family: 'audio-video-accessories', familyLabel: 'Audio & Video Accessories' });
addReviewedGroup(['audio-product-speaker', 'portable-speaker-audio-dock', 'bluetooth-speaker'], { family: 'speakers', familyLabel: 'Speakers' });
addReviewedGroup(['sound-system', 'hi-fi-home-theater-system'], { family: 'home-audio-systems', familyLabel: 'Home Audio Systems' });
addReviewedGroup(['sound-bar-bluetooth-speaker', 'sound-bar'], { family: 'soundbars', familyLabel: 'Soundbars' });
addReviewedGroup(['earphone', 'headphone', 'headset', 'earphone-headset', 'earbud-pod', 'earpod'], { family: 'headphones-earbuds', familyLabel: 'Headphones & Earbuds' });
addReviewedGroup(['headphone-accessory'], { family: 'headphone-accessories', familyLabel: 'Headphone Accessories' });
addReviewedGroup(['interactive-display'], { departmentId: 'computing-networking', family: 'displays-replacement-screens', familyLabel: 'Displays & Replacement Screens' });
addReviewedGroup(['microphone'], { family: 'microphones', familyLabel: 'Microphones' });
addReviewedGroup(['drum-stick'], { family: 'musical-instrument-accessories', familyLabel: 'Musical Instrument Accessories' });
addReviewedGroup(['android-tv-box', 'tv-box'], { family: 'streaming-devices', familyLabel: 'Streaming Devices' });
addReviewedGroup(['hdmi-cable'], { family: 'cables-connectors', familyLabel: 'Cables & Connectors' });
addReviewedGroup(['accessorry'], { departmentId: 'computing-networking', family: 'computer-accessories', familyLabel: 'Computer Accessories' });

// Pass 3: Cameras, Security & Surveillance.
addReviewedGroup(['cctv-surveillance'], { family: 'cameras-surveillance', familyLabel: 'Cameras & Surveillance' });
addReviewedGroup(['selfie-stick-tripod', 'tripod-monopod'], { family: 'tripods-supports', familyLabel: 'Tripods & Supports' });

// Pass 4: Office, School & Stationery. Mixed source shelves remain reviewable;
// packaging and actual laptop collections follow the product evidence.
addReviewedGroup(['office-school-supply'], { family: 'office-school-supplies', familyLabel: 'Office & School Supplies' });
addReviewedGroup(['ultra-book', 'pen', 'tape-glue'], { family: 'needs-review', familyLabel: 'Needs Review' });
addReviewedGroup(['receipt-note-book', 'diary-941f52', 'cash-book-c5d621'], { family: 'paper-notebooks', familyLabel: 'Paper & Notebooks' });
addReviewedGroup(['notebook'], { departmentId: 'computing-networking', family: 'laptops', familyLabel: 'Laptops' });
addReviewedGroup(['packaging-bag', 'packaging-logistic-storage-supply', 'empty-carton'], { family: 'packaging-supplies', familyLabel: 'Packaging Supplies' });
addReviewedGroup(['scissor'], { family: 'cutting-sewing-craft-tools', familyLabel: 'Cutting, Sewing & Craft Tools' });
addReviewedGroup(['eraser-sharpener-e53643', 'pencil-4ab379', 'geometrical-set-e1deb5', 'chalk-b9b791', 'crayon', 'ruler-d60084'], { family: 'school-writing-drawing', familyLabel: 'School Writing & Drawing' });
addReviewedGroup(['remarkable-marker'], { family: 'writing-correction', familyLabel: 'Writing & Correction' });
addReviewedGroup(['file', 'cover-file-document-wallet'], { family: 'filing-document-storage', familyLabel: 'Filing & Document Storage' });
addReviewedGroup(['calculator'], { family: 'calculators', familyLabel: 'Calculators' });
addReviewedGroup(['document-bag-274de3'], { family: 'pencil-cases-school-storage', familyLabel: 'Pencil Cases & School Storage' });

// Pass 4: Building, Electrical & Hardware. Broad contaminated captures stay
// reviewable; evidenced food, furnishings, packaging and device mounts move.
addReviewedGroup(['hardware', 'industrial-raw-material', 'plate-box'], { family: 'needs-review', familyLabel: 'Needs Review' });
addReviewedGroup(['electrical-accessory'], { family: 'electrical-supplies-accessories', familyLabel: 'Electrical Supplies & Accessories' });
addReviewedGroup(['nut'], { departmentId: 'groceries-everyday-essentials', family: 'nuts-seeds-dried-fruit', familyLabel: 'Nuts, Seeds & Dried Fruit' });
addReviewedGroup(['tool-home-improvement'], { departmentId: 'home-furniture-decor', family: 'rugs-mats-home-accessories', familyLabel: 'Rugs, Mats & Home Accessories' });
addReviewedGroup(['manilla-twine-rope'], { family: 'ropes-chains', familyLabel: 'Ropes & Chains' });
addReviewedGroup(['electrical-plug-cap'], { family: 'plugs-surge-protection', familyLabel: 'Plugs & Surge Protection' });
addReviewedGroup(['crate'], { departmentId: 'office-school-stationery', family: 'packaging-supplies', familyLabel: 'Packaging Supplies' });
addReviewedGroup(['electrical-mount-box-bracket'], { departmentId: 'tv-audio-home-entertainment', family: 'tv-mounts-brackets', familyLabel: 'TV Mounts & Brackets' });
addReviewedGroup(['detector-sensor'], { departmentId: 'cameras-security-surveillance', family: 'smart-home-sensors', familyLabel: 'Smart Home Sensors' });

// Pass 4: Power, Solar & Energy. Device-charging and mislabeled computer
// collections follow captured use; broad battery collections stay broad.
addReviewedGroup(['battery-charger'], { family: 'charging-portable-power', familyLabel: 'Charging & Portable Power' });
addReviewedGroup(['battery-b1164a', 'battery', 'drycell'], { family: 'batteries-power-storage', familyLabel: 'Batteries & Power Storage' });
addReviewedGroup(['battery-charger-accessory'], { departmentId: 'phones-wearables', family: 'power-charging', familyLabel: 'Power & Charging' });
addReviewedGroup(['extention-6cdc4d'], { departmentId: 'building-electrical-hardware', family: 'electrical-supplies-accessories', familyLabel: 'Electrical Supplies & Accessories' });
addReviewedGroup(['power-electrical'], { departmentId: 'computing-networking', family: 'laptops', familyLabel: 'Laptops' });
addReviewedGroup(['battery-power-storage'], { departmentId: 'computing-networking', family: 'laptop-parts', familyLabel: 'Laptop Parts' });
addReviewedGroup(['portable-powerstation'], { family: 'solar-lighting', familyLabel: 'Solar Lighting' });

// Pass 5: Fashion & Accessories. Device-specific and mislabeled food,
// cleaning, and audio collections follow product evidence; mixed bags remain visible.
addReviewedGroup(['clothe'], { family: 'clothing', familyLabel: 'Clothing' });
addReviewedGroup(['fashion-accessory', 'luggage-bag-133a33'], { family: 'needs-review', familyLabel: 'Needs Review' });
addReviewedGroup(['golf-apparel-footwear'], { family: 'footwear', familyLabel: 'Footwear' });
addReviewedGroup(['bag-umbrella'], { family: 'bags-luggage-umbrellas', familyLabel: 'Bags, Luggage & Umbrellas' });
addReviewedGroup(['shoe-care-accessory', 'shoe-polish-c-4bfea2'], { family: 'shoe-care', familyLabel: 'Shoe Care' });
addReviewedGroup(['brush'], { departmentId: 'household-cleaning', family: 'cleaning-tools', familyLabel: 'Cleaning Tools' });
addReviewedGroup(['ethnic-ae09df'], { departmentId: 'groceries-everyday-essentials', family: 'ready-meals', familyLabel: 'Ready Meals' });
addReviewedGroup(['laptop-backpack'], { family: 'bags-backpacks', familyLabel: 'Bags & Backpacks' });
addReviewedGroup(['umbrella'], { family: 'bags-luggage-umbrellas', familyLabel: 'Bags, Luggage & Umbrellas' });
addReviewedGroup(['shoe-jewelry-watch-accessory'], { departmentId: 'tv-audio-home-entertainment', family: 'headphones-earbuds', familyLabel: 'Headphones & Earbuds' });

// Pass 5: Sports & Outdoors. Food/household contamination stays reviewable;
// product-complete ball, rope, and torch shelves follow evidenced use.
addReviewedGroup(['sport-fitness', 'ball'], { family: 'needs-review', familyLabel: 'Needs Review' });
addReviewedGroup(['sport-accessory'], { family: 'ball-sports-equipment', familyLabel: 'Ball Sports Equipment' });
addReviewedGroup(['rope-72c0d9'], { departmentId: 'building-electrical-hardware', family: 'ropes-chains', familyLabel: 'Ropes & Chains' });
addReviewedGroup(['torch'], { departmentId: 'building-electrical-hardware', family: 'electrical-supplies-accessories', familyLabel: 'Electrical Supplies & Accessories' });

// Pass 5: Automotive & Motorcycle. Vehicle-use accessories stay Automotive;
// mislabeled computer parts, food inputs, and general tools follow evidence.
addReviewedGroup(['automotive'], { family: 'automotive-accessories-care', familyLabel: 'Automotive Accessories & Care' });
addReviewedGroup(['coolant'], { departmentId: 'computing-networking', family: 'laptop-parts', familyLabel: 'Laptop Parts' });
addReviewedGroup(['lubricant-oil-fluid'], { family: 'needs-review', familyLabel: 'Needs Review' });
addReviewedGroup(['car-accessory'], { family: 'in-car-phone-charging', familyLabel: 'In-Car Phone & Charging Accessories' });
addReviewedGroup(['carcare-a0f017'], { family: 'car-care', familyLabel: 'Car Care' });
addReviewedGroup(['additive'], { departmentId: 'groceries-everyday-essentials', family: 'pantry', familyLabel: 'Pantry' });
addReviewedGroup(['tool-garage'], { departmentId: 'building-electrical-hardware', family: 'hand-tools', familyLabel: 'Hand Tools' });

// Pass 6: Garden, Agriculture & Agrovet. Retail pet supplies and household
// pest control follow captured products; ambiguous packaged clay remains visible.
addReviewedGroup(['farm-animal-pet'], { departmentId: 'pet-supplies', family: 'pet-care', familyLabel: 'Pet Care' });
addReviewedGroup(['insecticide'], { departmentId: 'household-cleaning', family: 'pest-control', familyLabel: 'Pest Control' });
addReviewedGroup(['udongo-1b3b46'], { family: 'needs-review', familyLabel: 'Needs Review' });
addReviewedGroup(['planter-af536f'], { family: 'planters-pots', familyLabel: 'Planters & Pots' });

// Pass 6: Classifieds. The current capture contains ordinary retail products,
// not classified listings; each collection follows its evidenced product use.
addReviewedGroup(['for-work-new'], { departmentId: 'computing-networking', family: 'laptops', familyLabel: 'Laptops' });

const reviewedSourceDepartments = new Set([
  'home-appliances',
  'home-furniture-decor',
  'kitchen-dining-cookware',
  'groceries-everyday-essentials',
  'health-beauty-personal-care',
  'baby-kids-toys',
  'computing-networking',
  'phones-wearables',
  'tv-audio-home-entertainment',
  'cameras-security-surveillance',
  'office-school-stationery',
  'building-electrical-hardware',
  'power-solar-energy',
  'fashion-accessories',
  'sports-outdoors-leisure',
  'automotive-motorcycle',
  'agriculture-agrovet',
  'classifieds',
]);

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

validateReviewedTaxonomyInputs(
  LIVE_SPINE_SHELVES,
  Object.keys(explicitPlacements),
  reviewedSourceDepartments,
);

for (const [sourceId, shelves] of Object.entries(LIVE_SPINE_SHELVES)) {
  for (const shelf of shelves) {
    const placement = explicitPlacements[shelf.slug];
    const resolvedPlacement = placement ?? defaultFamily(sourceId, shelf);
    const targetId = resolvedPlacement.departmentId ?? sourceId;
    const target = departmentMap.get(targetId);
    if (!target) throw new Error(`Unknown taxonomy department: ${targetId}`);
    const family = target.families.get(resolvedPlacement.family) ?? { id: resolvedPlacement.family, label: resolvedPlacement.familyLabel, shelves: [] };
    family.shelves.push(shelf);
    target.families.set(resolvedPlacement.family, family);
  }
}

export const TAXONOMY_DEPARTMENTS = [...departmentMap.values()]
  .map(({ base, families }) => makeDepartment(base, families))
  // Approved phone categories are independent of captured legacy collections.
  // Keep their department and aisle routable even when a capture has no phone shelves.
  .filter((department) => reviewedSourceDepartments.has(department.id)
    || shouldRetainTaxonomyDepartment(department.id, department.families.length));

export const taxonomyDepartmentById = (id: string | undefined) =>
  TAXONOMY_DEPARTMENTS.find((department) => department.id === id);

const legacyPhoneCollectionSlugs = new Set(
  Array.from(departmentMap.get('phones-wearables')?.families.values() ?? [])
    .flatMap((family) => family.shelves.map((shelf) => shelf.slug)),
);

export const isLegacyPhoneCollection = createCollectionDetector(legacyPhoneCollectionSlugs);

/** Fails fast if a capture or disposition change drops or duplicates a shelf. */
export function assertTaxonomyIntegrity(): void {
  const source = Object.values(LIVE_SPINE_SHELVES).flat().map((shelf) => shelf.slug).sort();
  const derived = TAXONOMY_DEPARTMENTS.flatMap((department) => department.families.flatMap((family) => family.shelves.map((shelf) => shelf.slug))).sort();
  if (new Set(source).size !== source.length) {
    throw new Error('The generated shelf capture contains a duplicate legacy slug.');
  }
  if (source.length !== derived.length || source.some((id, index) => id !== derived[index])) {
    throw new Error('The derived taxonomy must contain every captured shelf exactly once.');
  }
  for (const department of TAXONOMY_DEPARTMENTS) {
    const labels = new Set<string>();
    for (const family of department.families) {
      const normalized = family.label.trim().toLocaleLowerCase();
      if (labels.has(normalized)) {
        throw new Error(`Duplicate family label in ${department.id}: ${family.label}`);
      }
      labels.add(normalized);
    }
  }
}

assertTaxonomyIntegrity();

export { spineShelfDisplay };

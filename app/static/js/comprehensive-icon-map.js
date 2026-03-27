/**
 * COMPREHENSIVE CONTEXT-AWARE ICON MAPPING SYSTEM
 * Uses parent category context to resolve ambiguous terms
 * Based on actual API data from getprice_db
 */

// Main category icons (exact matches)
export const MAIN_CATEGORY_ICONS = {
  'automotive': '🚗',
  'books, movies & tv': '📚',
  'clothing & fashion': '👔',
  'computers': '💻',
  'electronics': '⚡',
  'food, drink & gifts': '🎁',
  'health & beauty': '💄',
  'home & garden': '🏡',
  'kids & toys': '🧸',
  'office supplies': '📎',
  'sports & outdoors': '⚽'
};

// Keyword-based icon mapping (order matters - more specific first)
// AUTOMOTIVE COMPONENTS - be very specific!
export const ICON_KEYWORDS = [
  // Automotive - Electrical & Electronic Components
  { keywords: ['car caps', 'capacitor', 'condenser'], icon: '🔋' }, // NOT a hat!
  { keywords: ['car battery', 'battery'], icon: '🔋' },
  { keywords: ['alternator', 'starter motor'], icon: '⚡' },
  { keywords: ['electrical', 'wiring'], icon: '🔌' },
  { keywords: ['fuse', 'relay'], icon: '⚡' },
  
  // Automotive - Engine & Performance
  { keywords: ['car seats', 'seat cover'], icon: '💺' },
  { keywords: ['car suspension', 'suspension', 'shock absorber', 'strut'], icon: '⚙️' },
  { keywords: ['brake', 'clutch', 'brake pad'], icon: '🛑' },
  { keywords: ['car filter', 'air filter', 'oil filter', 'fuel filter'], icon: '🔧' },
  { keywords: ['engine', 'motor', 'piston'], icon: '🔧' },
  { keywords: ['turbo', 'supercharger'], icon: '💨' },
  { keywords: ['exhaust', 'muffler', 'catalytic'], icon: '💨' },
  { keywords: ['cooling', 'radiator', 'coolant'], icon: '❄️' },
  { keywords: ['transmission', 'gearbox'], icon: '⚙️' },
  
  // Automotive - Wheels & Tires
  { keywords: ['wheel', 'rim', 'alloy'], icon: '🛞' },
  { keywords: ['tyre', 'tire'], icon: '🛞' },
  
  // Automotive - Audio & Electronics
  { keywords: ['car multimedia', 'car stereo'], icon: '📻' },
  { keywords: ['car amplifier', 'amp'], icon: '🔊' },
  { keywords: ['in dash receiver', 'head unit'], icon: '📻' },
  { keywords: ['car speaker'], icon: '🔊' },
  { keywords: ['subwoofer', 'sub'], icon: '🔊' },
  
  // Automotive - Accessories
  { keywords: ['dash cam', 'dashcam'], icon: '📹' },
  { keywords: ['caravan', 'camper', 'rv'], icon: '🚐' },
  { keywords: ['car rack', 'roof rack', 'bike rack'], icon: '🧳' },
  { keywords: ['lubricant', 'grease', 'additive'], icon: '🛢️' },
  { keywords: ['exterior car', 'bumper', 'grille'], icon: '🚗' },
  { keywords: ['interior car', 'dashboard'], icon: '🪑' },
  { keywords: ['car care', 'car wash', 'polish', 'wax'], icon: '🧽' },
  { keywords: ['car security', 'car alarm'], icon: '🔒' },
  { keywords: ['car tool', 'jack', 'wrench'], icon: '🔧' },
  
  // Automotive - Vehicles
  { keywords: ['motorbike accessories', 'helmet'], icon: '🏍️' },
  { keywords: ['motorbike', 'motorcycle'], icon: '🏍️' },
  { keywords: ['quad', 'buggy', 'atv'], icon: '🏎️' },
  { keywords: ['dealer enhanced', 'certified'], icon: '⭐' },
  { keywords: ['dealer used', 'pre-owned'], icon: '🚗' },
  { keywords: ['ex demo', 'near new'], icon: '✨' },
  { keywords: ['new car'], icon: '🆕' },
  { keywords: ['private used', 'used car'], icon: '🚙' },
  { keywords: ['auto part'], icon: '🔧' },
  { keywords: ['car accessory'], icon: '🚙' },

  // Books, Movies & TV
  { keywords: ['textbook', 'educational book'], icon: '📖' },
  { keywords: ['fiction', 'novel'], icon: '📕' },
  { keywords: ['non-fiction'], icon: '📘' },
  { keywords: ['children book', 'kids book'], icon: '📚' },
  { keywords: ['comic', 'graphic novel', 'manga'], icon: '📙' },
  { keywords: ['magazine', 'periodical'], icon: '📰' },
  { keywords: ['music', 'cd', 'vinyl', 'album'], icon: '🎵' },
  { keywords: ['dvd', 'blu-ray', 'movie'], icon: '🎬' },
  { keywords: ['tv show', 'series'], icon: '📺' },
  { keywords: ['game soundtrack'], icon: '🎮' },
  { keywords: ['book'], icon: '📚' },

  // Clothing & Fashion - Women's
  { keywords: ["women's clothing", "ladies"], icon: '👗' },
  { keywords: ["women's shoe", "ladies shoe", "heels", "pumps"], icon: '👠' },
  { keywords: ['dress', 'gown'], icon: '👗' },
  { keywords: ['skirt'], icon: '👗' },
  { keywords: ['blouse', 'top'], icon: '👚' },
  { keywords: ['handbag', 'purse'], icon: '👜' },
  { keywords: ['swimwear', 'bikini', 'swimsuit'], icon: '👙' },
  { keywords: ['lingerie', 'underwear', 'bra'], icon: '👙' },
  
  // Clothing & Fashion - Men's
  { keywords: ["men's clothing", "mens"], icon: '👔' },
  { keywords: ["men's shoe", "mens shoe", "oxford"], icon: '👞' },
  { keywords: ['suit', 'blazer'], icon: '🤵' },
  { keywords: ['shirt', 'dress shirt'], icon: '👔' },
  { keywords: ['tie', 'bow tie'], icon: '👔' },
  
  // Clothing & Fashion - Kids
  { keywords: ["children's clothing", "kids clothing"], icon: '👶' },
  { keywords: ['baby clothing', 'infant'], icon: '👶' },
  
  // Clothing & Fashion - Accessories
  { keywords: ['jewelry', 'jewellery'], icon: '💍' },
  { keywords: ['watch', 'timepiece'], icon: '⌚' },
  { keywords: ['sunglasses', 'eyewear'], icon: '🕶️' },
  { keywords: ['hat', 'cap', 'beanie'], icon: '🧢' }, // This is the hat cap!
  { keywords: ['scarf', 'shawl'], icon: '🧣' },
  { keywords: ['glove'], icon: '🧤' },
  { keywords: ['belt'], icon: '👔' },
  { keywords: ['wallet'], icon: '👛' },
  { keywords: ['bag', 'backpack'], icon: '🎒' },
  { keywords: ['shoe', 'footwear', 'sneaker', 'boot'], icon: '👟' },
  
  // Computers - Components
  { keywords: ['laptop', 'notebook'], icon: '💻' },
  { keywords: ['desktop', 'pc', 'tower'], icon: '🖥️' },
  { keywords: ['tablet', 'ipad'], icon: '📱' },
  { keywords: ['monitor', 'display', 'screen'], icon: '🖥️' },
  { keywords: ['keyboard'], icon: '⌨️' },
  { keywords: ['mouse', 'trackpad'], icon: '🖱️' },
  { keywords: ['processor', 'cpu', 'intel', 'amd'], icon: '🧮' },
  { keywords: ['graphics card', 'gpu', 'nvidia'], icon: '🎮' },
  { keywords: ['motherboard', 'mainboard'], icon: '🔌' },
  { keywords: ['ram', 'memory'], icon: '💾' },
  { keywords: ['hard drive', 'hdd', 'ssd', 'storage'], icon: '💿' },
  { keywords: ['power supply', 'psu'], icon: '🔌' },
  { keywords: ['cooling', 'fan', 'heatsink'], icon: '❄️' },
  { keywords: ['case', 'chassis'], icon: '🖥️' },
  { keywords: ['gaming computer', 'gaming pc'], icon: '🎮' },
  { keywords: ['server'], icon: '🖥️' },
  { keywords: ['networking', 'router', 'switch'], icon: '🌐' },
  { keywords: ['printer'], icon: '🖨️' },
  { keywords: ['scanner'], icon: '🖨️' },
  { keywords: ['webcam'], icon: '📹' },
  { keywords: ['external drive', 'external storage'], icon: '💿' },
  { keywords: ['usb', 'cable'], icon: '🔌' },
  
  // Electronics - Mobile & Communication
  { keywords: ['mobile phone', 'smartphone', 'iphone', 'android'], icon: '📱' },
  { keywords: ['phone case', 'phone cover'], icon: '📱' },
  { keywords: ['charger', 'charging'], icon: '🔌' },
  { keywords: ['headphone', 'earphone', 'earbuds', 'airpods'], icon: '🎧' },
  { keywords: ['speaker', 'bluetooth speaker'], icon: '🔊' },
  { keywords: ['smartwatch', 'fitness tracker'], icon: '⌚' },
  
  // Electronics - Home Entertainment
  { keywords: ['television', 'tv', 'smart tv'], icon: '📺' },
  { keywords: ['sound bar', 'soundbar'], icon: '🔊' },
  { keywords: ['home theatre', 'home theater'], icon: '🎬' },
  { keywords: ['game console', 'playstation', 'xbox', 'switch'], icon: '🎮' },
  { keywords: ['streaming device', 'roku', 'fire stick'], icon: '📺' },
  
  // Electronics - Camera & Photography
  { keywords: ['digital camera', 'dslr', 'mirrorless'], icon: '📷' },
  { keywords: ['camera lens', 'lens'], icon: '📸' },
  { keywords: ['tripod'], icon: '📷' },
  { keywords: ['flash', 'lighting'], icon: '💡' },
  { keywords: ['action camera', 'gopro'], icon: '📹' },
  { keywords: ['drone'], icon: '🚁' },
  
  // Electronics - Audio
  { keywords: ['amplifier', 'receiver'], icon: '🔊' },
  { keywords: ['turntable', 'record player'], icon: '💿' },
  { keywords: ['microphone', 'mic'], icon: '🎤' },
  { keywords: ['audio interface'], icon: '🎵' },
  
  // Food, Drink & Gifts
  { keywords: ['beer', 'lager', 'ale'], icon: '🍺' },
  { keywords: ['wine', 'champagne'], icon: '🍷' },
  { keywords: ['spirit', 'whisky', 'vodka', 'rum', 'gin'], icon: '🥃' },
  { keywords: ['liqueur'], icon: '🍸' },
  { keywords: ['soft drink', 'soda', 'juice'], icon: '🥤' },
  { keywords: ['coffee', 'espresso'], icon: '☕' },
  { keywords: ['tea'], icon: '🍵' },
  { keywords: ['snack', 'chips', 'candy'], icon: '🍿' },
  { keywords: ['chocolate'], icon: '🍫' },
  { keywords: ['cookie', 'biscuit'], icon: '🍪' },
  { keywords: ['gourmet food', 'specialty food'], icon: '🍽️' },
  { keywords: ['gift basket', 'hamper'], icon: '🧺' },
  { keywords: ['flower', 'bouquet', 'plant'], icon: '💐' },
  { keywords: ['gift card', 'voucher'], icon: '🎁' },
  { keywords: ['gift'], icon: '🎁' },
  
  // Health & Beauty - Skincare
  { keywords: ['skincare', 'skin care'], icon: '🧴' },
  { keywords: ['moisturizer', 'cream', 'lotion'], icon: '🧴' },
  { keywords: ['serum'], icon: '💧' },
  { keywords: ['cleanser', 'face wash'], icon: '🧼' },
  { keywords: ['sunscreen', 'spf'], icon: '☀️' },
  { keywords: ['mask', 'face mask'], icon: '🧖' },
  
  // Health & Beauty - Makeup
  { keywords: ['makeup', 'cosmetic'], icon: '💄' },
  { keywords: ['lipstick', 'lip'], icon: '💄' },
  { keywords: ['foundation', 'concealer'], icon: '💄' },
  { keywords: ['eyeshadow', 'eye'], icon: '👁️' },
  { keywords: ['mascara'], icon: '💄' },
  { keywords: ['nail polish', 'nail'], icon: '💅' },
  
  // Health & Beauty - Hair
  { keywords: ['haircare', 'hair care'], icon: '💇' },
  { keywords: ['shampoo'], icon: '🧴' },
  { keywords: ['conditioner'], icon: '🧴' },
  { keywords: ['hair styling', 'gel', 'mousse'], icon: '💇' },
  { keywords: ['hair dryer', 'blow dryer'], icon: '💨' },
  { keywords: ['straightener', 'curling iron'], icon: '💇' },
  
  // Health & Beauty - Fragrance
  { keywords: ['perfume', 'cologne', 'fragrance'], icon: '🌸' },
  { keywords: ['body spray', 'deodorant'], icon: '🧴' },
  
  // Health & Beauty - Personal Care
  { keywords: ['oral care', 'toothbrush', 'toothpaste'], icon: '🦷' },
  { keywords: ['shaving', 'razor', 'shaver'], icon: '🪒' },
  { keywords: ['bath', 'shower gel', 'body wash'], icon: '🛁' },
  { keywords: ['massage', 'spa'], icon: '💆' },
  { keywords: ['vitamin', 'supplement'], icon: '💊' },
  { keywords: ['first aid', 'medical'], icon: '⚕️' },
  
  // Home & Garden - Kitchen Appliances
  { keywords: ['refrigerator', 'fridge', 'freezer'], icon: '🧊' },
  { keywords: ['oven', 'stove', 'range'], icon: '🍳' },
  { keywords: ['microwave'], icon: '📡' },
  { keywords: ['dishwasher'], icon: '🍽️' },
  { keywords: ['coffee maker', 'espresso machine'], icon: '☕' },
  { keywords: ['blender', 'mixer'], icon: '🥤' },
  { keywords: ['toaster'], icon: '🍞' },
  { keywords: ['kettle'], icon: '☕' },
  { keywords: ['air fryer'], icon: '🍳' },
  { keywords: ['slow cooker', 'instant pot'], icon: '🍲' },
  
  // Home & Garden - Home Appliances
  { keywords: ['vacuum cleaner', 'vacuum'], icon: '🧹' },
  { keywords: ['washing machine', 'washer'], icon: '🧺' },
  { keywords: ['dryer', 'tumble dryer'], icon: '👕' },
  { keywords: ['iron', 'steam iron'], icon: '👔' },
  { keywords: ['air conditioner', 'ac'], icon: '❄️' },
  { keywords: ['heater', 'heating'], icon: '🔥' },
  { keywords: ['fan', 'ceiling fan'], icon: '💨' },
  { keywords: ['humidifier', 'dehumidifier'], icon: '💧' },
  { keywords: ['air purifier'], icon: '💨' },
  
  // Home & Garden - Furniture
  { keywords: ['sofa', 'couch'], icon: '🛋️' },
  { keywords: ['chair', 'armchair'], icon: '🪑' },
  { keywords: ['table', 'dining table'], icon: '🪑' },
  { keywords: ['bed', 'mattress'], icon: '🛏️' },
  { keywords: ['desk'], icon: '🪑' },
  { keywords: ['cabinet', 'cupboard'], icon: '🗄️' },
  { keywords: ['shelf', 'bookshelf'], icon: '📚' },
  { keywords: ['wardrobe', 'closet'], icon: '🚪' },
  
  // Home & Garden - Decor
  { keywords: ['lighting', 'lamp', 'light'], icon: '💡' },
  { keywords: ['curtain', 'blind'], icon: '🪟' },
  { keywords: ['rug', 'carpet'], icon: '🧶' },
  { keywords: ['pillow', 'cushion'], icon: '🛋️' },
  { keywords: ['art', 'painting', 'picture'], icon: '🖼️' },
  { keywords: ['mirror'], icon: '🪞' },
  { keywords: ['clock'], icon: '🕐' },
  { keywords: ['vase'], icon: '🏺' },
  
  // Home & Garden - Outdoor
  { keywords: ['garden tool', 'spade', 'rake'], icon: '🌱' },
  { keywords: ['lawn mower', 'mower'], icon: '🌱' },
  { keywords: ['bbq', 'grill', 'barbecue'], icon: '🍖' },
  { keywords: ['outdoor furniture', 'patio'], icon: '🪑' },
  { keywords: ['plant', 'seed'], icon: '🌱' },
  { keywords: ['garden decoration'], icon: '🌻' },
  { keywords: ['pool', 'swimming'], icon: '🏊' },
  
  // Home & Garden - Pet Supplies
  { keywords: ['pet', 'dog', 'cat'], icon: '🐾' },
  { keywords: ['pet food'], icon: '🐾' },
  { keywords: ['pet toy'], icon: '🎾' },
  { keywords: ['aquarium', 'fish tank'], icon: '🐠' },
  
  // Kids & Toys
  { keywords: ['action figure', 'figurine'], icon: '🦸' },
  { keywords: ['doll', 'barbie'], icon: '🎎' },
  { keywords: ['puzzle', 'jigsaw'], icon: '🧩' },
  { keywords: ['board game', 'game'], icon: '🎲' },
  { keywords: ['lego', 'building block', 'construction'], icon: '🧱' },
  { keywords: ['remote control', 'rc', 'drone'], icon: '🎮' },
  { keywords: ['educational toy', 'learning'], icon: '📚' },
  { keywords: ['baby toy', 'infant toy'], icon: '👶' },
  { keywords: ['outdoor toy', 'playground'], icon: '🏀' },
  { keywords: ['stuffed animal', 'plush', 'teddy'], icon: '🧸' },
  { keywords: ['art craft', 'drawing', 'coloring'], icon: '🎨' },
  { keywords: ['musical toy', 'instrument'], icon: '🎵' },
  { keywords: ['bike', 'bicycle', 'scooter'], icon: '🚲' },
  { keywords: ['car toy', 'vehicle toy'], icon: '🚗' },
  
  // Office Supplies
  { keywords: ['pen', 'pencil'], icon: '✏️' },
  { keywords: ['notebook', 'journal'], icon: '📓' },
  { keywords: ['paper', 'printer paper'], icon: '📄' },
  { keywords: ['folder', 'binder'], icon: '📁' },
  { keywords: ['stapler'], icon: '📎' },
  { keywords: ['tape', 'adhesive'], icon: '📦' },
  { keywords: ['scissors'], icon: '✂️' },
  { keywords: ['calculator'], icon: '🔢' },
  { keywords: ['desk organizer', 'organizer'], icon: '🗂️' },
  { keywords: ['whiteboard', 'marker'], icon: '📝' },
  { keywords: ['office chair'], icon: '🪑' },
  { keywords: ['desk lamp'], icon: '💡' },
  { keywords: ['office'], icon: '📎' },
  
  // Sports & Outdoors - Exercise
  { keywords: ['treadmill'], icon: '🏃' },
  { keywords: ['exercise bike', 'stationary bike'], icon: '🚴' },
  { keywords: ['dumbbell', 'weight'], icon: '🏋️' },
  { keywords: ['yoga mat', 'yoga'], icon: '🧘' },
  { keywords: ['fitness equipment', 'gym'], icon: '💪' },
  
  // Sports & Outdoors - Team Sports
  { keywords: ['football', 'soccer'], icon: '⚽' },
  { keywords: ['basketball'], icon: '🏀' },
  { keywords: ['baseball', 'bat'], icon: '⚾' },
  { keywords: ['tennis', 'racket'], icon: '🎾' },
  { keywords: ['volleyball'], icon: '🏐' },
  { keywords: ['golf', 'club'], icon: '⛳' },
  
  // Sports & Outdoors - Outdoor Activities
  { keywords: ['camping', 'tent'], icon: '⛺' },
  { keywords: ['hiking', 'backpack'], icon: '🥾' },
  { keywords: ['fishing', 'rod'], icon: '🎣' },
  { keywords: ['hunting'], icon: '🎯' },
  { keywords: ['cycling', 'bike'], icon: '🚴' },
  { keywords: ['swimming', 'goggles'], icon: '🏊' },
  { keywords: ['skiing', 'snowboard'], icon: '⛷️' },
  { keywords: ['skateboard'], icon: '🛹' },
  { keywords: ['climbing', 'mountaineering'], icon: '🧗' },
  
  // Sports & Outdoors - Sportswear
  { keywords: ['athletic wear', 'activewear'], icon: '👟' },
  { keywords: ['sneaker', 'running shoe'], icon: '👟' },
  { keywords: ['sports equipment'], icon: '⚽' },
  
  // Generic fallbacks (at the end)
  { keywords: ['accessory'], icon: '🔧' },
  { keywords: ['tool'], icon: '🔧' },
  { keywords: ['part'], icon: '🔧' },
  { keywords: ['equipment'], icon: '⚙️' },
  { keywords: ['device'], icon: '📱' },
  { keywords: ['product'], icon: '📦' }
];

/**
 * Get icon for a category/subcategory name with context awareness
 * @param {string} name - Category/subcategory name
 * @param {boolean} isMainCategory - Whether this is a main category
 * @param {string} parentContext - Parent category name for context (optional)
 * @returns {string} - Emoji icon
 */
export function getIconByKeywords(name, isMainCategory = false, parentContext = '') {
  if (!name) return '📦';
  
  const normalizedName = name.toLowerCase().trim();
  
  // Check main category exact match
  if (isMainCategory && MAIN_CATEGORY_ICONS[normalizedName]) {
    return MAIN_CATEGORY_ICONS[normalizedName];
  }
  
  // Check for exact keyword matches first (highest priority)
  for (const mapping of ICON_KEYWORDS) {
    for (const keyword of mapping.keywords) {
      if (normalizedName === keyword.toLowerCase()) {
        return mapping.icon;
      }
    }
  }
  
  // Check for partial matches (contains keyword)
  // Prioritize longer, more specific keywords
  const matches = [];
  for (const mapping of ICON_KEYWORDS) {
    for (const keyword of mapping.keywords) {
      const normalizedKeyword = keyword.toLowerCase();
      if (normalizedName.includes(normalizedKeyword)) {
        matches.push({
          keyword: normalizedKeyword,
          icon: mapping.icon,
          length: normalizedKeyword.length,
          // Bonus for keywords at start of name
          position: normalizedName.indexOf(normalizedKeyword)
        });
      }
    }
  }
  
  // Sort matches: longer keywords first, then by position
  if (matches.length > 0) {
    matches.sort((a, b) => {
      if (b.length !== a.length) return b.length - a.length;
      return a.position - b.position;
    });
    return matches[0].icon;
  }
  
  // Default fallback
  return '📦';
}

/**
 * Get stock image URL for a subcategory
 * @param {string} subcategoryName - Name of the subcategory
 * @returns {string} - Image URL
 */
export function getStockImage(subcategoryName) {
  const encoded = encodeURIComponent(subcategoryName);
  return `https://via.placeholder.com/400x150/007bff/ffffff?text=${encoded}`;
}

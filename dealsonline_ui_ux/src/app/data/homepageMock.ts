/**
 * Static homepage mock — DESIGN PASS ONLY.
 *
 * Drives the homepage layout/rails so we can iterate on the visual design
 * without depending on the backend. Images are real (Klarna CDN); prices are
 * plausible KES values for design credibility.
 *
 * TODO(wire-data): replace these arrays with live calls:
 *   - deals      → curated deals endpoint (needs backend curation, see NOTES)
 *   - popular    → pricerunnerApi.getHomepageProducts().trending
 *   - phones/computing/soundVision → getProducts(type, { sort: 'stores-desc', minPrice: 1000 })
 */

export interface MockProduct {
  id: string;
  name: string;
  image: string;
  price: number;
  oldPrice?: number;
  numStores: number;
  /** External link to the cheapest vendor's product page (the "View deal" target).
   *  TODO(wire-data): use the lowest offer's real retailer URL. */
  vendorUrl?: string;
}

const CDN = 'https://owp.klarna.com/product/232x232';

export const mockDeals: MockProduct[] = [
  { id: '3456295135', name: 'Samsung Galaxy S26 Ultra 512GB Sky Blue', image: `${CDN}/3261576268/Samsung-Galaxy-S26-Ultra-512GB-Sky-Blue.jpg`, price: 174999, oldPrice: 199999, numStores: 5, vendorUrl: 'https://www.jumia.co.ke/' },
  { id: '3401296675', name: 'LG OLED55C56LB 55" OLED Smart TV', image: `${CDN}/3207276118/LG-OLED55C56LB-55-OLED-Smart-Television.jpg`, price: 159999, oldPrice: 184999, numStores: 7, vendorUrl: 'https://www.avechi.com/' },
  { id: '3363581234', name: 'Apple Mac mini, M4 Pro, 24GB, 512GB SSD', image: `${CDN}/3168741769/Apple-Mac-mini-M4-Pro-Chip-12-core-CPU-16-core-GPU-24GB-Unified-Memory-512GB-SSD-Storage.jpg`, price: 124999, oldPrice: 139999, numStores: 4, vendorUrl: 'https://www.phoneplacekenya.com/' },
  { id: '3431242042', name: 'Apple iPhone 17 Pro Max 256GB Deep Blue', image: `${CDN}/3239077511/Apple-iPhone-17-Pro-Max-256GB-Deep-Blue.jpg`, price: 184999, oldPrice: 204999, numStores: 6, vendorUrl: 'https://www.jumia.co.ke/' },
  { id: '3400710364', name: 'LG OLED48G56LS 48" OLED Smart TV', image: `${CDN}/3216612110/LG-OLED48G56LS.jpg`, price: 94999, oldPrice: 109999, numStores: 5, vendorUrl: 'https://www.avechi.com/' },
  { id: '3414153704', name: 'Apple iMac 24" M4, 16GB, 256GB Blue', image: `${CDN}/3220873370/Apple-iMac-24-inch-M4-Chip-10-core-CPU-10-core-GPU-16GB-Unified-Memory-256GB-SSD-Storage-Standard-Glass-Blue.jpg`, price: 189999, oldPrice: 209999, numStores: 3, vendorUrl: 'https://www.phoneplacekenya.com/' },
];

export const mockPopular: MockProduct[] = [
  { id: '3431242045', name: 'Apple iPhone 17 Pro Max 256GB Silver', image: `${CDN}/3239079133/Apple-iPhone-17-Pro-Max-256GB-Silver.jpg`, price: 184999, numStores: 6 },
  { id: '3456296969', name: 'Samsung Galaxy S26 Ultra 1TB Black', image: `${CDN}/3261576279/Samsung-Galaxy-S26-Ultra-1TB-Black.jpg`, price: 219999, numStores: 5 },
  { id: '3396683741', name: 'Apple Mac Studio M4 Max, 36GB, 512GB', image: `${CDN}/3202460792/Apple-Mac-Studio-M4-Max-chip-14-core-CPU-32-core-GPU-36GB-Unified-Memory-512GB-SSD-Storage.jpg`, price: 384999, numStores: 4 },
  { id: '3407915061', name: 'Samsung QE77S95F 77" OLED TV', image: `${CDN}/3233226239/Samsung-QE77S95F.jpg`, price: 329999, numStores: 7 },
  { id: '3431242202', name: 'Apple iPhone 17 Pro 512GB Cosmic Orange', image: `${CDN}/3239072813/Apple-iPhone-17-Pro-512GB-Cosmic-Orange.jpg`, price: 234999, numStores: 5 },
  { id: '3407597709', name: 'LG OLED65C54LA 65" 4K Smart TV', image: `${CDN}/3213959099/LG-OLED65C54LA-2025-OLED-HDR-4K-Ultra-HD-Smart-TV.jpg`, price: 219999, numStores: 6 },
];

export const mockPhones: MockProduct[] = [
  { id: '3431242042', name: 'Apple iPhone 17 Pro Max 256GB Deep Blue', image: `${CDN}/3239077511/Apple-iPhone-17-Pro-Max-256GB-Deep-Blue.jpg`, price: 184999, numStores: 6 },
  { id: '3431242039', name: 'Apple iPhone 17 Pro Max 256GB Cosmic Orange', image: `${CDN}/3239075714/Apple-iPhone-17-Pro-Max-256GB-Cosmic-Orange.jpg`, price: 184999, numStores: 4 },
  { id: '3456296969', name: 'Samsung Galaxy S26 Ultra 1TB Black', image: `${CDN}/3261576279/Samsung-Galaxy-S26-Ultra-1TB-Black.jpg`, price: 219999, numStores: 5 },
  { id: '3456295135', name: 'Samsung Galaxy S26 Ultra 512GB Sky Blue', image: `${CDN}/3261576268/Samsung-Galaxy-S26-Ultra-512GB-Sky-Blue.jpg`, price: 199999, numStores: 5 },
  { id: '3431242202', name: 'Apple iPhone 17 Pro 512GB Cosmic Orange', image: `${CDN}/3239072813/Apple-iPhone-17-Pro-512GB-Cosmic-Orange.jpg`, price: 234999, numStores: 3 },
  { id: '3431242045', name: 'Apple iPhone 17 Pro Max 256GB Silver', image: `${CDN}/3239079133/Apple-iPhone-17-Pro-Max-256GB-Silver.jpg`, price: 184999, numStores: 6 },
];

export const mockComputing: MockProduct[] = [
  { id: '3414153704', name: 'Apple iMac 24" M4, 16GB, 256GB Blue', image: `${CDN}/3220873370/Apple-iMac-24-inch-M4-Chip-10-core-CPU-10-core-GPU-16GB-Unified-Memory-256GB-SSD-Storage-Standard-Glass-Blue.jpg`, price: 199999, numStores: 3 },
  { id: '3362897982', name: 'Apple iMac 24" M4, 16GB, 256GB Silver', image: `${CDN}/3167963730/Apple-iMac-24-inch-M4-Chip-8-core-CPU-8-core-GPU-16GB-Unified-Memory-256GB-SSD-Storage-Silver.jpg`, price: 189999, numStores: 4 },
  { id: '3396683741', name: 'Apple Mac Studio M4 Max, 36GB, 512GB', image: `${CDN}/3202460792/Apple-Mac-Studio-M4-Max-chip-14-core-CPU-32-core-GPU-36GB-Unified-Memory-512GB-SSD-Storage.jpg`, price: 384999, numStores: 4 },
  { id: '3363581234', name: 'Apple Mac mini, M4 Pro, 24GB, 512GB SSD', image: `${CDN}/3168741769/Apple-Mac-mini-M4-Pro-Chip-12-core-CPU-16-core-GPU-24GB-Unified-Memory-512GB-SSD-Storage.jpg`, price: 134999, numStores: 5 },
  { id: '3415525197', name: 'Apple iMac 24" M4, 16GB, 256GB Blue', image: `${CDN}/3222291721/Apple-iMac-24-inch-M4-Chip-8-core-CPU-8-core-GPU-16GB-Unified-Memory-256GB-SSD-Storage-Blue.jpg`, price: 184999, numStores: 3 },
  { id: '3363189495', name: 'Apple iMac 24" M4, 16GB, 512GB Silver', image: `${CDN}/3167963730/Apple-iMac-24-inch-M4-Chip-10-core-CPU-10-core-GPU-16GB-Unified-Memory-512GB-SSD-Storage-Silver.jpg`, price: 239999, numStores: 4 },
];

export const mockSoundVision: MockProduct[] = [
  { id: '3401296675', name: 'LG OLED55C56LB 55" OLED Smart TV', image: `${CDN}/3207276118/LG-OLED55C56LB-55-OLED-Smart-Television.jpg`, price: 179999, numStores: 7 },
  { id: '3400338024', name: 'LG OLED55G54LW 55" OLED evo TV', image: `${CDN}/3216566718/LG-OLED55G54LW.jpg`, price: 249999, numStores: 5 },
  { id: '3407915061', name: 'Samsung QE77S95F 77" OLED TV', image: `${CDN}/3233226239/Samsung-QE77S95F.jpg`, price: 329999, numStores: 7 },
  { id: '3407597709', name: 'LG OLED65C54LA 65" 4K Smart TV', image: `${CDN}/3213959099/LG-OLED65C54LA-2025-OLED-HDR-4K-Ultra-HD-Smart-TV.jpg`, price: 219999, numStores: 6 },
  { id: '3398125119', name: 'LG OLED55G56LS 55" OLED evo TV', image: `${CDN}/3215495853/LG-OLED55G56LS.jpg`, price: 239999, numStores: 4 },
  { id: '3400710364', name: 'LG OLED48G56LS 48" OLED Smart TV', image: `${CDN}/3216612110/LG-OLED48G56LS.jpg`, price: 104999, numStores: 5 },
];

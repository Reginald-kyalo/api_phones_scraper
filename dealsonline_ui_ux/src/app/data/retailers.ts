/**
 * Static retailer metadata config.
 *
 * The backend stores `site_fetched` as a domain (e.g. "kilimall.co.ke").
 * The React-facing API transforms it via `split(".")[0]` to produce
 * retailerIds like "kilimall", "jumia", etc.
 *
 * This file maps those IDs to display metadata so the frontend can show
 * retailer logos, payment methods, and basic info without a DB migration.
 */

export interface RetailerMeta {
  id: string;
  name: string;
  /** Hex color used to generate colored-initial avatar when no logo is available */
  color: string;
  /** Optional logo URL — use colored initials as fallback */
  logo?: string;
  /** Known payment methods accepted */
  paymentMethods: string[];
  /** General delivery info text */
  deliveryInfo: string;
  /** External homepage URL */
  website: string;
}

const retailers: Record<string, RetailerMeta> = {
  jumia: {
    id: 'jumia',
    name: 'Jumia Kenya',
    color: '#F68B1E',
    paymentMethods: ['M-Pesa', 'Visa', 'Mastercard', 'Cash on Delivery'],
    deliveryInfo: 'Free delivery on eligible orders. 1–5 business days.',
    website: 'https://www.jumia.co.ke',
  },
  kilimall: {
    id: 'kilimall',
    name: 'Kilimall',
    color: '#E53935',
    paymentMethods: ['M-Pesa', 'Visa', 'Mastercard'],
    deliveryInfo: 'Delivery within 2–7 business days.',
    website: 'https://www.kilimall.co.ke',
  },
  jiji: {
    id: 'jiji',
    name: 'Jiji Kenya',
    color: '#FFD600',
    paymentMethods: ['M-Pesa', 'Cash on Delivery'],
    deliveryInfo: 'Meet-up or delivery arranged with seller.',
    website: 'https://jiji.co.ke',
  },
  phone_place: {
    id: 'phone_place',
    name: 'Phone Place',
    color: '#1565C0',
    paymentMethods: ['M-Pesa', 'Cash'],
    deliveryInfo: 'Same-day delivery in Nairobi.',
    website: 'https://phoneplacekenya.com',
  },
  masoko: {
    id: 'masoko',
    name: 'Masoko',
    color: '#00897B',
    paymentMethods: ['M-Pesa', 'Visa', 'Mastercard'],
    deliveryInfo: 'Delivery within 2–5 business days.',
    website: 'https://www.masoko.com',
  },
  pigiame: {
    id: 'pigiame',
    name: 'PigiaMe',
    color: '#7B1FA2',
    paymentMethods: ['M-Pesa', 'Cash'],
    deliveryInfo: 'Contact seller for delivery options.',
    website: 'https://pigiame.co.ke',
  },
  vituzote: {
    id: 'vituzote',
    name: 'Vituzote',
    color: '#2E7D32',
    paymentMethods: ['M-Pesa', 'Visa', 'Mastercard'],
    deliveryInfo: 'Free delivery on orders over KES 5,000.',
    website: 'https://vituzote.com',
  },
  amazon: {
    id: 'amazon',
    name: 'Amazon',
    color: '#FF9900',
    paymentMethods: ['Visa', 'Mastercard', 'Amazon Pay'],
    deliveryInfo: 'International shipping. 7–21 business days.',
    website: 'https://www.amazon.com',
  },
  electronic_shop: {
    id: 'electronic_shop',
    name: 'Electronic Shop',
    color: '#0277BD',
    paymentMethods: ['M-Pesa', 'Cash'],
    deliveryInfo: 'Delivery within Nairobi. Contact for details.',
    website: '#',
  },
  zuricart: {
    id: 'zuricart',
    name: 'ZuriCart',
    color: '#C62828',
    paymentMethods: ['M-Pesa', 'Visa', 'Mastercard'],
    deliveryInfo: 'Delivery within 3–7 business days.',
    website: 'https://zuricart.co.ke',
  },
  komplett: {
    id: 'komplett',
    name: 'Komplett',
    color: '#0D47A1',
    paymentMethods: ['M-Pesa', 'Visa'],
    deliveryInfo: 'Standard delivery 2–5 days.',
    website: '#',
  },
};

/**
 * Get retailer metadata by ID. Returns a fallback for unknown retailers.
 */
export function getRetailer(retailerId: string): RetailerMeta {
  const id = retailerId.toLowerCase().replace(/\s+/g, '_');
  if (retailers[id]) return retailers[id];

  // Generate a deterministic color from the retailer ID
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;

  return {
    id,
    name: id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    color: `hsl(${hue}, 55%, 45%)`,
    paymentMethods: ['M-Pesa'],
    deliveryInfo: 'Contact retailer for delivery details.',
    website: '#',
  };
}

/**
 * Get retailer initials for colored-circle avatar fallback.
 */
export function getRetailerInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

export default retailers;

import { type PRProductDetail } from '../lib/api';

export interface GeneratedStore {
  name: string;
  price: number;
  shipping: string;
  shippingCost: number;
  logo: string; // single-letter initial
  color: string;
}

export interface PricePoint {
  month: string;
  price: number;
}

export interface RatingBreakdown {
  total: number;
  average: number;
  distribution: { stars: number; count: number; pct: number }[];
}

const STORE_POOL = [
  { name: 'Jumia', color: '#f68b1e' },
  { name: 'Kilimall', color: '#ee2737' },
  { name: 'Masoko', color: '#00a651' },
  { name: 'Phoneplace', color: '#2563eb' },
  { name: 'Electrohub', color: '#7c3aed' },
  { name: 'TechBuzz', color: '#0891b2' },
  { name: 'PriceDrop', color: '#dc2626' },
  { name: 'MegaStore', color: '#ca8a04' },
  { name: 'QuickShop', color: '#059669' },
  { name: 'GadgetWorld', color: '#9333ea' },
];

const SHIPPING_OPTIONS = [
  { text: 'Free delivery', cost: 0 },
  { text: 'Free delivery', cost: 0 },
  { text: 'Free delivery', cost: 0 },
  { text: '+ KSh 200 shipping', cost: 200 },
  { text: '+ KSh 350 shipping', cost: 350 },
  { text: '+ KSh 150 shipping', cost: 150 },
];

export function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateStores(product: PRProductDetail): GeneratedStore[] {
  const count = Math.max(product.numStores, 2);
  const seed = product.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = seededRandom(seed);
  const stores: GeneratedStore[] = [];

  for (let i = 0; i < Math.min(count, STORE_POOL.length); i++) {
    const pool = STORE_POOL[i];
    const variance = 0.85 + rand() * 0.3; // 0.85 – 1.15x
    const price = Math.round(product.price * variance * 100) / 100;
    const shipIdx = Math.floor(rand() * SHIPPING_OPTIONS.length);
    const ship = SHIPPING_OPTIONS[shipIdx];
    stores.push({
      name: pool.name,
      price,
      shipping: ship.text,
      shippingCost: ship.cost,
      logo: pool.name[0],
      color: pool.color,
    });
  }
  // ensure lowest price matches product.price
  stores.sort((a, b) => a.price - b.price);
  if (stores.length > 0) stores[0].price = product.price;
  return stores;
}

export function generatePriceHistory(basePrice: number, productId: string): PricePoint[] {
  const seed = productId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + 99;
  const rand = seededRandom(seed);
  const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  const points: PricePoint[] = [];
  let price = basePrice * (0.95 + rand() * 0.15);
  for (const m of months) {
    const change = (rand() - 0.45) * basePrice * 0.08;
    price = Math.max(basePrice * 0.7, Math.min(basePrice * 1.25, price + change));
    points.push({ month: m, price: Math.round(price * 100) / 100 });
  }
  // ensure current month ends at roughly basePrice
  points[points.length - 1].price = basePrice;
  return points;
}

export function generateRatingBreakdown(rating: number | null): RatingBreakdown {
  if (rating == null) {
    return { total: 0, average: 0, distribution: [5, 4, 3, 2, 1].map(s => ({ stars: s, count: 0, pct: 0 })) };
  }
  // Distribute ratings to roughly match the average
  const total = 47 + Math.round(rating * 12);
  const weights = [
    Math.pow(rating / 5, 2.5) * 50,
    Math.pow(rating / 5, 1.5) * 25,
    15,
    Math.pow((5 - rating) / 5, 1.5) * 15,
    Math.pow((5 - rating) / 5, 2.5) * 10,
  ];
  const sumW = weights.reduce((a, b) => a + b, 0);
  const distribution = weights.map((w, i) => {
    const count = Math.max(i === 0 ? 1 : 0, Math.round((w / sumW) * total));
    return { stars: 5 - i, count, pct: 0 };
  });
  const actualTotal = distribution.reduce((a, d) => a + d.count, 0);
  distribution.forEach(d => { d.pct = Math.round((d.count / actualTotal) * 100); });
  return { total: actualTotal, average: rating, distribution };
}

export const PLACEHOLDER_REVIEWS = [
  { name: 'James K.', date: '2 weeks ago', rating: 5, text: 'Excellent product, works exactly as described. Fast delivery and great packaging.' },
  { name: 'Mary W.', date: '1 month ago', rating: 4, text: 'Good value for money. Build quality is solid. Would recommend to others looking for this category.' },
  { name: 'Peter M.', date: '2 months ago', rating: 4, text: 'Very happy with my purchase. Setup was straightforward and performance meets expectations.' },
];

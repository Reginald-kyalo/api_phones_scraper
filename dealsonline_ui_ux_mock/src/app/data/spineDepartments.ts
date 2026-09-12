import type { LucideIcon } from 'lucide-react';
import {
  Baby,
  Camera,
  Car,
  CookingPot,
  Dumbbell,
  Gamepad2,
  Hammer,
  Laptop,
  Newspaper,
  PenLine,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sofa,
  Sparkles,
  Sprout,
  Tv,
  WashingMachine,
  Zap,
} from 'lucide-react';

/**
 * The 19 design departments the production nav now reads from
 * `GET /api/clusters/spine-departments`. This static demo cannot call that
 * endpoint, so the list is checked in with the live 2026-09-12 counts.
 *
 * ⛔ These ids are the redesign-spine slug space. They are NOT `/browse` slugs,
 * and this demo deliberately gives them their own `/aisle/:id` route so the
 * same wrong-builder trap as production cannot be re-introduced here.
 */
export interface DemoSpineDepartment {
  id: string;
  label: string;
  n_clusters: number;
  n_shelves: number;
  Icon: LucideIcon;
  /** Captured `/browse/:slug` categories that belong to this department in the demo. */
  capturedSlugs: string[];
}

export const SPINE_DEPARTMENTS: DemoSpineDepartment[] = [
  { id: 'phones-wearables', label: 'Phones & Wearables', n_clusters: 28152, n_shelves: 34, Icon: Smartphone, capturedSlugs: ['mobile-phones', 'mobile-phone-accessories', 'wearables'] },
  { id: 'groceries-everyday-essentials', label: 'Groceries & Everyday Essentials', n_clusters: 17594, n_shelves: 158, Icon: ShoppingBasket, capturedSlugs: ['groceries'] },
  { id: 'tv-audio-home-entertainment', label: 'TV, Audio & Home Entertainment', n_clusters: 7596, n_shelves: 27, Icon: Tv, capturedSlugs: ['tvs', 'audio-systems', 'headphones', 'speakers'] },
  { id: 'computing-networking', label: 'Computing & Networking', n_clusters: 5516, n_shelves: 42, Icon: Laptop, capturedSlugs: ['laptops', 'tablets', 'monitors', 'printers'] },
  { id: 'health-beauty-personal-care', label: 'Health, Beauty & Personal Care', n_clusters: 5322, n_shelves: 33, Icon: Sparkles, capturedSlugs: [] },
  { id: 'home-appliances', label: 'Home Appliances', n_clusters: 3182, n_shelves: 32, Icon: WashingMachine, capturedSlugs: [] },
  { id: 'home-furniture-decor', label: 'Home, Furniture & Décor', n_clusters: 2999, n_shelves: 31, Icon: Sofa, capturedSlugs: [] },
  { id: 'kitchen-dining-cookware', label: 'Kitchen, Dining & Cookware', n_clusters: 2988, n_shelves: 33, Icon: CookingPot, capturedSlugs: [] },
  { id: 'office-school-stationery', label: 'Office, School & Stationery', n_clusters: 2233, n_shelves: 23, Icon: PenLine, capturedSlugs: [] },
  { id: 'building-electrical-hardware', label: 'Building, Electrical & Hardware', n_clusters: 1560, n_shelves: 11, Icon: Hammer, capturedSlugs: [] },
  { id: 'fashion-accessories', label: 'Fashion & Accessories', n_clusters: 1522, n_shelves: 13, Icon: Shirt, capturedSlugs: [] },
  { id: 'power-solar-energy', label: 'Power, Solar & Energy', n_clusters: 653, n_shelves: 10, Icon: Zap, capturedSlugs: [] },
  { id: 'baby-kids-toys', label: 'Baby, Kids & Toys', n_clusters: 600, n_shelves: 8, Icon: Baby, capturedSlugs: [] },
  { id: 'classifieds', label: 'Classifieds', n_clusters: 543, n_shelves: 4, Icon: Newspaper, capturedSlugs: [] },
  { id: 'cameras-security-surveillance', label: 'Cameras, Security & Surveillance', n_clusters: 521, n_shelves: 4, Icon: Camera, capturedSlugs: ['digital-cameras'] },
  { id: 'automotive-motorcycle', label: 'Automotive & Motorcycle', n_clusters: 452, n_shelves: 7, Icon: Car, capturedSlugs: [] },
  { id: 'sports-outdoors-leisure', label: 'Sports, Outdoors & Leisure', n_clusters: 59, n_shelves: 5, Icon: Dumbbell, capturedSlugs: [] },
  { id: 'agriculture-agrovet', label: 'Agriculture & Agrovet', n_clusters: 20, n_shelves: 4, Icon: Sprout, capturedSlugs: [] },
  { id: 'gaming-books-media', label: 'Gaming, Books & Media', n_clusters: 13, n_shelves: 4, Icon: Gamepad2, capturedSlugs: [] },
];

export const spineDepartmentById = (id: string | undefined) =>
  SPINE_DEPARTMENTS.find((d) => d.id === id);

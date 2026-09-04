/**
 * Icons for the RETIRED PriceRunner spine's 14 product types (`taxonomy_db.canonical_categories`).
 *
 * ⛔ NOT for the canonical tree. That one has ~529 browsable roots rebuilt from shop breadcrumbs,
 * so it resolves icons by KEYWORD in `lib/categories.ts` — a literal map would be stale on the
 * next publish. This map stays literal precisely because the spine is frozen at 14 types and
 * will not gain a fifteenth.
 *
 * ⭐ It lives here rather than in `CategoryStrip` because that component now reads the canonical
 * tree. Leaving the spine's map exported from a canonical-tree component is how two taxonomies
 * get confused for one.
 */
import {
  Baby, Camera, Car, Dumbbell, Flower2, Gamepad2, HeartPulse, Home, Laptop, Package, Shirt,
  Smartphone, Tv, Wrench, type LucideIcon,
} from 'lucide-react';

/** product_type id → Lucide icon */
export const prIconMap: Record<string, LucideIcon> = {
  home_interior: Home,
  computing: Laptop,
  sound_vision: Tv,
  sports_outdoor: Dumbbell,
  health_beauty: HeartPulse,
  gaming_entertainment: Gamepad2,
  garden_patio: Flower2,
  phones_wearables: Smartphone,
  diy: Wrench,
  clothing_accessories: Shirt,
  photography: Camera,
  motor_transport: Car,
  toys_hobbies: Package,
  kids_family: Baby,
};

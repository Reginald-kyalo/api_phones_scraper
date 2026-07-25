import { Link } from 'react-router';
import { useState, useEffect } from 'react';
import { pricerunnerApi, type PRProductType } from '../../lib/api';
import {
  Smartphone,
  Laptop,
  Tv,
  Dumbbell,
  HeartPulse,
  Gamepad2,
  Flower2,
  Wrench,
  Shirt,
  Camera,
  Car,
  Baby,
  Home,
  Package,
  type LucideIcon,
} from 'lucide-react';

/** Map product_type id → Lucide icon */
const prIconMap: Record<string, LucideIcon> = {
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

/** Short display labels for the inline homepage strip */
const SHORT_LABELS: Record<string, string> = {
  home_interior: 'Home',
  garden_patio: 'Garden',
  kids_family: 'Kids',
  toys_hobbies: 'Toys',
  gaming_entertainment: 'Gaming',
  computing: 'Computing',
  phones_wearables: 'Phones',
  sound_vision: 'Sound & TV',
  photography: 'Photography',
  clothing_accessories: 'Clothing',
  health_beauty: 'Health',
  sports_outdoor: 'Sports',
  diy: 'DIY',
  motor_transport: 'Mobility',
};

export { prIconMap };

export default function CategoryStrip() {
  const [prTypes, setPrTypes] = useState<PRProductType[]>([]);

  useEffect(() => {
    let cancelled = false;
    pricerunnerApi.getProductTypes().then((res) => {
      if (!cancelled) setPrTypes(res.productTypes);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <nav className="bg-white border-b border-border">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6">
        <div className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-hide scroll-hint-x lg:justify-between lg:gap-0 lg:overflow-visible lg:[mask-image:none] lg:[-webkit-mask-image:none]">
          {prTypes.map((pt) => {
            const Icon = prIconMap[pt.id] || Package;
            return (
              <Link
                key={pt.id}
                to={`/browse/${pt.id}`}
                className="group flex flex-col items-center gap-2 px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap min-w-[76px]"
              >
                <div className="w-12 h-12 rounded-xl ultra-border flex items-center justify-center group-hover:border-teal group-hover:bg-teal/5 transition-colors">
                  <Icon className="w-5 h-5 flex-shrink-0 group-hover:text-teal transition-colors" strokeWidth={1.75} />
                </div>
                <span className="text-xs font-medium">{SHORT_LABELS[pt.id] || pt.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

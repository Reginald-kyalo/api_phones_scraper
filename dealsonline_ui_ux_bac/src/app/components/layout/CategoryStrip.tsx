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
  computing: 'Electronics',
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
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-3 scrollbar-hide scroll-hint-x">
          {prTypes.map((pt) => {
            const Icon = prIconMap[pt.id] || Package;
            return (
              <Link
                key={pt.id}
                to={`/browse/${pt.id}`}
                className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap group min-w-[56px]"
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                  <Icon className="w-4 h-4 flex-shrink-0 group-hover:text-primary transition-colors" />
                </div>
                <span className="text-[11px] font-medium">{SHORT_LABELS[pt.id] || pt.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

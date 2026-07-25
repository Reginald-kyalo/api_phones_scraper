import { Link } from 'react-router';
import { useState, useEffect } from 'react';
import { clustersApi } from '../../lib/api';
import type { DemoCategory } from '../../lib/demoTypes';
import { categoryLabel } from '../../pages/CatalogueCategoriesPage';
import {
  Smartphone,
  Laptop,
  Tablet,
  Tv,
  Monitor,
  Printer,
  Camera,
  Headphones,
  Speaker,
  Watch,
  Router,
  ShoppingBasket,
  Package,
  type LucideIcon,
} from 'lucide-react';

/** Map captured category slug -> Lucide icon */
const prIconMap: Record<string, LucideIcon> = {
  'groceries': ShoppingBasket,
  'mobile-phones': Smartphone,
  'laptops': Laptop,
  'tablets': Tablet,
  'audio-systems': Speaker,
  'headphones': Headphones,
  'speakers': Speaker,
  'wearables': Watch,
  'tvs': Tv,
  'monitors': Monitor,
  'printers': Printer,
  'digital-cameras': Camera,
  'desktop-computers': Monitor,
  'routers': Router,
};

/** Short display labels for the inline homepage strip */
const SHORT_LABELS: Record<string, string> = {
  'mobile-phones': 'Phones',
  'audio-systems': 'Audio',
  'digital-cameras': 'Cameras',
  'desktop-computers': 'Desktops',
};

export { prIconMap };

export default function CategoryStrip() {
  // Real captured categories, biggest first — the manifest is the only source
  // of truth for what the demo actually holds.
  const [prTypes, setPrTypes] = useState<DemoCategory[]>([]);

  useEffect(() => {
    let cancelled = false;
    clustersApi.getManifest().then((m) => {
      if (!cancelled) setPrTypes(m.categories);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <nav className="bg-white border-b border-border">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6">
        <div className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-hide scroll-hint-x lg:justify-between lg:gap-0 lg:overflow-visible lg:[mask-image:none] lg:[-webkit-mask-image:none]">
          {prTypes.map((pt) => {
            const Icon = prIconMap[pt.slug] || Package;
            return (
              <Link
                key={pt.slug}
                to={`/browse/${pt.slug}`}
                className="group flex flex-col items-center gap-2 px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap min-w-[76px]"
              >
                <div className="w-12 h-12 rounded-xl ultra-border flex items-center justify-center group-hover:border-teal group-hover:bg-teal/5 transition-colors">
                  <Icon className="w-5 h-5 flex-shrink-0 group-hover:text-teal transition-colors" strokeWidth={1.75} />
                </div>
                <span className="text-xs font-medium">{SHORT_LABELS[pt.slug] || categoryLabel(pt.slug)}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

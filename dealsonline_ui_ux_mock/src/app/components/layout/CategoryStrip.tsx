import { Link } from 'react-router';
import { useState, useEffect, useMemo } from 'react';
import { clustersApi } from '../../lib/api';
import type { DemoCategory } from '../../lib/demoTypes';
import { categoryLabel } from '../../pages/CatalogueCategoriesPage';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
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
  Cable,
  Package,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';

/** Map captured category slug -> Lucide icon */
const prIconMap: Record<string, LucideIcon> = {
  'groceries': ShoppingBasket,
  'mobile-phones': Smartphone,
  'mobile-phone-accessories': Cable,
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
  // The parent tile already says "Phones", so the child does not repeat it.
  'mobile-phone-accessories': 'Accessories',
  'audio-systems': 'Audio',
  'digital-cameras': 'Cameras',
  'desktop-computers': 'Desktops',
};

/**
 * Tile labels for the manifest's own `group` values. Deliberately shorter than
 * the group name itself, which is spelled out in the popover header.
 */
const GROUP_LABELS: Record<string, string> = {
  'Phones & Wearables': 'Phones',
  'Sound & Vision': 'Sound & TV',
  'Computing': 'Computing',
  'Photography': 'Cameras',
};

const GROUP_ICONS: Record<string, LucideIcon> = {
  'Phones & Wearables': Smartphone,
  'Sound & Vision': Speaker,
  'Computing': Laptop,
  'Photography': Camera,
};

const shortLabel = (slug: string) => SHORT_LABELS[slug] || categoryLabel(slug);

interface Tile {
  key: string;
  label: string;
  Icon: LucideIcon;
  total: number;
  /** Set when the tile is a single category — the tile links straight to it. */
  slug?: string;
  /** Set when the tile is a real group — the tile opens a list. */
  groupName?: string;
  children: DemoCategory[];
}

/**
 * Collapse the flat category list onto the manifest's own two-level tree.
 *
 * ⛔ The trigger for this was one label: `mobile-phone-accessories` renders as
 * "Mobile Phone Accessories", and the tiles are `whitespace-nowrap`, so that
 * single tile was about three times the width of its neighbours and broke the
 * rhythm of the whole strip on mobile.
 *
 * Shortening the label alone would have fixed the spacing, but the manifest
 * already publishes `group` / `path` / `level`, so the honest fix is to use the
 * hierarchy that exists: 15 tiles become 5, which is a far better mobile strip
 * than 15 items scrolling sideways, and "Accessories" ends up where it belongs —
 * under Phones, rather than as a sibling of Groceries.
 *
 * ⚠️ A group of ONE is rendered as a plain link, not a menu. Making someone open
 * a popover to discover a single destination is worse than no grouping at all,
 * and `Photography` (digital-cameras) is exactly that case today. Groceries has
 * no group at all and is a link for the same reason.
 */
function buildTiles(categories: DemoCategory[]): Tile[] {
  const groups = new Map<string, DemoCategory[]>();
  const loose: DemoCategory[] = [];

  for (const c of categories) {
    if (c.group) {
      const list = groups.get(c.group) ?? [];
      list.push(c);
      groups.set(c.group, list);
    } else {
      loose.push(c);
    }
  }

  const tiles: Tile[] = loose.map((c) => ({
    key: c.slug,
    label: shortLabel(c.slug),
    Icon: prIconMap[c.slug] || Package,
    total: c.count,
    slug: c.slug,
    children: [],
  }));

  for (const [name, kids] of groups) {
    const sorted = [...kids].sort((a, b) => b.count - a.count);
    const total = sorted.reduce((sum, c) => sum + c.count, 0);
    if (sorted.length === 1) {
      const only = sorted[0];
      tiles.push({
        key: only.slug,
        label: GROUP_LABELS[name] || shortLabel(only.slug),
        Icon: GROUP_ICONS[name] || prIconMap[only.slug] || Package,
        total,
        slug: only.slug,
        children: [],
      });
    } else {
      tiles.push({
        key: name,
        label: GROUP_LABELS[name] || name,
        Icon: GROUP_ICONS[name] || Package,
        total,
        groupName: name,
        children: sorted,
      });
    }
  }

  // Biggest first, matching how every other surface ranks categories.
  return tiles.sort((a, b) => b.total - a.total);
}

export { prIconMap };

const TILE =
  'group flex flex-col items-center gap-2 px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap min-w-[76px]';
const BADGE =
  'w-12 h-12 rounded-xl ultra-border flex items-center justify-center group-hover:border-teal group-hover:bg-teal/5 transition-colors';

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

  const tiles = useMemo(() => buildTiles(prTypes), [prTypes]);

  return (
    <nav className="bg-white border-b border-border" aria-label="Product categories">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6">
        <div className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-hide scroll-hint-x lg:justify-between lg:gap-0 lg:overflow-visible lg:[mask-image:none] lg:[-webkit-mask-image:none]">
          {tiles.map((tile) => {
            const { Icon } = tile;

            if (tile.slug) {
              return (
                <Link key={tile.key} to={`/browse/${tile.slug}`} className={TILE}>
                  <div className={BADGE}>
                    <Icon className="w-5 h-5 flex-shrink-0 group-hover:text-teal transition-colors" strokeWidth={1.75} />
                  </div>
                  <span className="text-xs font-medium">{tile.label}</span>
                </Link>
              );
            }

            return (
              <Popover key={tile.key}>
                <PopoverTrigger className={TILE}>
                  <div className={BADGE}>
                    <Icon className="w-5 h-5 flex-shrink-0 group-hover:text-teal transition-colors" strokeWidth={1.75} />
                  </div>
                  <span className="flex items-center gap-0.5 text-xs font-medium">
                    {tile.label}
                    <ChevronDown className="h-3 w-3" aria-hidden="true" />
                  </span>
                </PopoverTrigger>
                <PopoverContent align="center" className="w-60 p-1.5">
                  {/* The full group name lives here, so the short tile label
                      never has to carry the whole meaning — "Phones" opening on
                      "Phones & Wearables" explains itself. */}
                  <p className="px-2 pb-1.5 pt-1 microcopy-label">{tile.groupName}</p>
                  {tile.children.map((c) => {
                    const ChildIcon = prIconMap[c.slug] || Package;
                    return (
                      <Link
                        key={c.slug}
                        to={`/browse/${c.slug}`}
                        className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-gray-50"
                      >
                        <ChildIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="flex-1 text-foreground">{shortLabel(c.slug)}</span>
                        <span className="price-num text-xs text-muted-foreground">
                          {c.count.toLocaleString()}
                        </span>
                      </Link>
                    );
                  })}
                </PopoverContent>
              </Popover>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

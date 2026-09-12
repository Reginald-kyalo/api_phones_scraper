import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { clustersApi } from '../lib/api';
import type { DemoManifest } from '../lib/demoTypes';
import { Loader2, ChevronRight } from 'lucide-react';
import { SPINE_DEPARTMENTS } from '../data/spineDepartments';
import { LIVE_SPINE_SHELVES, spineShelfDisplay } from '../data/liveSpineShelves';

const LABELS: Record<string, string> = {
  'groceries': 'Groceries',
  'mobile-phones': 'Phones',
  'mobile-phone-accessories': 'Phone accessories',
  'laptops': 'Laptops',
  'tablets': 'Tablets',
  'audio-systems': 'Audio systems',
  'headphones': 'Headphones',
  'wearables': 'Wearables',
  'speakers': 'Speakers',
  'routers': 'Routers',
  'monitors': 'Monitors',
  'tvs': 'TVs',
  'printers': 'Printers',
  'digital-cameras': 'Cameras',
  'desktop-computers': 'Desktops',
};

export const categoryLabel = (slug: string) => LABELS[slug] ?? slug.replace(/-/g, ' ');

/**
 * All categories, now in two honest layers:
 *
 * 1. The 19 design departments — the same canonical list production reads from
 *    `/clusters/spine-departments`, presented here as static `/aisle/:id` pages.
 * 2. The captured demo categories — what this static build actually ships in
 *    `/browse/:slug`.
 */
export default function CatalogueCategoriesPage() {
  const [manifest, setManifest] = useState<DemoManifest | null>(null);

  useEffect(() => {
    let cancelled = false;
    clustersApi.getManifest().then((m) => { if (!cancelled) setManifest(m); });
    return () => { cancelled = true; };
  }, []);

  if (!manifest) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" aria-label="Loading categories" />
      </div>
    );
  }

  const comparable = manifest.categories.filter((c) => c.comparison_grade);
  const rest = manifest.categories.filter((c) => !c.comparison_grade);

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">All categories</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {manifest.total_clusters.toLocaleString()} products from{' '}
          {manifest.total_stores} Kenyan stores ·{' '}
          {manifest.multi_store_clusters.toLocaleString()} compared across 2+ stores
        </p>

        <h2 className="mt-8 mb-3 text-lg font-semibold text-foreground">Departments</h2>
        <div className="space-y-12">
          {SPINE_DEPARTMENTS.map((department) => {
            const shelves = LIVE_SPINE_SHELVES[department.id] ?? [];
            return (
              <section key={department.id}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
                  <Link
                    to={`/aisle/${department.id}`}
                    className="text-lg font-semibold text-foreground hover:text-primary"
                  >
                    {department.label}
                  </Link>
                  <span className="text-sm text-muted-foreground">
                    {department.n_clusters.toLocaleString()} products
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                  {shelves.map((shelf) => (
                    <Link
                      key={shelf.slug}
                      to={`/shelf/${shelf.slug}`}
                      className="flex items-baseline justify-between gap-2 rounded-lg p-3 ultra-border transition-colors hover:border-primary/40"
                    >
                      <span className="text-sm font-medium text-foreground">
                        {spineShelfDisplay(shelf)}
                      </span>
                      <span className="price-num text-xs text-muted-foreground">
                        {shelf.count.toLocaleString()}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <h2 className="mt-12 mb-3 text-lg font-semibold text-foreground">Captured demo categories</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          These are the catalogue slices this static build actually ships under `/browse/`.
        </p>

        <h3 className="mb-3 text-sm font-semibold text-foreground">Price comparison</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {comparable.map((c) => (
            <Link
              key={c.slug}
              to={`/browse/${c.slug}`}
              className="group flex flex-col rounded-xl p-4 ultra-border transition-colors hover:border-primary/40"
            >
              <span className="font-semibold text-foreground">{categoryLabel(c.slug)}</span>
              <span className="price-num mt-2 text-2xl font-bold text-foreground">
                {c.count.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">
                {c.multi_store.toLocaleString()} compared across stores
              </span>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-teal-deep">
                Browse <ChevronRight className="h-3 w-3" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>

        <h3 className="mt-8 mb-1 text-sm font-semibold text-foreground">Also tracking</h3>
        <p className="mb-3 text-sm text-muted-foreground">
          Browsable, but too few products appear at more than one store for a
          reliable price comparison.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {rest.map((c) => (
            <Link
              key={c.slug}
              to={`/browse/${c.slug}`}
              className="flex items-baseline justify-between gap-2 rounded-lg p-3 ultra-border transition-colors hover:border-primary/40"
            >
              <span className="text-sm font-medium text-foreground">{categoryLabel(c.slug)}</span>
              <span className="price-num text-xs text-muted-foreground">
                {c.count.toLocaleString()}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

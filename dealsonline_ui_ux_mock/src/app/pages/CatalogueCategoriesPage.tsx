import { familyDisplayLabel } from '../lib/navLabels';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { clustersApi } from '../lib/api';
import type { DemoManifest } from '../lib/demoTypes';
import { ChevronRight } from 'lucide-react';
import { Skeleton } from '../components/ui/skeleton';
import { TAXONOMY_DEPARTMENTS, spineShelfDisplay } from '../data/taxonomyTree';
import PhoneCategoryChoices from '../components/categories/PhoneCategoryChoices';

// Re-exported for the pages that import it from here.
export { categoryLabel } from '../lib/categories';
import { categoryLabel } from '../lib/categories';

/**
 * All categories, now in two honest layers:
 *
 * 1. Derived departments and families, presented as static `/aisle/:id` pages.
 * 2. Captured demo categories — what this static build actually ships in
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
      <div className="page-container py-8" aria-busy="true" aria-label="Loading categories">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-80" />
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  const comparable = manifest.categories.filter((c) => c.comparison_grade);
  const rest = manifest.categories.filter((c) => !c.comparison_grade);

  return (
    <div className="bg-background min-h-screen">
      <div className="page-container py-8">
        <h1 className="page-title">All categories</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {manifest.total_clusters.toLocaleString()} products from {manifest.total_stores} Kenyan shops ·{' '}
          {manifest.multi_store_clusters.toLocaleString()} sold by 2 or more shops
        </p>

        <h2 className="mt-8 mb-3 section-title">Departments</h2>
        <div className="space-y-12">
          {TAXONOMY_DEPARTMENTS.map((department) => {
            return (
              <section key={department.id}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
                  <Link
                    to={`/aisle/${department.id}`}
                    className="section-title hover:underline underline-offset-4"
                  >
                    {department.label}
                  </Link>
                  {department.id !== 'phones-wearables' && <span className="text-sm text-muted-foreground">{department.n_clusters.toLocaleString()} products</span>}
                </div>
                {department.id === 'phones-wearables' && <div className="mb-5"><PhoneCategoryChoices parentId="phones-wearables" /></div>}
                {department.id === 'phones-wearables' && (
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-muted-foreground">More collections</h3>
                  </div>
                )}
                <div className="space-y-4">
                  {department.families.map((family) => (
                    <section key={family.id} aria-labelledby={`${department.id}-${family.id}`}>
                      <h3 id={`${department.id}-${family.id}`} className="mb-2 text-sm font-semibold text-muted-foreground">{familyDisplayLabel(family)}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                        {family.shelves.map((shelf) => (
                          <Link key={shelf.slug} to={`/shelf/${shelf.slug}`} className="flex items-baseline justify-between gap-2 rounded-md p-3 card-interactive">
                            <span className="text-sm font-medium text-foreground">{spineShelfDisplay(shelf)}</span>
                            <span className="tabular-nums text-xs text-muted-foreground">
                              {shelf.count.toLocaleString()}<span className="sr-only"> items in collection</span>
                            </span>
                          </Link>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <h2 className="mt-12 mb-3 section-title">Compare by product type</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Product types with prices from several shops.
        </p>

        <h3 className="mb-3 text-sm font-semibold text-foreground">Price comparison</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {comparable.map((c) => (
            <Link
              key={c.slug}
              to={`/browse/${c.slug}`}
              className="group flex flex-col rounded-md p-4 card-interactive"
            >
              <span className="font-semibold text-foreground">{categoryLabel(c.slug)}</span>
              <span className="mt-2 text-2xl font-semibold text-foreground tabular-nums">
                {c.count.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">
                {c.multi_store.toLocaleString()} sold by 2 or more shops
              </span>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-link">
                Browse <ChevronRight className="h-3 w-3" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>

        <h3 className="mt-8 mb-1 text-sm font-semibold text-foreground">Also tracking</h3>
        <p className="mb-3 text-sm text-muted-foreground">
          Browsable, but too few products appear at more than one shop for a
          reliable price comparison.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {rest.map((c) => (
            <Link
              key={c.slug}
              to={`/browse/${c.slug}`}
              className="flex items-baseline justify-between gap-2 rounded-md p-3 card-interactive"
            >
              <span className="text-sm font-medium text-foreground">{categoryLabel(c.slug)}</span>
              <span className="tabular-nums text-xs text-muted-foreground">
                {c.count.toLocaleString()}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

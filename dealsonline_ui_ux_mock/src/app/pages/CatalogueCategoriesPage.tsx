import { Seo } from '../components/common/Seo';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { clustersApi } from '../lib/api';
import type { DemoManifest } from '../lib/demoTypes';
import { Skeleton } from '../components/ui/skeleton';
import { familyDisplayLabel } from '../lib/navLabels';
import { TAXONOMY_DEPARTMENTS, orderedFamilies } from '../data/taxonomyTree';

// Re-exported for the pages that import it from here.
export { categoryLabel } from '../lib/categories';
import { categoryLabel } from '../lib/categories';

/**
 * All categories (/browse): an index, one level deep. Each department is a
 * heading with its comparison categories and its families as plain text
 * links; the shelves themselves are on the department page. The old page
 * listed every shelf in a box and ran to several screens.
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
        <h1 className="page-title">All categories</h1>
        <Skeleton className="mt-2 h-4 w-80" />
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <Seo title="All categories" description="Browse every category SokoPulse compares, from phones and laptops to groceries." />
      <div className="page-container py-8">
        <h1 className="page-title">All categories</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {manifest.total_clusters.toLocaleString('en-GB')} products from {manifest.total_stores} Kenyan shops ·{' '}
          {manifest.multi_store_clusters.toLocaleString('en-GB')} sold by 2 or more shops
        </p>

        <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {TAXONOMY_DEPARTMENTS.map((department) => {
            const { Icon } = department;
            const compare = manifest.categories.filter((c) => department.capturedSlugs.includes(c.slug));
            return (
              <section key={department.id} aria-labelledby={`dept-${department.id}`}>
                <Link
                  to={`/aisle/${department.id}`}
                  id={`dept-${department.id}`}
                  className="inline-flex items-center gap-2 section-title hover:underline underline-offset-4"
                >
                  <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
                  {department.label}
                </Link>
                <ul className="mt-2 space-y-1">
                  {compare.map((c) => (
                    <li key={c.slug}>
                      <Link to={`/browse/${c.slug}`} className="text-sm font-medium text-link underline underline-offset-4 decoration-link/40 hover:decoration-link">
                        Compare {categoryLabel(c.slug).toLowerCase()}
                      </Link>
                      <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{c.count.toLocaleString('en-GB')}</span>
                    </li>
                  ))}
                  {orderedFamilies(department).map((family) => (
                    <li key={family.id}>
                      <Link
                        to={`/aisle/${department.id}#${family.id}`}
                        className="text-sm text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
                      >
                        {familyDisplayLabel(family)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

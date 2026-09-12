import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { clustersApi } from '../lib/api';
import type { DemoManifest } from '../lib/demoTypes';
import { spineDepartmentById } from '../data/spineDepartments';
import { categoryLabel } from './CatalogueCategoriesPage';
import { Loader2, ChevronRight, FolderTree, PackageOpen } from 'lucide-react';

/**
 * The static-demo equivalent of production's `/aisle/:id`.
 *
 * A design department is a spine id, not a captured `/browse` category. This
 * page exists so the 19-department nav has a real destination in the demo. It
 * shows which captured categories belong to the department when any were
 * shipped, and says so honestly when this demo did not capture one.
 */
export default function DemoAislePage() {
  const { id } = useParams<{ id: string }>();
  const department = spineDepartmentById(id);
  const [manifest, setManifest] = useState<DemoManifest | null>(null);

  useEffect(() => {
    let cancelled = false;
    clustersApi.getManifest().then((m) => { if (!cancelled) setManifest(m); });
    return () => { cancelled = true; };
  }, []);

  if (!department) {
    return (
      <div className="bg-white min-h-screen">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-16 text-center">
          <p className="text-base font-medium text-foreground mb-1">No such department</p>
          <p className="text-sm text-muted-foreground mb-4">
            <span className="font-mono">{id}</span> is not one of this demo’s design departments.
          </p>
          <Link to="/browse" className="text-sm text-link hover:text-link-hover underline">
            Browse all categories
          </Link>
        </div>
      </div>
    );
  }

  const { Icon } = department;
  const captured = manifest?.categories.filter((c) => department.capturedSlugs.includes(c.slug)) ?? [];

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8">
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <Link to="/browse" className="hover:text-foreground">All categories</Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span aria-current="page" className="text-foreground font-medium">{department.label}</span>
        </nav>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl ultra-border flex items-center justify-center">
            <Icon className="w-6 h-6 text-teal-deep" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{department.label}</h1>
            <p className="text-sm text-muted-foreground">
              {department.n_clusters.toLocaleString()} products across{' '}
              {department.n_shelves.toLocaleString()} shelves in the production taxonomy
            </p>
          </div>
        </div>

        {!manifest ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" aria-label="Loading department" />
          </div>
        ) : captured.length > 0 ? (
          <>
            <h2 className="mb-3 text-lg font-semibold text-foreground">Captured categories</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {captured.map((c) => (
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
          </>
        ) : (
          <div className="py-16 text-center">
            <FolderTree className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <p className="mt-4 text-sm text-muted-foreground">
              This department is part of the production taxonomy, but the static demo did not
              capture any products under it.
            </p>
            <Link
              to="/browse"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-teal-deep hover:text-teal"
            >
              <PackageOpen className="h-4 w-4" aria-hidden="true" />
              Browse the captured demo categories
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

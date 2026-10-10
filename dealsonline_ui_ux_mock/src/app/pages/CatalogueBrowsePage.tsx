import { useCallback, useEffect, useMemo, useState } from 'react';
import { Seo } from '../components/common/Seo';
import { Link, useParams, useSearchParams } from 'react-router';
import { clustersApi, type ClusterSummary } from '../lib/api';
import { ClusterCard, ClusterGridSkeleton } from '../features/clusters/components/ClusterCard';
import { categoryLabel } from './CatalogueCategoriesPage';
import { Button } from '../components/ui/button';
import { Pagination } from '../components/common/Pagination';
import { withSponsoredTiles } from '../components/ads/AdSlot';
import {
  FilterControls,
  MobileFilters,
  SortSelect,
} from '../features/search/components/ListingFiltersPanel';
import {
  activeFilterCount,
  applyFilters,
  brandFacets,
  PAGE_SIZE,
  readFilters,
  writeFilters,
  type ListingFilters,
} from '../lib/listing';
import { ChevronRight, RefreshCw } from 'lucide-react';

/**
 * One category of the catalogue: filters on the left, 48 cards per page.
 *
 * Filters, sort and page live in the URL so a listing position is linkable and
 * Back works. They run client-side over every product in the category, from
 * the compact card index (see getCategoryRows).
 */
export default function CatalogueBrowsePage() {
  const { productType = '' } = useParams<{ productType: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const page = Math.max(0, (Number(searchParams.get('page') ?? '1') || 1) - 1);

  const [rows, setRows] = useState<ClusterSummary[]>([]);
  const [meta, setMeta] = useState<{ count: number; complete: boolean }>({ count: 0, complete: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await clustersApi.getCategoryRows(productType);
      setRows(res.rows);
      setMeta({ count: res.count, complete: res.complete });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [productType]);

  useEffect(() => {
    load();
  }, [load]);

  const brands = useMemo(() => brandFacets(rows), [rows]);
  const filtered = useMemo(() => applyFilters(rows, filters), [rows, filters]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const label = categoryLabel(productType);

  const update = (next: ListingFilters, nextPage = 0) => {
    setSearchParams(writeFilters(next, nextPage));
    window.scrollTo({ top: 0 });
  };

  const total = activeFilterCount(filters) > 0 || !meta.complete ? filtered.length : meta.count;
  const from = filtered.length ? safePage * PAGE_SIZE + 1 : 0;
  const to = Math.min(filtered.length, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="bg-background min-h-screen">
      <Seo title={`${label} prices in Kenya`} description={`Compare ${label.toLowerCase()} prices across Kenyan shops, sorted by price.`} />
      <div className="page-container py-8">
        <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground hover:underline underline-offset-4">Home</Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <Link to="/browse" className="hover:text-foreground hover:underline underline-offset-4">All categories</Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span className="text-foreground">{label}</span>
        </nav>

        <h1 className="page-title">{label}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading
            ? ' '
            : meta.complete
              ? `${meta.count.toLocaleString()} products`
              : `${meta.count.toLocaleString()} products · filtering the ${rows.length.toLocaleString()} most compared`}
        </p>

        {error ? (
          <div className="py-20 text-center">
            <p className="mb-4 text-sm text-muted-foreground">We couldn’t load {label}. Try again.</p>
            <Button variant="outline" onClick={load} className="gap-2">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
          </div>
        ) : (
          <div className="mt-6 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="hidden lg:block" aria-label="Filters">
              <FilterControls filters={filters} brands={brands} onChange={(f) => update(f)} />
            </aside>

            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {loading
                    ? ' '
                    : filtered.length
                      ? `${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}`
                      : 'No products match'}
                </p>
                <div className="flex items-center gap-2">
                  <MobileFilters filters={filters} brands={brands} onChange={(f) => update(f)} />
                  <SortSelect value={filters.sort} onChange={(sort) => update({ ...filters, sort })} />
                </div>
              </div>

              {loading ? (
                <ClusterGridSkeleton />
              ) : visible.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                    {withSponsoredTiles(visible.map((c) => <ClusterCard key={c.cluster_id} cluster={c} />))}
                  </div>
                  <Pagination page={safePage} pages={pages} onChange={(p) => update(filters, p)} />
                </>
              ) : (
                <div className="py-16 text-center">
                  <p className="text-sm text-muted-foreground mb-3">No products match these filters.</p>
                  <Button
                    variant="outline"
                    onClick={() => update({ ...filters, brands: [], min: null, max: null, multiShop: false })}
                  >
                    Clear filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

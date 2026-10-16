import { useCallback, useEffect, useMemo, useState } from 'react';
import { Seo } from '../components/common/Seo';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { clustersApi } from '../lib/api';
import { brandName } from '../lib/format';
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
  brandPageBrands,
  listingHref,
  PAGE_SIZE,
  readFilters,
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
  const { productType = '', brand: brandParam } = useParams<{ productType: string; brand?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // A brand page (/browse/mobile-phones/samsung) is the category with that
  // one brand filtered, at a URL Google can index.
  const filters = useMemo(() => {
    const f = readFilters(searchParams);
    return brandParam ? { ...f, brands: [brandParam] } : f;
  }, [searchParams, brandParam]);
  const page = Math.max(0, (Number(searchParams.get('page') ?? '1') || 1) - 1);

  const [result, setResult] = useState<Awaited<ReturnType<typeof clustersApi.browse>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // One page at a time: filters, sort and paging run where the data is (the
  // catalogue function in production), so the browser never holds the
  // whole category.
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setResult(await clustersApi.browse(productType, filters, page));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [productType, filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  const brands = result?.brands ?? [];
  const visible = result?.results ?? [];
  const pages = result?.pages ?? 1;
  const safePage = result?.page ?? 0;
  const label = categoryLabel(productType);

  const update = (next: ListingFilters, nextPage = 0) => {
    navigate(listingHref(productType, next, nextPage));
    window.scrollTo({ top: 0 });
  };
  const brandLabel = brandParam ? brandName(brandParam) : null;
  const heading = brandLabel ? `${brandLabel} ${label.toLowerCase()}` : label;
  const popular = brandPageBrands(brands).filter((b) => b !== brandParam);

  // Quick chips (benchmark §2.4, idealo and Geizhals): one tap for the
  // filters most shoppers reach for. The cheapest range comes from the price
  // ranges, the brands are the category's biggest four.
  const cheapest = result?.prices?.[0];
  const quickChips = [
    {
      label: 'Sold by 2+ shops',
      on: filters.multiShop,
      toggle: () => ({ ...filters, multiShop: !filters.multiShop }),
    },
    ...(cheapest?.max != null
      ? [{
          label: `Under KES ${(cheapest.max + 1).toLocaleString('en-GB')}`,
          on: filters.min == null && filters.max === cheapest.max,
          toggle: () =>
            filters.min == null && filters.max === cheapest.max
              ? { ...filters, max: null }
              : { ...filters, min: null, max: cheapest.max },
        }]
      : []),
    ...brands.slice(0, 4).map((b) => ({
      label: brandName(b.value),
      on: filters.brands.includes(b.value),
      toggle: () => ({
        ...filters,
        brands: filters.brands.includes(b.value)
          ? filters.brands.filter((x) => x !== b.value)
          : [...filters.brands, b.value],
      }),
    })),
  ];

  const matching = result?.count ?? 0;
  const total = matching;
  const from = matching ? safePage * PAGE_SIZE + 1 : 0;
  const to = Math.min(matching, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="bg-background min-h-screen">
      <Seo title={`${heading} prices in Kenya`} description={`Compare ${heading.toLowerCase()} prices across Kenyan shops, sorted by price.`} />
      <div className="page-container py-8">
        <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground hover:underline underline-offset-4">Home</Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <Link to="/browse" className="hover:text-foreground hover:underline underline-offset-4">All categories</Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          {brandLabel ? (
            <>
              <Link to={`/browse/${productType}`} className="hover:text-foreground hover:underline underline-offset-4">{label}</Link>
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
              <span className="text-foreground">{brandLabel}</span>
            </>
          ) : (
            <span className="text-foreground">{label}</span>
          )}
        </nav>

        <h1 className="page-title">{heading}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading
            ? ' '
            : `${(result?.total ?? 0).toLocaleString()} products`}
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
              <FilterControls filters={filters} brands={brands} prices={result?.prices} onChange={(f) => update(f)} />
            </aside>

            <div className="min-w-0">
              {quickChips.length > 0 && (
                // Phones and tablets only: on desktop the sidebar shows the
                // same filters, and two controls for one thing is repetition.
                <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-hide lg:hidden" role="group" aria-label="Quick filters">
                  {quickChips.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      aria-pressed={chip.on}
                      onClick={() => update(chip.toggle())}
                      className={`h-8 flex-shrink-0 rounded-full border px-3 text-xs font-medium transition-colors active:translate-y-px ${
                        chip.on
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-foreground hover:border-muted-foreground'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {loading
                    ? ' '
                    : matching
                      ? `${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}`
                      : 'No products match'}
                </p>
                <div className="flex items-center gap-2">
                  <MobileFilters filters={filters} brands={brands} prices={result?.prices} resultCount={result?.count} onChange={(f) => update(f)} />
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
                  {popular.length > 0 && (
                    <section className="mt-12 border-t border-border pt-6" aria-labelledby="popular-heading">
                      <h2 id="popular-heading" className="section-title">Popular in {label}</h2>
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {popular.map((b) => (
                          <li key={b}>
                            <Link
                              to={`/browse/${productType}/${b}`}
                              className="inline-flex h-8 items-center rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:border-muted-foreground"
                            >
                              {brandName(b)} {label.toLowerCase()}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
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

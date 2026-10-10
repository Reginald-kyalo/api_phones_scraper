import { useEffect, useMemo, useState } from 'react';
import { Seo } from '../components/common/Seo';
import { Link, useSearchParams } from 'react-router';
import { clustersApi } from '../lib/api';
import type { SearchResult } from '../lib/catalogueQueries';
import { categoryLabel } from './CatalogueCategoriesPage';
import { Button } from '../components/ui/button';
import { Pagination } from '../components/common/Pagination';
import { AdSlot } from '../components/ads/AdSlot';
import { PriceOrDash } from '../components/common/PriceOrDash';
import { ClusterCard, ClusterGridSkeleton } from '../features/clusters/components/ClusterCard';
import { SortSelect } from '../features/search/components/ListingFiltersPanel';
import { readFilters, writeFilters } from '../lib/listing';
import { Package, Search as SearchIcon } from 'lucide-react';

/** Hits considered per query (catalogueQueries.search). */
const SEARCH_LIMIT = 480;

/**
 * Search across the whole catalogue, rendered as the same cards as every
 * other listing (it used to be a plain text list).
 *
 * Results can be narrowed to one category and sorted; 48 per page. A hit deep
 * in the two largest categories has no listing row loaded, so it renders as a
 * compact row after the cards rather than as a card without a photo.
 */
export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const slug = searchParams.get('slug') ?? undefined;
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const page = Math.max(0, (Number(searchParams.get('page') ?? '1') || 1) - 1);

  const [res, setRes] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  // One page per request, scoped and filtered where the data is.
  useEffect(() => {
    let cancelled = false;
    if (!query.trim()) {
      setRes(null);
      return;
    }
    setLoading(true);
    clustersApi
      .search(query, { slug, filters, page })
      .then((r) => {
        if (!cancelled) setRes(r);
      })
      .catch(() => {
        if (!cancelled) setRes(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, slug, filters, page]);

  const count = res?.count ?? 0;
  const categories = res?.categories ?? [];
  const visible = res?.results ?? [];
  const plain = res?.plain ?? [];
  const pages = res?.pages ?? 1;
  const safePage = res?.page ?? 0;
  const lastPage = safePage === pages - 1;

  const setParams = (next: { slug?: string | null; page?: number; sort?: typeof filters.sort }) => {
    const out: Record<string, string> = {
      q: query,
      ...writeFilters({ ...filters, sort: next.sort ?? filters.sort }, next.page ?? 0),
    };
    const s = next.slug === undefined ? slug : next.slug;
    if (s) out.slug = s;
    setSearchParams(out);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="bg-background min-h-screen">
      <Seo title={query ? `Results for “${query}”` : 'Search'} noindex />
      <div className="page-container py-8">
        <h1 className="page-title">{query ? <>Results for “{query}”</> : 'Search'}</h1>

        {!query.trim() ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Search any product to compare prices across Kenyan shops.
          </p>
        ) : loading ? (
          <div className="mt-6">
            <ClusterGridSkeleton />
          </div>
        ) : count === 0 ? (
          <div className="py-16 text-center">
            <SearchIcon className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
            <p className="text-sm text-muted-foreground mb-3">Nothing matches “{query}”. Try fewer words.</p>
            <Button asChild variant="outline">
              <Link to="/browse">Browse all categories</Link>
            </Button>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              {count.toLocaleString()} {count === 1 ? 'product' : 'products'}
              {count > SEARCH_LIMIT && ` · showing the ${SEARCH_LIMIT.toLocaleString()} closest matches`}
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
                <CategoryChip active={!slug} onClick={() => setParams({ slug: null })}>
                  All
                </CategoryChip>
                {categories.map(([c, n]) => (
                  <CategoryChip key={c} active={slug === c} onClick={() => setParams({ slug: c })}>
                    {categoryLabel(c)} <span className="opacity-60">{n}</span>
                  </CategoryChip>
                ))}
              </div>
              <SortSelect value={filters.sort} onChange={(sort) => setParams({ sort })} />
            </div>

            <AdSlot placement="search-top" className="mt-6" />

            {visible.length > 0 && (
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
                {visible.map((c) => (
                  <ClusterCard key={c.cluster_id} cluster={c} />
                ))}
              </div>
            )}

            {lastPage && plain.length > 0 && (
              <section className="mt-10">
                <h2 className="microcopy-label mb-2">More matches</h2>
                <ul className="divide-y divide-border rounded-md border border-border">
                  {plain.slice(0, 60).map((row) => (
                    <li key={row.id}>
                      <Link
                        to={`/prices/${encodeURIComponent(row.id)}`}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-alt"
                      >
                        <Package className="h-4 w-4 flex-shrink-0 text-muted-foreground/50" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground capitalize">{row.t}</span>
                          {row.c && <span className="text-xs text-muted-foreground">{categoryLabel(row.c)}</span>}
                        </span>
                        <PriceOrDash value={row.p} className="text-sm font-bold text-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <Pagination page={safePage} pages={pages} onChange={(p) => setParams({ page: p })} />
          </>
        )}
      </div>
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-8 rounded-full border px-3 text-xs font-medium transition-colors active:translate-y-px ${
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-foreground hover:border-muted-foreground'
      }`}
    >
      {children}
    </button>
  );
}

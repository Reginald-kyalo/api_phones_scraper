import { useEffect, useMemo, useState } from 'react';
import { Seo } from '../components/common/Seo';
import { Link, useSearchParams } from 'react-router';
import { clustersApi, type ClusterSummary } from '../lib/api';
import type { SearchRow } from '../lib/demoSource';
import { categoryLabel } from './CatalogueCategoriesPage';
import { Button } from '../components/ui/button';
import { Pagination } from '../components/common/Pagination';
import { AdSlot } from '../components/ads/AdSlot';
import { PriceOrDash } from '../components/common/PriceOrDash';
import { ClusterCard, ClusterGridSkeleton } from '../features/clusters/components/ClusterCard';
import { SortSelect } from '../features/search/components/ListingFiltersPanel';
import { applyFilters, PAGE_SIZE, readFilters, writeFilters } from '../lib/listing';
import { Package, Search as SearchIcon } from 'lucide-react';

type Result = { hit: SearchRow; row: ClusterSummary | null };

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

  const [results, setResults] = useState<Result[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!query.trim()) {
      setResults([]);
      setCount(0);
      return;
    }
    setLoading(true);
    clustersApi
      .searchSummaries(query, { limit: 480 })
      .then((res) => {
        if (cancelled) return;
        setResults(res.results);
        setCount(res.count);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  // Category chips come from the results themselves, biggest first.
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of results) {
      const c = r.hit.c ?? r.hit.id.split('::')[0];
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [results]);

  const scoped = useMemo(
    () => (slug ? results.filter((r) => (r.hit.c ?? r.hit.id.split('::')[0]) === slug) : results),
    [results, slug],
  );
  const cards = useMemo(
    () => applyFilters(scoped.flatMap((r) => (r.row ? [r.row] : [])), filters),
    [scoped, filters],
  );
  const plain = useMemo(() => scoped.filter((r) => !r.row).map((r) => r.hit), [scoped]);

  const pages = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const visible = cards.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
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
        ) : results.length === 0 ? (
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
              {count > results.length && ` · showing the ${results.length.toLocaleString()} closest matches`}
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

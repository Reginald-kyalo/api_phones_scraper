import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router';
import { Search, X, LayoutGrid, ChevronRight, Package } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { clustersApi, type ClusterSummary } from '../../../lib/api';
import { formatPrice, hasPrice, pricedShopCount, productName, shopLabel } from '../../../lib/format';
import { imageUsable } from '../../../lib/images';
import { readFilters } from '../../../lib/listing';
import { ImageWithFallback } from '../../../components/common/ImageWithFallback';
import { categoryLabel } from '../../../lib/categories';

interface SearchBarProps {
  className?: string;
  variant?: 'compact' | 'header' | 'hero';
  placeholder?: string;
  onSearch?: () => void;
}

/**
 * Suggestions are categories whose name matches what is typed, linking to a
 * real listing. (They were four hard-coded products linking to category slugs
 * that did not exist.) Product matches come from the search page itself:
 * the full index is several MB, too heavy to load on every keystroke.
 */
type Suggestion = { slug: string; label: string; count: number };

export default function SearchBar({
  className = '',
  variant = 'compact',
  placeholder = 'Search products...',
  onSearch,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [categories, setCategories] = useState<Suggestion[]>([]);
  const [products, setProducts] = useState<ClusterSummary[]>([]);

  // Product suggestions (benchmark §2.2): photo, name and "from KES X · N
  // shops", as idealo and PriceRunner show. Debounced, from three letters.
  useEffect(() => {
    const q = query.trim();
    if (!isFocused || q.length < 3) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      clustersApi
        .search(q, { filters: readFilters(new URLSearchParams()), limit: 5 })
        .then((r) => {
          if (!cancelled) setProducts(r.results.slice(0, 5));
        })
        .catch(() => {});
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, isFocused]);

  // The manifest is already cached by the time anyone types; fetch on focus.
  useEffect(() => {
    if (!isFocused || categories.length) return;
    clustersApi
      .getManifest()
      .then((m) =>
        setCategories(m.categories.map((c) => ({ slug: c.slug, label: categoryLabel(c.slug), count: c.count }))),
      )
      .catch(() => {});
  }, [isFocused, categories.length]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery('');
      setIsFocused(false);
      onSearch?.();
    }
  };

  const showDropdown = isFocused && query.length > 1;
  const filteredSuggestions = categories
    .filter((c) => c.label.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 4);

  const close = () => {
    setQuery('');
    setIsFocused(false);
    onSearch?.();
  };

  const renderDropdown = () => {
    if (!showDropdown) return null;
    return (
      <div className="absolute top-full mt-2 w-full bg-popover rounded-md shadow-raised ultra-border overflow-hidden z-50">
        {products.length > 0 && (
          <div className="py-2">
            <div className="px-4 py-2 microcopy-label">Products</div>
            {products.map((p) => {
              const shops = pricedShopCount(p);
              return (
                <Link
                  key={p.cluster_id}
                  to={`/prices/${encodeURIComponent(p.cluster_id)}`}
                  onClick={close}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-surface-alt transition-colors"
                >
                  <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-photo ultra-border">
                    <Package className="absolute h-4 w-4 text-muted-foreground/30" aria-hidden="true" />
                    {imageUsable(p.image) && (
                      <ImageWithFallback src={p.image} alt="" className="relative h-full w-full object-contain p-1" fallback={null} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{productName(p)}</p>
                    <p className="text-xs text-muted-foreground">
                      {hasPrice(p.best_price) && (
                        <>
                          {shops >= 2 ? 'from ' : ''}
                          <span className="price-num text-foreground">{formatPrice(p.best_price)}</span>
                          {' · '}
                        </>
                      )}
                      {shopLabel(Math.max(shops, 1))}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        {filteredSuggestions.length > 0 && (
          <div className={`py-2 ${products.length ? 'border-t border-border' : ''}`}>
            <div className="px-4 py-2 microcopy-label">Categories</div>
            {filteredSuggestions.map((s) => (
              <Link
                key={s.slug}
                to={`/browse/${s.slug}`}
                onClick={close}
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface-alt transition-colors group"
              >
                <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0 group-hover:bg-card ultra-border">
                  <LayoutGrid className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.count.toLocaleString()} products</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40" aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-foreground hover:bg-surface-alt ${
            products.length || filteredSuggestions.length ? 'border-t border-border' : ''
          }`}
        >
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Search all products for “{query.trim()}”
        </button>
      </div>
    );
  };

  // The header search is the centre of the top row (benchmark direction A): a
  // 6px-radius field with the teal button joined to its right edge, so it
  // reads as one control and not as PriceRunner's grey pill.
  if (variant === 'header') {
    return (
      <div ref={containerRef} className={`relative ${className}`}>
        <form onSubmit={handleSubmit} role="search" className="flex h-10">
          <div className="relative flex-1 min-w-0">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="search"
              name="q"
              autoComplete="off"
              aria-label="Search products"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              className="h-10 w-full rounded-l-md border border-r-0 border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </div>
          <button
            type="submit"
            className="h-10 rounded-r-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-teal-deep active:translate-y-px"
          >
            Search
          </button>
        </form>
        {renderDropdown()}
      </div>
    );
  }

  if (variant === 'hero') {
    return (
      <div ref={containerRef} className={`relative ${className}`}>
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="search"
              name="q"
              autoComplete="off"
              aria-label="Search products"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              className="w-full h-12 pl-12 pr-14 rounded-full bg-card text-foreground text-sm placeholder:text-muted-foreground outline-none ultra-border"
            />
            <button
              type="submit"
              aria-label="Search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-5 rounded-full bg-teal text-white flex items-center justify-center gap-1.5 hover:bg-teal-deep transition-colors text-sm font-medium"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>
        </form>
        {renderDropdown()}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            name="q"
            autoComplete="off"
            aria-label="Search products"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            className="pl-9 pr-8 h-9 bg-surface-alt text-sm rounded-lg ultra-border"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setIsFocused(true);
              }}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground hover:text-muted-foreground" />
            </button>
          )}
        </div>
      </form>
      {renderDropdown()}
    </div>
  );
}

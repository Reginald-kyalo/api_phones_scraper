import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { clustersApi, type ClusterSummary } from '../../../lib/api';
import { readFilters } from '../../../lib/listing';
import { formatPrice, productName } from '../../../lib/format';
import { categoryLabel } from '../../../lib/categories';
import { type LocalComparisonItem } from '../../../hooks/useLocalStorage';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Package, X, Search, RefreshCw } from 'lucide-react';

interface ComparisonAddPanelProps {
  open: boolean;
  onClose: () => void;
  onAdd: (product: ClusterSummary) => void;
  comparisonItems: LocalComparisonItem[];
}

const FOCUSABLE = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

/**
 * The "Add a product" side panel. A modal dialog that behaves like one
 * (design audit, A03): Escape closes it, Tab stays inside, and focus
 * returns to the button that opened it. A failed request says so and offers
 * a retry instead of looking like an empty category.
 */
export function ComparisonAddPanel({
  open,
  onClose,
  onAdd,
  comparisonItems,
}: ComparisonAddPanelProps) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ClusterSummary[]>([]);
  const [similar, setSimilar] = useState<ClusterSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const firstItem = comparisonItems[0] ?? null;
  const scopedProductType = firstItem?.productType ?? '';
  const scopeLabel = firstItem ? categoryLabel(firstItem.productType) : null;

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!scopedProductType || !open) return;
    let cancelled = false;
    setLoadingSimilar(true);
    setFailed(false);
    (async () => {
      try {
        const res = await clustersApi.getCategoryPage(scopedProductType, 48);
        if (!cancelled) {
          const ids = new Set(comparisonItems.map(c => c.product_id));
          setSimilar(res.results.filter(p => !ids.has(p.cluster_id)).slice(0, 30));
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoadingSimilar(false);
      }
    })();
    return () => { cancelled = true; };
  }, [scopedProductType, comparisonItems, open, attempt]);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    setFailed(false);
    try {
      // Listing rows, not one detail shard per hit (each shard is ~400 KB).
      const hits = await clustersApi.search(q.trim(), {
        slug: scopedProductType || undefined,
        filters: readFilters(new URLSearchParams()),
        limit: 20,
      });
      setSearchResults(hits.results);
    } catch {
      setSearchResults([]);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [scopedProductType]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch, attempt]);

  const existingIds = useMemo(
    () => new Set(comparisonItems.map(c => c.product_id)),
    [comparisonItems],
  );

  const searching = query.trim().length >= 2;
  const displayList = searching ? searchResults : similar;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-canvas-ink/30" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Add a product"
        className="fixed top-0 right-0 bottom-0 w-full max-w-[360px] z-50 bg-background border-l border-border shadow-overlay flex flex-col"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <span className="font-semibold text-sm flex-1">Add a product</span>
          <button onClick={onClose} aria-label="Close Add a product" className="p-1 rounded-md hover:bg-muted">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {scopeLabel && (
          <div className="px-4 py-2 bg-surface-alt border-b border-border">
            <p className="text-xs text-muted-foreground">
              Comparing <span className="font-medium text-foreground">{scopeLabel}</span>
            </p>
          </div>
        )}

        <div className="px-4 py-3">
          <div className="relative">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={scopeLabel ? `Search ${scopeLabel.toLowerCase()}` : 'Search products to compare'}
              aria-label={scopeLabel ? `Search ${scopeLabel}` : 'Search products to compare'}
              className="pr-10"
              autoFocus
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {!searching && similar.length > 0 && (
            <p className="mb-3 text-sm font-semibold">More in this category</p>
          )}

          {(loading || loadingSimilar) && displayList.length === 0 && !failed && (
            <p className="text-xs text-muted-foreground py-6 text-center" aria-live="polite">Loading products…</p>
          )}

          {failed && displayList.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground mb-3">We couldn’t load products. Try again.</p>
              <Button variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)} className="gap-2">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Try again
              </Button>
            </div>
          )}

          {!loading && displayList.map((p) => {
            const alreadyAdded = existingIds.has(p.cluster_id);
            return (
              <button
                key={p.cluster_id}
                onClick={() => { if (!alreadyAdded) onAdd(p); }}
                disabled={alreadyAdded}
                className={`w-full flex items-center gap-3 py-2.5 px-1 border-b border-border text-left transition-colors ${
                  alreadyAdded ? 'opacity-40 cursor-default' : 'hover:bg-surface-alt cursor-pointer'
                }`}
              >
                <div className="w-12 h-12 bg-surface-alt rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {p.image ? (
                    <img src={p.image} alt="" className="w-full h-full object-contain p-0.5" loading="lazy" />
                  ) : (
                    <Package className="h-5 w-5 text-muted-foreground/40" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium line-clamp-2 leading-snug">{productName(p)}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="price-num text-sm font-bold">
                    {formatPrice(p.best_price)}
                  </p>
                  {alreadyAdded && (
                    <span className="text-xs text-muted-foreground">Added</span>
                  )}
                </div>
              </button>
            );
          })}

          {!loading && !failed && searching && searchResults.length === 0 && (
            <div className="py-8 text-center">
              <Package className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                {scopeLabel
                  ? `No matching products in ${scopeLabel}. Add a product from ${scopeLabel}, or start a new comparison.`
                  : `No matching products for “${query.trim()}”.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

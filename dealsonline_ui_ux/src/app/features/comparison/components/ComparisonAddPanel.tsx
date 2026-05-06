import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { pricerunnerApi, type PRProduct } from '../../../lib/api';
import { type LocalComparisonItem } from '../../../hooks/useLocalStorage';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Package, X, ArrowLeft, Search } from 'lucide-react';

interface ComparisonAddPanelProps {
  open: boolean;
  onClose: () => void;
  onAdd: (product: PRProduct) => void;
  comparisonItems: LocalComparisonItem[];
}

export function ComparisonAddPanel({
  open,
  onClose,
  onAdd,
  comparisonItems,
}: ComparisonAddPanelProps) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PRProduct[]>([]);
  const [similar, setSimilar] = useState<PRProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const firstItem = comparisonItems[0] ?? null;
  const scopedProductType = firstItem?.productType ?? '';
  const scopedCategoryUrl = firstItem?.categoryUrl ?? '';

  useEffect(() => {
    if (!scopedProductType) return;
    let cancelled = false;
    setLoadingSimilar(true);
    (async () => {
      try {
        const res = await pricerunnerApi.getProducts(scopedProductType, {
          categoryUrl: scopedCategoryUrl || undefined,
          limit: 30,
        });
        if (!cancelled) {
          const ids = new Set(comparisonItems.map(c => c.product_id));
          setSimilar(res.products.filter(p => !ids.has(p.id)));
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingSimilar(false);
      }
    })();
    return () => { cancelled = true; };
  }, [scopedProductType, scopedCategoryUrl, comparisonItems]);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = scopedProductType
        ? await pricerunnerApi.getProducts(scopedProductType, {
            categoryUrl: scopedCategoryUrl || undefined,
            q: q.trim(),
            limit: 20,
          })
        : await pricerunnerApi.search(q, undefined, 1, 15);
      setSearchResults(res.products);
    } catch {
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, [scopedProductType, scopedCategoryUrl]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  const existingIds = useMemo(
    () => new Set(comparisonItems.map(c => c.product_id)),
    [comparisonItems],
  );

  const displayList = query.trim().length >= 2 ? searchResults : similar;
  const showSimilarLabel = query.trim().length < 2 && similar.length > 0;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 w-[340px] z-50 bg-white border-l border-gray-200 shadow-2xl flex flex-col">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="font-semibold text-sm flex-1">Add product</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {firstItem && (
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
            <p className="text-xs text-muted-foreground">
              Showing products in <span className="font-medium text-foreground">{firstItem.categoryName}</span>
            </p>
          </div>
        )}

        <div className="px-4 py-3">
          <div className="relative">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={firstItem ? `Search in ${firstItem.categoryName}` : 'Search products'}
              className="pr-10"
              autoFocus
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {showSimilarLabel && (
            <div className="mb-3">
              <p className="text-sm font-semibold">Similar products</p>
              <p className="text-xs text-muted-foreground">Click to add to the comparison</p>
            </div>
          )}

          {(loading || loadingSimilar) && displayList.length === 0 && (
            <p className="text-xs text-muted-foreground py-6 text-center">Loading...</p>
          )}

          {!loading && displayList.map((p) => {
            const alreadyAdded = existingIds.has(p.id);
            return (
              <button
                key={p.id}
                onClick={() => { if (!alreadyAdded) onAdd(p); }}
                disabled={alreadyAdded}
                className={`w-full flex items-center gap-3 py-2.5 px-1 border-b border-gray-50 text-left transition-colors ${
                  alreadyAdded ? 'opacity-40 cursor-default' : 'hover:bg-gray-50 cursor-pointer'
                }`}
              >
                <div className="w-12 h-12 bg-gray-50 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                  {p.image ? (
                    <img src={p.image} alt="" className="w-full h-full object-contain p-0.5" loading="lazy" />
                  ) : (
                    <Package className="h-5 w-5 text-gray-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium line-clamp-2 leading-snug">{p.name}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-bold">
                    {p.price > 0 ? `£${p.price.toFixed(2)}` : 'N/A'}
                  </p>
                  {alreadyAdded && (
                    <span className="text-xs text-muted-foreground">Added</span>
                  )}
                </div>
              </button>
            );
          })}

          {!loading && query.length >= 2 && searchResults.length === 0 && (
            <div className="py-8 text-center">
              <Package className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-semibold mb-1">No products match your filters</p>
              {firstItem && (
                <p className="text-xs text-muted-foreground">
                  Search is scoped to {firstItem.categoryName}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

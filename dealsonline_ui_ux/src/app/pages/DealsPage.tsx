import { useState, useEffect, useMemo } from 'react';
import { productsApi, type Product } from '../lib/api';
import { PRProductCardGrid as ProductCard } from '../features/product/components/ProductCard';
import { Loader2, Tag, TrendingDown } from 'lucide-react';
import { Button } from '../components/ui/button';

const DISCOUNT_FILTERS = [
  { label: 'All deals', min: 0 },
  { label: '10%+', min: 10 },
  { label: '20%+', min: 20 },
  { label: '30%+', min: 30 },
  { label: '50%+', min: 50 },
] as const;

export default function DealsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [minDiscount, setMinDiscount] = useState(0);
  const [visibleCount, setVisibleCount] = useState(24);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await productsApi.getDeals(120);
        if (!cancelled) setProducts(res.products);
      } catch {
        // degrade gracefully
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(
    () => products.filter((p) => (p.discount ?? 0) >= minDiscount),
    [products, minDiscount],
  );

  const visible = filtered.slice(0, visibleCount);

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Tag className="w-5 h-5 text-destructive" />
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Today's best deals</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? 'product' : 'products'} with the biggest price differences across retailers
          </p>
        </div>

        {/* Savings banner */}
        {filtered.length > 0 && (() => {
          const totalSavings = filtered.reduce((sum, p) => {
            const prices = p.prices.filter((pr) => pr.inStock).map((pr) => pr.price);
            if (prices.length < 2) return sum;
            return sum + (Math.max(...prices) - Math.min(...prices));
          }, 0);
          return totalSavings > 0 ? (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mb-6">
              <TrendingDown className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <p className="text-sm text-emerald-800">
                Compare and save up to <span className="font-semibold">KES {totalSavings.toLocaleString()}</span> across all deals
              </p>
            </div>
          ) : null;
        })()}

        {/* Discount filter chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {DISCOUNT_FILTERS.map((f) => (
            <Button
              key={f.min}
              size="sm"
              variant={minDiscount === f.min ? 'default' : 'outline'}
              onClick={() => { setMinDiscount(f.min); setVisibleCount(24); }}
              className={`h-8 text-xs rounded-full ${
                minDiscount === f.min ? '' : 'hover:border-primary/40'
              }`}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* Product grid */}
        {visible.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {visible.map((p) => (
                <ProductCard
                  key={p.id}
                  product={{
                    id: p.id,
                    name: p.name,
                    description: '',
                    image: p.image,
                    price: p.prices[0]?.price ?? 0,
                    numStores: p.prices.length,
                    categoryName: p.category,
                    categoryUrl: '',
                    productUrl: '',
                    productType: '',
                  }}
                />
              ))}
            </div>
            {visibleCount < filtered.length && (
              <div className="mt-8 text-center">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount((c) => c + 24)}
                >
                  Show more deals
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <p>No deals found with {minDiscount}%+ discount</p>
            <Button variant="link" onClick={() => setMinDiscount(0)} className="mt-2">
              Show all deals
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

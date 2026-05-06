import { Link } from 'react-router';
import { pricerunnerApi, type PRProduct } from '../lib/api';
import HeroSection from '../components/layout/HeroSection';
import { Button } from '../components/ui/button';
import { useState, useEffect } from 'react';
import { Package, Store } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

// Compact product card for homepage carousels using PR data
function HomePRProductCard({ product }: { product: PRProduct }) {
  return (
    <Link
      to={`/product/${product.id}`}
      className="block min-w-[180px] max-w-[220px] flex-shrink-0 snap-start"
    >
      <Card className="group h-full hover:shadow-md transition-shadow border-border/50 cursor-pointer">
        <CardContent className="p-0">
          <div className="aspect-square bg-muted rounded-t-xl overflow-hidden">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <Package className="h-10 w-10" />
              </div>
            )}
          </div>
          <div className="p-3 space-y-1">
            <h4 className="font-medium text-xs text-foreground line-clamp-2 leading-snug min-h-[2.5em]">
              {product.name}
            </h4>
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-foreground">
                {product.price > 0 ? `£${product.price.toFixed(2)}` : 'Price N/A'}
              </span>
              {product.numStores > 0 && (
                <Badge variant="secondary" className="text-[10px] gap-0.5 px-1.5 py-0">
                  <Store className="h-2.5 w-2.5" />
                  {product.numStores}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// Module-level cache — survives unmount/remount within the same session
let _homeCache: { deals: PRProduct[]; trending: PRProduct[]; totalProducts: number } | null = null;

export default function HomePage() {
  const [deals, setDeals] = useState<PRProduct[]>(_homeCache?.deals ?? []);
  const [trending, setTrending] = useState<PRProduct[]>(_homeCache?.trending ?? []);
  const [loading, setLoading] = useState(!_homeCache);
  const [totalProducts, setTotalProducts] = useState(_homeCache?.totalProducts ?? 0);

  useEffect(() => {
    if (_homeCache) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await pricerunnerApi.getHomepageProducts(12);
        if (cancelled) return;
        _homeCache = res;
        setDeals(res.deals);
        setTrending(res.trending);
        setTotalProducts(res.totalProducts);
      } catch {
        // degrade gracefully
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="bg-white">
      {/* Hero */}
      <HeroSection productCount={totalProducts} storeCount={undefined} />

      {/* Content sections */}
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8">
        {/* Top deals carousel */}
        {deals.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Top deals</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Best prices today</p>
              </div>
              <Link to="/browse" className="text-sm font-medium text-primary hover:underline">
                See all →
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
              {deals.map((product) => (
                <HomePRProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* Trending products carousel */}
        {trending.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Popular right now</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Most compared products</p>
              </div>
              <Link to="/browse" className="text-sm font-medium text-primary hover:underline">
                Browse all →
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
              {trending.map((product) => (
                <HomePRProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border border-border rounded-lg overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-100" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Newsletter CTA */}
        <section className="bg-gray-50 rounded-lg p-8 md:p-10 text-center mb-4">
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Never miss a price drop
          </h2>
          <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
            Create a free account to set price alerts and track your favorite products
          </p>
          <Button size="default" className="h-10 px-6" asChild>
            <Link to="/auth">Create free account</Link>
          </Button>
        </section>
      </div>
    </div>
  );
}

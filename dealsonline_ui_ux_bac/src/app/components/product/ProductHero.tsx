import { Link, useNavigate } from 'react-router';
import { type PRProductDetail } from '../../lib/api';
import { Package, Store, Bell, GitCompareArrows, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import { useLocalComparison } from '../../hooks/useLocalStorage';

export function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  const full = Math.floor(rating);
  const partial = rating - full;
  const empty = 5 - full - (partial > 0 ? 1 : 0);
  
  const StarIcon = ({ style, className }: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <StarIcon key={`f${i}`} style={{ width: size, height: size }} className="fill-amber-400 text-amber-400" />
      ))}
      {partial > 0 && (
        <div className="relative" style={{ width: size, height: size }}>
          <StarIcon style={{ width: size, height: size }} className="text-gray-200" />
          <div className="absolute inset-0 overflow-hidden" style={{ width: `${partial * 100}%` }}>
            <StarIcon style={{ width: size, height: size }} className="fill-amber-400 text-amber-400" />
          </div>
        </div>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <StarIcon key={`e${i}`} style={{ width: size, height: size }} className="text-gray-200" />
      ))}
    </div>
  );
}

interface ProductHeroProps {
  product: PRProductDetail;
  ratingData: { total: number };
  onScrollToSection: (id: string) => void;
  onSetAlertOpen: (open: boolean) => void;
}

export function ProductHero({ product, ratingData, onScrollToSection, onSetAlertOpen }: ProductHeroProps) {
  const { isInComparison, addToComparison } = useLocalComparison();
  const navigate = useNavigate();

  return (
    <div className="grid md:grid-cols-[minmax(280px,400px)_1fr] gap-8 lg:gap-12">
      {/* Image */}
      <div className="bg-gray-50 rounded-xl flex items-center justify-center p-6 max-h-[380px] ultra-border">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="max-h-[320px] max-w-full object-contain mix-blend-multiply"
          />
        ) : (
          <Package className="h-20 w-20 text-gray-300" />
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col min-w-0">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground leading-tight mb-3">
          {product.name}
        </h1>

        {/* Rating row */}
        {product.rating != null && (
          <div className="flex items-center gap-2 mb-3">
            <StarRating rating={product.rating} size={18} />
            <span className="text-sm font-semibold text-foreground">{product.rating.toFixed(1)}</span>
            <button
              onClick={() => onScrollToSection('reviews')}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              ({ratingData.total} reviews)
            </button>
          </div>
        )}

        {product.description && (
          <p className="text-muted-foreground text-sm mb-4 leading-relaxed line-clamp-3">
            {product.description}
          </p>
        )}

        {/* Price highlight */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4 inline-flex flex-col ultra-border">
          <p className="microcopy-label mb-0.5">Best price</p>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold text-foreground">
              {product.price > 0 ? `£${product.price.toFixed(2)}` : 'Price N/A'}
            </span>
            {product.numStores > 0 && (
              <span className="text-sm text-muted-foreground mb-1">
                from {product.numStores} {product.numStores === 1 ? 'store' : 'stores'}
              </span>
            )}
          </div>
          <button
            onClick={() => onScrollToSection('price-history')}
            className="text-xs text-primary hover:underline mt-1 self-start"
          >
            View price history
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button size="lg" onClick={() => onScrollToSection('prices')} className="gap-2">
            <Store className="h-4 w-4" />
            Compare {product.numStores} stores
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="gap-2 ultra-border"
            onClick={() => onSetAlertOpen(true)}
          >
            <Bell className="h-4 w-4" />
            Price alert
          </Button>
          <Button
            variant={isInComparison(product.id) ? 'default' : 'outline'}
            size="lg"
            className={`gap-2 ${isInComparison(product.id) ? '' : 'ultra-border'}`}
            onClick={() => {
              addToComparison({
                id: product.id,
                name: product.name,
                image: product.image,
                price: product.price,
                numStores: product.numStores,
                categoryName: product.categoryName,
                categoryUrl: product.categoryUrl,
                rating: product.rating,
                productType: product.productType,
              });
              navigate('/compare');
            }}
          >
            <GitCompareArrows className="h-4 w-4" />
            Compare
          </Button>
          <Link
            to={`/browse/${product.productType}?cat=${encodeURIComponent(product.categoryUrl)}`}
          >
            <Button variant="outline" size="lg" className="gap-1 ultra-border">
              More in {product.categoryName}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

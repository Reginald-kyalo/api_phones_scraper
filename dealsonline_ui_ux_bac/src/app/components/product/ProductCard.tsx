import { Link } from 'react-router';
import { Heart, Star } from 'lucide-react';
import { type Product } from '../../lib/api';
import { useLocalFavorites } from '../../hooks/useLocalStorage';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'deal' | 'compact';
  onFavoriteChange?: () => void;
}

export default function ProductCard({
  product,
  variant = 'default',
  onFavoriteChange,
}: ProductCardProps) {
  const { isFavorite, toggleFavorite } = useLocalFavorites();
  const isFav = isFavorite(product.id);

  const inStockPrices = product.prices.filter((p) => p.inStock);
  const lowestPrice = inStockPrices.length > 0 ? Math.min(...inStockPrices.map((p) => p.price)) : 0;
  const highestPrice = inStockPrices.length > 0 ? Math.max(...inStockPrices.map((p) => p.price)) : 0;
  const retailerCount = product.prices.length;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(product);
    toast.success(isFav ? 'Removed from favorites' : 'Added to favorites');
    onFavoriteChange?.();
  };

  const isCompact = variant === 'compact';

  return (
    <Link to={`/product/${product.id}`} className="block group">
      <div className="bg-white border border-border rounded-lg overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 ease-out h-full flex flex-col">
        {/* Image container */}
        <div className={`relative bg-gray-50 ${isCompact ? 'aspect-square' : 'aspect-[4/3]'}`}>
          <ImageWithFallback
            src={product.image}
            alt={product.name}
            className="w-full h-full object-contain p-3 group-hover:scale-[1.03] transition-transform duration-200"
          />

          {/* Discount badge */}
          {product.discount && product.discount > 0 && (
            <Badge variant="discount" className="absolute top-2 left-2 text-[11px] px-1.5 py-0.5">
              -{product.discount}%
            </Badge>
          )}

          {/* Favorite button */}
          <button
            onClick={handleFavoriteClick}
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
          >
            <Heart
              className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
            />
          </button>

          {/* Brand watermark */}
          {product.brand && !isCompact && (
            <span className="absolute bottom-2 right-2 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
              {product.brand}
            </span>
          )}
        </div>

        {/* Content */}
        <div className={`flex flex-col flex-1 ${isCompact ? 'p-2' : 'p-3'}`}>
          {/* Product name */}
          <h3 className={`font-medium text-foreground leading-snug mb-1 ${isCompact ? 'text-xs line-clamp-1' : 'text-sm line-clamp-2'}`}>
            {product.name}
          </h3>

          {/* Rating */}
          {!isCompact && product.rating > 0 && (
            <div className="flex items-center gap-1 mb-1.5">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-xs font-medium text-foreground">{product.rating.toFixed(1)}</span>
              {product.reviewCount > 0 && (
                <span className="text-[11px] text-muted-foreground">({product.reviewCount})</span>
              )}
            </div>
          )}

          {/* Spacer to push price to bottom */}
          <div className="mt-auto" />

          {/* Price */}
          <div>
            <span className="price-text">
              KES {lowestPrice.toLocaleString()}
            </span>
            {highestPrice > lowestPrice && !isCompact && (
              <span className="price-old ml-1.5">
                KES {highestPrice.toLocaleString()}
              </span>
            )}
          </div>

          {/* Installment text */}
          {!isCompact && lowestPrice > 0 && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Or 3 payments of KES {Math.ceil(lowestPrice / 3).toLocaleString()}/mo
            </p>
          )}

          {/* Retailer count */}
          {!isCompact && (
            <p className="text-[11px] text-muted-foreground mt-1">
              {retailerCount} {retailerCount === 1 ? 'store' : 'stores'}
            </p>
          )}

          {/* Deal CTA */}
          {variant === 'deal' && (
            <div className="mt-2 pt-2 border-t border-border">
              <span className="inline-block text-xs font-semibold text-link bg-[var(--surface-alt)] px-2 py-1 rounded-md group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
                Compare prices →
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
import { useState } from 'react';
import { Link } from 'react-router';
import { Heart, Star } from 'lucide-react';
import { Product, getLowestPrice, getRetailerCount } from '../data/mockData';
import { toggleFavorite, isFavorite, isAuthenticated } from '../utils/localStorage';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface DailyDealCardProps {
  product: Product;
  onFavoriteChange?: () => void;
}

/**
 * Compact product card for Daily Deals carousel
 * Smaller than standard ProductCard to fit more items and reduce vertical space
 * Card size: ~140px width, aspect-square image
 */
export default function DailyDealCard({ product, onFavoriteChange }: DailyDealCardProps) {
  const [isFav, setIsFav] = useState(isFavorite(product.id));
  const lowestPrice = getLowestPrice(product);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated()) {
      toast.error('Please login to add favorites');
      return;
    }

    const newState = toggleFavorite(product.id);
    setIsFav(newState);
    
    if (newState) {
      toast.success('Added to favorites');
    } else {
      toast.success('Removed from favorites');
    }

    onFavoriteChange?.();
  };

  return (
    <Link to={`/product/${product.id}`}>
      <div className="group bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-all duration-150 hover:-translate-y-0.5">
        {/* Image Container - Reduced padding for more compact look */}
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          <ImageWithFallback
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
          />
          
          {/* Discount Badge */}
          {product.discount && (
            <Badge className="absolute top-1 left-1 bg-orange-600 hover:bg-orange-700 text-xs px-1.5 py-0.5">
              {product.discount}%
            </Badge>
          )}

          {/* Favorite Button */}
          <button
            onClick={handleFavoriteClick}
            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center hover:scale-110 transition-transform"
          >
            <Heart
              className={`w-3 h-3 ${isFav ? 'fill-orange-600 text-orange-600' : 'text-gray-400'}`}
            />
          </button>
        </div>

        {/* Content - Reduced padding for compact layout */}
        <div className="p-2">
          {/* Brand - Hidden on daily deals to save space */}
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5 hidden">
            {product.brand}
          </p>

          {/* Product Name - Single line with clamp */}
          <h3 className="text-xs font-medium text-gray-900 mb-1 line-clamp-1">
            {product.name}
          </h3>

          {/* Rating - Smaller font */}
          <div className="flex items-center gap-0.5 mb-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-medium text-gray-900">{product.rating}</span>
          </div>

          {/* Price */}
          <div className="flex items-end justify-between">
            <p className="text-sm font-semibold text-gray-900">
              ${lowestPrice.toFixed(0)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

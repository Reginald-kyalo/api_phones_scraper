import { useState } from 'react';
import { Link } from 'react-router';
import { Heart, Star } from 'lucide-react';
import { Product, getLowestPrice, getRetailerCount } from '../data/mockData';
import { toggleFavorite, isFavorite, isAuthenticated } from '../utils/localStorage';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface ProductCardProps {
  product: Product;
  onFavoriteChange?: () => void;
}

export default function ProductCard({ product, onFavoriteChange }: ProductCardProps) {
  const [isFav, setIsFav] = useState(isFavorite(product.id));
  const lowestPrice = getLowestPrice(product);
  const retailerCount = getRetailerCount(product);

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
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-gray-50">
          <ImageWithFallback
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
          />
          
          {/* Discount Badge */}
          {product.discount && (
            <Badge className="absolute top-2 left-2 bg-orange-600 hover:bg-orange-700 text-xs px-2 py-0.5">
              {product.discount}% OFF
            </Badge>
          )}

          {/* Favorite Button */}
          <button
            onClick={handleFavoriteClick}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center hover:scale-110 transition-transform"
          >
            <Heart
              className={`w-4 h-4 ${isFav ? 'fill-orange-600 text-orange-600' : 'text-gray-400'}`}
            />
          </button>
        </div>

        {/* Content */}
        <div className="p-3">
          {/* Brand */}
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            {product.brand}
          </p>

          {/* Product Name */}
          <h3 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2 min-h-[2.5rem]">
            {product.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1 mb-2">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-medium text-gray-900">{product.rating}</span>
            <span className="text-xs text-gray-500">({product.reviewCount})</span>
          </div>

          {/* Price & Retailer Count */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-lg font-semibold text-gray-900">
                ${lowestPrice.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">
                {retailerCount} {retailerCount === 1 ? 'retailer' : 'retailers'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
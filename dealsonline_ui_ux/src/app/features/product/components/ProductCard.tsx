import { Link, useNavigate } from 'react-router';
import { type PRProduct } from '../../../lib/api';
import { Card, CardContent } from '../../../components/ui/card';
import { Package, Store, GitCompareArrows, Heart } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { useLocalComparison, useLocalFavorites } from '../../../hooks/useLocalStorage';

export function PRProductCard({ product }: { product: PRProduct }) {
  const { addToComparison } = useLocalComparison();
  const { isFavorite, toggleFavorite } = useLocalFavorites();
  const nav = useNavigate();
  const isFav = isFavorite(product.id);
  
  return (
    <div className="relative group">
      <Link to={`/product/${product.id}`} className="block">
        <Card className="transition-all hover:bg-surface-alt ultra-border">
          <CardContent className="p-0 flex flex-col sm:flex-row">
            {/* Image */}
            <div className="relative w-full sm:w-44 flex-shrink-0 bg-white rounded-t-xl sm:rounded-l-xl sm:rounded-tr-none overflow-hidden border-b sm:border-b-0 sm:border-r border-border">
              <div className="aspect-square sm:aspect-auto sm:h-44 flex items-center justify-center p-4">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <Package className="h-12 w-12 text-gray-300" />
                )}
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleFavorite({
                    id: product.id,
                    name: product.name,
                    brand: product.name.split(' ')[0],
                    category: product.categoryName,
                    image: product.image ?? '',
                    prices: [],
                    rating: 0,
                    reviewCount: 0,
                    specifications: {},
                    images: [],
                    priceHistory: [],
                    reviews: [],
                  } as any);
                }}
                className={`absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ultra-border z-10 ${
                  isFav ? 'bg-red-50 text-red-500 border-red-100' : 'bg-white/90 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100'
                }`}
              >
                <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
              </button>
            </div>
            {/* Details */}
            <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
              <div>
                <p className="microcopy-label mb-1 truncate">
                  {product.categoryName}
                </p>
                <h4 className="font-semibold text-foreground text-sm sm:text-base line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                  {product.name}
                </h4>
                {product.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {product.description}
                  </p>
                )}
              </div>
              <div className="flex items-end justify-between mt-3">
                <div>
                  <span className="text-lg font-bold text-foreground">
                    {product.price > 0
                      ? `£${product.price.toFixed(2)}`
                      : 'Price N/A'}
                  </span>
                </div>
                {product.numStores > 0 && (
                  <Badge variant="secondary" className="text-xs gap-1 ultra-border">
                    <Store className="h-3 w-3" />
                    {product.numStores} {product.numStores === 1 ? 'store' : 'stores'}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          addToComparison({
            id: product.id,
            name: product.name,
            image: product.image,
            price: product.price,
            numStores: product.numStores,
            categoryName: product.categoryName,
            categoryUrl: product.categoryUrl,
            productType: product.productType,
          });
          nav('/compare');
        }}
        className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 text-muted-foreground ultra-border opacity-0 group-hover:opacity-100 transition-all z-10"
        title="Compare"
      >
        <GitCompareArrows className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function PRProductCardGrid({ product }: { product: PRProduct }) {
  const { addToComparison } = useLocalComparison();
  const { isFavorite, toggleFavorite } = useLocalFavorites();
  const nav = useNavigate();
  const isFav = isFavorite(product.id);

  return (
    <div className="relative h-full group">
      <Link to={`/product/${product.id}`} className="block h-full">
        <Card className="h-full transition-all hover:bg-surface-alt ultra-border">
          <CardContent className="p-0">
            <div className="relative aspect-square bg-white border-b border-border rounded-t-xl overflow-hidden">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-contain p-4 mix-blend-multiply transition-transform group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-12 w-12 text-gray-300" />
                </div>
              )}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleFavorite({
                    id: product.id,
                    name: product.name,
                    brand: product.name.split(' ')[0],
                    category: product.categoryName,
                    image: product.image ?? '',
                    prices: [],
                    rating: 0,
                    reviewCount: 0,
                    specifications: {},
                    images: [],
                    priceHistory: [],
                    reviews: [],
                  } as any);
                }}
                className={`absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ultra-border z-10 ${
                  isFav ? 'bg-red-50 text-red-500 border-red-100' : 'bg-white/90 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100'
                }`}
              >
                <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
              </button>
            </div>
            <div className="p-3 space-y-1.5">
              <p className="microcopy-label truncate">
                {product.categoryName}
              </p>
              <h4 className="font-medium text-sm text-foreground line-clamp-2 leading-snug min-h-[2.5em] group-hover:text-primary transition-colors">
                {product.name}
              </h4>
              <div className="flex items-center justify-between pt-1">
                <span className="font-bold text-base text-foreground">
                  {product.price > 0
                    ? `£${product.price.toFixed(2)}`
                    : 'Price N/A'}
                </span>
                {product.numStores > 0 && (
                  <Badge variant="secondary" className="text-xs gap-1 ultra-border">
                    <Store className="h-3 w-3" />
                    {product.numStores}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          addToComparison({
            id: product.id,
            name: product.name,
            image: product.image,
            price: product.price,
            numStores: product.numStores,
            categoryName: product.categoryName,
            categoryUrl: product.categoryUrl,
            productType: product.productType,
          });
          nav('/compare');
        }}
        className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 text-muted-foreground ultra-border opacity-0 group-hover:opacity-100 transition-all z-10"
        title="Compare"
      >
        <GitCompareArrows className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Heart } from 'lucide-react';
import { getFavorites, isAuthenticated } from '../utils/localStorage';
import { products } from '../data/mockData';
import ProductCard from '../components/ProductCard';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

type SortOption = 'recent' | 'price-asc' | 'price-desc' | 'rating-desc';

export default function FavoritesPage() {
  const navigate = useNavigate();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/auth');
      return;
    }
    setFavoriteIds(getFavorites());
  }, [navigate]);

  const favoriteProducts = products.filter((p) => favoriteIds.includes(p.id));

  // Sort products
  const sortedProducts = [...favoriteProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-asc':
        const priceA = Math.min(...a.prices.filter((p) => p.inStock).map((p) => p.price));
        const priceB = Math.min(...b.prices.filter((p) => p.inStock).map((p) => p.price));
        return priceA - priceB;
      case 'price-desc':
        const priceA2 = Math.min(...a.prices.filter((p) => p.inStock).map((p) => p.price));
        const priceB2 = Math.min(...b.prices.filter((p) => p.inStock).map((p) => p.price));
        return priceB2 - priceA2;
      case 'rating-desc':
        return b.rating - a.rating;
      case 'recent':
      default:
        return 0;
    }
  });

  const handleFavoriteChange = () => {
    setFavoriteIds(getFavorites());
  };

  if (!isAuthenticated()) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2 text-gray-900">My Favorites</h1>
        <p className="text-sm text-gray-600">
          {favoriteProducts.length} {favoriteProducts.length === 1 ? 'item' : 'items'} saved
        </p>
      </div>

      {favoriteProducts.length > 0 ? (
        <>
          {/* Sort Controls */}
          <div className="flex items-center justify-between mb-6">
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="w-48 h-10 text-sm">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recently Added</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="rating-desc">Highest Rated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sortedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onFavoriteChange={handleFavoriteChange}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No favorites yet</h2>
          <p className="text-sm text-gray-600 mb-6">
            Start adding products to your favorites to keep track of items you love
          </p>
          <Button className="bg-orange-600 hover:bg-orange-700 h-11" asChild>
            <Link to="/">Browse Products</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
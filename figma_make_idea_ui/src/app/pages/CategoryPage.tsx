import { useState, useMemo } from 'react';
import { useParams } from 'react-router';
import { SlidersHorizontal } from 'lucide-react';
import { getProductsByCategory, categories, Product, retailers } from '../data/mockData';
import ProductCard from '../components/ProductCard';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { Slider } from '../components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';

type SortOption = 'price-asc' | 'price-desc' | 'discount-desc' | 'rating-desc' | 'newest';

export default function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const category = categories.find((c) => c.id === categoryId);
  const allProducts = getProductsByCategory(categoryId || '');

  const [priceRange, setPriceRange] = useState([0, 5000]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedRetailers, setSelectedRetailers] = useState<string[]>([]);
  const [minDiscount, setMinDiscount] = useState<number>(0);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<SortOption>('discount-desc');

  // Extract unique brands
  const brands = useMemo(() => {
    return Array.from(new Set(allProducts.map((p) => p.brand))).sort();
  }, [allProducts]);

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = allProducts.filter((product) => {
      const lowestPrice = Math.min(...product.prices.filter((p) => p.inStock).map((p) => p.price));
      
      // Price range
      if (lowestPrice < priceRange[0] || lowestPrice > priceRange[1]) return false;
      
      // Brand
      if (selectedBrands.length > 0 && !selectedBrands.includes(product.brand)) return false;
      
      // Retailers
      if (selectedRetailers.length > 0) {
        const hasRetailer = product.prices.some((p) => selectedRetailers.includes(p.retailerId));
        if (!hasRetailer) return false;
      }
      
      // Discount
      if ((product.discount || 0) < minDiscount) return false;
      
      // Rating
      if (product.rating < minRating) return false;
      
      return true;
    });

    // Sort products
    switch (sortBy) {
      case 'price-asc':
        filtered.sort((a, b) => {
          const priceA = Math.min(...a.prices.filter((p) => p.inStock).map((p) => p.price));
          const priceB = Math.min(...b.prices.filter((p) => p.inStock).map((p) => p.price));
          return priceA - priceB;
        });
        break;
      case 'price-desc':
        filtered.sort((a, b) => {
          const priceA = Math.min(...a.prices.filter((p) => p.inStock).map((p) => p.price));
          const priceB = Math.min(...b.prices.filter((p) => p.inStock).map((p) => p.price));
          return priceB - priceA;
        });
        break;
      case 'discount-desc':
        filtered.sort((a, b) => (b.discount || 0) - (a.discount || 0));
        break;
      case 'rating-desc':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        // Keep original order for newest
        break;
    }

    return filtered;
  }, [allProducts, priceRange, selectedBrands, selectedRetailers, minDiscount, minRating, sortBy]);

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const toggleRetailer = (retailerId: string) => {
    setSelectedRetailers((prev) =>
      prev.includes(retailerId) ? prev.filter((r) => r !== retailerId) : [...prev, retailerId]
    );
  };

  const resetFilters = () => {
    setPriceRange([0, 5000]);
    setSelectedBrands([]);
    setSelectedRetailers([]);
    setMinDiscount(0);
    setMinRating(0);
  };

  const FiltersContent = () => (
    <div className="space-y-6">
      {/* Price Range */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Price Range</Label>
        <div className="px-2">
          <Slider
            value={priceRange}
            onValueChange={setPriceRange}
            min={0}
            max={5000}
            step={50}
            className="mb-4"
          />
          <div className="flex justify-between text-xs text-gray-600">
            <span>${priceRange[0]}</span>
            <span>${priceRange[1]}</span>
          </div>
        </div>
      </div>

      {/* Brands */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Brand</Label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {brands.map((brand) => (
            <div key={brand} className="flex items-center space-x-2">
              <Checkbox
                id={`brand-${brand}`}
                checked={selectedBrands.includes(brand)}
                onCheckedChange={() => toggleBrand(brand)}
              />
              <label
                htmlFor={`brand-${brand}`}
                className="text-sm cursor-pointer"
              >
                {brand}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Retailers */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Retailer</Label>
        <div className="space-y-2">
          {retailers.slice(0, 6).map((retailer) => (
            <div key={retailer.id} className="flex items-center space-x-2">
              <Checkbox
                id={`retailer-${retailer.id}`}
                checked={selectedRetailers.includes(retailer.id)}
                onCheckedChange={() => toggleRetailer(retailer.id)}
              />
              <label
                htmlFor={`retailer-${retailer.id}`}
                className="text-sm cursor-pointer"
              >
                {retailer.name}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Discount */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Minimum Discount</Label>
        <div className="space-y-2">
          {[0, 10, 20, 30].map((discount) => (
            <div key={discount} className="flex items-center space-x-2">
              <Checkbox
                id={`discount-${discount}`}
                checked={minDiscount === discount}
                onCheckedChange={() => setMinDiscount(discount)}
              />
              <label
                htmlFor={`discount-${discount}`}
                className="text-sm cursor-pointer"
              >
                {discount === 0 ? 'Any discount' : `${discount}%+ off`}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Minimum Rating</Label>
        <div className="space-y-2">
          {[0, 4, 4.5].map((rating) => (
            <div key={rating} className="flex items-center space-x-2">
              <Checkbox
                id={`rating-${rating}`}
                checked={minRating === rating}
                onCheckedChange={() => setMinRating(rating)}
              />
              <label
                htmlFor={`rating-${rating}`}
                className="text-sm cursor-pointer"
              >
                {rating === 0 ? 'Any rating' : `${rating}+ stars`}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <Button onClick={resetFilters} variant="outline" className="flex-1 h-10 text-sm">
          Reset
        </Button>
      </div>
    </div>
  );

  if (!category) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Category not found</h1>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">{category.emoji}</span>
          <h1 className="text-3xl font-semibold text-gray-900">{category.name}</h1>
        </div>
        <p className="text-sm text-gray-600">{category.dealCount} products available</p>
      </div>

      <div className="flex gap-8">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="bg-white border border-gray-200 rounded-lg p-4 sticky top-24">
            <h2 className="text-base font-semibold mb-6">Filters</h2>
            <FiltersContent />
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          {/* Sort & Mobile Filters */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-48 h-10 text-sm">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discount-desc">Highest Discount</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  <SelectItem value="rating-desc">Highest Rated</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                </SelectContent>
              </Select>

              {/* Mobile Filter Button */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden h-10 text-sm">
                    <SlidersHorizontal className="w-4 h-4 mr-2" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 overflow-y-auto">
                  <h2 className="text-lg font-semibold mb-6">Filters</h2>
                  <FiltersContent />
                </SheetContent>
              </Sheet>
            </div>

            <p className="text-sm text-gray-600">
              {filteredProducts.length} products
            </p>
          </div>

          {/* Products Grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-base text-gray-600 mb-4">No products match your filters</p>
              <Button onClick={resetFilters} variant="outline" className="h-10">
                Reset Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
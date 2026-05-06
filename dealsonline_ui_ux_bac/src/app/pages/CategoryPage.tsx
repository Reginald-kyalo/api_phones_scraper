import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { SlidersHorizontal, Loader2 } from 'lucide-react';
import { productsApi, type Product, type Category } from '../lib/api';
import ProductCard from '../components/product/ProductCard';
import FilterSidebar from '../components/filters/FilterSidebar';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../components/ui/breadcrumb';
import { Badge } from '../components/ui/badge';

type SortOption = 'price-asc' | 'price-desc' | 'discount-desc' | 'rating-desc' | 'newest';

const PRODUCTS_PER_PAGE = 24;

export default function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [brandCounts, setBrandCounts] = useState<Record<string, number>>({});
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  const [priceRange, setPriceRange] = useState([0, 500000]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedRetailers, setSelectedRetailers] = useState<string[]>([]);
  const [minDiscount, setMinDiscount] = useState<number>(0);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<SortOption>('discount-desc');
  const [visibleCount, setVisibleCount] = useState(PRODUCTS_PER_PAGE);

  useEffect(() => {
    if (!categoryId) return;
    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const [catRes, prodRes] = await Promise.all([
          productsApi.getCategories(),
          productsApi.getByCategory(categoryId!, { limit: 200 }),
        ]);
        if (cancelled) return;
        const cat = catRes.categories.find((c) => c.id === categoryId) || null;
        setCategory(cat);
        setAllProducts(prodRes.products);
        setBrands(prodRes.brands || []);
        if (prodRes.brandCounts) setBrandCounts(prodRes.brandCounts);
      } catch {
        // leave empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [categoryId]);

  // Derive unique retailers from loaded products
  const retailers = useMemo(() => {
    const set = new Map<string, string>();
    allProducts.forEach((p) =>
      p.prices.forEach((pr) => set.set(pr.retailerId, pr.retailerName)),
    );
    return Array.from(set, ([id, name]) => ({ id, name }));
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

  // Reset pagination when filters/sort change
  useEffect(() => {
    setVisibleCount(PRODUCTS_PER_PAGE);
  }, [priceRange, selectedBrands, selectedRetailers, minDiscount, minRating, sortBy]);

  const paginatedProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

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
    setPriceRange([0, 500000]);
    setSelectedBrands([]);
    setSelectedRetailers([]);
    setMinDiscount(0);
    setMinRating(0);
  };

  const filterProps = {
    filters: {
      priceRange: priceRange as [number, number],
      selectedBrands,
      selectedRetailers,
      minDiscount,
      minRating,
    },
    brands,
    retailers,
    onPriceRangeChange: setPriceRange as (r: [number, number]) => void,
    onToggleBrand: toggleBrand,
    onToggleRetailer: toggleRetailer,
    onMinDiscountChange: setMinDiscount,
    onMinRatingChange: setMinRating,
    onReset: resetFilters,
    brandCounts,
  };

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-16 text-center">
        <h1 className="text-lg font-semibold text-foreground">Category not found</h1>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/" className="text-xs">Start</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-xs capitalize">{category.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{category.name}</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {allProducts.length} {allProducts.length === 1 ? 'product' : 'products'}
        </p>
      </div>

      <div className="flex gap-6 lg:gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-60 flex-shrink-0">
          <div className="bg-white border border-border rounded-lg p-4 sticky top-[65px]">
            <h2 className="text-sm font-semibold text-foreground mb-4">Filters</h2>
            <FilterSidebar {...filterProps} />
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                <SelectTrigger className="w-44 h-9 text-xs">
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

              {/* Mobile filters */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden gap-1.5 text-xs">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 overflow-y-auto">
                  <h2 className="text-sm font-semibold mb-5">Filters</h2>
                  <FilterSidebar {...filterProps} />
                </SheetContent>
              </Sheet>

              {/* Active filter badges */}
              {selectedBrands.length > 0 && selectedBrands.map((b) => (
                <Badge key={b} variant="outline" className="text-[10px] gap-1 cursor-pointer" onClick={() => toggleBrand(b)}>
                  {b} ×
                </Badge>
              ))}
            </div>

            <p className="text-xs text-muted-foreground hidden sm:block">
              {filteredProducts.length} products
            </p>
          </div>

          {/* Grid */}
          {filteredProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {paginatedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Show more */}
              {hasMore && (
                <div className="flex flex-col items-center gap-2 mt-8">
                  <p className="text-xs text-muted-foreground">
                    Showing {paginatedProducts.length} of {filteredProducts.length} products
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVisibleCount((prev) => prev + PRODUCTS_PER_PAGE)}
                  >
                    Show more
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-sm text-muted-foreground mb-4">No products match your filters</p>
              <Button onClick={resetFilters} variant="outline" size="sm">
                Reset Filters
              </Button>
            </div>
          )}
          {/* Bottom popular searches */}
          {filteredProducts.length > 0 && (
            <div className="mt-10 pt-6 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3">Popular in {category.name}</h3>
              <div className="flex flex-wrap gap-2">
                {brands.slice(0, 8).map((brand) => (
                  <Link key={brand} to={`/search?q=${encodeURIComponent(brand)}`}>
                    <Badge variant="outline" className="text-xs cursor-pointer hover:bg-gray-50">
                      {brand}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router';
import { Search, SlidersHorizontal } from 'lucide-react';
import { productsApi, type Product } from '../lib/api';
import ProductCard from '../components/product/ProductCard';
import ProductCardSkeleton from '../components/product/ProductCardSkeleton';
import FilterSidebar from '../components/filters/FilterSidebar';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import { Slider } from '../components/ui/slider';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../components/ui/breadcrumb';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '../components/ui/sheet';

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');

  // Filter state
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedRetailers, setSelectedRetailers] = useState<string[]>([]);
  const [minDiscount, setMinDiscount] = useState(0);
  const [minRating, setMinRating] = useState(0);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    productsApi.search(query).then((res) => {
      if (!cancelled) setSearchResults(res.products);
    }).catch(() => {
      if (!cancelled) setSearchResults([]);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [query]);

  // Reset filters when query changes
  useEffect(() => {
    setPriceRange([0, 500000]);
    setSelectedBrands([]);
    setSelectedRetailers([]);
    setMinDiscount(0);
    setMinRating(0);
  }, [query]);

  // Derive brands and retailers from results
  const brands = useMemo(() => {
    const set = new Set<string>();
    searchResults.forEach((p) => { if (p.brand) set.add(p.brand); });
    return Array.from(set).sort();
  }, [searchResults]);

  const retailers = useMemo(() => {
    const map = new Map<string, string>();
    searchResults.forEach((p) =>
      p.prices.forEach((pr) => map.set(pr.retailerId, pr.retailerName)),
    );
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [searchResults]);

  // Filter + sort
  const filteredResults = useMemo(() => {
    let filtered = searchResults.filter((product) => {
      const lowestPrice = Math.min(...product.prices.filter((p) => p.inStock).map((p) => p.price));
      if (lowestPrice < priceRange[0] || lowestPrice > priceRange[1]) return false;
      if (selectedBrands.length > 0 && !selectedBrands.includes(product.brand)) return false;
      if (selectedRetailers.length > 0) {
        if (!product.prices.some((p) => selectedRetailers.includes(p.retailerId))) return false;
      }
      if ((product.discount || 0) < minDiscount) return false;
      if (product.rating < minRating) return false;
      return true;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      const aLowest = Math.min(...a.prices.filter(p => p.inStock).map(p => p.price), Infinity);
      const bLowest = Math.min(...b.prices.filter(p => p.inStock).map(p => p.price), Infinity);
      switch (sortBy) {
        case 'price-asc': return aLowest - bLowest;
        case 'price-desc': return bLowest - aLowest;
        case 'rating': return (b.rating || 0) - (a.rating || 0);
        case 'discount': return (b.discount || 0) - (a.discount || 0);
        default: return 0;
      }
    });
    return sorted;
  }, [searchResults, priceRange, selectedBrands, selectedRetailers, minDiscount, minRating, sortBy]);

  const toggleBrand = (brand: string) =>
    setSelectedBrands((prev) => prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]);
  const toggleRetailer = (id: string) =>
    setSelectedRetailers((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]);
  const resetFilters = () => {
    setPriceRange([0, 500000]);
    setSelectedBrands([]);
    setSelectedRetailers([]);
    setMinDiscount(0);
    setMinRating(0);
  };

  const filterProps = {
    filters: { priceRange, selectedBrands, selectedRetailers, minDiscount, minRating },
    brands,
    retailers,
    onPriceRangeChange: setPriceRange as (r: [number, number]) => void,
    onToggleBrand: toggleBrand,
    onToggleRetailer: toggleRetailer,
    onMinDiscountChange: setMinDiscount,
    onMinRatingChange: setMinRating,
    onReset: resetFilters,
  };

  // No query state
  if (!query.trim()) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
          <Search className="w-10 h-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Start searching to compare prices</h1>
        <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
          Use the search bar above to find products, brands, or categories across multiple retailers
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {['Gaming accessories', 'Wireless earbuds', 'Running shoes', 'Smart TV', 'Home decor'].map((term) => (
            <Badge key={term} variant="outline" className="cursor-pointer hover:bg-accent" asChild>
              <Link to={`/search?q=${encodeURIComponent(term)}`}>{term}</Link>
            </Badge>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild><Link to="/">Start</Link></BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Search results</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Search results for "<span className="text-primary">{query}</span>"
        </h1>
        {!loading && (
          <p className="text-sm text-muted-foreground mt-1">
            {filteredResults.length} {filteredResults.length === 1 ? 'product' : 'products'} found
          </p>
        )}
      </div>

      <div className="flex gap-6 lg:gap-8">
        {/* Desktop Sidebar */}
        {!loading && searchResults.length > 0 && (
          <aside className="hidden lg:block w-60 flex-shrink-0">
            <div className="bg-white border border-border rounded-lg p-4 sticky top-[65px]">
              <h2 className="text-sm font-semibold text-foreground mb-4">Filters</h2>
              <FilterSidebar {...filterProps} />
            </div>
          </aside>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Sort bar */}
          {!loading && filteredResults.length > 0 && (
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px] h-9 text-xs">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="discount">Biggest Discount</SelectItem>
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
                {selectedBrands.map((b) => (
                  <Badge key={b} variant="outline" className="text-[10px] gap-1 cursor-pointer" onClick={() => toggleBrand(b)}>
                    {b} ×
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {filteredResults.length} products
              </p>
            </div>
          )}

          {/* Results */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredResults.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredResults.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : searchResults.length > 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-muted-foreground mb-4">No products match your filters</p>
              <Button onClick={resetFilters} variant="outline" size="sm">
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">No results found for "{query}"</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Try different keywords or browse our categories
              </p>
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {['Computing', 'Phones & Wearables', 'Health & Beauty', 'Sound & Vision', 'Sports & Outdoor'].map((cat) => (
                  <Badge key={cat} variant="outline" className="cursor-pointer hover:bg-accent" asChild>
                    <Link to={`/category/${cat.toLowerCase().replace(' ', '_')}`}>{cat}</Link>
                  </Badge>
                ))}
              </div>
              <Button asChild>
                <Link to="/">Browse All Products</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

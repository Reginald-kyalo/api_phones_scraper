import { useMemo } from 'react';
import { useSearchParams, Link } from 'react-router';
import { Search } from 'lucide-react';
import { products } from '../data/mockData';
import ProductCard from '../components/ProductCard';
import { Button } from '../components/ui/button';

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(lowerQuery) ||
        product.brand.toLowerCase().includes(lowerQuery) ||
        product.category.toLowerCase().includes(lowerQuery) ||
        Object.values(product.specifications).some((value) =>
          value.toLowerCase().includes(lowerQuery)
        )
    );
  }, [query]);

  if (!query.trim()) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Enter a search term</h1>
        <p className="text-gray-600 mb-6">
          Use the search bar to find products, brands, or categories
        </p>
        <Button asChild>
          <Link to="/">Back to Home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">
          Search Results for "{query}"
        </h1>
        <p className="text-gray-600">
          {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} found
        </p>
      </div>

      {/* Results */}
      {searchResults.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {searchResults.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No results found</h2>
          <p className="text-gray-600 mb-6">
            Try searching with different keywords or browse our categories
          </p>
          <Button asChild>
            <Link to="/">Browse All Products</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

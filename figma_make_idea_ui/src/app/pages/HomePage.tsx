import { Link } from 'react-router';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { categories, getFeaturedDeals, getTrendingProducts } from '../data/mockData';
import ProductCard from '../components/ProductCard';
import DailyDealCard from '../components/DailyDealCard';
import { Button } from '../components/ui/button';
import { useState } from 'react';

export default function HomePage() {
  const featuredDeals = getFeaturedDeals();
  const trendingProducts = getTrendingProducts();
  const [dealIndex, setDealIndex] = useState(0);

  const visibleDeals = 3;
  const maxIndex = Math.max(0, featuredDeals.length - visibleDeals);

  const nextDeals = () => {
    setDealIndex((prev) => Math.min(prev + 1, maxIndex));
  };

  const prevDeals = () => {
    setDealIndex((prev) => Math.max(prev - 1, 0));
  };

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section - Subtle */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 md:p-12 mb-12">
          <h1 className="text-3xl md:text-4xl font-semibold mb-3 text-gray-900">
            Compare Prices Across New Zealand
          </h1>
          <p className="text-base text-gray-600 mb-6 max-w-2xl">
            Find the best deals on phones, laptops, cosmetics and more from top NZ retailers
          </p>
          <div className="flex gap-3">
            <Button size="default" className="bg-orange-600 hover:bg-orange-700 h-11 px-6" asChild>
              <Link to="/category/phones">Browse Phones</Link>
            </Button>
            <Button size="default" variant="outline" className="h-11 px-6" asChild>
              <Link to="/category/laptops">Browse Laptops</Link>
            </Button>
          </div>
        </div>

        {/* Featured Categories */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Browse by Category</h2>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/category/${category.id}`}
                className="flex flex-col items-center gap-2 hover:opacity-75 transition-opacity duration-150 group"
              >
                <div className="text-3xl group-hover:scale-110 transition-transform duration-150">
                  {category.emoji}
                </div>
                <h3 className="font-medium text-xs text-gray-900 text-center leading-tight">{category.name}</h3>
              </Link>
            ))}
          </div>
        </section>

        {/* Daily Deals Carousel */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Daily Deals</h2>
              <p className="text-xs text-gray-600">Best prices today</p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="borderless"
                size="icon"
                onClick={prevDeals}
                disabled={dealIndex === 0}
                className="h-8 w-8"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="borderless"
                size="icon"
                onClick={nextDeals}
                disabled={dealIndex >= maxIndex}
                className="h-8 w-8"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="overflow-hidden">
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 transition-transform duration-300"
              style={{
                transform: `translateX(-${dealIndex * (100 / visibleDeals)}%)`,
              }}
            >
              {featuredDeals.map((product) => (
                <div key={product.id}>
                  <DailyDealCard product={product} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trending Products */}
        <section className="mb-12">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Trending in Your Region</h2>
            <p className="text-xs text-gray-600">Most popular this week</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {trendingProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="mt-12 bg-gray-50 border border-gray-200 rounded-lg p-8 md:p-12">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold mb-3 text-gray-900">Never Miss a Deal</h2>
            <p className="text-sm text-gray-600 mb-6">
              Set up price alerts and get notified when your favorite products drop in price
            </p>
            <Button size="default" className="bg-orange-600 hover:bg-orange-700 h-11 px-6" asChild>
              <Link to="/auth">
                Create Free Account
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

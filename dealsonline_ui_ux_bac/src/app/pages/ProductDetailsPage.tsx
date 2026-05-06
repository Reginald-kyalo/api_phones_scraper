import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router';
import { Heart, Bell, Star, Loader2, Camera, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { productsApi, type Product } from '../lib/api';
import { useLocalFavorites, useLocalAlerts } from '../hooks/useLocalStorage';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import ImageLightbox from '../components/product/ImageLightbox';
import RetailerRow from '../components/product/RetailerRow';
import SpecsTable from '../components/product/SpecsTable';
import PriceHistoryChart from '../components/product/PriceHistoryChart';
import ProductCard from '../components/product/ProductCard';
import ProductCarousel, { ProductCarouselItem } from '../components/product/ProductCarousel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../components/ui/breadcrumb';
import { Separator } from '../components/ui/separator';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

export default function ProductDetailsPage() {
  const { productId } = useParams<{ productId: string }>();
  const { isFavorite, toggleFavorite } = useLocalFavorites();
  const { addAlert } = useLocalAlerts();
  const { addItem: addRecentlyViewed } = useRecentlyViewed();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [targetPrice, setTargetPrice] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [retailerSort, setRetailerSort] = useState<'price-asc' | 'price-desc' | 'name'>('price-asc');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [reviewSort, setReviewSort] = useState<'helpful' | 'newest' | 'highest' | 'lowest'>('helpful');

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    setLoading(true);
    setSelectedImage(0);
    async function load() {
      try {
        const p = await productsApi.getById(productId!);
        if (!cancelled) {
          setProduct(p);
          addRecentlyViewed({ id: p.id, name: p.name, image: p.image, category: p.category });
          // Fetch related products via dedicated endpoint
          try {
            const res = await productsApi.getRelated(productId!, 6);
            if (!cancelled) setRelated(res.products);
          } catch { /* ignore */ }
        }
      } catch {
        // leave null
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [productId]);

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-bold mb-4">Product not found</h1>
        <Button asChild>
          <Link to="/">Back to Home</Link>
        </Button>
      </div>
    );
  }

  const inStockPrices = product.prices.filter((p) => p.inStock);
  const lowestPrice = inStockPrices.length > 0 ? Math.min(...inStockPrices.map((p) => p.price)) : 0;
  const highestPrice = Math.max(...product.prices.map((p) => p.price));
  const savings = highestPrice - lowestPrice;

  const isFav = isFavorite(product.id);

  const handleFavoriteClick = () => {
    toggleFavorite(product);
    toast.success(isFav ? 'Removed from favorites' : 'Added to favorites');
  };

  const handleSetPriceAlert = () => {
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    if (price >= lowestPrice) {
      toast.error('Target price must be lower than current price');
      return;
    }
    addAlert(product, price);
    toast.success('Price alert created');
    setDialogOpen(false);
    setTargetPrice('');
  };

  const sortedPrices = [...product.prices]
    .filter((p) => !onlyInStock || p.inStock)
    .sort((a, b) => {
      // Always push out-of-stock to bottom
      if (a.inStock && !b.inStock) return -1;
      if (!a.inStock && b.inStock) return 1;
      if (retailerSort === 'price-desc') return b.price - a.price;
      if (retailerSort === 'name') return a.retailerName.localeCompare(b.retailerName);
      return a.price - b.price; // price-asc default
    });

  // Price trend intelligence: compare current lowest to 90-day average
  const priceTrend = useMemo(() => {
    if (!product.priceHistory || product.priceHistory.length < 2) return null;
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const recent = product.priceHistory.filter((h) => new Date(h.date) >= ninetyDaysAgo);
    if (recent.length < 2) return null;
    const avg = recent.reduce((sum, h) => sum + h.price, 0) / recent.length;
    const diff = lowestPrice - avg;
    const pct = Math.abs(diff / avg) * 100;
    if (pct < 3) return { label: 'Average price', icon: 'neutral' as const, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' };
    if (diff < 0) return { label: `${pct.toFixed(0)}% below avg — Good time to buy`, icon: 'down' as const, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
    return { label: `${pct.toFixed(0)}% above avg — Prices are high`, icon: 'up' as const, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' };
  }, [product.priceHistory, lowestPrice]);

  return (
    <div className="bg-white">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-5">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="text-xs">Start</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={`/category/${product.category}`} className="text-xs capitalize">
                  {product.category}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-xs line-clamp-1">{product.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Two-column product header */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 mb-10">
          {/* Left: Image gallery */}
          <div className="flex gap-3">
            {/* Vertical thumbnails */}
            {product.images.length > 1 && (
              <div className="hidden sm:flex flex-col gap-2 flex-shrink-0">
                {product.images.map((image, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-16 h-16 rounded border overflow-hidden ${
                      selectedImage === idx ? 'border-foreground' : 'border-border hover:border-foreground/40'
                    } transition-colors`}
                  >
                    <ImageWithFallback
                      src={image}
                      alt={`${product.name} ${idx + 1}`}
                      className="w-full h-full object-contain p-1"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Main image */}
            <div className="relative flex-1 aspect-square bg-gray-50 border border-border rounded-lg overflow-hidden group">
              <ImageWithFallback
                src={product.images[selectedImage] || product.image}
                alt={product.name}
                className="w-full h-full object-contain p-6 cursor-pointer"
                onClick={() => setLightboxOpen(true)}
              />

              {/* Discount badge */}
              {product.discount && product.discount > 0 && (
                <Badge variant="discount" className="absolute top-3 left-3 text-xs">
                  -{product.discount}%
                </Badge>
              )}

              {/* Favorite */}
              <button
                onClick={handleFavoriteClick}
                aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:scale-105 transition-transform"
              >
                <Heart className={`w-5 h-5 ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
              </button>

              {/* Image count */}
              {product.images.length > 1 && (
                <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/60 text-white rounded px-2 py-1 text-[11px]">
                  <Camera className="w-3 h-3" />
                  {product.images.length}
                </div>
              )}
            </div>

            <ImageLightbox
              src={product.images[selectedImage] || product.image}
              alt={product.name}
              open={lightboxOpen}
              onOpenChange={setLightboxOpen}
            />
          </div>

          {/* Right: Product info */}
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground mb-2">{product.name}</h1>

            {/* Info bar */}
            <div className="flex items-center gap-3 text-sm mb-4">
              {product.rating > 0 ? (
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="font-medium">{product.rating.toFixed(1)}</span>
                </span>
              ) : (
                <span className="text-muted-foreground text-xs">Not yet rated</span>
              )}
              <Separator orientation="vertical" className="h-4" />
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <button className="flex items-center gap-1 text-link hover:underline text-xs">
                    <Bell className="w-3.5 h-3.5" /> Price alert
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Set Price Alert</DialogTitle>
                    <DialogDescription>
                      Get notified when the price drops below your target
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="targetPrice" className="text-sm">Target Price (KES)</Label>
                      <Input
                        id="targetPrice"
                        type="number"
                        placeholder="e.g., 1500"
                        value={targetPrice}
                        onChange={(e) => setTargetPrice(e.target.value)}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Current lowest: KES {lowestPrice.toLocaleString()}
                      </p>
                    </div>
                    <Button onClick={handleSetPriceAlert} className="w-full">
                      Create Alert
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Price range */}
            <p className="text-sm text-muted-foreground mb-4">
              Compare prices from{' '}
              <span className="font-semibold text-foreground">KES {lowestPrice.toLocaleString()}</span>
              {highestPrice > lowestPrice && (
                <>
                  {' '}to{' '}
                  <span className="font-semibold text-foreground">KES {highestPrice.toLocaleString()}</span>
                </>
              )}
              {' '}· {product.prices.length} {product.prices.length === 1 ? 'store' : 'stores'}
            </p>

            {/* Price trend intelligence */}
            {priceTrend && (
              <div className={`flex items-center gap-3 border rounded-lg p-3 mb-5 ${priceTrend.bg}`}>
                {priceTrend.icon === 'down' && <TrendingDown className={`w-5 h-5 ${priceTrend.color} flex-shrink-0`} />}
                {priceTrend.icon === 'up' && <TrendingUp className={`w-5 h-5 ${priceTrend.color} flex-shrink-0`} />}
                {priceTrend.icon === 'neutral' && <Minus className={`w-5 h-5 ${priceTrend.color} flex-shrink-0`} />}
                <p className={`text-sm font-medium ${priceTrend.color}`}>{priceTrend.label}</p>
              </div>
            )}
            {!priceTrend && savings > 0 && inStockPrices.length > 0 && (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-5">
                <TrendingDown className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <p className="text-sm text-emerald-800">
                  Save up to <span className="font-semibold">KES {savings.toLocaleString()}</span> by comparing stores
                </p>
              </div>
            )}

            {/* Out of stock alert */}
            {inStockPrices.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-5">
                <p className="text-sm font-medium text-amber-900 mb-2">Currently out of stock</p>
                <p className="text-xs text-amber-700 mb-3">
                  This product is unavailable at all retailers. Set a price alert to get notified when it's back in stock.
                </p>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1.5">
                      <Bell className="w-3.5 h-3.5" /> Notify me when available
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            )}

            {/* Brand */}
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-6">
              {product.brand}
            </p>

            {/* Quick actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleFavoriteClick}
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
                {isFav ? 'Saved' : 'Save'}
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Bell className="w-4 h-4" /> Price Alert
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Tabbed content */}
        <Tabs defaultValue="prices" className="mb-10">
          <TabsList className="mb-6">
            <TabsTrigger value="prices">Prices</TabsTrigger>
            <TabsTrigger value="details">Product Details</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="price-history">Price History</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          {/* Prices tab */}
          <TabsContent value="prices">
            {/* Filter / sort bar */}
            <div className="flex flex-wrap items-center gap-4 mb-4 px-1">
              <div className="flex items-center gap-2">
                <Switch
                  id="in-stock-only"
                  checked={onlyInStock}
                  onCheckedChange={setOnlyInStock}
                />
                <label htmlFor="in-stock-only" className="text-sm text-muted-foreground cursor-pointer select-none">
                  Only in stock
                </label>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Sort:</span>
                <Select value={retailerSort} onValueChange={(v) => setRetailerSort(v as typeof retailerSort)}>
                  <SelectTrigger className="h-8 w-[160px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price-asc">Price: Low → High</SelectItem>
                    <SelectItem value="price-desc">Price: High → Low</SelectItem>
                    <SelectItem value="name">Retailer name</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              {sortedPrices.length > 0 ? (
                sortedPrices.map((priceData, idx) => (
                  <RetailerRow
                    key={idx}
                    priceData={priceData}
                    isLowest={priceData.price === lowestPrice && priceData.inStock}
                    product={product}
                  />
                ))
              ) : (
                <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                  No retailers match your filters
                </p>
              )}
            </div>
          </TabsContent>

          {/* Product Details tab */}
          <TabsContent value="details">
            <div className="max-w-3xl">
              {/* Price intro sentence */}
              <div className="bg-[var(--surface-alt)] border border-border rounded-lg p-4 mb-6">
                <p className="text-sm text-foreground">
                  Lowest price for <span className="font-semibold">{product.name}</span> is{' '}
                  <span className="font-semibold">KES {lowestPrice.toLocaleString()}</span>.
                  {inStockPrices.length > 0 && (
                    <> This is currently the cheapest offer among {product.prices.length} {product.prices.length === 1 ? 'store' : 'stores'}.</>
                  )}
                </p>
              </div>

              <h3 className="text-base font-semibold text-foreground mb-3">
                About {product.name}
              </h3>
              <div className="prose prose-sm text-muted-foreground space-y-3">
                <p>
                  The {product.name} by {product.brand} is a popular choice in the{' '}
                  <span className="capitalize">{product.category}</span> category,
                  available from {product.prices.length} {product.prices.length === 1 ? 'retailer' : 'retailers'} in Kenya.
                </p>
                {Object.keys(product.specifications).length > 0 && (
                  <>
                    <h4 className="text-sm font-semibold text-foreground mt-4 mb-1">Key specifications</h4>
                    <ul className="list-disc pl-4 space-y-1 text-sm">
                      {Object.entries(product.specifications).slice(0, 5).map(([key, value]) => (
                        <li key={key}>
                          <span className="text-muted-foreground">{key}:</span>{' '}
                          <span className="text-foreground font-medium">{value}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              <Separator className="my-6" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Brand</span>
                  <p className="font-medium text-foreground">{product.brand}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Category</span>
                  <p className="font-medium text-foreground capitalize">{product.category}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Stores</span>
                  <p className="font-medium text-foreground">{product.prices.length}</p>
                </div>
                {product.rating > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">Rating</span>
                    <p className="font-medium text-foreground">{product.rating.toFixed(1)} / 5</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Features tab */}
          <TabsContent value="features">
            <SpecsTable specifications={product.specifications} />
          </TabsContent>

          {/* Price History tab */}
          <TabsContent value="price-history">
            <PriceHistoryChart data={product.priceHistory} currentPrice={lowestPrice} />
          </TabsContent>

          {/* Reviews tab */}
          <TabsContent value="reviews">
            {product.reviews.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8">
                {/* Left: Rating summary + distribution */}
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg border border-border text-center">
                    <p className="text-4xl font-bold text-foreground">{product.rating.toFixed(1)}</p>
                    <div className="flex items-center justify-center gap-0.5 mt-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {product.reviewCount} {product.reviewCount === 1 ? 'rating' : 'ratings'}
                    </p>
                  </div>

                  {/* Star distribution bars */}
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = product.reviews.filter((r) => r.rating === star).length;
                      const pct = product.reviews.length > 0 ? (count / product.reviews.length) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 text-sm">
                          <span className="w-8 text-right text-xs text-muted-foreground">{star} ★</span>
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-8 text-xs text-muted-foreground">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Sort + review cards */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground">
                      Written reviews ({product.reviews.length})
                    </h3>
                    <Select value={reviewSort} onValueChange={(v) => setReviewSort(v as typeof reviewSort)}>
                      <SelectTrigger className="h-8 w-[150px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="helpful">Most helpful</SelectItem>
                        <SelectItem value="newest">Newest</SelectItem>
                        <SelectItem value="highest">Highest rated</SelectItem>
                        <SelectItem value="lowest">Lowest rated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    {[...product.reviews]
                      .sort((a, b) => {
                        if (reviewSort === 'helpful') return b.helpful - a.helpful;
                        if (reviewSort === 'newest') return new Date(b.date).getTime() - new Date(a.date).getTime();
                        if (reviewSort === 'highest') return b.rating - a.rating;
                        return a.rating - b.rating;
                      })
                      .map((review) => (
                        <div key={review.id} className="border border-border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-sm font-medium text-foreground">{review.author}</p>
                              <p className="text-xs text-muted-foreground">{review.date}</p>
                            </div>
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3.5 h-3.5 ${
                                    i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{review.text}</p>
                          {review.helpful > 0 && (
                            <p className="text-[11px] text-muted-foreground mt-2">
                              {review.helpful} {review.helpful === 1 ? 'person' : 'people'} found this helpful
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground mb-1">No reviews yet</p>
                <p className="text-xs text-muted-foreground">Be the first to review this product!</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Related products */}
        {related.length > 0 && (
          <ProductCarousel
            title="Related products"
            seeAllLink={`/category/${product.category}`}
            seeAllText="Show all"
          >
            {related.map((p) => (
              <ProductCarouselItem key={p.id}>
                <ProductCard product={p} variant="compact" />
              </ProductCarouselItem>
            ))}
          </ProductCarousel>
        )}
      </div>
    </div>
  );
}
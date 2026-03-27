import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { Heart, Bell, Star, ExternalLink, ChevronLeft, ZoomIn, Share2 } from 'lucide-react';
import { products } from '../data/mockData';
import { toggleFavorite, isFavorite, addPriceAlert, isAuthenticated } from '../utils/localStorage';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import ImageLightbox from '../components/ImageLightbox';
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

export default function ProductDetailsPage() {
  const { productId } = useParams<{ productId: string }>();
  const product = products.find((p) => p.id === productId);
  
  const [selectedImage, setSelectedImage] = useState(0);
  const [isFav, setIsFav] = useState(isFavorite(productId || ''));
  const [targetPrice, setTargetPrice] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Product not found</h1>
        <Button asChild>
          <Link to="/">Back to Home</Link>
        </Button>
      </div>
    );
  }

  const lowestPrice = Math.min(...product.prices.filter((p) => p.inStock).map((p) => p.price));
  const highestPrice = Math.max(...product.prices.map((p) => p.price));
  const savings = highestPrice - lowestPrice;

  const handleFavoriteClick = () => {
    if (!isAuthenticated()) {
      toast.error('Please login to add favorites');
      return;
    }

    const newState = toggleFavorite(product.id);
    setIsFav(newState);
    toast.success(newState ? 'Added to favorites' : 'Removed from favorites');
  };

  const handleSetPriceAlert = () => {
    if (!isAuthenticated()) {
      toast.error('Please login to set price alerts');
      return;
    }

    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    if (price >= lowestPrice) {
      toast.error('Target price must be lower than current price');
      return;
    }

    addPriceAlert(product.id, product.name, price, lowestPrice);
    toast.success('Price alert created successfully!');
    setDialogOpen(false);
    setTargetPrice('');
  };

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="text-sm">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={`/category/${product.category}`} className="text-sm">
                  {product.category.charAt(0).toUpperCase() + product.category.slice(1)}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-sm">{product.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid md:grid-cols-2 gap-12 mb-12">
          {/* Left: Product Gallery */}
          <div>
            {/* Main Image with Lightbox */}
            <div className="relative aspect-square bg-gray-50 border border-gray-200 rounded-lg overflow-hidden mb-4 group">
              <ImageWithFallback
                src={product.images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              
              {/* Expand Button */}
              <button
                onClick={() => setLightboxOpen(true)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                aria-label="Expand image"
              >
                <ZoomIn className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            {/* Image Lightbox */}
            <ImageLightbox
              src={product.images[selectedImage]}
              alt={product.name}
              open={lightboxOpen}
              onOpenChange={setLightboxOpen}
            />

            {/* Thumbnails */}
            <div className="flex gap-3">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border ${
                    selectedImage === index ? 'border-gray-900' : 'border-gray-200'
                  } hover:border-gray-900 transition-colors`}
                >
                  <ImageWithFallback
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <Button
                onClick={handleFavoriteClick}
                variant="outline"
                className="flex-1 h-11"
              >
                <Heart className={`w-4 h-4 mr-2 ${isFav ? 'fill-orange-600 text-orange-600' : ''}`} />
                {isFav ? 'Remove from Favorites' : 'Add to Favorites'}
              </Button>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex-1 h-11">
                    <Bell className="w-4 h-4 mr-2" />
                    Set Price Alert
                  </Button>
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
                      <Label htmlFor="targetPrice" className="text-sm">Target Price (NZD)</Label>
                      <Input
                        id="targetPrice"
                        type="number"
                        placeholder="e.g., 1500"
                        value={targetPrice}
                        onChange={(e) => setTargetPrice(e.target.value)}
                        className="mt-2 h-11"
                      />
                      <p className="text-sm text-gray-500 mt-2">
                        Current lowest price: ${lowestPrice.toFixed(2)}
                      </p>
                    </div>
                    <Button onClick={handleSetPriceAlert} className="w-full bg-orange-600 hover:bg-orange-700 h-11">
                      Create Alert
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Right: Product Info & Prices */}
          <div>
            {/* Brand */}
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
              {product.brand}
            </p>

            {/* Product Name */}
            <h1 className="text-2xl font-semibold mb-4 text-gray-900">{product.name}</h1>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(product.rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium">{product.rating}</span>
              <span className="text-sm text-gray-500">({product.reviewCount} reviews)</span>
            </div>

            {/* Savings */}
            {savings > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
                <p className="text-green-800 text-sm font-medium">
                  Save up to ${savings.toFixed(2)} by choosing the right retailer
                </p>
              </div>
            )}

            {/* Pricing Comparison */}
            <div className="mb-8">
              <h2 className="text-base font-semibold mb-4">Price Comparison</h2>
              <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-900">Retailer</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-900">Price</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-900">Stock</th>
                      <th className="text-right px-4 py-3 font-semibold text-gray-900">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.prices.map((priceData, index) => (
                      <tr 
                        key={index} 
                        className={`border-t border-gray-200 transition-colors hover:bg-orange-50/30 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}
                      >
                        <td className="px-4 py-4 font-medium text-gray-900">{priceData.retailerName}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-base text-gray-900">
                              ${priceData.price.toFixed(2)}
                            </span>
                            {priceData.price === lowestPrice && priceData.inStock && (
                              <Badge className="bg-green-600 hover:bg-green-700 text-xs px-2 py-0.5">
                                Lowest
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {priceData.inStock ? (
                            <Badge variant="outline" className="border-green-600 text-green-600 text-xs">
                              In Stock
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-gray-400 text-gray-600 text-xs">
                              Out of Stock
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Button
                            size="sm"
                            disabled={!priceData.inStock}
                            className="bg-orange-600 hover:bg-orange-700 h-9 text-sm shadow-sm hover:shadow transition-all"
                            asChild={priceData.inStock}
                          >
                            {priceData.inStock ? (
                              <a href={priceData.url} target="_blank" rel="noopener noreferrer">
                                Visit Shop
                                <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                              </a>
                            ) : (
                              <span>Unavailable</span>
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Specifications */}
            <div>
              <h2 className="text-base font-semibold mb-4">Specifications</h2>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <ul className="space-y-2">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <li key={key} className="flex text-sm">
                      <span className="font-medium w-40 flex-shrink-0 text-gray-900">{key}:</span>
                      <span className="text-gray-700">{value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Content Section */}
        <Tabs defaultValue="overview" className="mb-12">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="specifications">Specifications</TabsTrigger>
            <TabsTrigger value="price-history">Price History</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold mb-4 text-gray-900">Quick Info</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span className="text-gray-600">Brand:</span>
                    <span className="font-medium">{product.brand}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-600">Category:</span>
                    <span className="font-medium capitalize">{product.category}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-600">Rating:</span>
                    <span className="font-medium">{product.rating} / 5.0</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-600">Reviews:</span>
                    <span className="font-medium">{product.reviewCount}</span>
                  </li>
                </ul>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <h3 className="font-semibold mb-4 text-gray-900">Price Range</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Lowest Price</p>
                    <p className="text-2xl font-bold text-orange-600">${lowestPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Highest Price</p>
                    <p className="text-lg font-semibold text-gray-900">${highestPrice.toFixed(2)}</p>
                  </div>
                  {savings > 0 && (
                    <div className="pt-3 border-t border-orange-200">
                      <p className="text-sm text-green-700 font-medium">
                        Save up to ${savings.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Specifications Tab */}
          <TabsContent value="specifications">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="general">
                <AccordionTrigger className="text-base font-semibold">General</AccordionTrigger>
                <AccordionContent>
                  <div className="grid md:grid-cols-2 gap-4 py-4">
                    {Object.entries(product.specifications).slice(0, 4).map(([key, value]) => (
                      <div key={key} className="flex flex-col">
                        <span className="text-xs uppercase tracking-wide text-gray-500 mb-1">{key}</span>
                        <span className="text-sm font-medium text-gray-900">{value}</span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="technical">
                <AccordionTrigger className="text-base font-semibold">Technical Details</AccordionTrigger>
                <AccordionContent>
                  <div className="grid md:grid-cols-2 gap-4 py-4">
                    {Object.entries(product.specifications).slice(4).map(([key, value]) => (
                      <div key={key} className="flex flex-col">
                        <span className="text-xs uppercase tracking-wide text-gray-500 mb-1">{key}</span>
                        <span className="text-sm font-medium text-gray-900">{value}</span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          {/* Price History Tab */}
          <TabsContent value="price-history">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={product.priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    stroke="#9ca3af"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#9ca3af"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #d8d8d8',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#ff6b00"
                    strokeWidth={2}
                    dot={{ fill: '#ff6b00', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Price has{' '}
                  {product.priceHistory[product.priceHistory.length - 1].price <
                  product.priceHistory[0].price ? (
                    <span className="text-green-600 font-medium">decreased</span>
                  ) : (
                    <span className="text-red-600 font-medium">increased</span>
                  )}{' '}
                  by $
                  {Math.abs(
                    product.priceHistory[product.priceHistory.length - 1].price -
                      product.priceHistory[0].price
                  ).toFixed(2)}{' '}
                  in the last 30 days
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            {product.reviews.length > 0 ? (
              <div className="space-y-4">
                {product.reviews.map((review) => (
                  <div key={review.id} className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-gray-900">{review.author}</p>
                        <p className="text-sm text-gray-500">{review.date}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-700 mb-3 text-sm">{review.text}</p>
                    <p className="text-xs text-gray-500">{review.helpful} people found this helpful</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-500">No reviews yet. Be the first to review!</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
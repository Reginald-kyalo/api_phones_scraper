import { Link } from 'react-router';
import { Heart, Trash2 } from 'lucide-react';
import { useLocalFavorites } from '../hooks/useLocalStorage';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../components/ui/breadcrumb';

export default function FavoritesPage() {
  const { favorites, removeFavorite } = useLocalFavorites();

  const handleRemove = (productId: string) => {
    removeFavorite(productId);
    toast.success('Removed from favorites');
  };

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
            <BreadcrumbPage>Favorites</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">My Favorites</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {favorites.length} {favorites.length === 1 ? 'item' : 'items'} saved
        </p>
      </div>

      {favorites.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {favorites.map((fav) => (
            <div key={fav.product_id} className="group border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <Link to={`/product/${fav.product_id}`} className="block">
                <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                  <ImageWithFallback src={fav.image} alt={fav.name} className="w-full h-full object-contain p-3 group-hover:scale-[1.02] transition-transform" />
                </div>
              </Link>
              <div className="p-3">
                <Link to={`/product/${fav.product_id}`} className="font-medium text-sm text-foreground hover:text-primary line-clamp-2">
                  {fav.name}
                </Link>
                {fav.category && (
                  <p className="text-xs text-muted-foreground capitalize mt-1">{fav.category}</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleRemove(fav.product_id)}
                >
                  <Trash2 className="w-3 h-3 mr-1.5" />
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">No favorites yet</h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
            Start adding products to your favorites to keep track of items you love
          </p>
          <Button asChild>
            <Link to="/">Browse Products</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
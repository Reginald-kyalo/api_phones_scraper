import { Link } from 'react-router';
import { Seo } from '../components/common/Seo';
import { Heart, Trash2 } from 'lucide-react';
import { useLocalFavorites } from '../hooks/useLocalStorage';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { Breadcrumbs } from '../components/common/Breadcrumbs';

/**
 * Favourites: products saved in this browser's storage. "In this browser",
 * not "on this device": another browser on the same phone does not share
 * them (design audit §11). Image and name are one link, so the image is
 * never a link with no name (A04).
 */
export default function FavoritesPage() {
  const { favorites, removeFavorite } = useLocalFavorites();

  const handleRemove = (productId: string) => {
    removeFavorite(productId);
    toast.success('Removed from favourites');
  };

  return (
    <div className="page-container py-6">
      <Seo title="Favourites" noindex />
      <Breadcrumbs items={[{ label: 'Favourites' }]} />

      <div className="mb-6">
        <h1 className="page-title">Favourites</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {favorites.length} {favorites.length === 1 ? 'product' : 'products'} · Saved in this browser.
        </p>
      </div>

      {favorites.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
          {favorites.map((fav) => (
            <div key={fav.product_id} className="flex flex-col rounded-md card-interactive overflow-hidden bg-card">
              <Link to={`/prices/${encodeURIComponent(fav.product_id)}`} className="block">
                <div className="aspect-square bg-photo relative overflow-hidden">
                  <ImageWithFallback src={fav.image} alt="" className="w-full h-full object-contain p-3" />
                </div>
                <p className="px-3 pt-3 font-semibold text-sm text-foreground hover:underline underline-offset-4 line-clamp-2">
                  {fav.name}
                </p>
              </Link>
              <div className="flex flex-1 flex-col px-3 pb-3">
                {fav.category && (
                  <p className="microcopy-label mt-1">{fav.category}</p>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-auto -ml-2 self-start text-xs text-muted-foreground"
                  onClick={() => handleRemove(fav.product_id)}
                  aria-label={`Remove ${fav.name} from favourites`}
                >
                  <Trash2 className="w-3 h-3" aria-hidden="true" />
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Heart className="w-8 h-8 text-muted-foreground/40 mx-auto mb-4" aria-hidden="true" />
          <h2 className="section-title mb-2">No favourites yet</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Save a product to find it here later.
          </p>
          <Button asChild variant="outline">
            <Link to="/browse">Browse products</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

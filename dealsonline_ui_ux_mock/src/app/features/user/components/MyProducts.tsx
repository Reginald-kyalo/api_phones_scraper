import { useState } from 'react';
import { Link } from 'react-router';
import { useLocalFavorites, useLocalPRAlerts } from '../../../hooks/useLocalStorage';
import { useRecentlyViewed } from '../../../hooks/useRecentlyViewed';
import { formatPrice } from '../../../lib/format';
import { Heart, Bell, Clock, Package, Star } from 'lucide-react';

type PanelTab = 'lists' | 'alerts' | 'recent';

/**
 * "My products": recently viewed, favourites and price alerts.
 *
 * This used to be a fixed dock at the bottom right of every page, where it
 * covered the price row on product pages. It now lives behind a header menu
 * (DESIGN_RULES.md: nothing sits on top of a price). Rendered inside a
 * DropdownMenuContent by the header.
 */
export function MyProductsContent() {
  const [activeTab, setActiveTab] = useState<PanelTab>('recent');

  const { favorites } = useLocalFavorites();
  const { alerts } = useLocalPRAlerts();
  const { items: recentItems } = useRecentlyViewed();

  return (
    <div className="flex max-h-[420px] w-80 flex-col">
      <div role="tablist" aria-label="My products" className="flex border-b border-border">
        {([
          { id: 'recent' as PanelTab, icon: Clock, label: 'Recently viewed' },
          { id: 'lists' as PanelTab, icon: Heart, label: 'Favourites' },
          { id: 'alerts' as PanelTab, icon: Bell, label: 'Price alerts' },
        ]).map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'text-foreground border-primary'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            <tab.icon className="h-4 w-4" aria-hidden="true" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {activeTab === 'recent' &&
          (recentItems.length === 0 ? (
            <EmptyState icon={Clock} text="Products you open will appear here." />
          ) : (
            <div className="space-y-1">
              {recentItems.slice(0, 10).map((item: any) => (
                <ProductRow key={item.id} id={item.id} name={item.name} image={item.image} subtitle={item.category} />
              ))}
            </div>
          ))}

        {activeTab === 'lists' &&
          (favorites.length === 0 ? (
            <EmptyState icon={Heart} text="No favourites yet." />
          ) : (
            <div className="space-y-1">
              {favorites.slice(0, 10).map((fav: any) => (
                <ProductRow key={fav.product_id} id={fav.product_id} name={fav.name} image={fav.image} subtitle={fav.category} />
              ))}
              <Link to="/favorites" className="block text-xs text-link hover:underline text-center py-1">
                All favourites
              </Link>
            </div>
          ))}

        {activeTab === 'alerts' &&
          (alerts.length === 0 ? (
            <EmptyState icon={Bell} text="No price alerts yet. Set one from any product page." />
          ) : (
            <div className="space-y-1">
              {alerts.slice(0, 10).map((alert: any) => (
                <ProductRow
                  key={alert.alert_id}
                  id={alert.product_id}
                  name={alert.name}
                  image={alert.image}
                  subtitle={
                    alert.triggered
                      ? `Target ${formatPrice(alert.targetPrice)} reached`
                      : `Target ${formatPrice(alert.targetPrice)}`
                  }
                  highlight={alert.triggered}
                />
              ))}
              <Link to="/alerts" className="block text-xs text-link hover:underline text-center py-1">
                All price alerts
              </Link>
            </div>
          ))}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center text-muted-foreground">
      <Icon className="h-6 w-6 mb-2 text-muted-foreground/40" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function ProductRow({
  id,
  name,
  image,
  subtitle,
  highlight,
  rating,
  productType,
}: {
  id: string;
  name: string;
  image: string;
  subtitle?: string;
  highlight?: boolean;
  rating?: number | null;
  productType?: string;
}) {
  return (
    <Link
      to={`/prices/${encodeURIComponent(id)}`}
      className="flex items-center gap-2.5 p-2 rounded-md hover:bg-surface-alt transition-colors group"
    >
      <div className="w-10 h-10 bg-surface-alt rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden border border-border">
        {image ? (
          <img src={image} alt="" className="w-full h-full object-contain p-0.5" loading="lazy" />
        ) : (
          <Package className="h-4 w-4 text-muted-foreground/40" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
          {name}
        </p>
        <div className="flex items-center gap-1.5">
          {rating != null && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Star className="h-2.5 w-2.5 fill-warning text-warning" />
              {rating.toFixed(1)}
            </span>
          )}
          {subtitle && (
            <span className={`text-[11px] truncate ${highlight ? 'text-success font-medium' : 'text-muted-foreground'}`}>
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

import { useState } from 'react';
import { Link } from 'react-router';
import { useLocalFavorites, useLocalPRAlerts, useRecentlyViewed } from '../hooks/useLocalStorage';
import { ChevronUp, ChevronDown, Heart, Bell, Clock, Package, Star, X } from 'lucide-react';

type PanelTab = 'lists' | 'alerts' | 'recent';

export default function MyProductsPanel() {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<PanelTab>('recent');

  const { favorites } = useLocalFavorites();
  const { alerts } = useLocalPRAlerts();
  const { recentItems } = useRecentlyViewed();

  const totalItems = favorites.length + alerts.length + recentItems.length;

  return (
    <div className="fixed bottom-0 right-4 z-30" style={{ width: 320 }}>
      {/* Collapsed bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-900 text-white rounded-t-xl hover:bg-gray-800 transition-colors"
      >
        <span className="text-sm font-medium">My products</span>
        <div className="flex items-center gap-2">
          {totalItems > 0 && (
            <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">{totalItems}</span>
          )}
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="bg-white border border-t-0 border-gray-200 shadow-xl max-h-[420px] flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            {([
              { id: 'lists' as PanelTab, icon: Heart, label: 'My lists', count: favorites.length },
              { id: 'alerts' as PanelTab, icon: Bell, label: 'Price Alerts', count: alerts.length },
              { id: 'recent' as PanelTab, icon: Clock, label: 'Recently visited', count: recentItems.length },
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'text-primary border-primary'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'lists' && (
              <div className="p-3">
                {favorites.length === 0 ? (
                  <EmptyState icon={Heart} text="No saved products yet" />
                ) : (
                  <div className="space-y-2">
                    {favorites.slice(0, 10).map((fav) => (
                      <ProductRow
                        key={fav.product_id}
                        id={fav.product_id}
                        name={fav.name}
                        image={fav.image}
                        subtitle={fav.category}
                      />
                    ))}
                    {favorites.length > 10 && (
                      <Link to="/favorites" className="block text-xs text-primary hover:underline text-center py-1">
                        View all {favorites.length} items
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'alerts' && (
              <div className="p-3">
                {alerts.length === 0 ? (
                  <EmptyState icon={Bell} text="No price alerts set" />
                ) : (
                  <div className="space-y-2">
                    {alerts.slice(0, 10).map((alert) => (
                      <ProductRow
                        key={alert.alert_id}
                        id={alert.product_id}
                        name={alert.name}
                        image={alert.image}
                        subtitle={
                          alert.triggered
                            ? `✓ Target £${alert.targetPrice.toFixed(2)} reached!`
                            : `Target: £${alert.targetPrice.toFixed(2)}`
                        }
                        highlight={alert.triggered}
                      />
                    ))}
                    {alerts.length > 10 && (
                      <Link to="/alerts" className="block text-xs text-primary hover:underline text-center py-1">
                        View all {alerts.length} alerts
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'recent' && (
              <div className="p-3">
                {recentItems.length === 0 ? (
                  <EmptyState icon={Clock} text="No recently viewed products" />
                ) : (
                  <div className="space-y-2">
                    {recentItems.slice(0, 10).map((item) => (
                      <ProductRow
                        key={item.product_id}
                        id={item.product_id}
                        name={item.name}
                        image={item.image}
                        subtitle={`£${item.price.toFixed(2)}`}
                        rating={item.rating}
                        productType={item.productType}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
      <Icon className="h-8 w-8 mb-2 text-gray-300" />
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
      to={`/product/pr/${id}`}
      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
    >
      <div className="w-10 h-10 bg-gray-50 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100">
        {image ? (
          <img src={image} alt="" className="w-full h-full object-contain p-0.5" loading="lazy" />
        ) : (
          <Package className="h-4 w-4 text-gray-300" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
          {name}
        </p>
        <div className="flex items-center gap-1.5">
          {rating != null && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
              {rating.toFixed(1)}
            </span>
          )}
          {subtitle && (
            <span className={`text-[11px] truncate ${highlight ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

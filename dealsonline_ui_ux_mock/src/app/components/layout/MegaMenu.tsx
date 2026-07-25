import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router';
import { X, Package, ChevronRight } from 'lucide-react';
import { pricerunnerApi, type PRProductType, type PRTreeNode } from '../../lib/api';
import { prIconMap } from './CategoryStrip';

interface MegaMenuProps {
  open: boolean;
  onClose: () => void;
}

export default function MegaMenu({ open, onClose }: MegaMenuProps) {
  const [productTypes, setProductTypes] = useState<PRProductType[]>([]);
  const [hoveredType, setHoveredType] = useState<string | null>(null);
  const [treeMap, setTreeMap] = useState<Record<string, PRTreeNode[]>>({});
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      pricerunnerApi.getProductTypes().then((res) => {
        setProductTypes(res.productTypes);
        if (res.productTypes.length > 0) {
          setHoveredType(res.productTypes[0].id);
        }
      }).catch(() => {});
    }
  }, [open]);

  // Fetch subcategory tree when a type is hovered
  useEffect(() => {
    if (!hoveredType || treeMap[hoveredType]) return;
    pricerunnerApi.getCategoryTree(hoveredType).then((res) => {
      setTreeMap((prev) => ({ ...prev, [hoveredType]: res.tree }));
    }).catch(() => {});
  }, [hoveredType, treeMap]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  const activeType = productTypes.find(t => t.id === hoveredType);
  const subtree = hoveredType ? (treeMap[hoveredType] || []) : [];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Menu panel */}
      <div
        ref={menuRef}
        className="fixed left-0 right-0 top-[57px] z-50 bg-white border-b border-border shadow-lg"
        role="dialog"
        aria-label="All categories"
      >
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-6 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

          <div className="flex gap-8 min-h-[320px]">
            {/* Left: Product type list */}
            <nav className="w-64 flex-shrink-0 border-r border-border pr-6 max-h-[420px] overflow-y-auto">
              <ul className="space-y-0.5">
                {productTypes.map((pt) => {
                  const Icon = prIconMap[pt.id] || Package;
                  return (
                    <li key={pt.id}>
                      <Link
                        to={`/browse/${pt.id}`}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          hoveredType === pt.id
                            ? 'bg-gray-100 text-foreground font-medium'
                            : 'text-muted-foreground hover:bg-gray-50 hover:text-foreground'
                        }`}
                        onMouseEnter={() => setHoveredType(pt.id)}
                        onClick={onClose}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1">{pt.label}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Right: Subcategories with images */}
            <div className="flex-1 min-w-0">
              {activeType && (
                <>
                  <h3 className="text-lg font-semibold text-foreground mb-5">
                    {activeType.label}
                  </h3>
                  {subtree.length > 0 ? (
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[340px] overflow-y-auto">
                      {subtree.map((node) => {
                        const hasChildren = node.children && node.children.length > 0;
                        // Non-leaf: go to browse page (shows subcategories)
                        // Leaf: go to browse page with category filter (shows products)
                        const href = hasChildren
                          ? `/browse/${activeType.id}?sub=${encodeURIComponent(node.slug)}`
                          : `/browse/${activeType.id}?cat=${encodeURIComponent(node.categoryUrl || '')}`;
                        return (
                          <Link
                            key={node.slug}
                            to={href}
                            className="group rounded-lg border border-border hover:border-primary/30 hover:shadow-sm transition-all overflow-hidden"
                            onClick={onClose}
                          >
                            {node.image ? (
                              <div className="h-20 bg-gray-50 flex items-center justify-center overflow-hidden">
                                <img
                                  src={node.image}
                                  alt={node.name}
                                  className="h-full w-full object-contain p-2 group-hover:scale-105 transition-transform"
                                  loading="lazy"
                                />
                              </div>
                            ) : (
                              <div className="h-20 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                                <Package className="w-8 h-8 text-gray-300 group-hover:text-primary/40 transition-colors" />
                              </div>
                            )}
                            <div className="px-3 py-2">
                              <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                {node.name}
                              </p>
                              {hasChildren && (
                                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-0.5">
                                  {node.children!.length} subcategories
                                  <ChevronRight className="w-3 h-3" />
                                </p>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-40 bg-gray-50 rounded-lg border border-border">
                      <p className="text-sm text-muted-foreground">
                        Browse all {activeType.label.toLowerCase()} products
                      </p>
                    </div>
                  )}
                  <div className="mt-5 pt-4 border-t border-border">
                    <Link
                      to={`/browse/${activeType.id}`}
                      className="text-sm font-medium text-link hover:text-link-hover transition-colors"
                      onClick={onClose}
                    >
                      Show all {activeType.label} ({activeType.productCount.toLocaleString()}) →
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

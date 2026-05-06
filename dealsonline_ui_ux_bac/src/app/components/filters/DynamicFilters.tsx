import { useState } from 'react';
import { type PRTreeNode } from '../../lib/api';
import { Skeleton } from '../ui/skeleton';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { ChevronRight, ChevronDown } from 'lucide-react';

function TreeNode({
  node,
  depth,
  selectedUrl,
  onSelect,
}: {
  node: PRTreeNode;
  depth: number;
  selectedUrl: string | null;
  onSelect: (url: string | null, name: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = node.categoryUrl === selectedUrl;

  return (
    <div>
      <button
        className={`w-full flex items-center gap-1.5 py-1.5 px-2 text-sm rounded-md transition-colors text-left ${
          isSelected
            ? 'bg-surface-alt text-primary font-medium ultra-border'
            : 'hover:bg-muted text-foreground'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => {
          if (hasChildren) setExpanded((e) => !e);
          if (node.categoryUrl) onSelect(node.categoryUrl, node.name);
        }}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-3.5 flex-shrink-0" />
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {hasChildren && expanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNode
              key={child.slug}
              node={child}
              depth={depth + 1}
              selectedUrl={selectedUrl}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface DynamicFiltersProps {
  tree: PRTreeNode[];
  label: string;
  selectedUrl: string | null;
  onSelectCategory: (url: string | null, name: string) => void;
  treeLoading: boolean;
  minPrice: string;
  maxPrice: string;
  appliedMinPrice: string;
  appliedMaxPrice: string;
  setMinPrice: (v: string) => void;
  setMaxPrice: (v: string) => void;
  onApplyPrice: () => void;
  onClearPrice: () => void;
  brands: { name: string; count: number }[];
  selectedBrand: string | null;
  onSelectBrand: (b: string) => void;
  onClearBrand: () => void;
}

export function DynamicFilters({
  tree, label, selectedUrl, onSelectCategory, treeLoading,
  minPrice, maxPrice, appliedMinPrice, appliedMaxPrice,
  setMinPrice, setMaxPrice, onApplyPrice, onClearPrice,
  brands, selectedBrand, onSelectBrand, onClearBrand
}: DynamicFiltersProps) {
  const [showAllBrands, setShowAllBrands] = useState(false);

  return (
    <div className="space-y-6">
      {/* Category tree */}
      <div className="w-full">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground">{label}</h3>
          {selectedUrl && (
            <button
              onClick={() => onSelectCategory(null, '')}
              className="text-xs text-primary hover:underline"
            >
              Show all
            </button>
          )}
        </div>
        {treeLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-7 rounded" />
            ))}
          </div>
        ) : (
          <div className="space-y-0.5">
            {tree.map((node) => (
              <TreeNode
                key={node.slug}
                node={node}
                depth={0}
                selectedUrl={selectedUrl}
                onSelect={onSelectCategory}
              />
            ))}
          </div>
        )}
      </div>

      {/* Price range */}
      <div>
        <h3 className="font-semibold text-sm text-foreground mb-3">Price range</h3>
        <div className="flex gap-2 items-center">
          <Input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-20 h-8 text-sm ultra-border bg-white"
            min={0}
          />
          <span className="text-muted-foreground text-xs">–</span>
          <Input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-20 h-8 text-sm ultra-border bg-white"
            min={0}
          />
          <Button size="sm" variant="secondary" className="h-8 px-3 text-xs ultra-border" onClick={onApplyPrice}>
            Go
          </Button>
        </div>
        {(appliedMinPrice || appliedMaxPrice) && (
          <button
            onClick={onClearPrice}
            className="text-xs text-primary hover:underline mt-1.5"
          >
            Clear price filter
          </button>
        )}
      </div>

      {/* Brands */}
      {brands.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm text-foreground mb-3">Brand</h3>
          <div className="space-y-1.5">
            {(showAllBrands ? brands : brands.slice(0, 10)).map((b) => (
              <label
                key={b.name}
                className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors"
              >
                <input
                  type="radio"
                  name="brand"
                  checked={selectedBrand === b.name}
                  onChange={() => onSelectBrand(b.name)}
                  className="accent-primary"
                />
                <span className={`flex-1 truncate ${selectedBrand === b.name ? 'font-medium text-primary' : 'text-foreground'}`}>
                  {b.name}
                </span>
                <span className="text-xs text-muted-foreground">({b.count})</span>
              </label>
            ))}
          </div>
          {brands.length > 10 && (
            <button
              onClick={() => setShowAllBrands(!showAllBrands)}
              className="text-xs text-primary hover:underline mt-2"
            >
              {showAllBrands ? 'Show less' : `Show all ${brands.length} brands`}
            </button>
          )}
          {selectedBrand && (
            <button
              onClick={onClearBrand}
              className="text-xs text-primary hover:underline mt-1.5 block"
            >
              Clear brand filter
            </button>
          )}
        </div>
      )}
    </div>
  );
}

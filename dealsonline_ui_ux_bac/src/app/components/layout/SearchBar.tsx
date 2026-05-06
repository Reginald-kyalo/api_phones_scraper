import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Search, X, Package, ChevronRight } from 'lucide-react';
import { Input } from '../ui/input';
import { Link } from 'react-router';

interface SearchBarProps {
  className?: string;
  variant?: 'compact' | 'hero';
  placeholder?: string;
  onSearch?: () => void;
}

// Mock predictive results
const MOCK_SUGGESTIONS = [
  { id: '1', name: 'iPhone 15 Pro Max', category: 'Phones', type: 'phones_wearables' },
  { id: '2', name: 'Samsung Galaxy S24 Ultra', category: 'Phones', type: 'phones_wearables' },
  { id: '3', name: 'Sony PlayStation 5', category: 'Gaming', type: 'gaming_entertainment' },
  { id: '4', name: 'Apple MacBook Pro M3', category: 'Laptops', type: 'computing' },
];

export default function SearchBar({
  className = '',
  variant = 'compact',
  placeholder = 'Search products...',
  onSearch,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery('');
      setIsFocused(false);
      onSearch?.();
    }
  };

  const showDropdown = isFocused && query.length > 1;
  const filteredSuggestions = MOCK_SUGGESTIONS.filter(s => 
    s.name.toLowerCase().includes(query.toLowerCase()) || 
    s.category.toLowerCase().includes(query.toLowerCase())
  );

  const renderDropdown = () => {
    if (!showDropdown) return null;
    return (
      <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-xl ultra-border overflow-hidden z-50">
        {filteredSuggestions.length > 0 ? (
          <div className="py-2">
            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Suggestions
            </div>
            {filteredSuggestions.map((s) => (
              <Link
                key={s.id}
                to={`/browse/${s.type}?q=${encodeURIComponent(s.name)}`}
                onClick={() => {
                  setQuery('');
                  setIsFocused(false);
                  onSearch?.();
                }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface-alt transition-colors group"
              >
                <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-white ultra-border">
                  <Package className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.category}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground">No suggestions for "{query}"</p>
            <button 
              onClick={handleSubmit}
              className="mt-2 text-sm text-primary hover:underline font-medium"
            >
              Search all products
            </button>
          </div>
        )}
      </div>
    );
  };

  if (variant === 'hero') {
    return (
      <div ref={containerRef} className={`relative ${className}`}>
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              className="w-full h-12 pl-12 pr-14 rounded-full bg-white text-gray-900 text-sm placeholder:text-gray-400 outline-none shadow-lg ultra-border"
            />
            <button
              type="submit"
              aria-label="Search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center gap-1.5 hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>
        </form>
        {renderDropdown()}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            className="pl-9 pr-8 h-9 bg-surface-alt text-sm rounded-lg ultra-border"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setIsFocused(true);
              }}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
      </form>
      {renderDropdown()}
    </div>
  );
}

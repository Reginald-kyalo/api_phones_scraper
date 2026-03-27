import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { Search, X, Heart, Bell, User, CreditCard, LogOut, LogIn, Menu, Settings, History } from 'lucide-react';
import { getCurrentUser, logout } from '../utils/localStorage';
import { useScrollHideHeader } from '../hooks/useScrollHideHeader';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getCurrentUser();
  const { isVisible } = useScrollHideHeader({ hideThreshold: 30 });

  // Hide search from header on homepage (it's now in carousel)
  const isHomepage = location.pathname === '/';
  const showSearchInHeader = !isHomepage;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    window.location.reload();
  };

  // Get user avatar (from localStorage or generate initials)
  const getAvatarDisplay = () => {
    if (currentUser?.avatar) {
      return (
        <img 
          src={currentUser.avatar} 
          alt={currentUser.name}
          className="w-7 h-7 rounded-full object-cover bg-gray-200"
        />
      );
    }
    
    // Fallback: initials in avatar circle
    const initials = currentUser?.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase() || 'U';
    
    return (
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold text-xs">
        {initials}
      </div>
    );
  };

  const MobileMenu = () => (
    <div className="flex flex-col gap-2 py-4">
      {currentUser ? (
        <>
          {/* User Profile Header */}
          <div className="px-4 py-3 border-b border-gray-100 mb-2">
            <p className="font-semibold text-gray-900">{currentUser.name}</p>
            <p className="text-xs text-gray-500">{currentUser.email}</p>
          </div>

          {/* Menu Items */}
          <Link 
            to="/favorites" 
            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-orange-50 rounded-md transition-colors text-gray-700 hover:text-orange-600"
          >
            <Heart className="w-4 h-4" />
            <span>Favorites</span>
          </Link>

          <Link 
            to="/alerts" 
            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-orange-50 rounded-md transition-colors text-gray-700 hover:text-orange-600"
          >
            <Bell className="w-4 h-4" />
            <span>Price Alerts</span>
          </Link>

          <Link 
            to="/account" 
            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-orange-50 rounded-md transition-colors text-gray-700 hover:text-orange-600"
          >
            <Settings className="w-4 h-4" />
            <span>Account Settings</span>
          </Link>

          <Link 
            to="/orders" 
            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-orange-50 rounded-md transition-colors text-gray-700 hover:text-orange-600"
          >
            <History className="w-4 h-4" />
            <span>Order History</span>
          </Link>

          <div className="border-t border-gray-200 my-2" />

          <button 
            onClick={handleLogout} 
            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 rounded-md transition-colors text-left text-red-600 hover:text-red-700"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </>
      ) : (
        <Link 
          to="/auth" 
          className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-orange-50 rounded-md transition-colors text-orange-600 font-medium"
        >
          <LogIn className="w-4 h-4" />
          <span>Login / Register</span>
        </Link>
      )}
    </div>
  );

  return (
    <header className={`bg-white border-b border-gray-200 fixed top-0 z-50 w-full transition-transform duration-300 ${
      isVisible ? 'translate-y-0' : '-translate-y-full'
    }`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 bg-gray-900 rounded-md flex items-center justify-center hover:bg-gray-800 transition-colors">
              <span className="text-white font-semibold text-sm">PC</span>
            </div>
            <span className="font-semibold text-base hidden md:block text-gray-900">PriceCompare</span>
          </Link>

          {/* Search Bar - HIDDEN ON HOMEPAGE */}
          {showSearchInHeader && (
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-6 hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search products, brands, or categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10 h-11 border-gray-300 text-sm rounded-md focus:ring-orange-500 focus:border-orange-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:opacity-80 transition-opacity"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Desktop Account Dropdown - ENHANCED */}
          <div className="hidden md:block">
            {currentUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center gap-2 h-10 px-3 text-sm hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {getAvatarDisplay()}
                    <span className="text-gray-700 font-medium">{currentUser.name.split(' ')[0]}</span>
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 shadow-lg border-gray-200">
                  {/* User Profile Section */}
                  <div className="px-2 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                      {getAvatarDisplay()}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{currentUser.name}</p>
                        <p className="text-gray-500 text-xs truncate">{currentUser.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <DropdownMenuItem asChild>
                    <Link 
                      to="/favorites" 
                      className="flex items-center gap-3 cursor-pointer text-sm py-2 px-2 rounded hover:bg-orange-50 transition-colors text-gray-700"
                    >
                      <Heart className="w-4 h-4 text-gray-600" />
                      <span>Favorites</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link 
                      to="/alerts" 
                      className="flex items-center gap-3 cursor-pointer text-sm py-2 px-2 rounded hover:bg-orange-50 transition-colors text-gray-700"
                    >
                      <Bell className="w-4 h-4 text-gray-600" />
                      <span>Price Alerts</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link 
                      to="/account" 
                      className="flex items-center gap-3 cursor-pointer text-sm py-2 px-2 rounded hover:bg-orange-50 transition-colors text-gray-700"
                    >
                      <Settings className="w-4 h-4 text-gray-600" />
                      <span>Account Settings</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link 
                      to="/orders" 
                      className="flex items-center gap-3 cursor-pointer text-sm py-2 px-2 rounded hover:bg-orange-50 transition-colors text-gray-700"
                    >
                      <History className="w-4 h-4 text-gray-600" />
                      <span>Order History</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-gray-100 my-1" />

                  <DropdownMenuItem 
                    onClick={handleLogout} 
                    className="cursor-pointer text-sm py-2 px-2 rounded hover:bg-red-50 transition-colors text-red-600 flex items-center gap-3"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link 
                to="/auth" 
                className="inline-flex items-center gap-2 px-4 h-10 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-gray-100">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <MobileMenu />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Mobile Search - HIDDEN ON HOMEPAGE */}
        {showSearchInHeader && (
          <form onSubmit={handleSearch} className="md:hidden pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 h-10 text-sm rounded-md focus:ring-orange-500 focus:border-orange-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:opacity-80 transition-opacity"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </header>
  );
}
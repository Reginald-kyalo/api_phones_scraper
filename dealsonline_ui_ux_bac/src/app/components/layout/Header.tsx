import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { Heart, Bell, LogOut, LogIn, Menu, Settings, Search, X, Tag, Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import SearchBar from './SearchBar';

export default function Header() {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onBrowse = pathname === '/browse' || pathname.startsWith('/browse/');
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const currentUser = user ? {
    name: user.username || user.email.split('@')[0],
    email: user.email,
  } : null;

  const getInitials = () => {
    const name = currentUser?.name || 'U';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      <header className="bg-white border-b border-border sticky top-0 z-50 w-full">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-14">
            {/* ── Left: Logo + Nav links ── */}
            <div className="flex items-center gap-6">
              {/* Logo */}
              <Link to="/" className="flex items-center gap-2 flex-shrink-0">
                <div className="w-7 h-7 bg-primary rounded flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xs">D</span>
                </div>
                <span className="font-semibold text-[15px] text-foreground hidden sm:block">
                  DealsOnline
                </span>
              </Link>

              {/* Desktop nav links */}
              <nav className="hidden lg:flex items-center gap-1">
                <button
                  onClick={() => navigate(pathname === '/browse' ? '/' : '/browse')}
                  className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    onBrowse
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-gray-50'
                  }`}
                >
                  All categories
                </button>
                <Link
                  to="/deals"
                  className="px-3 py-2 text-sm font-semibold text-destructive hover:text-destructive/80 rounded-md hover:bg-red-50 transition-colors"
                >
                  Sale
                </Link>
                <Link
                  to="/contact"
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-gray-50 transition-colors"
                >
                  About
                </Link>
              </nav>
            </div>

            {/* ── Right: Search + Auth ── */}
            <div className="flex items-center gap-3">
              {/* Desktop Search */}
              <SearchBar
                className="hidden md:block w-[300px] lg:w-[350px]"
                variant="compact"
                placeholder="Search products..."
              />

              {/* Mobile search toggle */}
              <button
                className="md:hidden p-2 rounded-md hover:bg-gray-50 transition-colors"
                onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                aria-label="Search"
              >
                <Search className="w-5 h-5 text-muted-foreground" />
              </button>

              {/* Desktop auth area */}
              <div className="hidden md:flex items-center gap-2">
                {currentUser ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                        <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                          {getInitials()}
                        </div>
                        <span className="text-sm font-medium hidden lg:inline">
                          {currentUser.name.split(' ')[0]}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <div className="px-3 py-2.5 border-b border-border">
                        <p className="text-sm font-medium text-foreground truncate">{currentUser.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
                      </div>
                      <DropdownMenuItem asChild>
                        <Link to="/favorites" className="flex items-center gap-2.5 cursor-pointer">
                          <Heart className="w-4 h-4" /> Favorites
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/alerts" className="flex items-center gap-2.5 cursor-pointer">
                          <Bell className="w-4 h-4" /> Price Alerts
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/account" className="flex items-center gap-2.5 cursor-pointer">
                          <Settings className="w-4 h-4" /> Account
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                        <LogOut className="w-4 h-4 mr-2" /> Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link to="/auth">
                    <Button variant="outline" size="sm" className="gap-1.5 rounded-lg text-sm">
                      Sign in
                    </Button>
                  </Link>
                )}
              </div>

              {/* Mobile hamburger */}
              <div className="md:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Menu className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-72 p-0">
                    <MobileMenu
                      currentUser={currentUser}
                      onLogout={handleLogout}
                    />
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile search bar (expandable) */}
        {mobileSearchOpen && (
          <div className="md:hidden border-t border-border px-4 py-3 bg-white">
            <div className="flex items-center gap-2">
              <SearchBar
                className="flex-1"
                variant="compact"
                placeholder="Search products..."
                onSearch={() => setMobileSearchOpen(false)}
              />
              <button
                onClick={() => setMobileSearchOpen(false)}
                className="p-2 rounded-md hover:bg-gray-50"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}
      </header>

    </>
  );
}

/* ── Mobile menu content ── */
function MobileMenu({
  currentUser,
  onLogout,
}: {
  currentUser: { name: string; email: string } | null;
  onLogout: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* User section */}
      {currentUser ? (
        <div className="px-5 py-4 border-b border-border bg-gray-50">
          <p className="text-sm font-semibold text-foreground">{currentUser.name}</p>
          <p className="text-xs text-muted-foreground">{currentUser.email}</p>
        </div>
      ) : (
        <div className="px-5 py-4 border-b border-border">
          <Link to="/auth" className="inline-flex items-center gap-2 text-sm font-medium text-primary">
            <LogIn className="w-4 h-4" /> Sign in / Register
          </Link>
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 py-2">
        <MobileNavLink to="/" icon={<Search className="w-4 h-4" />} label="Home" />
        <MobileNavLink to="/browse" icon={<Package className="w-4 h-4" />} label="All categories" />
        <MobileNavLink to="/deals" icon={<Tag className="w-4 h-4" />} label="Sale" />
        <div className="mx-5 my-2 border-t border-border" />
        <MobileNavLink to="/contact" label="About" />

        {currentUser && (
          <>
            <div className="mx-5 my-2 border-t border-border" />
            <MobileNavLink to="/favorites" icon={<Heart className="w-4 h-4" />} label="Favorites" />
            <MobileNavLink to="/alerts" icon={<Bell className="w-4 h-4" />} label="Price Alerts" />
            <MobileNavLink to="/account" icon={<Settings className="w-4 h-4" />} label="Account" />
          </>
        )}
      </nav>

      {/* Logout */}
      {currentUser && (
        <div className="border-t border-border px-5 py-3">
          <button
            onClick={onLogout}
            className="flex items-center gap-2.5 text-sm text-destructive hover:text-destructive/80 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function MobileNavLink({ to, icon, label }: { to: string; icon?: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-5 py-2.5 text-sm text-foreground hover:bg-gray-50 transition-colors"
    >
      {icon && <span className="text-muted-foreground">{icon}</span>}
      {!icon && <span className="w-4" />}
      {label}
    </Link>
  );
}
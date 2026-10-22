import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { LogOut, LogIn, Menu, Settings, X, Tag, Clock, Home, UserRound, LayoutGrid } from 'lucide-react';
import { ACCOUNT_AVAILABLE, useAuth } from '../../context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import SearchBar from '../../features/search/components/SearchBar';
import { ThemeSwitch } from './ThemeSwitch';
import Logo from './Logo';
// Both menus carry the whole category tree (~100 KB of data); load it when a
// menu first opens rather than with every page.
const MegaMenu = lazy(() => import('./MegaMenu'));
const MobileCategoryNav = lazy(() => import('../../features/categories/MobileCategoryNav'));
import { MyProductsContent } from '../../features/user/components/MyProducts';
import { useLocalFavorites, useLocalPRAlerts } from '../../hooks/useLocalStorage';

/**
 * On the homepage the hero owns the search. Report whether it is on screen, so
 * the header search can stay out of the way until the hero scrolls off.
 */
function useHeroSearchVisible(isHome: boolean) {
  const [visible, setVisible] = useState(isHome);
  useEffect(() => {
    if (!isHome) {
      setVisible(false);
      return;
    }
    setVisible(true);
    let observer: IntersectionObserver | null = null;
    const watch = (hero: HTMLElement) => {
      observer = new IntersectionObserver(
        ([entry]) => setVisible(entry.isIntersecting),
        // Treat the hero as gone once it passes under the 64px sticky row.
        { rootMargin: '-64px 0px 0px 0px' },
      );
      observer.observe(hero);
    };
    // The homepage is a lazy route, so the hero can mount well after the
    // header. Wait for it rather than guessing a frame.
    const hero = document.getElementById('hero-search');
    let waiting: MutationObserver | null = null;
    if (hero) {
      watch(hero);
    } else {
      waiting = new MutationObserver(() => {
        const found = document.getElementById('hero-search');
        if (found) {
          waiting?.disconnect();
          waiting = null;
          watch(found);
        }
      });
      waiting.observe(document.body, { childList: true, subtree: true });
    }
    return () => {
      waiting?.disconnect();
      observer?.disconnect();
    };
  }, [isHome]);
  return visible;
}

/** Header tool: icon with a label from xl up, and a count in ink when there is one. */
function ToolLink({ to, icon, label, count, active }: {
  to: string; icon: React.ReactNode; label: string; count?: number; active?: boolean;
}) {
  return (
    <Link
      to={to}
      aria-label={count ? `${label} (${count})` : label}
      aria-current={active ? 'page' : undefined}
      className={`relative inline-flex h-10 items-center gap-2 rounded-md px-2.5 text-sm font-medium transition-colors hover:bg-surface-alt hover:text-foreground ${
        active ? 'text-foreground' : 'text-muted-foreground'
      }`}
    >
      <span className="relative" aria-hidden="true">
        {icon}
        {count ? (
          <span className="price-num absolute -right-2 -top-1.5 min-w-4 rounded-full bg-foreground px-1 text-center text-[10px] leading-4 text-background">
            {count > 99 ? '99+' : count}
          </span>
        ) : null}
      </span>
      <span className="hidden xl:inline">{label}</span>
    </Link>
  );
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const heroSearchVisible = useHeroSearchVisible(isHome);
  const { user, logout } = useAuth();
  const { favorites } = useLocalFavorites();
  const { alerts } = useLocalPRAlerts();
  const saved = favorites.length + alerts.length;

  useEffect(() => {
    setMenuOpen(false);
    setSheetOpen(false);
  }, [pathname]);

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

  const browseActive = pathname === '/browse' || pathname.startsWith('/browse/') || pathname.startsWith('/aisle/');

  return (
    <>
      {/* Row 1: logo, search, tools. Sticky. On phones the search drops to its
          own full-width line inside the sticky block, so it never hides behind
          an icon. */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
        <div className="page-container">
          <div className="flex h-14 items-center gap-4 md:h-16 lg:gap-8">
            <Logo size={30} className="gap-2" />

            {/* The one way into categories on desktop: a button after the
                logo opening the full menu. The department row it replaces
                repeated the same links on every page. Phones keep the sheet. */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
              className={`hidden h-10 items-center gap-2 rounded-md px-2.5 text-sm font-medium transition-colors hover:bg-surface-alt hover:text-foreground lg:inline-flex ${
                menuOpen || browseActive ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {menuOpen
                ? <X aria-hidden="true" className="h-5 w-5" />
                : <LayoutGrid aria-hidden="true" className="h-5 w-5" />}
              Categories
            </button>

            {/* Desktop search, centred. On the homepage it waits, invisible but
                still taking its space, until the hero search scrolls away. */}
            <div className="hidden flex-1 justify-center md:flex">
              <SearchBar
                className={`w-full max-w-[600px] transition-opacity duration-150 ease-out ${
                  heroSearchVisible ? 'invisible opacity-0' : 'opacity-100'
                }`}
                variant="header"
              />
            </div>

            <div className="ml-auto flex items-center gap-1 md:ml-0">
              <ToolLink
                to="/deals"
                label="Deals"
                icon={<Tag className="h-5 w-5" />}
                active={pathname === '/deals'}
              />

              {/* One entry point for everything a shopper keeps: recently
                  viewed, favourites and price targets, as tabs in one panel.
                  Separate Alerts and Favourites buttons repeated it. The count
                  is what they have saved, so the button is never a mystery. */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={saved ? `My products (${saved} saved)` : 'My products'}
                    className="relative inline-flex h-10 items-center gap-2 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-alt hover:text-foreground"
                  >
                    <span className="relative" aria-hidden="true">
                      <Clock className="h-5 w-5" />
                      {saved > 0 && (
                        <span className="price-num absolute -right-2 -top-1.5 min-w-4 rounded-full bg-foreground px-1 text-center text-[10px] leading-4 text-background">
                          {saved > 99 ? '99+' : saved}
                        </span>
                      )}
                    </span>
                    <span className="hidden xl:inline">My products</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="p-0">
                  <MyProductsContent />
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Account entry only while an account can actually be created
                  or used (ACCOUNT_AVAILABLE); a static build shows nothing
                  here rather than a door to a form that cannot complete. */}
              <div className="hidden md:flex">
                {!ACCOUNT_AVAILABLE ? null : currentUser ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-10 gap-2 text-muted-foreground hover:text-foreground">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                          {getInitials()}
                        </span>
                        <span className="hidden text-sm font-medium xl:inline">
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
                        <Link to="/account" className="flex items-center gap-2.5 cursor-pointer">
                          <Settings className="w-4 h-4" aria-hidden="true" /> Your account
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                        <LogOut className="w-4 h-4 mr-2" aria-hidden="true" /> Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <ToolLink to="/auth" label="Sign in" icon={<UserRound className="h-5 w-5" />} active={pathname === '/auth'} />
                )}
              </div>

              {/* Phones and tablets: departments and account live in the menu. */}
              <div className="lg:hidden">
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Open menu">
                      <Menu aria-hidden="true" className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-80 p-0 overflow-y-auto">
                    <MobileMenu
                      currentUser={currentUser}
                      onLogout={handleLogout}
                      sheetOpen={sheetOpen}
                      onNavigate={() => setSheetOpen(false)}
                    />
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>

          {/* Phones: search on its own line, always there. The homepage hero
              already puts one at the top of the page. */}
          {!isHome && (
            <div className="pb-3 md:hidden">
              <SearchBar variant="header" />
            </div>
          )}
        </div>

        {/* The category menu drops from the header's bottom edge. */}
        {menuOpen && (
          <Suspense fallback={null}>
            <MegaMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
          </Suspense>
        )}
      </header>

    </>
  );
}

/* ── Mobile menu content ── */
function MobileMenu({
  currentUser,
  onLogout,
  sheetOpen,
  onNavigate,
}: {
  currentUser: { name: string; email: string } | null;
  onLogout: () => void;
  sheetOpen: boolean;
  onNavigate: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* User section, only while accounts work (see ACCOUNT_AVAILABLE). */}
      {!ACCOUNT_AVAILABLE ? null : currentUser ? (
        <div className="px-5 py-4 border-b border-border bg-surface-alt">
          <p className="text-sm font-semibold text-foreground">{currentUser.name}</p>
          <p className="text-xs text-muted-foreground">{currentUser.email}</p>
        </div>
      ) : (
        <div className="px-5 py-4 border-b border-border">
          <Link to="/auth" onClick={onNavigate} className="inline-flex items-center gap-2 text-sm font-medium text-primary">
            <LogIn className="w-4 h-4" aria-hidden="true" /> Sign in
          </Link>
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 py-2">
        <MobileNavLink to="/" icon={<Home className="w-4 h-4" />} label="Home" onNavigate={onNavigate} />

        <div className="mx-5 my-2 border-t border-border" />
        {sheetOpen && (
          <Suspense fallback={null}>
            <MobileCategoryNav enabled={sheetOpen} onNavigate={onNavigate} />
          </Suspense>
        )}

        <div className="mx-5 my-2 border-t border-border" />
        <MobileNavLink to="/deals" icon={<Tag className="w-4 h-4" />} label="Deals" onNavigate={onNavigate} />
        <MobileNavLink to="/about" label="About SokoPulse" onNavigate={onNavigate} />
        <MobileNavLink to="/how-we-make-money" label="How we make money" onNavigate={onNavigate} />
        <MobileNavLink to="/faq" label="Help" onNavigate={onNavigate} />

        {currentUser && (
          <>
            <div className="mx-5 my-2 border-t border-border" />
            <MobileNavLink to="/account" icon={<Settings className="w-4 h-4" />} label="Your account" onNavigate={onNavigate} />
          </>
        )}
      </nav>

      {/* Appearance, reachable without scrolling to the footer (design audit, A06). */}
      <div className="border-t border-border px-5 py-3">
        <ThemeSwitch />
      </div>

      {/* Logout */}
      {currentUser && (
        <div className="border-t border-border px-5 py-3">
          <button
            onClick={onLogout}
            className="flex items-center gap-2.5 text-sm text-destructive hover:text-destructive/80 transition-colors"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function MobileNavLink({ to, icon, label, onNavigate }: {
  to: string; icon?: React.ReactNode; label: string; onNavigate?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="flex items-center gap-3 px-5 py-2.5 text-sm text-foreground hover:bg-surface-alt transition-colors"
    >
      {icon && <span className="text-muted-foreground">{icon}</span>}
      {!icon && <span className="w-4" />}
      {label}
    </Link>
  );
}

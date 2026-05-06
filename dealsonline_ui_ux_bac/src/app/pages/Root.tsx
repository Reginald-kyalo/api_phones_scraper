import { Outlet, useLocation } from 'react-router';
import { useEffect, Suspense } from 'react';
import Header from '../components/layout/Header';
import CategoryStrip from '../components/layout/CategoryStrip';
import Footer from '../components/layout/Footer';
import { Toaster } from '../components/ui/sonner';
import { AuthProvider } from '../context/AuthContext';
import { Skeleton } from '../components/ui/skeleton';
import ErrorBoundary from '../components/ErrorBoundary';
import MyProductsPanel from '../components/MyProductsPanel';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function PageFallback() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      <Skeleton className="h-8 w-48 mb-4" />
      <Skeleton className="h-4 w-96 mb-8" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-[4/3] w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Root() {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-white">
        <ScrollToTop />
        <Header />
        {isHome && <CategoryStrip />}
        <main className="flex-1">
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
        <Footer />
        <MyProductsPanel />
        <Toaster position="top-right" />
      </div>
    </AuthProvider>
  );
}
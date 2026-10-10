import { Outlet, useLocation } from 'react-router';
import { useEffect, Suspense } from 'react';
import { LazyMotion, domAnimation } from 'motion/react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import { Toaster } from '../components/ui/sonner';
import { AuthProvider } from '../context/AuthContext';
import { Skeleton } from '../components/ui/skeleton';
import ErrorBoundary from '../components/common/ErrorBoundary';
import ComparisonBar from '../features/comparison/components/ComparisonBar';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function PageFallback() {
  return (
    <div className="page-container py-8">
      <Skeleton className="h-8 w-48 mb-4" />
      <Skeleton className="h-4 w-96 mb-8" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-square w-full rounded-md" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Root() {
  return (
    <AuthProvider>
      {/* LazyMotion + `m` components keep only the dom-animation feature set in
          the bundle (vs the full `motion` import). All app motion uses `m`. */}
      <LazyMotion features={domAnimation}>
        <div className="min-h-screen flex flex-col bg-background">
          <ScrollToTop />
          <Header />
          <main className="flex-1">
            <ErrorBoundary>
              <Suspense fallback={<PageFallback />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </main>
          <Footer />
          <ComparisonBar />
          <Toaster position="top-right" />
        </div>
      </LazyMotion>
    </AuthProvider>
  );
}
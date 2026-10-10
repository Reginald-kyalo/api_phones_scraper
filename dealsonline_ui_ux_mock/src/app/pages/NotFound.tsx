import { Link } from 'react-router';
import { Seo } from '../components/common/Seo';
import { Button } from '../components/ui/button';
import SearchBar from '../features/search/components/SearchBar';

export default function NotFound() {
  return (
    <div className="prose-container py-20 text-center">
      <Seo title="Page not found" noindex />
      <p className="microcopy-label mb-3">Page not found</p>
      <h1 className="page-title mb-2">We couldn’t find that page</h1>
      <p className="text-sm text-muted-foreground mb-8">
        It may have moved. Search for the product instead, or start from the homepage.
      </p>
      <div className="max-w-md mx-auto mb-6 text-left">
        <SearchBar variant="hero" placeholder="Search any product…" />
      </div>
      <Button variant="outline" asChild>
        <Link to="/">Go to the homepage</Link>
      </Button>
    </div>
  );
}

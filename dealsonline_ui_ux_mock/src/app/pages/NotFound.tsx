import { Link } from 'react-router';
import { Seo } from '../components/common/Seo';
import { Button } from '../components/ui/button';
import SearchBar from '../features/search/components/SearchBar';

export default function NotFound() {
  return (
    <div className="prose-container py-20 text-center">
      <Seo title="Page not found" noindex />
      <h1 className="page-title mb-2">Page not found</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Search for a product or return to the homepage.
      </p>
      <div className="max-w-md mx-auto mb-6 text-left">
        <SearchBar variant="hero" />
      </div>
      <Button variant="outline" asChild>
        <Link to="/">Home</Link>
      </Button>
    </div>
  );
}

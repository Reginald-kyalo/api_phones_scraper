import { Link } from 'react-router';
import { Home, Search } from 'lucide-react';
import { Button } from '../components/ui/button';
import SearchBar from '../features/search/components/SearchBar';

export default function NotFound() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 py-16 text-center">
      <div className="mb-8">
        <h1 className="text-9xl font-bold text-primary/20">404</h1>
        <h2 className="text-2xl font-bold text-foreground mb-2">This page doesn't exist</h2>
        <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
          The page you're looking for may have been moved or no longer exists. Try searching or go back to the homepage.
        </p>
      </div>

      <div className="max-w-md mx-auto mb-8">
        <SearchBar variant="hero" />
      </div>

      <Button variant="outline" asChild>
        <Link to="/">
          <Home className="w-4 h-4 mr-2" />
          Go to homepage
        </Link>
      </Button>
    </div>
  );
}

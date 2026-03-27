import { Link } from 'react-router';
import { Home } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function NotFound() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-16 text-center">
      <div className="mb-8">
        <h1 className="text-9xl font-bold text-gray-300">404</h1>
        <h2 className="text-3xl font-bold mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>

      <Button className="bg-orange-600 hover:bg-orange-700" asChild>
        <Link to="/">
          <Home className="w-5 h-5 mr-2" />
          Back to Home
        </Link>
      </Button>
    </div>
  );
}

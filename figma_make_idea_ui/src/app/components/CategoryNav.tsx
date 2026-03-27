import { Link } from 'react-router';
import { categories } from '../data/mockData';

export default function CategoryNav() {
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-6 overflow-x-auto py-3 scrollbar-hide">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/category/${category.id}`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-orange-50 transition-colors whitespace-nowrap group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">
                {category.emoji}
              </span>
              <span className="font-medium text-gray-700 group-hover:text-orange-600">
                {category.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

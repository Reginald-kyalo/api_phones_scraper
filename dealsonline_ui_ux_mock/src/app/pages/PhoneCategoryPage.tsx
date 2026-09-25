import { Link, Navigate, useParams } from 'react-router';
import { ChevronRight } from 'lucide-react';
import PhoneCategoryChoices from '../components/categories/PhoneCategoryChoices';
import { phoneCategory, phoneCategoryHref, phoneCategoryPath } from '../data/phoneCategories';

export default function PhoneCategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const category = phoneCategory(categoryId);
  if (!category) {
    return <Navigate to="/browse" replace />;
  }
  const path = phoneCategoryPath(category.id);
  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8">
      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1">
          <li><Link to="/browse" className="hover:underline">All categories</Link></li>
          {path.map((part, index) => (
            <li key={part.id} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
              {index === path.length - 1 ? <span aria-current="page" className="text-foreground">{part.label}</span> : (
                <Link to={index === 0 ? `/aisle/${part.id}` : phoneCategoryHref(part.id)} className="hover:underline">{part.label}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-5">{category.label}</h1>
      <PhoneCategoryChoices parentId={category.id} />
      <div className="mt-8 rounded-lg border border-border bg-gray-50 p-5">
        <p className="font-medium text-foreground">Listings are not connected to this category yet.</p>
        <p className="mt-1 text-sm text-muted-foreground">The category is ready to browse; products are still being assigned.</p>
        <Link to="/aisle/phones-wearables" className="mt-3 inline-block text-sm text-link underline">Browse existing phone collections</Link>
      </div>
    </div>
  );
}

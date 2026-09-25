import { Link, useParams } from 'react-router';
import { spineShelfDisplay, taxonomyDepartmentById, type TaxonomyDepartment } from '../data/taxonomyTree';
import { ChevronRight } from 'lucide-react';
import PhoneCategoryChoices from '../components/categories/PhoneCategoryChoices';

function ShelfCollections({ department }: { department: TaxonomyDepartment }) {
  return <div className="space-y-8">
    {department.families.map((family) => (
      <section key={family.id} id={family.id} aria-labelledby={`${department.id}-${family.id}`}>
        <h2 id={`${department.id}-${family.id}`} className="mb-3 text-lg font-semibold text-foreground">{family.label}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {family.shelves.map((shelf) => (
            <Link key={shelf.slug} to={`/shelf/${shelf.slug}`} className="group flex flex-col rounded-xl p-4 ultra-border transition-colors hover:border-primary/40">
              <span className="font-semibold text-foreground">{spineShelfDisplay(shelf)}</span>
              <span className="price-num mt-2 text-2xl font-bold text-foreground">{shelf.count.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">products in this shelf</span>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-teal-deep">Browse <ChevronRight className="h-3 w-3" aria-hidden="true" /></span>
            </Link>
          ))}
        </div>
      </section>
    ))}
  </div>;
}

/**
 * The static-demo equivalent of production's `/aisle/:id`.
 *
 * A design department is a spine id, not a captured `/browse` category. This
 * page exists so the 19-department nav has a real destination in the demo. It
 * shows the same production leaf shelves the API publishes for the department,
 * so the category carousel opens a page with further leaves rather than the
 * old captured-category fallback.
 */
export default function DemoAislePage() {
  const { id } = useParams<{ id: string }>();
  const department = taxonomyDepartmentById(id);

  if (!department) {
    return (
      <div className="bg-white min-h-screen">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-16 text-center">
          <p className="text-base font-medium text-foreground mb-1">No such department</p>
          <p className="text-sm text-muted-foreground mb-4">
            <span className="font-mono">{id}</span> is not one of this demo’s design departments.
          </p>
          <Link to="/browse" className="text-sm text-link hover:text-link-hover underline">
            Browse all categories
          </Link>
        </div>
      </div>
    );
  }

  const { Icon } = department;
  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8">
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <Link to="/browse" className="hover:text-foreground">All categories</Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span aria-current="page" className="text-foreground font-medium">{department.label}</span>
        </nav>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl ultra-border flex items-center justify-center">
            <Icon className="w-6 h-6 text-teal-deep" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{department.label}</h1>
            <p className="text-sm text-muted-foreground">
              {department.n_shelves.toLocaleString()} captured shelves, organised for easier browsing
            </p>
          </div>
        </div>

        {department.id === 'phones-wearables' && (
          <>
            <h2 className="mb-3 text-lg font-semibold text-foreground">Shop by product type</h2>
            <PhoneCategoryChoices parentId="phones-wearables" />
            <details className="mt-8 border-t border-border pt-6">
              <summary className="cursor-pointer text-lg font-semibold text-foreground">Existing collections</summary>
              <p className="mb-5 text-sm text-muted-foreground">These source shelves retain their original links while products are assigned to the new categories. Some collections contain more than one product type.</p>
              <ShelfCollections department={department} />
            </details>
          </>
        )}
        {department.id !== 'phones-wearables' && <ShelfCollections department={department} />}
      </div>
    </div>
  );
}

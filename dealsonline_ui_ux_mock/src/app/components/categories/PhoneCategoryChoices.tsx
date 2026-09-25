import { Link } from 'react-router';
import { phoneCategoryHref, phoneChildren } from '../../data/phoneCategories';

/** Approved product-type navigation. Source shelves are shown separately. */
export default function PhoneCategoryChoices({ parentId }: { parentId: string }) {
  const children = phoneChildren(parentId);
  if (!children.length) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {children.map((child) => (
        <section key={child.id} className="rounded-xl p-4 ultra-border">
          <Link to={phoneCategoryHref(child.id)} className="font-semibold text-foreground hover:text-link hover:underline">
            {child.label}
          </Link>
          {child.kind === 'shortcut' && <span className="ml-2 text-xs text-muted-foreground">Shortcut · listings pending</span>}
          {phoneChildren(child.id).length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              {phoneChildren(child.id).map((grandchild) => (
                <li key={grandchild.id}>
                  <Link to={phoneCategoryHref(grandchild.id)} className="text-sm text-muted-foreground hover:text-link hover:underline">
                    {grandchild.label}
                    {grandchild.kind === 'shortcut' && <span className="sr-only"> shortcut, listings pending</span>}
                  </Link>
                  {phoneChildren(grandchild.id).filter((node) => node.kind === 'shortcut').map((shortcut) => (
                    <Link key={shortcut.id} to={phoneCategoryHref(shortcut.id)} className="ml-2 text-xs text-link hover:underline">
                      {shortcut.label} <span className="text-muted-foreground">· pending</span><span className="sr-only"> listings</span>
                    </Link>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

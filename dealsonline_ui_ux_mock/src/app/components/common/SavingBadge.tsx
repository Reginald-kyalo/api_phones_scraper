import { ArrowDown } from 'lucide-react';
import type { DisplaySaving } from '../../lib/format';

/**
 * The only saving chip on the site (DESIGN_RULES.md §5). One icon, one wording,
 * one colour. Pass the result of `displaySaving()` / `clusterSaving()`; a null
 * saving renders nothing, so callers never need their own guard.
 */
export function SavingBadge({
  saving,
  className = '',
}: {
  saving: DisplaySaving | null;
  className?: string;
}) {
  if (!saving) return null;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-md bg-saving/10 px-1.5 py-0.5 text-xs font-semibold text-saving ${className}`}
    >
      <ArrowDown className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
      Save {saving.pct}%
    </span>
  );
}

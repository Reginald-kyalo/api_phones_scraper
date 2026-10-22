import { ArrowDown } from 'lucide-react';
import type { DisplaySaving } from '../../lib/format';

/**
 * The only price-difference chip on the site (DESIGN_RULES.md §5). One icon,
 * one wording, one colour. Pass the result of `displaySaving()` /
 * `clusterSaving()`; a null value renders nothing, so callers never need
 * their own guard.
 *
 * It reads "18% lower", not "Save 18%": the number is the gap between the
 * cheapest and the dearest shop for the same version, not a discount from an
 * earlier price. The basis travels with it for screen readers and in the
 * tooltip, so the chip is never a bare claim.
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
      title="Compared with the highest matching price shown"
      className={`inline-flex items-center gap-0.5 rounded-md bg-saving/10 px-1.5 py-0.5 text-xs font-semibold text-saving ${className}`}
    >
      <ArrowDown className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
      {saving.pct}% lower
      <span className="sr-only"> than the highest matching price shown</span>
    </span>
  );
}

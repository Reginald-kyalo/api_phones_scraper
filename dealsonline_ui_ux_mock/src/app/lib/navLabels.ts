/**
 * Display-only labels for navigation built from the taxonomy review.
 *
 * The review files a family it has not placed yet as `needs-review` /
 * "Needs Review". That is pipeline vocabulary (DESIGN_RULES.md §6): a shopper
 * sees "Other" instead. The data keeps its own label, which the taxonomy
 * tests assert on.
 */
export function familyDisplayLabel(family: { id: string; label: string }): string {
  return family.id === 'needs-review' ? 'Other' : family.label;
}

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

/** Render a shop-written browse-node label without echoing its ALL-CAPS form. */
export function browseLabel(node: { slug: string; label: string | null }): string {
  const raw = (node.label ?? '').trim();
  if (!raw) return node.slug;
  if (raw === raw.toUpperCase() && /[A-Z]{2,}/.test(raw)) {
    return raw.toLowerCase().replace(/(^|[\s/()-])([a-z])/g, (_: string, sep: string, ch: string) => sep + ch.toUpperCase());
  }
  if (raw === raw.toLowerCase()) return raw.replace(/^[a-z]/, (c) => c.toUpperCase());
  return raw;
}

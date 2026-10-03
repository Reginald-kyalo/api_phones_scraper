/** Pure validation helpers for collection-navigation fixtures and runtime data. */
export type ShelfCapture = Record<string, readonly { slug: string }[]>;

export function validateReviewedTaxonomyInputs(
  captures: ShelfCapture,
  placementSlugs: readonly string[],
  reviewedSourceDepartments: ReadonlySet<string>,
): void {
  const placements = new Set(placementSlugs);
  const capturedSlugs = Object.values(captures).flatMap((shelves) => shelves.map((shelf) => shelf.slug));
  const captured = new Set(capturedSlugs);

  for (const sourceId of reviewedSourceDepartments) {
    for (const shelf of captures[sourceId] ?? []) {
      if (!placements.has(shelf.slug)) {
        throw new Error(`Reviewed taxonomy shelf has no disposition: ${sourceId}/${shelf.slug}`);
      }
    }
  }

  const staleDisposition = placementSlugs.find((shelfSlug) => !captured.has(shelfSlug));
  if (staleDisposition) {
    throw new Error(`Taxonomy disposition refers to a missing captured shelf: ${staleDisposition}`);
  }
}

export const shouldRetainTaxonomyDepartment = (departmentId: string, familyCount: number): boolean =>
  departmentId === 'phones-wearables' || familyCount > 0;

export function createCollectionDetector(collectionSlugs: Iterable<string>) {
  const knownCollections = new Set(collectionSlugs);
  return (slug: string | undefined, ancestorSlugs: readonly string[] = []): boolean => Boolean(
    (slug && knownCollections.has(slug))
    || ancestorSlugs.some((ancestor) => knownCollections.has(ancestor)),
  );
}

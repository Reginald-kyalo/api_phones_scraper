/**
 * Photo rules (DESIGN_RULES.md §5).
 *
 * Retailer CDNs can hotlink-block at view time even when the capture-time URL
 * was healthy, so a host that consistently refuses browser requests counts as
 * "no photo" for placement decisions.
 */
const BLOCKED_IMAGE_HOSTS = new Set(['pictures-kenya.jijistatic.com']);

export function imageUsable(image?: string | null): image is string {
  if (!image) return false;
  try {
    return !BLOCKED_IMAGE_HOSTS.has(new URL(image).hostname);
  } catch {
    return false;
  }
}

/**
 * The best photo a product has: the first candidate from a host that serves
 * images, falling back to the primary image. Null when there is none.
 */
export function bestImage(row: { image?: string | null; image_candidates?: string[] | null }): string | null {
  return row.image_candidates?.find(imageUsable) ?? (imageUsable(row.image) ? row.image : null);
}

/**
 * Cards without a photo never lead a list: they keep their relative order but
 * sort after every card that has one. Stable, so a ranked list stays ranked.
 */
export function withPhotosFirst<T extends { image?: string | null }>(rows: T[]): T[] {
  return [...rows.filter((r) => imageUsable(r.image)), ...rows.filter((r) => !imageUsable(r.image))];
}

import release from './phoneNavigation.json';

export interface PhoneCategory {
  id: string;
  label: string;
  parentId: string | null;
  kind: 'category' | 'shortcut';
  synonyms: string[];
}

export const PHONE_NAVIGATION_SOURCE = release.source_sha256;
export const PHONE_CATEGORIES: PhoneCategory[] = release.nodes as PhoneCategory[];
const byId = new Map(PHONE_CATEGORIES.map((node) => [node.id, node]));

export function phoneCategory(id: string | undefined): PhoneCategory | undefined {
  return id ? byId.get(id) : undefined;
}

export function phoneChildren(parentId: string): PhoneCategory[] {
  return PHONE_CATEGORIES.filter((node) => node.parentId === parentId);
}

export function phoneCategoryPath(id: string): PhoneCategory[] {
  const path: PhoneCategory[] = [];
  let current = byId.get(id);
  while (current) {
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}

export function phoneCategoryHref(id: string): string {
  return `/category/${encodeURIComponent(id)}`;
}

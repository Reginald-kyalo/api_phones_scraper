/** Shared published taxonomy for desktop and mobile navigation. */
import { useEffect, useState } from 'react';
import { spineHierarchyApi, type SpineHierarchyNode } from '../../lib/api';

let cachedHierarchy: SpineHierarchyNode[] | null = null;

export function useCategoryTree(enabled: boolean) {
  const [departments, setDepartments] = useState<SpineHierarchyNode[]>(cachedHierarchy ?? []);
  const [loading, setLoading] = useState(enabled && !cachedHierarchy);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled || cachedHierarchy) return;
    let cancelled = false;
    setLoading(true);
    spineHierarchyApi.get()
      .then((response) => {
        if (cancelled) return;
        cachedHierarchy = response.results;
        setDepartments(response.results);
        setFailed(false);
      })
      .catch(() => !cancelled && setFailed(true))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [enabled]);

  return { departments, loading, failed };
}

export function findHierarchyNode(nodes: SpineHierarchyNode[], id: string | undefined): SpineHierarchyNode | null {
  if (!id) return null;
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findHierarchyNode(node.children, id);
    if (child) return child;
  }
  return null;
}

export function hierarchyPath(
  nodes: SpineHierarchyNode[], id: string | undefined, trail: SpineHierarchyNode[] = [],
): SpineHierarchyNode[] {
  if (!id) return [];
  for (const node of nodes) {
    const next = [...trail, node];
    if (node.id === id) return next;
    const found = hierarchyPath(node.children, id, next);
    if (found.length) return found;
  }
  return [];
}

/**
 * One source of category data for every navigation surface.
 *
 * ⛔⛔ WHY THIS EXISTS. The desktop panel and the mobile sheet show the SAME departments, and the
 * first version of the panel owned its fetch, its module-level cache and its top-N cut privately.
 * Building the mobile surface against that would have meant a second copy of all three — and a
 * second place to drift, which is exactly how the two category trees in this repo came to
 * disagree in the first place.
 *
 * ⭐⭐ THE TOP-N CUT IS GONE, AND THAT IS THE POINT OF THIS PASS. `useDepartments` used to take
 * the top 12 of ~529 browsable roots ordered by subtree stock. It now reads the 21 RULED
 * departments from `/clusters/departments`, so there is no cut to get wrong. The defect that
 * retires with it was real and shipped: ordering those roots on OWN stock instead of subtree
 * stock swapped six of the twelve, cutting `Electronics & Computers` (20,772 clusters) in favour
 * of `Battery Chargers` (553, one shop), and four correct departments held zero stock of their
 * own so were invisible entirely.
 *
 * ⛔ THE SPINE IS NOT THE WHOLE CATALOGUE. Measured: 21 departments reach ~45% of placed
 * clusters. The other 55% — chiefly `phone-tablet`'s 19,286 undifferentiated clusters — stay
 * reachable at `/shelf`. **Every surface using this hook must keep its "All categories" link.**
 *
 * ⭐ The cache is MODULE-LEVEL, not per-component, so opening the sheet after the panel costs
 * nothing. The server caches the spine for 300s, so a re-fetch per surface would buy staleness
 * we cannot act on anyway.
 *
 * ⛔ `useChildren` WAS DELETED WITH THIS PASS, NOT LEFT SPARE. Both surfaces now expand a
 * department into its ADOPTED SHELVES, so nothing called it — and an exported hook nothing calls
 * is the same defect this file's own history records twice over (a panel nothing mounted, a tree
 * nothing queried). `ShelfPage` walks node children through `browseApi.getTree` directly, which
 * is where that belongs.
 */
import { useEffect, useState } from 'react';
import { departmentApi, type BrowseNode, type Department } from '../../lib/api';

let _departments: Department[] | null = null;
const _shelves: Record<string, BrowseNode[]> = {};

/** The ruled departments, in EDITORIAL order. `enabled` defers until a surface opens. */
export function useDepartments(enabled: boolean) {
  const [departments, setDepartments] = useState<Department[]>(_departments ?? []);
  const [loading, setLoading] = useState(!_departments);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled || _departments) return;
    let cancelled = false;
    setLoading(true);
    departmentApi
      .list()
      .then((res) => {
        if (cancelled) return;
        // ⛔ NO `.slice()`. The spine is 21 rows because a person ruled 21; a client-side cut
        // would silently re-introduce the editorial decision this endpoint exists to own.
        _departments = res.results;
        setDepartments(_departments);
        setFailed(false);
      })
      // ⛔ A dead spine must not be a dead menu. Surfaces render a route to `/shelf` instead of
      // trapping the user in an empty overlay — the tree is still there when the spine is not.
      .catch(() => !cancelled && setFailed(true))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [enabled]);

  return { departments, loading, failed };
}

/**
 * The shelves one department adopts, for a panel column or an accordion.
 *
 * ⭐ READS `/by-department` WITH `limit=1`, NOT the tree. A department spans up to six adopted
 * shelves that are NOT siblings and often not even in the same branch — `Laptops` adopts three
 * `Laptops` nodes under three different parents — so no single `browse-tree` call can produce
 * this list. The one product row is the cheapest way to ask; the payload we want is `shelves`.
 */
export function useShelves(id: string | null) {
  const [shelves, setShelves] = useState<BrowseNode[]>(id ? _shelves[id] ?? [] : []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) { setShelves([]); return; }
    if (_shelves[id]) { setShelves(_shelves[id]); return; }
    let cancelled = false;
    setLoading(true);
    departmentApi
      .getClusters(id, { limit: 1 })
      .then((res) => {
        if (cancelled) return;
        _shelves[id] = res.shelves;
        setShelves(res.shelves);
      })
      .catch(() => !cancelled && setShelves([]))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [id]);

  return { shelves, loading };
}

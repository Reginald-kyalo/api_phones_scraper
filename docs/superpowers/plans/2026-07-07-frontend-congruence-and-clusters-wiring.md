# Frontend Congruence Pass + Live Clusters Wiring — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix every verified defect from the 2026-07-07 design/functionality review and put the first live cluster-backed surfaces (real Kenyan cross-store deals + a cluster price-comparison page) into the UI, so new components/pages are built on honest live data instead of mocks.

**Architecture:** Two phases. Phase A is a congruence pass on existing pages — currency, brand color leaks, a11y, data guards — with no data-source changes. Phase B introduces the clusters API surfaces: the Deals page is rewritten onto `clustersApi.getDeals` and a new `/prices/:clusterId` page renders `clustersApi.getDetail` with the honest-price contract (condition_basis, data_warning, like-for-like spread, per-store click-through URLs).

**Tech Stack:** React 18 + Vite + Tailwind v4 + shadcn/ui, react-router v7 (`react-router` package), FastAPI backend at `/api` via Vite proxy → `http://localhost:10000`.

## Global Constraints

- **No unit-test runner exists** in `dealsonline_ui_ux` (scripts: `dev`, `build`, `preview`, `type-check` only). Verification per task = `npm run type-check` (exit 0, no output) + `npm run build` (ends `✓ built in …`) + the live check named in the task. Do not add a test framework.
- **Currency:** every rendered price goes through `formatPrice` / `shopLabel` from `src/app/lib/format.ts`. Never hardcode `£` or `KES`.
- **Brand rules** (from DESIGN_HANDOFF.md / theme.css): teal is the brand + savings color (`--primary`, utilities `text-teal-deep`, `bg-teal/10`, `--teal-bright` on dark). Red (`destructive`) only for genuinely destructive actions. Flat 1px borders (`.ultra-border`), 100–150 ms transitions, no scale hovers. Prices use `.price-num` (mono, tabular). Tiny uppercase labels use `.microcopy-label`.
- **Honest-price contract** (clusters API, see comment block at `src/app/lib/api.ts:364-382`): `data_warning != null` ⇒ render the caveat, never a clean headline; `condition_basis === "likely_used"` ⇒ the headline price is a refurb/used asking price and must be labeled as such; `comparison_grade === false` ⇒ accessory, do not frame as a reliable cross-store deal; prefer `like_for_like_spread_pct` over `cross_store_spread_pct`.
- **Cluster ids are their own id space** (e.g. `laptops::apple::macbook-m2::air`) and are NOT PriceRunner product ids. Never feed a `/pr/*` product id to `clustersApi.getDetail`.
- **Backend for live checks:** run from repo root: `apienv/bin/uvicorn app.main:app --port 10000 --host 127.0.0.1` (needs MongoDB + Redis). Frontend: `cd dealsonline_ui_ux && npm run dev` (port 5173) or `npm run build && npx vite preview --port 4173`.
- **Screenshots** (no node playwright): `google-chrome --headless --no-sandbox --virtual-time-budget=6000 --screenshot=/tmp/x.png --window-size=1440,900 <url>`.
- Work on branch `clusters-api`. Commit after every task. All paths below are relative to `dealsonline_ui_ux/` unless they start with `docs/` or `app/`.

---

## Phase A — Congruence & correctness fixes

### Task 1: Commit the clustersApi client (already written, uncommitted)

`src/app/lib/api.ts` already contains the `clustersApi` block (+103 lines, uncommitted): typed `ClusterStore` / `ClusterConfig` / `ClusterView` / `ClusterSummary` / `ClusterDetail` and methods `getDeals`, `search`, `getDetail`. Nothing to write — verify and commit it so later tasks build on a committed baseline.

**Files:**
- Commit: `src/app/lib/api.ts` (working-tree change)

**Interfaces:**
- Produces: `clustersApi.getDeals(options?) → Promise<{count: number; results: ClusterSummary[]}>`, `clustersApi.search(q, options?)`, `clustersApi.getDetail(clusterId) → Promise<ClusterDetail>` — consumed by Tasks 7 and 8.

- [ ] **Step 1: Verify the block exists and typechecks**

Run: `grep -c "clustersApi" src/app/lib/api.ts && npm run type-check`
Expected: count ≥ 1; type-check exits 0 with no output.

- [ ] **Step 2: Verify one live endpoint answers**

Run: `curl -s "http://127.0.0.1:10000/api/clusters/deals?limit=1" | head -c 200`
Expected: JSON starting `{"count":` with a `results` array (start the backend first if connection refused).

- [ ] **Step 3: Commit**

```bash
git add dealsonline_ui_ux/src/app/lib/api.ts
git commit -m "feat(ui): typed clustersApi client for /api/clusters endpoints"
```

---

### Task 2: Currency sweep — route every price through formatPrice

`£` is hardcoded in 9 component files while the site is KES. `formatPrice(value)` returns `"KES 12,999"` (or `"Price N/A"` for null/junk `< 1`), so surrounding copy like `£{x} away` becomes `{formatPrice(x)} away`.

**Files (every `£` occurrence, from a verified grep):**
- Modify: `src/app/features/user/components/MyProductsPanel.tsx:101-102`
- Modify: `src/app/features/product/components/PriceHistoryChart.tsx:85,90,111,121,131`
- Modify: `src/app/features/product/components/StoreComparisonList.tsx:56`
- Modify: `src/app/features/comparison/components/ComparisonAddPanel.tsx:163`
- Modify: `src/app/features/alerts/components/PriceAlertDialog.tsx:43,67,120,164`
- Modify: `src/app/features/alerts/components/PriceAlertRow.tsx:71,75,83,92,113,122`
- Modify: `src/app/features/product/components/ProductCard.tsx:78,178`
- Modify: `src/app/pages/ComparisonPage.tsx:192`
- Modify: `src/app/features/product/components/ProductHero.tsx:118`

**Interfaces:**
- Consumes: `formatPrice(value: number | null | undefined): string` from `src/app/lib/format.ts` (already exists).

- [ ] **Step 1: Replace each occurrence**

In each file add the import if missing:

```tsx
import { formatPrice } from '../../../lib/format'; // depth varies: pages use '../lib/format'
```

Exact replacements (pattern is identical everywhere — shown per file):

`MyProductsPanel.tsx:101-102`
```tsx
? `✓ Target ${formatPrice(alert.targetPrice)} reached!`
: `Target: ${formatPrice(alert.targetPrice)}`
```

`PriceHistoryChart.tsx:85` → `tickFormatter={(v: number) => formatPrice(v)}`
`PriceHistoryChart.tsx:90` → `formatter={(value: number) => [formatPrice(value), 'Price']}`
`PriceHistoryChart.tsx:111,121,131` → `<span className="text-xl font-bold text-foreground price-num">{formatPrice(historyStats.min)}</span>` (same for `.max`, `.avg`)

`StoreComparisonList.tsx:56` → `{formatPrice(store.price)}` (also add `price-num` to that span's className)

`ComparisonAddPanel.tsx:163` → `{p.price > 0 ? formatPrice(p.price) : 'N/A'}`

`PriceAlertDialog.tsx:43` → `` `We'll notify you when ${product.name} drops to ${formatPrice(Math.max(minPrice, price))}` ``
`PriceAlertDialog.tsx:67` → `{formatPrice(product.price)}`
`PriceAlertDialog.tsx:120,164` — the input adornment: replace `£` text with `KES` (keep positioning classes).

`PriceAlertRow.tsx:71,75` → `{formatPrice(alert.targetPrice)}` / `{formatPrice(alert.currentPrice)}`
`PriceAlertRow.tsx:83` → `` `${formatPrice(alert.currentPrice - alert.targetPrice)} away from target` ``
`PriceAlertRow.tsx:92` → `Price dropped to {formatPrice(alert.currentPrice)}!`
`PriceAlertRow.tsx:113` → `<Label htmlFor="editPrice">Target price (KES)</Label>`
`PriceAlertRow.tsx:122` → `Current price: {formatPrice(alert.currentPrice)}`

`ProductCard.tsx:78,178` → `{product.price > 0 ? formatPrice(product.price) : 'Price N/A'}` (delete the ternary's duplicate `£` branch)

`ComparisonPage.tsx:192` → `{item.price > 0 ? formatPrice(item.price) : 'N/A'}`

`ProductHero.tsx:118` → `{formatPrice(product.price)}` (formatPrice already handles the `> 0` guard — drop the ternary) and add `price-num` to the span's className.

- [ ] **Step 2: Verify no `£` remains outside format.ts**

Run: `grep -rn "£" src --include="*.tsx" --include="*.ts" | grep -v "lib/format.ts"`
Expected: no output.

- [ ] **Step 3: Type-check and build**

Run: `npm run type-check && npm run build`
Expected: both succeed.

- [ ] **Step 4: Visual spot-check**

With preview running: screenshot `http://127.0.0.1:4173/product/3431242039` — hero shows `KES …`, store rows show `KES …`, chart Y-axis shows `KES …`.

- [ ] **Step 5: Commit**

```bash
git add dealsonline_ui_ux/src
git commit -m "fix(ui): KES sweep — all prices through formatPrice, no hardcoded pounds"
```

---

### Task 3: Fix the mock store generator so "Best price" is actually lowest

Verified bug: `generateStores` in `src/app/data/mockServices.ts` draws per-store prices at `0.85–1.15×` of `product.price` (line 61), sorts ascending, then overwrites `stores[0].price = product.price` (line 76). When other stores drew below `product.price`, the pinned "cheapest" row is the most expensive — and `StoreComparisonList` badges `idx === 0` as "Best price". Fix: variance floor 1.0 so no fake store can undercut the real known-lowest price.

**Files:**
- Modify: `src/app/data/mockServices.ts:61`

- [ ] **Step 1: Change the variance range**

```ts
const variance = 1 + rand() * 0.3; // 1.00 – 1.30x — never undercut the real best price
```

(Leave the sort + pin at lines 74-76 as-is; the pin is now a no-op safety.)

- [ ] **Step 2: Verify ordering on the live page**

Run type-check, build, restart preview, then screenshot `http://127.0.0.1:4173/product/3431242039`.
Expected: the first store row (badged "Best price") has the lowest price on the page; every following row is ≥ it.

- [ ] **Step 3: Commit**

```bash
git add dealsonline_ui_ux/src/app/data/mockServices.ts
git commit -m "fix(ui): mock stores can no longer undercut the real best price"
```

---

### Task 4: Guard junk product types at the client boundary

Verified: `GET /api/pr/product-types` returns one row with empty `id` and empty `label` (junk Mongo doc), which renders as a blank icon-only sidebar button on `/browse` and `/browse/:productType`. Filter once in the API client so every consumer is covered.

**Files:**
- Modify: `src/app/lib/api.ts` — `pricerunnerApi.getProductTypes` (near line 303)

- [ ] **Step 1: Filter empty rows in the client**

```ts
getProductTypes: () =>
  request<{ productTypes: PRProductType[] }>('/pr/product-types').then((res) => ({
    // The backend feed contains a junk row with empty id/label — never render it.
    productTypes: res.productTypes.filter((t) => t.id?.trim() && t.label?.trim()),
  })),
```

- [ ] **Step 2: Verify**

Run: `npm run type-check`, rebuild, then screenshot `http://127.0.0.1:4173/browse`.
Expected: sidebar has no blank row between "Sound & Vision" and "Photography"; 15 API rows → 14 rendered.

- [ ] **Step 3: Commit**

```bash
git add dealsonline_ui_ux/src/app/lib/api.ts
git commit -m "fix(ui): drop empty-id product types at the client boundary"
```

---

### Task 5: Brand alignment — retire off-palette leaks

Four verified leaks of non-brand color/identity on inner pages. (Deals-page styling is NOT touched here — Task 7 rewrites that page.)

**Files:**
- Modify: `src/app/features/product/components/PriceHistoryChart.tsx` (chartConfig at top of file)
- Modify: `src/app/features/product/components/StoreComparisonList.tsx:35`
- Modify: `src/app/features/product/components/ProductHero.tsx:79-81`
- Modify: `src/app/pages/AuthPage.tsx:14-17`
- Modify: `src/app/features/auth/components/LoginForm.tsx` (GitHub button, ~line 113-119)
- Modify: `src/app/features/auth/components/RegisterForm.tsx` (GitHub button, ~line 159-165)

- [ ] **Step 1: Price-history chart → teal**

In `PriceHistoryChart.tsx`, find the `chartConfig` object near the top of the file and set the price series color to the brand token:

```ts
const chartConfig = {
  price: { label: 'Price', color: 'var(--primary)' },
} satisfies ChartConfig;
```

(Only the `color` value changes; the gradient and stroke already read `var(--color-price)` which ChartContainer derives from this config.)

- [ ] **Step 2: "Best price" badge green → teal**

`StoreComparisonList.tsx:35`:

```tsx
<Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-teal/10 text-teal-deep border-primary/20">
  Best price
</Badge>
```

- [ ] **Step 3: Favorite heart red → teal active state**

`ProductHero.tsx:79-81` — replace the className ternary:

```tsx
className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all ultra-border ${
  isFav ? 'bg-teal/10 text-teal-deep border-primary/30' : 'bg-white text-gray-400 hover:text-teal-deep'
}`}
```

- [ ] **Step 4: Auth page — brand mark instead of generic "D", drop GitHub login**

`AuthPage.tsx:14-17` — replace the squircle div with the real logo mark:

```tsx
import Logo from '../components/layout/Logo';
// …
<div className="text-center mb-8">
  <Logo showWordmark={false} size={56} className="mb-4" />
  <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to DealsOnline</h1>
  <p className="text-sm text-muted-foreground">Sign in to sync your data across devices</p>
</div>
```

In `LoginForm.tsx` (container at line 104) and `RegisterForm.tsx` (container at line 150), delete the entire GitHub `<Button>…</Button>` block (the one wrapping the GitHub SVG path + the text `GitHub`, ends `LoginForm.tsx:119` / `RegisterForm.tsx:165`) and change each container from `<div className="grid grid-cols-2 gap-3">` to `<div className="grid grid-cols-1 gap-3">` so the Google button spans full width. GitHub sign-in is a developer-platform leftover with no place on a consumer shopping site.

- [ ] **Step 5: Verify**

Run: `npm run type-check && npm run build`; screenshot `/auth` (logo mark, single Google button) and `/product/3431242039` (teal chart, teal Best-price badge).

- [ ] **Step 6: Commit**

```bash
git add dealsonline_ui_ux/src
git commit -m "fix(ui): brand alignment — teal chart/badges/fav, Logo on auth, drop GitHub login"
```

---

### Task 6: Propagate the homepage a11y pass to the product page

Live audit of `/product/:id` found 12 violations (1 critical) — same classes already fixed on the homepage: unnamed icon button, `<button>` nested in `<a>`/`<Link>`, breadcrumb `<span>` children inside `<ol>`, low-contrast store avatars.

**Files:**
- Modify: `src/app/features/product/components/ProductHero.tsx:64-84` (heart), `:171-178` (Link+Button)
- Modify: `src/app/features/product/components/StoreComparisonList.tsx:23-28` (avatar), `:58-67` (a+Button)
- Modify: `src/app/pages/ProductDetailsPage.tsx:161-162` (breadcrumb spans)

- [ ] **Step 1: Name the heart button**

`ProductHero.tsx` — add to the favorite `<button>`:

```tsx
aria-label={isFav ? 'Remove from favorites' : 'Save to favorites'}
aria-pressed={isFav}
```

- [ ] **Step 2: Un-nest Button-in-Link (ProductHero)**

Replace lines 171-178 with `asChild` so one anchor is the interactive element:

```tsx
<Button asChild variant="outline" size="lg" className="gap-1 ultra-border">
  <Link to={`/browse/${product.productType}?cat=${encodeURIComponent(product.categoryUrl)}`}>
    More in {product.categoryName}
    <ChevronRight className="h-4 w-4" aria-hidden="true" />
  </Link>
</Button>
```

- [ ] **Step 3: Un-nest Button-in-anchor (StoreComparisonList)**

Replace the `<a><Button>Go to shop…</Button></a>` block (lines 58-67) with:

```tsx
<Button asChild size="sm" className="text-xs h-8 px-4">
  <a href={product.productUrl || '#'} target="_blank" rel="noopener noreferrer">
    Go to shop
    <ExternalLink className="h-3 w-3 ml-1" aria-hidden="true" />
  </a>
</Button>
```

- [ ] **Step 4: Fix store avatar contrast**

`StoreComparisonList.tsx:23-28` — drop the per-store random background (2.43:1 with white text); use the brand-dark neutral:

```tsx
<div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-foreground text-background font-bold text-sm">
  {store.logo}
</div>
```

(Delete the `style={{ backgroundColor: store.color }}` prop.)

- [ ] **Step 5: Fix breadcrumb list semantics**

`ProductDetailsPage.tsx:161-162` — `<ol>` children must be `<li>`; `display: contents` spans don't satisfy semantics. Replace the wrapper:

```tsx
import { Fragment } from 'react';
// …
{product.categoryPath.map((segment: string, i: number) => (
  <Fragment key={i}>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
    …
  </Fragment>
))}
```

(Only the `<span className="contents">` → `<Fragment>` wrapper changes; the inner conditional stays.)

- [ ] **Step 6: Verify with a live audit**

Build + preview, then run the accesslint scan (`/accesslint:scan http://127.0.0.1:4173/product/3431242039`, wait for `h1`).
Expected: 0 violations (was 12).

- [ ] **Step 7: Commit**

```bash
git add dealsonline_ui_ux/src
git commit -m "fix(a11y): product page — named controls, un-nested interactives, breadcrumb semantics, avatar contrast"
```

---

## Phase B — Live clusters surfaces

### Task 7: Rewrite the Deals page onto clustersApi.getDeals

Verified: the current page calls `productsApi.getDeals(120)` but the backend caps `limit ≤ 50` → 422, swallowed by an empty catch → dishonest "0 products" empty state; and the legacy `/products/deals` data is junk (0.1-priced accessories) anyway. Rewrite the page on the clusters deals feed — real like-for-like cross-store deals in KES — with honest loading/error/empty states.

**Files:**
- Create: `src/app/features/clusters/components/ClusterDealCard.tsx`
- Rewrite: `src/app/pages/DealsPage.tsx`

**Interfaces:**
- Consumes: `clustersApi.getDeals({ limit: 50, minStores: 2 })` (Task 1); `formatPrice`, `shopLabel`.
- Produces: `<ClusterDealCard cluster={ClusterSummary} />` linking to `/prices/:clusterId` (route added in Task 8 — build order note: Task 7's links 404 until Task 8 lands; ship Tasks 7+8 together on the branch).

- [ ] **Step 1: Create ClusterDealCard**

`src/app/features/clusters/components/ClusterDealCard.tsx`:

```tsx
import { Link } from 'react-router';
import { TrendingDown, AlertTriangle } from 'lucide-react';
import { type ClusterSummary } from '../../../lib/api';
import { formatPrice, shopLabel } from '../../../lib/format';

/**
 * Text-first deal card for a cross-store cluster (the feed carries no images).
 * Honest-price contract: label refurb/used headlines, surface data_warning.
 */
export function ClusterDealCard({ cluster }: { cluster: ClusterSummary }) {
  const name = cluster.display_name ?? cluster.title;
  const spread = cluster.like_for_like_spread_pct;
  const likelyUsed = cluster.condition_basis === 'likely_used';

  return (
    <Link
      to={`/prices/${encodeURIComponent(cluster.cluster_id)}`}
      className="flex flex-col rounded-xl p-4 ultra-border hover:border-primary/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="microcopy-label">{cluster.brand ?? cluster.category ?? 'Product'}</p>
        {spread != null && spread > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-deep bg-teal/10 rounded px-1.5 py-0.5">
            <TrendingDown className="h-3 w-3" aria-hidden="true" />
            {Math.round(spread)}%
          </span>
        )}
      </div>
      <h3 className="font-semibold text-sm text-foreground mt-1 line-clamp-2">{name}</h3>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="price-num text-lg font-bold text-foreground">{formatPrice(cluster.best_price)}</span>
        <span className="text-xs text-muted-foreground">
          {likelyUsed ? 'used/refurb asking' : 'lowest new price'}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {[cluster.cheapest_store, shopLabel(cluster.n_stores ?? 0)].filter(Boolean).join(' · ')}
      </p>
      {cluster.data_warning && (
        <p className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
          {cluster.data_warning}
        </p>
      )}
    </Link>
  );
}
```

- [ ] **Step 2: Rewrite DealsPage**

Replace the full contents of `src/app/pages/DealsPage.tsx`:

```tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { clustersApi, type ClusterSummary } from '../lib/api';
import { Button } from '../components/ui/button';
import { ClusterDealCard } from '../features/clusters/components/ClusterDealCard';
import { Loader2, Tag, RefreshCw } from 'lucide-react';

const SPREAD_FILTERS = [
  { label: 'All deals', min: 0 },
  { label: '10%+', min: 10 },
  { label: '20%+', min: 20 },
  { label: '30%+', min: 30 },
  { label: '50%+', min: 50 },
] as const;

export default function DealsPage() {
  const [clusters, setClusters] = useState<ClusterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [minSpread, setMinSpread] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      // Backend caps limit at 50; minStores 2 ⇒ every row is a real comparison.
      const res = await clustersApi.getDeals({ limit: 50, minStores: 2 });
      setClusters(res.results);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => clusters.filter((c) => (c.like_for_like_spread_pct ?? 0) >= minSpread),
    [clusters, minSpread],
  );

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" aria-label="Loading deals" />
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Tag className="w-5 h-5 text-teal-deep" aria-hidden="true" />
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Today's best deals</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Same product, different stores — ranked by how much the price varies for the same configuration.
          </p>
        </div>

        {error ? (
          <div className="text-center py-16">
            <p className="text-sm text-muted-foreground mb-4">
              We couldn't load today's deals. Check your connection and try again.
            </p>
            <Button variant="outline" onClick={load} className="gap-2">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-6">
              {SPREAD_FILTERS.map((f) => (
                <Button
                  key={f.min}
                  size="sm"
                  variant={minSpread === f.min ? 'default' : 'outline'}
                  onClick={() => setMinSpread(f.min)}
                  className={`h-8 text-xs rounded-full ${minSpread === f.min ? '' : 'hover:border-primary/40'}`}
                >
                  {f.label}
                </Button>
              ))}
            </div>

            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {filtered.map((c) => (
                  <ClusterDealCard key={c.cluster_id} cluster={c} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <p>
                  {minSpread === 0
                    ? 'No cross-store deals right now — check back soon.'
                    : `No deals with a ${minSpread}%+ price spread.`}
                </p>
                {minSpread > 0 && (
                  <Button variant="link" onClick={() => setMinSpread(0)} className="mt-2">
                    Show all deals
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

(Deliberately dropped: the old `Product`/`ProductCard` mapping, the emerald savings banner, `visibleCount` paging — the feed is ≤ 50 rows.)

- [ ] **Step 3: Verify live**

Run: `npm run type-check && npm run build`, restart preview, screenshot `http://127.0.0.1:4173/deals`.
Expected: a grid of real Kenyan deals (e.g. "Apple MacBook M2 Air — KES 113,999 · grandhub.co.ke · 3 shops" with a teal ▼ % badge); no 422 in the console; chips filter the grid; "50%+" shows rows or the honest empty copy.

- [ ] **Step 4: Verify the error state**

Stop the backend (`kill` the uvicorn process), reload `/deals` in dev mode (`npm run dev`, port 5173).
Expected: "We couldn't load today's deals…" with a working "Try again" button (restart backend, click it, grid loads). Restart the backend afterwards.

- [ ] **Step 5: Commit**

```bash
git add dealsonline_ui_ux/src/app/pages/DealsPage.tsx dealsonline_ui_ux/src/app/features/clusters
git commit -m "feat(ui): Deals page on live clusters feed with honest states"
```

---

### Task 8: New page — /prices/:clusterId cluster price comparison

The first fully cluster-backed page: real per-store prices with click-through URLs, the two-tier honest price block, config (facet) splits, and every trust field rendered. Text-first layout (the feed has no images).

**Files:**
- Create: `src/app/pages/ClusterPricesPage.tsx`
- Modify: `src/app/routes.ts` (lazy import + route)

**Interfaces:**
- Consumes: `clustersApi.getDetail(clusterId) → Promise<ClusterDetail>`; `ClusterDetail.best_by_store: Record<string, {price: number | null; url: string; title: string}>`; `configs: ClusterConfig<ClusterStore>[]`.
- Produces: route `/prices/:clusterId` — the link target `ClusterDealCard` (Task 7) already points at.

- [ ] **Step 1: Create the page**

`src/app/pages/ClusterPricesPage.tsx`:

```tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router';
import { clustersApi, type ClusterDetail } from '../lib/api';
import { formatPrice, shopLabel } from '../lib/format';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Loader2, ExternalLink, AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function ClusterPricesPage() {
  const { clusterId } = useParams<{ clusterId: string }>();
  const [cluster, setCluster] = useState<ClusterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!clusterId) return;
    setLoading(true);
    setError(false);
    try {
      setCluster(await clustersApi.getDetail(clusterId));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [clusterId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" aria-label="Loading price comparison" />
      </div>
    );
  }

  if (error || !cluster) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground mb-4">We couldn't load this price comparison.</p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={load} className="gap-2">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
          <Button asChild variant="ghost">
            <Link to="/deals">All deals</Link>
          </Button>
        </div>
      </div>
    );
  }

  const name = cluster.display_name ?? cluster.title;
  const likelyUsed = cluster.condition_basis === 'likely_used';
  const rows = Object.entries(cluster.best_by_store)
    .filter(([, s]) => s.price != null && s.price >= 1)
    .sort(([, a], [, b]) => (a.price as number) - (b.price as number));
  const spread = cluster.like_for_like_spread_pct;
  const facetChips = Object.entries(cluster.spec_facets).flatMap(([k, vals]) =>
    vals.map((v) => `${k.toUpperCase()} ${v}`),
  );

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-[900px] mx-auto px-4 lg:px-6 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 gap-1">
          <Link to="/deals">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All deals
          </Link>
        </Button>

        <p className="microcopy-label">
          {[cluster.brand, cluster.category].filter(Boolean).join(' · ') || 'Price comparison'}
        </p>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground leading-tight mt-1 mb-3">{name}</h1>

        {facetChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {facetChips.map((chip) => (
              <Badge key={chip} variant="secondary" className="text-[11px] bg-teal/10 text-teal-deep border-primary/20">
                {chip}
              </Badge>
            ))}
          </div>
        )}

        {!cluster.comparison_grade && (
          <div className="flex items-start gap-2 rounded-lg ultra-border p-3 mb-4 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            Accessory listings vary in exact model — treat this spread as a guide, not a like-for-like deal.
          </div>
        )}
        {cluster.data_warning && (
          <div className="flex items-start gap-2 rounded-lg ultra-border p-3 mb-4 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            {cluster.data_warning}
          </div>
        )}

        {/* Honest two-tier price block */}
        <div className="bg-surface-alt rounded-xl p-4 mb-6 inline-flex flex-col ultra-border">
          <p className="microcopy-label mb-0.5">{likelyUsed ? 'Lowest asking price (used/refurb)' : 'Best price (new)'}</p>
          <div className="flex items-end gap-3">
            <span className="price-num text-3xl font-bold text-foreground">{formatPrice(cluster.best_price)}</span>
            {cluster.n_stores != null && cluster.n_stores > 0 && (
              <span className="text-sm text-muted-foreground mb-1">
                across {shopLabel(cluster.n_stores)}
              </span>
            )}
          </div>
          {spread != null && spread > 0 && (
            <p className="text-xs text-teal-deep mt-1">
              Prices for the same configuration vary up to {Math.round(spread)}% — comparing pays.
            </p>
          )}
          {!likelyUsed && cluster.likely_used_best_price != null && (cluster.n_likely_used ?? 0) > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Used/refurb asking from {formatPrice(cluster.likely_used_best_price)} ({cluster.n_likely_used} listings)
            </p>
          )}
        </div>

        {/* Store rows — real prices, real click-through */}
        <h2 className="text-lg font-semibold text-foreground mb-3">Price comparison</h2>
        <div className="space-y-3 mb-8">
          {rows.map(([storeName, offer], idx) => (
            <div
              key={storeName}
              className={`flex items-center gap-4 rounded-xl p-4 transition-colors ultra-border hover:bg-surface-alt ${
                idx === 0 ? 'border-primary/20' : 'border-border'
              }`}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-foreground text-background font-bold text-sm">
                {storeName[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">{storeName}</span>
                  {idx === 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-teal/10 text-teal-deep border-primary/20">
                      Best price
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{offer.title}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span className="price-num text-lg font-bold text-foreground">{formatPrice(offer.price)}</span>
                <Button asChild size="sm" className="text-xs h-8 px-4">
                  <a href={offer.url} target="_blank" rel="noopener noreferrer">
                    Go to store
                    <ExternalLink className="h-3 w-3 ml-1" aria-hidden="true" />
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Per-configuration splits */}
        {cluster.configs.length > 1 && (
          <>
            <h2 className="text-lg font-semibold text-foreground mb-1">By configuration</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Like-for-like prices per variant — the honest comparison.
            </p>
            <div className="space-y-3">
              {cluster.configs.map((cfg, i) => (
                <div key={i} className="rounded-xl ultra-border p-4">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground">
                      {cfg.facet_label ?? (cfg.storage_gb != null ? `${cfg.storage_gb}GB` : 'Variant')}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      from <span className="price-num font-bold text-foreground">{formatPrice(cfg.best_price)}</span>
                      {cfg.cheapest_store ? ` at ${cfg.cheapest_store}` : ''}
                      {cfg.n_stores != null ? ` · ${shopLabel(cfg.n_stores)}` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

Note: `bg-surface-alt` is the existing theme surface token used across the app (`hover:bg-surface-alt` in StoreComparisonList); if type-check/build flags it, fall back to `bg-gray-50` as used in ProductHero.

- [ ] **Step 2: Register the route**

`src/app/routes.ts` — add with the other lazy imports and children:

```ts
const ClusterPricesPage = lazy(() => import("./pages/ClusterPricesPage"));
// …in children, next to the other product routes:
{ path: "prices/:clusterId", Component: ClusterPricesPage },
```

- [ ] **Step 3: Verify live**

Run: `npm run type-check && npm run build`, restart preview, then:

```bash
google-chrome --headless --no-sandbox --virtual-time-budget=6000 \
  --screenshot=/tmp/cluster-page.png --window-size=1440,1400 \
  "http://127.0.0.1:4173/prices/laptops%3A%3Ahp%3A%3Aelitebook-840-g6"
```

Expected: title "HP EliteBook 840 G6", RAM facet chip, best-price block in KES with the used/refurb secondary line, store rows sorted ascending with "Best price" on the actual lowest, each "Go to store" pointing at the store's own URL (kenyatronics.com first at KES 29,900), and a "By configuration" section.

- [ ] **Step 4: Verify navigation from Deals**

Screenshot `/deals`, confirm cards link to `/prices/…` (inspect one `href`); click-through renders the page (fetch the URL from step 3 directly if not driving a browser).

- [ ] **Step 5: Commit**

```bash
git add dealsonline_ui_ux/src/app/pages/ClusterPricesPage.tsx dealsonline_ui_ux/src/app/routes.ts
git commit -m "feat(ui): /prices/:clusterId cluster comparison page with honest-price contract"
```

---

## Follow-up (out of scope for this plan — needs its own brainstorm/spec)

These require design decisions, so run `superpowers:brainstorming` before planning them:

1. **New pages/components pass** (the "move to new UI components/pages"): Browse/Category redesign, merging the cluster surfaces into search + header nav, homepage "Top deals" rail → `clustersApi.getDeals` (needs an image strategy — the cluster feed has none), Account/Legal polish per DESIGN_HANDOFF.md build order.
2. **PR product page vs clusters**: the `/product/:id` page still fabricates its store list/price history from mocks (Task 3 only makes the mock internally consistent). Decide: quarantine behind a "demo data" caption, resolve PR products to clusters via `clustersApi.search(product.name)`, or retire the PR catalog for comparison purposes.
3. **Price history**: the cluster view doesn't expose `price_history` yet — small backend add to `_cluster_view` if the chart should go live.
4. **Reviews**: no backend source exists; the section stays placeholder or gets removed.
5. **Backend curation**: `/api/pr/homepage` junk deals (0.1-priced), NSFW `health_beauty` top product, the empty-id product-type doc (Task 4 only guards the client).
6. **Bundle trim**: `ProductDetailsPage` ships a 426 KB chunk (recharts) and the main chunk is 527 KB — lazy-load `PriceHistoryChart` (`React.lazy` + `Suspense`) or swap to a lightweight sparkline when that page is redesigned (item 2).

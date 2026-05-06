# Premium Price Comparison Platform: Architecture & Design Upgrade

This plan proposes a comprehensive overhaul of the current frontend implementation to achieve an "Ultra PriceRunner" standard. The goal is to establish a highly trustworthy, neutral, and lightning-fast user experience with production-grade code architecture.

## Background & Objectives
The current codebase has solid foundational elements but suffers from generic styling (Tailwind defaults, heavy shadows, bouncy hover states) and monolithic component architecture. 

**Objectives:**
1. **Design:** Implement a surgical, data-dense, and highly legible aesthetic characterized by subtle borders, crisp typography, and neutral cool grays.
2. **Architecture:** Break down massive components (e.g., `PRProductDetailPage` at ~1,000 lines) into atomic, reusable units.
3. **Performance:** Replace brittle `useEffect` data fetching with a robust caching layer (React Query) and decouple complex mock data generation from the render lifecycle.

## User Review Required

> [!WARNING]
> **Dependencies Addition:** This plan proposes adding `@tanstack/react-query` for robust data fetching and state management, and `react-helmet-async` for SEO metadata management. Please confirm if adding these dependencies is acceptable.

> [!IMPORTANT]
> **Design Direction:** The new "Ultra PriceRunner" look will remove playful animations (like `scale-105` on hover) in favor of instantaneous color/border shifts. It will also rely on exact `1px` borders rather than drop shadows. Does this strictly align with your vision for the "unbiased, trustworthy" aesthetic?

## Proposed Changes

---

### 1. Global Styling & Theming (CSS & Tailwind)

We will refine the global design tokens to ensure absolute consistency and remove generic default styles.

#### [MODIFY] `src/styles/theme.css`
- **Palette Refinement:** Shift from standard grays to specifically calibrated "cool grays" (e.g., Tailwind's `slate` family) to give a sterile but premium feel.
- **Typography:** Enforce rigorous hierarchy. Decrease the size of secondary labels and utilize uppercase, tracked-out microcopy for metadata (e.g., store counts).
- **Elevations & Borders:** Replace default `box-shadow` variables with subtle `1px solid var(--border)` definitions. Shadows will only be used sparingly on active floating elements like modals or sticky headers.

---

### 2. Component Architecture Refactoring

The major page components are currently monolithic and handle data generation, fetching, and rendering. We will break them down into an atomic structure.

#### [MODIFY] `src/app/pages/PRProductDetailPage.tsx`
- **Refactoring:** Reduce the file from ~800+ lines down to a clean composition of sub-components.
- **Sub-components to Extract:**
  - `ProductHero`: The top section containing images, basic title, and top-level price.
  - `StoreComparisonList`: The interactive table/list showing prices across different retailers.
  - `PriceHistoryChart`: The Recharts implementation, separated for lazy loading.
  - `ReviewSection`: User and expert reviews.

#### [MODIFY] `src/app/pages/PRBrowsePage.tsx`
- **Refactoring:** Extract the filtering sidebar and the product grid.
- **Dynamic Filtering:** Upgrade the generic filter sidebar to support dynamic, category-specific facets (e.g., rendering RAM or Storage filters only if `productType === 'phones'`).

#### [NEW] `src/app/components/product/...` (Multiple Files)
- Create new atomic files for `ProductHero.tsx`, `StoreComparisonList.tsx`, `PriceHistoryChart.tsx`, and `ProductSpecs.tsx`.

---

### 3. Data Architecture & Performance Optimization

To achieve a snappy, production-grade feel, we must decouple data fetching and generation from the UI components.

#### [NEW] `src/app/data/mockServices.ts`
- **Separation of Concerns:** Extract all seeded random generation logic (placeholder stores, price history data, review generation) currently buried in page files into standalone service functions. 

#### [NEW] `src/app/hooks/useProductData.ts`
- **Data Fetching Layer:** Introduce custom hooks wrapping `@tanstack/react-query` to handle fetching product details, prices, and reviews. This prevents redundant network requests, eliminates race conditions, and provides `stale-while-revalidate` caching.

---

### 4. Layout & UI Polish (The "Ultra" Feel)

#### [MODIFY] `src/app/components/layout/Header.tsx` (or equivalent search component)
- **Predictive Search Modal:** Upgrade the standard search input into a rich, full-screen or large overlay modal that provides instant autocomplete results (Products, Categories, Brands) as the user types, complete with thumbnails and prices.

#### [MODIFY] `src/app/components/product/ProductCard.tsx` (or equivalent)
- **Dynamic Aspect Ratios:** Remove strict `aspect-square` forcing on images that cause awkward cropping. Use `object-contain` within a bounded container that adapts smoothly.
- **Hover States:** Replace `group-hover:scale-105` with a subtle, 100ms border color transition and a slight background tint on the product card container.

#### [MODIFY] Shared Layouts (Mobile)
- **Scroll Hints:** Implement gradient masks (`mask-image: linear-gradient(to right, ... )`) on horizontally scrollable areas (like category pills or tabs) to intuitively indicate off-screen content.

---

## Verification Plan

### Automated Tests
- Run `npm run type-check` to ensure no TypeScript regressions after component splitting.
- Verify production build success via `npm run build`.

### Manual Verification
1. **Performance Profiling:** Verify that navigating between the Browse Page and Product Detail Page does not trigger unnecessary re-renders or layout shifts.
2. **Aesthetic Audit:** Compare the new Product Card hover states, typography crispness, and border logic against the PriceRunner/PriceSpy screenshots provided in `other_price_comparison_websites_designs`.
3. **Mobile Responsiveness:** Test horizontal scrolling gradient hints on mobile viewport sizes to ensure proper visual cues.
4. **Data Consistency:** Ensure that navigating away from and back to a product detail page instantly loads cached data without a flash of loading states.

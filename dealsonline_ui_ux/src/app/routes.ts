import { createBrowserRouter } from "react-router";
import { lazy } from "react";
import Root from "./pages/Root";

const HomePage = lazy(() => import("./pages/HomePage"));
const CategoriesPage = lazy(() => import("./pages/CategoriesPage"));
const BrowsePage = lazy(() => import("./pages/BrowsePage"));
const ProductDetailsPage = lazy(() => import("./pages/ProductDetailsPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const PriceAlertsPage = lazy(() => import("./pages/PriceAlertsPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const DealsPage = lazy(() => import("./pages/DealsPage"));
const LegalPage = lazy(() => import("./pages/LegalPage"));
const ComparisonPage = lazy(() => import("./pages/ComparisonPage"));
const ClusterPricesPage = lazy(() => import("./pages/ClusterPricesPage"));
const ShelfPage = lazy(() => import("./pages/ShelfPage"));
const DepartmentPage = lazy(() => import("./pages/DepartmentPage"));
const AislePage = lazy(() => import("./pages/AislePage"));
const StyleGuidePage = lazy(() => import("./pages/StyleGuidePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: HomePage },
      { path: "browse", Component: CategoriesPage },
      // The CANONICAL category tree (taxonomy_db.browse_nodes). ⛔ Deliberately NOT the
      // same route as /browse, which serves the retired 424-node PriceRunner spine: the
      // two slug spaces are DISJOINT, so the cutover is additive and both stay live.
      { path: "shelf", Component: ShelfPage },
      { path: "shelf/:slug", Component: ShelfPage },
      // The 21 RULED DEPARTMENTS over that tree (app/api/departments.py).
      // ⛔⛔ A THIRD SLUG SPACE, AND IT OVERLAPS /shelf's. Six department ids also name a
      // browse_nodes shelf — `audio`, `bakery`, `cleaning`, `fresh`, `hardware`, `pantry` —
      // and the pages genuinely differ: /department/pantry is 485 clusters, /shelf/pantry is
      // 889. Neither redirects to the other, so `departmentHref` and `shelfHref` are the only
      // two link builders and an id is never passed to the wrong one.
      { path: "department/:id", Component: DepartmentPage },
      // The REDESIGN spine's 19 DESIGNED departments (browse_nodes.spine_department).
      // ⛔⛔ A FOURTH SLUG SPACE, PARALLEL TO /department ON PURPOSE. This is the migration
      // target for the 21 curated departments — 79.9% of placements reachable vs 46.0% — and
      // the two run side by side only until the cutover. `home-appliances` names a department
      // in BOTH spaces and the pages differ, so `aisleHref` and `departmentHref` are separate
      // builders and an id is never passed to the wrong one. Not linked from any nav.
      { path: "aisle/:id", Component: AislePage },
      { path: "browse/:productType", Component: BrowsePage },
      { path: "product/:productId", Component: ProductDetailsPage },
      // Redirect or alias legacy routes
      { path: "category/:categoryId", Component: BrowsePage }, 
      { path: "search", Component: BrowsePage },
      { path: "product/pr/:productId", Component: ProductDetailsPage },
      
      { path: "deals", Component: DealsPage },
      { path: "prices/:clusterId", Component: ClusterPricesPage },
      { path: "favorites", Component: FavoritesPage },
      { path: "alerts", Component: PriceAlertsPage },
      { path: "account", Component: AccountPage },
      { path: "auth", Component: AuthPage },
      { path: "privacy", Component: LegalPage },
      { path: "terms", Component: LegalPage },
      { path: "cookie-policy", Component: LegalPage },
      { path: "contact", Component: LegalPage },
      { path: "compare", Component: ComparisonPage },
      { path: "style-guide", Component: StyleGuidePage },
      { path: "*", Component: NotFound },
    ],
  },
]);

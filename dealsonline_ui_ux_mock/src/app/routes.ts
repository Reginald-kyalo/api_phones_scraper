import { createBrowserRouter, redirect } from "react-router";
import { lazy } from "react";
import Root from "./pages/Root";

const HomePage = lazy(() => import("./pages/HomePage"));
const CatalogueCategoriesPage = lazy(() => import("./pages/CatalogueCategoriesPage"));
const CatalogueBrowsePage = lazy(() => import("./pages/CatalogueBrowsePage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const PriceAlertsPage = lazy(() => import("./pages/PriceAlertsPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const DealsPage = lazy(() => import("./pages/DealsPage"));
const LegalPage = lazy(() => import("./pages/LegalPage"));
const ComparisonPage = lazy(() => import("./pages/ComparisonPage"));
const ClusterPricesPage = lazy(() => import("./pages/ClusterPricesPage"));
const StyleGuidePage = lazy(() => import("./pages/StyleGuidePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: HomePage },

      // Catalogue — every captured cluster, served from public/demo/.
      { path: "browse", Component: CatalogueCategoriesPage },
      { path: "browse/:productType", Component: CatalogueBrowsePage },
      { path: "search", Component: SearchPage },
      { path: "deals", Component: DealsPage },
      { path: "prices/:clusterId", Component: ClusterPricesPage },

      // The PriceRunner-backed product page is retired in the static build: it
      // had no backend here, and it rendered GBP catalogue prices as KES next to
      // generated stores, reviews and price history. /prices/:clusterId is the
      // real comparison page. Old links land on the catalogue rather than 404.
      { path: "product/:productId", loader: () => redirect("/browse") },
      { path: "product/pr/:productId", loader: () => redirect("/browse") },
      { path: "category/:categoryId", loader: () => redirect("/browse") },

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
], {
  /*
   * Sub-path deploys (GitHub Pages project sites) serve the app from
   * /<repo>/. Without this the router sees "/dealsonline/deals", matches no
   * route and renders NotFound for every page — the assets and fixtures load
   * fine, so it looks like a data failure rather than a routing one.
   * Vite substitutes BASE_URL at build time; it is "/" for a root deploy.
   */
  basename: import.meta.env.BASE_URL,
});

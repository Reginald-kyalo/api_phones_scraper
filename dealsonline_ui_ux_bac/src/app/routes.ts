import { createBrowserRouter } from "react-router";
import { lazy } from "react";
import Root from "./pages/Root";

const HomePage = lazy(() => import("./pages/HomePage"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const ProductDetailsPage = lazy(() => import("./pages/ProductDetailsPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const PriceAlertsPage = lazy(() => import("./pages/PriceAlertsPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const SearchResultsPage = lazy(() => import("./pages/SearchResultsPage"));
const DealsPage = lazy(() => import("./pages/DealsPage"));
const LegalPage = lazy(() => import("./pages/LegalPage"));
const PRHomePage = lazy(() => import("./pages/PRHomePage"));
const PRBrowsePage = lazy(() => import("./pages/PRBrowsePage"));
const PRProductDetailPage = lazy(() => import("./pages/PRProductDetailPage"));
const ComparisonPage = lazy(() => import("./pages/ComparisonPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: HomePage },
      { path: "category/:categoryId", Component: CategoryPage },
      { path: "product/:productId", Component: ProductDetailsPage },
      { path: "search", Component: SearchResultsPage },
      { path: "deals", Component: DealsPage },
      { path: "favorites", Component: FavoritesPage },
      { path: "alerts", Component: PriceAlertsPage },
      { path: "account", Component: AccountPage },
      { path: "auth", Component: AuthPage },
      { path: "privacy", Component: LegalPage },
      { path: "terms", Component: LegalPage },
      { path: "cookie-policy", Component: LegalPage },
      { path: "contact", Component: LegalPage },
      { path: "browse", Component: PRHomePage },
      { path: "browse/:productType", Component: PRBrowsePage },
      { path: "product/pr/:productId", Component: PRProductDetailPage },
      { path: "compare", Component: ComparisonPage },
      { path: "*", Component: NotFound },
    ],
  },
]);

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
const StyleGuidePage = lazy(() => import("./pages/StyleGuidePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: HomePage },
      { path: "browse", Component: CategoriesPage },
      { path: "browse/:productType", Component: BrowsePage },
      { path: "product/:productId", Component: ProductDetailsPage },
      // Redirect or alias legacy routes
      { path: "category/:categoryId", Component: BrowsePage }, 
      { path: "search", Component: BrowsePage },
      { path: "product/pr/:productId", Component: ProductDetailsPage },
      
      { path: "deals", Component: DealsPage },
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

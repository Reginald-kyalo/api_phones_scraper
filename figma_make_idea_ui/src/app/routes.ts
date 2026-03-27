import { createBrowserRouter } from "react-router";
import Root from "./pages/Root";
import HomePage from "./pages/HomePage";
import CategoryPage from "./pages/CategoryPage";
import ProductDetailsPage from "./pages/ProductDetailsPage";
import FavoritesPage from "./pages/FavoritesPage";
import PriceAlertsPage from "./pages/PriceAlertsPage";
import AccountPage from "./pages/AccountPage";
import AuthPage from "./pages/AuthPage";
import SearchResultsPage from "./pages/SearchResultsPage";
import NotFound from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: HomePage },
      { path: "category/:categoryId", Component: CategoryPage },
      { path: "product/:productId", Component: ProductDetailsPage },
      { path: "search", Component: SearchResultsPage },
      { path: "favorites", Component: FavoritesPage },
      { path: "alerts", Component: PriceAlertsPage },
      { path: "account", Component: AccountPage },
      { path: "auth", Component: AuthPage },
      { path: "*", Component: NotFound },
    ],
  },
]);

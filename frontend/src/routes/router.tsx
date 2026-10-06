import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import Dashboard from "@/pages/Dashboard";
import TrendDetailPage from "@/pages/TrendDetailPage";
import BrandsPage from "@/pages/BrandsPage";
import BrandDetailPage from "@/pages/BrandDetailPage";
import AlertsPage from "@/pages/AlertsPage";
import SourcesPage from "@/pages/SourcesPage";
import DataQualityPage from "@/pages/DataQualityPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import NotFoundPage from "@/pages/NotFoundPage";

import NewsPage from "@/pages/NewsPage";
import TrendingPage from "@/pages/TrendingPage";
import TopicsPage from "@/pages/TopicsPage";
import CountriesPage from "@/pages/CountriesPage";
import CountryDetailPage from "@/pages/CountryDetailPage";
import ComparePage from "@/pages/ComparePage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import IndianNewsPage from "@/pages/IndianNewsPage";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/dashboard" replace /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/dashboard", element: <Dashboard /> },
          { path: "/trends/:id", element: <TrendDetailPage /> },
          { path: "/brands", element: <BrandsPage /> },
          { path: "/brands/:id", element: <BrandDetailPage /> },
          { path: "/alerts", element: <AlertsPage /> },
          { path: "/sources", element: <SourcesPage /> },
          { path: "/data-quality", element: <DataQualityPage /> },
          { path: "/news", element: <NewsPage /> },
          { path: "/trending", element: <TrendingPage /> },
          { path: "/topics", element: <TopicsPage /> },
          { path: "/countries", element: <CountriesPage /> },
          { path: "/countries/:country", element: <CountryDetailPage /> },
          { path: "/compare", element: <ComparePage /> },
          { path: "/analytics", element: <AnalyticsPage /> },
          { path: "/indian-news", element: <IndianNewsPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);

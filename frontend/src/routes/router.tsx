import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import VibeCheckPage from "@/pages/VibeCheckPage";
import EchoChamberPage from "@/pages/EchoChamberPage";
import CancelPredictorPage from "@/pages/CancelPredictorPage";
import TrendArbitragePage from "@/pages/TrendArbitragePage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import NotFoundPage from "@/pages/NotFoundPage";
import SourcesPage from "@/pages/SourcesPage";
import TrendDetailPage from "@/pages/TrendDetailPage";
import BrandsPage from "@/pages/BrandsPage";
import BrandDetailPage from "@/pages/BrandDetailPage";
import AlertsPage from "@/pages/AlertsPage";
import PulseRadarPage from "@/pages/PulseRadarPage";
import IndianNewsPage from "@/pages/IndianNewsPage";
import MemesPage from "@/pages/MemesPage";
import TrendingNewsPage from "@/pages/TrendingNewsPage";
import FastinoIntroPage from "@/pages/FastinoIntroPage";

export const router = createBrowserRouter([
  { path: "/", element: <FastinoIntroPage /> },
  { path: "/intro", element: <FastinoIntroPage /> },
  { path: "/fastino", element: <FastinoIntroPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/radar", element: <PulseRadarPage /> },
          { path: "/twitter", element: <Navigate to="/radar" replace /> },
          { path: "/x-radar", element: <Navigate to="/radar" replace /> },
          { path: "/x-discourse", element: <Navigate to="/radar" replace /> },
          { path: "/twitter-pulse", element: <Navigate to="/radar" replace /> },
          { path: "/vibe-check", element: <VibeCheckPage /> },
          { path: "/echo-chamber", element: <EchoChamberPage /> },
          { path: "/cancel-predictor", element: <CancelPredictorPage /> },
          { path: "/trend-arbitrage", element: <TrendArbitragePage /> },
          { path: "/culture", element: <IndianNewsPage /> }, // Repurposed as Culture Pulse
          { path: "/trending-memes", element: <MemesPage /> },
          { path: "/all-india-memes", element: <MemesPage /> },
          { path: "/trending-news", element: <TrendingNewsPage /> },
          { path: "/sources", element: <SourcesPage /> },
          { path: "/trends/:id", element: <TrendDetailPage /> },
          { path: "/brands", element: <BrandsPage /> },
          { path: "/brands/:id", element: <BrandDetailPage /> },
          { path: "/alerts", element: <AlertsPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);


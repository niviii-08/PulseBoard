import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/renderWithProviders";
import { mockBrands, mockEmergingTrends, mockAlerts, mockSources } from "@/lib/api/mockData";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import Dashboard from "@/pages/Dashboard";
import TrendDetailPage from "@/pages/TrendDetailPage";
import BrandsPage from "@/pages/BrandsPage";
import BrandDetailPage from "@/pages/BrandDetailPage";
import AlertsPage from "@/pages/AlertsPage";
import SourcesPage from "@/pages/SourcesPage";
import NotFoundPage from "@/pages/NotFoundPage";

/**
 * These render every page with the real component tree, the real mock
 * data layer (src/lib/api/mockData.ts -- the same data every hook
 * returns in USE_MOCK_DATA mode), and real React Query / React Router
 * providers. This catches the class of bug that `tsc --noEmit` and a
 * successful `vite build` cannot: a component that compiles fine but
 * throws at render time.
 */

describe("Page smoke tests", () => {
  it("renders LoginPage without crashing", () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it("renders RegisterPage without crashing", () => {
    renderWithProviders(<RegisterPage />);
    expect(screen.getByRole("heading", { name: /create your account/i })).toBeInTheDocument();
  });

  it("renders Dashboard and eventually shows real mock trend data", async () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByRole("heading", { name: /dashboard/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(mockEmergingTrends[0].name)).toBeInTheDocument();
    });
  });

  it("renders TrendDetailPage for a real mock trend id", async () => {
    renderWithProviders(<TrendDetailPage />, { path: "/trends/:id", route: "/trends/trend-1" });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: mockEmergingTrends[0].name })).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText(/why is this trending/i)).toBeInTheDocument();
    });
  });

  it("renders BrandsPage and lists every mock brand once loaded", async () => {
    renderWithProviders(<BrandsPage />);

    await waitFor(() => {
      for (const brand of mockBrands) {
        expect(screen.getByText(brand.name)).toBeInTheDocument();
      }
    });
  });

  it("renders BrandDetailPage with risk score and drivers for a real mock brand id", async () => {
    const brand = mockBrands[0];
    renderWithProviders(<BrandDetailPage />, { path: "/brands/:id", route: `/brands/${brand.id}` });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: brand.name })).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText(/brand risk/i)).toBeInTheDocument();
    });
  });

  it("renders AlertsPage and lists every mock alert once loaded", async () => {
    renderWithProviders(<AlertsPage />);

    await waitFor(() => {
      for (const alert of mockAlerts) {
        expect(screen.getByText(alert.message)).toBeInTheDocument();
      }
    });
  });

  it("renders SourcesPage and lists every source, never claiming an unconfigured one is active", async () => {
    renderWithProviders(<SourcesPage />);

    await waitFor(() => {
      for (const source of mockSources) {
        expect(screen.getByText(source.source)).toBeInTheDocument();
      }
    });
    expect(screen.getAllByText("Not configured").length).toBeGreaterThan(0);
  });

  it("renders NotFoundPage without crashing", () => {
    renderWithProviders(<NotFoundPage />);
    expect(screen.getByText("404")).toBeInTheDocument();
  });
});

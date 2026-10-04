import type { ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/**
 * Every page component assumes it's rendered inside QueryClientProvider
 * and a router (for useParams/useNavigate/<Link>) -- this wrapper
 * supplies both with sane test defaults (retry disabled so a
 * deliberately-erroring query in a test doesn't retry and slow the test
 * down). Pass `path` (a route pattern like "/services/:id") for pages
 * that call useParams -- without a matching <Route>, useParams() would
 * see an empty params object regardless of what's in the URL.
 */
export function renderWithProviders(
  ui: ReactElement,
  { route = "/", path }: { route?: string; path?: string } = {},
): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          {path ? <Routes><Route path={path} element={children} /></Routes> : children}
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper });
}

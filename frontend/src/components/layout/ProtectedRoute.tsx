import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

/**
 * Redirects to /login, preserving the attempted destination in
 * location.state so LoginPage can send the user back where they meant
 * to go after authenticating. Applied once at the router level (see
 * src/routes/router.tsx) to every page that needs a logged-in user,
 * rather than each page checking auth state itself.
 */
export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

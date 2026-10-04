import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";

/**
 * The authenticated app's structural frame: fixed sidebar + topbar +
 * scrollable content area. Every route under ProtectedRoute renders
 * inside this shell via <Outlet />, so the sidebar/topbar never
 * unmount/remount on navigation between /dashboard, /brands, etc. --
 * only the page content swaps, which is both the correct UX (no jarring
 * layout flash) and what keeps the single WebSocket connection
 * (initialized once above this shell -- see src/App.tsx) alive across
 * navigations instead of reconnecting on every route change.
 *
 * Below md, the sidebar hides and MobileNav (a bottom tab bar) takes
 * over -- not a shrunk version of the desktop nav, a different pattern
 * suited to a thumb-driven screen.
 */
export function AppShell() {
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {/* Keying on pathname restarts the fade-up on every navigation --
              one small, deliberate motion per page load rather than
              animating every card and section individually. */}
          <div key={location.pathname} className="container animate-fade-in-up py-8">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

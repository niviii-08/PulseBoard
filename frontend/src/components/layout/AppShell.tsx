import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useWebSocket } from "@/hooks/useWebSocket";

export function AppShell() {
  useWebSocket();
  const { pathname } = useLocation();

  return (
    <div
      className="relative flex min-h-screen overflow-hidden text-ink selection:bg-[#C2B0D5] selection:text-[#1C192B]"
      style={{
        background: `
          radial-gradient(ellipse 80% 55% at 50% 25%, rgba(254, 235, 196, 0.9) 0%, rgba(246, 196, 176, 0.65) 42%, rgba(194, 176, 213, 0.7) 75%, transparent 100%),
          radial-gradient(circle at 12% 85%, rgba(117, 139, 124, 0.4) 0%, transparent 50%),
          radial-gradient(circle at 88% 90%, rgba(223, 192, 207, 0.45) 0%, transparent 50%),
          linear-gradient(180deg, #C2B0D5 0%, #D8BFD8 22%, #F6C4B0 52%, #E8D7C2 78%, #DFD0BC 100%)
        `,
        backgroundAttachment: "fixed",
      }}
    >
      {/* Subtle Noise Grain Overlay matching AuthLayout */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.06] mix-blend-multiply"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <Sidebar />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1440px]">
            <div
              key={pathname}
              className="animate-page-in"
            >
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

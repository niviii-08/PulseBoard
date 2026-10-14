import { useLocation, useNavigate } from "react-router-dom";
import { LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileNav } from "./MobileNav";
import { NAV_ITEMS } from "./Sidebar";
import { useAuthStore } from "@/store/authStore";
import { useRunCollectors } from "@/hooks/queries/useSources";
import { useWebSocketStore } from "@/store/websocketStore";

export function Topbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const runCollectors = useRunCollectors();
  const wsStatus = useWebSocketStore((s) => s.status);

  const currentNav = NAV_ITEMS.find((item) =>
    item.to === "/" ? pathname === "/" : pathname.startsWith(item.to),
  );

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 flex h-20 items-center justify-between gap-3 border-b-2 border-ink bg-[#FAF6F0]/88 backdrop-blur-xl px-4 sm:px-6 lg:px-8 shadow-[0_4px_0_0_#1C192B]">
      <div className="flex items-center gap-3">
        <MobileNav />
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-black uppercase tracking-tight text-ink">
            {currentNav?.label ?? "Workspace"}
          </h1>
          <span className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lilac-500/80 border-2 border-ink text-[10px] font-mono font-bold uppercase tracking-widest text-ink shadow-sm">
            <span>✦</span> Persistent Intelligence Space
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <LiveIndicator status={wsStatus} />

        <Button
          variant="secondary"
          size="sm"
          onClick={() => runCollectors.mutate("live")}
          isLoading={runCollectors.isPending}
          title="Run a live collection pass across all configured sources"
          className="border-2 border-ink rounded-[12px] font-black uppercase tracking-widest bg-signal-500 text-ink shadow-sm hover:translate-y-0.5 hover:bg-signal-400 transition-transform"
        >
          {!runCollectors.isPending && <RefreshCw className="h-4 w-4 text-ink mr-1" aria-hidden="true" />}
          <span className="hidden sm:inline">Collect now</span>
        </Button>

        {user && (
          <div className="hidden items-center gap-2 pl-2 text-xs font-black uppercase tracking-widest text-ink sm:flex border-l-2 border-ink">
            <span className="truncate max-w-[160px] bg-canvas px-3 py-1.5 rounded-[12px] border-2 border-ink shadow-sm">{user.email}</span>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          aria-label="Sign out"
          title="Sign out"
          className="border-2 border-ink rounded-[12px] bg-[#1C192B] text-white shadow-sm hover:bg-[#342D4C] hover:text-signal-500 hover:translate-y-0.5 transition-all"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </header>
  );
}

function LiveIndicator({ status }: { status: string }) {
  const isSyncing = status === "connecting";

  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-black uppercase tracking-widest bg-health-500 text-ink border-2 border-ink shadow-sm hover:scale-105 transition-all cursor-default select-none"
      title="Live telemetry stream active · Real-time radar online"
    >
      <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-700" />
      </span>
      <span className="text-[11px] tracking-wider">{isSyncing ? "SYNCING LIVE" : "ONLINE"}</span>
    </span>
  );
}

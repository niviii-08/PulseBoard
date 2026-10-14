import { NavLink, Link } from "react-router-dom";
import { Database, Focus, Flame, Activity, EarOff, ShieldAlert, Rocket, Globe, Sparkles } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { to: "/intro", label: "INTRO CANVAS", icon: Sparkles },
  { to: "/radar", label: "RADAR", icon: Focus },
  { to: "/vibe-check", label: "VIBE CHECK", icon: Activity },
  { to: "/trending-memes", label: "MY STATE MEMES", icon: Flame },
  { to: "/all-india-memes", label: "ALL INDIA MEMES", icon: Globe },
  { to: "/trending-news", label: "TRENDING NEWS", icon: Rocket },
  { to: "/echo-chamber", label: "ECHO CHAMBER", icon: EarOff },
  { to: "/cancel-predictor", label: "CANCEL PREDICTOR", icon: ShieldAlert },
  { to: "/sources", label: "DATA STREAMS", icon: Database },
];

export function Sidebar() {
  return (
    <aside className="relative z-10 bg-[#FAF6F0]/88 backdrop-blur-xl hidden w-64 shrink-0 flex-col border-r-2 border-ink md:flex shadow-[4px_0px_0px_0px_#1C192B]">
      <div className="flex h-20 items-center px-5 border-b-2 border-ink/15 bg-white/45 backdrop-blur-md">
        <Link to="/radar" className="focus:outline-none" title="PulseBoard Home">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 space-y-2 px-4 py-6 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 rounded-[16px] px-4 py-3 text-xs font-black transition-all duration-200 uppercase tracking-widest ease-spring",
                isActive
                  ? "text-white border-2 border-ink bg-[#1C192B] shadow-sm translate-x-1"
                  : "text-ink-muted border-2 border-transparent hover:border-ink hover:bg-lilac-500/40 hover:text-ink hover:shadow-sm hover:translate-x-1.5 active:translate-x-0.5",
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn(
                    "relative h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                    isActive ? "text-signal-500" : "text-ink",
                  )}
                  aria-hidden="true"
                />
                <span className="relative">{label}</span>
                {isActive && <span className="ml-auto text-signal-500 text-xs animate-pulse">✦</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t-2 border-ink p-5 bg-canvas/80">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="px-2 py-0.5 rounded bg-lilac-500 border border-ink text-[9px] font-mono font-bold uppercase text-ink">
            [01] LIVE
          </span>
          <span className="px-2 py-0.5 rounded bg-flame-500 border border-ink text-[9px] font-mono font-bold uppercase text-ink">
            [02] RISK
          </span>
        </div>
        <p className="text-[11px] uppercase font-black tracking-[0.18em] leading-relaxed text-ink">
          Trend <span className="text-lilac-700">→</span> Why <span className="text-lilac-700">→</span> Risk.
        </p>
      </div>
    </aside>
  );
}

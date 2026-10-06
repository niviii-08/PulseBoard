import { NavLink } from "react-router-dom";
import { ShieldCheck, Database, Globe, Newspaper, TrendingUp, Hash, Map, BarChart2, Layers, Flame } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { to: "/dashboard", label: "GLOBAL", icon: Globe },
  { to: "/news", label: "NEWS", icon: Newspaper },
  { to: "/trending", label: "TRENDING", icon: TrendingUp },
  { to: "/compare", label: "COMPARE", icon: Layers },
  { to: "/topics", label: "TOPICS", icon: Hash },
  { to: "/countries", label: "COUNTRIES", icon: Map },
  { to: "/indian-news", label: "INDIA NEWS", icon: Flame },
  { to: "/analytics", label: "ANALYTICS", icon: BarChart2 },
  { to: "/sources", label: "SOURCES", icon: Database },
  { to: "/data-quality", label: "DATA QUALITY", icon: ShieldCheck },
];

/**
 * Fixed left sidebar for the authenticated app -- the standard,
 * expected structure for an analytics/intelligence dashboard. Deviating
 * from it for novelty would cost usability for no real gain; the
 * visual identity lives in the glass surface, the gradient active
 * indicator, and color, not in reinventing navigation. Hidden below
 * md; MobileNav covers small screens instead (see components/layout/MobileNav).
 */
export function Sidebar() {
  return (
    <aside className="relative z-10 glass hidden w-60 shrink-0 flex-col border-r border-border md:flex">
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                isActive ? "text-ink" : "text-ink-muted hover:bg-ink/[0.04] hover:text-ink",
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-signal-500/[0.12] to-signal-500/0" />
                )}
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-signal-400 to-flame-400" />
                )}
                <Icon className="relative h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="relative">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border p-4">
        <p className="text-[0.6875rem] leading-relaxed text-ink-faint">
          Trend → why → sentiment → propagation → risk.
        </p>
      </div>
    </aside>
  );
}

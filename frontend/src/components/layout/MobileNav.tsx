import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/components/layout/Sidebar";

/**
 * Bottom tab bar for small screens -- the sidebar is hidden below md
 * (see AppShell), so this is the entire navigation surface on mobile,
 * not a stripped-down extra. A fixed bottom bar with icon + label is
 * the pattern people already know from the social apps this product
 * watches, which makes it the least-surprising choice here, not just
 * the trendiest one. Reuses the same NAV_ITEMS as the desktop sidebar
 * so the two can never drift out of sync.
 */
export function MobileNav() {
  return (
    <nav
      className="glass fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-border pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Primary"
    >
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors",
              isActive ? "text-signal-600" : "text-ink-faint",
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className={cn(isActive && "font-semibold")}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

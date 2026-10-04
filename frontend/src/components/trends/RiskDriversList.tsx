import { cn } from "@/lib/utils";
import type { RiskDriver } from "@/types/domain";

/**
 * Explains a brand risk score point-by-point -- every driver that
 * contributed, and how much of its max it hit. This exists specifically
 * so the risk score is never a black box: a viewer can see exactly why
 * the number is what it is.
 */
export function RiskDriversList({ drivers }: { drivers: RiskDriver[] }) {
  if (drivers.length === 0) {
    return <p className="text-sm text-ink-faint">No active risk drivers.</p>;
  }

  return (
    <ul className="space-y-3">
      {drivers.map((d) => (
        <li key={d.driver} className="flex items-center gap-3">
          <span className="w-40 shrink-0 truncate text-xs text-ink-muted">{d.driver}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/[0.06]">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500 ease-spring",
                d.points / d.max_points > 0.6
                  ? "bg-down-500"
                  : d.points / d.max_points > 0.3
                    ? "bg-degraded-500"
                    : "bg-operational-500",
              )}
              style={{ width: `${Math.min(100, (d.points / d.max_points) * 100)}%` }}
            />
          </div>
          <span className="w-16 shrink-0 text-right font-mono text-xs text-ink">
            +{d.points.toFixed(0)}/{d.max_points}
          </span>
        </li>
      ))}
    </ul>
  );
}

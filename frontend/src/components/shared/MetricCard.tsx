import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  trend?: { direction: "up" | "down"; label: string; tone?: "positive" | "negative" | "neutral" };
  /** Renders as the visually dominant KPI on the dashboard -- larger
   * type, an icon chip, a gradient top edge. Use for exactly one card
   * per screen (see Dashboard.tsx), not as a general "make it stand
   * out" switch. */
  emphasis?: boolean;
  className?: string;
}

/**
 * A single at-a-glance metric (emerging trends, mentions, sentiment,
 * active alerts, brand risk). Numbers render in the mono face -- see
 * tailwind.config.js's font comment -- since these are precisely the
 * "instrument readout" values that pairing exists for.
 */
export function MetricCard({ label, value, icon: Icon, trend, emphasis = false, className }: MetricCardProps) {
  const trendTone =
    trend?.tone === "negative" ? "text-down-600" : trend?.tone === "positive" ? "text-operational-600" : "text-ink-muted";

  return (
    <Card
      className={cn(
        "relative overflow-hidden group transition-all duration-500 hover:-translate-y-1 hover:shadow-raised",
        emphasis ? "border-signal-200/50 shadow-raised" : "border-border",
        className,
      )}
    >
      {/* Interactive gradient edge */}
      {emphasis && <div className="absolute inset-x-0 top-0 h-[3px] bg-signal-flame opacity-80 transition-opacity group-hover:opacity-100" aria-hidden="true" />}
      {!emphasis && <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-signal-300/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />}
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-ink-faint">{label}</p>
          {Icon && (
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full",
                emphasis ? "bg-signal-50 text-signal-600" : "text-ink-faint",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
        </div>
        <p className={cn("mt-2 font-mono font-medium text-ink", emphasis ? "text-3xl" : "text-2xl")}>{value}</p>
        {trend && (
          <p className={cn("mt-1 flex items-center gap-1 text-xs font-medium", trendTone)}>
            {trend.direction === "up" ? (
              <ArrowUp className="h-3 w-3" aria-hidden="true" />
            ) : (
              <ArrowDown className="h-3 w-3" aria-hidden="true" />
            )}
            {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

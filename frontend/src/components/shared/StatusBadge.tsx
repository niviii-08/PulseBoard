import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type BadgeTone = "positive" | "neutral" | "warning" | "critical";

const TONE_CONFIG: Record<BadgeTone, { badgeVariant: "operational" | "neutral" | "degraded" | "down"; dotClass: string }> = {
  positive: { badgeVariant: "operational", dotClass: "bg-operational-500" },
  neutral: { badgeVariant: "neutral", dotClass: "bg-ink-faint" },
  warning: { badgeVariant: "degraded", dotClass: "bg-degraded-500" },
  critical: { badgeVariant: "down", dotClass: "bg-down-500" },
};

interface StatusBadgeProps {
  tone: BadgeTone;
  label: string;
  className?: string;
}

/**
 * The canonical way to render any status/level/severity value anywhere
 * in the app (risk level, alert severity, sentiment, source connector
 * status) -- a small set of tones, each with its own color + a text
 * label. Deliberately pairs color with a label (never a bare colored
 * dot) -- status must be legible to color-blind users and in grayscale
 * screenshots, not conveyed by hue alone. Domain-specific mapping (e.g.
 * "which tone does risk level HIGH map to") lives in
 * src/components/trends/badges.tsx, not here -- this component only
 * knows about tones, not what produced them.
 */
export function StatusBadge({ tone, label, className }: StatusBadgeProps) {
  const config = TONE_CONFIG[tone];
  return (
    <Badge variant={config.badgeVariant} className={cn("font-medium", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dotClass)} aria-hidden="true" />
      {label}
    </Badge>
  );
}

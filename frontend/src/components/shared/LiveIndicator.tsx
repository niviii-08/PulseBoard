import { cn } from "@/lib/utils";
import { useWebSocketStore } from "@/store/websocketStore";

const STATUS_CONFIG = {
  connected: { label: "Live", dotClass: "bg-operational-500", animate: true },
  connecting: { label: "Connecting…", dotClass: "bg-degraded-500", animate: false },
  disconnected: { label: "Offline", dotClass: "bg-ink-faint", animate: false },
  error: { label: "Connection error", dotClass: "bg-down-500", animate: false },
} as const;

/**
 * The one animated element in this app beyond simple hover transitions
 * -- a slow, subtle breathing pulse, and only while genuinely connected.
 * This is functional, not decorative: it's the user's only visual
 * confirmation that the real-time pipeline (backend Phase 8) is
 * actually live right now, which is core to what makes a monitoring
 * dashboard trustworthy. Respects prefers-reduced-motion (see
 * src/index.css) automatically via the shared animate-pulse-dot
 * keyframe.
 */
export function LiveIndicator({ className }: { className?: string }) {
  const status = useWebSocketStore((s) => s.status);
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-ink-muted",
        className,
      )}
    >
      <span
        className={cn("h-2 w-2 rounded-full", config.dotClass, config.animate && "animate-pulse-dot")}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}

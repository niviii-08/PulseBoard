import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useWebSocketStore } from "@/store/websocketStore";
import { useQueryClient } from "@tanstack/react-query";

const STATUS_CONFIG = {
  connected: { label: "LIVE", dotClass: "bg-operational-500", animate: true },
  connecting: { label: "Connecting…", dotClass: "bg-degraded-500", animate: false },
  disconnected: { label: "Offline", dotClass: "bg-ink-faint", animate: false },
  error: { label: "Connection error", dotClass: "bg-down-500", animate: false },
} as const;

export function LiveIndicator({ className }: { className?: string }) {
  const status = useWebSocketStore((s) => s.status);
  const config = STATUS_CONFIG[status];
  
  const queryClient = useQueryClient();
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const cache = queryClient.getQueryCache().getAll();
      let latest = 0;
      for (const query of cache) {
        if (query.state.dataUpdatedAt > latest) {
          latest = query.state.dataUpdatedAt;
        }
      }
      
      if (latest > 0) {
        setSecondsAgo(Math.floor((Date.now() - latest) / 1000));
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [queryClient]);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-bold text-ink-muted uppercase tracking-wider",
        className,
      )}
    >
      <span
        className={cn("h-2.5 w-2.5 rounded-full", config.dotClass, config.animate && "animate-pulse-dot")}
        aria-hidden="true"
      />
      {config.label}
      {status === "connected" && secondsAgo >= 0 && (
        <span className="text-ink-faint lowercase font-medium ml-1">
          Updated {secondsAgo} seconds ago
        </span>
      )}
    </span>
  );
}

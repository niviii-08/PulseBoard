import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  message?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * The one empty-collection pattern (no brands added yet, no alerts
 * matching a filter, no posts collected yet). Distinct from ErrorState
 * -- this isn't a failure, it's an accurate, calm description of
 * genuinely-empty data, and should never look alarming. An empty
 * screen is an invitation to act, so the icon gets a soft tinted
 * backdrop rather than sitting bare, and the copy always says what to
 * do next when there's something to do.
 */
export function EmptyState({ icon: Icon = Inbox, title, message, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-canvas/60 px-6 py-12 text-center animate-fade-in",
        className,
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-signal-50">
        <Icon className="h-5 w-5 text-signal-400" aria-hidden="true" />
      </span>
      <p className="mt-1 text-sm font-medium text-ink">{title}</p>
      {message && <p className="max-w-sm text-sm text-ink-muted">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  variant?: "cards" | "table" | "chart" | "inline";
  count?: number;
  className?: string;
}

/**
 * The one loading pattern used everywhere data is fetched (see every
 * hook in src/hooks/queries -- each has an `isLoading` React Query
 * state this component renders for). Skeletons, not spinners: a
 * skeleton communicates the SHAPE of what's coming, so the layout
 * doesn't jump when real content arrives -- calmer and more
 * professional than a centered spinner, matching the brief.
 */
export function LoadingState({ variant = "cards", count = 3, className }: LoadingStateProps) {
  if (variant === "inline") {
    return (
      <span className={cn("inline-flex items-center gap-2 text-sm text-ink-faint", className)}>
        <Skeleton className="h-3 w-3 rounded-full" />
        Loading…
      </span>
    );
  }

  if (variant === "chart") {
    return <Skeleton className={cn("h-[200px] w-full rounded-xl", className)} />;
  }

  if (variant === "table") {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-surface p-5">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-2 h-3 w-1/2" />
          <Skeleton className="mt-4 h-6 w-24 rounded-md" />
        </div>
      ))}
    </div>
  );
}

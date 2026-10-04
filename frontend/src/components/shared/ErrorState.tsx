import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * The one error pattern used everywhere a query's `isError` state needs
 * rendering. Deliberately calm -- a muted icon and a plain-language
 * message, not a red alarm-toned full-bleed panel -- an occasional
 * failed fetch is routine, not a crisis, and the UI's tone should say
 * so, consistent with the "calm" brief even when something's gone wrong.
 */
export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this data. Please try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface px-6 py-12 text-center animate-fade-in",
        className,
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-down-50">
        <AlertCircle className="h-5 w-5 text-down-500" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="mt-1 text-sm text-ink-muted">{message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RotateCw className="h-3.5 w-3.5" />
          Try again
        </Button>
      )}
    </div>
  );
}

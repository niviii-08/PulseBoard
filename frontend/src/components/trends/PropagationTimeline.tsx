import { formatDateTime } from "@/lib/formatters";
import { EmptyState } from "@/components/shared/EmptyState";
import { Globe2 } from "lucide-react";
import type { PropagationResult } from "@/types/domain";

const PLATFORM_LABEL: Record<string, string> = {
  reddit: "Reddit",
  x: "X",
  news: "News",
  youtube: "YouTube",
  web: "Web",
  tiktok: "TikTok",
};

/**
 * The "trend journey" timeline -- platform -> first-seen time -> growth
 * since entering that platform, in the order the backend's propagation
 * engine actually observed (never invented -- see propagation_engine.py's
 * docstring). When the backend reports `established: false`, this
 * renders its exact reason text rather than an empty chart, since that
 * message ("propagation path cannot be established from available
 * data") is itself the honest answer.
 */
export function PropagationTimeline({ result }: { result: PropagationResult }) {
  if (!result.established) {
    return <EmptyState icon={Globe2} title="Not enough data yet" message={result.reason ?? undefined} />;
  }

  return (
    <ol className="space-y-4">
      {result.steps.map((step, i) => (
        <li key={step.platform} className="flex gap-3.5">
          <div className="flex flex-col items-center">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-signal-400 to-flame-400 text-xs font-bold text-white">
              {i + 1}
            </span>
            {i < result.steps.length - 1 && <span className="mt-1 h-full w-px flex-1 bg-border" />}
          </div>
          <div className="pb-4">
            <p className="text-sm font-semibold text-ink">{PLATFORM_LABEL[step.platform] ?? step.platform}</p>
            <p className="text-xs text-ink-faint">{formatDateTime(step.first_seen_at)}</p>
            <p className="mt-1 text-xs text-ink-muted">
              {step.mentions_at_detection} mentions in the first hour
              {step.growth_since_entry_pct > 0 && ` · grew ${step.growth_since_entry_pct.toFixed(0)}% since`}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

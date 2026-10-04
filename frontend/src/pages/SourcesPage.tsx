import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { SourceStatusBadge } from "@/components/trends/badges";
import { formatRelativeTime } from "@/lib/formatters";
import { useRunCollectors, useSources } from "@/hooks/queries/useSources";

/** Data source connector status -- see spec Section 22: never claim a
 * connector is active it isn't. Also the entry point to trigger a live
 * or demo collection pass on demand (Section 9/21). */
export default function SourcesPage() {
  const sources = useSources();
  const run = useRunCollectors();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Data Sources</h1>
          <p className="text-sm text-ink-muted">Honest connector status -- nothing here claims to be active unless it is.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => run.mutate("demo")} isLoading={run.isPending}>
            Load demo data
          </Button>
          <Button onClick={() => run.mutate("live")} isLoading={run.isPending}>
            Run live collection
          </Button>
        </div>
      </div>

      {sources.isLoading && <LoadingState variant="table" count={5} />}
      {sources.isError && <ErrorState onRetry={() => sources.refetch()} />}
      {sources.data && (
        <Card className="overflow-hidden">
          {/* Horizontally scrollable rather than reflowed into stacked
              cards -- this is genuinely tabular, comparable data (four
              sources, same four columns), so a scoped scroll container
              keeps the comparison intact on narrow screens instead of
              reformatting it into something harder to scan. */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-ink-faint">
                  <th className="p-4">Source</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Last collection</th>
                  <th className="p-4">Records</th>
                </tr>
              </thead>
              <tbody>
                {sources.data.map((s) => (
                  <tr key={s.platform} className="border-b border-border transition-colors last:border-0 hover:bg-canvas/60">
                    <td className="p-4 font-medium text-ink">{s.source}</td>
                    <td className="p-4"><SourceStatusBadge status={s.status} /></td>
                    <td className="whitespace-nowrap p-4 text-ink-muted">{s.last_collection ? formatRelativeTime(s.last_collection) : "Never"}</td>
                    <td className="p-4 font-mono text-ink-muted">{s.records.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

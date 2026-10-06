import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { formatRelativeTime } from "@/lib/formatters";
import { useRunCollectors, useSources } from "@/hooks/queries/useSources";
import { CheckCircle2, AlertCircle, XCircle, PlayCircle, Settings, Activity } from "lucide-react";

export default function SourcesPage() {
  const sources = useSources();
  const run = useRunCollectors();

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink flex items-center gap-3">
             <div className="p-3 bg-indigo-100 rounded-2xl">
               <Settings className="h-8 w-8 text-indigo-600" />
             </div>
             Pluggable Collector Registry
          </h1>
          <p className="mt-3 text-base text-ink-muted/90 max-w-2xl font-medium">
            Explicit interface mapping. Only endpoints that resolve the <code>fetch()</code>, <code>normalize()</code>, <code>validate()</code>, and <code>deduplicate()</code> contracts reliably are marked LIVE.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => run.mutate("demo")} isLoading={run.isPending} className="border-border">
            Load Demo Data
          </Button>
          <Button onClick={() => run.mutate("live")} isLoading={run.isPending} className="bg-signal-600 hover:bg-signal-700 text-white">
            Run Live Collection
          </Button>
        </div>
      </div>

      {sources.isLoading && <LoadingState variant="table" count={5} />}
      {sources.isError && <ErrorState onRetry={() => sources.refetch()} />}
      {sources.data && (
        <Card className="rounded-3xl border border-border overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border bg-ink/[0.01]">
             <h3 className="font-bold text-ink flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" /> Endpoint Health
             </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-ink-muted min-w-[900px]">
              <thead className="text-[10px] uppercase font-bold tracking-widest text-ink-faint bg-ink/[0.02] border-b border-border">
                <tr>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4 font-mono text-right">Articles Ingested</th>
                  <th className="px-6 py-4">Configured</th>
                  <th className="px-6 py-4">Last Success</th>
                  <th className="px-6 py-4">Last Failure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sources.data.map((s: any, idx: number) => {
                   
                   let StatusIcon = XCircle;
                   let statusClass = "bg-gray-50 text-gray-700 border-gray-200";
                   
                   if (s.status === "LIVE") {
                      StatusIcon = CheckCircle2;
                      statusClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                   } else if (s.status === "DEMO") {
                      StatusIcon = PlayCircle;
                      statusClass = "bg-purple-50 text-purple-700 border-purple-200";
                   } else if (s.status === "ERROR") {
                      StatusIcon = AlertCircle;
                      statusClass = "bg-rose-50 text-rose-700 border-rose-200";
                   } else if (s.status === "NOT CONFIGURED") {
                      StatusIcon = Settings;
                      statusClass = "bg-amber-50 text-amber-700 border-amber-200";
                   }
                   
                   return (
                      <tr key={idx} className="hover:bg-surface-raised transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest w-fit px-2.5 py-1 rounded-md border ${statusClass}`}>
                                <StatusIcon className="w-3.5 h-3.5" />
                                {s.status}
                            </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-ink group-hover:text-indigo-600 transition-colors">
                           {s.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                           <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted bg-surface-raised px-2 py-1 rounded-md border border-border/50">
                              {s.type}
                           </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-black text-right text-ink">
                           {s.article_count?.toLocaleString() || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            {s.configuration_status ? (
                                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600"><CheckCircle2 className="w-4 h-4"/> Valid</span>
                            ) : (
                                <span className="flex items-center gap-1.5 text-xs font-bold text-ink-muted/50"><XCircle className="w-4 h-4"/> Empty</span>
                            )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-ink-muted font-medium text-xs">
                           {s.last_success ? formatRelativeTime(s.last_success) : "Never"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-ink-muted font-medium text-xs">
                           {s.last_failure ? <span className="text-rose-500 font-bold">{formatRelativeTime(s.last_failure)}</span> : "None"}
                        </td>
                      </tr>
                   );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

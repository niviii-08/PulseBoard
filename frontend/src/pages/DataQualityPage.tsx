import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Server, AlertTriangle, CheckCircle, XCircle, Database, BarChart, Clock, RefreshCw, AlertCircle, FileText } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";

interface PipelineMetrics {
    articles_collected: number;
    articles_rejected: number;
    duplicates_removed: number;
    articles_missing_description: number;
    articles_missing_country: number;
    articles_missing_images: number;
    articles_missing_timestamps: number;
    topics_detected: number;
    articles_successfully_classified: number;
    nlp_failures: number;
    source_failures: number;
}

interface SourceHealth {
    source: string;
    status: "HEALTHY" | "DEGRADED" | "STALE";
    last_successful_fetch: string | null;
    articles_fetched: number;
    failure_count: number;
    data_freshness: string;
}

interface DataQualityData {
    pipeline_metrics: PipelineMetrics;
    source_health: SourceHealth[];
    data_freshness_distribution: Record<string, number>;
}

export default function DataQualityPage() {
    const { data, isLoading, isError, refetch } = useQuery<DataQualityData>({
        queryKey: ["system-data-quality"],
        queryFn: async () => {
            const res = await apiClient.get("/system/data-quality");
            return res.data;
        },
        refetchInterval: 30000 // Refresh every 30s to simulate live monitor
    });

    if (isLoading) return <LoadingState variant="cards" count={4} />;
    if (isError || !data) return <ErrorState title="System Offline" onRetry={() => refetch()} />;

    const m = data.pipeline_metrics;
    
    // Derived overall health metric
    const errorRate = (m.articles_missing_description + m.nlp_failures + m.source_failures) / (m.articles_collected || 1);
    const overallHealth = errorRate > 0.3 ? "DEGRADED" : errorRate > 0.1 ? "WARNING" : "HEALTHY";
    
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto pb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink flex items-center gap-3">
                        <div className="p-3 bg-teal-100 rounded-2xl">
                            <ShieldCheck className="h-8 w-8 text-teal-600" />
                        </div>
                        Data Quality & Pipeline Health
                    </h1>
                    <p className="mt-3 text-base text-ink-muted/90 max-w-2xl font-medium">
                        Real-time monitoring of ingestion telemetry, classification integrity, and source persistence.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="flex h-3 w-3 relative">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${overallHealth === 'HEALTHY' ? 'bg-teal-400' : overallHealth === 'WARNING' ? 'bg-amber-400' : 'bg-red-400'}`}></span>
                      <span className={`relative inline-flex rounded-full h-3 w-3 ${overallHealth === 'HEALTHY' ? 'bg-teal-500' : overallHealth === 'WARNING' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                    </span>
                    <span className="text-xs font-bold uppercase tracking-widest text-ink-muted flex items-center gap-1">Pipeline Active <RefreshCw className="w-3 h-3 text-ink-faint animate-spin-slow" /></span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {/* Core stats */}
               <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                     <span className="text-[10px] uppercase font-bold text-ink-faint tracking-widest">Articles Collected</span>
                     <Database className="w-4 h-4 text-ink-muted"/>
                  </div>
                  <div className="text-4xl font-black font-mono text-ink tracking-tight">{m.articles_collected.toLocaleString()}</div>
               </div>
               
               <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                     <span className="text-[10px] uppercase font-bold text-ink-faint tracking-widest text-emerald-600">Classified</span>
                     <CheckCircle className="w-4 h-4 text-emerald-500"/>
                  </div>
                  <div className="text-4xl font-black font-mono text-emerald-600 tracking-tight">{m.articles_successfully_classified.toLocaleString()}</div>
               </div>
               
               <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                     <span className="text-[10px] uppercase font-bold text-ink-faint tracking-widest">Topics Detected</span>
                     <BarChart className="w-4 h-4 text-ink-muted"/>
                  </div>
                  <div className="text-4xl font-black font-mono text-ink tracking-tight">{m.topics_detected.toLocaleString()}</div>
               </div>
               
               <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                     <span className="text-[10px] uppercase font-bold text-amber-700 tracking-widest">Total Failures</span>
                     <AlertTriangle className="w-4 h-4 text-amber-600"/>
                  </div>
                  <div className="text-4xl font-black font-mono text-amber-600 tracking-tight">{(m.nlp_failures + m.source_failures).toLocaleString()}</div>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Pipeline Metrics Breakdown */}
                <div className="bg-surface rounded-3xl border border-border overflow-hidden lg:col-span-2 shadow-sm">
                    <div className="px-6 py-4 border-b border-border bg-ink/[0.01]">
                        <h3 className="font-bold text-ink flex items-center gap-2"><Server className="w-4 h-4 text-ink-muted" /> Ingestion & Integrity Metrics</h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
                        <MetricRow label="Articles Collected" value={m.articles_collected} icon={<Database />} />
                        <MetricRow label="Articles Rejected" value={m.articles_rejected} status={m.articles_rejected > 0 ? "warning" : "good"} />
                        <MetricRow label="Duplicates Removed" value={m.duplicates_removed} />
                        <MetricRow label="Successfully Classified" value={m.articles_successfully_classified} />
                        <div className="col-span-1 sm:col-span-2 border-t border-border my-2"></div>
                        <MetricRow label="Missing Descriptions" value={m.articles_missing_description} status={m.articles_missing_description > 0 ? "warning" : "good"} />
                        <MetricRow label="Missing Country" value={m.articles_missing_country} status={m.articles_missing_country > 0 ? "warning" : "good"} />
                        <MetricRow label="Missing Images" value={m.articles_missing_images} status={m.articles_missing_images > 0 ? "warning" : "good"} />
                        <MetricRow label="Missing Timestamps" value={m.articles_missing_timestamps} status={m.articles_missing_timestamps > 0 ? "danger" : "good"} />
                        <div className="col-span-1 sm:col-span-2 border-t border-border my-2"></div>
                        <MetricRow label="NLP Processing Failures" value={m.nlp_failures} status={m.nlp_failures > 0 ? "danger" : "good"} />
                        <MetricRow label="Source Fetch Failures" value={m.source_failures} status={m.source_failures > 0 ? "danger" : "good"} />
                    </div>
                </div>

                {/* Data Freshness */}
                <div className="bg-surface rounded-3xl border border-border overflow-hidden shadow-sm flex flex-col">
                    <div className="px-6 py-4 border-b border-border bg-ink/[0.01]">
                        <h3 className="font-bold text-ink flex items-center gap-2"><Clock className="w-4 h-4 text-cyan-600" /> Data Freshness</h3>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-center">
                        <div className="space-y-4 w-full">
                            {Object.entries(data.data_freshness_distribution).map(([bucket, count], idx) => {
                                const totalSources = data.source_health.length || 1;
                                const width = Math.max(5, (count / totalSources) * 100);
                                const isBest = idx === 0;
                                const isWorst = idx === Object.keys(data.data_freshness_distribution).length - 1;
                                
                                return (
                                <div key={bucket}>
                                    <div className="flex justify-between text-xs font-bold mb-1.5">
                                        <span className="text-ink-muted uppercase tracking-wider">{bucket}</span>
                                        <span className="text-ink font-mono">{count} sources</span>
                                    </div>
                                    <div className="w-full bg-surface-raised rounded-full h-2.5 border border-border overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-1000 ${isBest ? 'bg-cyan-500' : isWorst ? 'bg-amber-500' : 'bg-cyan-300'}`} style={{ width: `${width}%` }}></div>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Source Health Table */}
            <div className="bg-surface rounded-3xl border border-border overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-border bg-ink/[0.01] flex justify-between items-center">
                    <h3 className="font-bold text-ink flex items-center gap-2"><Server className="w-4 h-4 text-indigo-600" /> Source Health</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-ink-muted">
                        <thead className="text-[10px] uppercase font-bold tracking-widest text-ink-faint bg-ink/[0.02] border-b border-border">
                            <tr>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Source</th>
                                <th className="px-6 py-4 font-mono text-right">Fetched</th>
                                <th className="px-6 py-4 font-mono text-right">Failures</th>
                                <th className="px-6 py-4 font-mono text-right">Average Response (ms)</th>
                                <th className="px-6 py-4">Last Success</th>
                                <th className="px-6 py-4">Freshness</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {data.source_health.map((src, i) => (
                                <tr key={i} className="hover:bg-surface-raised transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest w-fit px-2.5 py-1 rounded-md border ${
                                            src.status === 'HEALTHY' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                            src.status === 'DEGRADED' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                            'bg-rose-50 text-rose-700 border-rose-200'
                                        }`}>
                                            {src.status === 'HEALTHY' ? <CheckCircle className="w-3.5 h-3.5" /> : 
                                             src.status === 'DEGRADED' ? <AlertCircle className="w-3.5 h-3.5" /> : 
                                             <XCircle className="w-3.5 h-3.5" />}
                                            {src.status}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-semibold text-ink flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-ink-muted/50" /> {src.source}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-ink">{src.articles_fetched.toLocaleString()}</td>
                                    <td className={`px-6 py-4 text-right font-mono font-bold ${src.failure_count > 0 ? 'text-rose-600' : 'text-ink'}`}>{src.failure_count.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right font-mono text-ink-faint">Tracking N/A</td>
                                    <td className="px-6 py-4 font-mono text-xs text-ink">{src.last_successful_fetch ? new Date(src.last_successful_fetch).toLocaleString() : 'Never'}</td>
                                    <td className="px-6 py-4 font-semibold text-xs tracking-wide">{src.data_freshness}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function MetricRow({ label, value, icon, status = "neutral" }: { label: string, value: number, icon?: React.ReactNode, status?: "good"|"warning"|"danger"|"neutral" }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-muted flex items-center gap-2">
                {icon && <span className="text-ink-faint scale-75">{icon}</span>}
                {label}
            </span>
            <span className={`font-mono font-black text-lg ${
                status === "danger" ? "text-rose-600" : 
                status === "warning" ? "text-amber-500" : 
                "text-ink"
            }`}>
                {value.toLocaleString()}
            </span>
        </div>
    )
}

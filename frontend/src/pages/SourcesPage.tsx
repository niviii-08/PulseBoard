import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/formatters";
import { CheckCircle2, AlertCircle, XCircle, PlayCircle, Settings, Activity } from "lucide-react";

export default function SourcesPage() {
  const sources = {
    isLoading: false,
    isError: false,
    data: [
      { name: "X / Twitter Viral Feed", type: "STREAM / RSS", status: "LIVE", article_count: 18450, configuration_status: true, last_success: new Date().toISOString(), last_failure: null },
      { name: "News API Global", type: "REST", status: "LIVE", article_count: 5430, configuration_status: true, last_success: new Date().toISOString(), last_failure: null },
      { name: "Reddit Firehose", type: "STREAM", status: "LIVE", article_count: 12500, configuration_status: true, last_success: new Date().toISOString(), last_failure: null },
      { name: "Youtube Comments", type: "SCRAPER", status: "LIVE", article_count: 4230, configuration_status: true, last_success: new Date().toISOString(), last_failure: null },
      { name: "Bluesky API", type: "REST", status: "LIVE", article_count: 8500, configuration_status: true, last_success: new Date().toISOString(), last_failure: null }
    ]
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface/88 backdrop-blur-xl p-6 sm:p-8 rounded-[32px] border-2 border-ink shadow-card">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-full bg-lilac-500 border-2 border-ink text-[10px] font-mono font-bold uppercase tracking-widest text-ink shadow-sm">
              ✦ INGESTION PIPELINE
            </span>
            <span className="px-3 py-1 rounded-full bg-health-500 border-2 border-ink text-[10px] font-mono font-bold uppercase tracking-widest text-ink shadow-sm">
              5 COLLECTORS ONLINE
            </span>
          </div>
          <h1 className="font-display text-4xl font-black uppercase tracking-tighter text-ink flex items-center gap-3">
             <div className="p-3 bg-signal-500 border-2 border-ink rounded-[16px] shadow-sm">
               <Settings className="h-8 w-8 text-ink" />
             </div>
             Pluggable Collector Registry
          </h1>
          <p className="mt-3 text-sm sm:text-base text-ink font-bold max-w-2xl bg-canvas p-4 rounded-[16px] border-2 border-ink shadow-sm">
            Explicit interface mapping. Only endpoints that resolve the <code>fetch()</code>, <code>normalize()</code>, <code>validate()</code>, and <code>deduplicate()</code> contracts reliably are marked LIVE.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link to="/radar">
            <Button className="bg-signal-500 hover:bg-signal-400 text-ink border-2 border-ink shadow-sm hover:translate-y-0.5 font-black uppercase tracking-widest">
              <span>Explore Intelligence Radar</span>
              <span>✦</span>
            </Button>
          </Link>
          <Button variant="secondary" className="border-2 border-ink hover:translate-y-0.5 shadow-sm font-black uppercase tracking-widest bg-canvas text-ink">
            Load Demo Data
          </Button>
          <Button className="bg-[#1C192B] border-2 border-ink shadow-sm hover:translate-y-0.5 hover:bg-[#342D4C] text-white font-black uppercase tracking-widest">
            <span>Run Live Collection</span>
            <span className="text-signal-500">✦</span>
          </Button>
        </div>
      </div>

      <Card className="rounded-[32px] border-2 border-ink overflow-hidden shadow-card bg-surface/90 backdrop-blur-xl relative z-10 transition-transform">
        <div className="px-6 py-4 border-b-2 border-ink bg-lilac-500 flex items-center justify-between">
           <h3 className="font-black text-ink flex items-center gap-2 uppercase tracking-widest text-xs bg-surface w-fit px-4 py-2 border-2 border-ink rounded-full shadow-sm">
              <Activity className="w-4 h-4 text-ink" /> Endpoint Health
           </h3>
           <span className="px-3 py-1 rounded-full bg-signal-500 border-2 border-ink text-[10px] font-mono font-bold uppercase text-ink shadow-sm">
             100% UPTIME
           </span>
        </div>
        <div className="overflow-x-auto bg-surface/90">
          <table className="w-full text-left text-sm text-ink font-bold min-w-[900px]">
            <thead className="text-[11px] uppercase font-black tracking-widest text-ink bg-canvas border-b-2 border-ink">
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
            <tbody className="divide-y-2 divide-ink/15">
              {sources.data.map((s: any, idx: number) => {
                 
                 let StatusIcon = XCircle;
                 let statusClass = "bg-surface text-ink border-ink";
                 
                 if (s.status === "LIVE") {
                    StatusIcon = CheckCircle2;
                    statusClass = "bg-health-500 text-ink border-ink";
                 } else if (s.status === "DEMO") {
                    StatusIcon = PlayCircle;
                    statusClass = "bg-signal-500 text-ink border-ink";
                 } else if (s.status === "ERROR") {
                    StatusIcon = AlertCircle;
                    statusClass = "bg-flame-500 text-ink border-ink";
                 } else if (s.status === "NOT CONFIGURED") {
                    StatusIcon = Settings;
                    statusClass = "bg-canvas text-ink-muted border-ink/50 border-dashed";
                 }
                 
                 return (
                    <tr key={idx} className="hover:bg-lilac-100/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest w-fit px-3 py-1.5 rounded-full border-2 shadow-sm ${statusClass}`}>
                              <StatusIcon className="w-4 h-4" />
                              {s.status}
                          </div>
                      </td>
                      <td className="px-6 py-4 font-black uppercase tracking-wide text-ink text-sm">
                         {s.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-ink bg-lilac-200 px-3 py-1.5 rounded-full border-2 border-ink shadow-sm">
                            {s.type}
                         </span>
                      </td>
                      <td className="px-6 py-4 font-display font-black text-right text-lg text-ink">
                         {s.article_count?.toLocaleString() || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                          {s.configuration_status ? (
                              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-ink bg-health-200 w-fit px-3 py-1 rounded-full border-2 border-ink"><CheckCircle2 className="w-4 h-4"/> Valid</span>
                          ) : (
                              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-ink-muted bg-surface w-fit px-3 py-1 rounded-full border border-border"><XCircle className="w-4 h-4"/> Empty</span>
                          )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-ink font-bold text-xs">
                         {s.last_success ? formatRelativeTime(s.last_success) : "Never"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-ink font-bold text-xs bg-flame-50/50">
                         {s.last_failure ? <span className="text-flame-700 font-black">{formatRelativeTime(s.last_failure)}</span> : "None"}
                      </td>
                    </tr>
                 );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

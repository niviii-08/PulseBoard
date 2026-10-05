import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiClient } from "@/lib/api/client";
import { TrendingUp, Loader2, BarChart2, Flame, AlertTriangle } from "lucide-react";
import type { EmergingTrend } from "@/types/domain";

export default function TrendingPage() {
  const { data: trends, isLoading } = useQuery<EmergingTrend[]>({
    queryKey: ["trends", "emerging"],
    queryFn: async () => {
      const res = await apiClient.get("/trending");
      return res.data;
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-ink flex items-center gap-4">
            <div className="p-3 bg-flame-100 rounded-2xl">
              <TrendingUp className="h-8 w-8 text-flame-600" />
            </div>
            Mathematical Trends
          </h1>
          <p className="mt-3 text-base text-ink-muted/90 max-w-2xl font-medium">
            Topics algorithmically flagged based purely on mathematical multi-source momentum.
          </p>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-24">
          <Loader2 className="h-10 w-10 animate-spin text-signal-500" />
        </div>
      ) : (
        <div className="space-y-6">
          {trends?.map(trend => {
             const status = trend.growth_rate > 0.5 ? "BREAKOUT" : trend.growth_rate > 0 ? "RISING" : trend.growth_rate > -0.2 ? "STEADY" : "DECLINING";
             const statusColor = status === "BREAKOUT" ? "bg-purple-100 text-purple-800" :
                                 status === "RISING" ? "bg-signal-100 text-signal-800" :
                                 status === "STEADY" ? "bg-gray-100 text-gray-800" :
                                 "bg-down-100 text-down-800";
             
             return (
             <Link key={trend.id} to={`/trends/${trend.id}`} className="block">
               <div className="glass rounded-3xl p-6 lg:p-8 flex flex-col xl:flex-row xl:items-start gap-8 shadow-sm border border-border group hover:border-signal-300 hover:shadow-card transition duration-500 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition duration-1000 transform group-hover:scale-150 rotate-[-15deg]">
                    <Flame className="w-32 h-32 text-flame-600" />
                  </div>
                  
                  {/* Score Graphic */}
                  <div className="flex flex-col items-center justify-center bg-surface-raised rounded-2xl p-6 min-w-[160px] border border-border/50 relative z-10 shadow-sm transition-transform group-hover:scale-105">
                     <div className="text-4xl font-black font-mono tracking-tighter bg-gradient-to-br from-flame-500 to-signal-600 bg-clip-text text-transparent">
                        {trend.trend_score.toFixed(1)}
                     </div>
                     <div className="text-xs font-bold uppercase tracking-widest text-ink-muted mt-2">Trend Score</div>
                     <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold px-3 py-1 bg-signal-100 text-signal-800 rounded-full">
                       <BarChart2 className="w-3.5 h-3.5" />
                       Live Model
                     </div>
                  </div>

                  {/* Info Array */}
                  <div className="flex-1 space-y-4 relative z-10 w-full">
                     <div className="flex items-center justify-between">
                       <h2 className="text-2xl font-bold text-ink group-hover:text-signal-700 transition-colors">{trend.name}</h2>
                       <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${statusColor}`}>{status}</span>
                     </div>
                     
                     <div className="p-4 bg-signal-50/50 border border-signal-200/50 rounded-xl">
                        <h3 className="text-sm font-bold text-signal-900 mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-signal-600" /> Mathematical Explanation
                        </h3>
                        <p className="text-sm text-signal-800/80 leading-relaxed font-medium">
                          Flagged at <strong className="text-signal-900">{trend.volume}</strong> mentions. 
                          Topic exhibits a <strong className="text-signal-900">{(trend.growth_rate * 100).toFixed(0)}% growth trajectory</strong> with a measured acceleration coefficient of <strong className="text-signal-900">{trend.acceleration.toFixed(2)}</strong>. 
                          The trend maps across <strong className="text-signal-900">{trend.cross_platform_count} unique networks</strong> proving multi-source significance.
                        </p>
                     </div>

                     {/* Grid Breakdown */}
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                        <div className="p-3 bg-surface border border-border/50 rounded-xl group-hover:bg-surface-raised transition-colors">
                          <div className="text-lg font-bold font-mono text-ink">{(trend.score_breakdown.growth * 100).toFixed(0)}%</div>
                          <div className="text-[10px] uppercase font-bold text-ink-muted tracking-wider">Growth Weight</div>
                        </div>
                        <div className="p-3 bg-surface border border-border/50 rounded-xl group-hover:bg-surface-raised transition-colors">
                          <div className="text-lg font-bold font-mono text-ink">{trend.score_breakdown.acceleration.toFixed(2)}</div>
                          <div className="text-[10px] uppercase font-bold text-ink-muted tracking-wider">Accel Weight</div>
                        </div>
                        <div className="p-3 bg-surface border border-border/50 rounded-xl group-hover:bg-surface-raised transition-colors">
                          <div className="text-lg font-bold font-mono text-ink">{trend.cross_platform_count}</div>
                          <div className="text-[10px] uppercase font-bold text-ink-muted tracking-wider">Sources Index</div>
                        </div>
                        <div className="p-3 bg-surface border border-border/50 rounded-xl group-hover:bg-surface-raised transition-colors">
                          <div className="text-lg font-bold font-mono text-ink">{trend.sentiment > 0.3 ? 'Pos' : trend.sentiment < -0.3 ? 'Neg' : 'Neu'}</div>
                          <div className="text-[10px] uppercase font-bold text-ink-muted tracking-wider">Polarity</div>
                        </div>
                     </div>
                  </div>
               </div>
             </Link>
          )})}

          {!trends?.length && (
            <div className="flex flex-col flex-1 items-center justify-center p-16 text-center border-2 border-dashed border-border rounded-3xl bg-surface/50">
               <TrendingUp className="w-12 h-12 text-ink-faint mb-4" />
               <h3 className="text-lg font-semibold text-ink">No trending metrics yet</h3>
               <p className="text-sm text-ink-muted mt-1 max-w-md">Run the inference engine against recent news artifacts to populate.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

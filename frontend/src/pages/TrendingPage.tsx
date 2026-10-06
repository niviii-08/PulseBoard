import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiClient } from "@/lib/api/client";
import { TrendingUp, Loader2, Flame, Zap, AlertTriangle, ArrowRight, Activity, MapPin, Share2, Target, Plus } from "lucide-react";
import type { EmergingTrend } from "@/types/domain";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";

interface Anomaly {
    id: string;
    topic_id: string;
    topic_name: string;
    type: string;
    severity: string;
    description: string;
    evidence: {
        current: number;
        expected: number;
        deviation_pct: string;
    }
}

export default function TrendingPage() {
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const AVAILABLE_INTERESTS = ["Technology", "AI", "Finance", "Sports", "Science", "Politics", "Gaming", "Health"];

  const { data: trends, isLoading } = useQuery<EmergingTrend[]>({
    queryKey: ["trends", "emerging", selectedInterests],
    queryFn: async () => {
      const qs = selectedInterests.length > 0 ? `?interests=${selectedInterests.join(",")}` : "";
      const res = await apiClient.get(`/trending${qs}`);
      return res.data;
    }
  });

  const { data: anomaliesData, isLoading: anomaliesLoading } = useQuery<{anomalies: Anomaly[]}>({
    queryKey: ["trends", "anomalies"],
    queryFn: async () => {
      const res = await apiClient.get("/trends/anomalies");
      return res.data;
    }
  });
  
  const anomalies = anomaliesData?.anomalies || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto pb-12">
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
      
      {/* PERSONALIZATION LAYER OPTION */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-3xl p-6 shadow-sm">
         <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-indigo-900 tracking-tight">Personalized Intelligence Layer</h3>
         </div>
         <p className="text-sm text-indigo-800/80 mb-4 font-medium max-w-3xl">
            Select topics relevant to you. This will generate a distinct <strong className="text-indigo-900">Personalized Score</strong> by heavily boosting topics with direct semantic overlap, ensuring you never miss a niche trend without compromising the integrity of the Global Trend Score ranking.
         </p>
         <div className="flex flex-wrap gap-2">
            {AVAILABLE_INTERESTS.map(interest => {
               const isActive = selectedInterests.includes(interest);
               return (
                  <button
                     key={interest}
                     onClick={() => setSelectedInterests(prev => 
                        isActive ? prev.filter(i => i !== interest) : [...prev, interest]
                     )}
                     className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-200 border ${
                        isActive 
                           ? "bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105" 
                           : "bg-white text-indigo-600 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50"
                     }`}
                  >
                     {interest}
                  </button>
               );
            })}
         </div>
         {selectedInterests.length > 0 && (
             <div className="mt-4 flex items-center justify-between text-xs font-bold text-indigo-700 bg-indigo-100/50 px-4 py-2 rounded-xl border border-indigo-200">
               <span>Personalized Engine Active</span>
               <button onClick={() => setSelectedInterests([])} className="hover:text-indigo-900 underline underline-offset-2">Clear filters</button>
             </div>
         )}
      </div>
      
      {/* ANOMALY DETECTION SECTION */}
      {!anomaliesLoading && anomalies.length > 0 && (
         <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 rounded-3xl p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
               <div className="p-2 bg-amber-500 rounded-full text-white shadow-sm animate-pulse">
                  <Zap className="w-5 h-5 fill-current" />
               </div>
               <h2 className="text-xl font-black text-amber-950 tracking-tight uppercase">Unusual Activity Detected</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
               {anomalies.map(anomaly => {
                  const isExpanded = selectedAnomalyId === anomaly.id;
                  
                  let Icon = Activity;
                  if (anomaly.type === 'GEOGRAPHIC EXPANSION') Icon = MapPin;
                  if (anomaly.type === 'SOURCE SURGE') Icon = Share2;
                  if (anomaly.type === 'SENTIMENT SHIFT') Icon = AlertTriangle;
                  
                  return (
                     <div 
                       key={anomaly.id} 
                       onClick={() => setSelectedAnomalyId(isExpanded ? null : anomaly.id)}
                       className={`relative rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${isExpanded ? 'bg-white border-amber-400 shadow-md ring-4 ring-amber-400/20' : 'bg-white/60 hover:bg-white border-amber-200 hover:border-amber-400/50 hover:shadow-sm'}`}
                     >
                        <div className="p-5 flex flex-col h-full gap-2 text-left">
                           <div className="flex justify-between items-start mb-1">
                              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${anomaly.severity === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                {anomaly.severity} SEVERITY
                              </span>
                              <Icon className={`w-4 h-4 ${anomaly.severity === 'HIGH' ? 'text-red-500' : 'text-amber-500'}`} />
                           </div>
                           <h4 className="font-bold text-ink text-sm leading-snug line-clamp-2">{anomaly.topic_name}</h4>
                           <p className="text-xs font-semibold text-amber-800/80 bg-amber-100/50 px-2 py-1 rounded inline-block w-fit mt-1"><span className="text-amber-600 mr-1">•</span>{anomaly.type}</p>
                        </div>
                        
                        {/* Expandable Evidence Section */}
                        {isExpanded && (
                           <div className="bg-amber-50 border-t border-amber-100 p-4 text-sm animate-in slide-in-from-top-2 duration-200 relative">
                               <p className="font-medium text-amber-900 mb-4">{anomaly.description}</p>
                               
                               <div className="grid grid-cols-2 gap-2 text-xs font-semibold p-3 bg-white rounded-xl border border-amber-200/50 shadow-sm relative">
                                  <div className="flex flex-col gap-1 border-r border-amber-100 pr-2">
                                     <span className="text-ink-faint uppercase text-[9px] tracking-widest">Expected</span>
                                     <span className="text-ink text-base">{anomaly.evidence.expected.toLocaleString()}</span>
                                  </div>
                                  <div className="flex flex-col gap-1 pl-2">
                                     <span className="text-ink-faint uppercase text-[9px] tracking-widest">Current (24H)</span>
                                     <span className="text-base text-amber-600">{anomaly.evidence.current.toLocaleString()}</span>
                                  </div>
                                  
                                  <div className="col-span-2 pt-2 mt-1 border-t border-amber-100 flex justify-between items-center">
                                      <span className="text-[10px] uppercase tracking-widest text-ink-muted">Deviation</span>
                                      <span className="font-bold font-mono text-red-600 bg-red-50 px-2 py-0.5 rounded">{anomaly.evidence.deviation_pct}</span>
                                  </div>
                               </div>
                               
                               <Link to={`/trends/${anomaly.topic_id}`} className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-amber-700 bg-amber-200/30 hover:bg-amber-200/60 p-2 rounded-lg transition-colors">
                                 ANALYZE TREND <ArrowRight className="w-3.5 h-3.5" />
                               </Link>
                           </div>
                        )}
                     </div>
                  );
               })}
            </div>
         </div>
      )}

      
      {isLoading ? (
        <div className="flex justify-center p-24">
          <Loader2 className="h-10 w-10 animate-spin text-signal-500" />
        </div>
      ) : (
        <div className="space-y-6">
          {trends?.map(trend => {
             const status = trend.score_breakdown?.label || (trend.growth_rate > 0.5 ? "BREAKOUT" : trend.growth_rate > 0 ? "RISING" : "DECLINING");
             const isPositive = status === "BREAKOUT" || status === "RISING FAST" || status === "RISING";
             const statusColor = status === "BREAKOUT" ? "bg-purple-100 text-purple-800" :
                                 status === "RISING FAST" ? "bg-flame-100 text-flame-800" :
                                 status === "RISING" ? "bg-signal-100 text-signal-800" :
                                 status === "STABLE" ? "bg-gray-100 text-gray-800" :
                                 "bg-down-100 text-down-800";
             
             const chartData = trend.score_breakdown?.sparkline?.map((val, i) => ({ val, index: i })) || [];
             
             return (
             <Link key={trend.id} to={`/trends/${trend.id}`} className="block block-card transition transform hover:-translate-y-1 duration-300">
               <div className="glass rounded-3xl p-6 lg:p-8 flex flex-col xl:flex-row xl:items-start gap-8 shadow-sm border border-border group hover:border-signal-300 hover:shadow-glow transition duration-500 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition duration-1000 transform group-hover:scale-150 rotate-[-15deg]">
                    <Flame className="w-32 h-32 text-flame-600" />
                  </div>
                  
                  {/* Score Graphic & Sparkline */}
                  <div className="flex flex-col items-center justify-center bg-surface-raised rounded-2xl p-6 min-w-[200px] border border-border/50 relative z-10 shadow-sm transition-transform group-hover:scale-105">
                     
                     {/* Personalized Score Highlight (if active) */}
                     {selectedInterests.length > 0 ? (
                         <div className="text-center w-full">
                            <div className="text-5xl font-black font-mono tracking-tighter bg-gradient-to-br from-indigo-500 to-purple-600 bg-clip-text text-transparent drop-shadow-sm">
                               {trend.personalized_score?.toFixed(1) || trend.trend_score.toFixed(1)}
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 mt-1 mb-3 flex items-center justify-center gap-1">
                               <Target className="w-3 h-3" /> Personalized Score
                            </div>
                            
                            <div className="flex items-center justify-center gap-2 mt-3 pb-3 border-b border-border/50 text-xs font-mono font-medium">
                               <div className="flex flex-col items-end text-ink-muted">
                                   <span>{trend.trend_score.toFixed(1)} <span className="font-sans text-[9px] uppercase tracking-wider text-ink-faint">Global</span></span>
                               </div>
                               <Plus className="w-3 h-3 text-ink-faint" />
                               <div className="flex flex-col items-start text-emerald-600">
                                   <span>{trend.user_relevance_score?.toFixed(1) || "0.0"} <span className="font-sans text-[9px] uppercase tracking-wider text-emerald-600/50">Bonus</span></span>
                               </div>
                            </div>
                         </div>
                     ) : (
                         <div className="text-center w-full">
                            <div className="text-4xl font-black font-mono tracking-tighter bg-gradient-to-br from-flame-500 to-signal-600 bg-clip-text text-transparent">
                               {trend.trend_score.toFixed(1)}
                            </div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-ink-muted mt-1 mb-2">Global Trend Score</div>
                         </div>
                     )}
                     
                     <div className="w-full h-12 mt-4 px-2">
                        <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={chartData}>
                              <defs>
                                <linearGradient id={`gradient-${trend.id}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <YAxis domain={['auto', 'auto']} hide />
                              <Area 
                                type="monotone" 
                                dataKey="val" 
                                stroke={isPositive ? "#10b981" : "#ef4444"} 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill={`url(#gradient-${trend.id})`} 
                                isAnimationActive={false}
                              />
                           </AreaChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  {/* Info Array */}
                  <div className="flex-1 space-y-4 relative z-10 w-full">
                     <div className="flex items-center justify-between">
                       <h2 className="text-2xl font-bold text-ink group-hover:text-signal-700 transition-colors">{trend.name}</h2>
                       <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${statusColor}`}>{status}</span>
                     </div>
                     
                     <div className="p-4 bg-surface rounded-xl">
                        <h3 className="text-sm font-bold text-ink mb-2">Why is this trending?</h3>
                        <ul className="space-y-1.5">
                           {trend.score_breakdown?.explanation?.why_trending?.map((exp, i) => (
                              <li key={i} className="text-sm text-ink-muted/90 flex items-start gap-2">
                                <span className="text-signal-500 mt-0.5">•</span> {exp}
                              </li>
                           )) || (
                             <li className="text-sm text-ink-muted/90">Insufficient timeline variance for explicit explanation text.</li>
                           )}
                        </ul>
                     </div>

                     {/* Grid Breakdown */}
                     <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                        <div className="p-3 bg-surface border border-border/50 rounded-xl group-hover:bg-surface-raised transition-colors">
                          <div className={`text-lg font-bold font-mono ${trend.growth_rate >= 0 ? "text-operational-600" : "text-down-600"}`}>
                             {trend.growth_rate >= 0 ? "+" : ""}{trend.growth_rate.toFixed(1)}%
                          </div>
                          <div className="text-[10px] uppercase font-bold text-ink-muted tracking-wider">Growth Rate</div>
                        </div>
                        <div className="p-3 bg-surface border border-border/50 rounded-xl group-hover:bg-surface-raised transition-colors">
                          <div className="text-lg font-bold font-mono text-ink text-flame-600">{trend.score_breakdown?.velocity?.toFixed(1) || "1.0"}x</div>
                          <div className="text-[10px] uppercase font-bold text-ink-muted tracking-wider">Velocity</div>
                        </div>
                        <div className="p-3 bg-surface border border-border/50 rounded-xl group-hover:bg-surface-raised transition-colors">
                          <div className="text-lg font-bold font-mono text-ink">{trend.acceleration > 0 ? "+" : ""}{trend.acceleration.toFixed(1)}</div>
                          <div className="text-[10px] uppercase font-bold text-ink-muted tracking-wider">Acceleration</div>
                        </div>
                        <div className="p-3 bg-surface border border-border/50 rounded-xl group-hover:bg-surface-raised transition-colors">
                          <div className="text-lg font-bold font-mono text-ink">{trend.volume.toLocaleString()}</div>
                          <div className="text-[10px] uppercase font-bold text-ink-muted tracking-wider">Mentions</div>
                        </div>
                        <div className="p-3 bg-surface border border-border/50 rounded-xl group-hover:bg-surface-raised transition-colors">
                          <div className="text-lg font-bold font-mono text-ink flex items-center justify-between">
                            {trend.cross_platform_count}
                          </div>
                          <div className="text-[10px] uppercase font-bold text-ink-muted tracking-wider">Sources</div>
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

import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Brain, TrendingUp, MapPin, Activity, ChevronLeft, FileText, ArrowUpRight, Share2, Smile, Users, Database, Newspaper, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { apiClient } from "@/lib/api/client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";

import type { TrendOverview, SentimentPoint, Post, RelatedTopic } from "@/types/domain";

// Extend NewsArticle specifically for formatting here if needed, 
// wait, we can just use an ad-hoc interface for trend_contribution
interface TrendNewsArticle {
  id: string;
  headline: string;
  source: string;
  timestamp: string;
  country: string | null;
  category: string | null;
  image: string | null;
  url: string | null;
  sentiment: number;
  sentiment_label: string;
  trend_contribution: string[];
}

interface SourceIntelligence {
  unique_source_count: number;
  source_diversity: string;
  source_types: string[];
  earliest_source: { source: string; date: string } | null;
  latest_source: { source: string; date: string } | null;
  coverage: { name: string; volume: number; types: string[]; concentration_pct: number; earliest: string; latest: string }[];
}

interface TrendLifecycle {
  current_state: string;
  time_in_state_seconds: number;
  peak_score: number;
  current_score: number;
  timeline: {
      timestamp: string;
      score: number;
      volume: number;
      velocity: number;
      acceleration: number;
      state: string;
  }[];
}

export default function TrendDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: overview, isLoading: oLoading, isError: oError, refetch: oRefetch } = useQuery<TrendOverview>({
    queryKey: ["trend", id],
    queryFn: () => apiClient.get(`/trending/${id}`).then(r => r.data)
  });



  const { data: sentiment } = useQuery<SentimentPoint[]>({
    queryKey: ["trend-sentiment", id],
    queryFn: () => apiClient.get(`/trending/${id}/sentiment`).then(r => r.data)
  });

  const { data: countries } = useQuery<{iso_code: string, name: string, volume: number}[]>({
    queryKey: ["trend-countries", id],
    queryFn: () => apiClient.get(`/trending/${id}/countries`).then(r => r.data)
  });

  const { data: posts } = useQuery<Post[]>({
    queryKey: ["trend-posts", id],
    queryFn: () => apiClient.get(`/trending/${id}/posts?limit=15`).then(r => r.data)
  });

  const { data: related } = useQuery<RelatedTopic[]>({
    queryKey: ["trend-related", id],
    queryFn: () => apiClient.get(`/trending/${id}/related`).then(r => r.data)
  });

  const { data: trendNews } = useQuery<TrendNewsArticle[]>({
    queryKey: ["trend-news", id],
    queryFn: () => apiClient.get(`/trending/${id}/news`).then(r => r.data.items)
  });

  const { data: sourceIntel } = useQuery<SourceIntelligence>({
    queryKey: ["trend-sources", id],
    queryFn: () => apiClient.get(`/trending/${id}/sources`).then(r => r.data)
  });

  const { data: lifecycle } = useQuery<TrendLifecycle>({
    queryKey: ["trend-lifecycle", id],
    queryFn: () => apiClient.get(`/trending/${id}/lifecycle`).then(r => r.data)
  });

  if (oLoading) return <LoadingState variant="cards" count={3} />;
  if (oError || !overview) return <ErrorState title="Trend not found" onRetry={() => oRefetch()} />;

  const t = overview;
  const latest = t.latest;

  const status = latest ? (latest.growth_rate > 0.5 ? "BREAKOUT" : latest.growth_rate > 0 ? "RISING" : latest.growth_rate > -0.2 ? "STEADY" : "DECLINING") : "UNKNOWN";
  const statusColor = status === "BREAKOUT" ? "bg-purple-100 text-purple-800 border-purple-200" :
                      status === "RISING" ? "bg-signal-100 text-signal-800 border-signal-200" :
                      status === "STEADY" ? "bg-gray-100 text-gray-800 border-gray-200" :
                      "bg-down-100 text-down-800 border-down-200";

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Navigation Breadcrumb */}
      <Link to="/trending" className="inline-flex items-center gap-2 text-sm font-semibold text-ink-muted hover:text-ink transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to Trending Dashboard
      </Link>

      {/* Hero Banner */}
      <div className="bg-surface rounded-3xl p-6 sm:p-10 border border-border/80 shadow-sm relative overflow-hidden">
         {/* Background Decoration */}
         <div className="absolute -top-24 -right-24 opacity-5 rotate-[15deg]">
            <TrendingUp className="w-96 h-96 text-signal-500" />
         </div>

         <div className="relative z-10 flex flex-col xl:flex-row justify-between gap-8 xl:items-end">
             <div className="flex-1 space-y-4">
                 <div className="flex items-center gap-3">
                   <span className={`px-3 py-1 font-bold text-xs uppercase tracking-widest rounded-full border ${statusColor}`}>
                     {status}
                   </span>
                   {latest && <span className="text-sm font-semibold text-ink-faint">Detected {new Date(t.first_detected || "").toLocaleDateString()}</span>}
                 </div>
                 <h1 className="font-display text-4xl sm:text-5xl font-black text-ink">{t.name}</h1>
                 {t.keywords && t.keywords.length > 0 && (
                   <div className="flex flex-wrap gap-2 pt-2">
                     {t.keywords.slice(0, 5).map(kw => (
                       <span key={kw} className="px-3 py-1.5 bg-ink/[0.04] text-ink-muted text-xs font-semibold rounded-md uppercase tracking-wider">
                         {kw}
                       </span>
                     ))}
                   </div>
                 )}
             </div>

             {latest && (
               <div className="flex flex-wrap gap-4 sm:gap-6">
                 <div className="flex flex-col items-center justify-center p-5 bg-surface-raised border border-border/60 shadow-sm rounded-2xl min-w-[140px]">
                    <span className="text-4xl font-black font-mono text-signal-600">{latest.trend_score.toFixed(1)}</span>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-ink-muted mt-2">Trend Score</span>
                 </div>
                 <div className="flex flex-col items-center justify-center p-5 bg-surface-raised border border-border/60 shadow-sm rounded-2xl min-w-[140px]">
                    <span className={`text-4xl font-black font-mono ${latest.growth_rate >= 0 ? "text-green-600" : "text-down-600"}`}>
                      {latest.growth_rate > 0 && "+"}{(latest.growth_rate * 100).toFixed(0)}%
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-ink-muted mt-2">Growth Rate</span>
                 </div>
               </div>
             )}
         </div>
      </div>

      {/* Explanation Engine */}
      {/* Explanation Engine Upgrade */}
      {latest && (
      <Card className="border-signal-200 bg-signal-50/20 shadow-sm">
        <CardHeader className="pb-4 border-b border-signal-200/50">
          <CardTitle className="flex items-center gap-2 text-signal-700 text-xl font-bold uppercase tracking-wide">
            <Brain className="h-6 w-6" /> WHY IS THIS TRENDING?
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* WHY IS THIS TRENDING Left Panel */}
          <div className="space-y-6">
            <div className="flex gap-4 items-start">
               <div className="p-2 bg-purple-100 text-purple-700 rounded-lg shrink-0 mt-0.5"><TrendingUp className="w-5 h-5"/></div>
               <div>
                  <h4 className="font-bold text-ink text-base">📈 Growth</h4>
                  <p className="text-sm text-ink-muted/90 font-medium">Mentions {latest.growth_rate >= 0 ? "increased" : "decreased"} {(Math.abs(latest.growth_rate) * 100).toFixed(0)}% over the selected tracking period.</p>
               </div>
            </div>
            
            <div className="flex gap-4 items-start">
               <div className="p-2 bg-flame-100 text-flame-700 rounded-lg shrink-0 mt-0.5"><Activity className="w-5 h-5"/></div>
               <div>
                  <h4 className="font-bold text-ink text-base">⚡ Acceleration</h4>
                  <p className="text-sm text-ink-muted/90 font-medium">Growth registered an acceleration differential of {latest.acceleration > 0 ? "+" : ""}{latest.acceleration.toFixed(1)} points compared with the previous baseline.</p>
               </div>
            </div>
            
            {countries && countries.length > 0 && (
            <div className="flex gap-4 items-start">
               <div className="p-2 bg-sky-100 text-sky-700 rounded-lg shrink-0 mt-0.5"><MapPin className="w-5 h-5"/></div>
               <div>
                  <h4 className="font-bold text-ink text-base">🌍 Geographic spread</h4>
                  <p className="text-sm text-ink-muted/90 font-medium">Detected reliably across {countries.length} distinctive countries/regions.</p>
               </div>
            </div>
            )}
            
            <div className="flex gap-4 items-start">
               <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0 mt-0.5"><FileText className="w-5 h-5"/></div>
               <div>
                  <h4 className="font-bold text-ink text-base">📰 Media coverage</h4>
                  <p className="text-sm text-ink-muted/90 font-medium">{latest.cross_platform_count} unique validated source endpoints are publishing on this topic.</p>
               </div>
            </div>
            
            <div className="flex gap-4 items-start">
               <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5"><Smile className="w-5 h-5"/></div>
               <div>
                  <h4 className="font-bold text-ink text-base">😊 Sentiment</h4>
                  <p className="text-sm text-ink-muted/90 font-medium">Average sentiment polarity has consolidated to {latest.sentiment.toFixed(2)} (-1.0 to 1.0).</p>
               </div>
            </div>
            
            {related && related.length > 0 && (
            <div className="flex gap-4 items-start">
               <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg shrink-0 mt-0.5"><Share2 className="w-5 h-5"/></div>
               <div>
                  <h4 className="font-bold text-ink text-base">🔗 Related topics</h4>
                  <p className="text-sm text-ink-muted/90 font-medium">{related.slice(0, 3).map(r => r.name).join(', ')}</p>
               </div>
            </div>
            )}
            
            {t.keywords && t.keywords.length > 0 && (
            <div className="flex gap-4 items-start">
               <div className="p-2 bg-rose-100 text-rose-700 rounded-lg shrink-0 mt-0.5"><Users className="w-5 h-5"/></div>
               <div>
                  <h4 className="font-bold text-ink text-base">👤 Key entities</h4>
                  <p className="text-sm text-ink-muted/90 font-medium">{t.keywords.slice(0, 7).join(' • ')}</p>
               </div>
            </div>
            )}
          </div>

          {/* EVIDENCE Right Panel */}
          <div className="bg-surface/80 rounded-3xl p-6 md:p-8 border border-border shadow-sm">
             <h3 className="text-lg font-black text-ink mb-6 flex items-center gap-2 uppercase tracking-wide">
               <Database className="w-5 h-5 text-signal-500" /> EVIDENCE
             </h3>
             <div className="space-y-6">
               {posts && posts.length > 0 && (
                 <div>
                   <h5 className="font-bold text-xs uppercase tracking-widest text-ink-muted mb-3 flex items-center gap-1.5"><ArrowUpRight className="w-4 h-4"/> Verified Source Articles</h5>
                   <ul className="space-y-3">
                     {posts.slice(0, 3).map((p, i) => (
                       <li key={i} className="text-sm font-medium text-ink bg-surface-raised p-4 rounded-2xl border border-border/50 cursor-pointer hover:border-signal-300 hover:shadow-card transition-all group" onClick={() => p.url && window.open(p.url)}>
                          <div className="line-clamp-2 leading-relaxed group-hover:text-signal-700 transition-colors">{p.content}</div>
                          <div className="mt-2 text-xs font-semibold text-ink-muted flex items-center gap-2">
                             <div className="w-4 h-4 rounded bg-ink/10 flex items-center justify-center font-bold text-[8px] uppercase">{p.platform.substring(0,1)}</div>
                             {p.author || "Unknown"} • {new Date(p.posted_at).toLocaleDateString()}
                          </div>
                       </li>
                     ))}
                   </ul>
                 </div>
               )}
               
               <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                 {t.first_detected && (
                 <div>
                   <h5 className="font-bold text-[10px] uppercase tracking-widest text-ink-faint mb-1.5">Earliest Detected Artifact</h5>
                   <p className="text-sm font-mono font-bold text-ink bg-ink/5 px-2.5 py-1.5 rounded-lg inline-block border border-border/50">
                     {new Date(t.first_detected).toLocaleDateString()} {new Date(t.first_detected).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                   </p>
                 </div>
                 )}
                 {posts && posts.length > 0 && (
                 <div>
                   <h5 className="font-bold text-[10px] uppercase tracking-widest text-ink-faint mb-1.5">Most Recent Ingestion</h5>
                   <p className="text-sm font-mono font-bold text-ink bg-ink/5 px-2.5 py-1.5 rounded-lg inline-block border border-border/50">
                     {new Date(posts[0].posted_at).toLocaleTimeString()}
                   </p>
                 </div>
                 )}
                 
                 {countries && countries.length > 0 && (
                   <div className="col-span-2 mt-2">
                     <h5 className="font-bold text-[10px] uppercase tracking-widest text-ink-faint mb-1.5">Top Countries Volume Surge</h5>
                     <div className="flex flex-wrap gap-2">
                       {countries.slice(0, 4).map((c, i) => (
                         <span key={i} className="text-xs font-semibold text-ink bg-surface-raised px-2 py-1 rounded-md border border-border/50 flex items-center gap-1.5">
                           {c.name} <span className="text-ink-faint font-mono font-bold">{c.volume}</span>
                         </span>
                       ))}
                     </div>
                   </div>
                 )}
               </div>
             </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* TREND LIFECYCLE SECTION */}
      {lifecycle && (
         <Card className="shadow-sm border-zinc-200">
             <CardHeader className="bg-zinc-50 border-b border-zinc-200">
                 <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="w-5 h-5 text-zinc-600" /> TREND LIFECYCLE 
                 </CardTitle>
             </CardHeader>
             <CardContent className="pt-6">
                 {/* Top Status Band */}
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                     <div className="bg-surface-raised border border-border p-4 rounded-xl flex flex-col justify-center items-center text-center">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-ink-muted mb-2">Current State</span>
                        <span className={`text-xl font-black uppercase ${lifecycle.current_state === 'BREAKOUT' ? 'text-purple-600' : lifecycle.current_state === 'PEAK' ? 'text-rose-600' : lifecycle.current_state === 'RISING' ? 'text-blue-600' : lifecycle.current_state === 'EMERGING' ? 'text-teal-600' : 'text-gray-500'}`}>{lifecycle.current_state}</span>
                     </div>
                     <div className="bg-surface-raised border border-border p-4 rounded-xl flex flex-col justify-center items-center text-center">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-ink-muted mb-2">Time in State</span>
                        <span className="text-xl font-bold font-mono text-ink">
                           {lifecycle.time_in_state_seconds > 3600 
                             ? `${Math.floor(lifecycle.time_in_state_seconds/3600)}h ${Math.floor((lifecycle.time_in_state_seconds%3600)/60)}m` 
                             : `${Math.floor(lifecycle.time_in_state_seconds/60)}m ${Math.floor(lifecycle.time_in_state_seconds%60)}s`}
                        </span>
                     </div>
                     <div className="bg-surface-raised border border-border p-4 rounded-xl flex flex-col justify-center items-center text-center">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-ink-muted mb-2">Peak Score</span>
                        <span className="text-xl font-black font-mono text-ink">{lifecycle.peak_score.toFixed(1)}</span>
                     </div>
                     <div className="bg-surface-raised border border-border p-4 rounded-xl flex flex-col justify-center items-center text-center">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-ink-muted mb-2">Current Score</span>
                        <span className="text-xl font-black font-mono text-signal-600">{lifecycle.current_score.toFixed(1)}</span>
                     </div>
                 </div>

                 {/* Trajectory Charts */}
                 <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Score / Volume */}
                    <div className="h-[250px] w-full border border-border/50 rounded-xl p-4">
                       <h5 className="font-bold text-xs uppercase tracking-widest text-ink-muted mb-2">Score & Volume Trajectory</h5>
                       <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={lifecycle.timeline}>
                               <defs>
                                 <linearGradient id="ls" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
                                 <linearGradient id="lv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/><stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/></linearGradient>
                               </defs>
                               <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} fontSize={10} tickLine={false} axisLine={false} />
                               <YAxis yAxisId="left" fontSize={10} tickLine={false} axisLine={false} orientation="left"/>
                               <YAxis yAxisId="right" fontSize={10} tickLine={false} axisLine={false} orientation="right"/>
                               <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} labelFormatter={(l: any) => new Date(l).toLocaleString()} />
                               <Area yAxisId="left" type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} fill="url(#ls)" name="Trend Score" />
                               <Area yAxisId="right" type="monotone" dataKey="volume" stroke="#0ea5e9" strokeWidth={2} fill="url(#lv)" name="Volume" />
                           </AreaChart>
                       </ResponsiveContainer>
                    </div>

                    {/* Velocity / Acceleration */}
                    <div className="h-[250px] w-full border border-border/50 rounded-xl p-4">
                       <h5 className="font-bold text-xs uppercase tracking-widest text-ink-muted mb-2">Momentum (Velocity & Accel)</h5>
                       <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={lifecycle.timeline}>
                               <defs>
                                 <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                                 <linearGradient id="la" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                               </defs>
                               <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} fontSize={10} tickLine={false} axisLine={false} />
                               <YAxis fontSize={10} tickLine={false} axisLine={false} />
                               <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} labelFormatter={(l: any) => new Date(l).toLocaleString()} />
                               <Area type="monotone" dataKey="velocity" stroke="#10b981" strokeWidth={2} fill="url(#lg)" name="Velocity (Growth)" />
                               <Area type="monotone" dataKey="acceleration" stroke="#f59e0b" strokeWidth={2} fill="url(#la)" name="Acceleration" />
                           </AreaChart>
                       </ResponsiveContainer>
                    </div>
                 </div>
             </CardContent>
         </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
         {/* Mention Volume / Trend Timeline */}
         <Card className="shadow-sm">
            <CardHeader>
               <CardTitle className="text-lg">Velocity & Mention Volume</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="h-[280px] w-full">
                  {sentiment ? (
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={sentiment}>
                          <defs>
                            <linearGradient id="colorM" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Area type="monotone" dataKey="volume" stroke="#4f46e5" strokeWidth={3} fill="url(#colorM)" />
                       </AreaChart>
                    </ResponsiveContainer>
                  ) : <div className="w-full h-full animate-pulse bg-ink/[0.03] rounded-lg"></div>}
               </div>
            </CardContent>
         </Card>

         {/* Sentiment Timeline */}
         <Card className="shadow-sm">
            <CardHeader>
               <CardTitle className="text-lg">Sentiment Directional Timeline</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="h-[280px] w-full">
                  {sentiment ? (
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={sentiment}>
                          <defs>
                            <linearGradient id="colorS" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis fontSize={10} tickLine={false} axisLine={false} domain={[-1, 1]} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Area type="monotone" dataKey="sentiment" stroke="#10b981" strokeWidth={3} fill="url(#colorS)" />
                       </AreaChart>
                    </ResponsiveContainer>
                  ) : <div className="w-full h-full animate-pulse bg-ink/[0.03] rounded-lg"></div>}
               </div>
            </CardContent>
         </Card>
      </div>
      
      {/* SOURCE INTELLIGENCE */}
      {sourceIntel && (
         <Card className="shadow-sm border-indigo-200">
             <CardHeader className="bg-indigo-50/40 border-b border-indigo-100 pb-4">
                 <CardTitle className="flex items-center justify-between">
                     <span className="flex items-center gap-2 text-xl tracking-tight text-indigo-950 font-black">
                        <Database className="w-6 h-6 text-indigo-500" /> SOURCE COVERAGE INTELLIGENCE
                     </span>
                     <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 font-bold text-[10px] uppercase tracking-widest rounded-full ${sourceIntel.source_diversity === 'GLOBAL COVERAGE' || sourceIntel.source_diversity === 'MULTI-SOURCE' ? 'bg-green-100 text-green-700' : sourceIntel.source_diversity === 'SINGLE-SOURCE' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                           {sourceIntel.source_diversity}
                        </span>
                     </div>
                 </CardTitle>
             </CardHeader>
             <CardContent className="pt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                 
                 <div className="lg:col-span-1 space-y-6">
                     <div className="bg-surface-raised border border-border p-5 rounded-2xl">
                         <h4 className="text-[10px] font-bold uppercase tracking-widest text-ink-muted mb-4">Metadata</h4>
                         <div className="space-y-4">
                             <div className="flex justify-between items-center pb-3 border-b border-border/50">
                                 <span className="text-sm font-semibold text-ink-muted">Unique Source Count</span>
                                 <span className="text-xl font-black text-ink">{sourceIntel.unique_source_count}</span>
                             </div>
                             <div className="flex justify-between items-center pb-3 border-b border-border/50">
                                 <span className="text-sm font-semibold text-ink-muted">Source Types</span>
                                 <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2 flex flex-wrap gap-1 py-1 rounded max-w-[150px] text-right justify-end">
                                    {sourceIntel.source_types.length > 0 ? sourceIntel.source_types.join(', ') : 'Unknown'}
                                 </span>
                             </div>
                             <div className="flex justify-between items-center pb-3 border-b border-border/50">
                                 <span className="text-sm font-semibold text-ink-muted">Earliest Source</span>
                                 <div className="text-right">
                                    <span className="block text-xs font-black text-ink">{sourceIntel.earliest_source?.source || 'N/A'}</span>
                                    {sourceIntel.earliest_source?.date && <span className="block text-[9px] uppercase tracking-widest text-ink-muted">{new Date(sourceIntel.earliest_source.date).toLocaleDateString()}</span>}
                                 </div>
                             </div>
                             <div className="flex justify-between items-center">
                                 <span className="text-sm font-semibold text-ink-muted">Latest Source</span>
                                 <div className="text-right">
                                    <span className="block text-xs font-black text-ink">{sourceIntel.latest_source?.source || 'N/A'}</span>
                                    {sourceIntel.latest_source?.date && <span className="block text-[9px] uppercase tracking-widest text-ink-muted">{new Date(sourceIntel.latest_source.date).toLocaleTimeString()}</span>}
                                 </div>
                             </div>
                         </div>
                     </div>
                     <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                         <p className="text-sm text-indigo-900/80 font-medium leading-relaxed">
                           <span className="font-bold text-indigo-700">Source Diversity Check:</span> The intelligence engine verifies volume from distinct organizational endpoints to differentiate whether a narrative is independently corroborated or artificially amplified by a singular cluster.
                         </p>
                     </div>
                 </div>

                 <div className="lg:col-span-2 relative">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-ink-faint mb-4 flex items-center gap-2">
                       <FileText className="w-3.5 h-3.5" /> Source Coverage List
                    </h4>
                    <div className="max-h-[340px] overflow-y-auto pr-2 space-y-2">
                       {sourceIntel.coverage.length > 0 ? sourceIntel.coverage.map((c, i) => (
                           <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-surface rounded-xl border border-border shadow-sm hover:border-indigo-200 transition-colors gap-3 sm:gap-0">
                               <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                                     <span className="text-xs font-black text-indigo-600">{c.name.substring(0,2).toUpperCase()}</span>
                                  </div>
                                  <div>
                                     <h5 className="font-bold text-sm text-ink leading-tight">{c.name}</h5>
                                     <span className="text-[10px] uppercase font-semibold text-ink-muted">{c.types.join(', ')}</span>
                                  </div>
                               </div>
                               
                               <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/2">
                                  <div className="w-full max-w-[120px] hidden md:block">
                                      <div className="flex justify-between text-[9px] font-bold text-ink-muted mb-1">
                                          <span>Concentration</span>
                                          <span>{(c.concentration_pct * 100).toFixed(0)}%</span>
                                      </div>
                                      <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, Math.max(2, c.concentration_pct * 100))}%` }}></div>
                                      </div>
                                  </div>
                                  <div className="text-right">
                                     <span className="block text-sm font-black font-mono text-ink">{c.volume}</span>
                                     <span className="block text-[9px] uppercase tracking-widest text-ink-muted">Mentions</span>
                                  </div>
                               </div>
                           </div>
                       )) : (
                          <div className="text-center p-8 text-sm font-medium text-ink-muted bg-surface-raised rounded-2xl border-dashed border-2 border-border">
                             No explicit sources traced yet.
                          </div>
                       )}
                    </div>
                 </div>

             </CardContent>
         </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
         {/* Geographic Spread */}
         <Card className="lg:col-span-1 shadow-sm">
            <CardHeader>
               <CardTitle className="flex items-center gap-2 text-lg">
                 <MapPin className="w-5 h-5 text-ink-muted" /> Geographic Spread
               </CardTitle>
            </CardHeader>
            <CardContent>
               <div className="h-[240px] w-full">
                  {countries ? (
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={countries.slice(0,6)} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={11} width={80} />
                          <Tooltip cursor={{fill: 'transparent'}} />
                          <Bar dataKey="volume" fill="#0ea5e9" radius={[0, 4, 4, 0]}>
                            {countries.slice(0,6).map((_, i) => (
                              <Cell key={`cell-${i}`} fill={i === 0 ? '#0284c7' : '#38bdf8'} />
                            ))}
                          </Bar>
                       </BarChart>
                     </ResponsiveContainer>
                  ) : <div className="w-full h-full animate-pulse bg-ink/[0.03] rounded-lg"></div>}
               </div>
            </CardContent>
         </Card>

         {/* Source Distribution / Top Posts */}
         <Card className="lg:col-span-2 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
               <CardTitle className="flex items-center gap-2 text-lg">
                 <FileText className="w-5 h-5 text-ink-muted" /> Source Artifacts & Citations
               </CardTitle>
            </CardHeader>
            <CardContent className="h-[240px] overflow-y-auto pr-2">
               {posts ? posts.length > 0 ? (
                  <div className="space-y-3">
                    {posts.map(post => (
                       <div key={post.id} className="p-4 bg-surface-raised rounded-xl border border-border/50 hover:border-signal-300 transition-colors cursor-pointer group" onClick={() => post.url && window.open(post.url)}>
                          <div className="flex items-start justify-between">
                             <div className="flex-1 pr-4">
                               <p className="text-sm font-semibold text-ink line-clamp-2 leading-snug group-hover:text-signal-700 transition-colors">{post.content}</p>
                               <div className="flex items-center gap-3 mt-2 text-xs font-medium text-ink-muted">
                                  <span>{post.author || "Unknown Source"}</span>
                                  <span className="w-1 h-1 rounded-full bg-border"></span>
                                  <span>{new Date(post.posted_at).toLocaleDateString()}</span>
                               </div>
                             </div>
                             {post.url && (
                               <div className="w-8 h-8 rounded-full bg-signal-50 flex items-center justify-center shrink-0">
                                 <ArrowUpRight className="w-4 h-4 text-signal-600" />
                               </div>
                             )}
                          </div>
                       </div>
                    ))}
                  </div>
               ) : (
                  <EmptyState title="No detailed citations" message="No sub-entity articles found for this cluster at this time." />
               ) : <LoadingState variant="cards" count={2} />}
            </CardContent>
         </Card>
      </div>
      
      {/* Related Entities */}
      {related && related.length > 0 && (
         <Card className="shadow-sm">
            <CardHeader>
               <CardTitle className="flex items-center gap-2 text-lg">
                 <Share2 className="w-5 h-5 text-ink-muted" /> Vector-Correlated Entities
               </CardTitle>
            </CardHeader>
            <CardContent>
               <div className="flex flex-wrap gap-3">
                  {related.map(r => (
                     <Link key={r.id} to={`/trends/${r.id}`} className="px-4 py-2 bg-surface-raised border border-border rounded-xl font-semibold text-sm hover:border-signal-300 hover:bg-signal-50 hover:text-signal-700 transition">
                        {r.name}
                        <span className="ml-2 text-xs text-ink-muted/80 font-mono">{(r.similarity * 100).toFixed(0)}% Match</span>
                     </Link>
                  ))}
               </div>
            </CardContent>
         </Card>
      )}

      {/* Latest News & Trend Contributions */}
      {trendNews && trendNews.length > 0 && (
         <Card className="shadow-sm border-signal-200">
            <CardHeader className="bg-signal-50/30 border-b border-signal-100 pb-4">
               <CardTitle className="flex items-center gap-2 text-xl tracking-tight text-signal-950 font-black">
                 <Newspaper className="w-6 h-6 text-signal-500" /> LATEST NEWS & TREND CONTRIBUTIONS
               </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {trendNews.map(item => (
                   <div key={item.id} className="flex flex-col bg-surface rounded-2xl p-5 border border-border shadow-sm hover:shadow-lg transition-all duration-300">
                      <div className="flex justify-between items-start mb-3">
                         <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted bg-surface-raised px-2 py-1 rounded-md">
                           {item.category || "General"}
                         </span>
                         <span className="text-[10px] font-bold uppercase tracking-widest text-ink-faint">
                           {new Date(item.timestamp).toLocaleDateString()}
                         </span>
                      </div>
                      
                      <h4 className="font-bold text-ink leading-snug line-clamp-3 mb-2">{item.headline}</h4>
                      
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted mb-4">
                        <Globe className="w-3.5 h-3.5" /> {item.source || "Web"}
                        {item.country && (
                          <>
                             <span className="mx-1">•</span>
                             <MapPin className="w-3.5 h-3.5" /> {item.country}
                          </>
                        )}
                      </div>

                      {/* Trend Contribution Callouts */}
                      {item.trend_contribution && item.trend_contribution.length > 0 && (
                        <div className="mt-auto space-y-2 bg-ink/[0.02] p-3 rounded-xl border border-ink/[0.05]">
                          <p className="text-[10px] uppercase font-bold tracking-widest text-signal-700 mb-1 flex items-center gap-1">
                             <Activity className="w-3.5 h-3.5" /> Trend contribution
                          </p>
                          <div className="flex flex-col gap-1.5">
                             {item.trend_contribution.map((contrib, idx) => (
                               <div key={idx} className="flex items-start gap-1.5 text-xs text-ink-muted font-medium">
                                 <span className="shrink-0 text-signal-500 mt-0.5">•</span>
                                 <span className="leading-snug">{contrib}</span>
                               </div>
                             ))}
                          </div>
                        </div>
                      )}
                      
                      {item.url && (
                        <div className="mt-4 pt-3 border-t border-border/50 text-right">
                           <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-signal-600 hover:text-signal-700 transition-colors">
                              READ ARTICLE <ArrowUpRight className="w-3.5 h-3.5" />
                           </a>
                        </div>
                      )}
                   </div>
                 ))}
               </div>
            </CardContent>
         </Card>
      )}
    </div>
  );
}

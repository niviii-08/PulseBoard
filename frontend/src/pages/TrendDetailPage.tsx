import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Brain, TrendingUp, MapPin, Activity, ChevronLeft, FileText, ArrowUpRight, Share2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { apiClient } from "@/lib/api/client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";

import type { TrendOverview, AIExplanation, SentimentPoint, Post, RelatedTopic } from "@/types/domain";

export default function TrendDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: overview, isLoading: oLoading, isError: oError, refetch: oRefetch } = useQuery<TrendOverview>({
    queryKey: ["trend", id],
    queryFn: () => apiClient.get(`/trending/${id}`).then(r => r.data)
  });

  const { data: explanation, isLoading: eLoading } = useQuery<AIExplanation>({
    queryKey: ["trend-explanation", id],
    queryFn: () => apiClient.get(`/trending/${id}/explanation`).then(r => r.data)
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
      <Card className="border-signal-200 bg-signal-50/20 shadow-sm">
        <CardHeader className="pb-3 border-b border-signal-200/50">
          <CardTitle className="flex items-center gap-2 text-signal-700 text-lg">
            <Brain className="h-5 w-5" /> Intelligence Synthesis
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {eLoading && <LoadingState variant="inline" />}
          {explanation && (
            <div className="space-y-4">
              <p className="text-base sm:text-lg leading-relaxed text-ink font-medium whitespace-pre-wrap text-left">
                 {explanation.summary_text}
              </p>
              <div className="flex items-center gap-2 text-xs font-semibold text-signal-600/80 uppercase tracking-widest mt-4 border-t border-signal-200/50 pt-4">
                <Activity className="w-4 h-4" /> 
                {explanation.generated_by === "llm" ? "AI Generated from Deterministic Evidence" : "Synthesized via Deterministic Fallback"}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
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
    </div>
  );
}

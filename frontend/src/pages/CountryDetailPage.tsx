import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Loader2, Globe, TrendingUp, Activity, ShieldAlert, ChevronLeft, MapPin, Newspaper, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/shared/ErrorState";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";

interface CountryDetail {
  country: string;
  total_news_volume: number;
  sentiment: number;
  top_topics: { id: string, name: string, volume: number }[];
  top_sources: { name: string, volume: number }[];
  major_events: { id: string, name: string, topic_id: string }[];
  trend_timeline: { date: string, volume: number }[];
}

export default function CountryDetailPage() {
  const { country } = useParams<{ country: string }>();

  const decodedCountry = decodeURIComponent(country || "");
  const isUnknown = decodedCountry.toLowerCase() === "unknown geography" || decodedCountry.toLowerCase() === "unknown";

  const { data, isLoading, isError, refetch } = useQuery<CountryDetail>({
    queryKey: ["country-detail", decodedCountry],
    queryFn: async () => {
      const res = await apiClient.get(`/countries/${encodeURIComponent(decodedCountry)}`);
      return res.data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState title="Country not found" onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-sm font-semibold text-ink-muted">
        <Link to="/countries" className="hover:text-ink transition-colors flex items-center gap-1"><Globe className="w-4 h-4" /> Global</Link>
        <ChevronLeft className="w-4 h-4 rotate-180" />
        <span className="text-ink">{isUnknown ? "Unknown Geography" : decodedCountry}</span>
      </div>

      {/* Hero Banner */}
      <div className={`rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden border ${isUnknown ? 'bg-surface-raised border-dashed border-border' : 'bg-surface border-border/80'}`}>
         {/* Background Decoration */}
         <div className="absolute -top-24 -right-24 opacity-5 rotate-[15deg]">
            {isUnknown ? <ShieldAlert className="w-96 h-96 text-amber-500" /> : <MapPin className="w-96 h-96 text-sky-500" />}
         </div>

         <div className="relative z-10 flex flex-col xl:flex-row justify-between gap-8 xl:items-end">
             <div className="flex-1 space-y-4">
                 <div className="flex items-center gap-3">
                   <span className={`px-3 py-1 font-bold text-xs uppercase tracking-widest rounded-full border ${isUnknown ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-sky-100 text-sky-800 border-sky-200'}`}>
                     COUNTRY OVERVIEW
                   </span>
                 </div>
                 <h1 className="font-display text-4xl sm:text-5xl font-black text-ink">{isUnknown ? "Unknown Geography" : decodedCountry}</h1>
                 {isUnknown ? (
                   <p className="text-ink-muted max-w-xl text-sm font-medium">This section aggregates news and trends where the original source failed to reliably provide explicit location data. The platform refuses to hallucinate origin.</p>
                 ) : (
                   <p className="text-ink-muted max-w-xl text-sm font-medium">Aggregated intelligence, volume tracking, and core topics strictly analyzed for {decodedCountry}.</p>
                 )}
             </div>

             <div className="flex flex-wrap gap-4 sm:gap-6">
               <div className="flex flex-col items-center justify-center p-5 bg-surface border border-border/60 shadow-sm rounded-2xl min-w-[140px]">
                  <span className="text-4xl font-black font-mono text-ink">{data.total_news_volume}</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-ink-muted mt-2">News Volume</span>
               </div>
               <div className="flex flex-col items-center justify-center p-5 bg-surface border border-border/60 shadow-sm rounded-2xl min-w-[140px]">
                  <span className={`text-4xl font-black font-mono ${data.sentiment > 0.1 ? "text-green-600" : data.sentiment < -0.1 ? "text-red-600" : "text-gray-600"}`}>
                    {(data.sentiment).toFixed(2)}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-ink-muted mt-2">Sentiment</span>
               </div>
             </div>
         </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column (2/3 width) - Charts and Topics */}
        <div className="xl:col-span-2 space-y-6">
          
          <Card className="shadow-sm">
            <CardHeader>
               <CardTitle className="flex items-center gap-2 text-lg">
                 <Activity className="w-5 h-5 text-sky-500" /> Trend Timeline
               </CardTitle>
            </CardHeader>
            <CardContent>
               <div className="h-[280px] w-full">
                  {data.trend_timeline && data.trend_timeline.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={data.trend_timeline}>
                          <defs>
                            <linearGradient id="colorSky" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => new Date(v).toLocaleDateString([], { month: 'short', day: 'numeric'})} />
                          <YAxis fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Area type="monotone" dataKey="volume" stroke="#0ea5e9" strokeWidth={3} fill="url(#colorSky)" />
                       </AreaChart>
                    </ResponsiveContainer>
                  ) : <div className="w-full h-full flex items-center justify-center bg-ink/[0.02] rounded-xl text-sm font-medium text-ink-muted border border-dashed border-border">No historical timeline available</div>}
               </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
               <CardTitle className="flex items-center gap-2 text-lg">
                 <TrendingUp className="w-5 h-5 text-signal-500" /> Top Trending Topics
               </CardTitle>
            </CardHeader>
            <CardContent>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {data.top_topics.length > 0 ? data.top_topics.map(topic => (
                   <Link key={topic.id} to={`/trends/${topic.id}`} className="group flex items-center justify-between p-4 bg-surface-raised rounded-xl border border-border hover:border-signal-300 transition-colors">
                     <span className="font-semibold text-ink group-hover:text-signal-700 truncate mr-4">{topic.name}</span>
                     <span className="flex-shrink-0 font-mono text-xs font-bold text-signal-600 bg-signal-50 px-2 py-1 rounded">{topic.volume}</span>
                   </Link>
                 )) : (
                   <div className="col-span-full py-8 text-center text-sm font-medium text-ink-muted bg-surface-raised rounded-xl border border-dashed border-border">
                     No correlated trending topics found internally.
                   </div>
                 )}
               </div>
            </CardContent>
          </Card>

        </div>

        {/* Right Column (1/3 width) - Lists */}
        <div className="space-y-6">
          
          <Card className="shadow-sm h-full max-h-[400px] flex flex-col">
            <CardHeader className="pb-3">
               <CardTitle className="flex items-center gap-2 text-lg uppercase tracking-wider text-xs text-ink-muted">
                 <Calendar className="w-4 h-4" /> Major Events
               </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pr-2">
               {data.major_events && data.major_events.length > 0 ? (
                 <div className="space-y-3">
                   {data.major_events.map(event => (
                      <Link key={event.id} to={`/trends/${event.topic_id}`} className="block p-3 bg-surface border border-border hover:border-border/80 rounded-lg shadow-sm group">
                         <div className="flex gap-2 items-start">
                            <span className="w-1.5 h-1.5 rounded-full bg-signal-500 mt-2 shrink-0 group-hover:scale-125 transition-transform" />
                            <p className="text-sm font-bold text-ink leading-snug group-hover:text-signal-700 transition-colors line-clamp-2">{event.name}</p>
                         </div>
                      </Link>
                   ))}
                 </div>
               ) : (
                  <div className="h-full flex items-center justify-center p-6 text-center text-xs font-medium text-ink-muted bg-surface-raised rounded-xl border border-dashed border-border">
                    No discrete events clustered within this geographic region yet.
                  </div>
               )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3">
               <CardTitle className="flex items-center gap-2 text-lg uppercase tracking-wider text-xs text-ink-muted">
                 <Newspaper className="w-4 h-4" /> Top Sources
               </CardTitle>
            </CardHeader>
            <CardContent>
               <div className="h-[200px] w-full">
                  {data.top_sources && data.top_sources.length > 0 ? (
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={data.top_sources} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={11} width={80} />
                          <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Bar dataKey="volume" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                            {data.top_sources.map((_, i) => (
                              <Cell key={`cell-${i}`} fill={i === 0 ? '#7c3aed' : '#a78bfa'} />
                            ))}
                          </Bar>
                       </BarChart>
                     </ResponsiveContainer>
                  ) : <div className="w-full h-full flex items-center justify-center bg-ink/[0.02] rounded-xl text-xs font-medium text-ink-muted border border-dashed border-border">Source analytics sparse</div>}
               </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

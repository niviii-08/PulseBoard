import { Link } from "react-router-dom";
import { 
  Globe, 
  Activity, 
  TrendingUp, 
  MapPin, 
  Rss, 
  Smile, 
  Clock, 
  Calendar,
  Flame,
  ArrowRight
} from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useGlobalOverview, useCountryDashboard } from "@/hooks/queries/useDashboard";
import { useEmergingTrends } from "@/hooks/queries/useTrends";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { TrendListCard } from "@/components/trends/TrendListCard";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { GlobalTrendMap } from "@/components/map/GlobalTrendMap";
import { TrendRadar } from "@/components/trends/TrendRadar";
import type { NewsArticle } from "./NewsPage";

export default function Dashboard() {
  const global = useGlobalOverview();
  const trends = useEmergingTrends();
  const countryDashboard = useCountryDashboard();
  
  const { data: newsData } = useQuery<NewsArticle[]>({
    queryKey: ["news", "latest-100"],
    queryFn: async () => {
      const res = await apiClient.get("/news?limit=10");
      return res.data?.items || [];
    },
    refetchInterval: 15_000
  });

  // Derived metrics for UI
  const latestNews = newsData?.slice(0, 5) || [];
  
  // Group by category
  const categories = newsData?.reduce((acc, curr) => {
    const cat = curr.category || "Uncategorized";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topCategories = Object.entries(categories || {}).map(([name, value]) => ({name, value})).sort((a,b)=>b.value-a.value).slice(0,5);

  // Group by country
  const countries = newsData?.reduce((acc, curr) => {
    const c = curr.country || "Global";
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topCountries = Object.entries(countries || {}).map(([name, value]) => ({name, value})).sort((a,b)=>b.value-a.value).slice(0,5);

  // Timeline (fake bucketed from recent news since API doesn't provide historical buckets yet, but we group by day/hour dynamically)
  const timeline = newsData?.reduce((acc, curr) => {
    const d = new Date(curr.timestamp).toLocaleDateString();
    if (!acc[d]) acc[d] = { date: d, volume: 0, sentiment: 0, count: 0 };
    acc[d].volume += 1;
    acc[d].sentiment += curr.sentiment;
    acc[d].count += 1;
    return acc;
  }, {} as Record<string, any>);
  const timelineData = Object.values(timeline || {}).map((t: any) => ({
    ...t,
    avgSentiment: t.sentiment / t.count
  })).reverse(); // Reverse for chronological
  
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink drop-shadow-sm sm:text-5xl">
            Global<span className="text-signal-500">Overview</span>
          </h1>
          <p className="mt-2 text-base text-ink-muted/80 max-w-xl font-medium">
            Live global trend intelligence mapped dynamically across monitored sources and countries.
          </p>
        </div>
      </div>

      {global.isLoading && <LoadingState variant="cards" count={8} />}
      {global.isError && <ErrorState onRetry={() => global.refetch()} />}

      {global.data && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
          <MetricCard label="Live Articles" value={global.data.total_articles.toLocaleString()} icon={Rss} emphasis />
          <MetricCard label="Trending Topics" value={global.data.active_topics.toLocaleString()} icon={Activity} />
          <MetricCard label="Countries" value={global.data.countries_represented.toString()} icon={MapPin} />
          <MetricCard label="Sources" value={global.data.sources_monitored.toString()} icon={Globe} />
          <MetricCard label="Fastest Rising" value={global.data.fastest_rising_topic} icon={TrendingUp} emphasis className="border-signal-200 bg-signal-50/10 lg:col-span-2 xl:col-span-1" />
          <MetricCard label="Avg Sentiment" value={global.data.average_sentiment.toFixed(2)} icon={Smile} />
          <MetricCard label="Last Hour Vol." value={global.data.articles_last_hour.toLocaleString()} icon={Clock} />
          <MetricCard label="24h Volume" value={global.data.articles_last_24h.toLocaleString()} icon={Calendar} />
        </div>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Map & Trends */}
        <div className="lg:col-span-1 flex flex-col">
           <TrendRadar trends={trends.data || []} isLoading={trends.isLoading} />
        </div>
        
        <div className="lg:col-span-2">
           <GlobalTrendMap data={countryDashboard.data || []} isLoading={countryDashboard.isLoading} />
        </div>

        <Card className="shadow-sm flex flex-col lg:col-span-3">
           <CardHeader className="flex flex-row items-center justify-between pb-2">
             <CardTitle className="flex items-center gap-2 text-lg">
               <Flame className="w-5 h-5 text-flame-500" />
               Top Trending
             </CardTitle>
             <Link to="/trending" className="text-xs text-signal-600 font-semibold hover:underline">View all</Link>
           </CardHeader>
           <CardContent className="flex flex-col lg:flex-row gap-4 p-4 lg:p-6 overflow-x-auto">
             {trends.isLoading && <LoadingState variant="cards" count={3} />}
             {trends.data?.slice(0, 4).map(t => (
               <div key={t.id} className="flex-1 min-w-[280px]">
                 <TrendListCard trend={t} />
               </div>
             ))}
           </CardContent>
        </Card>

        {/* Timelines */}
        <Card className="lg:col-span-2 shadow-sm">
           <CardHeader>
             <CardTitle className="text-lg">News Volume & Sentiment Timeline</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="h-[250px] w-full">
               {newsData ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={timelineData}>
                     <defs>
                       <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                         <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                       </linearGradient>
                     </defs>
                     <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                     <YAxis fontSize={10} tickLine={false} axisLine={false} />
                     <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                     <Area type="monotone" dataKey="volume" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVol)" />
                   </AreaChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="w-full h-full animate-pulse bg-ink/[0.03] rounded-lg"></div>
               )}
             </div>
           </CardContent>
        </Card>

        <Card className="shadow-sm">
           <CardHeader>
             <CardTitle className="text-lg">Top Categories</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="h-[250px] w-full">
               {newsData ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={topCategories} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                     <XAxis type="number" hide />
                     <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={11} width={80} />
                     <Tooltip cursor={{fill: 'transparent'}} />
                     <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]}>
                       {topCategories.map((_, i) => (
                         <Cell key={`cell-${i}`} fill={i === 0 ? '#4f46e5' : '#818cf8'} />
                       ))}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="w-full h-full animate-pulse bg-ink/[0.03] rounded-lg"></div>
               )}
             </div>
           </CardContent>
        </Card>

        {/* Latest News & Countries */}
        <Card className="shadow-sm">
           <CardHeader>
             <CardTitle className="text-lg">Top Countries</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="space-y-4 mt-2">
                 {newsData ? topCountries.map((c, i) => (
                   <div key={i} className="flex items-center justify-between text-sm">
                     <span className="font-medium text-ink flex items-center gap-2">
                       <MapPin className="w-4 h-4 text-ink-muted" /> {c.name}
                     </span>
                     <span className="font-mono text-ink-muted">{c.value}</span>
                   </div>
                 )) : (
                   <div className="space-y-3">
                     {[1,2,3,4,5].map(i => <div key={i} className="h-6 w-full animate-pulse bg-ink/[0.03] rounded"></div>)}
                   </div>
                 )}
             </div>
           </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-sm">
           <CardHeader className="flex flex-row flex-wrap items-center justify-between">
             <CardTitle className="text-lg">Latest News</CardTitle>
             <Link to="/news" className="text-sm text-signal-600 hover:text-signal-800 font-semibold flex items-center gap-1">All feed <ArrowRight className="w-4 h-4"/></Link>
           </CardHeader>
           <CardContent>
             <div className="space-y-3">
               {newsData ? latestNews.map(n => (
                 <div key={n.id} className="flex items-start gap-4 p-3 hover:bg-surface-raised rounded-xl transition cursor-pointer" onClick={() => n.url && window.open(n.url)}>
                    {n.image ? (
                      <img src={n.image} className="w-16 h-16 rounded-lg object-cover" alt="Thumb"/>
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-ink/[0.05] flex items-center justify-center">
                        <Rss className="w-6 h-6 text-ink-faint" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-ink text-sm sm:text-base leading-tight line-clamp-2">{n.headline}</h4>
                      <p className="text-xs text-ink-muted mt-1 font-medium">{new Date(n.timestamp).toLocaleString()} &bull; {n.source}</p>
                    </div>
                 </div>
               )) : (
                 <div className="space-y-3">
                    {[1,2,3,4].map(i => <div key={i} className="h-16 w-full animate-pulse bg-ink/[0.03] rounded-xl"></div>)}
                 </div>
               )}
             </div>
           </CardContent>
        </Card>

      </div>
    </div>
  );
}

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Newspaper, ArrowUpRight, Globe, AlertCircle, Filter } from "lucide-react";

export interface NewsArticle {
  id: string;
  headline: string;
  source: string;
  timestamp: string;
  country: string;
  category: string;
  image: string | null;
  description: string | null;
  url: string | null;
  sentiment: number;
}

export default function NewsPage() {
  const { data: news, isLoading } = useQuery<NewsArticle[]>({
    queryKey: ["news", "breaking-page"],
    queryFn: async () => {
      const res = await apiClient.get("/news?limit=100");
      return res.data;
    },
    refetchInterval: 15_000
  });

  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [countryFilter, setCountryFilter] = useState<string>("All");
  const [sourceFilter, setSourceFilter] = useState<string>("All");

  const categories = useMemo(() => ["All", ...Array.from(new Set(news?.map(n => n.category || "General").filter(Boolean)))], [news]);
  const countries = useMemo(() => ["All", ...Array.from(new Set(news?.map(n => n.country || "Global").filter(Boolean)))], [news]);
  const sources = useMemo(() => ["All", ...Array.from(new Set(news?.map(n => n.source).filter(Boolean)))], [news]);

  const filteredNews = useMemo(() => {
    return news?.filter(item => {
      if (categoryFilter !== "All" && (item.category || "General") !== categoryFilter) return false;
      if (countryFilter !== "All" && (item.country || "Global") !== countryFilter) return false;
      if (sourceFilter !== "All" && item.source !== sourceFilter) return false;
      return true;
    });
  }, [news, categoryFilter, countryFilter, sourceFilter]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-border/60">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-ink flex items-center gap-4">
            <div className="p-3 bg-signal-100 rounded-2xl">
               <Newspaper className="h-8 w-8 text-signal-600" />
            </div>
            Intelligence Feed
          </h1>
          <p className="mt-3 text-base text-ink-muted/90 max-w-2xl font-medium">
            Real-time, cross-referenced global coverage from NewsAPI & GDELT platforms.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center bg-surface-raised p-2 rounded-xl border border-border shadow-sm">
          <div className="px-2 text-ink-muted flex items-center gap-2 text-sm font-semibold">
            <Filter className="w-4 h-4" /> Filters:
          </div>
          <select 
            value={categoryFilter} 
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-surface text-sm font-medium border border-border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-signal-500 outline-none"
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select 
            value={countryFilter} 
            onChange={e => setCountryFilter(e.target.value)}
            className="bg-surface text-sm font-medium border border-border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-signal-500 outline-none"
          >
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select 
            value={sourceFilter} 
            onChange={e => setSourceFilter(e.target.value)}
            className="bg-surface text-sm font-medium border border-border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-signal-500 outline-none"
          >
            {sources.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex flex-wrap justify-center gap-6 p-12">
          {[1,2,3,4,5,6].map(i => (
             <div key={i} className="w-full sm:w-[300px] h-64 bg-surface rounded-3xl animate-pulse shadow-sm border border-border"></div>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredNews?.map(item => (
            <div 
              key={item.id} 
              className="group flex flex-col bg-surface rounded-3xl p-5 border border-border hover:border-signal-300 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden relative cursor-pointer"
              onClick={() => item.url && window.open(item.url, '_blank')}
            >
              {item.image ? (
                <div className="relative w-full h-48 rounded-2xl overflow-hidden mb-4 bg-ink/[0.03]">
                  <div className="absolute inset-0 bg-ink/10 group-hover:bg-transparent transition duration-500 z-10" />
                  <img src={item.image} alt={item.headline} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                  <span className="absolute top-3 left-3 z-20 px-3 py-1 bg-surface/90 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-ink rounded-full">
                    {item.category || "General"}
                  </span>
                </div>
              ) : (
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-surface-raised border border-border/60 text-[10px] font-bold uppercase tracking-widest text-ink-muted rounded-full">
                    {item.category || "General"}
                  </span>
                </div>
              )}

              <div className="flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-ink leading-tight group-hover:text-signal-700 transition-colors line-clamp-3 mb-2">
                  {item.headline || "Untitled Article"}
                </h3>
                <div className="flex items-center gap-2 mb-3">
                   <div className="w-5 h-5 rounded overflow-hidden bg-ink/5 flex items-center justify-center text-[10px] font-bold text-ink-muted">
                     {item.country?.slice(0,2).toUpperCase() || 'GL'}
                   </div>
                   <span className="text-xs text-ink-muted font-semibold">{new Date(item.timestamp).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap items-center justify-between gap-3 text-xs font-medium text-ink-muted">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-ink-faint" />
                  <span className="truncate max-w-[100px]">{item.source || "Web"}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={item.sentiment > 0.3 ? 'text-green-600 font-semibold' : item.sentiment < -0.3 ? 'text-red-500 font-semibold' : 'text-ink-faint font-semibold'}>
                    {item.sentiment > 0.3 ? 'Positive' : item.sentiment < -0.3 ? 'Negative' : 'Neutral'}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-signal-50 flex items-center justify-center group-hover:bg-signal-100 transition">
                     <ArrowUpRight className="w-4 h-4 text-signal-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {!filteredNews?.length && (
            <div className="col-span-full mt-12">
               <div className="flex flex-col flex-1 items-center justify-center p-12 text-center border-2 border-dashed border-border rounded-3xl bg-surface/50">
                  <AlertCircle className="w-12 h-12 text-ink-faint mb-4" />
                  <h3 className="text-lg font-semibold text-ink">No articles available</h3>
                  <p className="text-sm text-ink-muted mt-1 max-w-md">Try adjusting your filters or triggering a new GDELT ingestion cycle.</p>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Newspaper, ArrowUpRight, Globe, AlertCircle, Search, Clock, ChevronLeft, ChevronRight, Zap } from "lucide-react";

export interface NewsArticle {
  id: string;
  headline: string;
  source: string;
  timestamp: string;
  country: string | null;
  category: string | null;
  image: string | null;
  description: string | null;
  url: string | null;
  sentiment: number;
  sentiment_label: string;
  why_this_matters: string;
  is_live: boolean;
  topics?: string[];
  topic_name?: string;
  topic_id?: string;
}

interface NewsResponse {
  items: NewsArticle[];
  page?: number;
  limit?: number;
}

const CATEGORIES = ["ALL", "WORLD", "POLITICS", "BUSINESS", "TECHNOLOGY", "SCIENCE", "HEALTH", "SPORTS", "ENTERTAINMENT"];

export default function NewsPage() {
  const [activeTab, setActiveTab] = useState<"latest" | "breaking">("latest");
  const [category, setCategory] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState<string>("ALL");
  const [source, setSource] = useState<string>("ALL");
  const [language, setLanguage] = useState<string>("ALL");
  const [daysAgo, setDaysAgo] = useState<string>("7");
  const [page, setPage] = useState(1);

  // Debounced Search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(handler);
  }, [search]);

  const { data: newsData, isLoading } = useQuery<NewsResponse>({
    queryKey: ["news", activeTab, category, country, source, language, debouncedSearch, daysAgo, page],
    queryFn: async () => {
      if (activeTab === "breaking") {
        const res = await apiClient.get("/news/breaking?limit=20");
        return res.data;
      }
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20"
      });
      if (category !== "ALL") params.append("category", category);
      if (country !== "ALL") params.append("country", country);
      if (source !== "ALL") params.append("source", source);
      if (language !== "ALL") params.append("language", language);
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (daysAgo !== "ALL") params.append("days_ago", daysAgo);

      const res = await apiClient.get(`/news?${params.toString()}`);
      return res.data;
    },
    refetchInterval: 30_000
  });

  const articles = newsData?.items || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-ink flex items-center gap-4">
              <div className="p-3 bg-signal-100 rounded-2xl">
                 <Newspaper className="h-8 w-8 text-signal-600" />
              </div>
              Global News Center
            </h1>
            <p className="mt-3 text-base text-ink-muted/90 max-w-2xl font-medium">
              Real-time intelligence and global news ingestion. Powered by advanced filtering.
            </p>
          </div>
          
          <div className="flex bg-surface-raised p-1 rounded-xl border border-border shadow-sm">
            <button 
              onClick={() => { setActiveTab("latest"); setPage(1); }}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'latest' ? 'bg-ink text-surface shadow-md' : 'text-ink-muted hover:text-ink'}`}
            >
              <Clock className="w-4 h-4" /> Latest News
            </button>
            <button 
              onClick={() => { setActiveTab("breaking"); setPage(1); }}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'breaking' ? 'bg-red-500 text-white shadow-md' : 'text-ink-muted hover:text-ink'}`}
            >
              <Zap className="w-4 h-4" /> Breaking
            </button>
          </div>
        </div>

        {/* Filters bar */}
        {activeTab === "latest" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => { setCategory(c); setPage(1); }}
                  className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider transition-all border ${category === c ? 'bg-signal-500 border-signal-500 text-white shadow-md' : 'bg-surface border-border text-ink-muted hover:border-signal-300'}`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 bg-surface-raised p-3 rounded-2xl border border-border shadow-sm">
              <div className="flex-1 relative min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
                <input 
                  type="text" 
                  placeholder="Search headlines or descriptions..." 
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-10 pr-4 py-2 bg-surface text-sm border border-border rounded-xl focus:ring-2 focus:ring-signal-500 outline-none transition-shadow"
                />
              </div>

              <select value={country} onChange={e => { setCountry(e.target.value); setPage(1); }} className="bg-surface text-sm font-medium border border-border rounded-xl px-4 py-2 outline-none">
                <option value="ALL">All Countries</option>
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="India">India</option>
                <option value="China">China</option>
                <option value="Global">Global</option>
              </select>

              <select value={source} onChange={e => { setSource(e.target.value); setPage(1); }} className="bg-surface text-sm font-medium border border-border rounded-xl px-4 py-2 outline-none">
                <option value="ALL">All Sources</option>
                <option value="NewsAPI">NewsAPI</option>
                <option value="GDELT">GDELT</option>
              </select>

              <select value={language} onChange={e => { setLanguage(e.target.value); setPage(1); }} className="bg-surface text-sm font-medium border border-border rounded-xl px-4 py-2 outline-none">
                <option value="ALL">All Languages</option>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>

              <select value={daysAgo} onChange={e => { setDaysAgo(e.target.value); setPage(1); }} className="bg-surface text-sm font-medium border border-border rounded-xl px-4 py-2 outline-none">
                <option value="1">Last 24 Hours</option>
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="ALL">All Time</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => (
             <div key={i} className="w-full h-80 bg-surface rounded-3xl animate-pulse shadow-sm border border-border"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map(item => (
              <div 
                key={item.id} 
                className="group flex flex-col bg-surface rounded-3xl p-5 border border-border hover:border-signal-300 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden relative cursor-pointer"
                onClick={() => item.url && window.open(item.url, '_blank')}
              >
                {item.image ? (
                  <div className="relative w-full h-48 rounded-2xl overflow-hidden mb-4 bg-ink/[0.03]">
                    <div className="absolute inset-0 bg-ink/10 group-hover:bg-transparent transition duration-500 z-10" />
                    <img src={item.image} alt={item.headline} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                    <div className="absolute top-3 left-3 z-20 flex gap-2">
                       <span className="px-3 py-1 bg-surface/90 backdrop-blur-md text-[10px] font-bold uppercase tracking-widest text-ink rounded-full">
                         {item.category || "General"}
                       </span>
                       {item.is_live && (
                         <span className="px-3 py-1 bg-red-500/90 backdrop-blur-md text-[10px] font-bold uppercase tracking-widest text-white rounded-full flex items-center gap-1 animate-pulse">
                           <span className="w-1.5 h-1.5 rounded-full bg-white"></span> LIVE
                         </span>
                       )}
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 flex gap-2">
                    <span className="inline-block px-3 py-1 bg-surface-raised border border-border/60 text-[10px] font-bold uppercase tracking-widest text-ink-muted rounded-full">
                      {item.category || "General"}
                    </span>
                    {item.is_live && (
                         <span className="px-3 py-1 bg-red-100 text-red-600 border border-red-200 text-[10px] font-bold uppercase tracking-widest rounded-full flex items-center gap-1">
                           <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> LIVE
                         </span>
                    )}
                  </div>
                )}

                <div className="flex-1 flex flex-col">
                  <h3 className="text-xl font-extrabold text-ink leading-tight group-hover:text-signal-700 transition-colors line-clamp-3 mb-2">
                    {item.headline || "Untitled Article"}
                  </h3>
                  <div className="flex items-center gap-3 mb-4 text-xs font-semibold text-ink-muted">
                     <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> {item.source || "Web"}</span>
                     <span>•</span>
                     <span>{new Date(item.timestamp).toLocaleString()}</span>
                     {item.country && (
                       <>
                         <span>•</span>
                         <span className="text-ink max-w-[80px] truncate">{item.country}</span>
                       </>
                     )}
                  </div>
                  
                  {item.why_this_matters && (
                    <div className="mt-auto bg-signal-50/50 rounded-xl p-3 border border-signal-100/50 mb-4">
                      <p className="text-xs font-bold text-signal-700 uppercase tracking-widest mb-1 shadow-sm">Why this matters</p>
                      <p className="text-sm font-medium text-ink-muted leading-relaxed line-clamp-3">
                        {item.why_this_matters}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-border/50 flex flex-wrap items-center justify-between gap-3 text-xs font-medium text-ink-muted">
                  <div className="flex items-center gap-3">
                    <span className={
                      item.sentiment > 0.3 ? 'px-2 py-1 rounded bg-green-100 text-green-700 font-bold' : 
                      item.sentiment < -0.3 ? 'px-2 py-1 rounded bg-red-100 text-red-700 font-bold' : 
                      'px-2 py-1 rounded bg-surface-raised text-ink-muted font-bold'
                    }>
                      {item.sentiment_label?.toUpperCase() || 'NEUTRAL'}
                    </span>
                    {item.topic_name && item.topic_id && (
                       <Link 
                         to={`/trends/${item.topic_id}`}
                         onClick={(e) => e.stopPropagation()}
                         className="flex items-center gap-1.5 px-3 py-1 bg-signal-50 text-signal-700 hover:bg-signal-100 hover:text-signal-800 font-bold rounded-lg transition-colors border border-signal-200"
                       >
                         Trending topic: {item.topic_name}
                       </Link>
                    )}
                  </div>
                  
                  <div className="w-8 h-8 rounded-full bg-signal-50 flex items-center justify-center group-hover:bg-signal-100 transition">
                     <ArrowUpRight className="w-4 h-4 text-signal-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!articles.length && (
            <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border rounded-3xl bg-surface/50">
                <AlertCircle className="w-12 h-12 text-ink-faint mb-4" />
                <h3 className="text-lg font-semibold text-ink">No local articles match your query.</h3>
                <p className="text-sm text-ink-muted mt-1 max-w-md">Try adjusting your filters or expanding your search to find global news coverage within the platform.</p>
            </div>
          )}

          {/* Pagination */}
          {activeTab === "latest" && articles.length > 0 && (
            <div className="flex items-center justify-center gap-4 pt-6 border-t border-border/60">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl bg-surface border border-border text-ink hover:bg-surface-raised disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-semibold text-ink-muted">Page {page}</span>
              <button 
                onClick={() => setPage(p => p + 1)}
                disabled={articles.length < 20}
                className="p-2 rounded-xl bg-surface border border-border text-ink hover:bg-surface-raised disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

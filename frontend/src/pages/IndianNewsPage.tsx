import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Newspaper, ArrowUpRight, Globe, AlertCircle, Search, Clock, ChevronLeft, ChevronRight, Zap, MapPin, Activity } from "lucide-react";

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
  vernacular_extraction?: string;
}

interface NewsResponse {
  items: NewsArticle[];
  page?: number;
  limit?: number;
}

// 15 specific categories for India
const CATEGORIES = [
  "ALL", 
  "POLITICS", 
  "BUSINESS & ECONOMY", 
  "NATION", 
  "STARTUPS", 
  "TECHNOLOGY", 
  "BOLLYWOOD & ENTERTAINMENT", 
  "CRICKET & SPORTS", 
  "DEFENCE", 
  "EDUCATION", 
  "HEALTH", 
  "SCIENCE & SPACE", 
  "INFRASTRUCTURE", 
  "LAW & JUSTICE", 
  "AGRICULTURE", 
  "ENVIRONMENT"
];

export default function IndianNewsPage() {
  const [activeTab, setActiveTab] = useState<"latest" | "breaking" | "mypulse">("latest");
  const [myPulseCategories, setMyPulseCategories] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("myPulseCategories") || "[]"); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem("myPulseCategories", JSON.stringify(myPulseCategories));
  }, [myPulseCategories]);
  const [category, setCategory] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  // Always restrict country to India
  const country = "India"; 
  const [source, setSource] = useState<string>("ALL");
  const [daysAgo, setDaysAgo] = useState<string>("7");
  const [page, setPage] = useState(1);

  // Debounced Search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(handler);
  }, [search]);

  const { data: newsData, isLoading } = useQuery<NewsResponse>({
    queryKey: ["india-news", activeTab, category, country, source, debouncedSearch, daysAgo, page],
    queryFn: async () => {
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        country: "India" // Strictly India
      });
      if (category !== "ALL") params.append("category", category);
      if (source !== "ALL") params.append("source", source);
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (daysAgo !== "ALL") params.append("days_ago", daysAgo);
      // Let's also specify language=en since user requested news in english
      params.append("language", "en");

      // Even if breaking tab is selected, we filter by India
      let endpoint = `/news?${params.toString()}`;
      if (activeTab === "breaking") {
         endpoint = `/news/breaking?limit=20&country=India`;
      }

      const res = await apiClient.get(endpoint);
      
      // Additional fallback filtering on frontend if backend doesn't support breaking + country
      let items = res.data.items || [];
      if (activeTab === "breaking") {
          items = items.filter((i: NewsArticle) => i.country === "India" || (i.country && i.country.toLowerCase().includes("india")));
          if (items.length === 0) {
              items = res.data.items; // Fallback
          }
      } else if (activeTab === "mypulse") {
          if (myPulseCategories.length > 0) {
              items = items.filter((i: NewsArticle) => i.category && myPulseCategories.includes(i.category.toUpperCase()));
          }
      }
      return { ...res.data, items };
    },
    refetchInterval: 30_000
  });

  const articles = newsData?.items || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
      {/* Header section with vibrant Indian styling */}
      <div className="flex flex-col gap-6 relative p-8 rounded-3xl overflow-hidden bg-surface border border-border shadow-md">
        {/* Subtle background decoration resembling vibrant tricolor slightly */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-orange-500/10 via-transparent to-green-600/10 rounded-full blur-[80px] -z-10 translate-x-1/3 -translate-y-1/3" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 z-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-bold uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5" /> Region Specific
              </span>
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold uppercase tracking-wider">
                <Globe className="w-3.5 h-3.5" /> English
              </span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-ink flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-orange-400 to-green-500 rounded-2xl shadow-lg">
                 <Newspaper className="h-8 w-8 text-white" />
              </div>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-600 via-zinc-800 to-green-600">
                India News Pulse
              </span>
            </h1>
            <p className="mt-4 text-base text-ink-muted/90 max-w-2xl font-medium leading-relaxed">
              Curated, verified, and categorized insights focusing exclusively on India. Explore 15 distinct categories of the latest developments happening across the nation.
            </p>
          </div>
          
          <div className="flex bg-surface-raised p-1.5 rounded-xl border border-border shadow-sm">
            <button 
              onClick={() => { setActiveTab("latest"); setPage(1); }}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'latest' ? 'bg-ink text-surface shadow-md' : 'text-ink-muted hover:text-ink'}`}
            >
              <Clock className="w-4 h-4" /> Latest
            </button>
            <button 
              onClick={() => { setActiveTab("breaking"); setPage(1); }}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'breaking' ? 'bg-red-500 text-white shadow-md' : 'text-ink-muted hover:text-ink'}`}
            >
              <Zap className="w-4 h-4" /> Top Stories
            </button>
            <button 
              onClick={() => { setActiveTab("mypulse"); setPage(1); setCategory("ALL"); }}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'mypulse' ? 'bg-indigo-500 text-white shadow-md' : 'text-ink-muted hover:text-ink'}`}
            >
              <Activity className="w-4 h-4" /> My Pulse
            </button>
          </div>
        </div>

        {/* Filters bar */}
        {(activeTab === "latest" || activeTab === "mypulse") && (
          <div className="flex flex-col gap-4 mt-4 z-10">
            {activeTab === "mypulse" && (
              <div className="text-sm font-medium text-indigo-700 bg-indigo-50 p-3 rounded-xl border border-indigo-100 flex items-center gap-2">
                 <Activity className="w-4 h-4" /> Select your preferred categories to form your personalized daily briefing.
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => {
                const isPulseActive = activeTab === "mypulse" && myPulseCategories.includes(c);
                return (
                <button
                  key={c}
                  onClick={() => { 
                    if (activeTab === "mypulse") {
                       if (c === "ALL") return;
                       if (myPulseCategories.includes(c)) setMyPulseCategories(myPulseCategories.filter(x => x !== c));
                       else setMyPulseCategories([...myPulseCategories, c]);
                    } else {
                       setCategory(c); setPage(1); 
                    }
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-extrabold tracking-wider transition-all border shadow-sm hover:-translate-y-0.5 ease-out duration-200 ${
                    (activeTab === "latest" && category === c) || isPulseActive ? 'bg-gradient-to-r from-indigo-500 to-blue-600 border-indigo-600 text-white' : 'bg-surface border-border text-ink-muted hover:border-indigo-300'
                  }`}
                >
                  {c} {isPulseActive && "★"}
                </button>
              )})}
            </div>

            <div className="flex flex-wrap items-center gap-3 bg-surface-raised p-3 rounded-2xl border border-border shadow-sm">
              <div className="flex-1 relative min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
                <input 
                  type="text" 
                  placeholder="Search Indian news globally..." 
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-10 pr-4 py-2 bg-surface text-sm font-medium border border-border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                />
              </div>
              <select value={source} onChange={e => { setSource(e.target.value); setPage(1); }} className="bg-surface text-sm font-bold border border-border rounded-xl px-4 py-2 outline-none text-ink-muted">
                <option value="ALL">All Sources</option>
                <option value="NewsAPI">NewsAPI</option>
                <option value="GDELT">GDELT</option>
                <option value="Local">Local Verified</option>
              </select>
              <select value={daysAgo} onChange={e => { setDaysAgo(e.target.value); setPage(1); }} className="bg-surface text-sm font-bold border border-border rounded-xl px-4 py-2 outline-none text-ink-muted">
                <option value="1">Last 24 Hours</option>
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="ALL">All Time</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* State Sentiment Heatmap Mock */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { name: "Maharashtra", score: 0.8, color: "from-green-500 to-emerald-400", trend: "+12%" },
          { name: "Delhi", score: -0.4, color: "from-red-500 to-rose-400", trend: "-5%" },
          { name: "Karnataka", score: 0.6, color: "from-green-400 to-emerald-500", trend: "+8%" },
          { name: "Tamil Nadu", score: 0.1, color: "from-blue-400 to-indigo-400", trend: "0%" },
          { name: "Gujarat", score: 0.3, color: "from-teal-400 to-cyan-500", trend: "+3%" }
        ].map(state => (
          <div key={state.name} className="bg-surface rounded-2xl border border-border p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${state.color} opacity-10 rounded-bl-full group-hover:scale-110 group-hover:opacity-20 transition-all duration-500`} />
            <span className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2 relative z-10">{state.name}</span>
            <div className="flex items-end justify-between relative z-10">
              <span className="text-xl font-extrabold text-ink">{state.score > 0 ? '+' : ''}{state.score}</span>
              <span className={`text-[10px] font-bold ${state.score > 0 ? 'text-green-600' : 'text-red-600'}`}>{state.trend}</span>
            </div>
            <div className="w-full h-1 bg-ink/5 rounded-full mt-3 relative z-10 overflow-hidden">
               <div className={`h-full bg-gradient-to-r ${state.color}`} style={{ width: `${Math.abs(state.score) * 100}%` }} />
            </div>
          </div>
        ))}
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
                className="group flex flex-col bg-surface rounded-3xl p-5 border border-border hover:border-indigo-300 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden relative cursor-pointer"
                onClick={() => item.url && window.open(item.url, '_blank')}
              >
                {item.image ? (
                  <div className="relative w-full h-48 rounded-2xl overflow-hidden mb-4 bg-ink/[0.03]">
                    <div className="absolute inset-0 bg-ink/10 group-hover:bg-transparent transition duration-500 z-10" />
                    <img src={item.image} alt={item.headline} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                    <div className="absolute top-3 left-3 z-20 flex gap-2">
                       <span className="px-3 py-1 bg-surface/90 backdrop-blur-md text-[10px] font-bold uppercase tracking-widest text-indigo-700 rounded-full shadow-sm">
                         {item.category || "General"}
                       </span>
                       {item.is_live && (
                         <span className="px-3 py-1 bg-red-500/90 backdrop-blur-md text-[10px] font-bold uppercase tracking-widest text-white rounded-full flex items-center gap-1 animate-pulse shadow-sm">
                           <span className="w-1.5 h-1.5 rounded-full bg-white line-pulse"></span> LIVE
                         </span>
                       )}
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 flex gap-2">
                    <span className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-100 text-[10px] font-bold uppercase tracking-widest text-indigo-700 rounded-full">
                      {item.category || "General"}
                    </span>
                    {item.is_live && (
                         <span className="px-3 py-1 bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold uppercase tracking-widest rounded-full flex items-center gap-1">
                           <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> LIVE
                         </span>
                    )}
                  </div>
                )}

                <div className="flex-1 flex flex-col">
                  <h3 className="text-xl font-extrabold text-ink leading-tight group-hover:text-indigo-600 transition-colors line-clamp-3 mb-2">
                    {item.headline || "Untitled Article"}
                  </h3>
                  <div className="flex flex-col gap-1 mb-4">
                      <div className="flex items-center gap-3 text-xs font-bold text-ink-muted">
                         <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> {item.source || "Verified Source"}</span>
                         <span>•</span>
                         <span>{new Date(item.timestamp).toLocaleString()}</span>
                      </div>
                      {item.vernacular_extraction && (
                         <span className="text-[10px] font-extrabold text-fuchsia-600 bg-fuchsia-50 px-2 py-0.5 rounded w-fit border border-fuchsia-100">
                           {item.vernacular_extraction}
                         </span>
                      )}
                  </div>
                  
                  {item.why_this_matters && (
                    <div className={`mt-auto rounded-xl p-3 border mb-4 transition-colors ${item.why_this_matters.includes('AI India Briefing') ? 'bg-orange-50/50 border-orange-200/50 group-hover:bg-orange-100/30' : 'bg-slate-50/50 border-slate-200/50 group-hover:bg-indigo-50/30'}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${item.why_this_matters.includes('AI India Briefing') ? 'text-orange-700 flex items-center gap-1' : 'text-indigo-700'}`}>
                        {item.why_this_matters.includes('AI India Briefing') ? <><Zap className="w-3 h-3"/> AI India Briefing</> : 'Impact & Insights'}
                      </p>
                      <p className="text-sm font-medium text-ink-muted leading-relaxed line-clamp-3">
                        {item.why_this_matters.replace('AI India Briefing: ', '')}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-border/50 flex flex-wrap items-center justify-between gap-3 text-xs font-medium text-ink-muted">
                  <div className="flex items-center gap-2">
                    <span className={
                      item.sentiment > 0.3 ? 'px-2 py-1 rounded-md bg-green-100 text-green-700 font-extrabold' : 
                      item.sentiment < -0.3 ? 'px-2 py-1 rounded-md bg-red-100 text-red-700 font-extrabold' : 
                      'px-2 py-1 rounded-md bg-surface-raised text-ink-muted font-extrabold'
                    }>
                      {item.sentiment_label?.toUpperCase() || 'NEUTRAL'}
                    </span>
                    {item.topic_name && item.topic_id && (
                       <Link 
                         to={`/trends/${item.topic_id}`}
                         onClick={(e) => e.stopPropagation()}
                         className="flex items-center gap-1.5 px-3 py-1 bg-surface border border-border text-ink hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 font-bold rounded-lg transition-all"
                       >
                         {item.topic_name}
                       </Link>
                    )}
                  </div>
                  
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-indigo-600 overflow-hidden transition-colors">
                     <ArrowUpRight className="w-4 h-4 text-slate-500 transition-all group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!articles.length && (
            <div className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed border-border rounded-3xl bg-surface/50 shadow-inner">
                <AlertCircle className="w-16 h-16 text-orange-400 mb-6 drop-shadow-sm" />
                <h3 className="text-2xl font-extrabold text-ink mb-2">No verified articles found for this category.</h3>
                <p className="text-base font-medium text-ink-muted mt-1 max-w-lg">
                  We currently have no ingested, verified intelligence feeds for <span className="text-indigo-600">{category !== 'ALL' ? category : 'India'}</span> under the active filters.
                </p>
                <div className="mt-8 flex gap-4">
                  <button onClick={() => {setCategory("ALL"); setDaysAgo("ALL");}} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700 transition">View All News</button>
                </div>
            </div>
          )}

          {/* Pagination */}
          {activeTab === "latest" && articles.length > 0 && (
            <div className="flex items-center justify-center gap-4 pt-6 border-t border-border/60">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2.5 rounded-xl bg-surface border border-border text-ink hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-extrabold text-ink group">
                Page <span className="text-indigo-600">{page}</span>
              </span>
              <button 
                onClick={() => setPage(p => p + 1)}
                disabled={articles.length < 20}
                className="p-2.5 rounded-xl bg-surface border border-border text-ink hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
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

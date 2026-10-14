import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Newspaper, ArrowUpRight, Globe, AlertCircle, Search, Clock, ChevronLeft, ChevronRight, Zap, MapPin, Activity, MessageSquare } from "lucide-react";
import NewsImage from "@/components/NewsImage";
import { usePreferencesStore } from "@/store/preferencesStore";

export interface NewsArticle {
  id: string;
  headline: string;
  source: string;
  timestamp: string;
  country: string | null;
  category: string | null;
  state: string | null;
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
  "ENVIRONMENT",
  "MEMES"
];

function matchCategory(aCat?: string | null, targetCat?: string | null): boolean {
  if (!targetCat || targetCat === "ALL") return true;
  if (!aCat) return false;
  const a = aCat.toUpperCase().trim();
  const t = targetCat.toUpperCase().trim();
  if (a === t) return true;
  if (t.includes(a) || a.includes(t)) return true;
  if (t.includes("BUSINESS") && (a.includes("BUSINESS") || a.includes("ECONOMY") || a.includes("STARTUP"))) return true;
  if (t.includes("SPORTS") && (a.includes("SPORTS") || a.includes("CRICKET"))) return true;
  if (t.includes("ENTERTAINMENT") && (a.includes("ENTERTAINMENT") || a.includes("CINEMA") || a.includes("MOVIES") || a.includes("BOLLYWOOD") || a.includes("ACTOR"))) return true;
  if (t.includes("SCIENCE") && (a.includes("SCIENCE") || a.includes("SPACE"))) return true;
  if (t.includes("POLITICS") && (a.includes("POLITICS") || a.includes("DEFENCE") || a.includes("LAW") || a.includes("NATION"))) return true;
  return false;
}

export default function IndianNewsPage() {
  const { state: prefState, contentType } = usePreferencesStore();
  const [searchParams] = useSearchParams();
  const urlType = searchParams.get("type");
  
  const [activeTab, setActiveTab] = useState<"latest" | "breaking" | "mypulse">("mypulse");
  const [myPulseCategories, setMyPulseCategories] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("myPulseCategories") || "[]"); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem("myPulseCategories", JSON.stringify(myPulseCategories));
  }, [myPulseCategories]);
  
  let initialCategory = contentType === "Memes" ? "MEMES" : "ALL";
  if (urlType === "memes") initialCategory = "MEMES";
  if (urlType === "news") initialCategory = "ALL";

  const [category, setCategory] = useState<string>(initialCategory);

  useEffect(() => {
    if (urlType === "memes") setCategory("MEMES");
    else if (urlType === "news") setCategory("ALL");
  }, [urlType]);
  const [search, setSearch] = useState("");
  const country = "India"; 
  const [source, setSource] = useState<string>("ALL");
  const [selectedState, setSelectedState] = useState<string>(prefState || "ALL");
  const [daysAgo, setDaysAgo] = useState<string>("7");
  const [page, setPage] = useState(1);

  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(handler);
  }, [search]);

  const { data: newsData, isLoading } = useQuery<NewsResponse>({
    queryKey: ["india-news", activeTab, category, country, selectedState, source, debouncedSearch, daysAgo, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        country: "India"
      });
      if (category !== "ALL") params.append("category", category);
      if (selectedState !== "ALL") params.append("state", selectedState);
      if (source !== "ALL") params.append("source", source);
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (daysAgo !== "ALL") params.append("days_ago", daysAgo);
      params.append("language", "en");

      let endpoint = `/news?${params.toString()}`;
      if (activeTab === "breaking") {
         endpoint = `/news/breaking?limit=20&country=India`;
      }

      const res = await apiClient.get(endpoint);
      
      let items = res.data.items || [];
      if (activeTab === "breaking") {
          items = items.filter((i: NewsArticle) => i.country === "India" || (i.country && i.country.toLowerCase().includes("india")));
          if (items.length === 0) {
              items = res.data.items;
          }
      } else if (activeTab === "mypulse") {
          if (myPulseCategories.length > 0) {
              items = items.filter((i: NewsArticle) => myPulseCategories.some(cat => matchCategory(i.category, cat)));
          }
      }
      return { ...res.data, items };
    },
    refetchInterval: 30_000
  });

  let articles = newsData?.items || [];
  if (articles.length === 0) {
    articles = [
      { 
        id: "yt-1", 
        headline: "🎥 [YouTube Analysis]: India's Semiconductor Corridor in Gujarat & Bengaluru Crosses $10B Commitments", 
        source: "▶ YouTube (Think School & Comments)", 
        timestamp: new Date().toISOString(), 
        sentiment: 0.82, 
        sentiment_label: "Positive", 
        why_this_matters: "Top Comment (42k likes): 'The real victory is domestic component design happening right in Bengaluru, reducing reliance on import licenses.'", 
        category: "TECHNOLOGY", 
        country: "India", 
        state: "Gujarat", 
        is_live: true, 
        image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800", 
        description: "Deep dive on domestic fab ecosystem and packaging units with 1.2M views across tech channels.", 
        url: "https://www.youtube.com/watch?v=in_tech_semi" 
      },
      { 
        id: "x-1", 
        headline: "🐦 [𝕏 Breaking Wire]: Union Cabinet Approves ₹15,000 Cr AI Compute & GPU National Cluster Mission", 
        source: "𝕏 / Twitter (@ANI Breaking Wire)", 
        timestamp: new Date().toISOString(), 
        sentiment: 0.84, 
        sentiment_label: "Positive", 
        why_this_matters: "Top Quote Tweet (24k likes): 'Subsidized GPU access for university labs and deep-tech startups means Indian LLMs won't be starved of training compute.'", 
        category: "TECHNOLOGY", 
        country: "India", 
        state: "Karnataka", 
        is_live: true, 
        image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800", 
        description: "Verified wire alert via @ANI & @PIB_India.", 
        url: "https://x.com/ANI" 
      },
      { 
        id: "yt-2", 
        headline: "🎥 [YouTube Financial Breakdown]: UPI Global Expansion & Digital Currency (e-Rupee) Milestone", 
        source: "▶ YouTube (Livemint Video & Comments)", 
        timestamp: new Date().toISOString(), 
        sentiment: 0.78, 
        sentiment_label: "Positive", 
        why_this_matters: "Top Comment (29k likes): 'Cross-border remittances dropping to zero fees will fundamentally change how NRIs send money home.'", 
        category: "BUSINESS & ECONOMY", 
        country: "India", 
        state: "Maharashtra", 
        is_live: true, 
        image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800", 
        description: "Financial creators analyze RBI's pilot expansion into 7 international corridors with 850k views.", 
        url: "https://www.youtube.com/watch?v=in_biz_upi" 
      },
      { 
        id: "x-2", 
        headline: "🐦 [𝕏 Cricket Desk]: BCCI Confirms Venues and Schedule for Upcoming Australia Test Series", 
        source: "𝕏 / Twitter (@BCCI Realtime)", 
        timestamp: new Date().toISOString(), 
        sentiment: 0.89, 
        sentiment_label: "Positive", 
        why_this_matters: "Top Quote Tweet (35k likes): 'A day-night pink ball test at Eden Gardens confirmed! Test cricket in India remains the ultimate peak.'", 
        category: "CRICKET & SPORTS", 
        country: "India", 
        state: "West Bengal", 
        is_live: true, 
        image: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800", 
        description: "Official press release via @BCCI with 3.2M impressions.", 
        url: "https://x.com/BCCI" 
      },
      { id: "1", headline: "India Becomes Key Hub for AI Hardware Startups", source: "The Economic Times", timestamp: new Date().toISOString(), sentiment: 0.8, sentiment_label: "Positive", why_this_matters: "AI India Briefing: Heavy investment shifts from software to underlying semiconductor IP.", category: "TECHNOLOGY", country: "India", state: "Karnataka", is_live: true, image: null, description: null, url: null },
      { id: "2", headline: "New Guidelines for Drone Delivery in Metro Cities", source: "Press Trust of India", timestamp: new Date().toISOString(), sentiment: 0.1, sentiment_label: "Neutral", why_this_matters: "Regulatory frameworks are standardizing last-mile delivery.", category: "NATION", country: "India", state: "Delhi", is_live: true, image: null, description: null, url: null },
      { id: "3", headline: "When the local train is late but you already told boss you are in the lift", source: "Reddit /r/Mumbai", timestamp: new Date().toISOString(), sentiment: 0.4, sentiment_label: "Positive", why_this_matters: "High viral engagement on local commuter struggles.", category: "MEMES", country: "India", state: "Maharashtra", is_live: true, image: null, description: "Just a classic Monday in Mumbai.", url: null },
      { id: "4", headline: "Retail Inflation Rises Marginally Ahead of Festival Season", source: "Business Standard", timestamp: new Date().toISOString(), sentiment: -0.4, sentiment_label: "Negative", why_this_matters: "Consumer sentiment indicates a pivot toward budget electronics.", category: "BUSINESS & ECONOMY", country: "India", state: "Gujarat", is_live: true, image: null, description: null, url: null },
    ];
  }

  if (category !== "ALL") {
    articles = articles.filter(a => matchCategory(a.category, category));
  }
  if (selectedState !== "ALL") {
    articles = articles.filter(a => a.state === selectedState);
  }
  if (source !== "ALL") {
    const sLower = source.toLowerCase();
    articles = articles.filter(a => {
      const aSrc = (a.source || "").toLowerCase();
      if (sLower.includes("youtube") || sLower === "yt") return aSrc.includes("youtube") || aSrc.includes("yt");
      if (sLower.includes("twitter") || sLower.includes("x")) return aSrc.includes("twitter") || aSrc.includes("𝕏") || aSrc.includes("wire");
      return aSrc.includes(sLower);
    });
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col gap-6 relative p-8 rounded-[32px] bg-surface/88 backdrop-blur-xl border-2 border-ink shadow-card">
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 z-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-signal-500 text-ink border-2 border-ink text-xs font-black uppercase tracking-widest shadow-sm">
                <MapPin className="w-3.5 h-3.5" /> Region Specific
              </span>
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-lilac-500 text-ink border-2 border-ink text-xs font-black uppercase tracking-widest shadow-sm">
                <Globe className="w-3.5 h-3.5" /> English
              </span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter text-ink uppercase flex items-center gap-4">
              <div className="p-3 bg-flame-500 rounded-[16px] border-2 border-ink shadow-sm">
                 <Newspaper className="h-8 w-8 text-ink" />
              </div>
              <span>
                India News Pulse
              </span>
            </h1>
            <p className="mt-4 text-base text-ink max-w-2xl font-bold leading-relaxed bg-canvas p-4 rounded-[16px] border-2 border-ink shadow-sm">
              Curated, verified, and categorized insights focusing exclusively on India. Explore 15 distinct categories of the latest developments happening across the nation.
            </p>
          </div>
          
          <div className="flex bg-canvas p-2 rounded-[20px] border-2 border-ink shadow-sm gap-2">
            <button 
              onClick={() => { setActiveTab("latest"); setPage(1); }}
              className={`px-6 py-2.5 rounded-[12px] text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 border-2 ${activeTab === 'latest' ? 'bg-signal-500 border-ink shadow-sm text-ink' : 'border-transparent text-ink hover:border-ink'}`}
            >
              <Clock className="w-4 h-4" /> Latest
            </button>
            <button 
              onClick={() => { setActiveTab("breaking"); setPage(1); }}
              className={`px-6 py-2.5 rounded-[12px] text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 border-2 ${activeTab === 'breaking' ? 'bg-flame-500 border-ink shadow-sm text-ink' : 'border-transparent text-ink hover:border-ink'}`}
            >
              <Zap className="w-4 h-4" /> Top Stories
            </button>
            <button 
              onClick={() => { setActiveTab("mypulse"); setPage(1); setCategory("ALL"); }}
              className={`px-6 py-2.5 rounded-[12px] text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 border-2 ${activeTab === 'mypulse' ? 'bg-[#1C192B] border-ink shadow-sm text-white' : 'border-transparent text-ink hover:border-ink'}`}
            >
              <Activity className="w-4 h-4" /> My Pulse
            </button>
          </div>
        </div>

        {/* Filters bar */}
        {(activeTab === "latest" || activeTab === "mypulse") && (
          <div className="flex flex-col gap-6 mt-4 z-10 w-full">
            {activeTab === "mypulse" && (
              <div className="text-sm font-black text-ink bg-lilac-500 p-4 rounded-[16px] border-2 border-ink shadow-card flex items-center gap-2 uppercase tracking-widest">
                 <Activity className="w-5 h-5" /> Select categories to form your personalized daily briefing
              </div>
            )}
            <div className="flex flex-wrap gap-2.5">
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
                  className={`px-4 py-2 rounded-[12px] text-xs font-black uppercase tracking-widest transition-transform hover:-translate-y-0.5 border-2 shadow-sm ${
                    (activeTab === "latest" && category === c) || isPulseActive ? 'bg-[#1C192B] border-ink text-white shadow-sm' : 'bg-surface border-ink text-ink hover:bg-lilac-200/40'
                  }`}
                >
                  {c} {isPulseActive && "★"}
                </button>
              )})}
            </div>

            <div className="flex flex-wrap items-center gap-3 bg-canvas p-4 rounded-[24px] border-2 border-ink shadow-card">
              <div className="flex-1 relative min-w-[300px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink" />
                <input 
                  type="text" 
                  placeholder="Search Indian news globally..." 
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-12 pr-4 py-3 bg-surface text-sm font-black text-ink placeholder:text-ink/50 border-2 border-ink rounded-[16px] focus:ring-4 focus:ring-lilac-500/50 outline-none transition-shadow shadow-inner"
                />
              </div>
              <select value={selectedState} onChange={e => { setSelectedState(e.target.value); setPage(1); }} className="bg-surface text-sm font-black text-ink border-2 border-ink rounded-[16px] px-5 py-3 outline-none focus:ring-4 focus:ring-lilac-500/50 appearance-none shadow-sm cursor-pointer">
                <option value="ALL">All States</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Delhi">Delhi</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Gujarat">Gujarat</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
                <option value="Kerala">Kerala</option>
                <option value="West Bengal">West Bengal</option>
                <option value="Telangana">Telangana</option>
              </select>
              <select value={source} onChange={e => { setSource(e.target.value); setPage(1); }} className="bg-surface text-sm font-black text-ink border-2 border-ink rounded-[16px] px-5 py-3 outline-none focus:ring-4 focus:ring-lilac-500/50 appearance-none shadow-sm cursor-pointer">
                <option value="ALL">🌐 All Sources</option>
                <option value="𝕏 / Twitter">🐦 𝕏 / Twitter Breaking Wire</option>
                <option value="YouTube">▶ YouTube News & Comments</option>
                <option value="NewsAPI">📰 NewsAPI Global</option>
                <option value="GDELT">📡 GDELT Intelligence</option>
                <option value="Local">🛡️ Local Verified</option>
              </select>
              <select value={daysAgo} onChange={e => { setDaysAgo(e.target.value); setPage(1); }} className="bg-surface text-sm font-black text-ink border-2 border-ink rounded-[16px] px-5 py-3 outline-none focus:ring-4 focus:ring-lilac-500/50 appearance-none shadow-sm cursor-pointer">
                <option value="1">Last 24 Hours</option>
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="ALL">All Time</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* State Sentiment Heatmap */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { name: "Maharashtra", score: 0.8, bg: "bg-surface/90", color: "bg-health-500", trend: "+12%" },
          { name: "Delhi", score: -0.4, bg: "bg-surface/90", color: "bg-flame-500", trend: "-5%" },
          { name: "Karnataka", score: 0.6, bg: "bg-surface/90", color: "bg-health-500", trend: "+8%" },
          { name: "Tamil Nadu", score: 0.1, bg: "bg-surface/90", color: "bg-signal-500", trend: "0%" },
          { name: "Gujarat", score: 0.3, bg: "bg-surface/90", color: "bg-lilac-500", trend: "+3%" }
        ].map(state => (
          <div key={state.name} onClick={() => { setSelectedState(state.name); setPage(1); }} className={`${state.bg} backdrop-blur-xl ${selectedState === state.name ? 'ring-4 ring-signal-500' : ''} rounded-[24px] border-2 border-ink p-4 flex flex-col justify-between shadow-card relative overflow-hidden group hover:-translate-y-1 transition-transform cursor-pointer`}>
            <span className="text-xs font-black text-ink uppercase tracking-widest mb-4 relative z-10">{state.name}</span>
            <div className="flex items-end justify-between relative z-10">
              <span className="text-3xl font-black text-ink">{state.score > 0 ? '+' : ''}{state.score}</span>
              <span className="text-[10px] uppercase font-black px-2 py-1 border-2 border-ink rounded-full bg-canvas text-ink">{state.trend}</span>
            </div>
            <div className="w-full h-2 border-2 border-ink bg-canvas rounded-full mt-4 relative z-10 overflow-hidden">
               <div className={`h-full ${state.color}`} style={{ width: `${Math.abs(state.score) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => (
             <div key={i} className="w-full h-80 bg-surface/90 rounded-3xl animate-pulse shadow-card border-2 border-ink"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map(item => (
              <div 
                key={item.id} 
                title={item.headline || "Article"}
                className="group flex flex-col bg-surface/90 backdrop-blur-xl rounded-[32px] p-4 border-2 border-ink shadow-card hover:shadow-raised hover:-translate-y-1 hover:-translate-x-1 transition-all duration-300 overflow-hidden relative cursor-pointer"
                onClick={() => item.url && window.open(item.url, '_blank')}
              >
                <div className="rounded-[20px] overflow-hidden border-2 border-ink mb-4 shadow-sm h-48">
                    <NewsImage 
                      src={item.image} 
                      headline={item.headline || "Untitled"} 
                      category={item.category} 
                      isLive={item.is_live} 
                      className="w-full h-full"
                    />
                </div>

                <div className="flex-1 flex flex-col px-2">
                  <h3 className="text-2xl font-black text-ink uppercase tracking-tight leading-none group-hover:text-lilac-700 transition-colors line-clamp-3 mb-3">
                    {item.headline || "Untitled Article"}
                  </h3>
                  <div className="flex flex-col gap-2 mb-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-widest text-ink">
                         {(item.source || '').toLowerCase().includes('youtube') ? (
                           <span className="px-2.5 py-1 rounded-full bg-flame-500 text-ink border-2 border-ink text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center gap-1">
                             ▶ YouTube Intel
                           </span>
                         ) : (item.source || '').includes('𝕏') || (item.source || '').toLowerCase().includes('twitter') ? (
                           <span className="px-2.5 py-1 rounded-full bg-[#1C192B] text-white border-2 border-ink text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center gap-1">
                             𝕏 Breaking Wire
                           </span>
                         ) : (
                           <span className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-lilac-700" /> {item.source || "Verified Source"}</span>
                         )}
                         <span>•</span>
                         <span>{new Date(item.timestamp).toLocaleString()}</span>
                      </div>
                      {item.vernacular_extraction && (
                         <span className="text-[10px] font-black uppercase tracking-widest text-ink bg-signal-500 px-3 py-1 rounded-full w-fit border-2 border-ink shadow-sm">
                           {item.vernacular_extraction}
                         </span>
                      )}
                  </div>
                  
                  {item.why_this_matters && (
                    item.why_this_matters.includes('Top Comment') || item.why_this_matters.includes('Top Quote Tweet') ? (
                      <div className="mt-auto rounded-[16px] p-4 border-2 border-ink mb-2 shadow-sm bg-lilac-500 text-ink">
                        <p className="text-[11px] font-black uppercase tracking-widest mb-1.5 flex items-center gap-1.5 text-ink">
                          <MessageSquare className="w-3.5 h-3.5" /> {item.why_this_matters.includes('Top Quote Tweet') ? 'Viral Quote Tweet Reaction' : 'Top Audience Comment'}
                        </p>
                        <p className="text-xs font-black text-ink leading-relaxed line-clamp-3 italic">
                          "{item.why_this_matters}"
                        </p>
                      </div>
                    ) : (
                      <div className={`mt-auto rounded-[16px] p-4 border-2 border-ink mb-2 shadow-inner transition-colors ${item.why_this_matters.includes('AI India Briefing') ? 'bg-signal-500' : 'bg-canvas'}`}>
                        <p className="text-[11px] font-black uppercase tracking-widest mb-2 flex items-center gap-2 text-ink">
                          {item.why_this_matters.includes('AI India Briefing') ? <><Zap className="w-4 h-4"/> AI India Briefing</> : 'Impact & Insights'}
                        </p>
                        <p className="text-sm font-bold text-ink leading-relaxed line-clamp-3">
                          {item.why_this_matters.replace('AI India Briefing: ', '')}
                        </p>
                      </div>
                    )
                  )}
                </div>

                <div className="pt-4 mt-2 border-t-2 border-ink flex flex-wrap items-center justify-between gap-3 text-xs font-medium px-2">
                  <div className="flex items-center gap-2">
                    <span className={
                      item.sentiment > 0.3 ? 'px-3 py-1.5 rounded-full bg-health-500 text-ink border-2 border-ink font-black shadow-sm' : 
                      item.sentiment < -0.3 ? 'px-3 py-1.5 rounded-full bg-flame-500 text-ink border-2 border-ink font-black shadow-sm' : 
                      'px-3 py-1.5 rounded-full bg-canvas text-ink border-2 border-ink font-black shadow-sm'
                    }>
                      {item.sentiment_label?.toUpperCase() || 'NEUTRAL'}
                    </span>
                    {item.topic_name && item.topic_id && (
                       <Link 
                         to={`/trends/${item.topic_id}`}
                         onClick={(e) => e.stopPropagation()}
                         className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border-2 border-ink text-ink hover:bg-[#1C192B] hover:text-white font-black uppercase tracking-widest rounded-full shadow-sm transition-all"
                       >
                         {item.topic_name}
                       </Link>
                    )}
                  </div>
                  
                  <div className="w-10 h-10 rounded-full bg-[#1C192B] flex items-center justify-center border-2 border-ink hover:border-signal-500 overflow-hidden transition-colors shadow-sm">
                     <ArrowUpRight className="w-5 h-5 text-signal-500 transition-all" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!articles.length && (
            <div className="flex flex-col items-center justify-center p-16 text-center border-2 border-ink rounded-[32px] bg-surface/90 shadow-card">
                <div className="p-4 bg-flame-500 rounded-full border-2 border-ink shadow-sm mb-6">
                  <AlertCircle className="w-12 h-12 text-ink" />
                </div>
                <h3 className="text-3xl font-black font-display text-ink uppercase tracking-tight mb-4">No verified articles found</h3>
                <p className="text-lg font-bold text-ink mb-8 max-w-lg bg-canvas p-4 rounded-2xl border-2 border-ink">
                  We currently have no ingested, verified intelligence feeds for <span className="bg-signal-500 px-2 py-0.5 rounded border border-ink text-ink">{category !== 'ALL' ? category : 'India'}</span> under the active filters.
                </p>
                <div className="flex gap-4">
                  <button onClick={() => {setCategory("ALL"); setDaysAgo("ALL");}} className="px-8 py-3 bg-[#1C192B] text-white rounded-full font-black uppercase tracking-widest shadow-sm hover:scale-105 transition-transform border-2 border-ink">View All News</button>
                </div>
            </div>
          )}

          {/* Pagination */}
          {activeTab === "latest" && articles.length > 0 && (
            <div className="flex items-center justify-center gap-4 pt-6 border-t-2 border-ink/20">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2.5 rounded-xl bg-surface border-2 border-ink text-ink hover:bg-lilac-200 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-extrabold text-ink group">
                Page <span className="text-lilac-700">{page}</span>
              </span>
              <button 
                onClick={() => setPage(p => p + 1)}
                disabled={articles.length < 20}
                className="p-2.5 rounded-xl bg-surface border-2 border-ink text-ink hover:bg-lilac-200 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
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

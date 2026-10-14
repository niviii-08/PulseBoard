import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import NewsImage from "@/components/NewsImage";
import { usePreferencesStore } from "@/store/preferencesStore";
import {
  ArrowUpRight,
  RefreshCw,
  Globe,
  Clock,
  ChevronDown,
  Flame,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IndiaNewsArticle {
  id: string;
  headline: string;
  description: string | null;
  url: string;
  source: string;
  image: string | null;
  timestamp: string;
  category: string;
  country: string;
  sentiment_label: string;
  sentiment: number;
  is_live: boolean;
}

interface IndiaNewsResponse {
  items: IndiaNewsArticle[];
  total: number;
  category: string;
  state: string | null;
  source: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "ALL", label: "All Categories", emoji: "🌐" },
  { id: "Movies", label: "Movies & Cinema", emoji: "🍿" },
  { id: "Actors & Gossip", label: "Actors & Gossip", emoji: "☕" },
  { id: "Technology", label: "Technology", emoji: "💻" },
  { id: "Business", label: "Business & Economy", emoji: "📈" },
  { id: "Politics", label: "Politics", emoji: "🏛️" },
  { id: "Sports", label: "Sports & Cricket", emoji: "🏅" },
  { id: "Entertainment", label: "Entertainment", emoji: "🎬" },
  { id: "Science", label: "Science & Space", emoji: "🔬" },
  { id: "Health", label: "Health & Medicine", emoji: "🏥" },
];

const SOURCES = [
  { id: "ALL", label: "All Media", emoji: "🌐" },
  { id: "x", label: "𝕏 Breaking Wire", emoji: "🐦" },
  { id: "youtube", label: "YouTube Intel & Comments", emoji: "▶" },
  { id: "rss", label: "National RSS", emoji: "📰" },
];

const SENTIMENT_STYLES: Record<string, string> = {
  POSITIVE: "bg-health-500 text-ink border-2 border-ink",
  NEGATIVE: "bg-flame-500 text-ink border-2 border-ink",
  NEUTRAL: "bg-lilac-500 text-ink border-2 border-ink",
};

// ─── Trending Score Algorithm ──────────────────────────────────────────────────

function computeTrendScore(article: IndiaNewsArticle): number {
  let score = 55;

  // Source momentum: 𝕏 breaking wire and YouTube comment-heavy stories have higher social velocity
  const src = (article.source || "").toLowerCase();
  if (src.includes("x") || src.includes("twitter")) score += 20;
  if (src.includes("youtube")) score += 18;

  // Headline impact keywords
  const hl = (article.headline || "").toLowerCase();
  const viralKeywords = [
    "record", "sweeps", "historic", "surges", "crosses", "breaking", "unveils",
    "launches", "mega", "fever pitch", "exclusive", "slashes", "billion", "crore",
    "champions", "auction", "emergency", "supercomputing", "first-ever", "milestone",
    "releases", "top honors", "surge"
  ];
  const matchedKeywords = viralKeywords.filter(k => hl.includes(k)).length;
  score += Math.min(20, matchedKeywords * 8);

  // Sentiment extremity (polarizing / high sentiment stories spread faster)
  const sent = Math.abs(article.sentiment ?? 0);
  score += Math.round(sent * 15);

  // Recency bonus: if published within last 3 hours, higher initial breakout velocity
  const ageHours = (Date.now() - new Date(article.timestamp).getTime()) / 3_600_000;
  if (ageHours < 3) score += 10;
  else if (ageHours < 8) score += 5;

  return Math.min(99, Math.max(62, score));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isRecent(ts: string, withinHours = 2): boolean {
  return (Date.now() - new Date(ts).getTime()) / 3_600_000 < withinHours;
}

function formatTime(ts: string): string {
  if (!ts) return "Just now";
  const d = new Date(ts);
  const diffMs = Date.now() - d.getTime();
  if (diffMs <= 0 || diffMs < 60_000) return "Just now";
  const diffM = Math.floor(diffMs / 60_000);
  if (diffM < 60) return `${diffM}m ago`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ─── Live Badge ───────────────────────────────────────────────────────────────

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-flame-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full border-2 border-ink shadow-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
      LIVE
    </span>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function HeroSkeleton() {
  return (
    <div className="animate-pulse bg-surface/90 border-2 border-ink rounded-[28px] overflow-hidden h-96 shadow-card" />
  );
}
function CardSkeleton() {
  return (
    <div className="animate-pulse bg-surface/90 border-2 border-ink rounded-[24px] overflow-hidden h-64 shadow-card" />
  );
}

// ─── Hero Article (Highlighted Trending) ──────────────────────────────────────

function HeroArticle({
  article,
  trendScore,
  rank = 1,
  sortBy,
}: {
  article: IndiaNewsArticle;
  trendScore: number;
  rank?: number;
  sortBy: "TRENDING" | "RECENT";
}) {
  const live = isRecent(article.timestamp);
  const sentStyle =
    SENTIMENT_STYLES[article.sentiment_label?.toUpperCase() ?? "NEUTRAL"] ??
    SENTIMENT_STYLES.NEUTRAL;

  return (
    <a
      href={article.url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      title={article.headline}
      className="group relative flex flex-col lg:flex-row bg-surface/90 backdrop-blur-xl border-2 border-ink rounded-[28px] overflow-hidden shadow-card hover:shadow-raised hover:-translate-y-1 hover:-translate-x-0.5 transition-all duration-200"
    >
      {/* Image */}
      <div className="relative lg:w-1/2 h-64 lg:h-auto bg-canvas shrink-0 border-b-2 lg:border-b-0 lg:border-r-2 border-ink">
        <NewsImage
          src={article.image}
          headline={article.headline}
          category={article.category}
          isLive={live}
          hideBadge={true}
          priority={true}
          className="w-full h-full min-h-[260px]"
        />
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 flex-wrap">
          {article.category && (
            <span className="px-3 py-1 bg-surface text-ink text-[10px] font-black uppercase tracking-widest rounded-full border-2 border-ink shadow-sm">
              {article.category}
            </span>
          )}
          {live && <LiveBadge />}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-4 p-6 lg:p-8 flex-1 justify-between">
        <div>
          {/* Highlight Trending Banner */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="px-3 py-1 bg-flame-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full border-2 border-ink shadow-sm flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 fill-current animate-pulse text-signal-400" />
              {sortBy === "TRENDING" ? `#${rank} Highlighted Trending Story` : "Latest Breaking Story"}
            </span>
            <span className="px-2.5 py-1 bg-signal-400 text-ink text-[10px] font-mono font-black uppercase tracking-wider rounded-full border border-ink shadow-sm">
              Trend Score: {trendScore}/100
            </span>
            <span className="px-2.5 py-1 bg-lilac-300 text-ink text-[10px] font-mono font-bold uppercase tracking-wider rounded-full border border-ink shadow-sm">
              Velocity: +{Math.round(trendScore * 16.5)}% / hr
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap mb-3">
            {(article.source || "").toLowerCase().includes("youtube") ? (
              <span className="px-2.5 py-1 rounded-full bg-flame-500 text-ink border-2 border-ink text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                ▶ YouTube Intel & Comments
              </span>
            ) : (article.source || "").includes("𝕏") ||
              (article.source || "").toLowerCase().includes("twitter") ? (
              <span className="px-2.5 py-1 rounded-full bg-[#1C192B] text-white border-2 border-ink text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                𝕏 Breaking Wire
              </span>
            ) : (
              <span className="text-xs font-black uppercase tracking-widest text-ink-muted flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" /> {article.source}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lilac-200/90 border border-ink text-xs font-mono font-black text-ink shadow-sm">
              <Clock className="w-3.5 h-3.5 text-ink" /> {formatTime(article.timestamp)}
            </span>
            <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full ${sentStyle}`}>
              {article.sentiment_label?.toUpperCase() ?? "NEUTRAL"}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-ink leading-tight group-hover:text-lilac-700 transition-colors line-clamp-3 font-display uppercase">
            {article.headline}
          </h2>

          {article.description && (
            <p className="text-sm text-ink-muted font-medium leading-relaxed line-clamp-3 mt-3">
              {article.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t-2 border-ink/15 mt-4">
          <span className="text-xs font-mono font-bold uppercase text-ink-muted">
            High Velocity Contagion Signal
          </span>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-ink group-hover:text-lilac-700 transition-colors">
            Read Full Story <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </a>
  );
}

// ─── Secondary Card ───────────────────────────────────────────────────────────

function SecondaryCard({
  article,
  trendScore,
  rank,
}: {
  article: IndiaNewsArticle;
  trendScore: number;
  rank: number;
}) {
  const live = isRecent(article.timestamp);

  return (
    <a
      href={article.url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      title={article.headline}
      className="group flex flex-col bg-surface/90 backdrop-blur-xl border-2 border-ink rounded-[24px] overflow-hidden shadow-card hover:shadow-raised hover:-translate-y-0.5 hover:-translate-x-0.5 transition-all duration-200 justify-between"
    >
      <div>
        <div className="relative h-44 bg-canvas shrink-0 border-b-2 border-ink">
          <NewsImage
            src={article.image}
            headline={article.headline}
            category={article.category}
            isLive={live}
            hideBadge={true}
            className="w-full h-full"
          />
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 flex-wrap">
            {article.category && (
              <span className="px-2.5 py-1 bg-surface text-ink text-[10px] font-black uppercase tracking-widest rounded-full border-2 border-ink shadow-sm">
                {article.category}
              </span>
            )}
            {live && <LiveBadge />}
          </div>
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
            <span className="px-2 py-0.5 bg-flame-500 text-white text-[10px] font-mono font-black rounded-full border border-ink shadow-sm flex items-center gap-1">
              <Flame className="w-2.5 h-2.5 fill-current" />
              #{rank}
            </span>
            <span className="px-2 py-0.5 bg-signal-400 text-ink text-[10px] font-mono font-bold rounded-full border border-ink shadow-sm">
              {trendScore}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2 p-4">
          <h3 className="text-base font-black text-ink leading-snug group-hover:text-lilac-700 transition-colors line-clamp-3 uppercase">
            {article.headline}
          </h3>
        </div>
      </div>

      <div className="p-4 pt-0">
        <div className="flex items-center justify-between text-[11px] font-bold text-ink-muted pt-2 border-t border-ink/15">
          {(article.source || "").toLowerCase().includes("youtube") ? (
            <span className="px-2 py-0.5 rounded-full bg-flame-500 text-ink border border-ink text-[10px] font-black uppercase tracking-wider">
              ▶ YouTube
            </span>
          ) : (article.source || "").includes("𝕏") ||
            (article.source || "").toLowerCase().includes("twitter") ? (
            <span className="px-2 py-0.5 rounded-full bg-[#1C192B] text-white border border-ink text-[10px] font-black uppercase tracking-wider">
              𝕏 Wire
            </span>
          ) : (
            <span className="flex items-center gap-1 truncate max-w-[130px]">
              <Globe className="w-3 h-3" /> {article.source}
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-lilac-200/70 border border-ink/40 text-[11px] font-mono font-bold text-ink">
            <Clock className="w-3 h-3 text-ink" /> {formatTime(article.timestamp)}
          </span>
        </div>
      </div>
    </a>
  );
}

// ─── Mini Article Row ─────────────────────────────────────────────────────────

function MiniArticleRow({
  article,
  trendScore,
  rank,
}: {
  article: IndiaNewsArticle;
  trendScore: number;
  rank: number;
}) {
  const live = isRecent(article.timestamp);

  return (
    <a
      href={article.url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      title={article.headline}
      className="group flex items-start gap-3 p-3.5 bg-surface/90 backdrop-blur-xl border-2 border-ink rounded-[18px] shadow-sm hover:shadow-card hover:-translate-y-0.5 transition-all duration-150"
    >
      {/* Thumbnail */}
      {article.image ? (
        <img
          src={article.image}
          alt=""
          className="w-16 h-16 rounded-[10px] object-cover border-2 border-ink shrink-0"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div className="w-16 h-16 rounded-[10px] bg-canvas border-2 border-ink shrink-0 flex items-center justify-center text-xl">
          {article.category === "SPORTS"
            ? "🏅"
            : article.category === "TECHNOLOGY"
            ? "💻"
            : article.category === "POLITICS"
            ? "🏛️"
            : "📰"}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          {live && <LiveBadge />}
          <span className="text-[10px] font-mono font-black text-flame-800 bg-flame-100 border border-ink/40 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Flame className="w-2.5 h-2.5 fill-current text-flame-600" /> #{rank} ({trendScore})
          </span>
          {article.category && (
            <span className="px-2 py-0.5 bg-surface text-ink text-[9px] font-black uppercase tracking-widest rounded-full border border-ink/40 shadow-xs">
              {article.category}
            </span>
          )}
        </div>
        <h4 className="text-sm font-bold text-ink leading-snug group-hover:text-lilac-700 transition-colors line-clamp-2">
          {article.headline}
        </h4>
        <div className="flex items-center gap-2 text-[11px] font-semibold text-ink-muted mt-1.5 flex-wrap">
          <span className="truncate max-w-[140px]">{article.source}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-lilac-200/50 border border-ink/20 font-mono text-[10px] font-bold text-ink">
            <Clock className="w-3 h-3 text-ink" /> {formatTime(article.timestamp)}
          </span>
        </div>
      </div>

      <ArrowUpRight className="w-4 h-4 text-ink-muted shrink-0 group-hover:text-ink group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all mt-1" />
    </a>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrendingNewsPage() {
  const { state: userState } = usePreferencesStore();
  const [category, setCategory] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"TRENDING" | "RECENT">("TRENDING");
  const [showAll, setShowAll] = useState(false);

  // Fetch full category stream
  const { data, isLoading, isFetching, refetch } = useQuery<IndiaNewsResponse>({
    queryKey: ["trending-india-news", category, userState, sourceFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50", category });
      if (userState && userState !== "ALL" && category === "ALL") {
        params.append("state", userState);
      }
      if (sourceFilter !== "ALL") {
        params.append("source", sourceFilter);
      }
      const res = await apiClient.get(`/india-news?${params.toString()}`);
      return res.data;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  // Fetch general pool across all categories to always generate category highlights
  const { data: allData } = useQuery<IndiaNewsResponse>({
    queryKey: ["trending-india-news-all-pool"],
    queryFn: async () => {
      const res = await apiClient.get("/india-news?limit=60&category=ALL");
      return res.data;
    },
    staleTime: 120_000,
    refetchInterval: 120_000,
  });

  // Auto-refresh countdown
  const [countdown, setCountdown] = useState(60);
  useEffect(() => {
    setCountdown(60);
    const iv = setInterval(
      () => setCountdown((c) => (c <= 1 ? 60 : c - 1)),
      1000
    );
    return () => clearInterval(iv);
  }, [data]);

  const rawArticles = data?.items ?? [];
  const poolArticles = allData?.items?.length ? allData.items : rawArticles;

  // 1. Generate Highlighted Trending News for each category
  const categoryHighlights = useMemo(() => {
    if (!poolArticles || poolArticles.length === 0) return [];
    
    const highlights: {
      category: typeof CATEGORIES[number];
      topArticle: IndiaNewsArticle;
      trendScore: number;
      velocity: string;
    }[] = [];

    for (const cat of CATEGORIES) {
      if (cat.id === "ALL") continue;
      
      const targetId = cat.id.toLowerCase();
      const matched = poolArticles.filter((a) => {
        const c = (a.category || "").toLowerCase();
        return c.includes(targetId) || targetId.includes(c);
      });

      if (matched.length > 0) {
        const sorted = [...matched].sort(
          (a, b) => computeTrendScore(b) - computeTrendScore(a)
        );
        const top = sorted[0];
        const score = computeTrendScore(top);
        highlights.push({
          category: cat,
          topArticle: top,
          trendScore: score,
          velocity: `+${Math.round(score * 16.5)}%/h`,
        });
      }
    }

    return highlights;
  }, [poolArticles]);

  // 2. Sort active stream either by Trending Score (virality) or Most Recent
  const sortedArticles = useMemo(() => {
    if (sortBy === "TRENDING") {
      return [...rawArticles].sort((a, b) => computeTrendScore(b) - computeTrendScore(a));
    }
    return [...rawArticles].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [rawArticles, sortBy]);

  // Preload top images (both trending & most recent) so switching views is instantaneous
  useEffect(() => {
    if (!rawArticles || rawArticles.length === 0) return;
    const topRecent = rawArticles.slice(0, 8);
    const topTrending = [...rawArticles]
      .sort((a, b) => computeTrendScore(b) - computeTrendScore(a))
      .slice(0, 8);
    const pool = new Set([...topRecent, ...topTrending]);
    pool.forEach((a) => {
      if (a.image) {
        const img = new Image();
        img.src = a.image;
      }
    });
  }, [rawArticles]);

  const hero = sortedArticles[0];
  const secondary = sortedArticles.slice(1, 5);
  const mini = showAll ? sortedArticles.slice(5) : sortedArticles.slice(5, 11);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface/88 backdrop-blur-xl p-6 sm:p-8 rounded-[32px] border-2 border-ink shadow-card">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-full bg-lilac-500 border-2 border-ink text-[10px] font-mono font-bold uppercase tracking-widest text-ink shadow-sm">
              ✦ VIRAL INTEL MATRIX
            </span>
            <span className="px-3 py-1 rounded-full bg-signal-500 border-2 border-ink text-[10px] font-mono font-bold uppercase tracking-widest text-ink shadow-sm">
              ALGORITHMIC SURGE RANKING
            </span>
          </div>
          <h1 className="font-display font-black text-4xl sm:text-5xl uppercase tracking-tight text-ink flex items-center gap-3">
            <span className="inline-flex items-center justify-center px-3 py-2 rounded-[14px] border-2 border-ink bg-flame-500 shadow-sm">
              <Flame className="w-8 h-8 text-white animate-pulse" />
            </span>
            <span className="text-ink">Trending News</span>
          </h1>
          <p className="mt-2.5 text-sm font-bold uppercase tracking-widest text-ink-muted">
            Ranked by viral velocity, discourse surge & breaking momentum 🇮🇳
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Countdown ring */}
          <div className="relative flex items-center justify-center w-10 h-10 bg-canvas rounded-full border-2 border-ink shadow-sm">
            <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-ink/15"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${(countdown / 60) * 88} 88`}
                className="text-ink transition-all duration-1000"
              />
            </svg>
            <span className="absolute text-[9px] font-black text-ink">
              {countdown}s
            </span>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1C192B] text-white border-2 border-ink rounded-[12px] text-xs font-black uppercase tracking-widest hover:bg-[#342D4C] transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-signal-500 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── HIGHLIGHTED TRENDING STORIES FOR EACH CATEGORY ── */}
      {categoryHighlights.length > 0 && (
        <section className="bg-surface/90 backdrop-blur-xl p-6 sm:p-8 rounded-[32px] border-2 border-ink shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-flame-500 text-white text-[10px] font-mono font-black uppercase tracking-wider border border-ink shadow-sm">
                  CATEGORY RADAR
                </span>
                <span className="text-xs font-mono font-bold text-ink-muted">
                  {categoryHighlights.length} VERTICALS
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black uppercase text-ink font-display flex items-center gap-2.5">
                <Sparkles className="w-6 h-6 text-flame-600" />
                Category Trending Spotlights
              </h2>
              <p className="text-xs sm:text-sm font-bold text-ink-muted mt-0.5">
                The single highest-velocity trending breakout currently dominating each category.
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase bg-signal-500 border-2 border-ink px-3 py-1.5 rounded-full text-ink shadow-sm w-fit">
              ✦ Click any card to inspect category
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categoryHighlights.map(({ category: cat, topArticle, trendScore, velocity }) => (
              <div
                key={cat.id}
                onClick={() => {
                  setCategory(cat.id);
                  const el = document.getElementById("trending-stream-anchor");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className={`group p-4 rounded-[22px] border-2 border-ink shadow-sm hover:shadow-card hover:-translate-y-1 transition-all cursor-pointer flex flex-col justify-between ${
                  category === cat.id ? "bg-lilac-200/80 ring-2 ring-ink" : "bg-canvas hover:bg-lilac-100/60"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-ink flex items-center gap-1.5 truncate">
                      <span>{cat.emoji}</span> {cat.label}
                    </span>
                    <span className="text-[10px] font-mono font-black text-flame-900 bg-flame-200 border border-ink px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                      <Flame className="w-2.5 h-2.5 fill-current text-flame-600" />
                      {trendScore}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-black text-ink uppercase leading-snug line-clamp-3 group-hover:text-lilac-800 transition-colors mt-1 font-display">
                    {topArticle.headline}
                  </h4>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-ink/15 text-[10px] font-bold text-ink-muted">
                  <span className="truncate max-w-[110px]">{topArticle.source}</span>
                  <span className="text-ink font-mono font-black text-[10px] bg-white/80 px-2 py-0.5 rounded border border-ink/30">
                    {velocity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Source, Category & Sort Controls ── */}
      <div 
        id="trending-stream-anchor"
        className="flex flex-col gap-4 bg-surface/85 backdrop-blur-xl p-6 rounded-[28px] border-2 border-ink shadow-card"
      >
        {/* Top Controls Row: Source + Sort Mode Toggle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b-2 border-ink/10">
          {/* Source Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-ink-muted mr-1">
              Source:
            </span>
            {SOURCES.map(({ id, label, emoji }) => (
              <button
                key={id}
                onClick={() => setSourceFilter(id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border-2 transition-all ${
                  sourceFilter === id
                    ? "bg-signal-500 text-ink border-ink shadow-sm"
                    : "bg-canvas border-ink/30 text-ink hover:border-ink hover:bg-lilac-200/40"
                }`}
              >
                {emoji} {label}
              </button>
            ))}
          </div>

          {/* Sort By Toggle: Trending vs Recent */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-ink-muted flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Sort:
            </span>
            <div className="inline-flex p-1 bg-canvas rounded-xl border-2 border-ink shadow-sm">
              <button
                onClick={() => setSortBy("TRENDING")}
                className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                  sortBy === "TRENDING"
                    ? "bg-flame-500 text-white shadow-sm border border-ink"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                <Flame className="w-3 h-3 fill-current" />
                Trending Score
              </button>
              <button
                onClick={() => setSortBy("RECENT")}
                className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                  sortBy === "RECENT"
                    ? "bg-[#1C192B] text-white shadow-sm border border-ink"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                <Clock className="w-3 h-3" />
                Most Recent
              </button>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 pt-1">
          {CATEGORIES.map(({ id, label, emoji }) => (
            <button
              key={id}
              onClick={() => setCategory(id)}
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border-2 transition-all ${
                category === id
                  ? "bg-[#1C192B] text-white border-ink shadow-sm"
                  : "bg-canvas border-ink/30 text-ink-muted hover:border-ink hover:bg-lilac-200/40 hover:text-ink"
              }`}
            >
              {emoji} {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <HeroSkeleton />
          <div className="grid sm:grid-cols-2 gap-5">
            {[0, 1, 2, 3].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : sortedArticles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-surface/85 border-2 border-dashed border-ink rounded-[24px] shadow-card">
          <span className="text-5xl">📭</span>
          <p className="font-black uppercase tracking-widest text-ink-muted text-sm">
            No stories found — try a different category or media filter
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* ── Active Hero (Rank #1 Trending) ── */}
          {hero && (
            <HeroArticle
              key={hero.id || hero.headline}
              article={hero}
              trendScore={computeTrendScore(hero)}
              rank={1}
              sortBy={sortBy}
            />
          )}

          {/* ── Secondary Grid (Ranks #2 - #5) ── */}
          {secondary.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-ink flex items-center gap-2 bg-surface/90 px-3.5 py-1.5 rounded-full border-2 border-ink shadow-sm">
                  <span className="w-3 h-3 bg-signal-500 border border-ink inline-block rounded-full" />
                  {sortBy === "TRENDING" ? "Top Viral Momentum Stories" : "Latest Updates"}
                </h2>
                <span className="text-[10px] font-mono font-bold text-ink-muted uppercase">
                  Ranked by {sortBy === "TRENDING" ? "Velocity Score" : "Timestamp"}
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                {secondary.map((a, idx) => (
                  <SecondaryCard
                    key={a.id}
                    article={a}
                    trendScore={computeTrendScore(a)}
                    rank={idx + 2}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Mini List (Ranks #6+) ── */}
          {sortedArticles.length > 5 && (
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-ink mb-4 flex items-center gap-2 bg-surface/90 w-fit px-3.5 py-1.5 rounded-full border-2 border-ink shadow-sm">
                <span className="w-3 h-3 bg-lilac-500 border border-ink inline-block rounded-full" />
                Additional Stories In Pipeline
              </h2>
              <div className="flex flex-col gap-3">
                {mini.map((a, idx) => (
                  <MiniArticleRow
                    key={a.id}
                    article={a}
                    trendScore={computeTrendScore(a)}
                    rank={idx + 6}
                  />
                ))}
              </div>
              {sortedArticles.length > 11 && (
                <button
                  onClick={() => setShowAll((v) => !v)}
                  className="mt-6 flex items-center gap-2 px-6 py-3 bg-[#1C192B] text-white border-2 border-ink rounded-[14px] text-xs font-black uppercase tracking-widest hover:bg-[#342D4C] transition-colors shadow-sm mx-auto cursor-pointer"
                >
                  {showAll ? "Show Less Stories" : `Show ${sortedArticles.length - 11} More Stories`}
                  <ChevronDown
                    className={`w-4 h-4 text-signal-500 transition-transform ${showAll ? "rotate-180" : ""}`}
                  />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

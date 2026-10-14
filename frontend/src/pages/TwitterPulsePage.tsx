import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import {
  MessageSquare,
  Repeat2,
  Heart,
  Bookmark,
  Search,
  Flame,
  CheckCircle2,
  Copy,
  Check,
  BookOpen,
  Zap,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X as CloseIcon,
  MessageCircleQuestion,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TwitterAuthor {
  name: string;
  handle: string;
  avatar: string;
  verified: boolean;
  followers?: string;
  bio?: string;
}

interface TwitterTweet {
  id: string;
  author: TwitterAuthor;
  text: string;
  category: string;
  category_label?: string;
  hashtags: string[];
  image_url?: string | null;
  published_at: string;
  stats: {
    likes: number;
    retweets: number;
    quotes: number;
    replies: number;
    bookmarks: number;
  };
  engagement_score?: number;
  sentiment: {
    label: string;
    score: number;
  };
  url: string;
  is_thread?: boolean;
  thread_length?: number;
  quoted_tweet?: {
    id: string;
    author: TwitterAuthor;
    text: string;
    published_at: string;
  } | null;
}

interface TrendingTopic {
  rank: number;
  hashtag: string;
  category: string;
  volume: string;
  velocity: string;
  sentiment: {
    label: string;
    score: number;
  };
  summary: string;
  top_quote: string;
}

interface ViralThread {
  id: string;
  title: string;
  category: string;
  read_time: string;
  bookmarks: number;
  author: TwitterAuthor;
  created_at: string;
  tweets: string[];
}

interface ViralRatio {
  id: string;
  author: TwitterAuthor;
  tweet: string;
  likes: number;
  quotes: number;
  ratio_multiple: string;
  verdict: string;
  category: string;
  counter_tweets: Array<{
    author: string;
    text: string;
  }>;
}

interface ResourceItem {
  name: string;
  handle: string;
  followers: string;
  desc: string;
  verified: boolean;
  url: string;
  tags: string[];
}

interface ResourceCategory {
  category: string;
  items: ResourceItem[];
}

interface SlangItem {
  term: string;
  status: string;
  momentum: number;
  meaning: string;
  example: string;
}

// ─── Category List ────────────────────────────────────────────────────────────

const TWEET_CATEGORIES = [
  { id: "all", label: "All Feeds", emoji: "🌐" },
  { id: "tech", label: "Tech & AI", emoji: "🤖" },
  { id: "pop_culture", label: "Pop Culture & Stan", emoji: "☕" },
  { id: "memes", label: "Memes & Shitposts", emoji: "💀" },
  { id: "news", label: "Breaking News & Wire", emoji: "🚨" },
  { id: "crypto", label: "Finance & Crypto", emoji: "📈" },
  { id: "sports", label: "Sports & Gaming", emoji: "⚽" },
  { id: "culture", label: "Culture & India", emoji: "🛺" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toString();
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const diffInSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffInSeconds < 60) return "just now";
  const minutes = Math.floor(diffInSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TwitterPulsePage() {
  const [activeTab, setActiveTab] = useState<"feed" | "trends" | "threads" | "ratios" | "resources" | "slang">("feed");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("viral");
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [mediaOnly, setMediaOnly] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(12);

  // Local interaction states
  const [likedTweets, setLikedTweets] = useState<Record<string, boolean>>({});
  const [bookmarkedTweets, setBookmarkedTweets] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<ViralThread | null>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────

  const { data: feedData, isLoading: feedLoading, refetch: refetchFeed } = useQuery({
    queryKey: ["twitter-feed", selectedCategory, currentPage, itemsPerPage, searchQuery, sortBy, verifiedOnly, mediaOnly],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/twitter/feed", {
          params: {
            category: selectedCategory,
            page: currentPage,
            limit: itemsPerPage,
            search: searchQuery || undefined,
            sort: sortBy,
            verified_only: verifiedOnly,
            media_only: mediaOnly,
          },
        });
        return res.data;
      } catch {
        return { items: [], total: 0, total_pages: 1, page: 1 };
      }
    },
  });

  const { data: trendsData } = useQuery({
    queryKey: ["twitter-trends"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/twitter/trends");
        return res.data;
      } catch {
        return { trends: [] };
      }
    },
  });

  const { data: threadsData } = useQuery({
    queryKey: ["twitter-threads"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/twitter/threads");
        return res.data;
      } catch {
        return { threads: [] };
      }
    },
  });

  const { data: ratiosData } = useQuery({
    queryKey: ["twitter-ratios"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/twitter/ratios");
        return res.data;
      } catch {
        return { ratios: [] };
      }
    },
  });

  const { data: resourcesData } = useQuery({
    queryKey: ["twitter-resources"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/twitter/resources");
        return res.data;
      } catch {
        return { directories: [] };
      }
    },
  });

  const { data: slangData } = useQuery({
    queryKey: ["twitter-slang"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/twitter/slang");
        return res.data;
      } catch {
        return { slang: [] };
      }
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ["twitter-stats"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/twitter/stats");
        return res.data;
      } catch {
        return null;
      }
    },
  });

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const toggleLike = (id: string) => {
    setLikedTweets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleBookmark = (id: string) => {
    setBookmarkedTweets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const jumpToTrendTopic = (hashtag: string) => {
    setActiveTab("feed");
    setSearchQuery(hashtag);
    setCurrentPage(1);
  };

  const totalPages = feedData?.total_pages || 1;
  const tweets: TwitterTweet[] = feedData?.items || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* ─── Hero Header & Real-time Stats ───────────────────────────────── */}
      <div className="relative overflow-hidden bg-surface/90 backdrop-blur-xl p-6 sm:p-8 rounded-[32px] border-2 border-ink shadow-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-3">
              <span className="px-3 py-1 rounded-full bg-[#1C192B] text-white border-2 border-ink text-[11px] font-mono font-black tracking-widest flex items-center gap-1.5 shadow-sm">
                <span className="text-[#F2CF43]">𝕏</span> TWITTER RADAR
              </span>
              <span className="px-3 py-1 rounded-full bg-health-500 border-2 border-ink text-[10px] font-mono font-bold uppercase tracking-widest text-ink shadow-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-ink animate-pulse" />
                8 DISCOURSE CHANNELS LIVE
              </span>
              <span className="px-3 py-1 rounded-full bg-lilac-500 border-2 border-ink text-[10px] font-mono font-bold uppercase tracking-widest text-ink shadow-sm">
                VAST PAGES & MULTI-STREAM
              </span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-ink flex items-center gap-3">
              <div className="w-12 h-12 rounded-[18px] bg-[#1C192B] text-white border-2 border-ink flex items-center justify-center font-black text-2xl shadow-sm">
                𝕏
              </div>
              Twitter Viral Pulse & Resources
            </h1>

            <p className="mt-3 text-sm sm:text-base text-ink font-bold max-w-2xl bg-canvas p-4 rounded-[18px] border-2 border-ink shadow-sm">
              Live intelligence across Tech, Pop Culture, Memes, Breaking Wire, Macro Finance, and Indian Cultural Discourse. Featuring deep-dive threads, quote-tweet ratios, and verified directories.
            </p>
          </div>

          {/* Quick Metrics Badge Group */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
            <div className="p-3.5 bg-canvas rounded-[20px] border-2 border-ink shadow-sm text-center">
              <div className="text-[10px] font-mono font-black uppercase text-ink-muted">Tracked Posts</div>
              <div className="text-xl sm:text-2xl font-display font-black text-ink">
                {statsData?.tracked_tweets_24h ? formatNumber(statsData.tracked_tweets_24h) : "184.5K"}
              </div>
              <div className="text-[9px] font-bold text-health-700">▲ +14% vs avg</div>
            </div>

            <div className="p-3.5 bg-canvas rounded-[20px] border-2 border-ink shadow-sm text-center">
              <div className="text-[10px] font-mono font-black uppercase text-ink-muted">Top Trend</div>
              <div className="text-lg sm:text-xl font-display font-black text-ink truncate">
                {statsData?.top_trending_hashtag || "#GPT5"}
              </div>
              <div className="text-[9px] font-bold text-flame-700">Viral Velocity 96</div>
            </div>

            <div className="p-3.5 bg-canvas rounded-[20px] border-2 border-ink shadow-sm text-center col-span-2 sm:col-span-1">
              <div className="text-[10px] font-mono font-black uppercase text-ink-muted">Curated Directory</div>
              <div className="text-xl sm:text-2xl font-display font-black text-ink">60+ Handles</div>
              <div className="text-[9px] font-bold text-[#775E94]">6 Domain Sectors</div>
            </div>
          </div>
        </div>

        {/* ─── Navigation Tabs ───────────────────────────────────────────── */}
        <div className="mt-8 flex flex-wrap gap-2 border-t-2 border-ink/15 pt-5">
          {[
            { id: "feed", label: "🔥 Live Viral Feed", count: tweets.length > 0 ? `${feedData?.total || 180}` : undefined },
            { id: "trends", label: "📈 Trending Hashtags", count: "12" },
            { id: "threads", label: "🧵 Deep Reads & Threads", count: "4" },
            { id: "ratios", label: "💬 Quote-Tweet Ratios", count: "3" },
            { id: "resources", label: "📚 Curated Accounts & RSS", count: "60+" },
            { id: "slang", label: "⚡ Gen-Z Slang Decoder", count: "8" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setCurrentPage(1);
              }}
              className={cn(
                "px-4 py-2.5 rounded-[16px] text-xs font-black uppercase tracking-wider transition-all duration-200 border-2 shadow-sm flex items-center gap-2",
                activeTab === tab.id
                  ? "bg-[#1C192B] text-white border-ink translate-y-[-1px] shadow-card"
                  : "bg-surface hover:bg-lilac-200 text-ink border-ink hover:translate-y-[-1px]"
              )}
            >
              <span>{tab.label}</span>
              {tab.count && (
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-mono font-bold",
                    activeTab === tab.id ? "bg-signal-500 text-ink" : "bg-canvas text-ink"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ─── TAB 1: LIVE VIRAL FEED ───────────────────────────────────────── */}
      {activeTab === "feed" && (
        <div className="space-y-6">
          {/* Controls Bar: Category Pills + Search + Sort + Toggles */}
          <div className="p-6 bg-surface/90 backdrop-blur-xl rounded-[28px] border-2 border-ink shadow-card space-y-5">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-2">
              {TWEET_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wide border-2 transition-all flex items-center gap-1.5 shadow-sm",
                    selectedCategory === cat.id
                      ? "bg-signal-500 text-ink border-ink font-black scale-105"
                      : "bg-canvas text-ink-muted border-ink/40 hover:border-ink hover:text-ink hover:bg-lilac-100"
                  )}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Search, Sort, Filter Tools */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-2 border-t-2 border-ink/10">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
                <input
                  type="text"
                  placeholder="Search tweets, #hashtags, @handles..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-canvas rounded-[16px] border-2 border-ink text-xs font-bold text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-lilac-500 shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                  >
                    <CloseIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Sort Dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3.5 py-2 bg-canvas rounded-[16px] border-2 border-ink text-xs font-black uppercase text-ink focus:outline-none shadow-sm cursor-pointer"
                >
                  <option value="viral">🔥 Most Viral</option>
                  <option value="latest">⏱ Latest First</option>
                  <option value="engagement">📈 Engagement</option>
                  <option value="quotes">💬 Most Quoted</option>
                </select>

                {/* Verified Toggle */}
                <button
                  onClick={() => setVerifiedOnly(!verifiedOnly)}
                  className={cn(
                    "px-3 py-2 rounded-[16px] text-xs font-bold border-2 transition-all flex items-center gap-1.5 shadow-sm",
                    verifiedOnly
                      ? "bg-lilac-500 text-ink border-ink font-black"
                      : "bg-canvas text-ink-muted border-ink/40 hover:border-ink"
                  )}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified Only</span>
                </button>

                {/* Media Toggle */}
                <button
                  onClick={() => setMediaOnly(!mediaOnly)}
                  className={cn(
                    "px-3 py-2 rounded-[16px] text-xs font-bold border-2 transition-all flex items-center gap-1.5 shadow-sm",
                    mediaOnly
                      ? "bg-lilac-500 text-ink border-ink font-black"
                      : "bg-canvas text-ink-muted border-ink/40 hover:border-ink"
                  )}
                >
                  <span>🖼 Media Only</span>
                </button>

                <Button
                  onClick={() => refetchFeed()}
                  variant="outline"
                  size="sm"
                  className="bg-canvas border-2 border-ink rounded-[16px] text-xs font-black uppercase tracking-wider hover:bg-lilac-200"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Feed Content Grid */}
          {feedLoading ? (
            <div className="p-12 text-center bg-surface/90 rounded-[28px] border-2 border-ink">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-ink-muted mb-3" />
              <p className="font-display font-black text-sm uppercase text-ink">Syncing 𝕏 Timeline Firehose...</p>
            </div>
          ) : tweets.length === 0 ? (
            <div className="p-12 text-center bg-surface/90 rounded-[28px] border-2 border-ink">
              <MessageSquare className="w-10 h-10 mx-auto text-ink-muted mb-3" />
              <h3 className="font-display font-black text-lg text-ink uppercase">No Tweets Matched Your Filter</h3>
              <p className="text-xs font-bold text-ink-muted mt-1 max-w-sm mx-auto">
                Try widening your category, clearing your search query, or unchecking the verified filter.
              </p>
              <Button
                onClick={() => {
                  setSelectedCategory("all");
                  setSearchQuery("");
                  setVerifiedOnly(false);
                  setMediaOnly(false);
                }}
                className="mt-4 bg-[#1C192B] text-white border-2 border-ink text-xs font-black uppercase"
              >
                Reset All Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tweets.map((tweet) => {
                const isLiked = !!likedTweets[tweet.id];
                const isBookmarked = !!bookmarkedTweets[tweet.id];
                const likeCount = tweet.stats.likes + (isLiked ? 1 : 0);
                const bookmarkCount = tweet.stats.bookmarks + (isBookmarked ? 1 : 0);

                return (
                  <Card
                    key={tweet.id}
                    className="flex flex-col justify-between rounded-[28px] border-2 border-ink p-5 bg-surface/95 backdrop-blur-xl shadow-card hover:shadow-raised hover:-translate-y-1 transition-all duration-200 relative group overflow-hidden"
                  >
                    <div>
                      {/* Top Author Row */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={tweet.author.avatar}
                            alt={tweet.author.name}
                            className="w-11 h-11 rounded-full border-2 border-ink object-cover shrink-0 shadow-sm"
                            onError={(e) => {
                              (e.target as any).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";
                            }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-display font-black text-sm text-ink truncate">
                                {tweet.author.name}
                              </span>
                              {tweet.author.verified && (
                                <CheckCircle2 className="w-4 h-4 text-[#7C3AED] fill-[#C2B0D5] shrink-0" />
                              )}
                            </div>
                            <div className="text-xs font-mono font-bold text-ink-muted truncate">
                              @{tweet.author.handle} • {timeAgo(tweet.published_at)}
                            </div>
                          </div>
                        </div>

                        {/* Category & Sentiment Tag */}
                        <div className="flex flex-col items-end gap-1">
                          <span className="px-2 py-0.5 rounded-md bg-lilac-200 border border-ink text-[9px] font-mono font-black uppercase tracking-wider text-ink shadow-sm">
                            {tweet.category}
                          </span>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-md border text-[9px] font-mono font-bold uppercase",
                              tweet.sentiment.label === "Bullish" || tweet.sentiment.label === "Positive"
                                ? "bg-health-200 border-health-700 text-ink"
                                : tweet.sentiment.label === "Spicy" || tweet.sentiment.label === "Critical"
                                ? "bg-flame-200 border-flame-700 text-ink"
                                : "bg-canvas border-ink/30 text-ink-muted"
                            )}
                          >
                            {tweet.sentiment.label}
                          </span>
                        </div>
                      </div>

                      {/* Tweet Content */}
                      <p className="text-sm font-bold text-ink leading-relaxed whitespace-pre-wrap">
                        {tweet.text}
                      </p>

                      {/* Hashtags */}
                      {tweet.hashtags && tweet.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {tweet.hashtags.map((tag) => (
                            <button
                              key={tag}
                              onClick={() => {
                                setSearchQuery(tag);
                                setCurrentPage(1);
                              }}
                              className="text-[11px] font-mono font-bold text-[#775E94] hover:underline hover:text-ink transition-colors"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Attached Media Preview */}
                      {tweet.image_url && (
                        <div className="mt-3.5 rounded-[18px] overflow-hidden border-2 border-ink shadow-sm bg-canvas">
                          <img
                            src={tweet.image_url}
                            alt="Tweet media attachment"
                            className="w-full h-44 object-cover hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>
                      )}

                      {/* Embedded Quoted Tweet Preview */}
                      {tweet.quoted_tweet && (
                        <div className="mt-3.5 p-3 rounded-[16px] border-2 border-ink/40 bg-canvas/70 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-mono font-black text-ink">
                            <span>@{tweet.quoted_tweet.author.handle}</span>
                            <span className="text-[10px] text-ink-muted">quoted</span>
                          </div>
                          <p className="text-xs font-medium text-ink-muted italic">
                            "{tweet.quoted_tweet.text}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action & Stats Row */}
                    <div className="mt-4 pt-3.5 border-t-2 border-ink/10 flex items-center justify-between text-xs font-mono font-bold text-ink-muted">
                      {/* Replies */}
                      <div className="flex items-center gap-1 hover:text-ink cursor-pointer">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{formatNumber(tweet.stats.replies)}</span>
                      </div>

                      {/* Retweets */}
                      <div className="flex items-center gap-1 hover:text-emerald-700 cursor-pointer">
                        <Repeat2 className="w-3.5 h-3.5" />
                        <span>{formatNumber(tweet.stats.retweets)}</span>
                      </div>

                      {/* Likes (Interactive Toggle) */}
                      <button
                        onClick={() => toggleLike(tweet.id)}
                        className={cn(
                          "flex items-center gap-1 transition-colors cursor-pointer",
                          isLiked ? "text-flame-600 font-black" : "hover:text-flame-600"
                        )}
                      >
                        <Heart className={cn("w-3.5 h-3.5", isLiked && "fill-flame-500 text-flame-600")} />
                        <span>{formatNumber(likeCount)}</span>
                      </button>

                      {/* Bookmarks (Interactive Toggle) */}
                      <button
                        onClick={() => toggleBookmark(tweet.id)}
                        className={cn(
                          "flex items-center gap-1 transition-colors cursor-pointer",
                          isBookmarked ? "text-signal-700 font-black" : "hover:text-signal-700"
                        )}
                      >
                        <Bookmark className={cn("w-3.5 h-3.5", isBookmarked && "fill-signal-500 text-signal-700")} />
                        <span>{formatNumber(bookmarkCount)}</span>
                      </button>

                      {/* Copy Link & External Link */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(tweet.url, tweet.id)}
                          title="Copy Link to Tweet"
                          className="hover:text-ink text-ink-muted transition-colors"
                        >
                          {copiedId === tweet.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <a
                          href={tweet.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open Live on 𝕏"
                          className="hover:text-ink text-ink-muted transition-colors"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* ─── Vast Pagination Controls ──────────────────────────────────── */}
          <div className="p-5 bg-surface/90 rounded-[28px] border-2 border-ink shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs font-mono font-bold text-ink">
              Showing Page <span className="font-black text-ink">{currentPage}</span> of{" "}
              <span className="font-black text-ink">{totalPages}</span> ({feedData?.total || 0} total posts)
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="bg-canvas border-2 border-ink rounded-[14px] text-xs font-black uppercase disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>

              {/* Numbered Page Buttons */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    pageNum = Math.min(totalPages - 4 + i, currentPage - 2 + i);
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "w-8 h-8 rounded-[12px] font-mono text-xs font-black border-2 transition-all",
                        currentPage === pageNum
                          ? "bg-[#1C192B] text-white border-ink shadow-sm"
                          : "bg-canvas text-ink border-ink/40 hover:border-ink hover:bg-lilac-200"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="bg-canvas border-2 border-ink rounded-[14px] text-xs font-black uppercase disabled:opacity-40"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-ink-muted">Items per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 bg-canvas rounded-[12px] border-2 border-ink text-xs font-mono font-bold text-ink cursor-pointer"
              >
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={36}>36</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: TRENDING HASHTAGS & TOPICS ────────────────────────────── */}
      {activeTab === "trends" && (
        <div className="space-y-6">
          <div className="p-6 bg-surface/90 rounded-[28px] border-2 border-ink shadow-card flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-black uppercase tracking-tight text-ink flex items-center gap-2">
                <Flame className="w-6 h-6 text-flame-600" />
                Live Top 12 Trending Topics & Velocity
              </h2>
              <p className="text-xs font-bold text-ink-muted mt-1">
                Real-time post velocity, acceleration multipliers, and top quote-tweets driving the discourse.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-signal-500 border-2 border-ink text-[10px] font-mono font-black uppercase text-ink shadow-sm">
              HOURLY REFRESH
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {trendsData?.trends?.map((item: TrendingTopic) => (
              <Card
                key={item.rank}
                className="p-5 rounded-[26px] border-2 border-ink bg-surface/95 shadow-card hover:shadow-raised hover:-translate-y-1 transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-[12px] bg-[#1C192B] text-white border-2 border-ink font-mono font-black text-xs flex items-center justify-center shadow-sm">
                      #{item.rank}
                    </span>
                    <div>
                      <h3 className="font-display font-black text-lg text-ink hover:text-[#7C3AED] transition-colors">
                        {item.hashtag}
                      </h3>
                      <span className="text-[10px] font-mono font-bold uppercase text-ink-muted">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-flame-200 border border-ink text-[10px] font-mono font-black text-ink">
                    {item.velocity}
                  </span>
                </div>

                <div className="p-3 rounded-[16px] bg-canvas border-2 border-ink/20 text-xs font-bold text-ink">
                  {item.summary}
                </div>

                <div className="p-2.5 rounded-[14px] bg-lilac-100/60 border border-ink/20 text-[11px] font-medium text-ink-muted italic">
                  "{item.top_quote}"
                </div>

                <div className="pt-2 border-t-2 border-ink/10 flex items-center justify-between text-xs font-mono font-bold">
                  <span className="text-ink font-black">{item.volume}</span>
                  <button
                    onClick={() => jumpToTrendTopic(item.hashtag)}
                    className="text-xs font-black uppercase text-ink hover:text-lilac-700 flex items-center gap-1 group"
                  >
                    <span>View Feed</span>
                    <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 3: VIRAL DEEP-DIVE THREADS ───────────────────────────────── */}
      {activeTab === "threads" && (
        <div className="space-y-6">
          <div className="p-6 bg-surface/90 rounded-[28px] border-2 border-ink shadow-card">
            <h2 className="font-display text-2xl font-black uppercase tracking-tight text-ink flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-[#7C3AED]" />
              Curated Long-form Multi-Tweet Threads
            </h2>
            <p className="text-xs font-bold text-ink-muted mt-1">
              High-value engineering breakdowns, startup retrospective investigations, and cultural deep dives.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {threadsData?.threads?.map((thread: ViralThread) => (
              <Card
                key={thread.id}
                className="p-6 rounded-[28px] border-2 border-ink bg-surface/95 shadow-card hover:shadow-raised transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-lilac-500 border-2 border-ink text-[10px] font-mono font-black uppercase tracking-wider text-ink shadow-sm">
                      {thread.category}
                    </span>
                    <span className="text-xs font-mono font-bold text-ink-muted">
                      {thread.read_time} • {thread.tweets.length} Tweets
                    </span>
                  </div>

                  <h3 className="font-display font-black text-xl text-ink leading-snug">
                    {thread.title}
                  </h3>

                  {/* Author Card */}
                  <div className="flex items-center gap-3 p-3 rounded-[18px] bg-canvas border-2 border-ink/30">
                    <img
                      src={thread.author.avatar}
                      alt={thread.author.name}
                      className="w-10 h-10 rounded-full border-2 border-ink object-cover"
                    />
                    <div>
                      <div className="font-display font-black text-xs text-ink flex items-center gap-1">
                        <span>{thread.author.name}</span>
                        {thread.author.verified && <CheckCircle2 className="w-3.5 h-3.5 text-[#7C3AED]" />}
                      </div>
                      <div className="text-[10px] font-mono text-ink-muted">@{thread.author.handle}</div>
                    </div>
                    <div className="ml-auto text-right text-[10px] font-mono font-bold text-ink">
                      🔖 {formatNumber(thread.bookmarks)} saves
                    </div>
                  </div>

                  {/* Snippet of Tweet 1 & 2 */}
                  <div className="space-y-2 text-xs font-bold text-ink/90 bg-white/50 p-4 rounded-[18px] border border-ink/20">
                    <p className="line-clamp-2">{thread.tweets[0]}</p>
                    <p className="line-clamp-2 text-ink-muted">{thread.tweets[1]}</p>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t-2 border-ink/15 flex items-center justify-between">
                  <Button
                    onClick={() => setSelectedThread(thread)}
                    className="w-full bg-[#1C192B] hover:bg-[#342D4C] text-white border-2 border-ink rounded-[16px] text-xs font-black uppercase tracking-wider shadow-sm flex items-center justify-center gap-2"
                  >
                    <span>Read Full Thread ({thread.tweets.length} Tweets)</span>
                    <ArrowUpRight className="w-4 h-4 text-signal-500" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Modal / Expanded Reader for Selected Thread */}
          {selectedThread && (
            <div className="fixed inset-0 z-50 bg-[#1C192B]/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-surface rounded-[32px] border-2 border-ink max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl relative">
                <div className="flex items-center justify-between border-b-2 border-ink/15 pb-4">
                  <div>
                    <span className="text-[10px] font-mono font-black uppercase text-ink-muted">
                      Thread Reader Mode
                    </span>
                    <h3 className="font-display font-black text-xl text-ink">{selectedThread.title}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedThread(null)}
                    className="p-2 rounded-full border-2 border-ink bg-canvas hover:bg-lilac-200 transition-colors"
                  >
                    <CloseIcon className="w-5 h-5 text-ink" />
                  </button>
                </div>

                <div className="space-y-4">
                  {selectedThread.tweets.map((tweetText, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-[20px] bg-canvas border-2 border-ink shadow-sm relative pl-12"
                    >
                      <span className="absolute left-3 top-4 w-6 h-6 rounded-full bg-[#1C192B] text-white text-[10px] font-mono font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <p className="text-sm font-bold text-ink leading-relaxed">{tweetText}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t-2 border-ink/15 flex justify-end">
                  <Button
                    onClick={() => setSelectedThread(null)}
                    className="bg-[#1C192B] text-white border-2 border-ink rounded-[16px] text-xs font-black uppercase"
                  >
                    Close Reader
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 4: QUOTE-TWEET & RATIO ARENA ─────────────────────────────── */}
      {activeTab === "ratios" && (
        <div className="space-y-6">
          <div className="p-6 bg-surface/90 rounded-[28px] border-2 border-ink shadow-card">
            <h2 className="font-display text-2xl font-black uppercase tracking-tight text-ink flex items-center gap-2">
              <MessageCircleQuestion className="w-6 h-6 text-flame-600" />
              Quote-Tweet Ratios & Hot Take Breakdown
            </h2>
            <p className="text-xs font-bold text-ink-muted mt-1">
              When quote-tweets heavily outpace likes, signifying massive audience disagreement and community roasting.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {ratiosData?.ratios?.map((item: ViralRatio) => (
              <Card
                key={item.id}
                className="p-6 rounded-[28px] border-2 border-ink bg-surface/95 shadow-card space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-flame-500 border-2 border-ink text-[10px] font-mono font-black uppercase text-ink shadow-sm">
                    {item.ratio_multiple}
                  </span>
                  <span className="text-[10px] font-mono font-black uppercase text-ink-muted">
                    {item.verdict}
                  </span>
                </div>

                {/* Original Hot Take */}
                <div className="p-4 rounded-[20px] bg-canvas border-2 border-ink space-y-2">
                  <div className="flex items-center gap-2">
                    <img
                      src={item.author.avatar}
                      alt={item.author.name}
                      className="w-7 h-7 rounded-full border border-ink object-cover"
                    />
                    <span className="text-xs font-display font-black text-ink">{item.author.name}</span>
                    <span className="text-[10px] font-mono text-ink-muted">@{item.author.handle}</span>
                  </div>
                  <p className="text-xs font-bold text-ink italic leading-relaxed">"{item.tweet}"</p>
                  <div className="pt-2 border-t border-ink/20 flex justify-between text-[10px] font-mono font-bold text-ink-muted">
                    <span>❤️ {formatNumber(item.likes)} Likes</span>
                    <span className="text-flame-700 font-black">💬 {formatNumber(item.quotes)} Quotes</span>
                  </div>
                </div>

                {/* Counter Quote Tweets */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider text-ink-muted">
                    Top Counter-Ratios & Roasts
                  </span>
                  {item.counter_tweets.map((c, cIdx) => (
                    <div
                      key={cIdx}
                      className="p-3 rounded-[16px] bg-lilac-100/60 border border-ink/20 text-xs font-medium text-ink space-y-1"
                    >
                      <span className="font-mono font-black text-[11px] text-[#7C3AED] block">
                        {c.author}
                      </span>
                      <p>{c.text}</p>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 5: CURATED RESOURCES & DIRECTORY ─────────────────────────── */}
      {activeTab === "resources" && (
        <div className="space-y-6">
          <div className="p-6 bg-surface/90 rounded-[28px] border-2 border-ink shadow-card">
            <h2 className="font-display text-2xl font-black uppercase tracking-tight text-ink flex items-center gap-2">
              <Users className="w-6 h-6 text-signal-600" />
              Curated Twitter Resource Directory & RSS Streams
            </h2>
            <p className="text-xs font-bold text-ink-muted mt-1">
              60+ verified handles, AI pioneers, breaking OSINT wires, meme archives, and open Nitter syndication instances.
            </p>
          </div>

          <div className="space-y-8">
            {resourcesData?.directories?.map((category: ResourceCategory, idx: number) => (
              <div key={idx} className="space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className="font-display font-black text-lg uppercase tracking-wide text-ink">
                    {category.category}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-canvas border border-ink text-[10px] font-mono font-bold text-ink">
                    {category.items.length} Resources
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.items.map((item: ResourceItem, iIdx: number) => (
                    <Card
                      key={iIdx}
                      className="p-4 rounded-[22px] border-2 border-ink bg-surface/95 shadow-sm hover:shadow-card hover:-translate-y-0.5 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-display font-black text-sm text-ink flex items-center gap-1.5">
                              <span>{item.name}</span>
                              {item.verified && <CheckCircle2 className="w-3.5 h-3.5 text-[#7C3AED]" />}
                            </div>
                            <span className="text-xs font-mono font-bold text-[#775E94]">{item.handle}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-canvas border border-ink/40 text-[9px] font-mono font-bold text-ink">
                            {item.followers}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-ink-muted leading-relaxed">{item.desc}</p>

                        <div className="flex flex-wrap gap-1 pt-1">
                          {item.tags?.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded bg-lilac-100 text-[9px] font-mono font-bold text-ink border border-ink/20"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-ink/15 flex items-center justify-between">
                        <button
                          onClick={() => copyToClipboard(item.handle, `h_${idx}_${iIdx}`)}
                          className="text-[11px] font-mono font-bold text-ink hover:text-lilac-700 flex items-center gap-1"
                        >
                          {copiedId === `h_${idx}_${iIdx}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>Copy Handle</span>
                        </button>

                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-black uppercase text-ink hover:text-[#7C3AED] flex items-center gap-1"
                        >
                          <span>Open Live</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 6: GEN-Z SLANG & DISCOURSE DECODER ──────────────────────── */}
      {activeTab === "slang" && (
        <div className="space-y-6">
          <div className="p-6 bg-surface/90 rounded-[28px] border-2 border-ink shadow-card">
            <h2 className="font-display text-2xl font-black uppercase tracking-tight text-ink flex items-center gap-2">
              <Zap className="w-6 h-6 text-signal-600" />
              Gen-Z Twitter Slang & Discourse Decoder
            </h2>
            <p className="text-xs font-bold text-ink-muted mt-1">
              Decoding the latest jargon, momentum indices, and timeline examples driving modern social sentiment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {slangData?.slang?.map((item: SlangItem, idx: number) => (
              <Card
                key={idx}
                className="p-5 rounded-[24px] border-2 border-ink bg-surface/95 shadow-card space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-black text-lg text-ink">"{item.term}"</h3>
                  <span className="px-2 py-0.5 rounded-full bg-signal-500 border border-ink text-[9px] font-mono font-black uppercase text-ink">
                    {item.status}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-ink-muted">Momentum Index:</span>
                  <div className="flex-1 bg-canvas h-2 rounded-full overflow-hidden border border-ink/30">
                    <div
                      className="bg-[#7C3AED] h-full rounded-full"
                      style={{ width: `${item.momentum}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono font-black text-ink">{item.momentum}%</span>
                </div>

                <p className="text-xs font-bold text-ink leading-relaxed">{item.meaning}</p>

                <div className="p-3 rounded-[16px] bg-canvas border border-ink/20 text-[11px] font-mono font-bold text-[#775E94]">
                  💡 {item.example}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "react-router-dom";
import { apiClient } from "@/lib/api/client";
import { usePreferencesStore } from "@/store/preferencesStore";
import { useAuthStore } from "@/store/authStore";
import {
  ArrowUp,
  MessageSquare,
  ExternalLink,
  Award,
  Flame,
  Sparkles,
  Crown,
  TrendingUp,
  Image as ImageIcon,
  RefreshCw,
  Repeat2,
  Heart,
  ThumbsUp,
  X as CloseIcon,
  Share2,
  Check,
  Play,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemePost {
  id: string;
  title: string;
  subreddit: string;
  author: string;
  platform?: "x" | "youtube" | "reddit" | "instagram";
  source?: string;
  upvotes: number;
  upvote_ratio: number;
  num_comments: number;
  created_utc: string;
  url: string;
  image_url: string | null;
  thumbnail: string | null;
  flair: string | null;
  is_video: boolean;
  awards: number;
  crosspost_count: number;
}

interface MemesResponse {
  posts: MemePost[];
  subreddit: string;
  platform?: string;
  source: string;
  sort?: string;
  error?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORM_FILTERS = [
  { id: "all", label: "🔥 All Feeds", desc: "Cross-Platform Mix" },
  { id: "x", label: "𝕏 Twitter / X", desc: "Viral Tweets & Ratios" },
  { id: "youtube", label: "▶ YouTube Comments", desc: "Top Community Roasts" },
  { id: "reddit", label: "👾 Reddit", desc: "Meme Subreddits" },
];

const SORT_OPTIONS = [
  { id: "hot", label: "Hot", icon: Flame, color: "text-flame-600" },
  { id: "new", label: "New", icon: Sparkles, color: "text-lilac-700" },
  { id: "top", label: "Top", icon: Crown, color: "text-signal-600" },
  { id: "rising", label: "Rising", icon: TrendingUp, color: "text-health-600" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatUpvotes(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function timeAgo(iso?: string | null): string {
  if (!iso) return "recently";
  const date = new Date(iso);
  const time = date.getTime();
  if (isNaN(time)) return "recently";

  const diff = Math.max(0, (Date.now() - time) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function getPostPlatform(post: MemePost): "x" | "youtube" | "reddit" | "instagram" {
  if (post.platform) return post.platform;
  if (post.url?.includes("x.com") || post.url?.includes("twitter.com") || post.id?.startsWith("x_") || post.subreddit?.includes("𝕏")) {
    return "x";
  }
  if (post.url?.includes("youtube.com") || post.id?.startsWith("yt_") || post.subreddit?.includes("YouTube")) {
    return "youtube";
  }
  if (post.flair === "Instagram" || post.subreddit?.startsWith("#") || post.subreddit?.startsWith("@")) {
    return "instagram";
  }
  return "reddit";
}

function getRespectedUrl(post: MemePost): string {
  const platform = getPostPlatform(post);

  if (platform === "x") {
    if (post.url && (post.url.startsWith("https://") || post.url.startsWith("http://"))) {
      if (post.url.includes("/status/")) {
        const parts = post.url.split("/status/");
        const authorPart = parts[0].replace("https://x.com/", "").replace("https://twitter.com/", "").trim();
        if (authorPart && parts[1] && (parts[1].length > 15 || parts[1].includes("undefined"))) {
          return `https://x.com/${authorPart.replace(/^@/, "")}`;
        }
      }
      return post.url;
    }
    const cleanAuthor = post.author ? post.author.replace(/^@/, "").trim() : "peakbengaluru";
    return `https://x.com/${cleanAuthor}`;
  }

  if (platform === "youtube") {
    // 1. If backend provided a direct YouTube video URL, use it
    if (post.url && (post.url.startsWith("https://www.youtube.com/") || post.url.startsWith("https://youtu.be/"))) {
      return post.url;
    }
    // 2. If author handle is present, link directly to verified YouTube channel
    const cleanAuthor = post.author ? post.author.replace(/^@/, "").trim() : "";
    if (cleanAuthor) {
      return `https://www.youtube.com/@${cleanAuthor}`;
    }
    // 3. Fallback: Search the video roast topic on YouTube
    const cleanTopic = post.title.replace(/^[^:]+:\s*['"]?/, "").replace(/['"]?\s*$/, "").trim();
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTopic || post.title)}`;
  }

  if (platform === "instagram") {
    if (post.url && post.url.startsWith("https://instagram.com") && !post.url.includes("dummy")) return post.url;
    return "https://www.instagram.com/explore/tags/tamilmemes/";
  }

  // Reddit
  if (post.url && (post.url.startsWith("https://redd.it/") || post.url.startsWith("https://reddit.com/") || post.url.startsWith("https://www.reddit.com/"))) {
    return post.url;
  }
  const sub = post.subreddit ? post.subreddit.replace(/^r\//, "").trim() : "CricketShitpost";
  return `https://www.reddit.com/r/${sub}/hot/`;
}


// ─── Modal: Direct Post & Highlighted Comment View ────────────────────────────

function PostDetailModal({
  post,
  onClose,
}: {
  post: MemePost | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!post) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [post, onClose]);

  if (!post) return null;

  const platform = getPostPlatform(post);
  const destinationUrl = getRespectedUrl(post);

  const handleCopy = () => {
    navigator.clipboard.writeText(destinationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-[#1C192B] text-white border-2 border-white/25 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar with close button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2">
            {platform === "x" && (
              <span className="px-3 py-1 rounded-full bg-white/15 text-white border border-white/25 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                𝕏 Direct Twitter Post
              </span>
            )}
            {platform === "youtube" && (
              <span className="px-3 py-1 rounded-full bg-flame-500 text-ink border border-ink text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                ▶ YouTube Highlighted Comment
              </span>
            )}
            {platform === "reddit" && (
              <span className="px-3 py-1 rounded-full bg-lilac-500 text-ink border border-ink text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                👾 Reddit Thread & Discussion
              </span>
            )}
            {platform === "instagram" && (
              <span className="px-3 py-1 rounded-full bg-signal-500 text-ink border border-ink text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                📸 Instagram Post
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/15 border border-white/25 flex items-center justify-center text-white hover:bg-white hover:text-ink transition-colors cursor-pointer"
            title="Close"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-5">
          {/* 1. TWITTER / 𝕏 POST VIEW */}
          {platform === "x" && (
            <div className="space-y-4">
              {/* Author Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 border border-white/30 text-white font-black text-lg flex items-center justify-center shadow-sm">
                    {post.author.replace("@", "").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-black text-white">{post.author.replace("@", "")}</span>
                      <span className="w-4 h-4 rounded-full bg-[#1D9BF0] text-white text-[10px] font-black inline-flex items-center justify-center shadow-sm">✓</span>
                    </div>
                    <span className="text-xs font-bold text-white/60">@{post.author.replace("@", "")}</span>
                  </div>
                </div>
                <span className="text-2xl font-black text-white/90">𝕏</span>
              </div>

              {/* Tweet Body - HIGH CONTRAST WHITE */}
              <p className="text-lg sm:text-xl font-bold text-white leading-relaxed font-sans">
                {post.title}
              </p>

              {/* Tweet Media */}
              {post.image_url && (
                <div className="rounded-[20px] overflow-hidden border border-white/20 shadow-md max-h-80 bg-black/40">
                  <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Timestamp & Views */}
              <div className="text-xs font-semibold text-white/60 pt-2 border-t border-white/10 flex items-center gap-2">
                <span>{timeAgo(post.created_utc)}</span>
                <span>·</span>
                <span className="font-bold text-white">1.4M Views</span>
              </div>

              {/* Metrics Bar */}
              <div className="flex items-center justify-around py-3 border-y border-white/10 text-xs font-black text-white">
                <span className="flex items-center gap-1.5 text-rose-400">
                  <Heart className="w-4 h-4 fill-rose-500 text-rose-500" /> {formatUpvotes(post.upvotes)} Likes
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Repeat2 className="w-4 h-4" /> {post.crosspost_count || 68} Reposts
                </span>
                <span className="flex items-center gap-1.5 text-sky-300">
                  <MessageSquare className="w-4 h-4" /> {post.num_comments} Replies
                </span>
              </div>
            </div>
          )}

          {/* 2. YOUTUBE HIGHLIGHTED COMMENT & VIDEO THUMBNAIL VIEW */}
          {platform === "youtube" && (
            <div className="space-y-4">
              {/* YouTube Video / Community Post Thumbnail */}
              {post.image_url && (
                <div className="relative aspect-video w-full rounded-[24px] overflow-hidden border-2 border-white/20 bg-black/60 shadow-xl group">
                  <img
                    src={post.image_url}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-center justify-center">
                    <a
                      href={destinationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-2xl transition-transform hover:scale-110 cursor-pointer"
                      title="Play on YouTube"
                    >
                      <Play className="w-6 h-6 fill-white ml-1" />
                    </a>
                  </div>
                  <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs font-bold text-white/90">
                    <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-sm border border-white/20 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Source Video / Community
                    </span>
                    <a
                      href={destinationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 rounded-full bg-red-600 hover:bg-red-500 text-white font-black uppercase text-[10px] tracking-wider transition-colors flex items-center gap-1"
                    >
                      Watch on YouTube <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Sleek Rectangular Highlighted Comment Box */}
              <div className="p-6 rounded-[24px] bg-[#14121F] border-2 border-white/20 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-300 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-300/30">
                    📌 PINNED COMMENT · HIGHLIGHTED
                  </span>
                  <span className="text-xs font-bold text-white/50">YouTube Community Roast</span>
                </div>

                <div className="flex items-start gap-4 pt-1">
                  <div className="w-12 h-12 rounded-full bg-red-600 border-2 border-white/40 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-md">
                    {post.author.replace("@", "").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white">@{post.author.replace("@", "")}</span>
                      <span className="text-xs font-semibold text-white/60">{timeAgo(post.created_utc)}</span>
                    </div>
                    {/* Comment text - HIGH CONTRAST WHITE */}
                    <p className="text-lg sm:text-xl font-bold text-white leading-relaxed mt-2.5 font-sans">
                      "{post.title}"
                    </p>
                    <div className="flex items-center gap-4 mt-4 text-xs font-black text-white">
                      <span className="flex items-center gap-1.5 text-amber-300 bg-white/10 px-3 py-1.5 rounded-full border border-white/20">
                        <ThumbsUp className="w-4 h-4" /> {formatUpvotes(post.upvotes)} Likes
                      </span>
                      <span className="text-white/80 flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full border border-white/20">
                        <MessageSquare className="w-4 h-4 text-sky-300" /> {post.num_comments} Replies
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. REDDIT THREAD VIEW */}
          {platform === "reddit" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-black">
                <span className="px-2.5 py-0.5 rounded-full bg-[#FF4500] border border-white/20 text-white">
                  {post.subreddit}
                </span>
                <span className="text-white/60">Posted by {post.author.startsWith("u/") ? "" : "u/"}{post.author} · {timeAgo(post.created_utc)}</span>
              </div>

              {/* Title - HIGH CONTRAST WHITE */}
              <h2 className="text-xl font-black text-white leading-snug">
                {post.title}
              </h2>

              {post.image_url && (
                <div className="rounded-[20px] overflow-hidden border border-white/20 shadow-md max-h-80 bg-black/40">
                  <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex items-center gap-4 text-xs font-black text-white pt-2">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20">
                  <ArrowUp className="w-4 h-4 text-orange-400" /> {formatUpvotes(post.upvotes)} Upvotes
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20">
                  <MessageSquare className="w-4 h-4 text-sky-300" /> {post.num_comments} Comments
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-t border-white/10 bg-white/5">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 border border-white/20 rounded-[14px] text-xs font-black uppercase tracking-wider text-white hover:bg-white/20 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            {copied ? "Link Copied!" : "Copy Direct Link"}
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {platform === "x" && (
              <a
                href={`https://x.com/search?q=${encodeURIComponent(post.title)}&f=live`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white/10 border border-white/25 rounded-[14px] text-xs font-bold uppercase tracking-wider text-white/90 hover:bg-white/20 transition-colors"
                title="Search live quote tweets & discussions for this topic on X"
              >
                Search Topic on 𝕏 <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {platform === "youtube" ? (
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                    post.title.replace(/^[^:]+:\s*['"]?/, "").replace(/['"]?\s*$/, "").trim() || post.title
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-white/10 border border-white/25 rounded-[14px] text-xs font-bold uppercase tracking-wider text-white/90 hover:bg-white/20 transition-colors"
                  title="Search this video roast on YouTube"
                >
                  Search Video <ExternalLink className="w-3.5 h-3.5 text-red-400" />
                </a>

                <a
                  href={destinationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white border-2 border-red-500 rounded-[14px] text-xs font-black uppercase tracking-widest hover:bg-red-500 transition-all shadow-md hover:scale-[1.02]"
                  title="Open direct YouTube link in new tab"
                >
                  Open on YouTube ▶ <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-white text-[#1C192B] border-2 border-white rounded-[14px] text-xs font-black uppercase tracking-widest hover:bg-amber-300 hover:border-amber-300 transition-all shadow-md hover:scale-[1.02] cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <a
                href={destinationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-2.5 bg-white text-[#1C192B] border-2 border-white rounded-[14px] text-xs font-black uppercase tracking-widest hover:bg-amber-300 hover:border-amber-300 transition-all shadow-md hover:scale-[1.02]"
              >
                {platform === "x" && `Open @${post.author.replace(/^@/, "")} on 𝕏`}
                {platform === "reddit" && `Open ${post.subreddit} on Reddit`}
                {platform === "instagram" && "Open on Instagram"}
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex flex-col bg-surface/90 border-2 border-ink rounded-[24px] overflow-hidden animate-pulse shadow-card">
      <div className="h-48 bg-ink/10" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-ink/10 rounded-full w-3/4" />
        <div className="h-4 bg-ink/10 rounded-full w-1/2" />
        <div className="flex gap-2 pt-2">
          <div className="h-6 w-16 bg-ink/10 rounded-full" />
          <div className="h-6 w-16 bg-ink/10 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ─── Meme Card ────────────────────────────────────────────────────────────────

function MemeCard({ post, onSelect }: { post: MemePost; onSelect: (post: MemePost) => void }) {
  const [imgError, setImgError] = useState(false);
  const platform = getPostPlatform(post);
  const destinationUrl = getRespectedUrl(post);
  const cleanAuthor = post.author.replace(/^@/, "");

  // ── YouTube Comment: DEDICATED LANDSCAPE RECTANGLE CARD (No images, wide landscape aspect ratio, no split) ──
  if (platform === "youtube") {
    return (
      <div
        onClick={() => onSelect(post)}
        title={post.title}
        className="col-span-1 sm:col-span-2 lg:col-span-2 group flex flex-col justify-between bg-[#12111D] border-2 border-ink rounded-[24px] p-5 sm:p-6 shadow-card hover:shadow-raised hover:-translate-y-1 hover:-translate-x-0.5 transition-all duration-200 cursor-pointer overflow-hidden"
      >
        {/* 1. Header Bar: Aligned with top line of adjacent cards */}
        <div className="flex items-center justify-between gap-3 flex-wrap pb-3.5 border-b border-white/10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 text-xs font-black uppercase tracking-wider rounded-full bg-red-600 text-white border border-white/20 shadow-sm flex items-center gap-1.5">
              ▶ YouTube Comment
            </span>
            <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-amber-400/15 text-amber-300 border border-amber-300/30 flex items-center gap-1">
              📌 Pinned
            </span>
            {post.flair && (
              <span className="px-2.5 py-0.5 text-[10px] font-bold text-white/80 bg-white/10 rounded-full border border-white/15">
                {post.flair}
              </span>
            )}
          </div>
          <span className="text-xs font-semibold text-white/50">
            {timeAgo(post.created_utc)}
          </span>
        </div>

        {/* 2. Middle Body: Structured roast quote, thumbnail & author */}
        <div className="py-4">
          {post.image_url && !imgError ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Video Thumbnail Preview */}
              <div className="md:col-span-5 relative aspect-video rounded-2xl overflow-hidden border border-white/20 bg-black/60 shadow-md group/thumb">
                <img
                  src={post.image_url}
                  alt={post.title}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/25 flex items-center justify-center group-hover/thumb:bg-black/10 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover/thumb:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[9px] font-black text-white uppercase tracking-wider border border-white/20">
                  ▶ Video Source
                </div>
              </div>

              {/* Roast Quote & Author */}
              <div className="md:col-span-7 space-y-2.5">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-red-400">
                  <MessageSquare className="w-3.5 h-3.5" /> Highlighted Community Roast:
                </div>
                <p className="text-base sm:text-lg md:text-xl font-black text-white leading-snug font-sans line-clamp-3">
                  "{post.title}"
                </p>
                <div className="flex items-center gap-2 pt-1 text-xs font-semibold text-white/60">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-black inline-flex items-center justify-center shadow-sm">
                      {cleanAuthor.slice(0, 1).toUpperCase()}
                    </span>
                    @{cleanAuthor}
                  </span>
                  <span>·</span>
                  <span>Verified YouTube Roast</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-red-400">
                <MessageSquare className="w-3.5 h-3.5" /> Highlighted Community Roast:
              </div>
              <p className="text-lg sm:text-xl md:text-2xl font-black text-white leading-relaxed font-sans line-clamp-3">
                "{post.title}"
              </p>
              <div className="flex items-center gap-2 pt-1 text-xs font-semibold text-white/60">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-black inline-flex items-center justify-center shadow-sm">
                    {cleanAuthor.slice(0, 1).toUpperCase()}
                  </span>
                  @{cleanAuthor}
                </span>
                <span>·</span>
                <span>Verified YouTube Roast</span>
              </div>
            </div>
          )}
        </div>

        {/* 3. Footer Bar: Metrics bar neatly aligned with bottom row of adjacent cards */}
        <div className="mt-auto pt-3.5 border-t border-white/10 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs font-black text-white bg-white/10 px-3 py-1.5 rounded-full border border-white/15" title="Thumbs Up Likes">
              <ThumbsUp className="w-3.5 h-3.5 text-amber-300" />
              {formatUpvotes(post.upvotes)}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 px-3 py-1.5 rounded-full border border-white/15" title="Comments">
              <MessageSquare className="w-3.5 h-3.5 text-sky-300" />
              {post.num_comments}
            </span>
            {post.awards > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-white bg-white/10 px-2.5 py-1.5 rounded-full border border-white/15" title="Awards">
                <Award className="w-3.5 h-3.5 text-yellow-400" />
                {post.awards}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-300 bg-emerald-500/15 px-3 py-1.5 rounded-full border border-emerald-400/30">
              💬 IN-APP VIEW
            </span>
            <a
              href={destinationUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors hover:underline"
              title="Open direct on YouTube"
            >
              YouTube ▶ <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Standard Cards (Twitter, Reddit, Instagram): Single Column Portrait with Media Preview ──
  const badgeConfig = {
    x: {
      label: "𝕏 Post",
      badgeBg: "bg-[#1C192B] text-white border-ink",
      linkText: `𝕏 @${cleanAuthor}`,
      authorPrefix: post.author.startsWith("@") ? "" : "@",
    },
    reddit: {
      label: "👾 Reddit",
      badgeBg: "bg-lilac-500 text-ink border-ink",
      linkText: `${post.subreddit}`,
      authorPrefix: post.author.startsWith("u/") ? "" : "u/",
    },
    instagram: {
      label: "📸 Instagram",
      badgeBg: "bg-signal-500 text-ink border-ink",
      linkText: "INSTAGRAM 📸",
      authorPrefix: post.author.startsWith("@") ? "" : "@",
    },
  }[platform] || {
    label: "Post",
    badgeBg: "bg-surface text-ink border-ink",
    linkText: "Open",
    authorPrefix: "",
  };

  return (
    <div
      onClick={() => onSelect(post)}
      title={post.title}
      className="col-span-1 group flex flex-col bg-surface/90 backdrop-blur-xl border-2 border-ink rounded-[24px] overflow-hidden shadow-card hover:shadow-raised hover:-translate-y-1 hover:-translate-x-0.5 transition-all duration-200 cursor-pointer"
    >
      {/* Standard image area for X, Reddit, Instagram */}
      <div className="relative h-48 bg-canvas overflow-hidden border-b-2 border-ink">
        {post.image_url && !imgError ? (
          <img
            src={post.image_url}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-ink-muted">
            <ImageIcon className="w-10 h-10 opacity-30" />
            <span className="text-xs font-bold uppercase tracking-widest opacity-40">
              {post.is_video ? "🎬 Video" : "No Preview"}
            </span>
          </div>
        )}

        {/* Platform Origin Badge */}
        <span
          className={`absolute top-3 left-3 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full border-2 shadow-sm ${badgeConfig.badgeBg}`}
        >
          {badgeConfig.label}
        </span>

        {/* Flair badge */}
        {post.flair && (
          <span className="absolute top-3 right-3 px-2.5 py-0.5 bg-signal-500 text-ink text-[10px] font-black uppercase tracking-widest rounded-full border-2 border-ink shadow-sm">
            {post.flair}
          </span>
        )}

        {/* Video badge */}
        {post.is_video && (
          <span className="absolute bottom-3 right-3 px-2 py-0.5 bg-[#1C192B] text-white text-[10px] font-black uppercase rounded-full border border-ink">
            VIDEO
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-4 gap-3">
        <div className="space-y-1">
          {platform === "x" ? (
            <div className="bg-lilac-50 p-2.5 rounded-xl border-2 border-ink/20">
              <span className="text-[10px] font-black uppercase tracking-wider text-lilac-700 block mb-1">
                𝕏 Tweet & Quote Roast:
              </span>
              <p className="text-sm font-bold text-ink leading-snug line-clamp-3 group-hover:text-lilac-700 transition-colors">
                {post.title}
              </p>
            </div>
          ) : (
            <p className="text-sm font-bold text-ink leading-snug line-clamp-3 group-hover:text-lilac-700 transition-colors">
              {post.title}
            </p>
          )}
        </div>

        <p className="text-[11px] font-semibold text-ink-muted">
          {badgeConfig.authorPrefix}{post.author} · {timeAgo(post.created_utc)}
        </p>

        {/* Stats row */}
        <div className="mt-auto flex items-center justify-between flex-wrap gap-2 pt-3 border-t-2 border-ink/15">
          <div className="flex items-center gap-3">
            {platform === "x" ? (
              <span className="flex items-center gap-1 text-xs font-black text-flame-700" title="Likes">
                <Heart className="w-3.5 h-3.5 fill-flame-500 text-ink" />
                {formatUpvotes(post.upvotes)}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-black text-ink" title="Upvotes">
                <ArrowUp className="w-3.5 h-3.5" />
                {formatUpvotes(post.upvotes)}
              </span>
            )}

            {platform === "x" ? (
              <span className="flex items-center gap-1 text-xs font-bold text-health-700" title="Retweets">
                <Repeat2 className="w-3.5 h-3.5" />
                {post.crosspost_count}
              </span>
            ) : post.crosspost_count > 0 ? (
              <span className="flex items-center gap-1 text-xs font-bold text-health-700">
                <Repeat2 className="w-3.5 h-3.5" />
                {post.crosspost_count}
              </span>
            ) : null}

            <span className="flex items-center gap-1 text-xs font-bold text-ink-muted" title="Comments">
              <MessageSquare className="w-3.5 h-3.5" />
              {post.num_comments}
            </span>

            {post.awards > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold text-signal-700">
                <Award className="w-3.5 h-3.5" />
                {post.awards}
              </span>
            )}
          </div>

          <a
            href={destinationUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-ink-muted group-hover:text-ink transition-colors hover:underline"
          >
            {badgeConfig.linkText} <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function MemesPage() {
  const location = useLocation();
  const isAllIndia = location.pathname === "/all-india-memes";

  const { user } = useAuthStore();
  const { state: prefState, setStatePref } = usePreferencesStore();

  const userState =
    prefState && prefState !== "ALL"
      ? prefState
      : user && user.state && user.state !== "Uttar Pradesh"
      ? user.state
      : "Tamil Nadu";

  const activeState = isAllIndia ? "ALL" : userState;

  const [selectedPost, setSelectedPost] = useState<MemePost | null>(null);
  const [platform, setPlatform] = useState("all");
  const [sourceId, setSourceId] = useState("all");
  const [sort, setSort] = useState("hot");

  const { data: sourcesData } = useQuery({
    queryKey: ["meme_sources", activeState],
    queryFn: async () => {
      const stateParam = activeState !== "ALL" ? `?state=${encodeURIComponent(activeState)}` : "";
      const res = await apiClient.get(`/meme-sources/sources${stateParam}`);
      return res.data;
    },
  });

  const ALL_SOURCES = sourcesData?.sources || [];

  const FILTERED_SOURCES = ALL_SOURCES.filter((s: any) => {
    if (platform === "all") return true;
    if (platform === "x") return s.type === "x" || s.id === "all";
    if (platform === "youtube") return s.type === "youtube" || s.id === "all";
    if (platform === "reddit") return s.type === "reddit" || s.id === "all";
    return true;
  });

  useEffect(() => {
    setSourceId("all");
  }, [isAllIndia, platform, activeState]);

  useEffect(() => {
    if (FILTERED_SOURCES.length > 0) {
      const exists = FILTERED_SOURCES.some((s: any) => s.id === sourceId);
      if (!exists) {
        setSourceId("all");
      }
    }
  }, [FILTERED_SOURCES, sourceId]);

  const { data, isLoading, isFetching, refetch } = useQuery<MemesResponse>({
    queryKey: ["memes", sourceId, platform, sort, activeState],
    queryFn: async () => {
      const activeSub = ALL_SOURCES.find((s: any) => s.id === sourceId);

      if (activeSub?.type === "instagram") {
        const res = await apiClient.get(`/instagram/memes?hashtag=${sourceId}&limit=25`);
        return res.data;
      }
      if (activeSub?.type === "instagram_user") {
        const res = await apiClient.get(`/instagram/memes?username=${sourceId}&limit=25`);
        return res.data;
      }

      const params = new URLSearchParams();
      params.append("subreddit", sourceId || "all");
      params.append("platform", platform || "all");
      params.append("sort", sort);
      params.append("limit", "60");
      if (activeState && activeState !== "ALL") {
        params.append("state", activeState);
      } else {
        params.append("state", "ALL");
      }

      const res = await apiClient.get(`/memes?${params.toString()}`);
      return res.data;
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const posts = data?.posts ?? [];
  const isLive = true;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col gap-2 bg-surface/88 backdrop-blur-xl p-6 sm:p-8 rounded-[32px] border-2 border-ink shadow-card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full bg-lilac-500 border-2 border-ink text-[10px] font-mono font-bold uppercase tracking-widest text-ink shadow-sm">
                ✦ {isAllIndia ? "PAN-INDIA STREAM" : "REGIONAL STREAM"}
              </span>
              <span className="px-3 py-1 rounded-full bg-flame-500 border-2 border-ink text-[10px] font-mono font-bold uppercase tracking-widest text-ink shadow-sm">
                CULTURAL PULSE
              </span>
            </div>
            <h1 className="font-display font-black text-4xl sm:text-5xl uppercase tracking-tight text-ink flex items-center gap-3">
              <span className="inline-flex items-center justify-center px-3.5 py-2 rounded-[16px] border-2 border-ink bg-signal-500 text-ink font-black text-3xl shadow-sm">
                {isAllIndia ? "🇮🇳" : "🍿"}
              </span>
              <span className="text-ink">
                {isAllIndia ? "All India Memes" : `${userState} Memes`}
              </span>
            </h1>
            <p className="mt-2.5 text-sm font-bold uppercase tracking-widest text-ink-muted">
              {isAllIndia
                ? "Live humor & viral takes from 𝕏 (Twitter), YouTube Comments & Reddit across India 🇮🇳"
                : `Viral tweets, YouTube comment roast gold & Reddit memes tailored for ${userState} ✨`}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* View Switcher: My State vs In India */}
            <div className="flex items-center gap-1 bg-canvas border-2 border-ink rounded-[16px] p-1 shadow-sm">
              <Link
                to="/trending-memes"
                className={`px-3 py-1.5 rounded-[12px] text-xs font-black uppercase tracking-wider transition-all ${
                  !isAllIndia
                    ? "bg-[#1C192B] text-white shadow-sm"
                    : "text-ink-muted hover:text-ink hover:bg-surface"
                }`}
              >
                📍 {userState}
              </Link>
              <Link
                to="/all-india-memes"
                className={`px-3 py-1.5 rounded-[12px] text-xs font-black uppercase tracking-wider transition-all ${
                  isAllIndia
                    ? "bg-[#1C192B] text-white shadow-sm"
                    : "text-ink-muted hover:text-ink hover:bg-surface"
                }`}
              >
                🇮🇳 In India
              </Link>
            </div>

            {/* Quick State Switcher */}
            {!isAllIndia && (
              <select
                value={userState}
                onChange={(e) => {
                  setStatePref(e.target.value);
                  setSourceId("all");
                }}
                className="bg-canvas border-2 border-ink rounded-[16px] px-3 py-2 text-xs font-black uppercase tracking-wider text-ink shadow-sm cursor-pointer outline-none hover:bg-surface transition-colors"
                title="Select Regional State Stream"
              >
                {[
                  "Tamil Nadu",
                  "Maharashtra",
                  "Karnataka",
                  "Delhi",
                  "Kerala",
                  "Telangana",
                  "Gujarat",
                  "West Bengal",
                  "Uttar Pradesh",
                ].map((s) => (
                  <option key={s} value={s}>
                    📍 {s}
                  </option>
                ))}
              </select>
            )}

            {isLive ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-health-500 text-ink text-[11px] font-black uppercase tracking-widest rounded-full border-2 border-ink shadow-sm">
                <span className="w-2 h-2 rounded-full bg-ink animate-pulse" />
                Live Multi-Platform
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-signal-500 text-ink text-[11px] font-black uppercase tracking-widest rounded-full border-2 border-ink">
                Cached
              </span>
            )}

            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1C192B] text-white border-2 border-ink rounded-[12px] text-xs font-black uppercase tracking-widest hover:bg-[#342D4C] transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-signal-500 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── Platform Filter Bar ── */}
      <div className="flex flex-wrap gap-2.5 items-center p-3 bg-surface/88 backdrop-blur-xl border-2 border-ink rounded-[20px] shadow-card">
        <span className="text-xs font-black uppercase tracking-widest px-2 text-ink-muted">
          Platform:
        </span>
        {PLATFORM_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setPlatform(f.id)}
            className={`px-4 py-2 rounded-[14px] text-xs font-black uppercase tracking-wider border-2 transition-all flex items-center gap-2 ${
              platform === f.id
                ? "bg-[#1C192B] text-white border-ink shadow-sm scale-[1.02]"
                : "bg-canvas border-ink/30 text-ink-muted hover:border-ink hover:bg-lilac-200/50 hover:text-ink"
            }`}
          >
            <span>{f.label}</span>
          </button>
        ))}
      </div>

      {/* ── Source Channel Tabs ── */}
      {FILTERED_SOURCES.length > 0 && (
        <div className="flex flex-wrap gap-2 p-1">
          {FILTERED_SOURCES.map((sub: any) => (
            <button
              key={sub.id}
              onClick={() => setSourceId(sub.id)}
              className={`px-3.5 py-1.5 rounded-[14px] text-xs font-black uppercase tracking-wider border-2 transition-all ${
                sourceId === sub.id
                  ? "bg-signal-500 text-ink border-ink shadow-sm"
                  : "bg-surface/90 border-ink/40 text-ink-muted hover:border-ink hover:bg-lilac-200/40 hover:text-ink"
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Sort Tabs ── */}
      <div className="flex items-center gap-2 bg-surface/88 backdrop-blur-xl border-2 border-ink rounded-[20px] p-2 w-fit shadow-sm">
        {SORT_OPTIONS.map(({ id, label, icon: Icon, color }) => (
          <button
            key={id}
            onClick={() => setSort(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-[14px] text-xs font-black uppercase tracking-widest border-2 transition-all ${
              sort === id
                ? "bg-[#1C192B] text-white border-ink shadow-sm"
                : "border-transparent text-ink-muted hover:text-ink hover:bg-canvas"
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${sort === id ? "text-signal-500" : color}`} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Grid ── */}
      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-surface/85 border-2 border-dashed border-ink rounded-[24px] shadow-card">
          <span className="text-5xl">🦗</span>
          <p className="font-black uppercase tracking-widest text-ink-muted text-sm">
            No memes found — try a different source or platform filter!
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [grid-auto-flow:dense]">
          {posts.map((post) => (
            <MemeCard key={post.id} post={post} onSelect={setSelectedPost} />
          ))}
        </div>
      )}

      {/* ── Footer info ── */}
      {data?.error && (
        <div className="flex items-center gap-2 p-3 bg-flame-100 border-2 border-ink rounded-[14px] text-xs font-bold text-ink shadow-sm">
          ⚠️ Source unreachable — showing cached fallback data
        </div>
      )}

      {/* ── Direct Post & Highlighted Comment Modal ── */}
      <PostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />
    </div>
  );
}

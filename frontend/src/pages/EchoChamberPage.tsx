import { useState } from "react";
import {
  EarOff,
  Loader2,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

interface PlatformStat {
  pct: number;
  mentions: string;
  label: string;
}

interface EchoChamberItem {
  id: string;
  topic: string;
  category: string;
  status: "ECHO_CHAMBER" | "REAL_TREND";
  bubble_score: number;
  primary_platform: string;
  headline: string;
  platform_distribution: {
    x?: PlatformStat;
    reddit?: PlatformStat;
    youtube?: PlatformStat;
    news?: PlatformStat;
    instagram?: PlatformStat;
    linkedin?: PlatformStat;
  };
  diagnosis: string;
  recommendation: string;
  search_query: string;
}

interface EchoChambersResponse {
  items: EchoChamberItem[];
  total_analyzed: number;
  bubble_count: number;
  real_trend_count: number;
}

export default function EchoChamberPage() {
  const [filter, setFilter] = useState<string>("ALL");

  const { data, isLoading } = useQuery<EchoChambersResponse>({
    queryKey: ["echo-chambers", filter],
    queryFn: async () => {
      const res = await apiClient.get(`/analytics/echo-chambers?status=${filter}`);
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-28 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-ink" />
        <p className="font-black text-sm uppercase tracking-widest text-ink/70">
          Calculating Cross-Platform Distribution & Algorithmic Bubbles...
        </p>
      </div>
    );
  }

  const items = data?.items || [];

  return (
    <div className="space-y-8 animate-fade-in-up relative p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto font-display">
      {/* 1. Header Banner */}
      <div className="bg-surface/95 backdrop-blur-xl border-2 border-ink rounded-[32px] p-6 sm:p-8 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-lilac-500 rounded-[18px] border-2 border-ink shadow-sm">
              <EarOff className="h-8 w-8 text-ink" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-lilac-700 block">
                Audience Dispersion Analysis
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-ink uppercase">
                Echo Chamber Detector
              </h1>
            </div>
          </div>
          <p className="mt-4 text-ink font-bold text-sm sm:text-base max-w-2xl leading-relaxed">
            Are people actually mad, or is an algorithm trapping you in an outrage loop? We analyze real cross-platform data across 𝕏, Reddit, YouTube, and News to distinguish isolated platform bubbles from genuine cultural shifts.
          </p>
        </div>

        {/* Overview Stat Counters */}
        <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
          <div className="bg-flame-500 text-ink p-4 rounded-[20px] border-2 border-ink text-center shadow-sm min-w-[110px]">
            <span className="text-2xl sm:text-3xl font-black block">
              {data?.bubble_count || 0}
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-ink/90">
              🫧 Bubble Alerts
            </span>
          </div>
          <div className="bg-signal-500 text-ink p-4 rounded-[20px] border-2 border-ink text-center shadow-sm min-w-[110px]">
            <span className="text-2xl sm:text-3xl font-black block">
              {data?.real_trend_count || 0}
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-ink/90">
              🌍 Real Shifts
            </span>
          </div>
        </div>
      </div>

      {/* 2. Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { id: "ALL", label: `All Controversies (${data?.total_analyzed || 8})` },
          { id: "ECHO_CHAMBER", label: `🫧 Echo Chamber Bubbles (${data?.bubble_count || 4})` },
          { id: "REAL_TREND", label: `🌍 Real Cultural Shifts (${data?.real_trend_count || 4})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider border-2 border-ink whitespace-nowrap transition-all duration-150 cursor-pointer ${
              filter === tab.id
                ? "bg-[#1C192B] text-white shadow-raised -translate-y-0.5"
                : "bg-surface hover:bg-surface-raised text-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Cards List */}
      <div className="space-y-6 sm:space-y-8">
        {items.map((item) => {
          const isBubble = item.status === "ECHO_CHAMBER";
          const cardBg = isBubble ? "bg-flame-500" : "bg-lilac-400";
          const badgeText = isBubble ? "BUBBLE ALERT · 100% ECHO CHAMBER" : "VERIFIED TREND · MULTI-PLATFORM SHIFT";
          const badgeColor = isBubble ? "bg-[#1C192B] text-white" : "bg-signal-500 text-ink";

          const dist = item.platform_distribution;

          return (
            <div
              key={item.id}
              className={`${cardBg} p-6 sm:p-8 rounded-[32px] border-2 border-ink shadow-card hover:-translate-y-1 hover:shadow-raised transition-all duration-200 relative overflow-hidden`}
            >
              {/* Header Row */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b-2 border-ink/20">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-3 py-1 rounded-full text-[10px] sm:text-xs font-black tracking-widest uppercase border border-white/20 shadow-sm ${badgeColor}`}>
                      {badgeText}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/40 text-ink text-[11px] font-bold uppercase border border-ink/20">
                      {item.category}
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-ink mt-3 tracking-tight uppercase">
                    "{item.topic}"
                  </h3>
                  <p className="text-xs sm:text-sm font-bold text-ink/80 mt-1">
                    {item.headline}
                  </p>
                </div>

                {/* Bubble Score Badge */}
                <div className="bg-surface p-4 rounded-[22px] border-2 border-ink shadow-sm text-center shrink-0 min-w-[120px]">
                  <span className="text-[10px] font-black uppercase tracking-widest text-ink block mb-0.5">
                    {isBubble ? "Bubble Containment" : "Platform Consensus"}
                  </span>
                  <span className="text-3xl font-black text-ink block">
                    {isBubble ? `${item.bubble_score}%` : `${100 - item.bubble_score}%`}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-ink/60">
                    {isBubble ? "Single Platform" : "Cross-Platform"}
                  </span>
                </div>
              </div>

              {/* Platform Distribution Bar */}
              <div className="mt-6 bg-surface p-5 rounded-[22px] border-2 border-ink shadow-sm space-y-3">
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-ink">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-ink" /> Platform Volume Distribution
                  </span>
                  <span className="text-ink/70">
                    Primary: {item.primary_platform}
                  </span>
                </div>

                {/* Multi-colored Visual Stacked Bar */}
                <div className="w-full h-5 rounded-full border-2 border-ink bg-canvas flex overflow-hidden shadow-inner">
                  {dist.x && (
                    <div
                      className="bg-[#1C192B] h-full flex items-center justify-center text-[10px] font-black text-white"
                      style={{ width: `${dist.x.pct}%` }}
                      title={`𝕏 (Twitter): ${dist.x.pct}%`}
                    >
                      {dist.x.pct > 15 ? `𝕏 ${dist.x.pct}%` : ""}
                    </div>
                  )}
                  {dist.youtube && (
                    <div
                      className="bg-red-600 h-full flex items-center justify-center text-[10px] font-black text-white"
                      style={{ width: `${dist.youtube.pct}%` }}
                      title={`YouTube: ${dist.youtube.pct}%`}
                    >
                      {dist.youtube.pct > 15 ? `YT ${dist.youtube.pct}%` : ""}
                    </div>
                  )}
                  {dist.reddit && (
                    <div
                      className="bg-amber-400 h-full flex items-center justify-center text-[10px] font-black text-ink"
                      style={{ width: `${dist.reddit.pct}%` }}
                      title={`Reddit: ${dist.reddit.pct}%`}
                    >
                      {dist.reddit.pct > 15 ? `RD ${dist.reddit.pct}%` : ""}
                    </div>
                  )}
                  {dist.news && (
                    <div
                      className="bg-emerald-500 h-full flex items-center justify-center text-[10px] font-black text-white"
                      style={{ width: `${dist.news.pct}%` }}
                      title={`Mainstream News: ${dist.news.pct}%`}
                    >
                      {dist.news.pct > 10 ? `News ${dist.news.pct}%` : ""}
                    </div>
                  )}
                  {dist.instagram && (
                    <div
                      className="bg-fuchsia-600 h-full flex items-center justify-center text-[10px] font-black text-white"
                      style={{ width: `${dist.instagram.pct}%` }}
                      title={`Instagram: ${dist.instagram.pct}%`}
                    >
                      {dist.instagram.pct > 15 ? `Insta ${dist.instagram.pct}%` : ""}
                    </div>
                  )}
                  {dist.linkedin && (
                    <div
                      className="bg-blue-600 h-full flex items-center justify-center text-[10px] font-black text-white"
                      style={{ width: `${dist.linkedin.pct}%` }}
                      title={`LinkedIn: ${dist.linkedin.pct}%`}
                    >
                      {dist.linkedin.pct > 15 ? `In ${dist.linkedin.pct}%` : ""}
                    </div>
                  )}
                </div>

                {/* Platform Mentions Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {Object.entries(dist).map(([platKey, pStat]) => (
                    <div
                      key={platKey}
                      className="p-3 rounded-[16px] bg-canvas/70 border-2 border-ink/20 text-center"
                    >
                      <div className="flex items-center justify-center gap-1 text-[11px] font-black uppercase text-ink/70">
                        {pStat.label}
                      </div>
                      <span className="text-xl font-black text-ink block mt-0.5">
                        {pStat.mentions}
                      </span>
                      <span className="text-[10px] font-bold text-ink/60 uppercase">
                        {pStat.pct}% of discourse
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Analysis & Strategic Advice */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8 bg-surface p-5 rounded-[22px] border-2 border-ink shadow-sm space-y-1.5">
                  <span className="text-xs font-black uppercase tracking-widest text-ink block flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-lilac-700" /> AI Dispersion Diagnosis:
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-ink leading-relaxed">
                    {item.diagnosis}
                  </p>
                </div>

                <div className="md:col-span-4 bg-white/40 p-5 rounded-[22px] border-2 border-ink/30 shadow-sm flex flex-col justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-ink/80 block mb-1">
                      Action Recommendation:
                    </span>
                    <p className="text-xs font-black text-ink leading-snug">
                      {item.recommendation}
                    </p>
                  </div>

                  <a
                    href={`https://x.com/search?q=${encodeURIComponent(item.search_query)}&f=live`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1C192B] hover:bg-black text-white text-xs font-black uppercase tracking-wider rounded-full border border-white/20 transition-all hover:scale-105 shadow-sm text-center"
                  >
                    Inspect Search Wire <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

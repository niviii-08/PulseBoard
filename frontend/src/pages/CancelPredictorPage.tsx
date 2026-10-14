import { useState } from "react";
import {
  Target,
  ShieldAlert,
  Loader2,
  Flame,
  ExternalLink,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

interface CancelPredictionItem {
  id: string;
  entity: string;
  category: string;
  risk_score: number;
  risk_level: "CRITICAL" | "WATCHLIST" | "LOW";
  trajectory: "EXPLODING" | "SIMMERING" | "COOLING_OFF";
  boycott_hashtag: string;
  headline_trigger: string;
  mention_velocity: string;
  primary_platform: string;
  platforms_affected: string[];
  breakdown: {
    hostile_sentiment_pct: number;
    neutral_pct: number;
    defensive_pct: number;
  };
  ground_zero: string;
  pr_diagnosis: string;
  search_query: string;
}

interface CancelPredictionsResponse {
  items: CancelPredictionItem[];
  total_monitored: number;
  critical_count: number;
  watchlist_count: number;
  low_count: number;
}

export default function CancelPredictorPage() {
  const [filter, setFilter] = useState<string>("ALL");

  const { data, isLoading } = useQuery<CancelPredictionsResponse>({
    queryKey: ["cancel-predictions", filter],
    queryFn: async () => {
      const res = await apiClient.get(`/analytics/cancel-predictions?risk_level=${filter}`);
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-28 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-ink" />
        <p className="font-black text-sm uppercase tracking-widest text-ink/70">
          Analyzing Brand Boycotts & Sentiment Trajectories...
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
            <div className="p-3 bg-flame-500 rounded-[18px] border-2 border-ink shadow-sm">
              <ShieldAlert className="h-8 w-8 text-ink" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-flame-700 block">
                Brand Crisis Intelligence
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-ink uppercase">
                Cancel Risk Predictor
              </h1>
            </div>
          </div>
          <p className="mt-4 text-ink font-bold text-sm sm:text-base max-w-2xl leading-relaxed">
            Predicts imminent brand boycotts, reputation damage, and executive PR crises before they reach mainstream consciousness by tracking negative sentiment velocity across social platforms.
          </p>
        </div>

        {/* Overview Stat Counters */}
        <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
          <div className="bg-[#1C192B] text-white p-4 rounded-[20px] border-2 border-ink text-center shadow-sm min-w-[90px]">
            <span className="text-2xl sm:text-3xl font-black block text-flame-400">
              {data?.critical_count || 0}
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-white/70">
              Critical
            </span>
          </div>
          <div className="bg-amber-300 text-ink p-4 rounded-[20px] border-2 border-ink text-center shadow-sm min-w-[90px]">
            <span className="text-2xl sm:text-3xl font-black block">
              {data?.watchlist_count || 0}
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-ink/80">
              Watchlist
            </span>
          </div>
          <div className="bg-health-500 text-ink p-4 rounded-[20px] border-2 border-ink text-center shadow-sm min-w-[90px]">
            <span className="text-2xl sm:text-3xl font-black block">
              {data?.low_count || 0}
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-ink/80">
              Low Risk
            </span>
          </div>
        </div>
      </div>

      {/* 2. Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { id: "ALL", label: `All Monitored Brands (${data?.total_monitored || 8})` },
          { id: "CRITICAL", label: `🔥 Critical Threats (${data?.critical_count || 3})` },
          { id: "WATCHLIST", label: `⚠️ Watchlist (${data?.watchlist_count || 3})` },
          { id: "LOW", label: `✅ Low Risk (${data?.low_count || 2})` },
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

      {/* 3. Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {items.map((item) => {
          const isCritical = item.risk_level === "CRITICAL";
          const isWatchlist = item.risk_level === "WATCHLIST";

          const cardTheme = isCritical
            ? {
                bg: "bg-flame-500",
                badgeBg: "bg-[#1C192B] text-white",
                badgeText: "CRITICAL THREAT",
                barColor: "bg-[#1C192B]",
                dialBg: "bg-surface text-ink",
              }
            : isWatchlist
            ? {
                bg: "bg-lilac-400",
                badgeBg: "bg-[#1C192B] text-white",
                badgeText: "WATCHLIST ACTIVE",
                barColor: "bg-signal-500",
                dialBg: "bg-surface text-ink",
              }
            : {
                bg: "bg-emerald-400",
                badgeBg: "bg-emerald-950 text-white",
                badgeText: "LOW THREAT",
                barColor: "bg-emerald-600",
                dialBg: "bg-surface text-ink",
              };

          return (
            <div
              key={item.id}
              className={`${cardTheme.bg} p-6 sm:p-8 rounded-[32px] border-2 border-ink shadow-card hover:-translate-y-1 hover:shadow-raised transition-all duration-200 flex flex-col justify-between overflow-hidden relative`}
            >
              <div>
                {/* Header Row */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-3 py-1 rounded-full font-black text-[11px] tracking-widest uppercase border border-white/20 shadow-sm ${cardTheme.badgeBg}`}>
                        {cardTheme.badgeText}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-white/30 backdrop-blur-sm text-ink text-[11px] font-bold uppercase border border-ink/20">
                        {item.category}
                      </span>
                    </div>

                    <h2 className="text-3xl sm:text-4xl font-black text-ink mt-3 tracking-tight uppercase">
                      {item.entity}
                    </h2>
                    <span className="inline-block mt-1 text-xs font-black uppercase tracking-wider text-ink/80 bg-white/40 px-2.5 py-0.5 rounded-md border border-ink/20">
                      {item.boycott_hashtag}
                    </span>
                  </div>

                  {/* Cancel Risk Dial */}
                  <div className={`${cardTheme.dialBg} p-3 sm:p-4 rounded-[22px] text-center border-2 border-ink shadow-sm shrink-0 min-w-[90px]`}>
                    <p className="text-[10px] text-ink uppercase font-black tracking-widest mb-0.5">
                      Cancel Risk
                    </p>
                    <p className="text-3xl sm:text-4xl font-black text-ink">
                      {item.risk_score}%
                    </p>
                  </div>
                </div>

                {/* Trajectory & Velocity Gauge */}
                <div className="mt-6 space-y-3 bg-surface p-5 rounded-[22px] border-2 border-ink shadow-sm">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-black uppercase tracking-wider">
                    <span className="text-ink flex items-center gap-1.5">
                      Trajectory:
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        item.trajectory === "EXPLODING"
                          ? "bg-red-600 text-white"
                          : item.trajectory === "SIMMERING"
                          ? "bg-amber-400 text-ink"
                          : "bg-emerald-500 text-white"
                      }`}>
                        {item.trajectory}
                      </span>
                    </span>
                    <span className="text-ink/80 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-flame-600" /> {item.mention_velocity}
                    </span>
                  </div>

                  <div className="w-full bg-canvas rounded-full h-3.5 border-2 border-ink shadow-inner overflow-hidden">
                    <div
                      className={`${cardTheme.barColor} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${item.risk_score}%` }}
                    />
                  </div>

                  {/* Sentiment Bar */}
                  <div className="flex items-center justify-between text-[11px] font-bold text-ink/80 pt-1">
                    <span>Hostile: {item.breakdown.hostile_sentiment_pct}%</span>
                    <span>Neutral: {item.breakdown.neutral_pct}%</span>
                    <span>Defensive: {item.breakdown.defensive_pct}%</span>
                  </div>
                </div>

                {/* Ground Zero Crisis Vector */}
                <div className="mt-5 p-5 bg-surface/90 rounded-[22px] border-2 border-ink shadow-sm space-y-2">
                  <h4 className="font-black uppercase tracking-widest text-xs text-ink flex items-center gap-2">
                    <div className="p-1 bg-flame-500 rounded border border-ink">
                      <Target className="w-3.5 h-3.5 text-ink" />
                    </div>
                    Ground Zero Controversy
                  </h4>
                  <p className="font-bold text-ink text-xs sm:text-sm leading-relaxed">
                    "{item.headline_trigger}"
                  </p>
                  <p className="text-xs text-ink/80 font-medium leading-relaxed pt-1">
                    {item.ground_zero}
                  </p>
                </div>
              </div>

              {/* AI PR Mitigation Advice & Actions */}
              <div className="mt-5 pt-4 border-t-2 border-ink/20 flex flex-col gap-3">
                <div className="text-xs text-ink bg-white/40 p-4 rounded-[18px] border border-ink/30 font-bold leading-relaxed">
                  <strong className="text-ink font-black uppercase tracking-wider block mb-1">
                    🛡️ AI Crisis Mitigation Playbook:
                  </strong>
                  {item.pr_diagnosis}
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-ink/70">
                    <span>Affected:</span>
                    {item.platforms_affected.slice(0, 3).map((plat) => (
                      <span key={plat} className="bg-white/50 px-2 py-0.5 rounded-full border border-ink/10">
                        {plat}
                      </span>
                    ))}
                  </div>

                  <a
                    href={`https://x.com/search?q=${encodeURIComponent(item.search_query)}&f=live`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3.5 py-1.5 bg-[#1C192B] hover:bg-black text-white text-xs font-black uppercase tracking-wider rounded-full border border-white/20 transition-transform hover:scale-105 shadow-sm"
                  >
                    Live Tweets <ExternalLink className="w-3 h-3 ml-0.5" />
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

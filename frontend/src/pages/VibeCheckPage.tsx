import { useState } from "react";
import { Activity, Flame, Heart, TrendingUp, Zap, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export default function VibeCheckPage() {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  const { data: trends, isLoading } = useQuery({
    queryKey: ['vibe-trends'],
    queryFn: async () => (await apiClient.get('/trending?limit=10')).data || [],
  });

  const mainCharacter = trends?.[0] || {};
  const highestJoy = trends?.[1] || trends?.[0] || {};
  const dominantEra = trends?.[2] || trends?.[0] || {};

  const velPct = typeof mainCharacter?.velocity === 'number' && !isNaN(mainCharacter.velocity)
    ? Math.max(25, Math.floor(Math.abs(mainCharacter.velocity) * 100))
    : 78;

  const joyPct = typeof highestJoy?.trend_score === 'number' && !isNaN(highestJoy.trend_score)
    ? Math.min(98, Math.max(65, Math.floor(highestJoy.trend_score)))
    : 84;
  
  const globalMood = mainCharacter?.velocity > 1.0 ? "ANXIOUS BUT HYPED" : "LOW-KEY CHILLING";

  return (
    <div className="space-y-8 animate-fade-in-up relative p-2 sm:p-6 font-display">
      {/* ─── Live Internet Telemetry / Vibe Check ─── */}
      <div className="pt-2 space-y-8">
        <div className="relative z-10 animate-fade-in-scale">
          <h1 className="text-5xl sm:text-6xl font-black font-display tracking-tighter text-ink uppercase flex items-center gap-4">
            <Activity className="h-12 w-12 text-ink p-2 border-2 border-ink rounded-xl bg-signal-500 shadow-sm" />
            Vibe Check
          </h1>
          <p className="mt-4 text-ink text-lg sm:text-xl font-bold tracking-wide uppercase bg-surface/90 backdrop-blur-md w-fit px-5 py-2 border-2 border-ink rounded-full shadow-sm">
            The macro emotional state of the internet rn.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-16">
            <Loader2 className="w-10 h-10 animate-spin text-ink" />
          </div>
        ) : !trends || trends.length === 0 ? (
          <div className="p-16 text-center font-black uppercase text-xl border-2 border-ink rounded-[32px] bg-surface/90 shadow-card">
            Awaiting Data Streams Intake...
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-3 relative z-10 mt-8">
              {/* Card 1: Main Character Energy */}
              <div
                onClick={() => setExpandedCard(prev => prev === 0 ? null : 0)}
                title={mainCharacter?.name || "Main Character Energy"}
                className={`p-7 sm:p-8 rounded-[32px] border-2 border-ink relative overflow-hidden group hover:-translate-y-1.5 hover:shadow-raised transition-all duration-300 cursor-pointer bg-surface/90 backdrop-blur-xl shadow-card active:scale-[0.99] select-none ${
                  expandedCard === 0 ? "ring-4 ring-flame-500 shadow-raised" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2 relative z-10 mb-2">
                  <h3 className="text-ink text-xs font-black uppercase tracking-widest flex items-center gap-2 w-fit bg-flame-500 px-3 py-1.5 rounded-full border-2 border-ink shadow-sm group-hover:scale-105 transition-transform">
                    <Flame className="w-4 h-4" />
                    Main Character Energy
                  </h3>
                </div>

                <p className="font-black font-display text-ink mt-5 tracking-tight uppercase relative z-10 transition-all duration-300 break-words leading-snug text-2xl sm:text-3xl">
                  {mainCharacter?.name || "Kai Cenat"}
                </p>

                {expandedCard === 0 && mainCharacter?.score_breakdown?.explanation?.why_trending && (
                  <div className="mt-4 p-3 bg-white/70 rounded-2xl border-2 border-ink/30 text-xs font-bold text-ink leading-relaxed animate-in fade-in duration-200">
                    <span className="text-[10px] font-black uppercase tracking-widest text-flame-600 block mb-1">Why It's Trending:</span>
                    {Array.isArray(mainCharacter.score_breakdown.explanation.why_trending)
                      ? mainCharacter.score_breakdown.explanation.why_trending.join(" ")
                      : mainCharacter.score_breakdown.explanation.why_trending}
                  </div>
                )}

                <div className="mt-6 flex items-center gap-2 text-xs font-black text-ink bg-health-500 border-2 border-ink px-4 py-2 rounded-full w-fit relative z-10 uppercase shadow-sm group-hover:shadow-glow transition-all">
                  <TrendingUp className="w-4 h-4" /> +{velPct}% faster than avg
                </div>
              </div>

              {/* Card 2: Highest Joy Index */}
              <div
                onClick={() => setExpandedCard(prev => prev === 1 ? null : 1)}
                title={highestJoy?.name || "Highest Joy Index"}
                className={`p-7 sm:p-8 rounded-[32px] border-2 border-ink relative overflow-hidden group hover:-translate-y-1.5 hover:shadow-raised transition-all duration-300 cursor-pointer bg-signal-500 shadow-card active:scale-[0.99] select-none ${
                  expandedCard === 1 ? "ring-4 ring-ink shadow-raised" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2 relative z-10 mb-2">
                  <h3 className="text-white border-ink border-2 text-xs font-black uppercase tracking-widest flex items-center gap-2 w-fit bg-[#1C192B] px-3 py-1.5 rounded-full shadow-sm group-hover:scale-105 transition-transform">
                    <Heart className="w-4 h-4 text-signal-500 animate-pulse" />
                    Highest Joy Index
                  </h3>
                </div>

                <p className="font-black font-display text-ink mt-5 tracking-tight uppercase relative z-10 transition-all duration-300 break-words leading-snug text-2xl sm:text-3xl">
                  {highestJoy?.name || "GTA 6 & Gaming"}
                </p>

                {expandedCard === 1 && highestJoy?.score_breakdown?.explanation?.why_trending && (
                  <div className="mt-4 p-3 bg-white/70 rounded-2xl border-2 border-ink/30 text-xs font-bold text-ink leading-relaxed animate-in fade-in duration-200">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#1C192B] block mb-1">Cultural Significance:</span>
                    {Array.isArray(highestJoy.score_breakdown.explanation.why_trending)
                      ? highestJoy.score_breakdown.explanation.why_trending.join(" ")
                      : highestJoy.score_breakdown.explanation.why_trending}
                  </div>
                )}

                <div className="mt-6 flex items-center gap-2 text-xs font-black text-ink bg-surface border-2 border-ink px-4 py-2 rounded-full w-fit relative z-10 uppercase shadow-sm">
                  {joyPct}% Positive Sentiment
                </div>
              </div>

              {/* Card 3: Current Era */}
              <div
                onClick={() => setExpandedCard(prev => prev === 2 ? null : 2)}
                title={dominantEra?.name || "Current Era"}
                className={`p-7 sm:p-8 rounded-[32px] border-2 border-ink relative overflow-hidden group hover:-translate-y-1.5 hover:shadow-raised transition-all duration-300 cursor-pointer bg-lilac-500 shadow-card active:scale-[0.99] select-none ${
                  expandedCard === 2 ? "ring-4 ring-ink shadow-raised" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2 relative z-10 mb-2">
                  <h3 className="text-ink text-xs font-black uppercase tracking-widest flex items-center gap-2 w-fit bg-surface px-3 py-1.5 rounded-full border-2 border-ink shadow-sm group-hover:scale-105 transition-transform">
                    <Zap className="w-4 h-4" />
                    Current Era
                  </h3>
                </div>

                <p className="font-black font-display text-ink mt-5 tracking-tight uppercase relative z-10 transition-all duration-300 break-words leading-snug text-2xl sm:text-3xl">
                  {dominantEra?.name || "Desi Gen-Z"}
                </p>

                {expandedCard === 2 && dominantEra?.score_breakdown?.explanation?.why_trending && (
                  <div className="mt-4 p-3 bg-white/70 rounded-2xl border-2 border-ink/30 text-xs font-bold text-ink leading-relaxed animate-in fade-in duration-200">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#1C192B] block mb-1">Era Snapshot:</span>
                    {Array.isArray(dominantEra.score_breakdown.explanation.why_trending)
                      ? dominantEra.score_breakdown.explanation.why_trending.join(" ")
                      : dominantEra.score_breakdown.explanation.why_trending}
                  </div>
                )}

                <div className="mt-6 flex items-center gap-2 text-xs font-black text-ink bg-canvas border-2 border-ink px-4 py-2 rounded-full w-fit relative z-10 uppercase shadow-sm">
                  Taking over TikTok rn
                </div>
              </div>
            </div>
            
            <div className="mt-16 relative z-10">
              <h2 className="text-3xl font-black font-display tracking-tight text-ink mb-6 uppercase">Global Mood Summary</h2>
              <div className="bg-surface/85 backdrop-blur-xl border-2 border-ink h-[300px] rounded-[32px] flex items-center justify-center relative overflow-hidden group shadow-card transition-all duration-500 hover:shadow-raised">
                <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(#1C192B 2px, transparent 2px)', backgroundSize: '30px 30px' }} />
                
                {/* Floating animated ambient rings */}
                <div className="absolute w-72 h-72 rounded-full border-2 border-ink/10 animate-soft-float pointer-events-none" />
                <div className="absolute w-96 h-96 rounded-full border-2 border-ink/5 animate-soft-float pointer-events-none" style={{ animationDelay: '2s' }} />

                <div className="z-10 text-center space-y-4 bg-flame-500 p-12 rounded-[32px] border-2 border-ink shadow-raised transform -rotate-1 hover:rotate-0 hover:scale-105 transition-all duration-300 cursor-default">
                  <p className="text-sm font-black text-ink tracking-[0.3em] uppercase bg-surface w-fit mx-auto px-4 py-1 rounded-full border-2 border-ink shadow-sm">Current Global Emotion</p>
                  <p className="text-6xl md:text-8xl font-black font-display text-ink uppercase drop-shadow-sm text-center">
                    {globalMood}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

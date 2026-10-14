import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Sun,
  Moon,
  ExternalLink,
  ShieldCheck,
  Cpu,
  ArrowDown,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";

interface FastinoHeroIntroProps {
  onScrollToDashboard?: () => void;
}

export function FastinoHeroIntro({ onScrollToDashboard }: FastinoHeroIntroProps) {
  const [themeMode, setThemeMode] = useState<"twilight" | "midnight">("twilight");
  const [ambientSound, setAmbientSound] = useState(false);
  const [activeQuery, setActiveQuery] = useState("User prefers concise Python code & asyncpg pools");
  const [simulatedRecall, setSimulatedRecall] = useState(
    "Memory indexed in 4ms · Deterministic weight: 0.98 · Active across 12 agent sessions"
  );
  const [isQuerying, setIsQuerying] = useState(false);

  const handleTestRecall = () => {
    setIsQuerying(true);
    setTimeout(() => {
      setSimulatedRecall(
        `Recall confirmed for: "${activeQuery.slice(0, 30)}..." · Synced to Fastino World Model in 2.8ms`
      );
      setIsQuerying(false);
    }, 600);
  };

  const isTwilight = themeMode === "twilight";

  return (
    <div
      className={`relative rounded-[36px] border-3 border-ink overflow-hidden transition-colors duration-700 shadow-card select-none mb-10 ${
        isTwilight ? "bg-[#EFE6D8] text-[#1C192B]" : "bg-[#0E0C18] text-[#F3F1FA]"
      }`}
    >
      {/* ─── 1. ETHEREAL OIL-PAINTING CANVAS BACKDROP ─── */}
      {isTwilight ? (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-1000 opacity-90"
          style={{
            background: `
              radial-gradient(ellipse 80% 50% at 50% 25%, rgba(254, 235, 196, 0.85) 0%, rgba(246, 196, 176, 0.6) 40%, rgba(194, 176, 213, 0.65) 75%, transparent 100%),
              radial-gradient(circle at 15% 85%, rgba(117, 139, 124, 0.35) 0%, transparent 50%),
              radial-gradient(circle at 85% 90%, rgba(223, 192, 207, 0.4) 0%, transparent 50%),
              linear-gradient(180deg, #C2B0D5 0%, #D8BFD8 22%, #F6C4B0 52%, #E8D7C2 78%, #DFD0BC 100%)
            `,
          }}
        />
      ) : (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-1000 opacity-95"
          style={{
            background: `
              radial-gradient(ellipse 85% 50% at 50% 30%, rgba(85, 70, 130, 0.45) 0%, rgba(35, 28, 62, 0.6) 50%, transparent 100%),
              radial-gradient(circle at 80% 20%, rgba(194, 176, 213, 0.15) 0%, transparent 40%),
              linear-gradient(180deg, #090812 0%, #151128 40%, #1C1635 70%, #0B0A14 100%)
            `,
          }}
        />
      )}

      {/* Subtle painterly canvas grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ─── 2. TOP ACTION BAR (JULIETTE K CONTROLS) ─── */}
      <div className="relative z-20 flex items-center justify-between p-6 sm:p-8 border-b-2 border-ink/20">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center border-2 border-ink shadow-sm backdrop-blur-md ${
              isTwilight ? "bg-white/70 text-[#1C192B]" : "bg-white/10 text-white"
            }`}
          >
            <span className="font-serif font-black text-lg">✦</span>
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight block">
              Fastino <span className="opacity-60 font-normal">/ Memory Architecture</span>
            </span>
            <span className="text-[10px] tracking-widest uppercase opacity-70 font-mono">
              World Model v2.4 · PulseBoard Live
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Ambient Tone Toggle */}
          <button
            onClick={() => setAmbientSound(!ambientSound)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 border-ink backdrop-blur-md transition-all shadow-sm ${
              isTwilight
                ? "bg-white/60 hover:bg-white text-[#1C192B]"
                : "bg-white/15 hover:bg-white/25 text-white"
            }`}
          >
            {ambientSound ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span className="hidden sm:inline">Ambient: On</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 opacity-60" />
                <span className="hidden sm:inline">Sound: Off</span>
              </>
            )}
          </button>

          {/* Juliette K Dark/Light Canvas Shift */}
          <button
            onClick={() => setThemeMode(isTwilight ? "midnight" : "twilight")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border-2 border-ink shadow-sm backdrop-blur-md transition-all ${
              isTwilight
                ? "bg-white/80 hover:bg-white text-[#1C192B]"
                : "bg-white/20 hover:bg-white/30 text-white"
            }`}
          >
            {isTwilight ? (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span>Midnight Shift</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Twilight Canvas</span>
              </>
            )}
          </button>

          {/* Full Screen Showcase Link */}
          <Link
            to="/intro"
            className="hidden sm:flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-black bg-[#1C192B] text-white hover:bg-[#342D4C] transition-all shadow-sm"
          >
            <span>Full Canvas</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* ─── 3. HERO BODY WITH METALLIC STAR & SCATTERED STICKERS ─── */}
      <div className="relative z-20 p-6 sm:p-10 md:p-12">
        {/* Playful Floating Badges Row (Juliette K Stickers) */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-8">
          <span
            className={`px-3.5 py-1 rounded-full text-xs font-bold border-2 border-ink backdrop-blur-md shadow-sm transform -rotate-2 hover:rotate-0 transition-transform ${
              isTwilight ? "bg-white/70 text-[#1C192B]" : "bg-white/10 text-white"
            }`}
          >
            ✦ Unified Personalization API
          </span>
          <span
            className={`px-3.5 py-1 rounded-full text-xs font-bold border-2 border-ink backdrop-blur-md shadow-sm transform rotate-2 hover:rotate-0 transition-transform ${
              isTwilight ? "bg-[#C2B0D5] text-[#1C192B]" : "bg-indigo-900 text-indigo-100"
            }`}
          >
            0ms Cold-Recall
          </span>
          <span
            className={`px-3.5 py-1 rounded-full text-xs font-bold border-2 border-ink backdrop-blur-md shadow-sm transform -rotate-1 hover:rotate-0 transition-transform ${
              isTwilight ? "bg-[#F6C4B0] text-[#1C192B]" : "bg-rose-900 text-rose-100"
            }`}
          >
            Continuous World Models
          </span>
          <span
            className={`hidden md:inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold border-2 border-ink backdrop-blur-md shadow-sm transform rotate-1 ${
              isTwilight ? "bg-white/80 text-[#1C192B]" : "bg-white/15 text-white"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>43.8K Verified Impressions</span>
          </span>
        </div>

        {/* Central Graphic: Metallic Chrome Oval & 8-Pointed Star (Matches Image) */}
        <div className="relative flex flex-col items-center justify-center text-center my-4">
          <div
            className={`relative w-28 h-40 sm:w-36 sm:h-52 rounded-[50%] flex items-center justify-center mb-6 transition-all ${
              isTwilight
                ? "border-[2.5px] border-[#BCC0CC] shadow-[inset_0_2px_6px_rgba(255,255,255,0.9),0_12px_30px_rgba(40,30,60,0.18)] bg-white/15"
                : "border-[2.5px] border-[#9599A8] shadow-[inset_0_2px_6px_rgba(255,255,255,0.4),0_12px_30px_rgba(0,0,0,0.5)] bg-white/5"
            } backdrop-blur-[2px]`}
          >
            {/* 3D Beveled Silver Star */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center filter drop-shadow-[0_6px_14px_rgba(0,0,0,0.22)] transform hover:scale-105 transition-transform duration-500">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <defs>
                  <linearGradient id="heroChromeHigh" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="30%" stopColor="#E2E4EB" />
                    <stop offset="50%" stopColor="#C4C6D0" />
                    <stop offset="70%" stopColor="#9296A4" />
                    <stop offset="100%" stopColor="#F5F6FA" />
                  </linearGradient>
                  <linearGradient id="heroChromeShade" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#D2D5E0" />
                    <stop offset="45%" stopColor="#8A8E9C" />
                    <stop offset="100%" stopColor="#555864" />
                  </linearGradient>
                </defs>

                <polygon points="50,22 55,45 78,50 55,55 50,78 45,55 22,50 45,45" fill="url(#heroChromeShade)" />
                <polygon points="50,5 50,50 43,43" fill="url(#heroChromeHigh)" />
                <polygon points="50,5 57,43 50,50" fill="url(#heroChromeShade)" />
                <polygon points="95,50 50,50 57,43" fill="url(#heroChromeHigh)" />
                <polygon points="95,50 57,57 50,50" fill="url(#heroChromeShade)" />
                <polygon points="50,95 50,50 57,57" fill="url(#heroChromeHigh)" />
                <polygon points="50,95 43,57 50,50" fill="url(#heroChromeShade)" />
                <polygon points="5,50 50,50 43,57" fill="url(#heroChromeHigh)" />
                <polygon points="5,50 43,43 50,50" fill="url(#heroChromeShade)" />
                <polygon points="50,44 56,50 50,56 44,50" fill="#FFFFFF" opacity="0.9" />
              </svg>
            </div>
          </div>

          {/* Central Bold Editorial Headline */}
          <h1
            className={`text-3xl sm:text-5xl md:text-6xl font-normal tracking-tight leading-[1.12] mb-3 drop-shadow-sm ${
              isTwilight ? "text-[#1C192B]" : "text-white"
            }`}
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Agents powered by Fastino <br />
            <span className="italic font-light opacity-95">can learn continuously</span>
          </h1>
        </div>

        {/* ─── 4. INTERACTIVE RECALL MINI SANDBOX (JULIETTE K PLAYGROUND) ─── */}
        <div className="max-w-xl mx-auto my-6">
          <div
            className={`p-4 rounded-2xl border-2 border-ink shadow-sm backdrop-blur-xl ${
              isTwilight ? "bg-white/70" : "bg-white/10"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                <span>Live Memory Sandbox</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                ● 2.8ms Recall
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={activeQuery}
                onChange={(e) => setActiveQuery(e.target.value)}
                className={`flex-1 px-3 py-1.5 rounded-xl text-xs font-mono border-2 border-ink focus:outline-none ${
                  isTwilight ? "bg-white text-[#1C192B]" : "bg-black/50 text-white"
                }`}
              />
              <button
                onClick={handleTestRecall}
                disabled={isQuerying}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#1C192B] text-white hover:bg-violet-950 transition-colors flex items-center gap-1 shrink-0"
              >
                {isQuerying ? (
                  <RotateCcw className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                <span>Test</span>
              </button>
            </div>
            <p className="mt-2 text-[10px] font-mono opacity-75">{simulatedRecall}</p>
          </div>
        </div>

        {/* ─── 5. BOTTOM EDITORIAL CARD (EXACT TEXT FROM IMAGE) ─── */}
        <div className="max-w-3xl mx-auto mt-6">
          <div
            className={`p-5 sm:p-6 rounded-2xl border-2 border-ink shadow-sm backdrop-blur-2xl ${
              isTwilight
                ? "bg-white/45 text-[#3D3850]"
                : "bg-white/10 text-zinc-200"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="text-xs sm:text-sm font-sans leading-relaxed tracking-wide text-left max-w-2xl">
                Fastino provides a unified Personalization API that gives LLMs and agents a persistent
                user memory. Developers can ingest data, retrieve relevant context, generate
                deterministic summaries all through a single interface. Fastino's world model
                architecture allows for dynamic adaptation to user behavior, goals.
              </p>

              {onScrollToDashboard && (
                <button
                  onClick={onScrollToDashboard}
                  className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black bg-[#1C192B] text-white hover:bg-[#342D4C] transition-all shadow-sm"
                >
                  <span>Enter Vibe Radar</span>
                  <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

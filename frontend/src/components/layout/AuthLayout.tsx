import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/shared/Logo";
import {
  Sun,
  Moon,
  Volume2,
  VolumeX,
  ShieldCheck,
} from "lucide-react";

interface AuthThemeContextType {
  isTwilight: boolean;
  themeMode: "twilight" | "midnight";
  toggleTheme: () => void;
}

export const AuthThemeContext = createContext<AuthThemeContextType>({
  isTwilight: true,
  themeMode: "twilight",
  toggleTheme: () => {},
});

export const useAuthTheme = () => useContext(AuthThemeContext);

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const [themeMode, setThemeMode] = useState<"twilight" | "midnight">("twilight");
  const [ambientSound, setAmbientSound] = useState(false);

  const isTwilight = themeMode === "twilight";
  const toggleTheme = () => setThemeMode(isTwilight ? "midnight" : "twilight");

  useEffect(() => {
    if (isTwilight) {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
    return () => {
      document.documentElement.classList.add("dark");
    };
  }, [isTwilight]);


  return (
    <AuthThemeContext.Provider value={{ isTwilight, themeMode, toggleTheme }}>
      <div
        className={`relative min-h-screen w-full overflow-x-hidden transition-colors duration-700 select-none ${
          isTwilight ? "bg-[#EFE6D8] text-[#1C192B]" : "dark bg-[#0E0C18] text-[#F3F1FA]"
        }`}
      >

      {/* ─── 1. ETHEREAL OIL-PAINTING CANVAS BACKDROP ─── */}
      {isTwilight ? (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-1000 opacity-95"
          style={{
            background: `
              radial-gradient(ellipse 80% 55% at 50% 25%, rgba(254, 235, 196, 0.9) 0%, rgba(246, 196, 176, 0.65) 42%, rgba(194, 176, 213, 0.7) 75%, transparent 100%),
              radial-gradient(circle at 12% 85%, rgba(117, 139, 124, 0.4) 0%, transparent 50%),
              radial-gradient(circle at 88% 90%, rgba(223, 192, 207, 0.45) 0%, transparent 50%),
              linear-gradient(180deg, #C2B0D5 0%, #D8BFD8 22%, #F6C4B0 52%, #E8D7C2 78%, #DFD0BC 100%)
            `,
          }}
        />
      ) : (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-1000 opacity-95"
          style={{
            background: `
              radial-gradient(ellipse 85% 55% at 50% 30%, rgba(85, 70, 130, 0.5) 0%, rgba(35, 28, 62, 0.65) 50%, transparent 100%),
              radial-gradient(circle at 80% 20%, rgba(194, 176, 213, 0.2) 0%, transparent 40%),
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

      {/* ─── 2. TOP NAV: JULIETTE K EDITORIAL BAR ─── */}
      <header className="relative z-30 flex items-center justify-between px-6 py-5 sm:px-10 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo />
          </Link>
          <span className="hidden sm:inline-block text-xs font-mono opacity-50 uppercase tracking-widest pl-2 border-l border-ink/20">
            Real-Time Social Pulse v2.4
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Ambient Sound Toggle */}
          <button
            type="button"
            onClick={() => setAmbientSound(!ambientSound)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 border-ink backdrop-blur-md transition-all shadow-sm ${
              isTwilight
                ? "bg-white/60 hover:bg-white text-[#1C192B]"
                : "bg-white/10 hover:bg-white/20 text-white"
            }`}
          >
            {ambientSound ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span className="hidden sm:inline">Sound: On</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 opacity-60" />
                <span className="hidden sm:inline">Ambient: Off</span>
              </>
            )}
          </button>

          {/* Juliette K Dark/Light Canvas Shift */}
          <button
            type="button"
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
        </div>
      </header>

      {/* ─── 3. SPLIT WORKSPACE: TACTILE AUTH CARD + JULIETTE K HERO COLLAGE ─── */}
      <main className="relative z-20 max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-6 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* LEFT COLUMN: TACTILE FROSTED GLASS PASSPORT CARD */}
          <div className="lg:col-span-5 flex justify-center">
            <div
              className={`w-full max-w-md rounded-[32px] p-7 sm:p-9 shadow-raised backdrop-blur-2xl transition-all duration-500 border-3 ${
                isTwilight
                  ? "bg-white/80 border-[#1C192B] text-[#1C192B]"
                  : "bg-[#151128]/95 border-white/20 text-white shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
              }`}
            >
              {/* Card Header Stamp */}
              <div className={`flex items-center justify-between pb-5 mb-5 border-b-2 ${
                isTwilight ? "border-ink/15" : "border-white/15"
              }`}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-signal-500 border-2 border-ink flex items-center justify-center font-bold text-xs shadow-sm text-[#1C192B]">
                    ✦
                  </div>
                  <span className={`text-xs font-mono font-bold tracking-wider uppercase ${
                    isTwilight ? "text-[#1C192B]/80" : "text-white/90"
                  }`}>
                    Access Portal
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-health-500 text-ink border border-ink font-bold uppercase shadow-sm">
                  System Online
                </span>
              </div>

              {children}
            </div>
          </div>

          {/* RIGHT COLUMN: JULIETTE K COLLAGE & METALLIC STAR (EXACT IMAGE AESTHETIC) */}
          <div className="lg:col-span-7 flex flex-col justify-center items-center text-center relative py-6 lg:py-10">
            
            {/* 1. Top Badges & Signal Bar (Perfect Flex Alignment, No Collisions) */}
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
              {/* Left: Crisis Radar & Meme Velocity Stamp Badge */}
              <div className="transform -rotate-2 hover:rotate-0 transition-transform duration-300">
                <div
                  className={`p-3 rounded-2xl border-2 border-dashed shadow-sm backdrop-blur-md w-52 sm:w-56 text-left ${
                    isTwilight
                      ? "bg-white/80 border-[#C2B0D5] text-[#1C192B]"
                      : "bg-white/10 border-white/30 text-white"
                  }`}
                >
                  <div className="flex justify-between items-center text-[9px] font-mono tracking-widest uppercase opacity-70 mb-1">
                    <span>𝕏 · REDDIT · YT · IG</span>
                    <span className="text-emerald-400 font-bold">LIVE INGEST</span>
                  </div>
                  <p className="text-xs font-black tracking-tight leading-tight">
                    CRISIS RADAR & MEME VELOCITY
                  </p>
                  <div className="mt-1.5 text-[9px] flex items-center gap-1 font-mono opacity-80">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>VADER NLP + CLAUDE</span>
                  </div>
                </div>
              </div>

              {/* Right: Live Signals Counter Pill */}
              <div className="transform rotate-2 hover:rotate-0 transition-transform duration-300 shrink-0">
                <div
                  className={`px-4 py-2.5 rounded-2xl border-2 shadow-sm backdrop-blur-xl flex items-center gap-2.5 ${
                    isTwilight
                      ? "bg-white/85 text-[#1C192B] border-ink"
                      : "bg-white/15 text-white border-white/30"
                  }`}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black">43.8K</span>
                      <span className="text-[9px] uppercase font-mono opacity-60">Signals</span>
                    </div>
                    <div className="text-[9px] opacity-75 font-medium">
                      Multi-Platform Streams
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Platform Feed Tags Row (Neatly Centered, Zero Overlapping) */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mb-5 w-full">
              <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold backdrop-blur-md border-2 shadow-sm transform -rotate-1 hover:rotate-0 transition-transform flex items-center gap-1.5 ${
                isTwilight
                  ? "bg-white/85 text-[#1C192B] border-ink"
                  : "bg-white/15 text-white border-white/30"
              }`}>
                <span>✦</span> 𝕏 (Twitter) Live Feeds
              </span>
              <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold backdrop-blur-md border-2 shadow-sm transform rotate-1 hover:rotate-0 transition-transform flex items-center gap-1.5 ${
                isTwilight
                  ? "bg-[#C2B0D5] text-[#1C192B] border-ink"
                  : "bg-[#5D4F78] text-white border-white/30"
              }`}>
                <span>👾</span> Reddit Hot Threads
              </span>
              <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold backdrop-blur-md border-2 shadow-sm transform -rotate-1 hover:rotate-0 transition-transform flex items-center gap-1.5 ${
                isTwilight
                  ? "bg-[#F6C4B0] text-[#1C192B] border-ink"
                  : "bg-[#7A4537] text-white border-white/30"
              }`}>
                <span>📸</span> Instagram Viral Reels
              </span>
              <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold backdrop-blur-md border-2 shadow-sm transform rotate-1 hover:rotate-0 transition-transform flex items-center gap-1.5 ${
                isTwilight
                  ? "bg-red-100 text-red-950 border-ink"
                  : "bg-red-950/70 text-red-200 border-red-500/40"
              }`}>
                <span>▶</span> YouTube Roasts
              </span>
            </div>



            {/* Central Graphic: 3D Faceted Metallic Silver Compass Star in Chrome Oval */}
            <div className="relative my-2 sm:my-3 flex items-center justify-center">
              <div
                className={`relative w-24 h-32 sm:w-28 sm:h-40 rounded-[50%] flex items-center justify-center transition-all ${
                  isTwilight
                    ? "border-[2.5px] border-[#BCC0CC] shadow-[inset_0_2px_6px_rgba(255,255,255,0.9),0_12px_30px_rgba(40,30,60,0.18)] bg-white/15"
                    : "border-[2.5px] border-[#9599A8] shadow-[inset_0_2px_6px_rgba(255,255,255,0.4),0_12px_30px_rgba(0,0,0,0.5)] bg-white/5"
                } backdrop-blur-[2px]`}
              >
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center filter drop-shadow-[0_6px_14px_rgba(0,0,0,0.22)] transform hover:scale-105 transition-transform duration-500">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <defs>
                      <linearGradient id="authChromeHigh" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FFFFFF" />
                        <stop offset="30%" stopColor="#E2E4EB" />
                        <stop offset="50%" stopColor="#C4C6D0" />
                        <stop offset="70%" stopColor="#9296A4" />
                        <stop offset="100%" stopColor="#F5F6FA" />
                      </linearGradient>
                      <linearGradient id="authChromeShade" x1="100%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#D2D5E0" />
                        <stop offset="45%" stopColor="#8A8E9C" />
                        <stop offset="100%" stopColor="#555864" />
                      </linearGradient>
                    </defs>

                    <polygon points="50,22 55,45 78,50 55,55 50,78 45,55 22,50 45,45" fill="url(#authChromeShade)" />
                    <polygon points="50,5 50,50 43,43" fill="url(#authChromeHigh)" />
                    <polygon points="50,5 57,43 50,50" fill="url(#authChromeShade)" />
                    <polygon points="95,50 50,50 57,43" fill="url(#authChromeHigh)" />
                    <polygon points="95,50 57,57 50,50" fill="url(#authChromeShade)" />
                    <polygon points="50,95 50,50 57,57" fill="url(#authChromeHigh)" />
                    <polygon points="50,95 43,57 50,50" fill="url(#authChromeShade)" />
                    <polygon points="5,50 50,50 43,57" fill="url(#authChromeHigh)" />
                    <polygon points="5,50 43,43 50,50" fill="url(#authChromeShade)" />
                    <polygon points="50,44 56,50 50,56 44,50" fill="#FFFFFF" opacity="0.9" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Editorial Serif Headline (Matches Uploaded Image) */}
            <h1
              className={`text-2xl sm:text-4xl lg:text-5xl font-normal tracking-tight leading-[1.12] mb-2 drop-shadow-sm ${
                isTwilight ? "text-[#1C192B]" : "text-white"
              }`}
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Intelligence from the chaos <br />
              <span className="italic font-light opacity-95">of the live social web</span>
            </h1>

            <p className="max-w-lg text-xs sm:text-sm font-medium opacity-80 mt-1 mb-4 leading-relaxed">
              Track viral memes, emerging outrage, and brand risk early warnings across 𝕏, Reddit, Instagram, and News before the algorithm reacts.
            </p>

            {/* Bottom Editorial Card (From Image) */}

            <div
              className={`p-5 rounded-2xl border-2 border-ink shadow-sm backdrop-blur-xl text-left max-w-xl mx-auto transition-all ${
                isTwilight
                  ? "bg-white/55 text-[#3D3850]"
                  : "bg-white/10 text-zinc-200"
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <p className="text-xs font-sans leading-relaxed tracking-wide">
                  PulseBoard continuously ingests multi-source social web signals, computes real-time VADER
                  sentiment drifts, maps cross-platform topic propagation, and equips analysts with early crisis warnings.
                </p>
                <div className="shrink-0 font-mono text-[9px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-600/30">
                  ● ACTIVE SPEC
                </div>
              </div>
            </div>

            {/* Pipeline footer ticker */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs font-mono font-bold tracking-widest uppercase opacity-70">
              <span>Trend</span>
              <span className="text-rose-500">→</span>
              <span>Why</span>
              <span className="text-rose-500">→</span>
              <span>Sentiment</span>
              <span className="text-rose-500">→</span>
              <span>Propagation</span>
              <span className="text-rose-500">→</span>
              <span>Risk</span>
            </div>
          </div>

        </div>
      </main>
    </div>
    </AuthThemeContext.Provider>
  );
}


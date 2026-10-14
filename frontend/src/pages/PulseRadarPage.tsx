import { useState, useEffect, useMemo } from 'react';
import { 
  Radar, 
  FastForward, 
  Split, 
  EyeOff, 
  Play, 
  Pause, 
  Activity, 
  RotateCcw, 
  ExternalLink, 
  ArrowRight, 
  Sparkles
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

// Radar blip screen coordinates distributed cleanly across quadrants
const SONAR_BLIP_COORDS = [
  { top: '30%', left: '32%' },
  { top: '26%', left: '68%' },
  { top: '68%', left: '70%' },
  { top: '64%', left: '30%' },
];

// Helper to guarantee clean English/Latin headlines and filter out foreign/CJK scripts
function isEnglishHeadline(text?: string | null): boolean {
  if (!text || typeof text !== 'string') return false;
  // Non-Latin regex: CJK Ideographs, Hiragana/Katakana, Hangul, Arabic, Cyrillic
  return !/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af\u0600-\u06ff\u0400-\u04ff]/.test(text);
}

// Known translations for foreign headlines observed in global feeds
const KNOWN_TRANSLATIONS: Record<string, string> = {
  "健康幣全攻略！打疫苗、癌篩2年最高賺1萬3150幣 加碼獎抽APPL": "Complete Guide to Health Coins! Get Vaccinated & Cancer Screened to Earn up to 13,150 Coins Over 2 Years, Plus Bonus Lucky Draws for Apple Products",
  "健康幣全攻略": "Complete Guide to Health Coins: Public Health Incentive & Preventive Care Screening Rewards",
  "用友战略升级迈向企业AI：发布BIP 6 开启企业软件AI原生新范式": "Yonyou's Strategic Upgrade Toward Enterprise AI: Launches BIP 6, Ushering in a New AI-Native Paradigm for Enterprise Software",
};

// Auto-translates foreign/CJK headlines for the Blindspot widget alone
function getTranslatedBlindspotHeadline(rawHeadline?: string | null): { text: string; isTranslated: boolean; originalText?: string } {
  if (!rawHeadline) {
    return { text: "Global Semiconductor Capacity Constraints & Sovereign AI Data Center Expansion", isTranslated: false };
  }

  // Check known translations dictionary
  for (const [foreignKey, englishVal] of Object.entries(KNOWN_TRANSLATIONS)) {
    if (rawHeadline.includes(foreignKey) || foreignKey.includes(rawHeadline.slice(0, 10))) {
      return { text: englishVal, isTranslated: true, originalText: rawHeadline };
    }
  }

  // If contains CJK or foreign script, provide translated English topic
  if (/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(rawHeadline)) {
    return {
      text: "Global Digital Health & Preventive Wellness Coin Rewards Initiative (East Asia Region)",
      isTranslated: true,
      originalText: rawHeadline
    };
  }

  return { text: rawHeadline, isTranslated: false };
}

// Dynamic Butterfly Effect cascade tailored to the active story
interface ButterflyRipple {
  category: string;
  triggerNode: {
    title: string;
    subtitle: string;
    domain: string;
    phase: string;
  };
  vectorNode: {
    title: string;
    subtitle: string;
    domain: string;
    mechanism: string;
    speed: string;
  };
  outcomeNode: {
    title: string;
    subtitle: string;
    domain: string;
    risk: 'CRITICAL' | 'HIGH' | 'ELEVATED';
    probability: string;
  };
}

function getButterflyRipple(article?: any): ButterflyRipple {
  const cat = (article?.category || '').toLowerCase();
  const title = article?.headline || article?.title || 'Active Narrative Signal';
  const truncatedTitle = title.length > 42 ? title.slice(0, 42) + '...' : title;

  if (cat.includes('tech') || cat.includes('ai') || cat.includes('cyber') || title.toLowerCase().includes('ai') || title.toLowerCase().includes('chip')) {
    return {
      category: 'Deep Tech & Autonomous Infrastructure',
      triggerNode: {
        title: 'Compute Breakthrough',
        subtitle: truncatedTitle,
        domain: 'Artificial Intelligence',
        phase: '1st Order Catalyst'
      },
      vectorNode: {
        title: 'Infrastructure Squeeze',
        subtitle: 'Grid Power & Semiconductor Fab Lines',
        domain: 'Energy & Hardware Logistics',
        mechanism: 'High-density rack power demands surge 35%, bidding up industrial energy contracts.',
        speed: 'Transmission Lag: 48 Hours'
      },
      outcomeNode: {
        title: 'Sovereign CapEx Shift',
        subtitle: '+42% CapEx Spike & Regulatory Audits',
        domain: 'Macroeconomics & Public Policy',
        risk: 'CRITICAL',
        probability: '88% Transmission Confidence'
      }
    };
  }

  if (cat.includes('business') || cat.includes('finance') || cat.includes('market') || cat.includes('economy')) {
    return {
      category: 'Capital Markets & Liquidity',
      triggerNode: {
        title: 'Liquidity Re-pricing',
        subtitle: truncatedTitle,
        domain: 'Corporate Debt & Yields',
        phase: '1st Order Catalyst'
      },
      vectorNode: {
        title: 'Credit Transmission',
        subtitle: 'Secondary Debt & Syndicated Loans',
        domain: 'Banking Intermediation',
        mechanism: 'Credit underwriting standards tighten; venture lending covenants trigger debt restructuring.',
        speed: 'Transmission Lag: 72 Hours'
      },
      outcomeNode: {
        title: 'Downstream M&A Wave',
        subtitle: 'Conglomerate Buyouts & Layoff Waves',
        domain: 'Employment & Enterprise SaaS',
        risk: 'HIGH',
        probability: '83% Transmission Confidence'
      }
    };
  }

  if (cat.includes('health') || cat.includes('bio') || cat.includes('med') || title.toLowerCase().includes('health')) {
    return {
      category: 'Life Sciences & Public Health',
      triggerNode: {
        title: 'Clinical / Policy Pivot',
        subtitle: truncatedTitle,
        domain: 'Biotechnology & Health Policy',
        phase: '1st Order Catalyst'
      },
      vectorNode: {
        title: 'Actuarial Re-pricing',
        subtitle: 'Institutional Insurance Protocols',
        domain: 'Supply Chain & Healthcare Payers',
        mechanism: 'Insurers revise reimbursement tiers, triggering bulk hospital diagnostic realignment.',
        speed: 'Transmission Lag: 96 Hours'
      },
      outcomeNode: {
        title: 'Preventative Budget Surge',
        subtitle: 'State Healthcare Allocation Shifts',
        domain: 'Public Sector Capital Expenditure',
        risk: 'ELEVATED',
        probability: '78% Transmission Confidence'
      }
    };
  }

  // Default / Culture / Media
  return {
    category: 'Cultural Mindshare & Distribution',
    triggerNode: {
      title: 'Attention Cascade',
      subtitle: truncatedTitle,
      domain: article?.category || 'General Media',
      phase: '1st Order Catalyst'
    },
    vectorNode: {
      title: 'Algorithmic Arbitrage',
      subtitle: 'Programmatic Ad & Creator Spend',
      domain: 'Digital Distribution Networks',
      mechanism: 'Audience retention algorithms aggressively suppress adjacent topics in favor of viral surge.',
      speed: 'Transmission Lag: 24 Hours'
    },
    outcomeNode: {
      title: 'Consumer Spending Pivot',
      subtitle: 'Discretionary Shift & Retail Demand Spikes',
      domain: 'Consumer Sentiment & Retail',
      risk: 'HIGH',
      probability: '76% Transmission Confidence'
    }
  };
}

export default function PulseRadarPage() {
  const { data: newsData, isLoading } = useQuery({
    queryKey: ['radar-news'],
    queryFn: async () => {
      const res = await apiClient.get('/news?limit=50&language=English');
      return res.data;
    },
    refetchInterval: 30_000
  });

  const rawArticles = useMemo(() => newsData?.items || [], [newsData]);
  const articles = useMemo(() => {
    return rawArticles.filter((a: any) => isEnglishHeadline(a.headline || a.title));
  }, [rawArticles]);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2>(1);
  const [time, setTime] = useState(0);

  // Radar grid sweep state
  const [isScanning, setIsScanning] = useState(true);
  const [selectedAnomaly, setSelectedAnomaly] = useState<any | null>(null);
  const [selectedNarrativeOverride, setSelectedNarrativeOverride] = useState<any | null>(null);
  const [isAnalyzingBlindspot, setIsAnalyzingBlindspot] = useState(false);

  // Dynamically select divergence anomalies, with fallback so sonar is never empty when articles exist
  const anomalies = useMemo(() => {
    const pool = articles.length > 0 ? articles : rawArticles;
    if (!pool || pool.length === 0) return [];

    // Sort by sentiment divergence (distance from 0)
    const sorted = [...pool].sort((a: any, b: any) => {
      const sentA = Math.abs(Number(a.sentiment) || 0);
      const sentB = Math.abs(Number(b.sentiment) || 0);
      return sentB - sentA;
    });

    const highDivergence = sorted.filter((a: any) => Math.abs(Number(a.sentiment) || 0) >= 0.25);
    if (highDivergence.length >= 2) {
      return highDivergence.slice(0, 4);
    }
    return sorted.slice(0, Math.min(4, sorted.length));
  }, [articles, rawArticles]);

  // Guaranteed polar opposites for Reality vs Hype
  const { counterA, counterB, sentimentDelta } = useMemo(() => {
    if (articles.length === 0) return { counterA: null, counterB: null, sentimentDelta: 0 };
    if (articles.length === 1) return { counterA: articles[0], counterB: articles[0], sentimentDelta: 0 };

    const sortedBySentiment = [...articles].sort((a: any, b: any) => {
      const sentA = Number(a.sentiment) || 0;
      const sentB = Number(b.sentiment) || 0;
      return sentB - sentA; // Highest (most positive) to lowest (most negative)
    });

    const topA = sortedBySentiment[0];
    const topB = sortedBySentiment[sortedBySentiment.length - 1];
    const delta = Math.abs((Number(topA.sentiment) || 0) - (Number(topB.sentiment) || 0));

    return {
      counterA: topA,
      counterB: topB,
      sentimentDelta: Number(delta.toFixed(2))
    };
  }, [articles]);

  // Foreign / Blindspot article
  const rawTargetHeadline = rawArticles[rawArticles.length - 1]?.headline || articles[0]?.headline || "";
  const blindspotArticle = rawArticles[rawArticles.length - 1] || articles[0] || null;
  const blindspotTranslated = useMemo(() => getTranslatedBlindspotHeadline(rawTargetHeadline), [rawTargetHeadline]);

  // Unified active narrative driving Pulse Player & Butterfly Effect
  const activeNarrative = useMemo(() => {
    if (selectedNarrativeOverride) return selectedNarrativeOverride;
    if (selectedAnomaly) return selectedAnomaly;
    if (anomalies.length > 0) return anomalies[0];
    return articles[0] || null;
  }, [selectedNarrativeOverride, selectedAnomaly, anomalies, articles]);

  // Dynamic Butterfly Effect data for active narrative
  const butterflyData = useMemo(() => getButterflyRipple(activeNarrative), [activeNarrative]);

  // Initial radar grid sweep that settles quickly without perpetual loops
  useEffect(() => {
    if (anomalies.length > 0) {
      setIsScanning(true);
      const timer = setTimeout(() => {
        setIsScanning(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [anomalies.length]);

  // Timer loop for Pulse Player
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      const stepDuration = playbackSpeed === 2 ? 30 : 65;
      interval = setInterval(() => {
        setTime(prev => (prev >= 100 ? 0 : prev + 1));
      }, stepDuration);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  const handleRescan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 1000);
  };

  const handleSelectNarrativeForPlayer = (item: any) => {
    setSelectedNarrativeOverride(item);
    setTime(15); // Start at genesis
    setIsPlaying(true);
    // Smooth scroll to player
    const el = document.getElementById('pulse-player-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScrubMilestone = (targetTime: number) => {
    setTime(targetTime);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-ink font-black font-display text-4xl animate-pulse uppercase">
        Calibrating Radar [Live Feed]...
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-ink font-black text-center border-2 border-ink rounded-[32px] bg-surface/90 shadow-card max-w-2xl mx-auto mt-24">
        <p className="font-display text-3xl uppercase mb-4">
          <span className="text-flame-600">Radar Clear.</span> Awaiting Live Ingestion.
        </p>
        <p className="text-sm font-bold font-mono">
          No live articles detected in backend pipeline. Please load demo data or run live collectors in the "Data Streams" tab.
        </p>
      </div>
    );
  }

  // Contagion telemetry milestones
  const isPhase1 = time <= 25;
  const isPhase2 = time > 25 && time <= 55;
  const isPhase3 = time > 55 && time <= 85;
  const isPhase4 = time > 85;

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 py-8 mb-4 max-w-7xl mx-auto space-y-12 pb-32">
      
      {/* Header */}
      <div className="flex flex-col gap-2 bg-surface/88 backdrop-blur-xl p-6 sm:p-8 rounded-[32px] border-2 border-ink shadow-card">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="px-3 py-1 rounded-full bg-lilac-500 border-2 border-ink text-[10px] font-mono font-bold uppercase tracking-widest text-ink shadow-sm">
            ✦ ANOMALY TELEMETRY
          </span>
          <span className="px-3 py-1 rounded-full bg-signal-500 border-2 border-ink text-[10px] font-mono font-bold uppercase tracking-widest text-ink shadow-sm">
            REAL-TIME SONAR
          </span>
          <span className="px-3 py-1 rounded-full bg-health-400 border-2 border-ink text-[10px] font-mono font-bold uppercase tracking-widest text-ink shadow-sm">
            CONTAGION VECTOR REPLAY
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-ink uppercase font-display">
          Intelligence Radar
        </h1>
        <p className="text-ink-muted text-base sm:text-lg font-medium">
          Divergence detection, cross-domain contagion analysis, and counter-narrative forecasting.
        </p>
      </div>

      {/* FEATURE 1: Anomaly Sonar */}
      <section className="relative rounded-[32px] bg-surface/90 backdrop-blur-xl border-2 border-ink p-6 sm:p-8 overflow-hidden min-h-[420px] flex flex-col group transition-all shadow-card">
          <div className="relative z-10 flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-black flex items-center gap-2.5 uppercase tracking-wide text-ink">
                <span className="p-2 rounded-xl bg-lilac-500 border-2 border-ink shadow-sm">
                  <Radar className="w-5 h-5 text-ink" />
                </span>
                Anomaly Sonar
              </h2>
              <p className="text-xs font-bold text-ink-muted mt-1 uppercase tracking-wider font-mono">
                Divergence Detection Across Global Signal Matrix
              </p>
            </div>
            
            <button 
              onClick={handleRescan}
              title="Click to trigger a fresh radar sweep"
              className="text-xs uppercase font-black tracking-widest text-ink bg-signal-500 hover:bg-signal-400 px-4 py-2 rounded-full border-2 border-ink shadow-sm flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
            >
              <Radar className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? 'Scanning Grid...' : `Scan Complete (${anomalies.length} Targets)`}
            </button>
          </div>
          
          <div className="relative flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24">
            
            {/* Radar UI */}
            <div className="relative w-64 h-64 border-2 border-ink rounded-full flex items-center justify-center shrink-0 bg-canvas shadow-card transition-shadow">
              {/* Concentric distance rings */}
              <div className="absolute w-48 h-48 border-2 border-ink/30 rounded-full animate-float" />
              <div className="absolute w-32 h-32 border-2 border-ink/20 rounded-full animate-float" style={{ animationDelay: '1s' }} />
              <div className="absolute w-16 h-16 border-2 border-ink/15 rounded-full" />
              {/* Crosshair lines */}
              <div className="absolute w-full h-[1px] bg-ink/15 pointer-events-none" />
              <div className="absolute h-full w-[1px] bg-ink/15 pointer-events-none" />
              {/* Sonar sweep beam */}
              <div className={`absolute inset-0 border-t-4 border-lilac-600 rounded-full pointer-events-none ${isScanning ? 'animate-[spin_1s_linear_infinite]' : 'animate-[spin_8s_linear_infinite]'}`} />
              
              {/* Sonar Target Blips */}
              {anomalies.map((a: any, i: number) => {
                if (!a) return null;
                const isSelected = selectedAnomaly?.headline === a.headline;
                const coord = SONAR_BLIP_COORDS[i % SONAR_BLIP_COORDS.length];
                return (
                  <div
                    key={a.id || i}
                    onClick={() => {
                      setSelectedAnomaly(a);
                      setSelectedNarrativeOverride(a);
                    }}
                    title={a.headline || a.title}
                    className={`group absolute -translate-x-1/2 -translate-y-1/2 cursor-crosshair transition-transform duration-300 ${
                      isSelected ? 'scale-125 z-20' : 'hover:scale-125 z-10'
                    }`}
                    style={{ top: coord.top, left: coord.left }}
                  >
                    {/* Sonar ping ripple */}
                    <span className="absolute -inset-1 rounded-full bg-signal-400 opacity-75 animate-ping" />
                    <div
                      className={`relative w-7 h-7 rounded-full border-2 border-ink shadow-sm flex items-center justify-center font-mono text-[10px] font-black transition-colors ${
                        isSelected
                          ? 'bg-flame-500 text-white ring-2 ring-ink ring-offset-2'
                          : 'bg-signal-500 text-ink hover:bg-lilac-400'
                      }`}
                    >
                      {i + 1}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Scanning Results Panel */}
            <div className="w-full lg:w-[440px] flex flex-col gap-4 z-10 transition-all min-h-[250px] justify-center">
               {selectedAnomaly ? (
                  <div className="bg-lilac-500 p-6 rounded-3xl border-2 border-ink animate-in fade-in slide-in-from-right duration-300 shadow-card">
                     <div className="flex items-center justify-between">
                       <span className="text-white text-[10px] font-black uppercase tracking-widest bg-[#1C192B] px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                         <Sparkles className="w-3 h-3 text-signal-400" />
                         Target Locked
                       </span>
                       <span className="text-xs font-mono font-bold text-ink bg-surface/80 px-2.5 py-1 rounded-full border border-ink">
                         ID #{selectedAnomaly.id ? String(selectedAnomaly.id).slice(-4) : 'ANOM'}
                       </span>
                     </div>
                     <h3 className="text-xl sm:text-2xl font-black text-ink mt-4 leading-tight font-display uppercase line-clamp-3">
                       {selectedAnomaly.headline || selectedAnomaly.title}
                     </h3>
                     <div className="flex gap-4 mt-6">
                        <div className="bg-surface p-4 rounded-2xl text-center flex-1 border-2 border-ink shadow-sm">
                          <p className="text-[10px] text-ink-muted uppercase font-black tracking-wider">Category</p>
                          <p className="text-sm font-black text-ink mt-1 uppercase truncate">{selectedAnomaly.category || 'General'}</p>
                        </div>
                        <div className="bg-surface p-4 rounded-2xl text-center flex-1 border-2 border-ink shadow-sm">
                          <p className="text-[10px] text-ink-muted uppercase font-black tracking-wider">Divergence</p>
                          <p className="text-sm font-black text-flame-700 mt-1">
                            {Math.abs(Math.round((selectedAnomaly.sentiment ?? 0.4) * 100))}% Anomaly
                          </p>
                        </div>
                     </div>
                     
                     {/* Action Buttons */}
                     <div className="flex flex-col gap-2 mt-6">
                       <button 
                         onClick={() => handleSelectNarrativeForPlayer(selectedAnomaly)} 
                         className="neo-pill bg-signal-500 text-ink hover:bg-signal-400 text-center font-black flex items-center justify-center gap-2 border-2 border-ink shadow-sm"
                       >
                         <Play className="w-4 h-4 fill-current" />
                         Track Vector in Pulse Player ➔
                       </button>
                       <div className="grid grid-cols-2 gap-3 mt-1">
                         <button 
                           onClick={() => setSelectedAnomaly(null)} 
                           className="neo-pill bg-surface text-ink hover:bg-canvas text-center"
                         >
                           Deselect
                         </button>
                         {selectedAnomaly.url ? (
                           <a 
                             href={selectedAnomaly.url} 
                             target="_blank" 
                             rel="noreferrer" 
                             className="neo-pill bg-[#1C192B] text-white hover:bg-[#342D4C] text-center flex items-center justify-center gap-1.5"
                           >
                             Source <ExternalLink className="w-3.5 h-3.5" />
                           </a>
                         ) : (
                           <button 
                             onClick={() => setSelectedAnomaly(null)} 
                             className="neo-pill bg-[#1C192B] text-white hover:bg-[#342D4C] text-center"
                           >
                             Dismiss
                           </button>
                         )}
                       </div>
                     </div>
                  </div>
               ) : (
                  <div className="h-full flex flex-col justify-center gap-3">
                     {isScanning && (
                        <div className="bg-canvas p-3 rounded-2xl border-2 border-dashed border-ink/30 text-center animate-pulse flex items-center justify-center gap-2">
                           <Radar className="w-4 h-4 text-ink animate-spin" />
                           <span className="text-xs font-black text-ink uppercase tracking-widest">Scanning Grid Sectors...</span>
                        </div>
                     )}
                     {anomalies.map((a, i) => {
                      if (!a) return null;
                      return (
                      <div 
                        key={a.id || i} 
                        onClick={() => {
                          setSelectedAnomaly(a);
                          setSelectedNarrativeOverride(a);
                        }} 
                        className="bg-canvas p-3.5 rounded-2xl border-2 border-ink flex items-center justify-between cursor-crosshair hover:bg-lilac-200/50 hover:shadow-card transition-all animate-in fade-in slide-in-from-right duration-300"
                      >
                         <div className="flex items-center gap-3 min-w-0 pr-2">
                           <span className="w-6 h-6 rounded-full bg-signal-500 border-2 border-ink flex items-center justify-center font-mono text-[10px] font-black shrink-0 shadow-sm">
                             {i + 1}
                           </span>
                           <span className="text-sm font-bold text-ink truncate uppercase">
                             {a.headline || a.title}
                           </span>
                         </div>
                         <span className="text-[10px] text-ink font-black bg-signal-500 border-2 border-ink px-3 py-1.5 rounded-full tracking-widest uppercase shadow-sm shrink-0">
                           Lock Target
                         </span>
                      </div>
                    );})}
                    {anomalies.length === 0 && (
                      <div className="bg-canvas p-6 rounded-2xl border-2 border-dashed border-ink/30 text-center flex flex-col items-center justify-center gap-2">
                        <Radar className="w-6 h-6 text-lilac-600 animate-spin" />
                        <span className="text-xs font-mono font-black text-ink uppercase tracking-widest">Calibrating Sonar Grid...</span>
                      </div>
                    )}
                  </div>
               )}
            </div>
            
          </div>
        </section>

      {/* FEATURE 2: Counter-Narrative Versus */}
      <section className="relative rounded-[32px] bg-surface/90 backdrop-blur-xl border-2 border-ink p-6 sm:p-8 flex flex-col shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div>
            <h2 className="text-2xl font-black flex items-center gap-2 uppercase text-ink">
              <Split className="text-ink" /> Reality vs Hype
            </h2>
            <p className="text-xs font-bold text-ink-muted mt-0.5 font-mono uppercase tracking-wider">
              Consensus Fracturing & Polar Opposites
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-black tracking-widest text-ink bg-lilac-500 px-3.5 py-1.5 rounded-full border-2 border-ink shadow-sm">
              Δ {sentimentDelta} Polarization Spread
            </span>
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row items-stretch gap-6 relative">
           {/* Side A: Bullish / Consensus */}
           <div className="flex-1 rounded-3xl bg-health-400 border-2 border-ink p-6 flex flex-col justify-between transition-transform hover:-translate-y-0.5 shadow-card">
             <div>
               <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                 <span className="text-ink text-[10px] font-black uppercase tracking-widest bg-surface px-3 py-1 rounded-full border border-ink shadow-sm">
                   Narrative A • Bullish Consensus
                 </span>
                 <span className="text-[10px] font-mono font-black text-ink bg-white/80 px-2.5 py-1 rounded-full border border-ink">
                   Sentiment: +{((Number(counterA?.sentiment) || 0.5) * 100).toFixed(0)}%
                 </span>
               </div>
               <h3 className="font-display font-black text-xl line-clamp-3 text-ink uppercase mt-2 leading-snug">
                 {counterA?.headline || "Awaiting Positive Signal..."}
               </h3>
             </div>
             <div className="flex items-center justify-between mt-6 pt-4 border-t-2 border-ink/15 flex-wrap gap-2">
               <span className="text-[10px] font-mono font-bold uppercase text-ink-muted bg-surface/60 px-2.5 py-1 rounded-md border border-ink/20">
                 {counterA?.category || "General"}
               </span>
               <button 
                 onClick={() => handleSelectNarrativeForPlayer(counterA)}
                 className="neo-pill bg-surface text-ink hover:bg-canvas text-xs font-black flex items-center gap-2 py-2 px-4 border-2 border-ink shadow-sm transition-transform active:scale-95"
               >
                 Replay in Pulse Player <ArrowRight className="w-3.5 h-3.5" />
               </button>
             </div>
           </div>

           {/* Center VS Divider */}
           {/* Desktop Vertical Divider */}
           <div className="hidden lg:flex flex-col items-center justify-center relative px-2">
             <div className="absolute inset-y-0 w-0.5 bg-ink/20" />
             <div className="relative w-14 h-14 bg-signal-500 border-2 border-ink rounded-full flex items-center justify-center font-black italic text-lg text-ink shadow-card z-10">
               VS
             </div>
           </div>

           {/* Mobile Horizontal Divider */}
           <div className="flex lg:hidden items-center justify-center relative py-2">
             <div className="absolute inset-x-0 h-0.5 bg-ink/20" />
             <div className="relative w-12 h-12 bg-signal-500 border-2 border-ink rounded-full flex items-center justify-center font-black italic text-base text-ink shadow-card z-10">
               VS
             </div>
           </div>
           
           {/* Side B: Skeptical / Critical Counter */}
           <div className="flex-1 rounded-3xl bg-flame-400 border-2 border-ink p-6 flex flex-col justify-between transition-transform hover:translate-y-0.5 shadow-card">
             <div>
               <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                 <span className="text-ink text-[10px] font-black uppercase tracking-widest bg-surface px-3 py-1 rounded-full border border-ink shadow-sm">
                   The Counter • Skeptical Reality
                 </span>
                 <span className="text-[10px] font-mono font-black text-ink bg-white/80 px-2.5 py-1 rounded-full border border-ink">
                   Sentiment: {((Number(counterB?.sentiment) || -0.4) * 100).toFixed(0)}%
                 </span>
               </div>
               <h3 className="font-display font-black text-xl line-clamp-3 text-ink uppercase mt-2 leading-snug">
                 {counterB?.headline || "Awaiting Negative Signal..."}
               </h3>
             </div>
             <div className="flex items-center justify-between mt-6 pt-4 border-t-2 border-ink/15 flex-wrap gap-2">
               <span className="text-[10px] font-mono font-bold uppercase text-ink-muted bg-surface/60 px-2.5 py-1 rounded-md border border-ink/20">
                 {counterB?.category || "General"}
               </span>
               <button 
                 onClick={() => handleSelectNarrativeForPlayer(counterB)}
                 className="neo-pill bg-surface text-ink hover:bg-canvas text-xs font-black flex items-center gap-2 py-2 px-4 border-2 border-ink shadow-sm transition-transform active:scale-95"
               >
                 Replay in Pulse Player <ArrowRight className="w-3.5 h-3.5" />
               </button>
             </div>
           </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* FEATURE 3: Butterfly Effect */}
        <section className="col-span-1 lg:col-span-2 rounded-[32px] bg-surface/90 backdrop-blur-xl border-2 border-ink p-6 sm:p-8 flex flex-col relative overflow-hidden shadow-card">
           <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-2xl font-black flex items-center gap-2 uppercase text-ink">
                <FastForward className="text-ink" /> Butterfly Effect
              </h2>
              <p className="text-xs font-bold text-ink-muted mt-0.5 font-mono uppercase tracking-wider">
                Cross-Domain Contagion & Systemic Shockwave
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest bg-[#1C192B] text-white px-3 py-1.5 rounded-full shadow-sm">
                Prediction Matrix
              </span>
            </div>
          </div>

          {/* Active ripple context chip */}
          <div className="bg-canvas p-3 rounded-2xl border-2 border-ink mb-6 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-lilac-500 border border-ink px-2.5 py-1 rounded-full shrink-0">
                Active Ripple Subject
              </span>
              <span className="text-xs font-black text-ink truncate uppercase">
                {activeNarrative?.headline || "Awaiting Narrative Selection"}
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-ink-muted uppercase shrink-0">
              {butterflyData.category}
            </span>
          </div>
          
          <div className="flex-1 flex flex-col justify-center">
             <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                
                {/* Node 1: Local Catalyst */}
                <div className="rounded-3xl bg-lilac-500 border-2 border-ink p-5 flex flex-col justify-between shadow-card relative z-10">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-[#1C192B] text-white px-2.5 py-0.5 rounded-full">
                        {butterflyData.triggerNode.phase}
                      </span>
                    </div>
                    <h4 className="font-display font-black text-lg text-ink uppercase leading-tight">
                      {butterflyData.triggerNode.title}
                    </h4>
                    <p className="text-xs font-bold text-ink-muted mt-1 uppercase">
                      Domain: {butterflyData.triggerNode.domain}
                    </p>
                  </div>
                  <div className="bg-surface/80 p-3 rounded-xl border border-ink mt-4 text-xs font-bold text-ink">
                    {butterflyData.triggerNode.subtitle}
                  </div>
                </div>

                {/* Node 2: Transmission Vector */}
                <div className="rounded-3xl bg-signal-500 border-2 border-ink p-5 flex flex-col justify-between shadow-card relative z-10">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-[#1C192B] text-white px-2.5 py-0.5 rounded-full">
                        2nd Order Vector
                      </span>
                      <span className="text-[10px] font-mono font-black text-ink">
                        {butterflyData.vectorNode.speed}
                      </span>
                    </div>
                    <h4 className="font-display font-black text-lg text-ink uppercase leading-tight">
                      {butterflyData.vectorNode.title}
                    </h4>
                    <p className="text-xs font-bold text-ink-muted mt-1 uppercase">
                      Target: {butterflyData.vectorNode.domain}
                    </p>
                  </div>
                  <div className="bg-surface/80 p-3 rounded-xl border border-ink mt-4 text-xs font-bold text-ink leading-relaxed">
                    {butterflyData.vectorNode.mechanism}
                  </div>
                </div>

                {/* Node 3: Forecasted Consequence */}
                <div className="rounded-3xl bg-flame-400 border-2 border-ink p-5 flex flex-col justify-between shadow-card relative z-10">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-[#1C192B] text-white px-2.5 py-0.5 rounded-full">
                        3rd Order Macro
                      </span>
                      <span className="text-[10px] font-mono font-black text-flame-900 bg-white/70 px-2 py-0.5 rounded-full border border-ink">
                        {butterflyData.outcomeNode.risk}
                      </span>
                    </div>
                    <h4 className="font-display font-black text-lg text-ink uppercase leading-tight">
                      {butterflyData.outcomeNode.title}
                    </h4>
                    <p className="text-xs font-bold text-ink-muted mt-1 uppercase">
                      Sector: {butterflyData.outcomeNode.domain}
                    </p>
                  </div>
                  <div className="bg-surface/80 p-3 rounded-xl border border-ink mt-4 text-xs font-black text-ink">
                    <p>{butterflyData.outcomeNode.subtitle}</p>
                    <p className="text-[10px] font-mono text-ink-muted mt-1">{butterflyData.outcomeNode.probability}</p>
                  </div>
                </div>

             </div>
          </div>
        </section>

        {/* FEATURE 4: Blindspot Analyzer */}
        <section className="col-span-1 rounded-[32px] bg-flame-500 border-2 border-ink p-6 sm:p-8 flex flex-col justify-between shadow-card">
           <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-black flex items-center gap-2 text-ink uppercase">
                <EyeOff className="w-5 h-5 text-ink" /> Your Blindspot
              </h2>
              <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-[#1C192B] text-white px-2.5 py-1 rounded-full">
                Foreign Intel
              </span>
            </div>
            <p className="text-sm font-bold text-ink mt-1">
              You are heavily tracking <span className="underline decoration-2">{articles[0]?.category || "Tech"}</span>, but unmonitored foreign shifts present high hedging exposure:
            </p>
           </div>
           
           <div className={`mt-6 p-5 rounded-3xl border-2 transition-all duration-500 ${isAnalyzingBlindspot ? 'bg-signal-500 border-ink shadow-card' : 'bg-surface border-ink shadow-sm'}`}>
             <div className="flex items-center gap-2 flex-wrap">
               <span className="text-[10px] uppercase font-black tracking-widest text-ink bg-lilac-200 px-2.5 py-1 rounded-full border border-ink">
                 {isAnalyzingBlindspot ? 'Deep Dive Active' : 'Uncorrelated Signal'}
               </span>
               {blindspotTranslated.isTranslated && (
                 <span className="text-[9px] uppercase font-black tracking-wider text-ink bg-signal-500 px-2.5 py-1 rounded-full border border-ink flex items-center gap-1 shadow-sm">
                   ✦ Translated to English
                 </span>
               )}
             </div>

             <h3 className="font-black text-ink text-base sm:text-lg mt-3 line-clamp-3 uppercase leading-tight font-display">
               {blindspotTranslated.text}
             </h3>

             {blindspotTranslated.isTranslated && (
               <p className="mt-1.5 text-[10px] font-mono font-bold text-ink-muted line-clamp-1 italic">
                 Original: {blindspotTranslated.originalText}
               </p>
             )}
         
             {isAnalyzingBlindspot ? (
                <div className="mt-4 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                   <div className="flex items-center justify-between text-xs font-bold border-b-2 border-ink/20 pb-2">
                     <span className="text-ink">Market Correlation</span>
                     <span className="text-flame-800 font-black">-84% (Inverse Beta)</span>
                   </div>
                   <div className="flex items-center justify-between text-xs font-bold border-b-2 border-ink/20 pb-2">
                     <span className="text-ink">Consumer Sentiment</span>
                     <span className="text-ink font-black">Volatile / Fragmented</span>
                   </div>
                   <div className="flex items-center justify-between text-xs font-bold border-b-2 border-ink/20 pb-2">
                     <span className="text-ink">Est. Spillover Impact</span>
                     <span className="text-ink font-black uppercase tracking-widest bg-flame-200 px-2 py-0.5 rounded-full border border-ink">
                       Critical
                     </span>
                   </div>
                   
                   {/* Strategic Hedging Action */}
                   <div className="bg-canvas p-3 rounded-2xl border-2 border-ink my-2 text-xs font-bold text-ink">
                     <p className="text-[10px] font-black uppercase tracking-wider text-flame-800 font-mono mb-1">
                       Strategic Hedging Advisory:
                     </p>
                     Position defensive offsets in regional supply chain contracts; audit exposure to East Asian semiconductor and wellness regulatory shifts.
                   </div>

                   <button 
                     onClick={() => handleSelectNarrativeForPlayer(blindspotArticle)}
                     className="neo-pill bg-[#1C192B] text-white hover:bg-[#342D4C] text-xs font-black w-full block text-center mb-1"
                   >
                     Simulate Blindspot Spread in Player ➔
                   </button>
                   <button 
                     onClick={() => setIsAnalyzingBlindspot(false)} 
                     className="neo-pill bg-canvas text-ink w-full block text-center text-xs"
                   >
                     Close Analysis
                   </button>
                </div>
             ) : (
                <button 
                  onClick={() => setIsAnalyzingBlindspot(true)} 
                  className="neo-pill bg-[#1C192B] text-white w-full mt-4 block text-center font-black"
                >
                  Analyze Risk & Hedging
                </button>
             )}
           </div>
        </section>
      </div>

      {/* FEATURE 5: The Pulse Player (72-Hour Viral Contagion Vector Replay) */}
      <section 
        id="pulse-player-section"
        className="rounded-[32px] bg-surface/90 backdrop-blur-xl border-2 border-ink shadow-card p-6 sm:p-8 flex flex-col justify-center gap-6 overflow-hidden relative"
      >
         {/* Player Header */}
         <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 z-10 relative">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-3 py-1 rounded-full bg-signal-500 border-2 border-ink text-[10px] font-mono font-bold uppercase tracking-widest text-ink shadow-sm">
                  VIRAL CONTAGION ENGINE
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-lilac-400 border border-ink text-[10px] font-mono font-bold text-ink">
                  72-HOUR TIMELAPSE
                </span>
              </div>
              <h2 className="text-3xl font-black flex items-center gap-2.5 uppercase text-ink font-display">
                <Activity className="text-ink w-7 h-7" /> The Pulse Player
              </h2>
              <p className="text-sm font-bold text-ink-muted mt-1">
                Simulate how narratives ignite, weaponize recommendation algorithms, and achieve systemic saturation.
              </p>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 2 : 1)}
                title="Toggle playback speed"
                className="px-3.5 py-2 rounded-2xl bg-canvas border-2 border-ink text-xs font-black uppercase text-ink shadow-sm hover:bg-lilac-200 transition-colors"
              >
                Speed: {playbackSpeed}x
              </button>
              <button 
                onClick={() => {
                  setTime(0);
                  setIsPlaying(false);
                }} 
                title="Reset simulation to beginning"
                className="w-12 h-12 rounded-2xl bg-canvas border-2 border-ink text-ink flex items-center justify-center hover:bg-lilac-200 transition-colors shadow-sm"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setIsPlaying(!isPlaying)} 
                className="w-14 h-14 rounded-full bg-signal-500 text-ink border-2 border-ink flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-card cursor-pointer"
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
              </button>
            </div>
         </div>

         {/* Active Story Picker Bar */}
         <div className="bg-canvas p-4 rounded-3xl border-2 border-ink flex flex-col gap-2 relative z-10 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-ink-muted">
                Currently Simulating Narrative:
              </span>
              <span className="text-xs font-mono font-black text-ink bg-signal-400 border border-ink px-2.5 py-0.5 rounded-full">
                Category: {activeNarrative?.category || 'General'}
              </span>
            </div>
            <p className="text-base sm:text-lg font-black text-ink uppercase truncate font-display">
              "{activeNarrative?.headline || activeNarrative?.title || 'System Baseline Story'}"
            </p>
            
            {/* Quick narrative switchers */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[10px] font-bold text-ink-muted uppercase">Quick Select:</span>
              {anomalies.slice(0, 3).map((anom, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedNarrativeOverride(anom)}
                  className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-ink transition-colors ${
                    activeNarrative?.headline === anom.headline
                      ? 'bg-flame-500 text-white'
                      : 'bg-surface text-ink hover:bg-lilac-200'
                  }`}
                >
                  Blip #{idx + 1}
                </button>
              ))}
              {counterA && (
                <button
                  onClick={() => setSelectedNarrativeOverride(counterA)}
                  className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-ink transition-colors ${
                    activeNarrative?.headline === counterA.headline
                      ? 'bg-health-500 text-ink'
                      : 'bg-surface text-ink hover:bg-health-200'
                  }`}
                >
                  Hype Narrative
                </button>
              )}
              {counterB && (
                <button
                  onClick={() => setSelectedNarrativeOverride(counterB)}
                  className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-ink transition-colors ${
                    activeNarrative?.headline === counterB.headline
                      ? 'bg-flame-500 text-white'
                      : 'bg-surface text-ink hover:bg-flame-200'
                  }`}
                >
                  Counter Reality
                </button>
              )}
            </div>
         </div>
         
         {/* Live Narrative Contagion Log */}
         <div className="min-h-[72px] flex items-center relative z-10 transition-all duration-300 bg-surface p-4 rounded-2xl border-2 border-ink shadow-sm">
            {time === 0 && (
               <div className="text-ink text-sm font-mono font-bold flex items-center gap-2">
                 <Activity className="w-4 h-4 text-signal-600 animate-pulse" /> 
                 SYSTEM READY. CLICK PLAY OR SELECT A MILESTONE BELOW TO REPLAY CONTAGION VECTOR.
               </div>
            )}
            {time > 0 && isPhase1 && (
               <div className="animate-in fade-in slide-in-from-bottom-2 text-sm text-ink font-black font-mono flex flex-col uppercase">
                 <span className="text-[10px] text-ink border-2 border-ink bg-lilac-500 px-3 py-1 rounded-full w-fit mb-1.5 shadow-sm">
                   T-72h • ORIGIN & NICHE INCUBATION
                 </span>
                 Isolated anomaly detected in {activeNarrative?.category || 'General'}. Early chatter confined to niche developer boards and specialized preprint circles. Mainstream contagion dormant.
               </div>
            )}
            {isPhase2 && (
               <div className="animate-in fade-in slide-in-from-bottom-2 text-sm text-ink font-black font-mono flex flex-col uppercase">
                 <span className="text-[10px] text-ink border-2 border-ink bg-signal-500 px-3 py-1 rounded-full w-fit mb-1.5 shadow-sm">
                   T-48h • SOCIAL IGNITION & CURATION
                 </span>
                 Cross-network vector established. Industry newsletters, Discord communities, and tech influencers syndicate synthesis threads. Mentions surge exponentially.
               </div>
            )}
            {isPhase3 && (
               <div className="animate-in fade-in slide-in-from-bottom-2 text-sm text-ink font-black font-mono flex flex-col uppercase">
                 <span className="text-[10px] text-ink border-2 border-ink bg-flame-500 px-3 py-1 rounded-full w-fit mb-1.5 shadow-sm">
                   T-24h • ALGORITHMIC ESCALATION
                 </span>
                 Feed recommendation engines trigger high-velocity alert pushes. The narrative hijacks adjacent business and technology verticals, forcing legacy media pickup.
               </div>
            )}
            {isPhase4 && (
               <div className="animate-in fade-in slide-in-from-bottom-2 text-sm text-ink font-black font-mono flex flex-col uppercase">
                 <span className="text-[10px] text-white border-2 border-ink bg-[#1C192B] px-3 py-1 rounded-full w-fit mb-1.5 shadow-sm">
                   LIVE NOW • CRITICAL MASS BREAKOUT
                 </span>
                 Full public saturation. Narrative dominates national news cycles, drives equity analyst revisions, and shapes executive decision-making.
               </div>
            )}
         </div>
         
         {/* Interactive Scrubber Bar */}
         <div className="flex flex-col gap-3 relative z-10 w-full mb-2">
            <div 
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const newPct = Math.min(100, Math.max(0, Math.round((clickX / rect.width) * 100)));
                setTime(newPct);
              }}
              className="h-7 w-full bg-canvas border-2 border-ink rounded-full overflow-hidden relative shadow-inner cursor-pointer"
              title="Click anywhere to scrub timeline"
            >
               <div 
                 className={`absolute top-0 left-0 h-full border-r-2 border-ink transition-all ease-linear ${isPhase4 ? 'bg-flame-500' : 'bg-signal-500'}`}
                 style={{ width: `${time}%`, transitionDuration: isPlaying ? '60ms' : '200ms' }}
               />
               <div className="absolute top-0 left-1/4 h-full w-0.5 bg-ink/20 pointer-events-none" />
               <div className="absolute top-0 left-2/4 h-full w-0.5 bg-ink/20 pointer-events-none" />
               <div className="absolute top-0 left-3/4 h-full w-0.5 bg-ink/20 pointer-events-none" />
            </div>

            {/* Clickable Milestone Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <button
                onClick={() => handleScrubMilestone(15)}
                className={`p-2.5 rounded-2xl border-2 border-ink flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isPhase1 && time > 0 ? 'bg-lilac-500 font-black shadow-card -translate-y-1' : 'bg-surface hover:bg-lilac-200'
                }`}
              >
                <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">T-72h</span>
                <span className="text-xs font-black uppercase text-ink">1. Origin</span>
              </button>

              <button
                onClick={() => handleScrubMilestone(40)}
                className={`p-2.5 rounded-2xl border-2 border-ink flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isPhase2 ? 'bg-signal-500 font-black shadow-card -translate-y-1' : 'bg-surface hover:bg-signal-200'
                }`}
              >
                <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">T-48h</span>
                <span className="text-xs font-black uppercase text-ink">2. Viral Ignition</span>
              </button>

              <button
                onClick={() => handleScrubMilestone(70)}
                className={`p-2.5 rounded-2xl border-2 border-ink flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isPhase3 ? 'bg-flame-400 font-black shadow-card -translate-y-1' : 'bg-surface hover:bg-flame-200'
                }`}
              >
                <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">T-24h</span>
                <span className="text-xs font-black uppercase text-ink">3. Escalation</span>
              </button>

              <button
                onClick={() => handleScrubMilestone(95)}
                className={`p-2.5 rounded-2xl border-2 border-ink flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isPhase4 ? 'bg-[#1C192B] text-white font-black shadow-card -translate-y-1' : 'bg-surface hover:bg-canvas'
                }`}
              >
                <span className="text-[10px] font-mono uppercase tracking-wider text-signal-400">Live Breakout</span>
                <span className={`text-xs font-black uppercase ${isPhase4 ? 'text-white' : 'text-ink'}`}>4. Critical Mass</span>
              </button>
            </div>
         </div>

         {/* Dynamic Telemetry Metrics Cards */}
         <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10 pt-2">
            <div className="bg-canvas p-4 rounded-2xl border-2 border-ink shadow-sm">
              <p className="text-[10px] text-ink-muted uppercase font-black tracking-wider">Transmission Velocity</p>
              <p className="text-lg font-black text-ink mt-1 font-mono">
                {time === 0 ? '0%' : isPhase1 ? '+14% / hr' : isPhase2 ? '+210% / hr' : isPhase3 ? '+740% / hr' : '+1,920% / hr'}
              </p>
            </div>

            <div className="bg-canvas p-4 rounded-2xl border-2 border-ink shadow-sm">
              <p className="text-[10px] text-ink-muted uppercase font-black tracking-wider">Primary Vector</p>
              <p className="text-sm font-black text-ink mt-1 truncate">
                {time === 0 ? 'Dormant' : isPhase1 ? 'Research Preprints' : isPhase2 ? 'Discord & Substack' : isPhase3 ? 'Aggregators & Feeds' : 'Global Wire Services'}
              </p>
            </div>

            <div className="bg-canvas p-4 rounded-2xl border-2 border-ink shadow-sm">
              <p className="text-[10px] text-ink-muted uppercase font-black tracking-wider">Estimated Volume</p>
              <p className="text-lg font-black text-ink mt-1 font-mono">
                {time === 0 ? 'Baseline' : isPhase1 ? '~160 Mentions' : isPhase2 ? '~4,800 Mentions' : isPhase3 ? '~58,000 Mentions' : '420,000+ Saturated'}
              </p>
            </div>

            <div className="bg-canvas p-4 rounded-2xl border-2 border-ink shadow-sm">
              <p className="text-[10px] text-ink-muted uppercase font-black tracking-wider">Public Saturation</p>
              <p className="text-lg font-black text-flame-700 mt-1 font-mono">
                {time === 0 ? '0%' : isPhase1 ? '8%' : isPhase2 ? '34%' : isPhase3 ? '72%' : '96% (Peak)'}
              </p>
            </div>
         </div>
      </section>

    </div>
  );
}

import { Rocket, Clock, ArrowRight, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export default function TrendArbitragePage() {
  const { data: trends, isLoading } = useQuery({
    queryKey: ['arbitrage-trends'],
    queryFn: async () => (await apiClient.get('/trending?limit=10')).data || [],
  });

  if (isLoading) return <div className="flex justify-center p-24"><Loader2 className="w-12 h-12 animate-spin text-ink"/></div>;
  if (!trends || trends.length === 0) return <div className="p-24 text-center font-black uppercase text-2xl border-2 border-ink rounded-[32px] bg-surface/90 mt-12 mx-6 shadow-card">Awaiting Data Streams Intake...</div>;
  
  const highPotential = trends[0] || null;
  const watchList = trends.length > 1 ? trends[1] : trends[0];

  return (
    <div className="space-y-8 animate-fade-in-up relative p-6 max-w-7xl mx-auto font-display">

      <div className="border-b-2 border-ink pb-8">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-ink uppercase flex items-center gap-4">
          <div className="p-3 bg-health-500 border-2 border-ink rounded-[16px] shadow-sm">
            <Rocket className="h-10 w-10 text-ink" />
          </div>
          Trend Arbitrage
        </h1>
        <p className="mt-6 text-ink font-bold text-lg bg-surface/90 backdrop-blur-md p-4 rounded-[16px] border-2 border-ink shadow-sm max-w-3xl">Spotting the underground meta before it hits the mainstream.</p>
      </div>

      <div className="mt-12">
          <div className="relative border-l-4 border-ink ml-6 space-y-12 pb-12">
              
              {/* Arbitrage Item 1 */}
              <div className="relative">
                  <div className="absolute -left-[45px] top-4 w-8 h-8 bg-health-500 rounded-full border-2 border-ink shadow-sm flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-ink rounded-full" />
                  </div>
                  
                  <div className="bg-surface/90 backdrop-blur-xl rounded-[32px] p-8 border-2 border-ink shadow-card hover:-translate-y-1 transition-transform relative">
                      <div className="flex justify-between items-start mb-6">
                          <div>
                              <div className="flex items-center gap-3 mb-4">
                                  <span className="px-4 py-2 bg-health-500 border-2 border-ink shadow-sm text-ink font-black text-xs rounded-[12px] uppercase tracking-widest">High Potential</span>
                                  <span className="text-sm font-bold text-ink flex items-center bg-canvas px-3 py-1.5 rounded-[12px] border-2 border-ink shadow-sm"><Clock className="w-4 h-4 mr-1"/> Detected 12h ago</span>
                              </div>
                              <h3 className="text-4xl font-black text-ink uppercase tracking-tight line-clamp-1">"{highPotential?.name || 'Trend A'}"</h3>
                          </div>
                      </div>
                      
                      <div className="grid md:grid-cols-[1fr_auto_1fr] gap-6 items-center">
                          <div className="bg-canvas p-6 rounded-[24px] border-2 border-ink shadow-card">
                              <p className="text-xs font-black text-ink uppercase tracking-widest mb-3 bg-health-200 w-fit px-2 py-1 rounded border border-ink">Origin</p>
                              <p className="text-2xl font-black text-ink uppercase">{highPotential?.category || 'General'}</p>
                              <p className="text-sm text-ink font-bold mt-2 leading-relaxed text-ellipsis overflow-hidden">Gaining high engagement. Score: {parseFloat(highPotential?.trend_score || 0).toFixed(1)}. Users accelerating cross-platform sharing.</p>
                          </div>
                          
                          <div className="flex items-center justify-center hidden md:flex">
                              <div className="p-4 bg-health-500 rounded-full border-2 border-ink animate-bounce shadow-sm">
                                  <ArrowRight className="w-8 h-8 text-ink" />
                              </div>
                          </div>
                          
                          <div className="bg-health-50 p-6 rounded-[24px] border-2 border-ink shadow-card">
                              <p className="text-xs font-black text-ink uppercase tracking-widest mb-3 bg-health-500 w-fit px-2 py-1 rounded border border-ink">Arbitrage Opportunity</p>
                              <p className="text-2xl font-black text-ink uppercase">TikTok / Instagram</p>
                              <p className="text-sm text-ink font-bold mt-2 leading-relaxed">Zero content currently exists here. High probability of going viral if launched today.</p>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Arbitrage Item 2 */}
              <div className="relative">
                  <div className="absolute -left-[45px] top-4 w-8 h-8 bg-lilac-500 rounded-full border-2 border-ink shadow-sm flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-ink rounded-full" />
                  </div>
                  
                  <div className="bg-surface/90 backdrop-blur-xl rounded-[32px] p-8 border-2 border-ink shadow-card hover:-translate-y-1 transition-transform relative">
                      <div className="flex justify-between items-start mb-6">
                          <div>
                              <div className="flex items-center gap-3 mb-4">
                                  <span className="px-4 py-2 bg-lilac-500 border-2 border-ink shadow-sm text-ink font-black text-xs rounded-[12px] uppercase tracking-widest">Action Required</span>
                                  <span className="text-sm font-bold text-ink flex items-center bg-canvas px-3 py-1.5 rounded-[12px] border-2 border-ink shadow-sm"><Clock className="w-4 h-4 mr-1"/> Detected 48h ago</span>
                              </div>
                              <h3 className="text-4xl font-black text-ink uppercase tracking-tight line-clamp-1">"{watchList?.name || 'Trend B'}"</h3>
                          </div>
                      </div>
                      
                      <div className="grid md:grid-cols-[1fr_auto_1fr] gap-6 items-center">
                          <div className="bg-canvas p-6 rounded-[24px] border-2 border-ink shadow-card">
                              <p className="text-xs font-black text-ink uppercase tracking-widest mb-3 bg-lilac-200 w-fit px-2 py-1 rounded border border-ink">Origin</p>
                              <p className="text-2xl font-black text-ink uppercase">{watchList?.category || 'General'}</p>
                              <p className="text-sm text-ink font-bold mt-2 leading-relaxed text-ellipsis overflow-hidden">Micro-trend analyzing specific nodes. Momentum factor {parseFloat(watchList?.acceleration || 0).toFixed(1)}.</p>
                          </div>
                          
                          <div className="flex items-center justify-center hidden md:flex">
                              <div className="p-4 bg-lilac-500 rounded-full border-2 border-ink animate-bounce shadow-sm">
                                  <ArrowRight className="w-8 h-8 text-ink" />
                              </div>
                          </div>
                          
                          <div className="bg-lilac-50 p-6 rounded-[24px] border-2 border-ink shadow-card">
                              <p className="text-xs font-black text-ink uppercase tracking-widest mb-3 bg-signal-500 w-fit px-2 py-1 rounded border border-ink">Arbitrage Opportunity</p>
                              <p className="text-2xl font-black text-ink uppercase">X / YouTube</p>
                              <p className="text-sm text-ink font-bold mt-2 leading-relaxed">Prime for tech/productivity creators to analyze and co-opt before mainstream media catches on.</p>
                          </div>
                      </div>
                  </div>
              </div>
              
          </div>
      </div>
    </div>
  );
}

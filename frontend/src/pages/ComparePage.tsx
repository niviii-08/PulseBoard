import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Loader2, TrendingUp, Search, Plus, X, BarChart2, Activity, Smile, MapPin, Share2, Layers, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";

interface TopicOption {
  id: string;
  name: string;
}

interface CompareSummary {
  id: string;
  name: string;
  mention_volume: number;
  trend_score: number;
  growth: number;
  acceleration: number;
  sentiment: number;
  source_diversity: number;
  geographic_spread: number;
}

interface CompareResponse {
  timeframe: string;
  topics: CompareSummary[];
  timeline: any[];
}

const COLORS = ["#8b5cf6", "#f97316", "#0ea5e9", "#ef4444"]; // Purple, Orange, Sky, Red

export default function ComparePage() {
  const [timeframe, setTimeframe] = useState<"1H" | "6H" | "24H" | "7D">("24H");
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const { data: allTopics } = useQuery<TopicOption[]>({
    queryKey: ["all-topics"],
    queryFn: async () => {
      const res = await apiClient.get("/trends/all?limit=100");
      return res.data;
    }
  });

  const queryParams = new URLSearchParams();
  selectedTopicIds.forEach(id => queryParams.append("ids", id));
  queryParams.append("timeframe", timeframe);

  const { data: compareData, isLoading: loadingCompare, isFetching } = useQuery<CompareResponse>({
    queryKey: ["trend-compare", selectedTopicIds, timeframe],
    queryFn: async () => {
      const res = await apiClient.get(`/trends/compare?${queryParams.toString()}`);
      return res.data;
    },
    enabled: selectedTopicIds.length > 0
  });

  const handleSelectTopic = (id: string) => {
    if (selectedTopicIds.length < 4 && !selectedTopicIds.includes(id)) {
      setSelectedTopicIds([...selectedTopicIds, id]);
      setSearch("");
    }
  };

  const removeTopic = (id: string) => {
    setSelectedTopicIds(selectedTopicIds.filter(t => t !== id));
  };

  const searchResults = search.length > 0 
    ? allTopics?.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) && !selectedTopicIds.includes(t.id)) 
    : [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto pb-12">
      
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6 pb-6 border-b border-border/50">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-ink flex items-center gap-4">
            <div className="p-3 bg-indigo-100 rounded-2xl">
               <Layers className="h-8 w-8 text-indigo-600" />
            </div>
            Trend Comparison
          </h1>
          <p className="mt-3 text-base text-ink-muted/90 max-w-2xl font-medium">
            Cross-analyze up to 4 topics against identical baselines to extract real divergence in volume, sentiment, and momentum.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-surface-raised p-1.5 rounded-xl border border-border shadow-sm">
          {["1H", "6H", "24H", "7D"].map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf as any)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${timeframe === tf ? 'bg-indigo-600 text-white shadow-md' : 'text-ink-muted hover:text-ink'}`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Selector Area */}
      <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm flex flex-col md:flex-row gap-6">
         <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-faint" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                disabled={selectedTopicIds.length >= 4}
                placeholder={selectedTopicIds.length >= 4 ? "Maximum 4 topics selected" : "Search topics to compare..."}
                className="w-full pl-10 pr-4 py-3 bg-surface-raised border border-border rounded-xl outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all font-medium text-sm disabled:opacity-50"
              />
              {searchResults && searchResults.length > 0 && (
                 <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-xl z-50 max-h-[300px] overflow-auto">
                    {searchResults.map(t => (
                       <button
                         key={t.id}
                         onClick={() => handleSelectTopic(t.id)}
                         className="w-full text-left px-4 py-3 hover:bg-surface-raised border-b border-border/50 last:border-0 text-sm font-semibold flex items-center justify-between group"
                       >
                         {t.name}
                         <Plus className="w-4 h-4 text-signal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                       </button>
                    ))}
                 </div>
              )}
            </div>
         </div>
         <div className="flex-1 flex flex-wrap gap-3 items-start min-h-[50px]">
            {selectedTopicIds.length === 0 && <span className="text-ink-muted text-sm font-medium pt-3 italic">No topics selected for comparison.</span>}
            {selectedTopicIds.map((id, idx) => {
               const t = allTopics?.find(x => x.id === id);
               return (
                 <div key={id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-sm font-semibold text-sm" style={{ backgroundColor: `${COLORS[idx]}15`, borderColor: `${COLORS[idx]}40`, color: COLORS[idx] }}>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                    {t?.name || "Topic"}
                    <button onClick={() => removeTopic(id)} className="ml-1 hover:opacity-70 p-0.5 rounded-md hover:bg-white/20 transition-all">
                      <X className="w-3.5 h-3.5" />
                    </button>
                 </div>
               )
            })}
         </div>
      </div>

      {loadingCompare || isFetching ? (
         <div className="flex justify-center p-20">
           <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
         </div>
      ) : selectedTopicIds.length > 0 && compareData ? (
         <div className="space-y-8 animate-fade-in-up">
            
            {/* Comparison Metrics Table */}
            <Card className="shadow-sm overflow-hidden border-indigo-100">
               <CardHeader className="bg-indigo-50/50 pb-4 border-b border-indigo-100">
                 <CardTitle className="text-lg flex items-center gap-2 tracking-wide font-black uppercase text-indigo-950">
                    <BarChart2 className="w-5 h-5 text-indigo-600" /> Comparison Matrix ({compareData.timeframe})
                 </CardTitle>
               </CardHeader>
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-surface-raised border-b border-border/80 text-xs uppercase font-bold text-ink-muted">
                        <tr>
                           <th className="px-6 py-4">Metric</th>
                           {compareData.topics.map((t, i) => (
                              <th key={t.id} className="px-6 py-4 w-[25%]" style={{ color: COLORS[i] }}>
                                 {t.name}
                              </th>
                           ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        <tr className="hover:bg-ink/[0.01]">
                           <td className="px-6 py-4 font-bold text-ink-muted flex items-center gap-2"><TrendingUp className="w-4 h-4"/> Trend Score</td>
                           {compareData.topics.map(t => <td key={t.id} className="px-6 py-4 font-black text-ink">{t.trend_score.toFixed(1)}</td>)}
                        </tr>
                        <tr className="hover:bg-ink/[0.01]">
                           <td className="px-6 py-4 font-bold text-ink-muted flex items-center gap-2"><BarChart2 className="w-4 h-4"/> Mention Volume</td>
                           {compareData.topics.map(t => <td key={t.id} className="px-6 py-4 font-mono font-bold">{t.mention_volume}</td>)}
                        </tr>
                        <tr className="hover:bg-ink/[0.01]">
                           <td className="px-6 py-4 font-bold text-ink-muted flex items-center gap-2"><Activity className="w-4 h-4"/> Growth</td>
                           {compareData.topics.map(t => <td key={t.id} className={`px-6 py-4 font-bold ${t.growth > 0 ? 'text-green-600' : 'text-red-500'}`}>{t.growth > 0 && '+'}{(t.growth * 100).toFixed(0)}%</td>)}
                        </tr>
                        <tr className="hover:bg-ink/[0.01]">
                           <td className="px-6 py-4 font-bold text-ink-muted flex items-center gap-2"><Zap className="w-4 h-4"/> Acceleration</td>
                           {compareData.topics.map(t => <td key={t.id} className={`px-6 py-4 font-bold ${t.acceleration > 0 ? 'text-green-600' : 'text-red-500'}`}>{t.acceleration > 0 && '+'}{t.acceleration.toFixed(1)}</td>)}
                        </tr>
                        <tr className="hover:bg-ink/[0.01]">
                           <td className="px-6 py-4 font-bold text-ink-muted flex items-center gap-2"><Smile className="w-4 h-4"/> Sentiment</td>
                           {compareData.topics.map(t => <td key={t.id} className="px-6 py-4 font-bold">{t.sentiment > 0.1 ? <span className="text-green-600">Positive ({t.sentiment.toFixed(2)})</span> : t.sentiment < -0.1 ? <span className="text-red-600">Negative ({t.sentiment.toFixed(2)})</span> : <span className="text-gray-500">Neutral ({t.sentiment.toFixed(2)})</span>}</td>)}
                        </tr>
                        <tr className="hover:bg-ink/[0.01]">
                           <td className="px-6 py-4 font-bold text-ink-muted flex items-center gap-2"><Share2 className="w-4 h-4"/> Source Diversity</td>
                           {compareData.topics.map(t => <td key={t.id} className="px-6 py-4 font-bold">{t.source_diversity} distinct</td>)}
                        </tr>
                        <tr className="hover:bg-ink/[0.01]">
                           <td className="px-6 py-4 font-bold text-ink-muted flex items-center gap-2"><MapPin className="w-4 h-4"/> Geo Spread</td>
                           {compareData.topics.map(t => <td key={t.id} className="px-6 py-4 font-bold">{t.geographic_spread} countries</td>)}
                        </tr>
                    </tbody>
                 </table>
               </div>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Volume Timeline */}
                <Card className="shadow-sm xl:col-span-2">
                   <CardHeader>
                      <CardTitle className="text-lg">Volume Trajectory</CardTitle>
                   </CardHeader>
                   <CardContent>
                      <div className="h-[300px] w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={compareData.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                               <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} fontSize={10} tickLine={false} axisLine={false} />
                               <YAxis fontSize={10} tickLine={false} axisLine={false} />
                               <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} labelFormatter={(l: any) => new Date(l).toLocaleString()} />
                               <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingTop: '10px' }} />
                               {compareData.topics.map((t, idx) => (
                                  <Line key={t.name} type="monotone" dataKey={`${t.name}_volume`} name={t.name} stroke={COLORS[idx]} strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                               ))}
                            </LineChart>
                         </ResponsiveContainer>
                      </div>
                   </CardContent>
                </Card>

                {/* Growth Timeline */}
                <Card className="shadow-sm">
                   <CardHeader>
                      <CardTitle className="text-lg">Growth Rate Instability</CardTitle>
                   </CardHeader>
                   <CardContent>
                      <div className="h-[250px] w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={compareData.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                               <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} fontSize={10} tickLine={false} axisLine={false} />
                               <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${(v*100).toFixed(0)}%`} />
                               <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} labelFormatter={(l: any) => new Date(l).toLocaleString()} formatter={v => `${(Number(v)*100).toFixed(1)}%`} />
                               
                               {compareData.topics.map((t, idx) => (
                                  <Line key={`g_${t.name}`} type="monotone" dataKey={`${t.name}_growth`} stroke={COLORS[idx]} strokeWidth={2} dot={false} />
                               ))}
                            </LineChart>
                         </ResponsiveContainer>
                      </div>
                   </CardContent>
                </Card>

                {/* Sentiment Timeline */}
                <Card className="shadow-sm">
                   <CardHeader>
                      <CardTitle className="text-lg">Sentiment Divergence</CardTitle>
                   </CardHeader>
                   <CardContent>
                      <div className="h-[250px] w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={compareData.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                               <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} fontSize={10} tickLine={false} axisLine={false} />
                               <YAxis fontSize={10} tickLine={false} axisLine={false} domain={[-1, 1]} />
                               <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} labelFormatter={(l: any) => new Date(l).toLocaleString()} />
                               
                               {compareData.topics.map((t, idx) => (
                                  <Line key={`s_${t.name}`} type="monotone" dataKey={`${t.name}_sentiment`} stroke={COLORS[idx]} strokeWidth={2} dot={false} />
                               ))}
                            </LineChart>
                         </ResponsiveContainer>
                      </div>
                   </CardContent>
                </Card>
            </div>
         </div>
      ) : (
         <div />
      )}
    </div>
  );
}

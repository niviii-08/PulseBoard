import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Loader2, Globe, BarChart2, Activity, ArrowRight, ShieldAlert, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";

interface IntelligenceTopic {
  id: string;
  name: string;
  mentions: number;
}

interface CountryIntelligence {
  country: string;
  total_news_volume: number;
  top_topics: IntelligenceTopic[];
  fastest_growing_topic: { id: string, name: string, growth_rate: number } | null;
  sentiment: number;
  category_distribution: { name: string, count: number }[];
  source_distribution: { name: string, count: number }[];
  recent_events: string[];
}

export default function CountriesPage() {
  const { data, isLoading } = useQuery<{countries: CountryIntelligence[]}>({
    queryKey: ["countries-intelligence"],
    queryFn: async () => {
      const res = await apiClient.get("/countries");
      return res.data;
    }
  });

  const countries = data?.countries || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 pb-6 border-b border-border/50">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-ink flex items-center gap-4">
            <div className="p-3 bg-sky-100 rounded-2xl">
               <Globe className="h-8 w-8 text-sky-600" />
            </div>
            Country Intelligence
          </h1>
          <p className="mt-3 text-base text-ink-muted/90 max-w-2xl font-medium">
            Global geopolitical tracking, regional topics, and distribution metrics.
          </p>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      ) : (
        <>
          {countries.length > 0 ? (
            <div className="space-y-8">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {countries.map((c) => (
                  <Card key={c.country} className={`overflow-hidden border border-border shadow-sm hover:shadow-xl hover:border-sky-300 transition-all duration-300 flex flex-col group ${c.country === 'Unknown Geography' ? 'bg-surface-raised border-dashed' : 'bg-surface'}`}>
                    <CardHeader className="pb-4">
                       <CardTitle className="flex items-start justify-between">
                         <div className="flex flex-col gap-1">
                           <span className="text-xl font-black text-ink group-hover:text-sky-600 transition-colors flex items-center gap-2">
                             {c.country === 'Unknown Geography' ? <ShieldAlert className="w-5 h-5 text-amber-500" /> : null}
                             {c.country}
                           </span>
                           <span className="text-xs font-bold uppercase tracking-widest text-ink-muted flex items-center gap-1.5">
                              <BarChart2 className="w-3.5 h-3.5" /> {c.total_news_volume} TOTAL VOLUME
                           </span>
                         </div>
                       </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-5 pt-2">
                       {/* Sentiment */}
                       <div className="flex items-center gap-3 bg-ink/[0.03] p-3 rounded-xl border border-ink/[0.05]">
                          <Activity className="w-4 h-4 text-ink-muted" />
                          <div className="flex-1">
                            <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                               <div className={`h-full ${c.sentiment > 0.2 ? 'bg-green-500' : c.sentiment < -0.2 ? 'bg-red-500' : 'bg-gray-400'}`} style={{ width: `${Math.min(100, Math.max(0, (c.sentiment + 1) * 50))}%` }}></div>
                            </div>
                          </div>
                          <span className="text-xs font-bold font-mono text-ink-muted">{(c.sentiment).toFixed(2)}</span>
                       </div>

                       {/* Top Topic */}
                       {c.top_topics && c.top_topics.length > 0 && (
                          <div>
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-ink-faint mb-2">Primary Topic</h4>
                            <Link to={`/trends/${c.top_topics[0].id}`} className="inline-flex items-center gap-2 px-3 py-1.5 bg-signal-50 text-signal-700 hover:bg-signal-100 rounded-lg text-sm font-semibold transition-colors border border-signal-200 w-full group/topic justify-between">
                              <span className="truncate">{c.top_topics[0].name}</span>
                              <span className="text-[10px] font-bold bg-signal-200 px-1.5 rounded">{c.top_topics[0].mentions}</span>
                            </Link>
                          </div>
                       )}

                       {/* Fastest Growing Topic */}
                       {c.fastest_growing_topic && (
                          <div>
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-ink-faint mb-2 flex items-center gap-1"><Zap className="w-3 h-3 text-flame-500" /> Fastest Growing</h4>
                            <div className="flex items-center justify-between text-sm font-medium text-ink bg-flame-50/50 p-2 rounded-lg border border-flame-100/50">
                               <span className="truncate max-w-[150px]">{c.fastest_growing_topic.name}</span>
                               <span className="text-flame-600 font-bold font-mono text-xs text-right">+{Math.max(0, c.fastest_growing_topic.growth_rate * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                       )}

                       <div className="mt-auto pt-4 flex gap-2">
                          <Link to={`/countries/${encodeURIComponent(c.country)}`} className="w-full py-2.5 rounded-xl bg-ink text-surface text-xs font-bold text-center tracking-widest uppercase hover:bg-sky-600 transition-colors shadow-sm cursor-pointer flex justify-center items-center gap-2">
                             DEEP DIVE <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                       </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title="No Country Data" message="The system hasn't tracked location-specific data yet. Ensure the ingestion pipeline provides explicit geography." />
          )}
        </>
      )}
    </div>
  );
}

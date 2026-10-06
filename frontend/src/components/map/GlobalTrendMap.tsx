import { useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/shared/LoadingState";
import { Badge } from "@/components/ui/badge";
import { MapPin, TrendingUp, FileText, Activity } from "lucide-react";
import type { CountryDashboardData } from "@/types/domain";

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

interface MapProps {
  data: CountryDashboardData[];
  isLoading: boolean;
}

export function GlobalTrendMap({ data, isLoading }: MapProps) {
  const [selectedCountry, setSelectedCountry] = useState<CountryDashboardData | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  // If a topic is selected, we want to highlight countries that mention it
  const activeData = useMemo(() => {
    if (!selectedTopic) return data;
    return data.filter(d => d.top_topics?.some((t: any) => (t.name || t) === selectedTopic));
  }, [data, selectedTopic]);


  const colorScale = scaleLinear<string>()
    .domain([-1, 0, 1])
    .range(["#f43f5e", "#9ca3af", "#10b981"]); // Red -> Gray -> Green based on sentiment

  if (isLoading) {
    return <div className="h-[500px] flex items-center justify-center bg-surface border border-border rounded-xl">
       <LoadingState variant="cards" count={1} />
    </div>;
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[500px] flex flex-col items-center justify-center bg-surface border border-border rounded-xl text-ink-muted">
        <MapPin className="w-12 h-12 text-ink-faint mb-4" />
        <h3 className="text-lg font-bold">No Geographic Data Available</h3>
        <p className="text-sm max-w-sm text-center mt-2">Geographic metadata could not be extracted from the current intelligence layer. Try ingesting more sources.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <Card className="flex-1 overflow-hidden shadow-sm">
        <CardContent className="p-0 relative bg-[#f8fafc] dark:bg-[#0f172a] h-[500px]">
           <ComposableMap projectionConfig={{ scale: 140 }} width={800} height={400} style={{ width: "100%", height: "100%" }}>
             <ZoomableGroup>
               <Geographies geography={geoUrl}>
                 {({ geographies }) =>
                   geographies.map((geo) => {
                     // Try to match the geography to our data
                     const countryName = geo.properties?.name || "";
                     // simple match logic (a real app would use ISO-3166-1 alpha-3)
                     const d = activeData.find(x => x.country.toLowerCase() === countryName.toLowerCase() || 
                                                    (countryName === "United States of America" && x.country.toLowerCase() === "us") ||
                                                    (countryName === "United Kingdom" && x.country.toLowerCase() === "gb"));
                     
                     let fill = "#cbd5e1"; // default inactive state
                     if (d) {
                        fill = colorScale(d.sentiment);
                     }

                     const isSelected = selectedCountry?.country === (d?.country || "");

                     return (
                       <Geography
                         key={geo.rsmKey}
                         geography={geo}
                         fill={isSelected ? "#4f46e5" : fill}
                         stroke="#ffffff"
                         strokeWidth={0.5}
                         // @ts-ignore
                         style={{
                           default: { outline: "none", transition: "all 250ms" },
                           hover: { fill: "#6366f1", outline: "none", cursor: "pointer" },
                           pressed: { fill: "#4338ca", outline: "none" },
                         } as any}
                         onClick={() => {
                           if (d) setSelectedCountry(d);
                           else setSelectedCountry(null);
                         }}
                       />
                     );
                   })
                 }
               </Geographies>
             </ZoomableGroup>
           </ComposableMap>
           
           {/* Legend overlay */}
           <div className="absolute bottom-4 left-4 bg-surface/90 backdrop-blur-sm p-3 rounded-xl border border-border shadow-sm text-xs font-semibold text-ink">
              <div className="flex items-center gap-2 mb-2">
                Sentiment Context
              </div>
              <div className="flex items-center gap-2">
                 <span className="w-3 h-3 rounded-full bg-red-500"></span> Negative
                 <span className="w-3 h-3 rounded-full bg-gray-400 ml-2"></span> Neutral
                 <span className="w-3 h-3 rounded-full bg-green-500 ml-2"></span> Positive
              </div>
           </div>
        </CardContent>
      </Card>

      {/* Detail Pane */}
      <Card className="w-full lg:w-80 shadow-sm shrink-0 flex flex-col">
         {selectedCountry ? (
           <div className="p-6 flex flex-col h-full overflow-y-auto">
              <div className="flex items-center gap-2 text-signal-600 mb-2">
                <MapPin className="w-5 h-5" />
                <span className="font-bold uppercase tracking-widest text-xs">Selected Region</span>
              </div>
              <h2 className="text-3xl font-black text-ink leading-none mb-6">{selectedCountry.country}</h2>

              <div className="grid grid-cols-2 gap-4 mb-6">
                 <div className="p-4 bg-surface-raised rounded-xl border border-border">
                    <div className="text-2xl font-mono font-bold text-ink">{selectedCountry.articles}</div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-ink-muted flex items-center gap-1 mt-1"><FileText className="w-3 h-3"/> Articles</div>
                 </div>
                 <div className="p-4 bg-surface-raised rounded-xl border border-border">
                    <div className="text-2xl font-mono font-bold text-ink">{selectedCountry.sentiment.toFixed(2)}</div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-ink-muted flex items-center gap-1 mt-1"><Activity className="w-3 h-3"/> Sentiment</div>
                 </div>
              </div>

              <div className="space-y-5">
                 <div>
                    <h4 className="text-xs uppercase font-bold tracking-widest text-ink-muted border-b border-border pb-2 mb-3">Dominant Topics</h4>
                    <div className="flex flex-wrap gap-2">
                       {(selectedCountry.top_topics || []).map((t: any) => {
                         const tName = t.name || t;
                         return (
                          <Badge 
                            key={t.id || tName} 
                            variant={tName === selectedTopic ? "flame" : "neutral"} 
                            className="cursor-pointer"
                            onClick={() => setSelectedTopic(tName === selectedTopic ? null : tName)}
                          >
                            {tName}
                          </Badge>
                         )
                       })}
                       {(!selectedCountry.top_topics || selectedCountry.top_topics.length === 0) && <span className="text-sm text-ink-faint">None mapped</span>}
                    </div>
                 </div>
                 
                 <div>
                    <h4 className="text-xs uppercase font-bold tracking-widest text-ink-muted border-b border-border pb-2 mb-3">Fastest Rising</h4>
                    {selectedCountry.fastest_growing_topic !== "None" ? (
                      <div className="flex items-center gap-2 p-2 bg-signal-50 text-signal-800 rounded-lg font-semibold text-sm border border-signal-200">
                         <TrendingUp className="w-4 h-4" /> {selectedCountry.fastest_growing_topic}
                      </div>
                    ) : <span className="text-sm text-ink-faint">No trend momentum</span>}
                 </div>

                 <div>
                    <h4 className="text-xs uppercase font-bold tracking-widest text-ink-muted border-b border-border pb-2 mb-3">Sectors</h4>
                    <ul className="space-y-1">
                       {(selectedCountry.top_categories || []).map((c: any) => {
                         const cName = c.name || c;
                         return (
                          <li key={cName} className="text-sm font-medium text-ink flex items-center justify-between">
                             <span>{cName}</span>{c.mentions && <span className="text-xs text-ink-muted">{c.mentions}</span>}
                          </li>
                         )
                       })}
                       {(!selectedCountry.top_categories || selectedCountry.top_categories.length === 0) && <span className="text-sm text-ink-faint">Uncategorized</span>}
                    </ul>
                 </div>
              </div>
           </div>
         ) : (
           <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-ink-muted bg-surface-raised/50">
              <MapPin className="w-12 h-12 mb-4 text-ink-faint" />
              <h3 className="font-semibold text-ink text-lg">Region Analysis</h3>
              <p className="text-sm mt-2 max-w-[200px]">Select any colored region on the map to view detailed geographic trending metrics and local source behavior.</p>
           </div>
         )}
      </Card>
    </div>
  );
}

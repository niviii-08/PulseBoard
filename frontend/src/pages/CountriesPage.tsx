import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Loader2, Map as MapIcon, Globe } from "lucide-react";
import { ComposableMap, Geographies, Geography, Sphere, Graticule } from "react-simple-maps";
import { scaleLinear } from "d3-scale";

// High-res simplified topojson
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface CountryStat {
  iso_code: string;
  name: string;
  volume: number;
}

export default function CountriesPage() {
  const { data: countries, isLoading } = useQuery<CountryStat[]>({
    queryKey: ["countries"],
    queryFn: async () => {
      const res = await apiClient.get("/countries");
      return res.data;
    }
  });

  const maxVolume = countries ? Math.max(1, ...countries.map(c => c.volume)) : 100;
  
  const colorScale = scaleLinear<string>()
    .domain([0, maxVolume])
    // Gradient ranges from empty zinc-800 to vibrant signal-500
    .range(["#27272a", "#4f46e5"]); 

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink flex items-center gap-3">
            <MapIcon className="h-8 w-8 text-flame-500" />
            Global Map
          </h1>
          <p className="mt-2 text-ink-muted">Geographic tracking and country-level activity</p>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-signal-500" />
        </div>
      ) : (
        <div className="glass rounded-2xl p-6 shadow-glow relative border border-border">
          <div className="flex items-center gap-2 text-sm text-ink-muted absolute top-6 left-6 z-10 bg-canvas/80 px-3 py-1.5 rounded-full border border-border backdrop-blur-md">
            <Globe className="h-4 w-4 text-signal-400" />
            <span>Real-time global intelligence matrix</span>
          </div>

          <div className="rounded-xl overflow-hidden bg-[#0a0a0f] ring-1 ring-border shadow-inner min-h-[400px]">
            <ComposableMap
              projectionConfig={{
                scale: 140,
                center: [0, 20]
              }}
              style={{ width: "100%", height: "auto" }}
            >
              <Sphere stroke="#27272a" strokeWidth={0.5} id="sphere" fill="transparent" />
              <Graticule stroke="#27272a" strokeWidth={0.2} />
              
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    // Match ISO-3166-1 alpha-2 code or fallback to finding by name mapping
                    // `world-atlas` topology gives ISO 3166-1 numeric or alpha-3 in properties.
                    // For safety, color will check both name and standard IDs.
                    const d = countries?.find((c) => c.name.toLowerCase() === geo.properties.name?.toLowerCase());
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={d ? colorScale(d.volume) : "#18181b"}
                        stroke="#09090b"
                        strokeWidth={0.5}
                        className="outline-none hover:fill-flame-500 transition-colors duration-200"
                      />
                    );
                  })
                }
              </Geographies>
            </ComposableMap>
          </div>
          
          {countries?.length ? (
            <div className="mt-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
              {countries.map((c) => (
                <div key={c.iso_code} className="group flex items-center justify-between rounded-xl bg-canvas p-4 shadow-sm ring-1 ring-border transition-all hover:ring-signal-500/50 hover:shadow-glow hover:-translate-y-0.5">
                  <span className="font-medium text-ink flex items-center gap-2">
                    <span className="text-xl transform group-hover:scale-110 transition-transform">
                      {c.iso_code.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397)) || "🌐"}
                    </span>
                    {c.name}
                  </span>
                  <span className="font-mono text-sm font-semibold text-signal-400">{c.volume} mentions</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 text-center py-6 text-ink-muted">
              Insufficient live mentions tracked to render distinct regional outbreaks today.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

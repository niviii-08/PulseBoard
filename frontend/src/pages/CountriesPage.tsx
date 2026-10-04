import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Loader2, Map } from "lucide-react";

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

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink flex items-center gap-3">
            <Map className="h-8 w-8 text-flame-500" />
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
        <div className="glass rounded-2xl p-8">
          {countries?.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {countries.map((c) => (
                <div key={c.iso_code} className="flex items-center justify-between rounded-xl bg-canvas p-4 shadow-sm ring-1 ring-border">
                  <span className="font-medium text-ink flex items-center gap-2">
                    <span className="text-xl">
                      {c.iso_code.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397)) || "🌐"}
                    </span>
                    {c.name}
                  </span>
                  <span className="font-mono text-sm font-semibold text-signal-600">{c.volume} mentions</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-ink-muted">
              Insufficient geographic data to render the global map.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { BarChart2, Loader2 } from "lucide-react";
import type { DashboardSummary } from "@/types/domain";

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useQuery<DashboardSummary>({
    queryKey: ["analytics", "overview"],
    queryFn: async () => {
      const res = await apiClient.get("/analytics/overview");
      return res.data;
    }
  });

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink flex items-center gap-3">
            <BarChart2 className="h-8 w-8 text-signal-500" />
            Analytics Overview
          </h1>
          <p className="mt-2 text-ink-muted">High-level insights and overall performance metrics</p>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-signal-500" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
           <div className="glass p-6 rounded-2xl ring-1 ring-border">
             <h3 className="text-ink-muted text-sm font-medium">Emerging Trends</h3>
             <p className="text-4xl font-semibold text-ink mt-2">{analytics?.emerging_trends}</p>
           </div>
           
           <div className="glass p-6 rounded-2xl ring-1 ring-border">
             <h3 className="text-ink-muted text-sm font-medium">Mentions (24h)</h3>
             <p className="text-4xl font-semibold text-ink mt-2">{analytics?.total_mentions_24h}</p>
           </div>
           
           <div className="glass p-6 rounded-2xl ring-1 ring-border">
             <h3 className="text-ink-muted text-sm font-medium">Avg Sentiment</h3>
             <p className={`text-4xl font-semibold mt-2 ${analytics?.avg_sentiment && analytics.avg_sentiment > 0.05 ? 'text-signal-600' : analytics?.avg_sentiment && analytics.avg_sentiment < -0.05 ? 'text-flame-500' : 'text-ink'}`}>
               {analytics?.avg_sentiment}
             </p>
           </div>
        </div>
      )}
    </div>
  );
}

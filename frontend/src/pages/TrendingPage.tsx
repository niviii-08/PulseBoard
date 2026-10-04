import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { TrendingUp, Loader2 } from "lucide-react";
import type { EmergingTrend } from "@/types/domain";
import { TrendListCard } from "@/components/trends/TrendListCard";

export default function TrendingPage() {
  const { data: trends, isLoading } = useQuery<EmergingTrend[]>({
    queryKey: ["trends", "emerging"],
    queryFn: async () => {
      const res = await apiClient.get("/trends/emerging");
      return res.data;
    }
  });

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-signal-500" />
            Trending Topics
          </h1>
          <p className="mt-2 text-ink-muted">Emerging topics with high velocity and momentum</p>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-signal-500" />
        </div>
      ) : (
        <div className="grid gap-6">
          {trends?.map(trend => (
            <TrendListCard key={trend.id} trend={trend} />
          ))}
        </div>
      )}
    </div>
  );
}

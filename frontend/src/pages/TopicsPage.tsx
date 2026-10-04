import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Loader2, Hash } from "lucide-react";
import { Link } from "react-router-dom";

export default function TopicsPage() {
  const { data: topics, isLoading } = useQuery<{id: string, name: string, description: string}[]>({
    queryKey: ["topics"],
    queryFn: async () => {
      const res = await apiClient.get("/trends");
      return res.data;
    }
  });

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink flex items-center gap-3">
            <Hash className="h-8 w-8 text-signal-500" />
            Topics
          </h1>
          <p className="mt-2 text-ink-muted">All tracked conversation topics</p>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-signal-500" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {topics?.map(topic => (
            <Link key={topic.id} to={`/trends/${topic.id}`} className="glass rounded-2xl p-6 hover:bg-ink/[0.02] transition-colors ring-1 ring-border">
              <h3 className="font-medium text-ink text-lg">{topic.name}</h3>
              <p className="text-sm text-ink-muted line-clamp-2 mt-2">{topic.description || "No description available."}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

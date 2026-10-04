import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { Post } from "@/types/domain";
import { Loader2, Newspaper } from "lucide-react";

export default function NewsPage() {
  const { data: news, isLoading } = useQuery<Post[]>({
    queryKey: ["news", "breaking"],
    queryFn: async () => {
      const res = await apiClient.get("/news/breaking");
      return res.data;
    }
  });

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink flex items-center gap-3">
            <Newspaper className="h-8 w-8 text-signal-500" />
            Breaking News
          </h1>
          <p className="mt-2 text-ink-muted">High-impact coverage and breaking stories</p>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-signal-500" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {news?.map(item => (
            <div key={item.id} className="glass rounded-xl p-6 ring-1 ring-border shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-ink-muted">{item.author || "Unknown"}</span>
                  <span className="text-xs text-ink-faint">{new Date(item.posted_at).toLocaleDateString()}</span>
                </div>
                <p className="text-ink text-sm sm:text-base leading-relaxed line-clamp-4">{item.content}</p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <span className={`text-xs font-semibold uppercase ${item.sentiment_label === 'positive' ? 'text-signal-600' : item.sentiment_label === 'negative' ? 'text-flame-500' : 'text-ink-muted'}`}>
                  {item.sentiment_label}
                </span>
                <span className="text-sm font-medium text-ink-muted flex items-center gap-1">
                  ⭐ {item.engagement_count}
                </span>
              </div>
            </div>
          ))}
          {!news?.length && (
            <div className="col-span-full rounded-2xl glass p-12 text-center text-ink-muted">
              No news found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

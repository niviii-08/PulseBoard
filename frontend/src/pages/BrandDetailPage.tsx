import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { RiskGauge } from "@/components/shared/RiskGauge";
import { SentimentChart } from "@/components/trends/SentimentChart";
import { RiskDriversList } from "@/components/trends/RiskDriversList";
import { RiskBadge, DemoDataBadge, SentimentBadge } from "@/components/trends/badges";
import { formatEngagement, formatRelativeTime } from "@/lib/formatters";
import {
  useBrand,
  useBrandPosts,
  useBrandRisk,
  useBrandSentiment,
  useBrandTrends,
  useDeleteBrand,
} from "@/hooks/queries/useBrands";
import { useNavigate } from "react-router-dom";

/** Brand intelligence page: risk score + explainable drivers, sentiment
 * over time, related emerging topics, and top conversations mentioning
 * the brand. Maps onto Section 16 of the product spec. */
export default function BrandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const brand = useBrand(id);
  const risk = useBrandRisk(id);
  const sentiment = useBrandSentiment(id);
  const trends = useBrandTrends(id);
  const posts = useBrandPosts(id);
  const deleteBrand = useDeleteBrand();

  if (brand.isLoading) return <LoadingState variant="cards" count={3} />;
  if (brand.isError || !brand.data) return <ErrorState title="Brand not found" onRetry={() => brand.refetch()} />;

  const handleDelete = () => {
    if (!id) return;
    if (!confirm(`Stop monitoring ${brand.data.name}? This cannot be undone.`)) return;
    deleteBrand.mutate(id, { onSuccess: () => navigate("/brands") });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{brand.data.name}</h1>
          <p className="text-sm text-ink-muted">
            {brand.data.keywords && brand.data.keywords.length > 0 ? brand.data.keywords.join(", ") : "No keywords set"}
          </p>
        </div>
        <Button variant="secondary" onClick={handleDelete} isLoading={deleteBrand.isPending}>
          Stop monitoring
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            Brand risk
            {risk.data?.latest && <RiskBadge level={risk.data.latest.risk_level} />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {risk.isLoading && <LoadingState variant="inline" />}
          {risk.data && !risk.data.latest && <EmptyState title="No risk data yet" message="Load demo data or run a collection pass to compute this brand's risk score." />}
          {risk.data?.latest && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[auto_1fr]">
              <div className="flex flex-col items-center md:items-start">
                <RiskGauge score={risk.data.latest.risk_score} size={128} />
                <dl className="mt-2 w-full space-y-1 text-xs text-ink-muted">
                  <div className="flex justify-between"><dt>Negative mentions</dt><dd className="font-mono">{risk.data.latest.negative_mentions_pct.toFixed(0)}%</dd></div>
                  <div className="flex justify-between"><dt>Mention growth</dt><dd className="font-mono">{risk.data.latest.mention_growth_rate.toFixed(0)}%</dd></div>
                  <div className="flex justify-between"><dt>Platforms affected</dt><dd className="font-mono">{risk.data.latest.platforms_affected}</dd></div>
                </dl>
                {risk.data.latest.complaint_clusters && risk.data.latest.complaint_clusters.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {risk.data.latest.complaint_clusters.map((c) => (
                      <span key={c} className="rounded-full bg-canvas px-2 py-0.5 text-xs text-ink-muted">{c}</span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">Risk drivers</p>
                <RiskDriversList drivers={risk.data.latest.drivers} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sentiment over time</CardTitle>
        </CardHeader>
        <CardContent>
          {sentiment.isLoading ? <LoadingState variant="chart" /> : <SentimentChart points={sentiment.data ?? []} />}
        </CardContent>
      </Card>

      {trends.data && trends.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Emerging topics tied to this brand</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {trends.data.map((t) => (
              <a key={t.id} href={`/trends/${t.id}`} className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:border-signal-300 hover:bg-signal-50/50">
                <span className="text-sm font-medium text-ink">{t.name}</span>
                <span className="font-mono text-sm text-ink-muted">{t.trend_score.toFixed(0)}/100</span>
              </a>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Top conversations</CardTitle>
        </CardHeader>
        <CardContent>
          {posts.isLoading && <LoadingState variant="table" count={3} />}
          {posts.data && posts.data.length === 0 && <EmptyState title="No posts yet" />}
          {posts.data && posts.data.length > 0 && (
            <ul className="space-y-3">
              {posts.data.map((post) => (
                <li key={post.id} className="rounded-lg border border-border p-3 transition-colors hover:border-border-strong">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                    <span className="font-medium capitalize text-ink-muted">{post.platform}</span>
                    <span>· {formatRelativeTime(post.posted_at)}</span>
                    <span>· {formatEngagement(post.engagement_count)} engagement</span>
                    <SentimentBadge label={post.sentiment_label} />
                    {post.is_demo && <DemoDataBadge />}
                  </div>
                  <p className="mt-1.5 text-sm text-ink">{post.content}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

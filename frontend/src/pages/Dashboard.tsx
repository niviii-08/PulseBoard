import { AlertTriangle, Flame, MessageSquare, Smile } from "lucide-react";
import { Link } from "react-router-dom";
import { MetricCard } from "@/components/shared/MetricCard";
import { RiskGauge } from "@/components/shared/RiskGauge";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertSeverityBadge } from "@/components/trends/badges";
import { TrendListCard } from "@/components/trends/TrendListCard";
import { useDashboard } from "@/hooks/queries/useDashboard";
import { useEmergingTrends } from "@/hooks/queries/useTrends";
import { useAlerts } from "@/hooks/queries/useAlerts";
import { formatRelativeTime } from "@/lib/formatters";

/**
 * The main "Social Intelligence" dashboard: a hero band pairing the
 * headline metric (brand risk, the one number worth a full gauge) with
 * the rest of the KPI row, then the ranked emerging-trends list and the
 * most recent unacknowledged alerts. Every number here comes from
 * GET /dashboard, /trends/emerging, and /alerts -- no client-side
 * aggregation of raw data.
 */
export default function Dashboard() {
  const dashboard = useDashboard();
  const trends = useEmergingTrends();
  const alerts = useAlerts();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-[1.75rem]">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-muted">Social intelligence across every monitored brand and topic.</p>
      </div>

      {dashboard.isLoading && <LoadingState variant="cards" count={5} />}
      {dashboard.isError && <ErrorState onRetry={() => dashboard.refetch()} />}

      {dashboard.data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="border-signal-200 shadow-raised lg:col-span-1">
            <CardContent className="flex flex-col items-center justify-center gap-1 p-6 text-center">
              <p className="text-[0.8125rem] font-medium text-ink-muted">Highest brand risk</p>
              <RiskGauge
                score={dashboard.data.brand_risk.score}
                level={dashboard.data.brand_risk.score > 0 ? dashboard.data.brand_risk.level : undefined}
                size={148}
                className="mt-2"
              />
              <Link to="/brands" className="mt-3 text-xs font-semibold text-signal-600 hover:text-signal-700 hover:underline">
                View all brands
              </Link>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4 lg:col-span-2 lg:grid-cols-2">
            <MetricCard label="Emerging trends" value={String(dashboard.data.emerging_trends)} icon={Flame} emphasis />
            <MetricCard label="Mentions (24h)" value={dashboard.data.total_mentions_24h.toLocaleString()} icon={MessageSquare} />
            <MetricCard label="Avg sentiment" value={dashboard.data.avg_sentiment.toFixed(2)} icon={Smile} />
            <MetricCard label="Active alerts" value={String(dashboard.data.active_alerts)} icon={AlertTriangle} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3.5 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Emerging trends</h2>
            <span className="text-xs text-ink-faint">Ranked by trend score, not raw volume</span>
          </div>
          {trends.isLoading && <LoadingState variant="cards" count={4} />}
          {trends.isError && <ErrorState onRetry={() => trends.refetch()} />}
          {trends.data && trends.data.length === 0 && (
            <EmptyState
              icon={Flame}
              title="No trends yet"
              message="Load demo data or run a collection pass from Data Sources to get started."
              action={
                <Button asChild variant="secondary" size="sm">
                  <Link to="/sources">Go to Data Sources</Link>
                </Button>
              }
            />
          )}
          {trends.data && trends.data.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {trends.data.map((t) => (
                <TrendListCard key={t.id} trend={t} />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-3.5 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Recent alerts</h2>
          </div>
          {alerts.isLoading && <LoadingState variant="table" count={4} />}
          {alerts.isError && <ErrorState onRetry={() => alerts.refetch()} />}
          {alerts.data && alerts.data.length === 0 && <EmptyState title="No alerts" message="Nothing has crossed a threshold yet." />}
          {alerts.data && alerts.data.length > 0 && (
            <ul className="space-y-2">
              {alerts.data.slice(0, 8).map((alert) => (
                <li key={alert.id} className="rounded-lg border border-border bg-surface p-3.5 transition-colors hover:border-border-strong hover:shadow-card">
                  <div className="flex items-center justify-between gap-2">
                    <AlertSeverityBadge severity={alert.severity} />
                    <span className="text-xs text-ink-faint">{formatRelativeTime(alert.created_at)}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-ink">{alert.message}</p>
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/alerts"
            className="mt-3 block rounded-lg py-2 text-center text-xs font-semibold text-signal-600 transition-colors hover:bg-ink/[0.04] hover:text-signal-700"
          >
            View all alerts
          </Link>
        </div>
      </div>
    </div>
  );
}

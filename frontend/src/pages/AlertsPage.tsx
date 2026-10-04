import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { AlertSeverityBadge } from "@/components/trends/badges";
import { formatRelativeTime } from "@/lib/formatters";
import { useAcknowledgeAlert, useAlerts } from "@/hooks/queries/useAlerts";

const ALERT_TYPE_LABEL: Record<string, string> = {
  EMERGING_TREND: "Emerging trend",
  SENTIMENT_SHIFT: "Sentiment shift",
  BRAND_RISK: "Brand risk",
  MENTION_SPIKE: "Mention spike",
  CROSS_PLATFORM_SPREAD: "Cross-platform spread",
};

export default function AlertsPage() {
  const alerts = useAlerts();
  const acknowledge = useAcknowledgeAlert();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Alerts</h1>
        <p className="text-sm text-ink-muted">Every threshold crossing across emerging trends, sentiment, and brand risk.</p>
      </div>

      {alerts.isLoading && <LoadingState variant="table" count={5} />}
      {alerts.isError && <ErrorState onRetry={() => alerts.refetch()} />}
      {alerts.data && alerts.data.length === 0 && <EmptyState title="No alerts" message="Nothing has crossed a configured threshold yet." />}
      {alerts.data && alerts.data.length > 0 && (
        <div className="space-y-2">
          {alerts.data.map((alert) => (
            <Card
              key={alert.id}
              className={cn(
                "p-4 transition-opacity",
                alert.acknowledged ? "opacity-55" : "border-l-2 border-l-signal-400",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <AlertSeverityBadge severity={alert.severity} />
                    <span className="text-xs font-medium text-ink-faint">{ALERT_TYPE_LABEL[alert.alert_type] ?? alert.alert_type}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-ink">{alert.message}</p>
                  <p className="mt-1 text-xs text-ink-faint">{formatRelativeTime(alert.created_at)}</p>
                </div>
                {!alert.acknowledged && (
                  <Button variant="secondary" size="sm" onClick={() => acknowledge.mutate(alert.id)} isLoading={acknowledge.isPending}>
                    <Check className="h-3.5 w-3.5" />
                    Acknowledge
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

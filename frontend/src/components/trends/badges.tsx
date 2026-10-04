import { StatusBadge } from "@/components/shared/StatusBadge";
import type { AlertSeverity, RiskLevel, SentimentLabel, SourceStatus } from "@/types/domain";

export function RiskBadge({ level }: { level: RiskLevel }) {
  const tone = level === "LOW" ? "positive" : level === "MODERATE" ? "warning" : level === "HIGH" ? "warning" : "critical";
  return <StatusBadge tone={tone} label={level} />;
}

export function SentimentBadge({ label }: { label: SentimentLabel }) {
  const tone = label === "positive" ? "positive" : label === "negative" ? "critical" : "neutral";
  return <StatusBadge tone={tone} label={label[0].toUpperCase() + label.slice(1)} />;
}

export function AlertSeverityBadge({ severity }: { severity: AlertSeverity }) {
  const tone = severity === "INFO" ? "neutral" : severity === "WARNING" ? "warning" : "critical";
  return <StatusBadge tone={tone} label={severity} />;
}

const SOURCE_STATUS_LABEL: Record<SourceStatus, string> = {
  connected: "Connected",
  demo: "Demo data",
  not_configured: "Not configured",
  optional: "Optional",
};

export function SourceStatusBadge({ status }: { status: SourceStatus }) {
  const tone = status === "connected" ? "positive" : status === "demo" ? "warning" : "neutral";
  return <StatusBadge tone={tone} label={SOURCE_STATUS_LABEL[status]} />;
}

/** The one place "Demo data" gets shown against a post/mention -- see
 * spec Section 21: demo/simulated data must be clearly labeled in the UI. */
export function DemoDataBadge() {
  return <StatusBadge tone="neutral" label="Demo data" />;
}

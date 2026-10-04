import { formatDistanceToNow, format } from "date-fns";

export function formatRelativeTime(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

export function formatDateTime(iso: string): string {
  return format(new Date(iso), "MMM d, yyyy 'at' h:mm a");
}

export function formatTime(iso: string): string {
  return format(new Date(iso), "HH:mm");
}

/** Signed percentage, e.g. +340% / -12%. */
export function formatSignedPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(0)}%`;
}

/** -1..1 sentiment score to a 0-100 "positivity" scale, for charting. */
export function sentimentToPositivity(sentiment: number): number {
  return Math.round(((sentiment + 1) / 2) * 100);
}

export function formatEngagement(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

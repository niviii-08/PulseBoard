import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatTime, sentimentToPositivity } from "@/lib/formatters";
import type { SentimentPoint } from "@/types/domain";

/**
 * Sentiment-over-time chart, shared by the trend detail page and the
 * brand detail page (identical shape either way -- see SentimentPoint).
 * Plots "positivity" (0-100, derived from the -1..1 sentiment score) --
 * matches the mental model a "% positive" number gives a reader more
 * directly than a signed -1..1 axis would.
 */
export function SentimentChart({ points }: { points: SentimentPoint[] }) {
  if (points.length < 2) {
    return (
      <div className="flex h-[200px] flex-col items-center justify-center gap-1 text-center">
        <p className="text-sm font-medium text-ink-muted">Collecting sentiment data…</p>
        <p className="text-xs text-ink-faint">This fills in as more posts are gathered.</p>
      </div>
    );
  }

  const data = points.map((p) => ({
    time: formatTime(p.timestamp),
    positivity: sentimentToPositivity(p.sentiment),
    volume: p.volume,
  }));

  const latest = sentimentToPositivity(points[points.length - 1].sentiment);
  const color = latest < 40 ? "#C23A3A" : latest > 60 ? "#1D9A6C" : "#9497A8";

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="sentimentFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E6E7F0" vertical={false} />
        <XAxis dataKey="time" tick={{ fill: "#9497A8", fontSize: 11 }} axisLine={{ stroke: "#E6E7F0" }} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: "#9497A8", fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
        <Tooltip
          formatter={(v) => [`${v}%`, "Positivity"]}
          contentStyle={{
            background: "#FFFFFF",
            border: "1px solid #E6E7F0",
            borderRadius: 10,
            fontSize: 12,
            color: "#13141F",
            boxShadow: "0 8px 24px -4px rgb(19 20 31 / 0.14)",
          }}
          labelStyle={{ color: "#5C6075" }}
          itemStyle={{ color: "#13141F" }}
        />
        <Area
          type="monotone"
          dataKey="positivity"
          stroke={color}
          strokeWidth={2.5}
          fill="url(#sentimentFill)"
          dot={false}
          animationDuration={500}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatSignedPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { EmergingTrend } from "@/types/domain";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";

const EMERGING_THRESHOLD = 70;

/**
 * One row in the emerging-trends list (Dashboard + a Brand's trend
 * list). Trend score, not raw volume, drives the visual hierarchy here
 * -- ranking by mention count alone is exactly what the product spec
 * warns against, so this component never shows volume as the headline
 * number. A genuinely emerging trend gets the one gradient badge in
 * this list (see ui/badge.tsx's `flame` variant) -- everything else
 * stays quiet so that badge still means something when it appears.
 */
export function TrendListCard({ trend }: { trend: EmergingTrend }) {
  const isEmerging = trend.trend_score >= EMERGING_THRESHOLD;

  const chartData = trend.score_breakdown?.sparkline?.map((val, i) => ({ val, index: i })) || [];
  const status = trend.score_breakdown?.label || "RISING";
  const isPositive = status === "BREAKOUT" || status === "RISING FAST" || status === "RISING";

  return (
    <Link to={`/trends/${trend.id}`}>
      <Card className="p-4 hover:-translate-y-0.5 hover:border-signal-300 hover:shadow-raised">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {isEmerging && <Flame className="h-4 w-4 shrink-0 text-flame-500" aria-hidden="true" />}
            <p className="truncate text-sm font-semibold text-ink">{trend.name}</p>
          </div>
          <Badge variant={isEmerging ? "flame" : "neutral"} className="shrink-0 font-mono">
            {trend.trend_score.toFixed(0)}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <p className={cn("font-mono text-sm font-semibold", trend.growth_rate >= 0 ? "text-operational-600" : "text-down-600")}>
              {formatSignedPercent(trend.growth_rate / 100)}
            </p>
            <p className="text-ink-faint">Growth</p>
          </div>
          <div>
            <p className="font-mono text-sm font-semibold text-ink">{trend.score_breakdown?.velocity || "1.0"}x</p>
            <p className="text-ink-faint">Velocity</p>
          </div>
          <div>
            <p className="font-mono text-sm font-semibold text-ink">{trend.volume}</p>
            <p className="text-ink-faint">Mentions</p>
          </div>
        </div>
        
        {chartData.length > 0 && (
           <div className="h-8 mt-4 -mx-1 opacity-70 group-hover:opacity-100 transition-opacity">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id={`spark-${trend.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <YAxis domain={['auto', 'auto']} hide />
                    <Area 
                      type="monotone" 
                      dataKey="val" 
                      stroke={isPositive ? "#10b981" : "#ef4444"} 
                      strokeWidth={1.5}
                      fillOpacity={1} 
                      fill={`url(#spark-${trend.id})`} 
                      isAnimationActive={false}
                    />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        )}
      </Card>
    </Link>
  );
}

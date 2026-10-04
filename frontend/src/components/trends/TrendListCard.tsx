import { Link } from "react-router-dom";
import { Flame, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatSignedPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { EmergingTrend } from "@/types/domain";

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
  const sentimentTone =
    trend.sentiment > 0.1 ? "text-operational-600" : trend.sentiment < -0.1 ? "text-down-600" : "text-ink-muted";

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

        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <p className={cn("font-mono text-sm font-semibold", trend.growth_rate >= 0 ? "text-operational-600" : "text-down-600")}>
              {formatSignedPercent(trend.growth_rate)}
            </p>
            <p className="text-ink-faint">Growth</p>
          </div>
          <div>
            <p className="font-mono text-sm font-semibold text-ink">{trend.volume}</p>
            <p className="text-ink-faint">Mentions</p>
          </div>
          <div>
            <p className={cn("flex items-center justify-center gap-1 font-mono text-sm font-semibold", sentimentTone)}>
              {trend.sentiment > 0.1 ? (
                <TrendingUp className="h-3 w-3" aria-hidden="true" />
              ) : trend.sentiment < -0.1 ? (
                <TrendingDown className="h-3 w-3" aria-hidden="true" />
              ) : null}
              {trend.sentiment.toFixed(2)}
            </p>
            <p className="text-ink-faint">Sentiment</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface RiskGaugeProps {
  score: number;
  level?: string;
  size?: number;
  className?: string;
}

const TONE_BY_SCORE = (score: number) => {
  if (score >= 70) return { stroke: "#C23A3A", tint: "text-down-600", track: "rgb(194 58 58 / 0.10)" };
  if (score >= 40) return { stroke: "#C7821A", tint: "text-degraded-600", track: "rgb(199 130 26 / 0.10)" };
  return { stroke: "#1D9A6C", tint: "text-operational-600", track: "rgb(29 154 108 / 0.10)" };
};

/**
 * A radial 0-100 readout for brand crisis risk -- the one score in the
 * product that most benefits from a shape a reader can size up in a
 * glance, since it's meant to answer "how worried should I be" faster
 * than a bare number can. Used on the dashboard hero and the brand
 * detail page; both consume the same real risk_score, never a
 * client-derived estimate. The arc traces in on mount so the number
 * reads as measured, not just printed.
 */
export function RiskGauge({ score, level, size = 168, className }: RiskGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const tone = TONE_BY_SCORE(clamped);
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={tone.track} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={tone.stroke}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ "--trace-length": circumference } as CSSProperties}
          className="animate-trace-in"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-mono text-4xl font-semibold leading-none text-ink">{clamped.toFixed(0)}</span>
        <span className="mt-1.5 text-[0.6875rem] text-ink-faint">out of 100</span>
        {level && <span className={cn("mt-1 text-xs font-semibold", tone.tint)}>{level}</span>}
      </div>
    </div>
  );
}

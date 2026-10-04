import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-transparent bg-signal-50 text-signal-700",
        neutral: "border-border bg-canvas text-ink-muted",
        operational: "border-transparent bg-operational-50 text-operational-700",
        degraded: "border-transparent bg-degraded-50 text-degraded-700",
        down: "border-transparent bg-down-50 text-down-700",
        outline: "border-border text-ink",
        // Reserved for the "this is genuinely emerging" moment (see
        // TrendListCard) -- a gradient badge earns its place only when
        // the content itself is the one thing on a card meant to grab
        // attention first, not a general-purpose decoration.
        flame: "border-transparent bg-signal-flame text-white",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

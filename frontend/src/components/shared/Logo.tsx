import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
}

/**
 * The brand mark: an EKG-style pulse line standing in for the dot on
 * the "i" -- a deliberate, restrained callback to the product's name.
 * Rendered as static inline SVG, not animated, except for the one
 * functional exception (the live-connection dot in the topbar).
 */
export function Logo({ className, iconOnly = false }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="24" height="24" rx="6" className="fill-signal-500" />
        <path
          d="M3.5 12.5H8L9.5 8L13 17L14.75 12.5H20.5"
          stroke="white"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!iconOnly && (
        <span className="font-display text-base font-semibold tracking-tight text-ink">
          PulseBoard
        </span>
      )}
    </span>
  );
}

import type { ReactNode } from "react";
import { Logo } from "@/components/shared/Logo";

/**
 * Shared shell for /login and /register: form on the left, a branded
 * panel on the right carrying the pulse-line signature at larger scale
 * than anywhere else in the app -- the one place a slightly more
 * expressive brand moment is appropriate, since it's the visitor's
 * first impression of the product, not a working dashboard screen they
 * return to daily.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-sm animate-fade-in-up">
          <Logo className="mb-10" />
          {children}
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-signal-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-signal-flame opacity-90" />
        <PulseBackdrop />
        <div className="relative">
          <p className="font-display text-3xl font-semibold leading-[1.15] text-white">
            Know why it's trending — before it's a crisis.
          </p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-signal-100/85">
            Real-time social listening, sentiment shift detection, and brand
            crisis early warning across Reddit, X, News, and YouTube.
          </p>
        </div>
        <div className="relative flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-signal-100/70">
          <span>Trend</span>
          <span aria-hidden="true">→</span>
          <span>why</span>
          <span aria-hidden="true">→</span>
          <span>sentiment</span>
          <span aria-hidden="true">→</span>
          <span>propagation</span>
          <span aria-hidden="true">→</span>
          <span>risk</span>
        </div>
      </div>
    </div>
  );
}

/** Layered EKG-style traces -- the signature motif, at rest but with
 * depth (two lines at different opacity/scale) so the panel doesn't
 * read as a single flat decoration. */
function PulseBackdrop() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.16]"
      viewBox="0 0 400 400"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 220 H70 L90 160 L120 300 L150 40 L175 220 H400"
        fill="none"
        stroke="white"
        strokeWidth="2"
      />
      <path
        d="M0 300 H40 L55 260 L80 340 L100 180 L120 300 H400"
        fill="none"
        stroke="white"
        strokeWidth="1"
        opacity="0.5"
      />
      <path
        d="M0 130 H30 L45 90 L65 190 L85 60 L100 130 H400"
        fill="none"
        stroke="white"
        strokeWidth="1"
        opacity="0.35"
      />
    </svg>
  );
}

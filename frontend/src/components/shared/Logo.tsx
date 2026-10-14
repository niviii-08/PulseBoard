import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
}

export function Logo({ className, iconOnly = false }: LogoProps) {
  return (
    <div className={cn("group inline-flex items-center gap-3 cursor-pointer select-none", className)}>
      {/* ─── Luminous Twilight Pulse Emblem ─── */}
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1C192B] via-[#2D2644] to-[#5E487C] text-white shadow-[0_4px_12px_rgba(28,25,43,0.22)] border border-[#C2B0D5]/50 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_6px_20px_rgba(124,58,237,0.35)] group-hover:border-[#F2CF43]/60">
        {/* Soft glowing ambient aura on hover */}
        <span className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#C2B0D5] via-[#F6C4B0] to-[#F2CF43] opacity-0 blur-sm transition-opacity duration-300 group-hover:opacity-60" />

        {/* Bespoke Glowing ECG / Pulsewave Icon */}
        <svg
          viewBox="0 0 24 24"
          className="relative z-10 w-5 h-5 text-[#F2CF43] fill-none stroke-current stroke-[2.3] stroke-linecap-round stroke-linejoin-round transition-transform duration-300 group-hover:scale-110"
        >
          <path d="M3 12h3.5l2-6 3.5 12 3-8 2 4H21" />
        </svg>

        {/* Live Radar Ping Dot */}
        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-[#1C192B]" />
        </span>
      </div>

      {/* ─── Editorial Typography ─── */}
      {!iconOnly && (
        <div className="flex flex-col text-left leading-none">
          <div className="flex items-center gap-1">
            <span className="font-display text-lg font-black tracking-tight text-[#1C192B] transition-colors group-hover:text-[#382E54]">
              Pulse<span className="text-[#7C3AED]">Board</span>
            </span>
          </div>
          <span className="text-[9px] font-mono uppercase tracking-[0.22em] text-[#797394] font-bold mt-1 transition-colors group-hover:text-[#4B4660]">
            Social Radar
          </span>
        </div>
      )}
    </div>
  );
}

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        // Display face: Space Grotesk -- geometric, confident, a little
        // technical. Carries the brand's personality on headlines, the
        // wordmark, and big readout numbers. Never body copy.
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        // Body/UI face: Plus Jakarta Sans -- rounder and friendlier than
        // a neutral system sans, which is where the "youthful" half of
        // the brief actually lives day to day (every label, every
        // sentence a person reads), without tipping into playful/casual.
        sans: ["'Plus Jakarta Sans'", "system-ui", "-apple-system", "sans-serif"],
        // Data face: IBM Plex Mono -- for anything that IS a number a
        // reader checks precisely: scores, percentages, timestamps, IDs.
        mono: ["'IBM Plex Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        canvas: "#09090b", // Sleek dark baseline
        surface: "#18181b", // Elevated panel color
        border: {
          DEFAULT: "#27272a",
          strong: "#3f3f46",
        },
        ink: {
          DEFAULT: "#fafafa",
          muted: "#a1a1aa",
          faint: "#52525b",
        },
        // Primary -- indigo/violet. Carries navigation, primary actions,
        // links, and the "this is a PulseBoard thing" moments.
        signal: {
          50: "#e0e7ff",
          100: "#c7d2fe",
          200: "#a5b4fc",
          300: "#818cf8",
          400: "#6366f1",
          500: "#4f46e5",
          600: "#4338ca",
          700: "#3730a3",
          800: "#312e81",
          900: "#1e1b4b",
        },
        // Secondary -- flame. The one place energy/heat is allowed to
        // show: emerging-trend emphasis, virality, the hero gradient.
        // Used with intent, never as background decoration.
        flame: {
          50: "#FFF1ED",
          100: "#FFE0D6",
          200: "#FFC0AC",
          300: "#FF9776",
          400: "#FF6F47",
          500: "#F94F24",
          600: "#DE3812",
          700: "#B32B0D",
          800: "#87220E",
          900: "#5E1A0E",
        },
        operational: {
          50: "#EAF7F1",
          100: "#CFEEE0",
          200: "#A8E0C6",
          300: "#7BCFA9",
          400: "#43B98A",
          500: "#1D9A6C",
          600: "#177E57",
          700: "#136647",
        },
        degraded: {
          50: "#FBF2E7",
          100: "#F3DDB7",
          200: "#EACB92",
          300: "#E0AB5C",
          400: "#D3963A",
          500: "#C7821A",
          600: "#A66914",
          700: "#835211",
        },
        down: {
          50: "#FAECEC",
          100: "#F0CDCD",
          200: "#E6ACAC",
          300: "#DD8A8A",
          400: "#D2605F",
          500: "#C23A3A",
          600: "#A32E2E",
          700: "#822525",
        },
      },
      borderRadius: {
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(19 20 31 / 0.04), 0 1px 1px 0 rgb(19 20 31 / 0.03)",
        raised: "0 8px 20px -6px rgb(19 20 31 / 0.10), 0 2px 6px -2px rgb(19 20 31 / 0.06)",
        popover: "0 8px 24px -4px rgb(19 20 31 / 0.14), 0 2px 8px -2px rgb(19 20 31 / 0.08)",
        glow: "0 0 0 1px rgb(60 76 232 / 0.08), 0 8px 24px -8px rgb(60 76 232 / 0.35)",
      },
      backgroundImage: {
        "signal-flame": "linear-gradient(135deg, #3C4CE8 0%, #7A5FE8 55%, #F94F24 130%)",
        "signal-soft": "linear-gradient(180deg, rgba(60,76,232,0.10) 0%, rgba(60,76,232,0) 100%)",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.55", transform: "scale(0.85)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "status-highlight": {
          "0%": { boxShadow: "0 0 0 0 rgba(60, 76, 232, 0.35)" },
          "100%": { boxShadow: "0 0 0 10px rgba(60, 76, 232, 0)" },
        },
        "slide-up-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "trace-in": {
          from: { strokeDashoffset: "var(--trace-length, 300)" },
          to: { strokeDashoffset: "0" },
        },
      },
      animation: {
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        "fade-in": "fade-in 0.15s ease-out",
        "fade-in-up": "fade-in-up 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        "status-highlight": "status-highlight 1s ease-out",
        "slide-up-in": "slide-up-in 0.25s ease-out",
        shimmer: "shimmer 1.6s ease-in-out infinite",
        "trace-in": "trace-in 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

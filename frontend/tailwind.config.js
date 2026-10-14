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
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        sans: ["'Plus Jakarta Sans'", "system-ui", "-apple-system", "sans-serif"],
        serif: ["'Playfair Display'", "Georgia", "serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        // Ethereal Twilight Pastel + Warm Cream Card + Deep Twilight Plum (#1C192B)
        canvas: "#EFE6D8", // Warm Desert Sand / Cream Pill Fill
        surface: {
          DEFAULT: "#FAF6F0", // Warm Frosted Cream Card Surface
          raised: "#FFFDF9",  // Elevated Ivory Surface
          hover: "#F2EAE0",
        },
        border: {
          DEFAULT: "#1C192B", // Deep Twilight Plum for crisp Neo-Brutalist borders
          strong: "#1C192B",
        },
        ink: {
          DEFAULT: "#1C192B", // Deep Twilight Plum
          muted: "#4B4660",   // Twilight Slate
          faint: "#797394",   // Soft Lavender-Grey
        },
        // Signal: Warm Sunlight Gold (matches login logo & ✦ accents)
        signal: {
          50: "#FEFCE8",
          100: "#FEF9C3",
          200: "#FEF08A",
          300: "#FDE047",
          400: "#F6D85D",
          500: "#F2CF43", // Warm Sunlight Gold
          600: "#CA8A04",
          700: "#A16207",
          800: "#854D0E",
          900: "#713F12",
        },
        // Flame: Warm Sunset Peach & Blush Coral (matches [02] BRAND RISK pill & twilight gradient)
        flame: {
          50: "#FDF4F0",
          100: "#FBE6DD",
          200: "#F8D2C2",
          300: "#F6C4B0",
          400: "#F3B29A",
          500: "#F6C4B0", // Warm Sunset Peach
          600: "#D97A5E",
          700: "#B85A3F",
          800: "#99462E",
          900: "#7F3824",
        },
        // Health: Soft Botanical Sage & Mint (matches sage radial glow)
        health: {
          50: "#F2F7F3",
          100: "#E1EDE4",
          200: "#C5DCCB",
          300: "#ADCBB5",
          400: "#99BEA3",
          500: "#A8C6A3", // Soft Botanical Sage
          600: "#63856C",
          700: "#4A6652",
        },
        // Lilac: Twilight Lilac (matches [01] LIVE INGESTION pill & top sky gradient)
        lilac: {
          50: "#F7F4FA",
          100: "#EFEAF5",
          200: "#E2D7EE",
          300: "#D2C2E3",
          400: "#C8B6DA",
          500: "#C2B0D5",
          600: "#9A82B5",
          700: "#775E94",
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
        sky: {
          lilac: "#C2B0D5",
          peach: "#F6C4B0",
          sunlight: "#FCE8BE",
          blush: "#DFC0CF",
        },
        desert: {
          sand: "#EFE6D8",
          sage: "#758B7C",
        },
        chrome: {
          light: "#F4F5F8",
          DEFAULT: "#C8CBD4",
          dark: "#7A7E8D",
        },
        twilight: {
          ink: "#1C192B",
          muted: "#4B4660",
          subtle: "#797394",
        },
      },
      borderRadius: {
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "24px",
        "4xl": "32px",
      },
      borderWidth: {
        '2': '2px',
        '2.5': '2.5px',
        '3': '3px',
      },
      boxShadow: {
        // Hard Twilight Plum Neo-Brutalist Shadows (#1C192B)
        sm: "2px 2px 0px 0px #1C192B",
        card: "4px 4px 0px 0px #1C192B",
        raised: "8px 8px 0px 0px #1C192B",
        popover: "6px 6px 0px 0px #1C192B",
        glow: "0px 0px 0px 4px #C2B0D5",
      },
      backgroundImage: {
        "signal-flame": "linear-gradient(135deg, #F2CF43 0%, #F6C4B0 100%)",
        "signal-soft": "linear-gradient(180deg, rgba(194,176,213,0.25) 0%, rgba(246,196,176,0) 100%)",
        "ethereal-sunset": "linear-gradient(180deg, #C2B0D5 0%, #D8BFD8 22%, #F6C4B0 52%, #E8D7C2 78%, #EFE6D8 100%)",
        "aura-mesh": "radial-gradient(ellipse 80% 55% at 50% 25%, rgba(254, 235, 196, 0.9) 0%, rgba(246, 196, 176, 0.65) 42%, rgba(194, 176, 213, 0.7) 75%, transparent 100%), radial-gradient(circle at 12% 85%, rgba(117, 139, 124, 0.4) 0%, transparent 50%), radial-gradient(circle at 88% 90%, rgba(223, 192, 207, 0.45) 0%, transparent 50%), linear-gradient(180deg, #C2B0D5 0%, #D8BFD8 22%, #F6C4B0 52%, #E8D7C2 78%, #DFD0BC 100%)",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(0.85)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-scale": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-up-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        aurora: {
          "0%, 100%": { transform: "translateY(0) scale(1) translateX(0)" },
          "50%": { transform: "translateY(-15px) scale(1.02) translateX(8px)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 15px 2px rgba(194, 176, 213, 0.25)" },
          "50%": { boxShadow: "0 0 25px 4px rgba(246, 196, 176, 0.3)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "trace-in": {
          from: { strokeDashoffset: "var(--trace-length, 300)" },
          to: { strokeDashoffset: "0" },
        },
        "page-in": {
          "0%": { opacity: "0", transform: "translateY(12px) scale(0.992)", filter: "blur(4px)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)", filter: "blur(0px)" },
        },
      },
      animation: {
        "pulse-dot": "pulse-dot 2.5s ease-in-out infinite",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-in-up": "fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in-scale": "fade-in-scale 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up-in": "slide-up-in 0.4s ease-out",
        "page-in": "page-in 0.42s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        aurora: "aurora 10s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        glow: "glow 4s ease-in-out infinite",
        shimmer: "shimmer 2s ease-in-out infinite",
        "trace-in": "trace-in 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        kinetic: "cubic-bezier(0.16, 1, 0.3, 1)",
        bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },
    },
  },
  plugins: [],
};

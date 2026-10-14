import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";



// ─── Collage Item Definition ─────────────────────────────────────────────────
interface CollageItem {
  id: string;
  // Tight central pile coordinates (matches 00:00 of recent.design video)
  packedX: number;
  packedY: number;
  packedRot: number;
  // Unpacked spread coordinates (matches 00:27 of recent.design video)
  unpackedX: number;
  unpackedY: number;
  unpackedRot: number;
  z: number;
  enterDelay: number; // ms
}

const ITEMS: CollageItem[] = [
  // Top-left & Left cluster
  { id: "nlp-cube",         packedX: 31.5, packedY: 42.0, packedRot: -14, unpackedX: 10.5, unpackedY: 25.0, unpackedRot: -18, z: 18, enterDelay: 60 },
  { id: "viral-quote",      packedX: 36.2, packedY: 42.2, packedRot:   0, unpackedX: 21.0, unpackedY: 14.0, unpackedRot:  -2, z: 14, enterDelay: 90 },
  { id: "pulse-streams",    packedX: 40.8, packedY: 39.2, packedRot: -11, unpackedX: 22.5, unpackedY: 49.5, unpackedRot: -11, z: 36, enterDelay: 120 },
  { id: "x-likes-pill",     packedX: 36.2, packedY: 48.5, packedRot:  -4, unpackedX: 30.5, unpackedY: 44.5, unpackedRot:  -4, z: 29, enterDelay: 150 },
  { id: "ig-reel-card",     packedX: 32.8, packedY: 55.2, packedRot:  -8, unpackedX: 13.0, unpackedY: 54.0, unpackedRot:  -8, z: 22, enterDelay: 110 },
  { id: "reddit-post-1",    packedX: 37.8, packedY: 56.4, packedRot:  -4, unpackedX: 31.0, unpackedY: 56.0, unpackedRot:  -4, z: 20, enterDelay: 140 },
  { id: "x-tweet-1",        packedX: 34.2, packedY: 65.8, packedRot:  -6, unpackedX: 22.0, unpackedY: 72.5, unpackedRot:  -6, z: 32, enterDelay: 180 },
  { id: "ig-logo-3d",       packedX: 39.0, packedY: 60.4, packedRot: -15, unpackedX: 41.5, unpackedY: 57.5, unpackedRot: -15, z: 42, enterDelay: 200 },
  { id: "pulse-pass-card",  packedX: 41.6, packedY: 54.4, packedRot:  -7, unpackedX: 36.0, unpackedY: 76.5, unpackedRot:  -7, z: 34, enterDelay: 160 },

  // Center cluster
  { id: "ig-post-polaroid", packedX: 45.0, packedY: 44.5, packedRot:  -5, unpackedX: 38.2, unpackedY: 38.0, unpackedRot:  -5, z: 16, enterDelay: 80 },
  { id: "circle-radar",     packedX: 46.8, packedY: 54.6, packedRot:   0, unpackedX: 24.5, unpackedY: 33.5, unpackedRot:   0, z: 38, enterDelay: 40 },
  { id: "sentiment-shift",  packedX: 49.4, packedY: 41.8, packedRot:   7, unpackedX: 49.0, unpackedY: 37.5, unpackedRot:   7, z: 24, enterDelay: 100 },
  { id: "green-star",       packedX: 51.5, packedY: 34.8, packedRot:   5, unpackedX: 60.8, unpackedY: 22.0, unpackedRot:  12, z: 45, enterDelay: 130 },
  { id: "reddit-meme-card", packedX: 51.4, packedY: 50.2, packedRot:   5, unpackedX: 56.0, unpackedY: 49.0, unpackedRot:   5, z: 21, enterDelay: 115 },
  { id: "cat-doodle",       packedX: 44.8, packedY: 63.2, packedRot:  -4, unpackedX: 44.5, unpackedY: 65.5, unpackedRot:  -4, z: 44, enterDelay: 210 },
  { id: "heart-doodle",     packedX: 46.4, packedY: 66.5, packedRot:   8, unpackedX: 56.0, unpackedY: 27.0, unpackedRot:   8, z: 44, enterDelay: 230 },
  { id: "cat-meme",         packedX: 51.4, packedY: 61.2, packedRot:   4, unpackedX: 49.0, unpackedY: 54.0, unpackedRot:   4, z: 40, enterDelay: 170 },

  // Right cluster
  { id: "reddit-logo-3d",   packedX: 54.6, packedY: 39.8, packedRot: -10, unpackedX: 61.5, unpackedY: 27.5, unpackedRot: -10, z: 39, enterDelay: 145 },
  { id: "x-logo-3d",        packedX: 54.0, packedY: 49.0, packedRot: -10, unpackedX: 61.2, unpackedY: 38.0, unpackedRot: -10, z: 37, enterDelay: 165 },
  { id: "youtube-viral",    packedX: 59.5, packedY: 41.8, packedRot:   5, unpackedX: 73.0, unpackedY: 24.5, unpackedRot:   5, z: 15, enterDelay: 70 },
  { id: "yt-logo-3d",       packedX: 64.8, packedY: 39.6, packedRot:  -8, unpackedX: 87.5, unpackedY: 14.0, unpackedRot:  -8, z: 30, enterDelay: 125 },
  { id: "ig-brandwatch",    packedX: 57.4, packedY: 56.5, packedRot:   2, unpackedX: 72.0, unpackedY: 62.0, unpackedRot:   2, z: 25, enterDelay: 95 },
  { id: "likes-burst",      packedX: 59.0, packedY: 63.0, packedRot:   8, unpackedX: 64.5, unpackedY: 57.5, unpackedRot:   8, z: 41, enterDelay: 190 },
  { id: "iphone-matrix",    packedX: 63.2, packedY: 51.0, packedRot:  12, unpackedX: 78.5, unpackedY: 45.0, unpackedRot:  12, z: 35, enterDelay: 105 },
  { id: "motion-passport",  packedX: 66.4, packedY: 57.4, packedRot:   0, unpackedX: 88.0, unpackedY: 54.0, unpackedRot:   0, z: 33, enterDelay: 155 },
  { id: "x-tweet-2",        packedX: 59.6, packedY: 69.2, packedRot:   4, unpackedX: 63.5, unpackedY: 69.5, unpackedRot:   4, z: 43, enterDelay: 220 },
  { id: "social-wave-icon", packedX: 65.2, packedY: 73.0, packedRot:  12, unpackedX: 71.0, unpackedY: 75.5, unpackedRot:  12, z: 46, enterDelay: 240 },
];

// Respected destination routes for every collage item
const ITEM_DESTINATIONS: Record<string, string> = {
  // Memes & viral community content
  "reddit-meme-card": "/trending-memes",
  "cat-meme": "/trending-memes",
  "cat-doodle": "/trending-memes",
  "reddit-logo-3d": "/trending-memes",
  "ig-reel-card": "/trending-memes",
  "ig-post-polaroid": "/trending-memes",
  "ig-logo-3d": "/trending-memes",

  // Discussion threads, tweets & comments
  "reddit-post-1": "/trending-news",
  "x-tweet-1": "/trending-news",
  "x-tweet-2": "/trending-news",
  "youtube-viral": "/culture",
  "yt-logo-3d": "/culture",
  "viral-quote": "/echo-chamber",
  "x-likes-pill": "/radar",
  "x-logo-3d": "/trending-news",

  // Telemetry, Live Radar & Intelligence
  "nlp-cube": "/vibe-check",
  "sentiment-shift": "/vibe-check",
  "circle-radar": "/radar",
  "pulse-pass-card": "/radar",
  "pulse-streams": "/sources",
  "green-star": "/radar",
  "heart-doodle": "/vibe-check",
  "ig-brandwatch": "/brands",
  "likes-burst": "/radar",
  "iphone-matrix": "/radar",
  "motion-passport": "/radar",
  "social-wave-icon": "/radar",
};

const ITEM_HINTS: Record<string, string> = {
  "reddit-meme-card": "Touch to open Trending Memes (r/memes)",
  "cat-meme": "Touch to open Trending Memes",
  "cat-doodle": "Touch to open Trending Memes",
  "reddit-logo-3d": "Touch to open Trending Memes",
  "ig-reel-card": "Touch to open Trending Memes & Reels",
  "ig-post-polaroid": "Touch to open Creator Memes",
  "ig-logo-3d": "Touch to open Trending Memes",
  "reddit-post-1": "Touch to open Trending News & Discussion Threads (r/technology)",
  "x-tweet-1": "Touch to open Breaking 𝕏 Intelligence & Comments",
  "x-tweet-2": "Touch to open Cross-Platform Trend Arbitrage",
  "youtube-viral": "Touch to open YouTube Comments & Culture Pulse",
  "yt-logo-3d": "Touch to open YouTube Culture Pulse",
  "viral-quote": "Touch to open Echo Chamber Analysis",
  "x-likes-pill": "Touch to open Live Radar",
  "x-logo-3d": "Touch to open Breaking 𝕏 Wires",
  "nlp-cube": "Touch to open Vibe Check & NLP Risk",
  "sentiment-shift": "Touch to open Vibe Shift Telemetry",
  "circle-radar": "Touch to open Pulse Radar",
  "pulse-pass-card": "Touch to open Pulse Pass & Telemetry",
  "pulse-streams": "Touch to open Sources Monitor",
  "green-star": "Touch to open Pulse Radar",
  "heart-doodle": "Touch to open Vibe Check",
  "ig-brandwatch": "Touch to open Brand Radar",
  "likes-burst": "Touch to open Pulse Radar",
  "iphone-matrix": "Touch to open Sentiment Matrix Radar",
  "motion-passport": "Touch to open Telemetry Radar",
  "social-wave-icon": "Touch to open Pulse Radar",
};

interface PhysicsState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  scale: number;
  vScale: number;
  targetX: number;
  targetY: number;
  targetRot: number;
  targetScale: number;
  entered: boolean;
}

export default function FastinoIntroPage() {
  const navigate = useNavigate();
  const [dark, setDark] = useState(true);
  const [unpacked, setUnpacked] = useState(false);
  const [clockStr, setClockStr] = useState("10:25:28 am");
  const [topZMap, setTopZMap] = useState<Record<string, number>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const itemEls = useRef<Record<string, HTMLDivElement | null>>({});
  const maxZRef = useRef(60);

  // Initialize spring physics state for each item
  const physRef = useRef<Record<string, PhysicsState>>({});
  if (Object.keys(physRef.current).length === 0) {
    ITEMS.forEach((item) => {
      physRef.current[item.id] = {
        x: 50,
        y: 54,
        vx: 0,
        vy: 0,
        rot: item.packedRot - 12,
        vRot: 0,
        scale: 0.01,
        vScale: 0,
        targetX: item.packedX,
        targetY: item.packedY,
        targetRot: item.packedRot,
        targetScale: 1,
        entered: false,
      };
    });
  }

  const dragRef = useRef<{
    id: string | null;
    startClientX: number;
    startClientY: number;
    startTime: number;
    hasMoved: boolean;
    origX: number;
    origY: number;
    lastClientX: number;
    lastClientY: number;
    velX: number;
    velY: number;
  }>({
    id: null,
    startClientX: 0,
    startClientY: 0,
    startTime: 0,
    hasMoved: false,
    origX: 0,
    origY: 0,
    lastClientX: 0,
    lastClientY: 0,
    velX: 0,
    velY: 0,
  });

  const hoveredIdRef = useRef<string | null>(null);
  const mouseNormRef = useRef({ x: 0, y: 0 });

  // Live IST / GMT+5:30 clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      let hours = now.getHours();
      const mins = String(now.getMinutes()).padStart(2, "0");
      const secs = String(now.getSeconds()).padStart(2, "0");
      const ampm = hours >= 12 ? "pm" : "am";
      hours = hours % 12 || 12;
      setClockStr(`${String(hours).padStart(2, "0")}:${mins}:${secs} ${ampm}`);
    };
    updateClock();
    const id = setInterval(updateClock, 1000);
    return () => clearInterval(id);
  }, []);

  // Staggered entrance trigger & auto-unpack into full social feed
  useEffect(() => {
    const timers = ITEMS.map((item) =>
      setTimeout(() => {
        const p = physRef.current[item.id];
        if (p) p.entered = true;
      }, 100 + item.enterDelay)
    );

    // Auto-spread into full social media canvas
    const unpackTimer = setTimeout(() => {
      setUnpacked(true);
      ITEMS.forEach((item, idx) => {
        const p = physRef.current[item.id];
        if (!p) return;
        setTimeout(() => {
          p.targetX = item.unpackedX;
          p.targetY = item.unpackedY;
          p.targetRot = item.unpackedRot;
        }, idx * 16);
      });
    }, 700);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(unpackTimer);
    };
  }, []);

  // Subtle mouse parallax
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseNormRef.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      };
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // 60fps Spring Physics Engine loop
  useEffect(() => {
    let rafId = 0;
    const stiffness = 0.14;
    const damping = 0.76;

    const tick = () => {
      const draggingId = dragRef.current.id;
      const hoveredId = hoveredIdRef.current;
      const mx = mouseNormRef.current.x;
      const my = mouseNormRef.current.y;

      for (let i = 0; i < ITEMS.length; i++) {
        const item = ITEMS[i];
        const p = physRef.current[item.id];
        const el = itemEls.current[item.id];
        if (!p || !el) continue;

        if (!p.entered) {
          el.style.transform = `translate3d(-50%, -50%, 0) scale(0.01) rotate(${p.rot}deg)`;
          el.style.opacity = "0";
          continue;
        }

        const isDragging = draggingId === item.id;
        const isHovered = hoveredId === item.id;

        // Target scale
        p.targetScale = isDragging ? 1.07 : isHovered ? 1.035 : 1.0;

        // Spring step for X & Y
        const sp = isDragging ? 0.32 : stiffness;
        const dp = isDragging ? 0.68 : damping;

        const ax = (p.targetX - p.x) * sp;
        const ay = (p.targetY - p.y) * sp;
        p.vx = (p.vx + ax) * dp;
        p.vy = (p.vy + ay) * dp;
        p.x += p.vx;
        p.y += p.vy;

        // Velocity-induced tilt while dragging
        const baseRot = unpacked ? item.unpackedRot : item.packedRot;
        const tilt = isDragging ? Math.max(-16, Math.min(16, p.vx * 6.5)) : 0;
        p.targetRot = baseRot + tilt;

        const aRot = (p.targetRot - p.rot) * 0.16;
        p.vRot = (p.vRot + aRot) * 0.75;
        p.rot += p.vRot;

        const aScale = (p.targetScale - p.scale) * 0.2;
        p.vScale = (p.vScale + aScale) * 0.74;
        p.scale += p.vScale;

        // Subtle depth parallax when idle
        const depthFactor = ((item.z - 14) / 35) * 6;
        const px = isDragging ? 0 : mx * depthFactor;
        const py = isDragging ? 0 : my * depthFactor;

        el.style.opacity = "1";
        el.style.left = `${p.x}%`;
        el.style.top = `${p.y}%`;
        el.style.transform = `translate3d(calc(-50% + ${px.toFixed(1)}px), calc(-50% + ${py.toFixed(1)}px), 0) scale(${p.scale.toFixed(3)}) rotate(${p.rot.toFixed(2)}deg)`;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [unpacked]);

  // Toggle between tight 00:00 pile and spread-out 00:27 layout
  const toggleUnpack = useCallback(() => {
    setUnpacked((prev) => {
      const next = !prev;
      ITEMS.forEach((item, idx) => {
        const p = physRef.current[item.id];
        if (!p) return;
        setTimeout(() => {
          p.targetX = next ? item.unpackedX : item.packedX;
          p.targetY = next ? item.unpackedY : item.packedY;
          p.targetRot = next ? item.unpackedRot : item.packedRot;
        }, idx * 18);
      });
      return next;
    });
  }, []);

  // Pointer drag & touch redirection handlers
  const onPointerDown = useCallback((id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    const p = physRef.current[id];
    if (!p) return;

    maxZRef.current += 1;
    const nextZ = maxZRef.current;
    setTopZMap((prev) => ({ ...prev, [id]: nextZ }));

    dragRef.current = {
      id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startTime: Date.now(),
      hasMoved: false,
      origX: p.targetX,
      origY: p.targetY,
      lastClientX: e.clientX,
      lastClientY: e.clientY,
      velX: 0,
      velY: 0,
    };

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d.id) return;
    const container = containerRef.current;
    if (!container) return;

    const dist = Math.hypot(e.clientX - d.startClientX, e.clientY - d.startClientY);
    if (dist > 7) {
      d.hasMoved = true;
    }

    if (!d.hasMoved) return;

    const rect = container.getBoundingClientRect();
    const dxPct = ((e.clientX - d.startClientX) / rect.width) * 100;
    const dyPct = ((e.clientY - d.startClientY) / rect.height) * 100;

    d.velX = ((e.clientX - d.lastClientX) / rect.width) * 100;
    d.velY = ((e.clientY - d.lastClientY) / rect.height) * 100;
    d.lastClientX = e.clientX;
    d.lastClientY = e.clientY;

    const p = physRef.current[d.id];
    if (p) {
      p.targetX = Math.max(4, Math.min(96, d.origX + dxPct));
      p.targetY = Math.max(6, Math.min(92, d.origY + dyPct));
    }
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d.id) return;
    const targetId = d.id;
    const wasMoved = d.hasMoved;
    const timeElapsed = Date.now() - d.startTime;

    const p = physRef.current[targetId];
    if (p && wasMoved) {
      // Apply gentle throw inertia on release
      p.targetX = Math.max(5, Math.min(95, p.targetX + d.velX * 2.2));
      p.targetY = Math.max(7, Math.min(91, p.targetY + d.velY * 2.2));
    }

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    dragRef.current.id = null;

    // When the user touches or taps that meme or that comment (without dragging),
    // redirect directly to its designated respected page!
    if (!wasMoved && timeElapsed < 600) {
      const dest = ITEM_DESTINATIONS[targetId] || "/radar";
      navigate(dest);
    }
  }, [navigate]);

  const handleEnterDashboard = () => {
    navigate("/radar");
  };

  const bg = dark ? "#000000" : "#FFFFFF";
  const fg = dark ? "#E8E8E8" : "#181818";
  const muted = dark ? "#727272" : "#8A8A8A";

  const wrapProps = (item: CollageItem) => ({
    ref: (el: HTMLDivElement | null) => {
      itemEls.current[item.id] = el;
    },
    onPointerDown: (e: React.PointerEvent) => onPointerDown(item.id, e),
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      const dest = ITEM_DESTINATIONS[item.id] || "/radar";
      navigate(dest);
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const dest = ITEM_DESTINATIONS[item.id] || "/radar";
        navigate(dest);
      }
    },
    onPointerEnter: () => {
      hoveredIdRef.current = item.id;
    },
    onPointerLeave: () => {
      if (hoveredIdRef.current === item.id) hoveredIdRef.current = null;
    },
    title: ITEM_HINTS[item.id] || "Touch to open respected page",
    role: "button",
    tabIndex: 0,
    style: {
      position: "absolute" as const,
      left: `${item.packedX}%`,
      top: `${item.packedY}%`,
      zIndex: topZMap[item.id] ?? item.z,
      cursor: "pointer",
      userSelect: "none" as const,
      touchAction: "none" as const,
      willChange: "transform, left, top",
    },
  });

  return (
    <div
      ref={containerRef}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: bg,
        color: fg,
        overflow: "hidden",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif",
        transition: "background-color 0.55s cubic-bezier(0.22, 1, 0.36, 1), color 0.55s cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <style>{`
        .collage-item {
          cursor: pointer !important;
          transition: filter 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .collage-item:hover {
          filter: brightness(1.08) drop-shadow(0 0 14px rgba(194, 176, 213, 0.5));
        }
        .collage-item:active {
          cursor: grabbing !important;
        }
        .editorial-link {
          color: inherit;
          text-decoration: underline;
          text-underline-offset: 3px;
          text-decoration-color: rgba(150,150,150,0.5);
          transition: opacity 0.15s;
          background: none;
          border: none;
          padding: 0;
          font: inherit;
          cursor: pointer;
        }
        .editorial-link:hover { opacity: 0.75; }
      `}</style>

      {/* ─── TOP-RIGHT CONTRAST THEME TOGGLE (exact match to 00:24 in video) ─── */}
      <button
        onClick={() => setDark((d) => !d)}
        title={dark ? "Switch to Light Canvas" : "Switch to Dark Canvas"}
        style={{
          position: "absolute",
          top: 22,
          right: 26,
          zIndex: 200,
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: dark ? "#888" : "#555",
          transition: "transform 0.25s ease, color 0.25s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.15)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M8 1.5A6.5 6.5 0 0 1 8 14.5Z" fill="currentColor" />
        </svg>
      </button>

      {/* ─── INTERACTIVE COLLAGE ITEMS (27 Social Media, Reddit, X, IG & Trend Items) ─── */}

      {/* 1. 3D Isometric NLP/VADER Cube */}
      <div className="collage-item" {...wrapProps(ITEMS[0])}>
        <svg width="48" height="54" viewBox="0 0 46 52" style={{ filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.45))", pointerEvents: "none" }}>
          <polygon points="23,2 44,14 23,26 2,14" fill="#BCE3FF" stroke="#1E3A5F" strokeWidth="1.5" />
          <polygon points="2,14 23,26 23,49 2,37" fill="#7CC0F8" stroke="#1E3A5F" strokeWidth="1.5" />
          <polygon points="23,26 44,14 44,37 23,49" fill="#4B9CE8" stroke="#1E3A5F" strokeWidth="1.5" />
          <text x="23" y="21" fontSize="6.5" fontWeight="900" fontFamily="monospace" fill="#0D2542" transform="rotate(-26 23 21)">NLP</text>
          <text x="4" y="34" fontSize="6" fontWeight="900" fontFamily="monospace" fill="#0D2542" transform="skewY(28)">RISK</text>
        </svg>
      </div>

      {/* 2. Editorial Blue Quote Card */}
      <div className="collage-item" {...wrapProps(ITEMS[1])}>
        <div
          style={{
            width: 116,
            height: 120,
            borderRadius: 5,
            background: "linear-gradient(180deg, #5C83B4 0%, #3E6394 60%, #2E4D7A 100%)",
            padding: "10px 10px 8px",
            boxShadow: "0 14px 36px rgba(0,0,0,0.45)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          <p
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontStyle: "italic",
              fontSize: 10.5,
              lineHeight: 1.25,
              color: "#EBF3FF",
              margin: 0,
              textShadow: "0 1px 4px rgba(0,0,0,0.3)",
            }}
          >
            Every viral crisis starts as a whisper on Reddit before exploding on X.
          </p>
          <div style={{ alignSelf: "center", marginBottom: 4 }}>
            <svg width="34" height="34" viewBox="0 0 34 34">
              <g stroke="#FFFFFF" strokeWidth="1.5" opacity="0.95">
                <line x1="17" y1="2" x2="17" y2="32" />
                <line x1="2" y1="17" x2="32" y2="17" />
                <line x1="6" y1="6" x2="28" y2="28" />
                <line x1="28" y1="6" x2="6" y2="28" />
              </g>
              <circle cx="17" cy="17" r="4" fill="#FFFFFF" />
            </svg>
          </div>
        </div>
      </div>

      {/* 3. pulse.streams Multi-Platform Sticker (like shapes.tools) */}
      <div className="collage-item" {...wrapProps(ITEMS[2])}>
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 12,
            padding: "10px 13px 9px",
            boxShadow: "0 14px 35px rgba(0,0,0,0.45)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            pointerEvents: "none",
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {/* Reddit Orange Circle */}
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#FF4500", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#FFF", fontWeight: 900 }}>
              r/
            </div>
            {/* X Black Square */}
            <div style={{ width: 22, height: 22, borderRadius: 6, background: "#0F1419", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#FFF", fontWeight: 900 }}>
              𝕏
            </div>
            {/* Instagram Pink/Purple */}
            <div style={{ width: 22, height: 22, borderRadius: 6, background: "linear-gradient(135deg,#F58529,#DD2A7B,#8134AF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#FFF", fontWeight: 900 }}>
              ◎
            </div>
            {/* YouTube Red Circle */}
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#FF0000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#FFF", fontWeight: 900 }}>
              ▶
            </div>
          </div>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: "#111111", letterSpacing: "-0.03em", fontFamily: "sans-serif" }}>
            pulse.streams
          </span>
        </div>
      </div>

      {/* 4. Floating X / Twitter Likes & Retweets Pill */}
      <div className="collage-item" {...wrapProps(ITEMS[3])}>
        <div
          style={{
            background: "linear-gradient(135deg, #1E2028 0%, #121318 100%)",
            borderRadius: 999,
            padding: "6px 12px",
            boxShadow: "0 12px 30px rgba(0,0,0,0.6)",
            border: "1px solid rgba(255,255,255,0.14)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            pointerEvents: "none",
          }}
        >
          <span style={{ fontSize: 12, color: "#F43F5E" }}>❤️ 24.8K</span>
          <span style={{ fontSize: 12, color: "#10B981" }}>🔁 6.4K</span>
          <span style={{ fontSize: 10, color: "#38BDF8", fontWeight: 700, fontFamily: "monospace" }}>+310%/hr</span>
        </div>
      </div>

      {/* 5. Instagram Viral Reel Card (@desi.pulse) */}
      <div className="collage-item" {...wrapProps(ITEMS[4])}>
        <div
          style={{
            width: 126,
            height: 168,
            background: "#121214",
            padding: 6,
            borderRadius: 12,
            boxShadow: "0 18px 45px rgba(0,0,0,0.6)",
            border: "1px solid rgba(255,255,255,0.12)",
            position: "relative",
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          <img
            src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80"
            alt="Instagram Reel"
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8, filter: "contrast(1.08) saturate(1.25)" }}
            draggable={false}
          />
          {/* Top IG Reel Header */}
          <div style={{ position: "absolute", top: 12, left: 12, right: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", padding: "2px 6px", borderRadius: 6, fontSize: 8, fontWeight: 800, color: "#fff" }}>
              IG REEL
            </span>
            <span style={{ background: "rgba(0,0,0,0.65)", padding: "2px 6px", borderRadius: 999, fontSize: 8, color: "#fff", fontFamily: "monospace" }}>
              ▶ 1.4M
            </span>
          </div>
          {/* Floating Likes Column */}
          <div style={{ position: "absolute", bottom: 12, right: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 13, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))" }}>❤️</span>
            <span style={{ fontSize: 8, fontWeight: 700, color: "#fff", textShadow: "0 1px 3px #000" }}>98.2K</span>
            <span style={{ fontSize: 12 }}>💬</span>
            <span style={{ fontSize: 8, fontWeight: 700, color: "#fff", textShadow: "0 1px 3px #000" }}>4,120</span>
          </div>
        </div>
      </div>

      {/* 6. Reddit Viral Thread Card (r/technology) */}
      <div className="collage-item" {...wrapProps(ITEMS[5])}>
        <div
          style={{
            width: 195,
            borderRadius: 12,
            background: "#1A1A1B",
            padding: "10px 11px",
            boxShadow: "0 16px 42px rgba(0,0,0,0.65)",
            border: "1px solid rgba(255,69,0,0.35)",
            pointerEvents: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#FF4500", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 9, fontWeight: 900 }}>
              r/
            </div>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: "#D7DADC" }}>r/technology</span>
            <span style={{ fontSize: 8.5, color: "#818384" }}>• 2h ago</span>
          </div>
          <p style={{ fontSize: 10, fontWeight: 600, color: "#F4F4F5", lineHeight: 1.35, margin: "0 0 8px" }}>
             Megathread: Users reporting widespread battery overheating after v4.2 update 🔥
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ background: "rgba(255,69,0,0.15)", border: "1px solid rgba(255,69,0,0.4)", borderRadius: 999, padding: "2px 8px", fontSize: 9, fontWeight: 800, color: "#FF581A" }}>
              ⬆ 18.4K ⬇
            </div>
            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 999, padding: "2px 8px", fontSize: 9, color: "#D7DADC" }}>
              💬 2.3K
            </div>
          </div>
        </div>
      </div>

      {/* 7. X / Twitter Viral Crisis Tweet #1 */}
      <div className="collage-item" {...wrapProps(ITEMS[6])}>
        <div
          style={{
            width: 225,
            background: "#15181C",
            borderRadius: 13,
            padding: "10px 12px",
            boxShadow: "0 18px 44px rgba(0,0,0,0.68)",
            border: "1px solid rgba(29,155,240,0.25)",
            pointerEvents: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <img
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80"
                alt=""
                style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }}
              />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "#F3F4F6" }}>TechRadar Live</span>
                  <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#1D9BF0", color: "#fff", fontSize: 7, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>✓</span>
                </div>
                <span style={{ fontSize: 8.5, color: "#71767B", display: "block" }}>@techradar_ai · 4m</span>
              </div>
            </div>
            <span style={{ fontSize: 13, color: "#E7E9EA", fontWeight: 900 }}>𝕏</span>
          </div>
          <p style={{ fontSize: 10.5, lineHeight: 1.38, color: "#E7E9EA", margin: "0 0 8px" }}>
            BREAKING: Brand sentiment just dropped <span style={{ color: "#F43F5E", fontWeight: 700 }}>-42%</span> in 30 mins. Trending #1 across X and Reddit simultaneously 🚨
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#71767B", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 6 }}>
            <span>💬 612</span>
            <span style={{ color: "#10B981" }}>🔁 3.8K</span>
            <span style={{ color: "#F43F5E", fontWeight: 700 }}>❤️ 29.4K</span>
            <span>📊 1.1M</span>
          </div>
        </div>
      </div>

      {/* 8. 3D Glossy Instagram Camera Logo Sticker */}
      <div className="collage-item" {...wrapProps(ITEMS[7])}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 13,
            background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)",
            boxShadow: "0 12px 28px rgba(214,36,159,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid #FFFFFF",
            pointerEvents: "none",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
        </div>
      </div>

      {/* 9. Hot Pink PulseBoard Intelligence Pass Card */}
      <div className="collage-item" {...wrapProps(ITEMS[8])}>
        <div
          style={{
            width: 122,
            height: 156,
            borderRadius: 12,
            background: "linear-gradient(160deg, #FF66B8 0%, #F42993 55%, #D61379 100%)",
            padding: "10px 11px",
            boxShadow: "0 18px 45px rgba(0,0,0,0.55)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            border: "1px solid rgba(255,255,255,0.35)",
            pointerEvents: "none",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 2 }}>
            {Array.from({ length: 36 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 5,
                  borderRadius: 1,
                  background: [2, 6, 10, 12, 14, 16, 20, 22, 24, 30].includes(i)
                    ? "rgba(255,255,255,0.85)"
                    : "rgba(90, 0, 50, 0.45)",
                }}
              />
            ))}
          </div>
          <div>
            <p style={{ fontSize: 8, color: "rgba(255,255,255,0.85)", margin: 0, fontFamily: "monospace" }}>
              Social Listening
            </p>
            <p style={{ fontSize: 12, fontWeight: 800, color: "#FFFFFF", margin: 0, letterSpacing: "-0.02em" }}>
              Pulse Pass
            </p>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.28)", paddingTop: 5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 6.5, color: "rgba(255,255,255,0.8)", fontFamily: "monospace" }}>
              <span>CRISIS RADAR</span>
              <span>SCORE</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 1 }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: "#fff" }}>Neevetha N</span>
              <span style={{ fontSize: 8.5, fontWeight: 800, color: "#fff", fontFamily: "monospace" }}>94/100</span>
            </div>
            <svg viewBox="0 0 80 22" width="68" height="18" style={{ marginTop: 3 }}>
              <path d="M8 16 C18 4, 24 20, 34 8 C40 2, 44 18, 56 10 C62 6, 68 14, 74 9" stroke="#1A0010" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* 10. Instagram Creator Trend Post Card */}
      <div className="collage-item" {...wrapProps(ITEMS[9])}>
        <div
          style={{
            width: 146,
            height: 175,
            background: "#161618",
            padding: 7,
            borderRadius: 8,
            boxShadow: "0 18px 45px rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.08)",
            pointerEvents: "none",
            position: "relative",
          }}
        >
          <img
            src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80"
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 4 }}
            draggable={false}
          />
          <div style={{ position: "absolute", bottom: 12, left: 12, right: 12, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", borderRadius: 6, padding: "4px 7px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 8.5, color: "#fff", fontWeight: 700 }}>@creator.trend</span>
            <span style={{ fontSize: 8.5, color: "#F43F5E", fontWeight: 800 }}>❤️ 64.1K</span>
          </div>
        </div>
      </div>

      {/* 11. Central Circular Viral Trend Radar Avatar */}
      <div className="collage-item" {...wrapProps(ITEMS[10])}>
        <div
          style={{
            width: 138,
            height: 138,
            borderRadius: "50%",
            overflow: "hidden",
            boxShadow: "0 20px 50px rgba(0,0,0,0.65)",
            border: "3px solid #FF4500",
            position: "relative",
            pointerEvents: "none",
          }}
        >
          <img
            src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80"
            alt="Trending Creator"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            draggable={false}
          />
          <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", background: "#FF4500", color: "#fff", fontSize: 8, fontWeight: 900, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>
            🔥 #1 TRENDING
          </div>
        </div>
      </div>

      {/* 12. Sentiment Shift Alert Square Card */}
      <div className="collage-item" {...wrapProps(ITEMS[11])}>
        <div
          style={{
            width: 102,
            height: 102,
            borderRadius: 6,
            overflow: "hidden",
            boxShadow: "0 14px 36px rgba(0,0,0,0.6)",
            position: "relative",
            pointerEvents: "none",
          }}
        >
          <img
            src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=300&q=80"
            alt="Sentiment"
            style={{ width: "100%", height: "100%", objectFit: "cover", filter: "sepia(0.35) contrast(1.15)" }}
            draggable={false}
          />
          <div
            style={{
              position: "absolute",
              inset: "auto 0 0 0",
              background: "linear-gradient(transparent, rgba(0,0,0,0.9))",
              padding: "12px 6px 5px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <span style={{ fontSize: 8.5, color: "#E11D48", fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 700 }}>
              Vibe Shift
            </span>
            <span style={{ fontSize: 7.5, color: "#E5E7EB", fontFamily: "monospace", fontWeight: 700 }}>
              -38.4% ↓
            </span>
          </div>
        </div>
      </div>

      {/* 13. Neon Green 4-Point Star Sparkle Doodle */}
      <div className="collage-item" {...wrapProps(ITEMS[12])}>
        <svg width="48" height="52" viewBox="0 0 48 52" fill="none" style={{ pointerEvents: "none" }}>
          <path
            d="M24 4 C24 18 30 24 44 26 C30 28 24 34 24 48 C24 34 18 28 4 26 C18 24 24 18 24 4 Z"
            stroke="#34D399"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M12 8 L12 13 M9.5 10.5 L14.5 10.5" stroke="#34D399" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M39 39 L39 43 M37 41 L41 41" stroke="#34D399" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </div>

      {/* 14. Reddit r/memes Polaroid Card with Upvotes */}
      <div className="collage-item" {...wrapProps(ITEMS[13])}>
        <div
          style={{
            width: 126,
            height: 162,
            background: "#F3F4F6",
            padding: 6,
            borderRadius: 6,
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            pointerEvents: "none",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 2px 3px" }}>
            <span style={{ fontSize: 8, fontWeight: 800, color: "#FF4500" }}>r/memes</span>
            <span style={{ fontSize: 8, fontWeight: 800, color: "#111" }}>⬆ 41.2k</span>
          </div>
          <img
            src="https://images.unsplash.com/photo-1508062878650-88b52897f298?auto=format&fit=crop&w=400&q=80"
            alt="Reddit Viral"
            style={{ width: "100%", height: 126, objectFit: "cover", borderRadius: 3 }}
            draggable={false}
          />
        </div>
      </div>

      {/* 15. Neon Green Cat Face Doodle */}
      <div className="collage-item" {...wrapProps(ITEMS[14])}>
        <svg width="68" height="42" viewBox="0 0 68 42" fill="none" style={{ pointerEvents: "none" }}>
          <path
            d="M14 30 L10 10 L24 19 Q34 17 44 19 L58 10 L54 30 Q34 39 14 30 Z"
            stroke="#4ADE80"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="26" cy="24" r="1.8" fill="#4ADE80" />
          <circle cx="42" cy="24" r="1.8" fill="#4ADE80" />
          <path d="M31 27 Q34 30 37 27" stroke="#4ADE80" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="4" y1="22" x2="14" y2="24" stroke="#4ADE80" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="4" y1="27" x2="14" y2="27" stroke="#4ADE80" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="64" y1="22" x2="54" y2="24" stroke="#4ADE80" strokeWidth="1.3" strokeLinecap="round" />
          <line x1="64" y1="27" x2="54" y2="27" stroke="#4ADE80" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </div>

      {/* 16. Neon Red/Pink Outline Heart Doodle */}
      <div className="collage-item" {...wrapProps(ITEMS[15])}>
        <svg width="36" height="34" viewBox="0 0 36 34" fill="none" style={{ pointerEvents: "none" }}>
          <path
            d="M18 29 C18 29 5 20 5 11.5 C5 7.5 8.2 4.5 12 4.5 C14.8 4.5 17 6.2 18 8.5 C19 6.2 21.2 4.5 24 4.5 C27.8 4.5 31 7.5 31 11.5 C31 20 18 29 18 29 Z"
            stroke="#E11D48"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* 17. Viral Meme Sticker ("I check X / I check Reddit") */}
      <div className="collage-item" {...wrapProps(ITEMS[16])}>
        <div
          style={{
            width: 126,
            height: 134,
            background: "#FFFFFF",
            borderRadius: 10,
            padding: "8px 10px",
            boxShadow: "0 18px 45px rgba(0,0,0,0.55)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            pointerEvents: "none",
            border: "1px solid #E5E7EB",
          }}
        >
          <div style={{ fontSize: 9.5, fontWeight: 800, color: "#111" }}>↗ Trend spikes on X ↘</div>
          <div style={{ width: 64, height: 68, borderRadius: 8, overflow: "hidden" }}>
            <img
              src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=240&q=80"
              alt="Cat Meme"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              draggable={false}
            />
          </div>
          <div style={{ fontSize: 9.5, fontWeight: 800, color: "#111" }}>↖ PulseBoard alerts ↙</div>
        </div>
      </div>

      {/* 18. 3D Reddit Orange Logo Icon Sticker */}
      <div className="collage-item" {...wrapProps(ITEMS[17])}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 12,
            background: "linear-gradient(135deg, #FF581A 0%, #FF4500 60%, #CC3700 100%)",
            boxShadow: "0 10px 26px rgba(255,69,0,0.5), inset 0 1px 2px rgba(255,255,255,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid #FFFFFF",
            pointerEvents: "none",
          }}
        >
          {/* Reddit Snoo face SVG */}
          <svg width="26" height="26" viewBox="0 0 24 24" fill="#FFFFFF">
            <circle cx="12" cy="14" r="7" fill="none" stroke="#FFFFFF" strokeWidth="2" />
            <circle cx="9.5" cy="13" r="1.3" />
            <circle cx="14.5" cy="13" r="1.3" />
            <path d="M9.5 16.5 Q12 18.2 14.5 16.5" stroke="#FFFFFF" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <path d="M12 7 L14 3 L17.5 4" stroke="#FFFFFF" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="18.5" cy="4" r="1.4" />
          </svg>
        </div>
      </div>

      {/* 19. 3D Metallic X (Twitter) Logo Sticker */}
      <div className="collage-item" {...wrapProps(ITEMS[18])}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: "radial-gradient(circle at 30% 30%, #3F3F46, #18181B 60%, #09090B 100%)",
            boxShadow: "0 12px 28px rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid rgba(255,255,255,0.85)",
            color: "#FFFFFF",
            fontSize: 22,
            fontWeight: 900,
            pointerEvents: "none",
          }}
        >
          𝕏
        </div>
      </div>

      {/* 20. YouTube Viral Video Trend Card */}
      <div className="collage-item" {...wrapProps(ITEMS[19])}>
        <div
          style={{
            width: 222,
            height: 146,
            borderRadius: 8,
            overflow: "hidden",
            boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
            border: "1px solid rgba(255,255,255,0.12)",
            position: "relative",
            pointerEvents: "none",
          }}
        >
          <img
            src="https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=600&q=80"
            alt="YouTube Trending"
            style={{ width: "100%", height: "100%", objectFit: "cover", filter: "contrast(1.08)" }}
            draggable={false}
          />
          {/* Red YouTube Live Pill */}
          <div style={{ position: "absolute", top: 8, left: 8, background: "#FF0000", color: "#fff", fontSize: 8.5, fontWeight: 800, padding: "2px 7px", borderRadius: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <span>▶ YOUTUBE #1 ON TRENDING</span>
          </div>
          {/* Bottom title bar */}
          <div style={{ position: "absolute", inset: "auto 0 0 0", background: "linear-gradient(transparent, rgba(0,0,0,0.92))", padding: "16px 9px 7px" }}>
            <p style={{ fontSize: 9.5, fontWeight: 700, color: "#fff", margin: 0 }}>
              Why Everyone Is Talking About This Launch (842K views · 3h ago)
            </p>
          </div>
        </div>
      </div>

      {/* 21. 3D YouTube Red Play Button Badge */}
      <div className="collage-item" {...wrapProps(ITEMS[20])}>
        <div
          style={{
            width: 68,
            height: 48,
            borderRadius: 12,
            background: "linear-gradient(180deg, #FF2626 0%, #CC0000 100%)",
            border: "2px solid rgba(255,255,255,0.85)",
            boxShadow: "0 16px 38px rgba(255,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFFFFF">
            <polygon points="8,5 20,12 8,19" />
          </svg>
        </div>
      </div>

      {/* 22. Instagram Post Card (@brandwatch.ai) */}
      <div className="collage-item" {...wrapProps(ITEMS[21])}>
        <div
          style={{
            width: 160,
            background: "#FFFFFF",
            padding: "7px 7px 9px",
            borderRadius: 8,
            boxShadow: "0 20px 50px rgba(0,0,0,0.65)",
            pointerEvents: "none",
            color: "#111",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", background: "linear-gradient(45deg,#f09433,#dc2743,#bc1888)" }} />
              <span style={{ fontSize: 8.5, fontWeight: 800 }}>instagram.trends</span>
            </div>
            <span style={{ fontSize: 9, fontWeight: 700 }}>•••</span>
          </div>
          <img
            src="https://images.unsplash.com/photo-1513584684374-8bab748fbf90?auto=format&fit=crop&w=500&q=80"
            alt="Instagram Post"
            style={{ width: "100%", height: 132, objectFit: "cover", borderRadius: 4 }}
            draggable={false}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, fontSize: 9.5, fontWeight: 800 }}>
            <span>❤️ 142,890 likes</span>
            <span style={{ color: "#E11D48" }}>🔥 +280%</span>
          </div>
        </div>
      </div>

      {/* 23. Floating Instagram & Twitter Likes Burst Sticker */}
      <div className="collage-item" {...wrapProps(ITEMS[22])}>
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 14,
            padding: "6px 10px",
            boxShadow: "0 14px 32px rgba(0,0,0,0.55)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            border: "2px solid #F43F5E",
            pointerEvents: "none",
          }}
        >
          <span style={{ fontSize: 14 }}>❤️‍🔥</span>
          <span style={{ fontSize: 9.5, fontWeight: 900, color: "#E11D48", fontFamily: "monospace" }}>+84.2K</span>
          <span style={{ fontSize: 7, fontWeight: 700, color: "#555", textTransform: "uppercase" }}>Likes/min</span>
        </div>
      </div>

      {/* 24. Dark iPhone PulseBoard Live Sentiment Matrix Mockup */}
      <div className="collage-item" {...wrapProps(ITEMS[23])}>
        <div
          style={{
            width: 128,
            height: 248,
            borderRadius: 26,
            background: "#0B0B0E",
            border: "3px solid #2E2E34",
            padding: "9px 8px",
            boxShadow: "0 24px 60px rgba(0,0,0,0.75)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            color: "#FFFFFF",
            pointerEvents: "none",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px" }}>
            <span style={{ fontSize: 7.5, fontWeight: 700 }}>9:30</span>
            <div style={{ width: 30, height: 8, borderRadius: 999, background: "#000" }} />
            <span style={{ fontSize: 7, color: "#22C55E" }}>● LIVE</span>
          </div>

          <div style={{ padding: "0 3px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 7.5, color: "#A1A1AA", fontWeight: 700 }}>Sentiment Radar</span>
              <span style={{ fontSize: 6.5, color: "#38BDF8", fontFamily: "monospace" }}>42 feeds</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3.5 }}>
              {Array.from({ length: 42 }).map((_, i) => {
                const colors = ["#22C55E", "#EAB308", "#EF4444", "#22C55E", "#3F3F46", "#EAB308", "#22C55E"];
                const c = colors[(i * 3 + 1) % colors.length];
                return (
                  <div
                    key={i}
                    style={{
                      width: 11,
                      height: 11,
                      borderRadius: "50%",
                      border: `1.5px solid ${c}`,
                      background: `${c}22`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div style={{ width: 3, height: 3, borderRadius: "50%", background: c }} />
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ width: 42, height: 3, borderRadius: 999, background: "rgba(255,255,255,0.35)", margin: "0 auto" }} />
        </div>
      </div>

      {/* 25. Cream pulseboard.dev Telemetry Passport Card */}
      <div className="collage-item" {...wrapProps(ITEMS[24])}>
        <div
          style={{
            width: 118,
            height: 160,
            borderRadius: 6,
            background: "#EAE8E1",
            padding: "11px 12px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            border: "1px solid #D6D3C9",
            pointerEvents: "none",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, border: "1.8px solid #222", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 4, height: 4, background: "#222", borderRadius: 1 }} />
            </div>
            <div style={{ textAlign: "right", fontSize: 6.5, lineHeight: 1.35, color: "#555", fontFamily: "monospace" }}>
              <div>pulseboard.dev</div>
              <div>Trend Telemetry</div>
              <div>VADER + Claude</div>
            </div>
          </div>
          <div>
            <p style={{ fontSize: 7.5, color: "#777", fontFamily: "monospace", margin: "0 0 2px" }}>ENGINE v2.4</p>
            <p style={{ fontSize: 11.5, fontWeight: 900, color: "#18181B", margin: 0, letterSpacing: "0.02em", fontFamily: "monospace" }}>
              PULSEBOARD
            </p>
          </div>
        </div>
      </div>

      {/* 26. Viral X / Reddit Cross-Platform Propagation Tweet Card */}
      <div className="collage-item" {...wrapProps(ITEMS[25])}>
        <div
          style={{
            width: 232,
            background: "#121316",
            borderRadius: 12,
            padding: "10px 13px",
            boxShadow: "0 18px 46px rgba(0,0,0,0.68)",
            border: "1px solid rgba(255,255,255,0.09)",
            pointerEvents: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #22C55E, #3B82F6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
              }}
            >
              ⚡
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#FFFFFF" }}>PulseBot Alert</span>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "#1D9BF0",
                color: "#fff",
                fontSize: 7.5,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
              }}
            >
              ✓
            </span>
            <span style={{ fontSize: 9.5, color: "#71767B" }}>@pulse_ai · 1m</span>
          </div>
          <p style={{ fontSize: 10.5, lineHeight: 1.4, color: "#E7E9EA", margin: 0 }}>
            Propagation detected: <span style={{ color: "#FF581A", fontWeight: 700 }}>Reddit</span> → <span style={{ color: "#38BDF8", fontWeight: 700 }}>X</span> → <span style={{ color: "#EC4899", fontWeight: 700 }}>Instagram</span> in 14 mins 🔥
          </p>
        </div>
      </div>

      {/* 27. Multi-Platform Pulse Squircle Icon + Neon Propagation Wave Doodle */}
      <div className="collage-item" {...wrapProps(ITEMS[26])}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, pointerEvents: "none" }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "#18181B",
              border: "1.5px solid rgba(255,255,255,0.14)",
              boxShadow: "0 10px 26px rgba(0,0,0,0.65)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <svg width="56" height="16" viewBox="0 0 56 16" fill="none">
            <path d="M2 12 Q14 2 26 9 T54 4" stroke="#EC4899" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* ─── BOTTOM DOCK BAR (Live Clock + Social Pill + Signature) ─── */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 200,
          display: "flex",
          alignItems: "center",
          gap: 18,
          whiteSpace: "nowrap",
        }}
      >
        {/* Live IST Timestamp */}
        <div style={{ fontSize: 10.5, color: muted, fontFamily: "monospace", letterSpacing: "0.02em" }}>
          <span style={{ opacity: 0.7, marginRight: 6 }}>LIVE</span>
          <span>{clockStr}</span>
        </div>

        {/* Center Floating Pill Dock */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: dark ? "#151517" : "#F1F1F3",
            border: `1px solid ${dark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)"}`,
            borderRadius: 999,
            padding: "4px 5px 4px 12px",
            boxShadow: dark ? "0 10px 30px rgba(0,0,0,0.6)" : "0 8px 24px rgba(0,0,0,0.08)",
          }}
        >
          {/* Unpack / Scatter Collage animation button */}
          <button
            onClick={toggleUnpack}
            title={unpacked ? "Pack Collage Pile" : "Scatter / Unpack Posts"}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              color: muted,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 600,
              gap: 4,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="8" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>{unpacked ? "Pack Pile" : "Scatter Posts"}</span>
          </button>

          {/* X icon */}
          <button
            onClick={handleEnterDashboard}
            title="X Streams"
            style={{ background: "none", border: "none", padding: 0, color: muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </button>

          {/* Primary Pill CTA: Enter PulseBoard */}
          <button
            onClick={handleEnterDashboard}
            style={{
              background: dark ? "#FFFFFF" : "#111111",
              color: dark ? "#09090B" : "#FFFFFF",
              border: "none",
              borderRadius: 999,
              padding: "5px 14px",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
              transition: "transform 0.15s ease, opacity 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Enter PulseBoard →
          </button>
        </div>

        {/* Cursive Signature SVG (Right of dock) */}
        <svg width="42" height="20" viewBox="0 0 60 28" fill="none" style={{ color: fg, opacity: 0.85 }}>
          <path
            d="M8 22 C16 6, 22 4, 20 18 C19 25, 29 10, 34 8 C32 16, 30 22, 38 15 C43 11, 48 16, 56 12 M12 14 L38 12"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";

interface NewsImageProps {
  src?: string | null;
  headline: string;
  category?: string | null;
  isLive?: boolean;
  className?: string;
  hideBadge?: boolean;
  priority?: boolean;
}

// Curated high-resolution editorial photography mapped precisely to each category
const CATEGORY_IMAGES: Record<string, string> = {
  // National / India
  "NATIONAL": "https://images.unsplash.com/photo-1532375810709-75b1da00537c?auto=format&fit=crop&q=80&w=800",
  "NATION": "https://images.unsplash.com/photo-1532375810709-75b1da00537c?auto=format&fit=crop&q=80&w=800",
  "INDIA": "https://images.unsplash.com/photo-1532375810709-75b1da00537c?auto=format&fit=crop&q=80&w=800",

  // Politics & Government
  "POLITICS": "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&q=80&w=800",
  "GOVERNMENT": "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&q=80&w=800",

  // Business, Economy & Finance
  "BUSINESS": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800",
  "BUSINESS & ECONOMY": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=800",
  "ECONOMY": "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=800",
  "STARTUPS": "https://images.unsplash.com/photo-1556761175-5973dc0f32d7?auto=format&fit=crop&q=80&w=800",
  "FINANCE": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=800",

  // Technology & AI
  "TECHNOLOGY": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800",
  "TECH": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800",

  // Cinema, Entertainment & Bollywood
  "MOVIES": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=800",
  "MOVIES & CINEMA": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=800",
  "CINEMA": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=800",
  "ACTORS & GOSSIP": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=800",
  "ENTERTAINMENT": "https://images.unsplash.com/photo-1603190287605-e6ade32fa852?auto=format&fit=crop&q=80&w=800",
  "BOLLYWOOD & ENTERTAINMENT": "https://images.unsplash.com/photo-1603190287605-e6ade32fa852?auto=format&fit=crop&q=80&w=800",
  "BOLLYWOOD": "https://images.unsplash.com/photo-1603190287605-e6ade32fa852?auto=format&fit=crop&q=80&w=800",

  // Sports & Cricket
  "SPORTS & CRICKET": "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=800",
  "CRICKET & SPORTS": "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=800",
  "CRICKET": "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=800",
  "SPORTS": "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=800",

  // Science & Space
  "SCIENCE": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=800",
  "SCIENCE & SPACE": "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&q=80&w=800",
  "SPACE": "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&q=80&w=800",

  // Health & Medicine
  "HEALTH": "https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&q=80&w=800",
  "HEALTH & MEDICINE": "https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&q=80&w=800",

  // Defence & Environment & World & Education
  "DEFENCE": "https://images.unsplash.com/photo-1506443432615-512cb5939db2?auto=format&fit=crop&q=80&w=800",
  "ENVIRONMENT": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=800",
  "WORLD": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800",
  "EDUCATION": "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=800",
};

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&q=80&w=800";

export function getSemanticFallback(category?: string | null, headline?: string): string {
  if (category) {
    const norm = category.toUpperCase().trim();
    if (CATEGORY_IMAGES[norm]) {
      return CATEGORY_IMAGES[norm];
    }
    // Partial matches
    for (const [key, url] of Object.entries(CATEGORY_IMAGES)) {
      if (norm.includes(key) || key.includes(norm)) {
        return url;
      }
    }
  }

  // Keyword scan on headline for immediate relevant editorial imagery
  if (headline) {
    const hl = headline.toLowerCase();
    if (hl.includes("cricket") || hl.includes("ipl") || hl.includes("match") || hl.includes("bcci") || hl.includes("runs")) {
      return CATEGORY_IMAGES["CRICKET"];
    }
    if (hl.includes("modi") || hl.includes("minister") || hl.includes("bjp") || hl.includes("congress") || hl.includes("election") || hl.includes("lok sabha") || hl.includes("sunak")) {
      return CATEGORY_IMAGES["POLITICS"];
    }
    if (hl.includes("ai") || hl.includes("tech") || hl.includes("google") || hl.includes("apple") || hl.includes("meta") || hl.includes("startup")) {
      return CATEGORY_IMAGES["TECHNOLOGY"];
    }
    if (hl.includes("space") || hl.includes("isro") || hl.includes("nasa") || hl.includes("moon") || hl.includes("satellite")) {
      return CATEGORY_IMAGES["SCIENCE & SPACE"];
    }
    if (hl.includes("stock") || hl.includes("market") || hl.includes("rbi") || hl.includes("rupee") || hl.includes("gdp") || hl.includes("sensex") || hl.includes("nifty")) {
      return CATEGORY_IMAGES["BUSINESS & ECONOMY"];
    }
    if (hl.includes("movie") || hl.includes("film") || hl.includes("actor") || hl.includes("actress") || hl.includes("trailer") || hl.includes("cinema") || hl.includes("box office")) {
      return CATEGORY_IMAGES["MOVIES & CINEMA"];
    }
  }

  return DEFAULT_IMAGE;
}

export default function NewsImage({
  src,
  headline,
  category,
  isLive,
  className,
  hideBadge,
  priority = false,
}: NewsImageProps) {
  const fallback = getSemanticFallback(category, headline);
  const [activeSrc, setActiveSrc] = useState<string>(src || fallback);
  const [loaded, setLoaded] = useState<boolean>(false);

  // Synchronize immediately whenever src, headline, or category changes from parent
  useEffect(() => {
    setActiveSrc(src || getSemanticFallback(category, headline));
    setLoaded(false);
  }, [src, headline, category]);

  return (
    <div className={`relative overflow-hidden bg-ink/[0.04] ${className || "w-full h-full min-h-[160px]"}`}>
      <div className="absolute inset-0 bg-ink/10 group-hover:bg-transparent transition duration-500 z-10" />
      
      {/* High-speed image with progressive load, instant fallback & zero blocking */}
      <img
        src={activeSrc}
        alt={headline}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (activeSrc !== fallback) {
            setActiveSrc(fallback);
          }
        }}
        className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-700 ease-out ${
          loaded ? "opacity-100 blur-0" : "opacity-90 blur-[1px]"
        }`}
      />

      {!hideBadge && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
          <span className="px-3 py-1 bg-surface text-[10px] font-black uppercase tracking-widest text-ink rounded-full border-2 border-ink shadow-sm">
            {category || "General"}
          </span>
          {isLive && (
            <span className="px-2.5 py-1 bg-flame-500 text-[10px] font-black uppercase tracking-widest text-white rounded-full border-2 border-ink shadow-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
            </span>
          )}
        </div>
      )}
    </div>
  );
}

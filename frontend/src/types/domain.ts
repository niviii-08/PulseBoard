/**
 * Domain types mirroring the PulseBoard backend's API responses (see
 * backend/app/api/v1/endpoints/*.py and backend/app/schemas/*.py). Kept
 * as plain TypeScript types, not classes -- these are pure data shapes
 * moving across the API boundary.
 *
 * String literal unions are used instead of TypeScript `enum` throughout
 * this project (see tsconfig.app.json's `erasableSyntaxOnly`): enums
 * compile to runtime code, which that flag rejects, and literal unions
 * are the more idiomatic modern-TS choice for API-shaped string values
 * anyway -- they erase completely and match the JSON on the wire exactly.
 */

export type UserRole = "admin" | "viewer";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/* --- Auth --- */

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  full_name: string;
}

/* --- Platforms / sentiment --- */

export type Platform = "reddit" | "x" | "news" | "youtube" | "web" | "tiktok";
export type SentimentLabel = "positive" | "negative" | "neutral";

/* --- Trends (GET /trends/*) --- */

export interface TrendScoreBreakdown {
  growth: number;
  acceleration: number;
  recency: number;
  engagement: number;
  cross_platform: number;
  sentiment_move: number;
  velocity: number;
  baseline_deviation: number;
  label: string;
  explanation: { why_trending: string[] };
  sparkline: number[];
}

export interface EmergingTrend {
  id: string;
  name: string;
  brand_id: string | null;
  volume: number;
  growth_rate: number;
  acceleration: number;
  trend_score: number;
  user_relevance_score?: number;
  personalized_score?: number;
  score_breakdown: TrendScoreBreakdown;
  sentiment: number;
  positive_pct: number;
  negative_pct: number;
  cross_platform_count: number;
  as_of: string;
}

export interface TrendOverview {
  id: string;
  name: string;
  description: string | null;
  keywords: string[] | null;
  first_detected: string | null;
  latest: {
    trend_score: number;
    growth_rate: number;
    acceleration: number;
    volume: number;
    sentiment: number;
    positive_pct: number;
    negative_pct: number;
    neutral_pct: number;
    cross_platform_count: number;
    as_of: string;
  } | null;
}

export interface SentimentPoint {
  timestamp: string;
  sentiment: number;
  positive_pct: number;
  negative_pct: number;
  neutral_pct: number;
  volume: number;
}

export interface PropagationStep {
  platform: Platform;
  sequence_order: number;
  first_seen_at: string;
  mentions_at_detection: number;
  growth_since_entry_pct: number;
}

export interface PropagationResult {
  established: boolean;
  reason?: string | null;
  steps: PropagationStep[];
}

export interface AIExplanation {
  summary_text: string;
  key_drivers: Record<string, unknown> | null;
  kind?: "why_trending" | "sentiment_shift" | null;
  generated_by: "llm" | "deterministic" | null;
  evidence?: Record<string, unknown> | null;
}

export interface Post {
  id: string;
  platform: Platform;
  author: string | null;
  content: string | null;
  url: string | null;
  sentiment_label: SentimentLabel;
  sentiment_score: number;
  engagement_count: number;
  posted_at: string;
  is_demo: boolean;
}

export interface RelatedTopic {
  id: string;
  name: string;
  similarity: number;
}

/* --- Brands (GET/POST/PUT/DELETE /brands/*) --- */

export interface Brand {
  id: string;
  name: string;
  aliases: string[] | null;
  keywords: string[] | null;
  monitoring_enabled: boolean;
}

export interface BrandCreateInput {
  name: string;
  aliases?: string[];
  keywords?: string[];
  monitoring_enabled?: boolean;
}

export type BrandUpdateInput = Partial<BrandCreateInput>;

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export interface RiskDriver {
  driver: string;
  points: number;
  max_points: number;
}

export interface BrandRiskLatest {
  risk_score: number;
  risk_level: RiskLevel;
  drivers: RiskDriver[];
  negative_mentions_pct: number;
  mention_growth_rate: number;
  platforms_affected: number;
  complaint_clusters: string[] | null;
  timestamp: string;
}

export interface BrandRiskHistoryPoint {
  timestamp: string;
  risk_score: number;
  risk_level: RiskLevel;
}

export interface BrandRiskResponse {
  latest: BrandRiskLatest | null;
  history: BrandRiskHistoryPoint[];
}

export interface BrandTrendSummary {
  id: string;
  name: string;
  trend_score: number;
  growth_rate: number;
}

/* --- Alerts (GET /alerts) --- */

export type AlertType =
  | "EMERGING_TREND"
  | "SENTIMENT_SHIFT"
  | "BRAND_RISK"
  | "MENTION_SPIKE"
  | "CROSS_PLATFORM_SPREAD";
export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface Alert {
  id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  topic_id: string | null;
  brand_id: string | null;
  message: string;
  drivers: Record<string, unknown> | null;
  threshold_value: number | null;
  observed_value: number | null;
  acknowledged: boolean;
  created_at: string;
}

/* --- Data sources (GET /sources) --- */

export type SourceStatus = "connected" | "demo" | "not_configured" | "optional";

export interface SourceInfo {
  source: string;
  platform: string;
  status: SourceStatus;
  records: number;
  last_collection: string | null;
}

/* --- Dashboard (GET /dashboard, GET /global) --- */

export interface GlobalOverviewSummary {
  total_articles: number;
  active_topics: number;
  fastest_rising_topic: string;
  countries_represented: number;
  sources_monitored: number;
  average_sentiment: number;
  articles_last_hour: number;
  articles_last_24h: number;
}

export interface CountryDashboardData {
  country: string;
  articles: number;
  top_topics: string[];
  top_categories: string[];
  sentiment: number;
  fastest_growing_topic: string;
  top_sources: string[];
  trending_topic_count: number;
}

export interface DashboardSummary {
  emerging_trends: number;
  total_mentions_24h: number;
  avg_sentiment: number;
  active_alerts: number;
  brand_risk: { score: number; level: RiskLevel };
  monitored_brands: number;
  as_of: string;
}

/* --- Search (GET /search) --- */

export interface SearchBrandResult {
  id: string;
  name: string;
  type: "brand";
}

export interface SearchTopicResult {
  id: string;
  name: string;
  type: "topic";
  trend_score: number | null;
  sentiment: number | null;
}

export interface SearchResult {
  brands: SearchBrandResult[];
  topics: SearchTopicResult[];
}

/* --- Real-time events (WS /ws/status) --- */

export type RealtimeEventType =
  | "EMERGING_TREND_DETECTED"
  | "SENTIMENT_SHIFT_DETECTED"
  | "BRAND_RISK_CHANGED"
  | "ALERT_CREATED"
  | "NEW_HIGH_IMPACT_POST"
  | "TREND_BREAKOUT"
  | "TREND_SCORE_CHANGED"
  | "ANOMALY_DETECTED"
  | "NEW_MAJOR_EVENT";

export interface RealtimeEvent {
  event_type: RealtimeEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

/* --- Pagination envelope (kept for any future paginated endpoint) --- */

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

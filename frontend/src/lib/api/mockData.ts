/**
 * Static mock data returned by every query hook when USE_MOCK_DATA is
 * true (see lib/api/client.ts). Shapes mirror real backend responses
 * exactly -- see docs on app/api/v1/endpoints/*.py -- so a page built
 * against this data behaves identically once pointed at the real API.
 */

import type {
  AIExplanation,
  Alert,
  Brand,
  BrandRiskResponse,
  BrandTrendSummary,
  DashboardSummary,
  EmergingTrend,
  Post,
  PropagationResult,
  RelatedTopic,
  SearchResult,
  SentimentPoint,
  SourceInfo,
  TrendOverview,
  User,
} from "@/types/domain";

export const mockUser: User = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "demo@pulseboard.dev",
  full_name: "Demo User",
  role: "admin",
  is_active: true,
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
};

export const mockEmergingTrends: EmergingTrend[] = [
  {
    id: "trend-1",
    name: "iPhone 18 Battery Issue",
    brand_id: "brand-1",
    volume: 84,
    growth_rate: 340,
    acceleration: 120,
    trend_score: 91,
    score_breakdown: { growth: 30, acceleration: 20, recency: 10, engagement: 13, cross_platform: 8, sentiment_move: 10, velocity: 1.5, baseline_deviation: 50, label: "BREAKOUT", explanation: { why_trending: [] }, sparkline: [] },
    sentiment: -0.32,
    positive_pct: 22,
    negative_pct: 58,
    cross_platform_count: 4,
    as_of: "2026-09-13T17:00:00Z",
  },
  {
    id: "trend-2",
    name: "Nike Delivery Delays",
    brand_id: "brand-2",
    volume: 61,
    growth_rate: 190,
    acceleration: 60,
    trend_score: 76,
    score_breakdown: { growth: 24, acceleration: 15, recency: 10, engagement: 9, cross_platform: 6, sentiment_move: 12, velocity: 1.2, baseline_deviation: 20, label: "RISING", explanation: { why_trending: [] }, sparkline: [] },
    sentiment: -0.51,
    positive_pct: 12,
    negative_pct: 70,
    cross_platform_count: 3,
    as_of: "2026-09-13T17:00:00Z",
  },
  {
    id: "trend-3",
    name: "Quantum Computing Breakthrough",
    brand_id: null,
    trend_score: 34,
    volume: 9,
    growth_rate: 40,
    acceleration: 5,
    score_breakdown: { growth: 6, acceleration: 10, recency: 8, engagement: 3, cross_platform: 4, sentiment_move: 3, velocity: 1.0, baseline_deviation: 5, label: "STABLE", explanation: { why_trending: [] }, sparkline: [] },
    sentiment: 0.4,
    positive_pct: 65,
    negative_pct: 5,
    cross_platform_count: 2,
    as_of: "2026-09-13T17:00:00Z",
  },
];

export const mockTrendOverview: TrendOverview = {
  id: "trend-1",
  name: "iPhone 18 Battery Issue",
  description: "Discussions about iPhone 18 Battery Issue",
  keywords: ["iphone", "battery", "drain", "device"],
  first_detected: "2026-09-12T11:00:00Z",
  latest: {
    trend_score: 91,
    growth_rate: 340,
    acceleration: 120,
    volume: 84,
    sentiment: -0.32,
    positive_pct: 22,
    negative_pct: 58,
    neutral_pct: 20,
    cross_platform_count: 4,
    as_of: "2026-09-13T17:00:00Z",
  },
};

export const mockSentimentSeries: SentimentPoint[] = [
  { timestamp: "2026-09-12T12:00:00Z", sentiment: 0.1, positive_pct: 55, negative_pct: 20, neutral_pct: 25, volume: 6 },
  { timestamp: "2026-09-12T18:00:00Z", sentiment: -0.05, positive_pct: 40, negative_pct: 35, neutral_pct: 25, volume: 14 },
  { timestamp: "2026-09-13T00:00:00Z", sentiment: -0.2, positive_pct: 30, negative_pct: 48, neutral_pct: 22, volume: 22 },
  { timestamp: "2026-09-13T08:00:00Z", sentiment: -0.28, positive_pct: 25, negative_pct: 55, neutral_pct: 20, volume: 30 },
  { timestamp: "2026-09-13T17:00:00Z", sentiment: -0.32, positive_pct: 22, negative_pct: 58, neutral_pct: 20, volume: 12 },
];

export const mockPropagation: PropagationResult = {
  established: true,
  steps: [
    { platform: "reddit", sequence_order: 1, first_seen_at: "2026-09-12T09:20:00Z", mentions_at_detection: 6, growth_since_entry_pct: 133 },
    { platform: "x", sequence_order: 2, first_seen_at: "2026-09-12T12:15:00Z", mentions_at_detection: 22, growth_since_entry_pct: 210 },
    { platform: "news", sequence_order: 3, first_seen_at: "2026-09-12T16:40:00Z", mentions_at_detection: 5, growth_since_entry_pct: 0 },
    { platform: "youtube", sequence_order: 4, first_seen_at: "2026-09-12T19:10:00Z", mentions_at_detection: 8, growth_since_entry_pct: 50 },
  ],
};

export const mockExplanation: AIExplanation = {
  summary_text:
    'Discussion of "iPhone 18 Battery Issue" is up 340% against its recent baseline, with 84 tracked mentions. ' +
    "22% of conversations are positive, 58% are negative, and 20% are neutral. The strongest activity is " +
    "currently coming from x (40 mentions) and reddit (18 mentions).",
  key_drivers: { top_keywords: ["battery", "drain", "overnight", "software"], top_platforms: [["x", 40], ["reddit", 18]] },
  kind: "why_trending",
  generated_by: "deterministic",
};

export const mockPosts: Post[] = [
  {
    id: "post-1",
    platform: "x",
    author: "user_4821",
    content: "Battery life on this thing is way worse than advertised",
    url: null,
    sentiment_label: "negative",
    sentiment_score: -0.6,
    engagement_count: 812,
    posted_at: "2026-09-13T14:02:00Z",
    is_demo: true,
  },
  {
    id: "post-2",
    platform: "reddit",
    author: "user_1190",
    content: "Support says it's a software issue, patch coming next week",
    url: null,
    sentiment_label: "neutral",
    sentiment_score: 0.02,
    engagement_count: 340,
    posted_at: "2026-09-13T10:44:00Z",
    is_demo: true,
  },
];

export const mockRelatedTopics: RelatedTopic[] = [{ id: "trend-4", name: "iOS Update Rollout", similarity: 0.42 }];

export const mockBrands: Brand[] = [
  { id: "brand-1", name: "Apple", aliases: ["Apple Inc"], keywords: ["iphone", "apple"], monitoring_enabled: true },
  { id: "brand-2", name: "Nike", aliases: ["Nike Inc"], keywords: ["nike", "air jordan"], monitoring_enabled: true },
];

export const mockBrandRisk: BrandRiskResponse = {
  latest: {
    risk_score: 74,
    risk_level: "HIGH",
    drivers: [
      { driver: "Mention acceleration", points: 18, max_points: 20 },
      { driver: "Negative sentiment spike", points: 20, max_points: 25 },
      { driver: "Complaint cluster", points: 12, max_points: 15 },
      { driver: "Cross-platform spread", points: 9, max_points: 15 },
    ],
    negative_mentions_pct: 58,
    mention_growth_rate: 340,
    platforms_affected: 4,
    complaint_clusters: ["battery", "drain", "overnight"],
    timestamp: "2026-09-13T17:00:00Z",
  },
  history: [
    { timestamp: "2026-09-12T17:00:00Z", risk_score: 30, risk_level: "MODERATE" },
    { timestamp: "2026-09-13T05:00:00Z", risk_score: 55, risk_level: "MODERATE" },
    { timestamp: "2026-09-13T17:00:00Z", risk_score: 74, risk_level: "HIGH" },
  ],
};

export const mockBrandTrends: BrandTrendSummary[] = [{ id: "trend-1", name: "iPhone 18 Battery Issue", trend_score: 91, growth_rate: 340 }];

export const mockAlerts: Alert[] = [
  {
    id: "alert-1",
    alert_type: "BRAND_RISK",
    severity: "CRITICAL",
    topic_id: null,
    brand_id: "brand-1",
    message: 'Brand risk for "Apple" is elevated (score 74/100).',
    drivers: { risk_score: 74 },
    threshold_value: 60,
    observed_value: 74,
    acknowledged: false,
    created_at: "2026-09-13T17:00:00Z",
  },
  {
    id: "alert-2",
    alert_type: "EMERGING_TREND",
    severity: "WARNING",
    topic_id: "trend-1",
    brand_id: null,
    message: '"iPhone 18 Battery Issue" is an emerging trend (score 91/100).',
    drivers: { trend_score: 91 },
    threshold_value: 70,
    observed_value: 91,
    acknowledged: false,
    created_at: "2026-09-13T16:40:00Z",
  },
];

export const mockSources: SourceInfo[] = [
  { source: "Demo", platform: "demo", status: "demo", records: 245, last_collection: "2026-09-13T16:54:00Z" },
  { source: "News (RSS)", platform: "news", status: "connected", records: 0, last_collection: null },
  { source: "Reddit", platform: "reddit", status: "not_configured", records: 0, last_collection: null },
  { source: "YouTube", platform: "youtube", status: "not_configured", records: 0, last_collection: null },
  { source: "X / Twitter", platform: "x", status: "optional", records: 0, last_collection: null },
];

export const mockDashboard: DashboardSummary = {
  emerging_trends: 2,
  total_mentions_24h: 236,
  avg_sentiment: -0.05,
  active_alerts: 2,
  brand_risk: { score: 74, level: "HIGH" },
  monitored_brands: 2,
  as_of: "2026-09-13T17:00:00Z",
};

export const mockSearchResult: SearchResult = {
  brands: [{ id: "brand-1", name: "Apple", type: "brand" }],
  topics: [{ id: "trend-1", name: "iPhone 18 Battery Issue", type: "topic", trend_score: 91, sentiment: -0.32 }],
};

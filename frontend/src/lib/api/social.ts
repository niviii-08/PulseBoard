/**
 * Typed wrappers around every real backend endpoint (see
 * backend/app/api/v1/endpoints/*.py). Each query/mutation hook in
 * src/hooks/queries/* calls one of these when USE_MOCK_DATA is false,
 * and returns the matching shape from mockData.ts when it's true --
 * see lib/api/client.ts's docstring for that toggle.
 */

import { apiClient } from "@/lib/api/client";
import type {
  AIExplanation,
  Alert,
  Brand,
  BrandCreateInput,
  BrandRiskResponse,
  BrandTrendSummary,
  BrandUpdateInput,
  DashboardSummary,
  EmergingTrend,
  Post,
  PropagationResult,
  RelatedTopic,
  SearchResult,
  SentimentPoint,
  SourceInfo,
  TrendOverview,
  GlobalOverviewSummary,
  CountryDashboardData,
} from "@/types/domain";

/* --- Trends --- */

export const fetchEmergingTrends = () => apiClient.get<EmergingTrend[]>("/trending").then((r) => r.data);

export const fetchTrendOverview = (topicId: string) =>
  apiClient.get<TrendOverview>(`/trends/${topicId}`).then((r) => r.data);

export const fetchSentimentOverTime = (topicId: string) =>
  apiClient.get<SentimentPoint[]>(`/trends/${topicId}/sentiment`).then((r) => r.data);

export const fetchPropagation = (topicId: string) =>
  apiClient.get<PropagationResult>(`/trends/${topicId}/propagation`).then((r) => r.data);

export const fetchExplanation = (topicId: string) =>
  apiClient.get<AIExplanation>(`/trends/${topicId}/explanation`).then((r) => r.data);

export const fetchTopPosts = (topicId: string) => apiClient.get<Post[]>(`/trends/${topicId}/posts`).then((r) => r.data);

export const fetchRelatedTopics = (topicId: string) =>
  apiClient.get<RelatedTopic[]>(`/trends/${topicId}/related`).then((r) => r.data);

/* --- Brands --- */

export const fetchBrands = () => apiClient.get<Brand[]>("/brands").then((r) => r.data);

export const fetchBrand = (brandId: string) => apiClient.get<Brand>(`/brands/${brandId}`).then((r) => r.data);

export const createBrand = (input: BrandCreateInput) => apiClient.post<Brand>("/brands", input).then((r) => r.data);

export const updateBrand = (brandId: string, input: BrandUpdateInput) =>
  apiClient.put<Brand>(`/brands/${brandId}`, input).then((r) => r.data);

export const deleteBrand = (brandId: string) => apiClient.delete<void>(`/brands/${brandId}`).then(() => undefined);

export const fetchBrandRisk = (brandId: string) =>
  apiClient.get<BrandRiskResponse>(`/brands/${brandId}/risk`).then((r) => r.data);

export const fetchBrandSentiment = (brandId: string) =>
  apiClient.get<SentimentPoint[]>(`/brands/${brandId}/sentiment`).then((r) => r.data);

export const fetchBrandTrends = (brandId: string) =>
  apiClient.get<BrandTrendSummary[]>(`/brands/${brandId}/trends`).then((r) => r.data);

export const fetchBrandPosts = (brandId: string) =>
  apiClient.get<Post[]>(`/brands/${brandId}/posts`).then((r) => r.data);

/* --- Alerts --- */

export const fetchAlerts = () => apiClient.get<Alert[]>("/alerts").then((r) => r.data);

export const acknowledgeAlert = (alertId: string) =>
  apiClient.patch<Alert>(`/alerts/${alertId}/acknowledge`).then((r) => r.data);

/* --- Data sources --- */

export const fetchSources = () => apiClient.get<SourceInfo[]>("/sources").then((r) => r.data);

export const runCollectors = (source: "live" | "demo") =>
  apiClient.post<{ queued: boolean; task_id: string }>(`/collectors/run?source=${source}`).then((r) => r.data);

/* --- Dashboard / search --- */

export const fetchGlobalOverview = () => apiClient.get<GlobalOverviewSummary>("/global").then((r) => r.data);

export const fetchCountryDashboard = () => apiClient.get<CountryDashboardData[]>("/countries/dashboard").then((r) => r.data);

export const fetchDashboard = () => apiClient.get<DashboardSummary>("/dashboard").then((r) => r.data);

export const search = (q: string) => apiClient.get<SearchResult>(`/search?q=${encodeURIComponent(q)}`).then((r) => r.data);

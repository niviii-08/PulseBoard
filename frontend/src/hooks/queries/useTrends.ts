import { useQuery } from "@tanstack/react-query";
import { USE_MOCK_DATA } from "@/lib/api/client";
import * as api from "@/lib/api/social";
import {
  mockEmergingTrends,
  mockExplanation,
  mockPosts,
  mockPropagation,
  mockRelatedTopics,
  mockSentimentSeries,
  mockTrendOverview,
} from "@/lib/api/mockData";

const MOCK_DELAY_MS = 300;
const mockDelay = <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), MOCK_DELAY_MS));

export const useEmergingTrends = () =>
  useQuery({
    queryKey: ["trends", "emerging"],
    queryFn: () => (USE_MOCK_DATA ? mockDelay(mockEmergingTrends) : api.fetchEmergingTrends()),
    refetchInterval: USE_MOCK_DATA ? false : 15_000,
  });

export const useTrendOverview = (topicId: string | undefined) =>
  useQuery({
    queryKey: ["trends", topicId],
    queryFn: () => (USE_MOCK_DATA ? mockDelay(mockTrendOverview) : api.fetchTrendOverview(topicId!)),
    enabled: !!topicId,
  });

export const useSentimentOverTime = (topicId: string | undefined) =>
  useQuery({
    queryKey: ["trends", topicId, "sentiment"],
    queryFn: () => (USE_MOCK_DATA ? mockDelay(mockSentimentSeries) : api.fetchSentimentOverTime(topicId!)),
    enabled: !!topicId,
  });

export const usePropagation = (topicId: string | undefined) =>
  useQuery({
    queryKey: ["trends", topicId, "propagation"],
    queryFn: () => (USE_MOCK_DATA ? mockDelay(mockPropagation) : api.fetchPropagation(topicId!)),
    enabled: !!topicId,
  });

export const useExplanation = (topicId: string | undefined) =>
  useQuery({
    queryKey: ["trends", topicId, "explanation"],
    queryFn: () => (USE_MOCK_DATA ? mockDelay(mockExplanation) : api.fetchExplanation(topicId!)),
    enabled: !!topicId,
  });

export const useTopPosts = (topicId: string | undefined) =>
  useQuery({
    queryKey: ["trends", topicId, "posts"],
    queryFn: () => (USE_MOCK_DATA ? mockDelay(mockPosts) : api.fetchTopPosts(topicId!)),
    enabled: !!topicId,
  });

export const useRelatedTopics = (topicId: string | undefined) =>
  useQuery({
    queryKey: ["trends", topicId, "related"],
    queryFn: () => (USE_MOCK_DATA ? mockDelay(mockRelatedTopics) : api.fetchRelatedTopics(topicId!)),
    enabled: !!topicId,
  });

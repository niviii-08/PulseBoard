import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { USE_MOCK_DATA } from "@/lib/api/client";
import * as api from "@/lib/api/social";
import { mockBrandRisk, mockBrands, mockBrandTrends, mockPosts, mockSentimentSeries } from "@/lib/api/mockData";
import type { BrandCreateInput, BrandUpdateInput } from "@/types/domain";

const MOCK_DELAY_MS = 300;
const mockDelay = <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), MOCK_DELAY_MS));

export const useBrands = () =>
  useQuery({
    queryKey: ["brands"],
    queryFn: () => (USE_MOCK_DATA ? mockDelay(mockBrands) : api.fetchBrands()),
  });

export const useBrand = (brandId: string | undefined) =>
  useQuery({
    queryKey: ["brands", brandId],
    queryFn: () =>
      USE_MOCK_DATA ? mockDelay(mockBrands.find((b) => b.id === brandId)!) : api.fetchBrand(brandId!),
    enabled: !!brandId,
  });

export const useBrandRisk = (brandId: string | undefined) =>
  useQuery({
    queryKey: ["brands", brandId, "risk"],
    queryFn: () => (USE_MOCK_DATA ? mockDelay(mockBrandRisk) : api.fetchBrandRisk(brandId!)),
    enabled: !!brandId,
  });

export const useBrandSentiment = (brandId: string | undefined) =>
  useQuery({
    queryKey: ["brands", brandId, "sentiment"],
    queryFn: () => (USE_MOCK_DATA ? mockDelay(mockSentimentSeries) : api.fetchBrandSentiment(brandId!)),
    enabled: !!brandId,
  });

export const useBrandTrends = (brandId: string | undefined) =>
  useQuery({
    queryKey: ["brands", brandId, "trends"],
    queryFn: () => (USE_MOCK_DATA ? mockDelay(mockBrandTrends) : api.fetchBrandTrends(brandId!)),
    enabled: !!brandId,
  });

export const useBrandPosts = (brandId: string | undefined) =>
  useQuery({
    queryKey: ["brands", brandId, "posts"],
    queryFn: () => (USE_MOCK_DATA ? mockDelay(mockPosts) : api.fetchBrandPosts(brandId!)),
    enabled: !!brandId,
  });

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BrandCreateInput) => (USE_MOCK_DATA ? mockDelay(mockBrands[0]) : api.createBrand(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brands"] }),
  });
}

export function useUpdateBrand(brandId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BrandUpdateInput) =>
      USE_MOCK_DATA ? mockDelay(mockBrands[0]) : api.updateBrand(brandId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      queryClient.invalidateQueries({ queryKey: ["brands", brandId] });
    },
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (brandId: string) => (USE_MOCK_DATA ? mockDelay(undefined) : api.deleteBrand(brandId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["brands"] }),
  });
}

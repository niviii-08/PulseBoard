import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { USE_MOCK_DATA } from "@/lib/api/client";
import * as api from "@/lib/api/social";
import { mockSources } from "@/lib/api/mockData";

const mockDelay = <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 300));

export const useSources = () =>
  useQuery({
    queryKey: ["sources"],
    queryFn: () => (USE_MOCK_DATA ? mockDelay(mockSources) : api.fetchSources()),
    refetchInterval: USE_MOCK_DATA ? false : 20_000,
  });

export function useRunCollectors() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (source: "live" | "demo") =>
      USE_MOCK_DATA ? mockDelay({ queued: true, task_id: "mock-task" }) : api.runCollectors(source),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sources"] }),
  });
}

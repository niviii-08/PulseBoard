import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { USE_MOCK_DATA } from "@/lib/api/client";
import * as api from "@/lib/api/social";
import { mockAlerts } from "@/lib/api/mockData";

const mockDelay = <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 300));

export const useAlerts = () =>
  useQuery({
    queryKey: ["alerts"],
    queryFn: () => (USE_MOCK_DATA ? mockDelay(mockAlerts) : api.fetchAlerts()),
    refetchInterval: USE_MOCK_DATA ? false : 15_000,
  });

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) =>
      USE_MOCK_DATA ? mockDelay(mockAlerts.find((a) => a.id === alertId)!) : api.acknowledgeAlert(alertId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });
}

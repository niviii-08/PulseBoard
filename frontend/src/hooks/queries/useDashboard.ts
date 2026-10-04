import { useQuery } from "@tanstack/react-query";
import { USE_MOCK_DATA } from "@/lib/api/client";
import * as api from "@/lib/api/social";
import { mockDashboard } from "@/lib/api/mockData";

const mockDelay = <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 300));

export const useDashboard = () =>
  useQuery({
    queryKey: ["dashboard"],
    queryFn: () => (USE_MOCK_DATA ? mockDelay(mockDashboard) : api.fetchDashboard()),
    refetchInterval: USE_MOCK_DATA ? false : 15_000,
  });

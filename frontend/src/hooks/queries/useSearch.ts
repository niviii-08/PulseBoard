import { useQuery } from "@tanstack/react-query";
import { USE_MOCK_DATA } from "@/lib/api/client";
import * as api from "@/lib/api/social";
import { mockSearchResult } from "@/lib/api/mockData";

const mockDelay = <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 300));

export const useSearch = (q: string) =>
  useQuery({
    queryKey: ["search", q],
    queryFn: () => (USE_MOCK_DATA ? mockDelay(mockSearchResult) : api.search(q)),
    enabled: q.trim().length > 0,
  });

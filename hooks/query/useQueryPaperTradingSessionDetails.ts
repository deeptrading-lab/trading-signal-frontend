import { useQueries } from "@tanstack/react-query";
import { fetchPaperTradingSession } from "@/lib/api/paperTrading/sessions";
import { queryConfig } from "@/lib/query/queryConfig";
import { queryKeys } from "@/hooks/query/queryKeys";

export function useQueryPaperTradingSessionDetails(sessionIds: string[]) {
  return useQueries({
    queries: sessionIds.map((sessionId) => ({
      queryKey: queryKeys.paperTrading.session(sessionId),
      queryFn: () => fetchPaperTradingSession(sessionId),
      staleTime: queryConfig.paperTrading.session.staleTime,
      gcTime: queryConfig.paperTrading.session.gcTime,
      enabled: sessionId.length > 0,
    })),
  });
}

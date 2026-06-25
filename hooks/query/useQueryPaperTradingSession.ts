import { useQuery } from "@tanstack/react-query";
import { fetchPaperTradingSession } from "@/lib/api/paperTrading/sessions";
import { queryConfig } from "@/lib/query/queryConfig";
import { queryKeys } from "@/hooks/query/queryKeys";

export function useQueryPaperTradingSession(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.paperTrading.session(sessionId),
    queryFn: () => fetchPaperTradingSession(sessionId),
    staleTime: queryConfig.paperTrading.session.staleTime,
    gcTime: queryConfig.paperTrading.session.gcTime,
    enabled: sessionId.length > 0,
  });
}

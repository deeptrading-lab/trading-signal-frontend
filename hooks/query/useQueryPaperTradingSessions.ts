import { useQuery } from "@tanstack/react-query";
import { fetchPaperTradingSessions } from "@/lib/api/paperTrading/sessions";
import { queryConfig } from "@/lib/query/queryConfig";
import { queryKeys } from "@/hooks/query/queryKeys";

export function useQueryPaperTradingSessions() {
  return useQuery({
    queryKey: queryKeys.paperTrading.sessions,
    queryFn: fetchPaperTradingSessions,
    staleTime: queryConfig.paperTrading.sessions.staleTime,
    gcTime: queryConfig.paperTrading.sessions.gcTime,
  });
}

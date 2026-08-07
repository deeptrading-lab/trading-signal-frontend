import { useQueries } from "@tanstack/react-query";
import { fetchPaperTradingSession } from "@/lib/api/paperTrading/sessions";
import { paperSessionRefetchInterval } from "@/lib/query/paperTradingPolling";
import { queryConfig } from "@/lib/query/queryConfig";
import { queryKeys } from "@/hooks/query/queryKeys";
import type { PaperTradingSessionDetail } from "@/lib/types/paperTrading/paperTrading";

/** `useQueries` 배열 안에서는 TanStack 이 콜백 인자를 추론하지 못해 최소 형태를 명시한다. */
type SessionQueryState = { state: { data?: PaperTradingSessionDetail } };

/**
 * 세션 상세 팬아웃(자동 포트폴리오 종목별) — 폴링 규칙은 단건 훅과 동일하다.
 * 같은 쿼리 키를 쓰므로 행·카드가 같은 세션을 봐도 폴링 스케줄은 세션당 1개다.
 */
export function useQueryPaperTradingSessionDetails(sessionIds: string[]) {
  return useQueries({
    queries: sessionIds.map((sessionId) => ({
      queryKey: queryKeys.paperTrading.session(sessionId),
      queryFn: () => fetchPaperTradingSession(sessionId),
      staleTime: queryConfig.paperTrading.session.staleTime,
      gcTime: queryConfig.paperTrading.session.gcTime,
      enabled: sessionId.length > 0,
      refetchInterval: (query: SessionQueryState) =>
        paperSessionRefetchInterval(query.state.data),
      refetchOnWindowFocus: true,
    })),
  });
}

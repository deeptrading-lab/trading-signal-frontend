import { useQuery } from "@tanstack/react-query";
import { fetchPaperTradingSession } from "@/lib/api/paperTrading/sessions";
import { paperSessionRefetchInterval } from "@/lib/query/paperTradingPolling";
import { queryConfig } from "@/lib/query/queryConfig";
import { queryKeys } from "@/hooks/query/queryKeys";

/**
 * 단타 세션 상세 — 장중·비종료 세션만 폴링한다(intraday-live-refresh).
 *
 * `enabled: sessionId.length > 0` 은 유지해야 한다. 접힌 과거 행이 `historyMode && !expanded` 일 때
 * 빈 문자열을 넘겨 조회를 끄는 최적화가 여기에 걸려 있다(창 밖 과거 상세 = Supabase 직독 + 틱 전량).
 */
export function useQueryPaperTradingSession(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.paperTrading.session(sessionId),
    queryFn: () => fetchPaperTradingSession(sessionId),
    staleTime: queryConfig.paperTrading.session.staleTime,
    gcTime: queryConfig.paperTrading.session.gcTime,
    enabled: sessionId.length > 0,
    refetchInterval: (query) => paperSessionRefetchInterval(query.state.data),
    refetchOnWindowFocus: true,
  });
}

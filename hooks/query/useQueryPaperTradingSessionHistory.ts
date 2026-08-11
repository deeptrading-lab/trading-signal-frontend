import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchPaperTradingSessionHistory } from "@/lib/api/paperTrading/sessions";
import { queryConfig } from "@/lib/query/queryConfig";
import { queryKeys } from "@/hooks/query/queryKeys";

/**
 * 과거 모의투자 내역 무한 페이지(intraday-history-pagination).
 *
 * 서버가 `hasMore`/`nextOffset` 을 내려주므로 커서 계산은 응답을 그대로 따른다(짧은 페이지에도
 * offset 이 과주행하지 않는다). 저장소 첫 `useInfiniteQuery` 이지만 수동 페이지 누적보다 작다 —
 * 중복 제거·재마운트 복원·in-flight 가드를 직접 구현하지 않아도 된다.
 *
 * 전역 `refetchOnWindowFocus: false`(app/providers.tsx) + 긴 staleTime + 30초 폴링과 겹치지 않는
 * 쿼리 키 덕에 "refetch = 적재된 전 페이지 재요청" 함정에 걸리지 않는다.
 */
export function useQueryPaperTradingSessionHistory() {
  return useInfiniteQuery({
    queryKey: queryKeys.paperTrading.sessionHistory,
    queryFn: ({ pageParam }) => fetchPaperTradingSessionHistory({ offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasMore ? last.nextOffset : undefined),
    staleTime: queryConfig.paperTrading.sessionHistory.staleTime,
    gcTime: queryConfig.paperTrading.sessionHistory.gcTime,
  });
}

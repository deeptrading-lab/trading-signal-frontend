import { useQuery } from "@tanstack/react-query";
import { fetchPaperTradingSessions } from "@/lib/api/paperTrading/sessions";
import { paperSessionsRefetchInterval } from "@/lib/query/paperTradingPolling";
import { queryConfig } from "@/lib/query/queryConfig";
import { queryKeys } from "@/hooks/query/queryKeys";

/**
 * 단타 세션 목록 — 화면이 열려 있는 동안 **항상** 폴링한다(intraday-live-refresh).
 *
 * ★ 폴링 조건에 "실행 중 세션이 있는가" 를 넣지 말 것. 새 세션(오토파일럿 스윕이 나중에 만드는
 *   자식 세션·타 서버·봇)이 생겼다는 사실을 알 수 있는 유일한 통로가 이 폴링이라, 목록 내용에
 *   의존시키면 영영 발견하지 못하는 교착이 된다(구 useIntradayPaperRefresh 버그).
 */
export function useQueryPaperTradingSessions() {
  return useQuery({
    queryKey: queryKeys.paperTrading.sessions,
    queryFn: fetchPaperTradingSessions,
    staleTime: queryConfig.paperTrading.sessions.staleTime,
    gcTime: queryConfig.paperTrading.sessions.gcTime,
    refetchInterval: () => paperSessionsRefetchInterval(),
    // 진입 즉시 1회 — 첫 반영이 폴링 1주기 뒤로 밀리지 않게(목록 1건이라 부담 없음).
    refetchOnMount: "always",
    // 전역 기본(false) 오버라이드 — 탭 복귀 즉시 최신화(선례 useQueryWorkerStatus).
    refetchOnWindowFocus: true,
  });
}

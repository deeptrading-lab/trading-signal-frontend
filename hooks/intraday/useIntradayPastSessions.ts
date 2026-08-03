/**
 * useIntradayPastSessions — 과거 모의투자 내역 페이지네이션 도메인 훅(intraday-history-pagination).
 *
 * 과거 섹션은 더 이상 인메모리 세션 목록(최근 20건)에서 파생되지 않는다. Supabase 원장을 페이지
 * 단위로 읽는 전용 엔드포인트를 쓰므로 "더 보기"로 과거 전체를 볼 수 있다. 오늘/과거 분리는 여전히
 * 클라(KST) 규칙(`filterPastSessions`)이 담당한다 — 응답에는 오늘 세션도 섞여 올 수 있다.
 *
 * TanStack 원시 타입은 여기서 흡수하고 컴포넌트에는 평평한 형태만 노출한다.
 */

"use client";

import { useMemo } from "react";
import { useQueryPaperTradingSessionHistory } from "@/hooks/query/useQueryPaperTradingSessionHistory";
import type {
  PaperTradingPosition,
  PaperTradingSession,
  PaperTradingSessionHistoryResponse,
} from "@/lib/types/paperTrading/paperTrading";

/**
 * 적재된 페이지 병합 — 세션 id 중복 제거 후 `startedAt` 내림차순.
 *
 * 중복 제거가 필요한 이유: 정렬 기준이 `updated_at` 이라 페이지를 넘기는 사이 어떤 세션이 갱신되면
 * 경계에서 같은 행이 두 페이지에 걸칠 수 있다(offset 페이지네이션의 알려진 드리프트).
 */
export function mergeHistoryPages(pages: PaperTradingSessionHistoryResponse[]): {
  sessions: PaperTradingSession[];
  positionsBySessionId: Record<string, PaperTradingPosition[]>;
} {
  const byId = new Map<string, PaperTradingSession>();
  const positionsBySessionId: Record<string, PaperTradingPosition[]> = {};
  for (const page of pages) {
    for (const session of page.sessions) {
      if (byId.has(session.id)) continue;
      byId.set(session.id, session);
    }
    Object.assign(positionsBySessionId, page.positionsBySessionId);
  }
  const sessions = [...byId.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return { sessions, positionsBySessionId };
}

export function useIntradayPastSessions() {
  const query = useQueryPaperTradingSessionHistory();

  const merged = useMemo(
    () => mergeHistoryPages(query.data?.pages ?? []),
    [query.data],
  );

  return {
    sessions: merged.sessions,
    positionsBySessionId: merged.positionsBySessionId,
    /** Supabase 저장소가 켜져 있는지 — false 면 빈 목록이 장애가 아니라 "저장소 꺼짐". */
    configured: query.data?.pages[0]?.configured ?? true,
    hasMore: query.hasNextPage,
    isLoading: query.isLoading,
    isLoadingMore: query.isFetchingNextPage,
    isError: query.isError,
    loadMore: () => void query.fetchNextPage(),
    retry: () => void query.refetch(),
  };
}

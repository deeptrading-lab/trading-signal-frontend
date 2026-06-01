/**
 * 관심종목 multi-price 조회 훅 — TanStack Query useQuery.
 *
 * PRD `stock-api-integration` (PR-C) §3.5 — Watchlist 도메인 훅 신설. 화면 전환은 후속 PR.
 *
 * - queryKey = `queryKeys.watchlist.list(tickers)`. tickers 정규화 (sort + join) 로 순서 무관 캐시.
 * - staleTime / gcTime = `queryConfig.watchlist.list` (30s / 5min).
 * - enabled — tickers 빈 배열 시 비활성. localStorage 영구화는 후속 PR 책임.
 * - placeholderData = keepPreviousData (`watchlist-batch-quotes` §3.4) — 상단 새로고침/
 *   tickers 변경 등 refetch 중 이전 데이터를 유지해 이미 불러온 행이 빈 스켈레톤으로 깜박이지 않는다.
 */

"use client";

import {
  useQuery,
  keepPreviousData,
  type UseQueryResult,
} from "@tanstack/react-query";
import { getWatchlist, type WatchlistQuote } from "@/lib/api/watchlist/list";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";

export type UseQueryWatchlistOptions = {
  /**
   * 외부에서 명시적으로 비활성화할 때 사용. 미전달이어도 내부 `tickers.length > 0` 가드로
   * 빈 배열이면 자동 비활성화된다 — `WatchlistContainer` 는 이 가드에 의존해 옵션을 넘기지 않는다.
   */
  enabled?: boolean;
};

export function useQueryWatchlist(
  tickers: readonly string[],
  options?: UseQueryWatchlistOptions,
): UseQueryResult<WatchlistQuote[], ApiError> {
  return useQuery<WatchlistQuote[], ApiError>({
    queryKey: queryKeys.watchlist.list(tickers),
    queryFn: () => getWatchlist(tickers),
    enabled: (options?.enabled ?? true) && tickers.length > 0,
    staleTime: queryConfig.watchlist.list.staleTime,
    gcTime: queryConfig.watchlist.list.gcTime,
    placeholderData: keepPreviousData,
    // retry 0 — BFF(`/api/watchlist`)가 이미 transient(EGW00201/네트워크) 1회 재시도 + mock
    // graceful degrade 를 하므로, RQ 가 또 재시도하면 실패 시 KIS 일괄콜이 최대 4회로 증폭된다.
    // BFF 의 degrade 결과를 그대로 수용(이중 재시도 제거).
    retry: 0,
    refetchOnWindowFocus: false,
  });
}

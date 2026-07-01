/**
 * 헤더 글로벌 마켓 티커 조회 훅 — TanStack Query useQuery.
 *
 * PRD `header-market-ticker` §3.5 — 헤더 client 컨테이너가 소비. `useQuery` 직접 import 금지.
 *
 * - queryKey = `queryKeys.market.ticker`(인자 없음).
 * - queryFn = `getMarketTicker`(same-origin `/api/market/ticker`).
 * - staleTime / gcTime = `queryConfig.market.ticker`(단일 진실 원천).
 * - retry: 1, refetchOnWindowFocus: false — 헤더 티커는 보조 정보.
 * - `enabled` (perf WS-4): 티커는 데스크탑 전용(`hidden lg:flex`)이라, 모바일에서는 BFF 왕복을
 *   아예 막기 위해 호출부(`HeaderMarketTicker`)가 `enabled: isDesktop` 으로 게이트한다. 미지정 시 true.
 *
 * BFF 가 전체 실패 시 mock 5건을 200 으로 graceful degrade 하므로, 본 훅은 에러보다
 * data 를 우선 소비한다(헤더 끊김 0).
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getMarketTicker } from "@/lib/api/market/ticker";
import type { MarketTicker } from "@/lib/types/layout/marketTicker";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";

export function useQueryMarketTicker(options?: {
  enabled?: boolean;
}): UseQueryResult<MarketTicker[], ApiError> {
  return useQuery<MarketTicker[], ApiError>({
    queryKey: queryKeys.market.ticker,
    queryFn: getMarketTicker,
    enabled: options?.enabled ?? true,
    staleTime: queryConfig.market.ticker.staleTime,
    gcTime: queryConfig.market.ticker.gcTime,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

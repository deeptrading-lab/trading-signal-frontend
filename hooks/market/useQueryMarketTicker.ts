/**
 * 헤더 글로벌 마켓 티커 조회 훅 — TanStack Query useQuery.
 *
 * PRD `header-market-ticker` §3.5 — 헤더 client 컨테이너가 소비. `useQuery` 직접 import 금지.
 *
 * - queryKey = `queryKeys.market.ticker`(인자 없음).
 * - queryFn = `getMarketTicker`(same-origin `/api/market/ticker`).
 * - staleTime / gcTime = `queryConfig.market.ticker`(60s / 5min).
 * - retry: 1, refetchOnWindowFocus: false — 헤더 티커는 보조 정보.
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

export function useQueryMarketTicker(): UseQueryResult<
  MarketTicker[],
  ApiError
> {
  return useQuery<MarketTicker[], ApiError>({
    queryKey: queryKeys.market.ticker,
    queryFn: getMarketTicker,
    staleTime: queryConfig.market.ticker.staleTime,
    gcTime: queryConfig.market.ticker.gcTime,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

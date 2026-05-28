/**
 * 보유 종목 multi-price 조회 훅 — TanStack Query useQuery.
 *
 * PRD `stock-api-integration` (PR-C) §3.5 — Dashboard 도메인 훅 신설. 화면 전환은 후속 PR.
 *
 * - queryKey = `queryKeys.dashboard.holdings(tickers)`. tickers 정규화 (sort + join) 로 순서 무관 캐시.
 * - staleTime / gcTime = `queryConfig.dashboard.holdings`. 실시간성 우선 (10s / 5min).
 * - enabled — tickers 빈 배열 시 비활성. 컴포넌트가 보유 종목 결정 전 mount 되어도 호출 0.
 * - retry 1 — 일시 네트워크 실패 대응. 한 종목 실패 시 전체 실패 (`getHoldings` Promise.all 정합).
 *
 * 후속 화면 전환 PR 이 `components/dashboard/HoldingsList.tsx` 등에서 본 훅 호출.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getHoldings, type HoldingQuote } from "@/lib/api/dashboard/holdings";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";

export type UseQueryHoldingsOptions = {
  enabled?: boolean;
};

export function useQueryHoldings(
  tickers: readonly string[],
  options?: UseQueryHoldingsOptions,
): UseQueryResult<HoldingQuote[], ApiError> {
  return useQuery<HoldingQuote[], ApiError>({
    queryKey: queryKeys.dashboard.holdings(tickers),
    queryFn: () => getHoldings(tickers),
    enabled: (options?.enabled ?? true) && tickers.length > 0,
    staleTime: queryConfig.dashboard.holdings.staleTime,
    gcTime: queryConfig.dashboard.holdings.gcTime,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

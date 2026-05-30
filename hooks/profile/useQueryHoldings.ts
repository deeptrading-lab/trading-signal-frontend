/**
 * 보유 종목 multi-price 조회 훅 — TanStack Query useQuery.
 *
 * home-market-redesign PR1 — `hooks/dashboard/useQueryHoldings.ts` 를 profile 도메인으로 이전
 * (계좌 위젯 `/dashboard` → `/profile`). 인터페이스 무변경, 도메인 폴더만 dashboard → profile.
 *
 * - queryKey = `queryKeys.profile.holdings(tickers)`. tickers 정규화 (sort + join) 로 순서 무관 캐시.
 * - staleTime / gcTime = `queryConfig.profile.holdings`. 실시간성 우선 (10s / 5min).
 * - enabled — tickers 빈 배열 시 비활성. 컴포넌트가 보유 종목 결정 전 mount 되어도 호출 0.
 * - retry 1 — 일시 네트워크 실패 대응. 한 종목 실패 시 전체 실패 (`getHoldings` Promise.all 정합).
 *
 * 현 PR1 의 자산 섹션은 mock 직접 주입(server)이라 본 훅은 실계좌 연동(후속, PRD §8.4)을 위한 준비.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getHoldings, type HoldingQuote } from "@/lib/api/profile/holdings";
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
    queryKey: queryKeys.profile.holdings(tickers),
    queryFn: () => getHoldings(tickers),
    enabled: (options?.enabled ?? true) && tickers.length > 0,
    staleTime: queryConfig.profile.holdings.staleTime,
    gcTime: queryConfig.profile.holdings.gcTime,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

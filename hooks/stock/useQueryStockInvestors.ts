/**
 * 표면 B — 종목별 개인/외국인/기관 최근 N일 순매수 추이 조회 훅 (TanStack Query useQuery).
 *
 * PRD `investor-flow` §4.B.
 *
 * - queryKey = `queryKeys.stock.investors(ticker)`.
 * - staleTime / gcTime = `queryConfig.stock.investors`(5min / 30min) — 일별 데이터(장 종료 후 반영).
 * - enabled — ticker 빈 문자열 시 비활성(종목 미정 단계 mount 시 호출 0).
 * - retry 0 — BFF(`/api/stock/investors`)가 mock fallback 으로 degrade 하므로 이중 재시도 불필요.
 * - refetchOnWindowFocus false — 일별 데이터라 focus 마다 갱신 불필요.
 *
 * 응답 가공 불필요 — BFF 가 이미 `StockInvestorTrend` 화면 친화 스키마 반환.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getStockInvestors } from "@/lib/api/stock/investors";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { ApiError } from "@/lib/api/errors";
import type { StockInvestorTrend } from "@/lib/types/stock/investors";

export type UseQueryStockInvestorsOptions = {
  /** false 면 쿼리 비활성(접힌 섹션 지연 등). 기본 true. */
  enabled?: boolean;
};

export function useQueryStockInvestors(
  ticker: string,
  options?: UseQueryStockInvestorsOptions,
): UseQueryResult<StockInvestorTrend, ApiError> {
  return useQuery<StockInvestorTrend, ApiError>({
    queryKey: queryKeys.stock.investors(ticker),
    queryFn: () => getStockInvestors(ticker),
    enabled: (options?.enabled ?? true) && ticker.length > 0,
    staleTime: queryConfig.stock.investors.staleTime,
    gcTime: queryConfig.stock.investors.gcTime,
    retry: 0,
    refetchOnWindowFocus: false,
  });
}

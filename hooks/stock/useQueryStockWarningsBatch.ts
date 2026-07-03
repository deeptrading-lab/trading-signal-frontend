/**
 * 매수 유의사항 배치 훅 — 단타 워치 표·추천 후보 칩. `/api/stock/warnings/batch` BFF 경유.
 *
 * PRD `intraday-warnings` §3-1:
 *   - 가시 티커(워치 행 + 추천 후보) union 을 한 번에 조회 → 티커별 경보 맵.
 *   - fail-soft(BFF 가 실패·키없음도 200 + 빈 맵) — 표/칩 렌더를 절대 막지 않는다.
 *   - 장중(+마감 유예)에만 60초 자동 갱신(VI 추적), 장외엔 재요청 없음.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getStockWarningsBatch } from "@/lib/api/stock/warnings";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import { isKstMarketHoursWithCloseGrace } from "@/lib/utils/kstMarketHours";
import type { ApiError } from "@/lib/api/errors";
import type { StockWarningsBatchResponse } from "@/lib/types/stock/warnings";

export function useQueryStockWarningsBatch(
  tickers: readonly string[],
): UseQueryResult<StockWarningsBatchResponse, ApiError> {
  return useQuery({
    queryKey: queryKeys.stock.warningsBatch(tickers),
    queryFn: () => getStockWarningsBatch(tickers),
    staleTime: queryConfig.stock.warnings.staleTime,
    gcTime: queryConfig.stock.warnings.gcTime,
    enabled: tickers.length > 0,
    refetchInterval: () => (isKstMarketHoursWithCloseGrace() ? 60_000 : false),
  });
}

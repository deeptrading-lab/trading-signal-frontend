/**
 * 당일 분봉 차트 훅 — 단타워치 차트 탭. `/api/stock/chart-minute` BFF 경유.
 *
 * 탭이 열려 있을 때만(enabled) 페치하고, 장중(+마감 유예)에는 60초 간격으로 자동 갱신해
 * 봉이 실시간으로 따라온다. 장외에는 재요청하지 않는다.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getStockMinuteChart } from "@/lib/api/stock/minuteChart";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import { isKstMarketHoursWithCloseGrace } from "@/lib/utils/kstMarketHours";
import type { ApiError } from "@/lib/api/errors";
import type { StockMinuteCandle } from "@/lib/api/kis/types";

/** 타임프레임별 당일 전체를 덮는 봉 수(세션 390분 + 여유). */
function barsFor(timeframe: number): number {
  if (timeframe <= 1) return 390;
  if (timeframe <= 3) return 130;
  if (timeframe <= 5) return 78;
  return 26;
}

export function useQueryMinuteChart(
  ticker: string,
  timeframe: number,
  options?: { enabled?: boolean },
): UseQueryResult<StockMinuteCandle[], ApiError> {
  return useQuery({
    queryKey: queryKeys.stock.minuteChart(ticker, timeframe),
    queryFn: () => getStockMinuteChart(ticker, timeframe, barsFor(timeframe)),
    staleTime: queryConfig.stock.minuteChart.staleTime,
    gcTime: queryConfig.stock.minuteChart.gcTime,
    enabled: (options?.enabled ?? true) && ticker.length > 0,
    refetchInterval: () => (isKstMarketHoursWithCloseGrace() ? 60_000 : false),
  });
}

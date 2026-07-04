/**
 * 분봉 차트 훅 — 단타워치·종목 상세 차트 탭. `/api/stock/chart-minute` BFF 경유.
 *
 * `priorDays` 0 = 당일 한 세션(기본), >0 = 과거 거래일 포함 멀티데이(minute-chart-interval-period).
 *
 * 탭이 열려 있을 때만(enabled) 페치한다. **당일(priorDays 0)** 은 장중(+마감 유예) 60초 자동
 * 갱신으로 봉이 실시간으로 따라온다. **멀티데이(priorDays>0)** 는 콜 수가 커(1개월 ≈ 수십 콜)
 * 자동 갱신을 끈다 — 과거 구간은 불변이고, 최신 봉은 기간을 다시 고르면 갱신된다.
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
  priorDays: number = 0,
  options?: { enabled?: boolean },
): UseQueryResult<StockMinuteCandle[], ApiError> {
  return useQuery({
    queryKey: queryKeys.stock.minuteChart(ticker, timeframe, priorDays),
    queryFn: () => getStockMinuteChart(ticker, timeframe, barsFor(timeframe), priorDays),
    staleTime: queryConfig.stock.minuteChart.staleTime,
    gcTime: queryConfig.stock.minuteChart.gcTime,
    enabled: (options?.enabled ?? true) && ticker.length > 0,
    // 멀티데이(priorDays>0)는 재요청 비용이 커 자동 갱신 제외 — 당일만 장중 60초 갱신.
    refetchInterval: () =>
      priorDays === 0 && isKstMarketHoursWithCloseGrace() ? 60_000 : false,
  });
}

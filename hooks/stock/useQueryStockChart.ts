/**
 * 종목 차트 시세 훅 — `inquire-daily-itemchartprice` 기반 100봉.
 *
 * MACD(26+9) · RSI(14) 보조지표 계산에 필요한 데이터를 제공한다.
 * staleTime/gcTime 은 일봉(`stock.daily`)와 동일 — 장 종료 후 갱신 주기 정합.
 */

"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchStockChart, type ChartPeriod } from "@/lib/api/stock/chart";
import { queryKeys } from "@/hooks/query/queryKeys";
import { queryConfig } from "@/lib/query/queryConfig";
import type { StockDailyCandle } from "@/lib/api/kis/types";
import type { ApiError } from "@/lib/api/errors";

export type { ChartPeriod };

export interface UseQueryStockChartOptions {
  period?: ChartPeriod;
  days?: number;
  /** 분봉 활성 시 일봉 쿼리를 끄는 등 조건부 페치용(기본 true). ticker 유무와 AND. */
  enabled?: boolean;
}

export function useQueryStockChart(
  ticker: string,
  { period = "D", days = 100, enabled = true }: UseQueryStockChartOptions = {},
): UseQueryResult<StockDailyCandle[], ApiError> {
  return useQuery<StockDailyCandle[], ApiError>({
    queryKey: queryKeys.stock.chart(ticker, period, days),
    queryFn: () => fetchStockChart(ticker, days, period),
    enabled: Boolean(ticker) && enabled,
    staleTime: queryConfig.stock.daily.staleTime,
    gcTime: queryConfig.stock.daily.gcTime,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

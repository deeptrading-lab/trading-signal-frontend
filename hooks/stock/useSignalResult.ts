/**
 * useSignalResult — 종목 일봉(200일) → evaluateSignal → SignalResult.
 *
 * 데이터 소스: useQueryStockChart("D", 200봉) — MIN_BARS(130)보다 크게 확보해
 *   120일선·지표 워밍업이 안정적으로 계산된다.
 *
 * 순수 엔진 호출이라 BFF 추가 호출 0건(차트 데이터 캐시 공유).
 */

"use client";

import { useMemo } from "react";
import { useQueryStockChart } from "@/hooks/stock/useQueryStockChart";
import { evaluateSignal } from "@/lib/signal/engine";
import type { SignalResult } from "@/lib/types/signal";

/** 엔진 워밍업 확보를 위한 최소 일봉 수(MIN_BARS 130 + 여유). */
const SIGNAL_FETCH_DAYS = 200;

export type UseSignalResultReturn = {
  result: SignalResult | null;
  isLoading: boolean;
  isError: boolean;
};

export function useSignalResult(ticker: string): UseSignalResultReturn {
  const { data, isLoading, isError } = useQueryStockChart(ticker, {
    period: "D",
    days: SIGNAL_FETCH_DAYS,
  });

  const result = useMemo<SignalResult | null>(() => {
    if (!data || data.length === 0) return null;
    // 오름차순 정렬 보장(useQueryStockChart 이미 정렬하지만 방어).
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
    return evaluateSignal(sorted);
  }, [data]);

  return { result, isLoading, isError };
}

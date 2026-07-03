/**
 * useSignalResult — 종목 일봉(200일) → evaluateSignal → SignalResult.
 *
 * 데이터 소스: useQueryStockChart("D", 200봉) — MIN_BARS(130)보다 크게 확보해
 *   120일선·지표 워밍업이 안정적으로 계산된다.
 *
 * ⚠️ 중복 페치(의도적 보류 — stock-route-perf #4): 차트(useChartData, `D`/`days`+워밍업)와 시그널
 *   (`D`/200)이 같은 KIS 일봉 엔드포인트를 서로 다른 `days` 키로 각 1회 호출한다 → 상세 초기 진입 시
 *   D/160(차트 기본 3개월+워밍업 60)·D/200(시그널) 2왕복. 단일 키 공유는 안전하지 않아 보류한다:
 *     - 차트 `days` 는 기간 선택기(1개월40·3개월100·6개월200·1년400)로 가변이라 시그널의 고정 200봉과
 *       대부분 범위에서 어긋난다(공유해도 범위 변경 즉시 재페치).
 *     - 짧은 범위(1개월 → fetch 100 < MIN_BARS 130)에선 차트 데이터로 시그널 워밍업을 못 채운다.
 *   억지 정렬은 기간 선택기 또는 시그널 정확성을 깨뜨리므로 두 쿼리를 분리 유지한다(교차 캐시 히트는
 *   6개월 범위처럼 우연히 fetchDays 가 200 근처일 때만). 이후 재방문은 각자 staleTime 캐시 히트.
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

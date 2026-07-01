/**
 * useChartOptions — 종목 차트 오버레이 토글(매물대·볼린저밴드) 상태 + localStorage 지속.
 *
 * SSR-safe 패턴(useBreakpoint / useChartTheme 동일): 첫 렌더는 기본값(전부 off)으로 폴백 →
 *   마운트 후 useEffect 에서 저장값으로 swap(hydration mismatch 0). 토글 시 write-through.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_CHART_OPTIONS,
  readChartOptions,
  writeChartOptions,
  type ChartOptions,
} from "@/lib/store/chart/chartOptions";

export type UseChartOptionsResult = {
  options: ChartOptions;
  toggle: (key: keyof ChartOptions) => void;
};

export function useChartOptions(): UseChartOptionsResult {
  // SSR/첫 렌더 폴백 — 기본값. 마운트 후 저장값으로 swap.
  const [options, setOptions] = useState<ChartOptions>(DEFAULT_CHART_OPTIONS);

  useEffect(() => {
    setOptions(readChartOptions());
  }, []);

  const toggle = useCallback((key: keyof ChartOptions) => {
    setOptions((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      writeChartOptions(next);
      return next;
    });
  }, []);

  return { options, toggle };
}

/**
 * ChartThemeContext — 런타임 차트 테마(`useChartTheme` 결과)를 차트 서브트리에 전달.
 *
 * 왜 context 인가(props 대신):
 *   `CandleBar`/`CandleTooltip` 은 recharts 가 `shape=`/`content=` 로 clone·렌더하는 엘리먼트라
 *   부모가 props 를 직접 꽂기 어렵다(recharts 가 자체 props 를 주입·소유). 이들 안에서 직접
 *   `useChartTheme()` 를 호출하면 recharts 렌더 컨텍스트에서 hook 안전성이 불확실하고,
 *   `getComputedStyle` 호출이 봉마다 중복된다. → 상위(StockDailyChart)가 훅을 1회 호출해
 *   context 로 내려주고, 조각들은 `useChartThemeContext()` 로 구독한다(단일 reference 공유).
 */

"use client";

import { createContext, useContext } from "react";
import type { ChartTheme } from "@/hooks/utils/useChartTheme";

const ChartThemeContext = createContext<ChartTheme | null>(null);

export const ChartThemeProvider = ChartThemeContext.Provider;

/** 차트 서브트리(CandleBar/CandleTooltip 등)에서 런타임 테마 구독. */
export function useChartThemeContext(): ChartTheme {
  const ctx = useContext(ChartThemeContext);
  if (!ctx) {
    throw new Error("useChartThemeContext 는 ChartThemeProvider 안에서만 사용할 수 있어요.");
  }
  return ctx;
}

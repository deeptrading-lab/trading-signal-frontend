/**
 * Home 차트 timeframe 옵션 mock — 6개.
 *
 * 시안 `AnalysisDashboard.tsx` 의 timeframe 토글 정합 (1D / 1W / 1M / 3M / 1Y / ALL).
 */

import type { TimeframeOption } from "@/lib/types/home/timeframes";

export const TIMEFRAME_OPTIONS_MOCK: TimeframeOption[] = [
  { key: "1D", label: "1D" },
  { key: "1W", label: "1W" },
  { key: "1M", label: "1M" },
  { key: "3M", label: "3M" },
  { key: "1Y", label: "1Y" },
  { key: "ALL", label: "ALL" },
];

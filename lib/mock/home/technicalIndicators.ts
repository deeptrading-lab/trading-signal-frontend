/**
 * Home 기술적 지표 mock — RSI / MACD / 볼린저 밴드 3건.
 *
 * 시안 `AnalysisDashboard.tsx` 우측 컬럼 정합. 라벨 / 시그널 표시 카피는 모두 카피 키로 참조 —
 * `lib/copy/home/labels.ts` 의 `INDICATOR_LABEL_*` / `INDICATOR_SIGNAL_*`.
 * mock 은 enum + 카피 키 + 정량 값만.
 */

import type { TechnicalIndicator } from "@/lib/types/home/technicalIndicators";

export const TECHNICAL_INDICATORS_MOCK: TechnicalIndicator[] = [
  {
    kind: "RSI",
    labelKey: "INDICATOR_LABEL_RSI",
    displayKey: "INDICATOR_SIGNAL_OVERBOUGHT",
    signal: "OVERBOUGHT",
    value: 65.4,
  },
  {
    kind: "MACD",
    labelKey: "INDICATOR_LABEL_MACD",
    displayKey: "INDICATOR_SIGNAL_BUY",
    signal: "BUY",
  },
  {
    kind: "BOLLINGER",
    labelKey: "INDICATOR_LABEL_BOLLINGER",
    displayKey: "INDICATOR_SIGNAL_BOLLINGER_UPPER",
    signal: "WATCH",
  },
];

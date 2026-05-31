/**
 * stockChartConfig — 종목 차트 컨트롤(차트타입·봉·기간) 상수/타입/기본값.
 *
 * `StockDailyChart`(렌더)와 `StockPageLayout`(상태 소유)이 공유한다.
 *   - 데스크탑 확대/축소 토글 시 `StockDailyChart` 가 리마운트되어 내부 state 가 리셋되던 버그 →
 *     상태를 `StockPageLayout` 으로 끌어올리기 위해 두 파일이 같은 기본값/헬퍼를 import 한다.
 */

import type { ChartPeriod } from "@/hooks/stock/useQueryStockChart";

// ── 차트 타입 ───────────────────────────────────────────
export type ChartType = "candle" | "line";

/** 토글 순서: 캔들 우선(기본값) → 라인. */
export const CHART_TYPES: { label: string; type: ChartType }[] = [
  { label: "캔들", type: "candle" },
  { label: "라인", type: "line" },
];

// ── 봉·기간 설정 ────────────────────────────────────────
export type PeriodConfig = { label: string; period: ChartPeriod };
export type RangeConfig = { label: string; days: number };

export const PERIODS: PeriodConfig[] = [
  { label: "일봉", period: "D" },
  { label: "주봉", period: "W" },
  { label: "월봉", period: "M" },
];

export const RANGES: Record<ChartPeriod, RangeConfig[]> = {
  D: [
    { label: "1주", days: 7 },
    { label: "1개월", days: 40 },
    { label: "3개월", days: 100 },
    { label: "6개월", days: 200 },
    { label: "1년", days: 400 },
  ],
  W: [
    { label: "3개월", days: 100 },
    { label: "6개월", days: 200 },
    { label: "1년", days: 400 },
  ],
  M: [
    { label: "1년", days: 400 },
    { label: "3년", days: 1_200 },
    { label: "전체", days: 3_000 },
  ],
};

// ── 기본값 ──────────────────────────────────────────────
export const DEFAULT_CHART_TYPE: ChartType = "candle";
export const DEFAULT_PERIOD: ChartPeriod = "D";

/**
 * 봉별 기본 선택 범위 — "1주"는 단축 보기용 옵션이라 기본값에서 제외(일봉 기본 3개월).
 * (RANGES 배열 인덱스에 의존하지 않도록 명시값으로 둔다 — 범위 추가/순서 변경에 안전.)
 */
export const DEFAULT_DAYS_BY_PERIOD: Record<ChartPeriod, number> = {
  D: 100, // 3개월
  W: 100, // 3개월
  M: 400, // 1년
};

export const DEFAULT_DAYS = DEFAULT_DAYS_BY_PERIOD["D"];

/** 봉 종류 변경 시 기본으로 잡는 범위. */
export function defaultDaysForPeriod(p: ChartPeriod): number {
  return DEFAULT_DAYS_BY_PERIOD[p];
}

/**
 * 봉 단위 라벨 — 보조지표 "데이터 부족 (최소 N{단위})" 안내에서 단위를 봉 종류에 맞춰 표기.
 * 일봉→"일", 주봉→"주", 월봉→"월".
 */
export const PERIOD_UNIT: Record<ChartPeriod, string> = {
  D: "일",
  W: "주",
  M: "월",
};

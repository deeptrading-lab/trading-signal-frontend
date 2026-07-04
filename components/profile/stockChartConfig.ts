/**
 * stockChartConfig — 종목 차트 컨트롤(차트타입·봉·기간) 상수/타입/기본값.
 *
 * `StockDailyChart`(렌더)와 `StockPageLayout`(상태 소유)이 공유한다.
 *   - 데스크탑 확대/축소 토글 시 `StockDailyChart` 가 리마운트되어 내부 state 가 리셋되던 버그 →
 *     상태를 `StockPageLayout` 으로 끌어올리기 위해 두 파일이 같은 기본값/헬퍼를 import 한다.
 */

import type { ChartPeriod } from "@/hooks/stock/useQueryStockChart";

/**
 * 메인 차트 봉 단위(UI 레벨) — 분봉(당일) + 일/주/월봉(`ChartPeriod`).
 *
 * `ChartPeriod`("D"|"W"|"M")은 일봉 라우트(`/stock/chart`) 전용이라 그대로 두고, 분봉("m")을
 *   더한 UI 유니온을 셸/차트 경계에서 쓴다. 분봉은 별도 라우트(`/stock/chart-minute`)로 페치한다.
 */
export type MainInterval = "m" | ChartPeriod;

/**
 * 우측 y축(가격·거래량·MACD·RSI) 공통 폭(px). 최신 종가 태그(LastPriceTag)가
 * 이 폭만큼의 축 영역에 우정렬되므로, 축과 태그가 같은 상수를 공유해야 정렬이 맞는다.
 */
export const CHART_AXIS_WIDTH = 56;

// ── 차트 타입 ───────────────────────────────────────────
export type ChartType = "candle" | "line";

/** 토글 순서: 캔들 우선(기본값) → 라인. */
export const CHART_TYPES: { label: string; type: ChartType }[] = [
  { label: "캔들", type: "candle" },
  { label: "라인", type: "line" },
];

/** 매물대(가격대별 거래량) 오버레이 토글 라벨. */
export const CHART_VOLUME_PROFILE_LABEL = "매물대";
/** 이동평균선(MA) 오버레이 토글 라벨. */
export const CHART_MA_LABEL = "이평선";
/** 볼린저밴드 오버레이 토글 라벨. */
export const CHART_BOLLINGER_LABEL = "볼린저밴드";
/** 거래량 이동평균(VMA) 오버레이 토글 라벨. */
export const CHART_VOLUME_MA_LABEL = "거래량 이평";
/** VWAP(거래량 가중 평균가) 오버레이 토글 라벨 — 약어라 원문 유지(MACD·RSI 동일). */
export const CHART_VWAP_LABEL = "VWAP";

/** 차트 오버레이 옵션 드롭다운 트리거 라벨. */
export const CHART_OPTIONS_LABEL = "옵션";

/**
 * 이동평균선(SMA) 기간 — 종가 시리즈에 5·20·60·120 을 겹쳐 그린다(HTS 표준). 색은 chart-ma{p} 토큰.
 * `useChartData`(계산)·`StockDailyChart`(렌더·범례) 가 이 단일 배열을 공유해 기간/색 매핑을 일치시킨다.
 */
export const MA_PERIODS = [5, 20, 60, 120] as const;
export type MaPeriod = (typeof MA_PERIODS)[number];

/** 거래량 이동평균(VMA) 기간 — 거래량 서브플롯 SMA. */
export const VMA_PERIOD = 20;

/**
 * 차트 오버레이 옵션 목록 — "옵션 ▾" 드롭다운의 체크박스 항목.
 * `key` 는 `ChartOptions`(lib/store/chart/chartOptions) 필드와 1:1.
 * 순서: 가격 서브플롯 오버레이(이평선·볼린저·VWAP·매물대) → 거래량 서브플롯(거래량 이평).
 */
export const CHART_OVERLAY_OPTIONS: {
  key: "movingAverage" | "volumeProfile" | "bollinger" | "volumeMA" | "vwap";
  label: string;
}[] = [
  { key: "movingAverage", label: CHART_MA_LABEL },
  { key: "bollinger", label: CHART_BOLLINGER_LABEL },
  { key: "vwap", label: CHART_VWAP_LABEL },
  { key: "volumeProfile", label: CHART_VOLUME_PROFILE_LABEL },
  { key: "volumeMA", label: CHART_VOLUME_MA_LABEL },
];

// ── 봉·기간 설정 ────────────────────────────────────────
export type IntervalConfig = { label: string; interval: MainInterval };
export type RangeConfig = { label: string; days: number };
export type TimeframeConfig = { label: string; timeframe: number };
export type MinutePeriodConfig = { label: string; priorDays: number };

/** 봉 종류 토글 순서: 분봉(당일) → 일봉 → 주봉 → 월봉. */
export const INTERVALS: IntervalConfig[] = [
  { label: "분봉", interval: "m" },
  { label: "일봉", interval: "D" },
  { label: "주봉", interval: "W" },
  { label: "월봉", interval: "M" },
];

/**
 * 분봉 간격 선택지 — 분봉이 활성일 때 **간격 하위 선택기**로 노출된다(기간과 별개 슬롯).
 *   값은 `useQueryMinuteChart` 의 `timeframe`(분). 기본 5분.
 *   일/주/월봉이 "기간"을 고르듯 분봉은 "간격(1/3/5/10/15분)"과 "기간(당일/1주/1개월)"을 각각 고른다.
 */
export const MINUTE_TIMEFRAMES: TimeframeConfig[] = [
  { label: "1분", timeframe: 1 },
  { label: "3분", timeframe: 3 },
  { label: "5분", timeframe: 5 },
  { label: "10분", timeframe: 10 },
  { label: "15분", timeframe: 15 },
];

/**
 * 분봉 기간 선택지 — 고른 간격을 **며칠치** 볼지(과거 거래일 수 priorDays). 일/주/월봉의 범위(days)와
 *   같은 자리에서 같은 UI 로 노출한다(분봉만의 별도 슬롯이라 간격 선택기와 나란히 뜬다).
 *   · 당일 → priorDays 0 (오늘 한 세션)  · 1주 → 5거래일  · 1개월 → 20거래일
 *
 *   ⚠️ 멀티데이 분봉은 페이지네이션 호출·봉 수가 크다(1개월 1분봉 ≈ 7,800봉·수십 콜). 3개월+ 는
 *   비현실적이라 1개월(20거래일)에서 컷 — 모든 간격에 동일 적용(간격별 가변 아님).
 */
export const MINUTE_PERIODS: MinutePeriodConfig[] = [
  { label: "당일", priorDays: 0 },
  { label: "1주", priorDays: 5 },
  { label: "1개월", priorDays: 20 },
];

export const RANGES: Record<ChartPeriod, RangeConfig[]> = {
  D: [
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
export const DEFAULT_INTERVAL: MainInterval = "D";
/** 일봉 기준 두 번째 범위(3개월) — 기존 기본값 유지. */
export const DEFAULT_DAYS = RANGES["D"][1].days;
/** 분봉 기본 간격(분) — `MINUTE_TIMEFRAMES` 세 번째(5분)와 정합. */
export const DEFAULT_TIMEFRAME = 5;
/** 분봉 기본 기간 — `MINUTE_PERIODS` 첫 항목(당일=priorDays 0)과 정합. */
export const DEFAULT_MINUTE_PRIOR_DAYS = MINUTE_PERIODS[0].priorDays;

/**
 * 봉 종류 변경 시 기본으로 잡는 범위(각 봉의 첫 범위).
 * 분봉("m")은 days 를 쓰지 않고 `timeframe` 으로 제어하므로 여기선 기본 days 만 돌려준다(타입 총족용).
 */
export function defaultDaysForPeriod(interval: MainInterval): number {
  if (interval === "m") return DEFAULT_DAYS;
  return RANGES[interval][0].days;
}

/**
 * 봉 단위 라벨 — 보조지표 "데이터 부족 (최소 N{단위})" 안내에서 단위를 봉 종류에 맞춰 표기.
 * 분봉→"분", 일봉→"일", 주봉→"주", 월봉→"월".
 */
export const PERIOD_UNIT: Record<MainInterval, string> = {
  m: "분",
  D: "일",
  W: "주",
  M: "월",
};

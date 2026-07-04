/**
 * 종목 차트 오버레이 옵션 영구화 — 저장소 격리 모듈.
 *
 * 이동평균선·매물대(Volume Profile)·볼린저밴드·VWAP·거래량 이평 표시 토글을 브라우저에 저장해
 * 재방문 시 유지한다. `lib/store/theme/store.ts` 의 `hasWindow()` 가드 패턴을 복제(SSR no-op).
 *
 * 저장값: `{ movingAverage, volumeProfile, bollinger, volumeMA, vwap }` (각 boolean).
 * **`movingAverage` 만 기본 ON** (토스·증권사 HTS 관례 — MA 는 항시 표시), 나머지는 기본 off.
 * 미설정/파싱 실패 시 기본값 폴백. 영구화 실패(quota 등)는 화면 동작을 막지 않는다 — 메모리 state 는 유지.
 */

export type ChartOptions = {
  /** 이동평균선(MA 5/20/60/120) 오버레이. 기본 ON. */
  movingAverage: boolean;
  /** 매물대(가격대별 거래량) 오버레이. */
  volumeProfile: boolean;
  /** 볼린저밴드(20/2) 오버레이. */
  bollinger: boolean;
  /** 거래량 이동평균(VMA 20) — 거래량 서브플롯 라인. */
  volumeMA: boolean;
  /** VWAP(거래량 가중 평균가) — 가격 서브플롯 기준선. */
  vwap: boolean;
};

/** 기본값 — 이동평균선만 on(관례), 나머지 off. SSR/미설정 폴백. */
export const DEFAULT_CHART_OPTIONS: ChartOptions = {
  movingAverage: true,
  volumeProfile: false,
  bollinger: false,
  volumeMA: false,
  vwap: false,
};

/** 본 모듈·useChartOptions 훅이 공유하는 단일 키. */
export const STORAGE_KEY = "finsight:chart-options";

function hasWindow(): boolean {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

function normalize(value: unknown): ChartOptions {
  if (typeof value !== "object" || value === null) return DEFAULT_CHART_OPTIONS;
  const v = value as Record<string, unknown>;
  return {
    // 기존 저장값에 movingAverage 키가 없으면(구버전) 기본 ON 으로 복원 — MA 는 항시 표시가 관례.
    movingAverage: typeof v.movingAverage === "boolean" ? v.movingAverage : true,
    volumeProfile: typeof v.volumeProfile === "boolean" ? v.volumeProfile : false,
    bollinger: typeof v.bollinger === "boolean" ? v.bollinger : false,
    volumeMA: typeof v.volumeMA === "boolean" ? v.volumeMA : false,
    vwap: typeof v.vwap === "boolean" ? v.vwap : false,
  };
}

/** 영구화된 옵션을 읽는다. 미설정/파싱 실패 시 기본값. SSR 안전. */
export function readChartOptions(): ChartOptions {
  if (!hasWindow()) return DEFAULT_CHART_OPTIONS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CHART_OPTIONS;
    return normalize(JSON.parse(raw) as unknown);
  } catch {
    return DEFAULT_CHART_OPTIONS;
  }
}

/** 옵션을 영구화한다. SSR/실패 시 no-op. */
export function writeChartOptions(options: ChartOptions): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
  } catch {
    // quota 초과 등 — 영구화 실패는 무시(메모리 state 유지).
  }
}

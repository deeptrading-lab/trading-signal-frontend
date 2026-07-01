/**
 * 종목 차트 오버레이 옵션 영구화 — 저장소 격리 모듈.
 *
 * 매물대(Volume Profile)·볼린저밴드 표시 토글을 브라우저에 저장해 재방문 시 유지한다.
 * `lib/store/theme/store.ts` 의 `hasWindow()` 가드 패턴을 복제(SSR no-op).
 *
 * 저장값: `{ volumeProfile, bollinger }` (각 boolean). 미설정/파싱 실패 시 전부 false 폴백.
 * 영구화 실패(quota 등)는 화면 동작을 막지 않는다 — 메모리 state 는 유지.
 */

export type ChartOptions = {
  /** 매물대(가격대별 거래량) 오버레이. */
  volumeProfile: boolean;
  /** 볼린저밴드(20/2) 오버레이. */
  bollinger: boolean;
};

/** 기본값 — 둘 다 off. SSR/미설정 폴백. */
export const DEFAULT_CHART_OPTIONS: ChartOptions = {
  volumeProfile: false,
  bollinger: false,
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
    volumeProfile: typeof v.volumeProfile === "boolean" ? v.volumeProfile : false,
    bollinger: typeof v.bollinger === "boolean" ? v.bollinger : false,
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

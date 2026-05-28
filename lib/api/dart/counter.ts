/**
 * OpenDART 일일 호출 카운터 (인스턴스 메모리).
 *
 * PRD `stock-api-integration` §6.3 — 일일 호출 제한 20,000 건. 본 PR-A 는 카운터만 신설.
 *
 * ## 동작
 *
 * - `increment()` 호출 시 오늘 자정 (KST) 기준 카운트 +1.
 * - 18,000 (90%) 도달 시 BFF 응답 헤더 `X-Dart-Quota-Warning: true`.
 * - 20,000 (100%) 초과 시 BFF 가 mock fallback + `X-Data-Source: mock-quota-exceeded`.
 * - 매일 KST 자정 자동 리셋 — 카운터 키가 YYYY-MM-DD 로 묶임.
 *
 * ## 한계 (본 PR-A 의 범위)
 *
 * - 인스턴스 메모리 only — Vercel serverless 의 다중 인스턴스 간 카운트 공유 X. 정확한 quota 추적은
 *   Vercel KV 도입 시점에 정합. 본 PR-A 는 단일 인스턴스 dev 환경 기준 정확.
 * - KST 자정 리셋은 시스템 시각 기준. 시간대 다른 환경에서 약간의 슬립 발생 가능 (수용 가능).
 *
 * ## 단위 테스트
 *
 * `__tests__/counter.test.ts` — 증가 / 임계값 분기 / 일자 변경 시 리셋 3개 케이스.
 */

const WARN_THRESHOLD = 18_000;
const HARD_LIMIT = 20_000;

/** key = "YYYY-MM-DD" (KST). value = count. */
const buckets = new Map<string, number>();

/**
 * KST 기준 오늘 날짜 키. 테스트는 `now` 주입 가능.
 */
function dateKey(now: Date = new Date()): string {
  // KST = UTC+9. 시스템 시각이 UTC 라도 KST 자정으로 정렬.
  const kstMs = now.getTime() + 9 * 60 * 60 * 1_000;
  const kst = new Date(kstMs);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type CounterStatus = {
  count: number;
  isWarn: boolean;
  isExceeded: boolean;
};

/**
 * 카운트 +1 후 현재 상태 반환.
 *
 * BFF route handler 가 매 DART 호출 직전에 본 함수 호출 → 결과에 따라
 *   - isExceeded=true → mock fallback 즉시 반환.
 *   - isWarn=true → 정상 호출 + 응답 헤더에 `X-Dart-Quota-Warning: true`.
 */
export function incrementDartCounter(now?: Date): CounterStatus {
  const key = dateKey(now);
  const next = (buckets.get(key) ?? 0) + 1;
  buckets.set(key, next);
  return {
    count: next,
    isWarn: next >= WARN_THRESHOLD,
    isExceeded: next > HARD_LIMIT,
  };
}

/**
 * 카운트 +1 하지 않고 조회만.
 */
export function peekDartCounter(now?: Date): CounterStatus {
  const key = dateKey(now);
  const count = buckets.get(key) ?? 0;
  return {
    count,
    isWarn: count >= WARN_THRESHOLD,
    isExceeded: count > HARD_LIMIT,
  };
}

/**
 * 테스트 전용 — 카운터 초기화.
 */
export function resetDartCounterForTest(): void {
  buckets.clear();
}

export const __counterConstantsForTest = {
  WARN_THRESHOLD,
  HARD_LIMIT,
};

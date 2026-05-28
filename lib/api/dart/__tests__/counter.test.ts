/**
 * `lib/api/dart/counter.ts` 단위 테스트.
 *
 * PRD `stock-api-integration` §6.3 정합 — 일일 호출 카운터의 3개 동작:
 *   1. 증가 — increment 시 count 가 +1.
 *   2. 임계값 분기 — 18,000 (warn) / 20,000 (exceeded) 정확히 감지.
 *   3. 일자 변경 — KST 자정 지나면 카운트 리셋.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  __counterConstantsForTest,
  incrementDartCounter,
  peekDartCounter,
  resetDartCounterForTest,
} from "../counter";

const { WARN_THRESHOLD, HARD_LIMIT } = __counterConstantsForTest;

describe("DART counter", () => {
  beforeEach(() => {
    resetDartCounterForTest();
  });

  it("[#1] increment 시 count 가 +1, peek 가 동일 값 반환", () => {
    expect(peekDartCounter().count).toBe(0);
    incrementDartCounter();
    incrementDartCounter();
    expect(peekDartCounter().count).toBe(2);
  });

  it("[#2] warn 임계값 (18,000) 도달 시 isWarn=true, exceeded 미도달", () => {
    // 17,999 까지 증가 — 아직 warn 미발동.
    for (let i = 0; i < WARN_THRESHOLD - 1; i += 1) incrementDartCounter();
    const before = peekDartCounter();
    expect(before.count).toBe(WARN_THRESHOLD - 1);
    expect(before.isWarn).toBe(false);
    expect(before.isExceeded).toBe(false);

    // 18,000 도달 → warn 발동.
    const at = incrementDartCounter();
    expect(at.count).toBe(WARN_THRESHOLD);
    expect(at.isWarn).toBe(true);
    expect(at.isExceeded).toBe(false);
  });

  it("[#3] hard limit (20,000) 초과 시 isExceeded=true", () => {
    // 20,000 까지는 isExceeded=false (limit 까지는 허용).
    for (let i = 0; i < HARD_LIMIT; i += 1) incrementDartCounter();
    const at = peekDartCounter();
    expect(at.count).toBe(HARD_LIMIT);
    expect(at.isExceeded).toBe(false);
    expect(at.isWarn).toBe(true);

    // 20,001 → isExceeded=true.
    const over = incrementDartCounter();
    expect(over.count).toBe(HARD_LIMIT + 1);
    expect(over.isExceeded).toBe(true);
  });

  it("[#4] 일자 변경 시 (KST 자정 지나면) 카운트 리셋", () => {
    // KST 2026-05-28 12:00 = UTC 2026-05-28 03:00.
    const dayA = new Date(Date.UTC(2026, 4, 28, 3, 0, 0));
    incrementDartCounter(dayA);
    incrementDartCounter(dayA);
    expect(peekDartCounter(dayA).count).toBe(2);

    // 다음 날 KST 09:00 = UTC 2026-05-29 00:00.
    const dayB = new Date(Date.UTC(2026, 4, 29, 0, 0, 0));
    expect(peekDartCounter(dayB).count).toBe(0);
    incrementDartCounter(dayB);
    expect(peekDartCounter(dayB).count).toBe(1);

    // 같은 날 다시 peek — dayA 카운트는 보존됨 (별도 bucket).
    expect(peekDartCounter(dayA).count).toBe(2);
  });
});

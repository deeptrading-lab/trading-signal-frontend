/**
 * 분봉 시그널 프로파일 단위 테스트 (intraday-scalping-agent §3-2).
 *
 * - EvaluateOptions seam 무회귀(미주입 시 기본 동작 불변).
 * - 분봉 프로파일이 warmup 경계를 낮춰 적은 봉수에서도 평가.
 * - 일봉 레짐 주입(regimeOverride)이 veto 에 반영.
 */

import { describe, it, expect } from "vitest";
import { evaluateSignal } from "../engine";
import {
  evaluateIntradaySignal,
  resolveIntradayProfile,
  dailyRegimeFromCandles,
} from "../intradayProfile";
import { makeCandles, noisyCloses, linearCloses } from "./_fixtures";

describe("evaluateSignal 옵션 seam 무회귀", () => {
  it("opts 미지정 === 빈 opts (indicators 미주입 시 기본 동작 비트 동일)", () => {
    const candles = makeCandles(noisyCloses(10_000, 20, 200));
    expect(evaluateSignal(candles)).toEqual(evaluateSignal(candles, {}));
  });

  it("regimeOverride 가 결과 regime 을 강제(내부 computeRegime 대체)", () => {
    const candles = makeCandles(noisyCloses(10_000, 20, 200));
    expect(evaluateSignal(candles, { regimeOverride: -1 }).regime).toBe(-1);
    expect(evaluateSignal(candles, { regimeOverride: 1 }).regime).toBe(1);
  });

  it("약세 레짐 주입 시 BUY 가 veto(HOLD/ SELL) — 강세 분봉이라도 신규 롱 차단", () => {
    const up = makeCandles(noisyCloses(70_000, 60, 200));
    expect(evaluateSignal(up, { regimeOverride: -1 }).action).not.toBe("BUY");
  });
});

describe("evaluateIntradaySignal", () => {
  it("5분 프로파일은 80봉(일봉 warmup 미달)에서도 통과(softMinBars=50)", () => {
    const minute = makeCandles(noisyCloses(70_000, 30, 80));
    const intraday = evaluateIntradaySignal(minute, 5);
    expect(intraday.warmupOk).toBe(true);
    expect(["BUY", "HOLD", "SELL"]).toContain(intraday.action);
    // 대조군: 동일 봉수를 일봉 기본으로 보면 warmupOk=false.
    expect(evaluateSignal(minute).warmupOk).toBe(false);
  });

  it("일봉 레짐을 분봉 평가에 주입", () => {
    const minute = makeCandles(noisyCloses(70_000, 40, 120));
    expect(evaluateIntradaySignal(minute, 5, -1).regime).toBe(-1);
  });

  it("resolveIntradayProfile: 미지원 tf → 5분 기본", () => {
    expect(resolveIntradayProfile(7).timeframe).toBe(5);
    expect(resolveIntradayProfile(15).timeframe).toBe(15);
    expect(resolveIntradayProfile(3).timeframe).toBe(3);
  });

  it("dailyRegimeFromCandles: 130봉 미만이면 중립(0)", () => {
    expect(dailyRegimeFromCandles(makeCandles(linearCloses(10_000, 10, 100)))).toBe(0);
  });
});

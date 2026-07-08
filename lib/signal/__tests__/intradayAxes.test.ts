/**
 * graded 축·axisOverrides seam·백테스트 evaluate 훅 테스트 (PRD intraday-decision-overhaul PR-1b,
 * AC-7/AC-8).
 *
 * 핵심 계약:
 *   1) 일봉 경로 무회귀 — axisOverrides 미지정/빈 객체 = 비트 동일.
 *   2) graded 축 — 거래량 z-score·VWAP σ-거리가 이진 임계 대신 연속 점수를 낸다(50 박제 해소).
 *   3) evaluate 훅 — 미지정 시 기존 경로와 동일, 지정 시 주입 함수로 평가.
 */

import { describe, it, expect, vi } from "vitest";
import type { StockDailyCandle, StockMinuteCandle } from "@/lib/api/kis/types";
import type { AxisScore } from "@/lib/types/signal";
import {
  gradedConfidence,
  gradedVolumeAxis,
  gradedVwapAxis,
  volumeZAt,
} from "../intradayAxes";
import { evaluateSignal } from "../engine";
import { evaluateIntradaySignal } from "../intradayProfile";
import { backtest } from "../backtest/run";

// ─── 빌더 ─────────────────────────────────────────────────────────────────────

/** 분봉 빌더 — 같은 날 09:00부터 1분 간격, close/volume 커스텀. */
function minuteCandles(
  n: number,
  at: (i: number) => { close?: number; volume?: number; open?: number },
): StockMinuteCandle[] {
  return Array.from({ length: n }, (_, i) => {
    const { close = 10_000, volume = 1_000, open = close } = at(i);
    const hh = 9 + Math.floor(i / 60);
    const mm = i % 60;
    return {
      date: `2026-07-09T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
      open,
      high: Math.max(open, close) + 5,
      low: Math.min(open, close) - 5,
      close,
      volume,
    };
  });
}

/** 직전 창 거래량 700/1400 교대(평균 1,050·로그 std≈0.35) + 마지막 봉만 커스텀 — z 손검산용. */
function zCandles(lastVolume: number, lastUp = true): StockMinuteCandle[] {
  return minuteCandles(61, (i) =>
    i === 60
      ? { volume: lastVolume, open: 10_000, close: lastUp ? 10_020 : 9_980 }
      : { volume: i % 2 === 0 ? 700 : 1_400 },
  );
}

/** 일봉 빌더 — 완만한 우상향 + 거래량 변동(엔진 워밍업 충족 140봉). */
function dailyCandles(n = 140): StockDailyCandle[] {
  return Array.from({ length: n }, (_, i) => {
    const close = 10_000 + i * 10 + (i % 7) * 3;
    return {
      date: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
      open: close - 5,
      high: close + 20,
      low: close - 25,
      close,
      volume: 1_000 + (i % 5) * 120,
    };
  });
}

// ─── graded volume ────────────────────────────────────────────────────────────

describe("gradedVolumeAxis — log-거래량 z-score", () => {
  it("거래량이 클수록 축 점수가 단조 증가(연속화, 포화 전 구간)", () => {
    const a = gradedVolumeAxis(zCandles(1_500))!; // z ≈ 1.2
    const b = gradedVolumeAxis(zCandles(2_200))!; // z ≈ 2.3
    expect(a.score).toBeGreaterThan(50);
    expect(a.score).toBeLessThan(100);
    expect(b.score).toBeGreaterThan(a.score);
    expect(a.direction).toBe(1);
  });

  it("평균 이하(z≤0) → 중립 유지(VOLUME_DRY 정보 hit)", () => {
    const axis = gradedVolumeAxis(zCandles(800))!;
    expect(axis.score).toBe(50);
    expect(axis.direction).toBe(0);
    expect(axis.hits[0].key).toBe("VOLUME_DRY");
  });

  it("극단 급증은 z 가중 상한(3)에서 포화 — 양봉이면 100, 음봉이면 0", () => {
    expect(gradedVolumeAxis(zCandles(100_000, true))!.score).toBe(100);
    expect(gradedVolumeAxis(zCandles(100_000, false))!.score).toBe(0);
  });

  it("레거시 임계(1.5배) 충족 시 기존 VOLUME_SURGE_* 키 유지(트리거 호환)", () => {
    const surge = gradedVolumeAxis(zCandles(2_000, true))!; // 평균 1,000 → 2.0배
    expect(surge.hits[0].key).toBe("VOLUME_SURGE_UP");
    const mild = gradedVolumeAxis(zCandles(1_300, true))!; // 1.3배 — 임계 미달이지만 z>0
    expect(mild.hits[0].key).toBe("VOLUME_Z_UP");
    expect(mild.score).toBeGreaterThan(50);
  });

  it("룩백 미달·균질 거래량(std=0)은 null — 레거시 축 유지", () => {
    expect(gradedVolumeAxis(minuteCandles(30, () => ({})))).toBeNull();
    expect(gradedVolumeAxis(minuteCandles(61, () => ({ volume: 1_000 })))).toBeNull();
  });
});

// ─── volumeZAt 헬퍼 추출 회귀 (PR-3b — gradedVolumeAxis 산식 비트 동일) ───────

describe("volumeZAt — z 산식 단일 추출(교차 트리거 공유)", () => {
  it("gradedVolumeAxis 와 동일한 z — hit weight = min(z, 3), detail 문자열 일치", () => {
    const candles = zCandles(1_500);
    const z = volumeZAt(candles, candles.length - 1)!;
    // 손검산 앵커: 700/1400 교대(log std≈0.346) 대비 1,500 → z≈1.198 (추출 전 산식과 동일).
    expect(z).toBeCloseTo(1.198, 2);
    const axis = gradedVolumeAxis(candles)!;
    expect(axis.hits[0].weight).toBeCloseTo(Math.min(z, 3), 12);
    expect(axis.hits[0].detail).toContain(`거래량 z ${z.toFixed(1)}`);
  });

  it("임의 마감봉 인덱스에서도 산출 — 자기 자신 제외 직전 40봉 창", () => {
    // 60봉 뒤에 급증봉을 넣고 그 인덱스에서 직접 조회 — 마지막 봉이 아니어도 동일 산식.
    const candles = minuteCandles(70, (i) => ({ volume: i === 55 ? 100_000 : i % 2 === 0 ? 700 : 1_400 }));
    expect(volumeZAt(candles, 55)!).toBeGreaterThan(3);
    expect(volumeZAt(candles, 54)!).toBeLessThan(2);
  });

  it("룩백 미달·범위 밖·균질 거래량은 null (gradedVolumeAxis 와 동일 가드)", () => {
    expect(volumeZAt(minuteCandles(30, () => ({})), 29)).toBeNull(); // idx < 룩백(40)
    expect(volumeZAt(minuteCandles(61, () => ({})), 61)).toBeNull(); // 범위 밖
    expect(volumeZAt(minuteCandles(61, () => ({ volume: 1_000 })), 60)).toBeNull(); // std=0
  });
});

// ─── graded vwap ──────────────────────────────────────────────────────────────

describe("gradedVwapAxis — 당일 VWAP σ-거리", () => {
  it("VWAP 위(상승 마감) → 매수 우위(+), 아래(하락 마감) → 매도 우위(−)", () => {
    const rising = gradedVwapAxis(minuteCandles(30, (i) => ({ close: 10_000 + i * 20 })))!;
    expect(rising.score).toBeGreaterThan(50);
    expect(rising.direction).toBe(1);
    expect(rising.hits[0].key).toBe("VWAP_ABOVE");

    const falling = gradedVwapAxis(minuteCandles(30, (i) => ({ close: 10_600 - i * 20 })))!;
    expect(falling.score).toBeLessThan(50);
    expect(falling.hits[0].key).toBe("VWAP_BELOW");
  });

  it("당일 봉 부족·완전 평탄(σ=0)은 null — 레거시 축 유지", () => {
    expect(gradedVwapAxis(minuteCandles(4, () => ({})))).toBeNull();
    const flat = minuteCandles(30, () => ({})).map((c) => ({
      ...c,
      high: c.close,
      low: c.close,
      open: c.close,
    }));
    expect(gradedVwapAxis(flat)).toBeNull();
  });
});

// ─── graded confidence ────────────────────────────────────────────────────────

describe("gradedConfidence — 축 기울기 가중평균", () => {
  const axis = (a: AxisScore["axis"], score: number): AxisScore => ({
    axis: a,
    score,
    direction: score > 50 ? 1 : score < 50 ? -1 : 0,
    hits: [],
  });

  it("전 축 중립(50) → 0, 전 축 포화(100/0) → 1", () => {
    expect(
      gradedConfidence([axis("trend", 50), axis("momentum", 50), axis("volume", 50), axis("volatility", 50)]),
    ).toBe(0);
    expect(
      gradedConfidence([axis("trend", 100), axis("momentum", 0), axis("volume", 100), axis("volatility", 0)]),
    ).toBe(1);
  });

  it("가중 반영 — volume(0.2)만 100이면 0.2", () => {
    const conf = gradedConfidence([
      axis("trend", 50),
      axis("momentum", 50),
      axis("volume", 100),
      axis("volatility", 50),
    ]);
    expect(conf).toBeCloseTo(0.2, 10);
  });

  it("빈 축 → 0", () => {
    expect(gradedConfidence([])).toBe(0);
  });
});

// ─── axisOverrides seam 무회귀 (AC-7) ────────────────────────────────────────

describe("evaluateSignal axisOverrides seam", () => {
  it("AC-7: 미지정 === axisOverrides undefined === 빈 객체 (비트 동일 무회귀)", () => {
    const candles = dailyCandles();
    const base = evaluateSignal(candles);
    expect(evaluateSignal(candles, { axisOverrides: undefined })).toEqual(base);
    expect(evaluateSignal(candles, { axisOverrides: {} })).toEqual(base);
  });

  it("override 축은 composite 직전에 교체 — 점수가 가중치만큼 정확히 이동", () => {
    const candles = dailyCandles();
    const base = evaluateSignal(candles);
    const baseVolume = base.axes.find((a) => a.axis === "volume")!;
    const override: AxisScore = { axis: "volume", score: 100, direction: 1, hits: [] };

    const result = evaluateSignal(candles, { axisOverrides: { volume: override } });

    expect(result.axes.find((a) => a.axis === "volume")).toEqual(override);
    // volume 가중치 0.2 × (100 − 기존점수) 만큼 종합점수 이동.
    expect(result.score).toBeCloseTo(base.score + 0.2 * (100 - baseVolume.score), 10);
  });
});

// ─── evaluateIntradaySignal 통합 (AC-8 스모크) ───────────────────────────────

describe("evaluateIntradaySignal — graded 축·동의도 배선", () => {
  it("급증 분봉에서 volume 축이 50 박제를 벗어나고 동의도가 agreement 비율 대신 graded 값", () => {
    // 5분 프로파일 softMin(50) 이상 + z 룩백(41) 이상. 마지막 봉 거래량 급증.
    const candles = minuteCandles(80, (i) =>
      i === 79
        ? { volume: 30_000, open: 10_000, close: 10_040 }
        : { volume: i % 2 === 0 ? 900 : 1_100, close: 10_000 + (i % 5) },
    );
    const result = evaluateIntradaySignal(candles, 5, 0);

    expect(result.warmupOk).toBe(true);
    const volume = result.axes.find((a) => a.axis === "volume")!;
    expect(volume.score).toBeGreaterThan(50); // 이진 임계 대신 graded
    expect(result.confidence).toBeGreaterThan(0);
    // limitedData(80 < minBars 100) — 엔진과 동일한 0.6 상한 재적용.
    expect(result.confidence).toBeLessThanOrEqual(0.6);
  });
});

// ─── backtest evaluate 훅 ─────────────────────────────────────────────────────

describe("backtest evaluate 훅", () => {
  it("미지정 = 기존 evaluateSignal(slice, opts.signal) 경로와 동일 결과(무회귀)", () => {
    const candles = dailyCandles(160);
    const base = backtest(candles, { warmupBars: 130 });
    const hooked = backtest(candles, {
      warmupBars: 130,
      evaluate: (slice) => evaluateSignal(slice, undefined),
    });
    expect(hooked.trades).toEqual(base.trades);
    expect(hooked.metrics).toEqual(base.metrics);
  });

  it("지정 시 주입 함수로 평가(호출 확인)", () => {
    const candles = dailyCandles(160);
    const spy = vi.fn((slice: StockDailyCandle[]) => evaluateSignal(slice));
    backtest(candles, { warmupBars: 130, evaluate: spy });
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0].length).toBe(130); // look-ahead 차단 슬라이스 그대로 전달
  });
});

/**
 * 분봉 타임프레임 인식 시그널 프로파일 (intraday-scalping-agent §3-2).
 *
 * 일봉 보정 엔진(`evaluateSignal`)을 **포크하지 않고** `EvaluateOptions` seam 으로 타임프레임 주기를
 * 주입한다. 지표 임계값(RSI 30/70·거래량 1.5배 등 무차원 상수)은 그대로 두고 **주기만** 바꾼다(1차 컷).
 *
 * ## 레짐 폴백 (필수)
 * 분봉 자체 SMA120 레짐은 오버나잇 갭에 오염돼 정상 BUY 를 veto 한다. 따라서 레짐은
 * **일봉 SMA 기울기로 산출**(`dailyRegimeFromCandles`)해 `regimeOverride` 로 주입한다.
 *
 * 주기 세트는 백테스트(검증 게이트)로 재보정할 잠정값이며, 3/5/15분 bake-off 후 확정한다.
 */

import { evaluateSignal } from "./engine";
import type { StockDailyCandle, StockMinuteCandle } from "@/lib/api/kis/types";
import type {
  EvaluateOptions,
  IndicatorProfile,
  RuleDirection,
  SignalResult,
} from "@/lib/types/signal";

export type IntradayTimeframe = 1 | 3 | 5 | 15;

export type IntradayProfile = {
  timeframe: IntradayTimeframe;
  indicators: IndicatorProfile;
  /** warmup 차단 최소 봉수. */
  softMinBars: number;
  /** 풀 품질 최소 봉수(미만이면 limitedData). */
  minBars: number;
  /** 매물대/박스권/구조 TP·SL 룩백 봉수 — `structureBarrierAt` 에 전달. */
  structureLookback: number;
};

/**
 * 잠정 주기 세트 (백테스트로 재보정 예정).
 * 세션 390분 기준 봉수: 3m→130, 5m→78, 15m→26.
 *  base ≈ 1세션 컨텍스트, long ≈ 반~1세션. MACD/ADX 는 봉이 커질수록 단축.
 */
export const INTRADAY_PROFILES: Record<IntradayTimeframe, IntradayProfile> = {
  1: {
    // 1분봉 — 세션 390봉. 노이즈가 커서 주기는 3분 프로파일을 계승(무차원 임계값 동일)하고
    // base(장기선)만 130(≈2시간)으로 둔다. 전일 warmup(381봉)으로 개장부터 풀 품질.
    timeframe: 1,
    indicators: {
      maPeriods: { short: 5, mid: 20, long: 60, base: 130 },
      macd: { fast: 12, slow: 26, signal: 9 },
      rsiPeriod: 14,
      bollinger: { period: 20, mult: 2 },
      adxPeriod: 14,
      volumeMaPeriod: 20,
    },
    softMinBars: 80,
    minBars: 156,
    structureLookback: 130,
  },
  3: {
    timeframe: 3,
    indicators: {
      maPeriods: { short: 5, mid: 20, long: 60, base: 130 },
      macd: { fast: 12, slow: 26, signal: 9 },
      rsiPeriod: 14,
      bollinger: { period: 20, mult: 2 },
      adxPeriod: 14,
      volumeMaPeriod: 20,
    },
    softMinBars: 80,
    minBars: 156,
    structureLookback: 130,
  },
  5: {
    timeframe: 5,
    indicators: {
      maPeriods: { short: 5, mid: 20, long: 40, base: 78 },
      macd: { fast: 9, slow: 20, signal: 7 },
      rsiPeriod: 14,
      bollinger: { period: 20, mult: 2 },
      adxPeriod: 14,
      volumeMaPeriod: 20,
    },
    softMinBars: 50,
    minBars: 100,
    structureLookback: 78,
  },
  15: {
    timeframe: 15,
    indicators: {
      maPeriods: { short: 3, mid: 9, long: 20, base: 26 },
      macd: { fast: 6, slow: 13, signal: 5 },
      rsiPeriod: 9,
      bollinger: { period: 14, mult: 2 },
      adxPeriod: 10,
      volumeMaPeriod: 14,
    },
    softMinBars: 26,
    minBars: 40,
    structureLookback: 52,
  },
};

export const DEFAULT_INTRADAY_TIMEFRAME: IntradayTimeframe = 5;

/** timeframe(분) → 프로파일. 미지원 값은 기본(5분)으로 폴백. */
export function resolveIntradayProfile(timeframe: number): IntradayProfile {
  return INTRADAY_PROFILES[timeframe as IntradayTimeframe] ?? INTRADAY_PROFILES[DEFAULT_INTRADAY_TIMEFRAME];
}

/**
 * 분봉 시그널 평가 — 프로파일 주기 + 일봉 레짐 주입.
 *
 * @param candles 오름차순 분봉(date="YYYY-MM-DDTHH:mm").
 * @param timeframe 분봉 단위(3/5/15). 기본 5.
 * @param dailyRegime 일봉에서 산출한 레짐(-1/0/1). veto 판단에 사용. 미상이면 0(veto 비활성).
 */
export function evaluateIntradaySignal(
  candles: StockMinuteCandle[],
  timeframe: number = DEFAULT_INTRADAY_TIMEFRAME,
  dailyRegime: RuleDirection = 0,
): SignalResult {
  const profile = resolveIntradayProfile(timeframe);
  const opts: EvaluateOptions = {
    indicators: profile.indicators,
    softMinBars: profile.softMinBars,
    minBars: profile.minBars,
    regimeOverride: dailyRegime,
    regimeFilter: true,
    trendHigherLowLookback: profile.structureLookback,
  };
  return evaluateSignal(candles, opts);
}

/**
 * 일봉 캔들 → 레짐(-1/0/1). `evaluateIntradaySignal` 의 `dailyRegime` 입력.
 * SMA120 룩백 미확보(130봉 미만)면 0(중립).
 */
export function dailyRegimeFromCandles(dailyCandles: StockDailyCandle[]): RuleDirection {
  if (dailyCandles.length < 130) return 0;
  return evaluateSignal(dailyCandles).regime;
}

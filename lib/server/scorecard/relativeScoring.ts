/**
 * 시장/베타 보정 채점 순수 로직(v2) — 절대 수익률 → 상대(알파) 지표로 채점.
 *
 * PRD `scorecard-relative-scoring`.
 *
 * 배경: phase-1 채점(scoring.ts)은 결정시점 대비 **절대 수익률** r% 를 ±T 밴드로 판정한다.
 * 그러나 시장 전체가 빠지는 날엔 약세 판정(UNDERWEIGHT/SELL)이 "실력이 아니라 시장 베타에
 * 올라타서" 자동 hit 된다(알파 vs 베타 미분리). OVERWEIGHT/UNDERWEIGHT 는 본질이 "시장 대비"
 * 상대 개념이라 절대 채점은 의미 불일치다. → 같은 horizon 의 벤치마크 지수 수익률을 빼서
 * **초과수익(excess)** · **베타보정 잔차(alpha_residual)** 로 측정한다.
 *
 * 본 모듈은 부수효과 없는 순수 함수만 둔다(단위 테스트 대상). KIS 일봉/지수 취득·DB 갱신은
 * 호출부(relativeScoreDecisions)가 담당하고, 본 모듈엔 측정·분류·모드선택만 둔다.
 *
 * 비파괴: phase-1 `scoreOutcome`(scoring.ts) 은 그대로 유지한다(absolute 모드가 그대로 위임).
 */

import type { FinalVerdict } from "@/lib/types/stock/aiAnalysis";
import { scoreOutcome, type ScoreVerdict } from "@/lib/server/scorecard/scoring";
import {
  HIT_THRESHOLD_PCT,
  REGIME_THRESHOLD_PCT,
  BETA_MIN_PAIRS,
} from "@/lib/server/scorecard/constants";
import type {
  ScoringMetricMode,
  ScorecardRegime,
} from "@/lib/types/scorecard/scorecard";

/**
 * 단순 일간 수익률 시계열(소수) — 종가 배열을 인접 비율로 환산.
 * 길이 N 종가 → 길이 N−1 수익률. 0 이하·비유한 종가는 끊김으로 보고 해당 구간 수익률을 건너뛴다.
 */
export function dailyReturns(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1];
    const cur = closes[i];
    if (!Number.isFinite(prev) || !Number.isFinite(cur) || prev <= 0) continue;
    out.push((cur - prev) / prev);
  }
  return out;
}

/**
 * 초과수익(excess) = 종목 절대수익 − 벤치마크 수익(같은 horizon, %p).
 * 둘 중 하나라도 null/비유한이면 null(측정 불가 — 채점 보류).
 */
export function computeExcessReturn(
  absReturnPct: number | null,
  benchReturnPct: number | null,
): number | null {
  if (absReturnPct === null || benchReturnPct === null) return null;
  if (!Number.isFinite(absReturnPct) || !Number.isFinite(benchReturnPct)) return null;
  return absReturnPct - benchReturnPct;
}

/**
 * 베타(β) 추정 — entry 직전 윈도우의 종목·지수 **일간수익률** 단순선형회귀 기울기.
 *
 * β = cov(stock, bench) / var(bench). 표본(유효 페어) 수가 `minPairs` 미만이거나 지수 분산이
 * 0(완전 무변동 — 추정 불가)이면 null(beta_adjusted 측정 불가 → 호출부 excess 폴백).
 *
 * @param stockReturns 종목 일간수익률(소수, 예 0.012 = +1.2%).
 * @param benchReturns 지수 일간수익률(같은 정렬·같은 구간; 길이 다르면 짧은 쪽 길이까지만 사용).
 */
export function estimateBeta(
  stockReturns: number[],
  benchReturns: number[],
  minPairs: number = BETA_MIN_PAIRS,
): number | null {
  const n = Math.min(stockReturns.length, benchReturns.length);
  if (n < minPairs) return null;

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += benchReturns[i];
    sumY += stockReturns[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let cov = 0;
  let varX = 0;
  for (let i = 0; i < n; i++) {
    const dx = benchReturns[i] - meanX;
    const dy = stockReturns[i] - meanY;
    cov += dx * dy;
    varX += dx * dx;
  }
  if (varX <= 0) return null; // 지수 무변동 — 회귀 불가.
  const beta = cov / varX;
  return Number.isFinite(beta) ? beta : null;
}

/**
 * 베타보정 잔차(alpha_residual, %p) = abs − β·bench.
 * β 또는 입력이 null 이면 null(beta_adjusted 측정 불가 → 호출부에서 excess 폴백).
 */
export function computeAlphaResidual(
  absReturnPct: number | null,
  benchReturnPct: number | null,
  beta: number | null,
): number | null {
  if (absReturnPct === null || benchReturnPct === null || beta === null) return null;
  if (
    !Number.isFinite(absReturnPct) ||
    !Number.isFinite(benchReturnPct) ||
    !Number.isFinite(beta)
  ) {
    return null;
  }
  return absReturnPct - beta * benchReturnPct;
}

/**
 * 시장 국면(regime) 분류 — 해당 horizon 구간 **벤치마크 수익률** 기준.
 * - bench ≥ +T_regime → "up"(강세장)
 * - bench ≤ −T_regime → "down"(약세장)
 * - 그 사이 → "flat"(횡보)
 * bench 가 null 이면 분류 불가 → null.
 */
export function classifyRegime(
  benchReturnPct: number | null,
  threshold: number = REGIME_THRESHOLD_PCT,
): ScorecardRegime | null {
  if (benchReturnPct === null || !Number.isFinite(benchReturnPct)) return null;
  const T = Math.abs(threshold);
  if (benchReturnPct >= T) return "up";
  if (benchReturnPct <= -T) return "down";
  return "flat";
}

/**
 * 주 채점 지표 선택 — mode 에 따라 status 산출에 쓸 수익률 1개를 고른다.
 *
 * - absolute     → abs_return(phase-1 동치)
 * - excess(기본) → excess_return(abs − bench)
 * - beta_adjusted→ alpha_residual(abs − β·bench). **β 추정 불가 시 excess 로 폴백**.
 *
 * 반환 null = 선택 지표가 측정 불가(벤치마크/지수 history 부재) → status 확정 불가(보류).
 */
export function selectScoringMetric(
  mode: ScoringMetricMode,
  metrics: {
    absReturnPct: number | null;
    excessReturnPct: number | null;
    alphaResidualPct: number | null;
  },
): number | null {
  switch (mode) {
    case "absolute":
      return metrics.absReturnPct;
    case "excess":
      return metrics.excessReturnPct;
    case "beta_adjusted":
      // β 추정 실패 시 alpha_residual 은 null → excess 로 견고 폴백(반쯤 만든 상태 금지).
      return metrics.alphaResidualPct ?? metrics.excessReturnPct;
  }
}

/**
 * verdict + 선택 지표(%) → hit/miss/flat. phase-1 `scoreOutcome` 규칙을 **그대로 재사용**하되,
 * 입력 r 을 절대수익이 아닌 상대 지표(excess/alpha)로 바꾼다(방향 매핑·±T 경계 동일).
 *
 * 선택 지표가 null(측정 불가)이면 null 반환 — 호출부가 horizon 을 확정하지 않고 보류(pending)한다.
 */
export function scoreRelativeOutcome(
  verdict: FinalVerdict,
  metricPct: number | null,
  threshold: number = HIT_THRESHOLD_PCT,
): ScoreVerdict | null {
  if (metricPct === null || !Number.isFinite(metricPct)) return null;
  return scoreOutcome(verdict, metricPct, threshold);
}

/**
 * 한 horizon 의 상대 측정값 묶음 — 측정 + status 산출 한 번에.
 *
 * 입력: 종목 절대수익(abs) + 같은 horizon 벤치마크 수익(bench) + β(추정값 or null).
 * 출력: 모든 측정값(저장용) + 주 지표 기준 status(또는 null=보류).
 *
 * fail-soft 원칙: bench/β 가 없어 주 지표가 측정 불가면 status=null(보류) — 절대 잘못된 0/skip 으로
 * 채점 오염 금지(호출부가 pending 유지하고 다음 cron 재시도).
 */
export interface RelativeMeasurement {
  absReturnPct: number | null;
  benchReturnPct: number | null;
  excessReturnPct: number | null;
  beta: number | null;
  alphaResidualPct: number | null;
  regime: ScorecardRegime | null;
  /** 주 지표 기준 hit/miss/flat. null = 측정 불가(보류). */
  status: ScoreVerdict | null;
  /** status 산출에 실제로 쓰인 주 지표 값(%). null = 미산출. */
  metricUsed: number | null;
}

export function measureRelative(params: {
  verdict: FinalVerdict;
  absReturnPct: number | null;
  benchReturnPct: number | null;
  beta: number | null;
  mode: ScoringMetricMode;
  threshold?: number;
  regimeThreshold?: number;
}): RelativeMeasurement {
  const {
    verdict,
    absReturnPct,
    benchReturnPct,
    beta,
    mode,
    threshold = HIT_THRESHOLD_PCT,
    regimeThreshold = REGIME_THRESHOLD_PCT,
  } = params;

  const excessReturnPct = computeExcessReturn(absReturnPct, benchReturnPct);
  const alphaResidualPct = computeAlphaResidual(absReturnPct, benchReturnPct, beta);
  const regime = classifyRegime(benchReturnPct, regimeThreshold);

  const metricUsed = selectScoringMetric(mode, {
    absReturnPct,
    excessReturnPct,
    alphaResidualPct,
  });
  const status = scoreRelativeOutcome(verdict, metricUsed, threshold);

  return {
    absReturnPct,
    benchReturnPct,
    excessReturnPct,
    beta,
    alphaResidualPct,
    regime,
    status,
    metricUsed,
  };
}

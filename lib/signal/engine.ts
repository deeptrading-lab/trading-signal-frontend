/**
 * 시그널 규칙 엔진 공개 진입점 — `evaluateSignal(candles)`.
 *
 * 캔들(오름차순)의 **마지막 봉**에서 4축 평가 → 종합점수 + BUY/HOLD/SELL + 축별 근거 분해.
 * 순수 함수 — 데이터 출처(라이브/스냅샷/목) 무관. 백테스트는 슬라이스를 넘겨 같은 함수 재사용.
 */

import type { StockDailyCandle } from "@/lib/api/kis/types";
import type { AxisScore, EvaluateOptions, SignalResult } from "@/lib/types/signal";
import { buildContext } from "./context";
import { evaluateTrend } from "./factors/trend";
import { evaluateMomentum } from "./factors/momentum";
import { evaluateVolume } from "./factors/volume";
import { evaluateVolatility } from "./factors/volatility";
import { aggregateAxis, composite } from "./score";
import { MIN_BARS } from "./weights";

/** 캔들 배열 마지막 봉 기준 신호 평가. */
export function evaluateSignal(
  candles: StockDailyCandle[],
  opts?: EvaluateOptions,
): SignalResult {
  const n = candles.length;
  const asOf = n > 0 ? candles[n - 1].date : "";

  // 워밍업 부족 — 120일선·지표를 신뢰 못함 → HOLD 안전 폴백.
  if (n < MIN_BARS) {
    return { action: "HOLD", score: 50, confidence: 0, axes: [], asOf, warmupOk: false };
  }

  const ctx = buildContext(candles);

  const trendHits = evaluateTrend(ctx);
  const trendAxis = aggregateAxis("trend", trendHits);

  // 모멘텀은 추세 방향을 레짐 게이트로 받는다(역추세 신호 감쇠).
  const momentumHits = evaluateMomentum(ctx, trendAxis.direction);

  const axes: AxisScore[] = [
    trendAxis,
    aggregateAxis("momentum", momentumHits),
    aggregateAxis("volume", evaluateVolume(ctx)),
    aggregateAxis("volatility", evaluateVolatility(ctx)),
  ];

  const { action, score, confidence } = composite(axes, opts);

  return { action, score, confidence, axes, asOf, warmupOk: true };
}

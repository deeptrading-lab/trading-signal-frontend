/**
 * 시그널 규칙 엔진 공개 API.
 *
 * 후속 PR(종목 상세 카드·analyze 프롬프트·Slack 봇)은 여기서만 import.
 */

export { evaluateSignal } from "./engine";
export { structureBarrierAt, type StructureBarrierResult } from "./levels/structureBarrier";
export { calcVolumeProfile, findHVNs, type PriceNode } from "./levels/volumeProfile";
export { findSwingHighs, findSwingLows } from "./levels/swingLevels";
export { backtest, type BacktestOptions } from "./backtest/run";
export { tripleBarrier, type BarrierOutcome } from "./backtest/label";
export { computeMetrics } from "./backtest/metrics";
export { computeAttribution } from "./backtest/attribution";
export type {
  SignalAction,
  SignalResult,
  AxisScore,
  RuleHit,
  AxisKey,
  BacktestResult,
  BacktestMetrics,
  BacktestTrade,
  RuleAttribution,
  BarrierLabel,
  BarrierOptions,
  EvaluateOptions,
} from "@/lib/types/signal";

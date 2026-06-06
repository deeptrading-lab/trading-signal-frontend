/**
 * 백테스트 오케스트레이터 — 과거 캔들을 워크포워드로 순회하며 신호를 검증.
 *
 * 미래 누설(look-ahead) 차단: 각 시점 i 평가 시 `candles.slice(0, i+1)` 만 엔진에 넘긴다
 *   → 엔진이 i 이후 봉을 절대 못 본다. 라벨링(tripleBarrier)만 미래 봉을 사용.
 *
 * 비용: 슬라이스마다 지표 재계산(O(n²)) — 일봉 오프라인 분석용이라 허용. 실시간 경로 아님.
 */

import type { StockDailyCandle } from "@/lib/api/kis/types";
import type {
  BacktestResult,
  BacktestTrade,
  BarrierOptions,
  EvaluateOptions,
} from "@/lib/types/signal";
import { evaluateSignal } from "../engine";
import { MIN_BARS } from "../weights";
import { tripleBarrier } from "./label";
import { computeMetrics } from "./metrics";
import { computeAttribution } from "./attribution";

export type BacktestOptions = {
  barrier?: BarrierOptions;
  signal?: EvaluateOptions;
};

export function backtest(
  candles: StockDailyCandle[],
  opts: BacktestOptions = {},
): BacktestResult {
  const n = candles.length;
  const trades: BacktestTrade[] = [];

  // i = 워밍업 확보 시점부터, 미래 봉이 최소 1개 남는 n-2 까지.
  for (let i = MIN_BARS - 1; i < n - 1; i++) {
    const result = evaluateSignal(candles.slice(0, i + 1), opts.signal);
    if (!result.warmupOk || result.action === "HOLD") continue;

    const dir = result.action === "BUY" ? 1 : -1;
    const outcome = tripleBarrier(candles, i, dir, opts.barrier);
    if (!outcome) continue;

    const ruleKeys = result.axes.flatMap((a) =>
      a.hits.filter((h) => h.direction !== 0).map((h) => h.key),
    );

    trades.push({
      date: candles[i].date,
      action: result.action,
      score: result.score,
      entryPrice: candles[i].close,
      label: outcome.label,
      returnPct: outcome.returnPct,
      ruleKeys,
    });
  }

  return {
    metrics: computeMetrics(trades),
    trades,
    attribution: computeAttribution(trades),
  };
}

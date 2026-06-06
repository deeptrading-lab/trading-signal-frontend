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
  EntryOptions,
  EvaluateOptions,
} from "@/lib/types/signal";
import { evaluateSignal } from "../engine";
import {
  MIN_BARS,
  STRONG_BULL_TRIGGERS,
  STRONG_BEAR_TRIGGERS,
  DEFAULT_COOLDOWN_DAYS,
} from "../weights";
import { tripleBarrier } from "./label";
import { computeMetrics } from "./metrics";
import { computeAttribution } from "./attribution";

export type BacktestOptions = {
  barrier?: BarrierOptions;
  signal?: EvaluateOptions;
  entry?: EntryOptions;
  /**
   * 거래비용(왕복 %) — 각 거래 수익률에서 1회 차감. 수수료+거래세+슬리피지 합산.
   * 한국장 통념 ~0.2~0.3%(온라인 수수료 ~0.03% 양방 + 매도 거래세 ~0.15~0.18% + 슬리피지). 기본 0.
   */
  costPct?: number;
};

const BULL = new Set<string>(STRONG_BULL_TRIGGERS);
const BEAR = new Set<string>(STRONG_BEAR_TRIGGERS);

export function backtest(
  candles: StockDailyCandle[],
  opts: BacktestOptions = {},
): BacktestResult {
  const n = candles.length;
  const trades: BacktestTrade[] = [];
  const mode = opts.entry?.mode ?? "everyBar";
  const cooldown = opts.entry?.cooldownDays ?? DEFAULT_COOLDOWN_DAYS;
  const cost = opts.costPct ?? 0;
  // 방향별 마지막 진입 인덱스 — 쿨다운 판정.
  let lastBuyIdx = -Infinity;
  let lastSellIdx = -Infinity;

  // i = 워밍업 확보 시점부터, 미래 봉이 최소 1개 남는 n-2 까지.
  for (let i = MIN_BARS - 1; i < n - 1; i++) {
    const result = evaluateSignal(candles.slice(0, i + 1), opts.signal);
    if (!result.warmupOk || result.action === "HOLD") continue;

    const dir = result.action === "BUY" ? 1 : -1;
    const ruleKeys = result.axes.flatMap((a) =>
      a.hits.filter((h) => h.direction !== 0).map((h) => h.key),
    );

    // 진입 선별 — trigger 모드: 강한 트리거 발화 + 쿨다운 충족 시에만.
    if (mode === "trigger") {
      const triggers = dir === 1 ? BULL : BEAR;
      const hasTrigger = ruleKeys.some((k) => triggers.has(k));
      if (!hasTrigger) continue;
      const lastIdx = dir === 1 ? lastBuyIdx : lastSellIdx;
      if (i - lastIdx < cooldown) continue;
    }

    const outcome = tripleBarrier(candles, i, dir, opts.barrier);
    if (!outcome) continue;

    if (dir === 1) lastBuyIdx = i;
    else lastSellIdx = i;

    trades.push({
      date: candles[i].date,
      action: result.action,
      score: result.score,
      entryPrice: candles[i].close,
      label: outcome.label,
      returnPct: outcome.returnPct - cost, // 비용 차감 후 순수익률
      ruleKeys,
    });
  }

  return {
    metrics: computeMetrics(trades),
    trades,
    attribution: computeAttribution(trades),
  };
}

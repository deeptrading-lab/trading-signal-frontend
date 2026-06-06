/**
 * Triple Barrier Labeling — 한 신호의 향후 결과를 익절·손절·시간 3배리어로 라벨.
 *
 * 단순 `sign(미래종가-현재종가)` 보다 실매매 정합(경로 의존성 반영): 손절이 먼저 닿으면
 * 나중에 올라도 LOSS. (참고: Lopez de Prado / 한국시장 OHLCV 논문)
 *
 * 보수적 가정 — 한 봉 안에서 TP·SL 둘 다 닿으면 **손절 우선**(비관적, 과대평가 방지).
 */

import type { StockDailyCandle } from "@/lib/api/kis/types";
import type { BarrierLabel, BarrierOptions } from "@/lib/types/signal";

const DEFAULT_HORIZON = 20;
const DEFAULT_ATR_MULT = 2;
const ATR_PERIOD = 14;

/** fromIdx 종가까지의 직전 ATR_PERIOD True Range 평균. 데이터 부족 시 null. */
function atrAt(candles: StockDailyCandle[], fromIdx: number): number | null {
  if (fromIdx < ATR_PERIOD) return null;
  let sum = 0;
  for (let j = fromIdx - ATR_PERIOD + 1; j <= fromIdx; j++) {
    const c = candles[j];
    const prevClose = candles[j - 1].close;
    sum += Math.max(
      c.high - c.low,
      Math.abs(c.high - prevClose),
      Math.abs(c.low - prevClose),
    );
  }
  return sum / ATR_PERIOD;
}

export type BarrierOutcome = {
  label: BarrierLabel;
  /** 방향 적용 실현 수익률(%). LONG=상승이 +, SHORT=하락이 +. */
  returnPct: number;
  /** 청산 봉 인덱스. */
  exitIdx: number;
};

/**
 * @param dir  +1 = LONG(BUY 검증), -1 = SHORT(SELL 검증)
 */
export function tripleBarrier(
  candles: StockDailyCandle[],
  fromIdx: number,
  dir: 1 | -1,
  opts: BarrierOptions = {},
): BarrierOutcome | null {
  const n = candles.length;
  if (fromIdx < 0 || fromIdx >= n - 1) return null; // 미래 봉이 없으면 검증 불가

  const horizon = opts.horizonDays ?? DEFAULT_HORIZON;
  const entry = candles[fromIdx].close;

  // 배리어 폭 — 명시 % 우선, 없으면 ATR 배수(변동성 적응). tp/sl ATR 배수를 따로 주면 비대칭.
  let tpDist: number;
  let slDist: number;
  if (opts.tpPct != null && opts.slPct != null) {
    tpDist = (entry * opts.tpPct) / 100;
    slDist = (entry * opts.slPct) / 100;
  } else {
    const atr = atrAt(candles, fromIdx);
    if (atr === null) return null;
    const base = opts.atrMult ?? DEFAULT_ATR_MULT;
    tpDist = atr * (opts.tpAtrMult ?? base);
    slDist = atr * (opts.slAtrMult ?? base);
  }

  // LONG: 위=익절, 아래=손절. SHORT: 아래=익절, 위=손절.
  const tpPrice = dir === 1 ? entry + tpDist : entry - tpDist;
  const slPrice = dir === 1 ? entry - slDist : entry + slDist;

  const realized = (exitPrice: number) =>
    dir === 1
      ? ((exitPrice - entry) / entry) * 100
      : ((entry - exitPrice) / entry) * 100;

  const end = Math.min(fromIdx + horizon, n - 1);
  for (let j = fromIdx + 1; j <= end; j++) {
    const c = candles[j];
    const slHit = dir === 1 ? c.low <= slPrice : c.high >= slPrice;
    const tpHit = dir === 1 ? c.high >= tpPrice : c.low <= tpPrice;
    // 보수적: 같은 봉 양쪽 터치 시 손절 우선.
    if (slHit) return { label: "LOSS", returnPct: realized(slPrice), exitIdx: j };
    if (tpHit) return { label: "WIN", returnPct: realized(tpPrice), exitIdx: j };
  }

  // 시간 만료 — 종가 기준 미세 손익은 NEUTRAL.
  return { label: "NEUTRAL", returnPct: realized(candles[end].close), exitIdx: end };
}

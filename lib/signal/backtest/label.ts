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
import { structureBarrierAt } from "@/lib/signal/levels/structureBarrier";
// ATR 계산·폴백 배수는 라이브 단타 레벨(buildIntradayLevels)과 공유 — lib/signal/levels/atr.ts 로 추출.
import { atrAt, ATR_FALLBACK_TP_MULT, ATR_FALLBACK_SL_MULT } from "@/lib/signal/levels/atr";

const DEFAULT_HORIZON = 20;
const DEFAULT_ATR_MULT = 2;

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

  // 배리어 절대가 결정 — structure 모드 / ATR 모드 / 명시 % 분기.
  let tpPrice: number;
  let slPrice: number;

  if (opts.mode === "structure") {
    // 시장 구조(매물대+스윙+MA) 기반 절대가 결정. 구조 미발견 시 ATR 비대칭 폴백.
    const past = candles.slice(0, fromIdx + 1);
    const struct = structureBarrierAt(past, entry, dir, {
      lookbackBars: opts.lookbackBars,
      profileBins: opts.profileBins,
      swingWindow: opts.swingWindow,
      maStopPeriod: opts.maStopPeriod,
      minRRR: opts.minRRR,
    });
    if (struct) {
      tpPrice = struct.tpPrice;
      slPrice = struct.slPrice;
    } else {
      // ATR 비대칭 폴백 (기존 best 파라미터).
      const atr = atrAt(candles, fromIdx);
      if (atr === null) return null;
      tpPrice = dir === 1 ? entry + atr * ATR_FALLBACK_TP_MULT : entry - atr * ATR_FALLBACK_TP_MULT;
      slPrice = dir === 1 ? entry - atr * ATR_FALLBACK_SL_MULT : entry + atr * ATR_FALLBACK_SL_MULT;
    }
  } else if (opts.tpPct != null && opts.slPct != null) {
    // 명시 % 모드.
    tpPrice = dir === 1 ? entry + (entry * opts.tpPct) / 100 : entry - (entry * opts.tpPct) / 100;
    slPrice = dir === 1 ? entry - (entry * opts.slPct) / 100 : entry + (entry * opts.slPct) / 100;
  } else {
    // ATR 배수 모드 (기존 기본).
    const atr = atrAt(candles, fromIdx);
    if (atr === null) return null;
    const base = opts.atrMult ?? DEFAULT_ATR_MULT;
    const tpDist = atr * (opts.tpAtrMult ?? base);
    const slDist = atr * (opts.slAtrMult ?? base);
    tpPrice = dir === 1 ? entry + tpDist : entry - tpDist;
    slPrice = dir === 1 ? entry - slDist : entry + slDist;
  }

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

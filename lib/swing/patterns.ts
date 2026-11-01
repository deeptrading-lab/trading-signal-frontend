/**
 * 쌍바닥 + MACD 상승 다이버전스 — 사용자 규칙 "비슷한 가격대로 하방을 두 번 찍더라도 MACD 가
 * 살짝씩 우상향하면 가능성 있게 본다"(PRD `swing-judgment` §3-1 조건 E)의 결정론 정의.
 *
 * 순수 함수. 입력은 판정 창(오름차순, 마지막 봉 = t)과 같은 창의 MACD 라인.
 */

import type { StockDailyCandle } from "@/lib/api/kis/types";
import { atrAt } from "@/lib/signal/levels/atr";
import { swingLowPoints } from "@/lib/signal/levels/swingLevels";
import type { Rulebook } from "./rulebook";

export type DoubleBottom = {
  /** 첫 바닥·두 번째 바닥 봉 인덱스(창 기준). */
  i1: number;
  i2: number;
  l1: number;
  l2: number;
  /** 두 바닥 사이 최고가 = 넥라인(표시용). */
  neckline: number;
  /** MACD 상승 다이버전스 — i1 에서 0 아래, i2 > i1, t > i2. */
  divergence: boolean;
  /** 종가가 넥라인 위(표시용, 판정 미사용). */
  breakout: boolean;
};

/**
 * 쌍바닥 탐지. 조건을 하나라도 못 맞추면 null.
 *
 * - i2 = t−secondMaxAgo ~ t−secondMinAgo 안의 가장 최근 스윙 저점(좌우 swingWindow 봉 엄격 비교).
 * - i1 = i2−gapMax ~ i2−gapMin 안의 최저 스윙 저점(같으면 더 최근).
 * - |L2−L1| ≤ maxDiffAtr·ATR(i2), 사이 반등(최고가 − 높은 바닥) ≥ minBounceAtr·ATR(i2).
 * - 두 바닥 사이에 더 낮은 저가 없음, i2 이후 두 바닥 아래로 내려간 적 없음, 종가 > L2.
 */
export function findDoubleBottom(
  w: StockDailyCandle[],
  macdLine: (number | null)[],
  rb: Rulebook,
): DoubleBottom | null {
  const cfg = rb.doubleBottom;
  const t = w.length - 1;
  const lows = swingLowPoints(w, cfg.swingWindow);

  const second = lows
    .filter((p) => p.index >= t - cfg.secondMaxAgo && p.index <= t - cfg.secondMinAgo)
    .at(-1);
  if (!second) return null;
  const i2 = second.index;

  let first: { index: number; price: number } | null = null;
  for (const p of lows) {
    if (p.index < i2 - cfg.gapMax || p.index > i2 - cfg.gapMin) continue;
    if (first === null || p.price <= first.price) first = p;
  }
  if (!first) return null;
  const i1 = first.index;

  const atr = atrAt(w, i2, rb.atrPeriod);
  if (atr === null || atr <= 0) return null;
  const l1 = first.price;
  const l2 = second.price;
  const floor = Math.min(l1, l2);
  if (Math.abs(l2 - l1) > cfg.maxDiffAtr * atr) return null;

  let neckline = -Infinity;
  for (let i = i1 + 1; i < i2; i++) {
    if (w[i].low < floor) return null; // 사이에 더 낮은 저점
    if (w[i].high > neckline) neckline = w[i].high;
  }
  if (!(neckline - Math.max(l1, l2) >= cfg.minBounceAtr * atr)) return null;
  for (let i = i2 + 1; i <= t; i++) {
    if (w[i].low <= floor) return null; // 두 번째 바닥 이후 이탈
  }
  if (!(w[t].close > l2)) return null;

  const m1 = macdLine[i1];
  const m2 = macdLine[i2];
  const mt = macdLine[t];
  const divergence =
    m1 !== null && m2 !== null && mt !== null && m1 < 0 && m2 > m1 && mt > m2;

  return { i1, i2, l1, l2, neckline, divergence, breakout: w[t].close > neckline };
}

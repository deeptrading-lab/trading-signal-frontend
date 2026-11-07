/**
 * 시장 추세 — 지수 종가의 EMA5 vs EMA60. 표시 전용(판정·등급에 쓰지 않는다).
 *
 * 근거: 2021-01~2026-10 지수 시계열에서 5·60 추세 이탈 시 비보유가 최대낙폭을 줄였다(KOSPI −40% → −27.5%,
 * KOSDAQ −47% → −34%). 개별 종목·골든크로스 직후 매수에는 효과가 없어(초과수익 음수) 종목 판정에는 넣지 않는다.
 */

import { calcEMA } from "@/lib/utils/technicalIndicators";

export type MarketTrendResult = {
  /** 마지막 봉 날짜(YYYY-MM-DD). */
  asOf: string;
  /** up = EMA5 가 EMA60 위. */
  state: "up" | "down";
  /** 지금 상태가 시작된 봉 날짜. */
  since: string;
};

/** 오름차순 지수 종가 → 추세. EMA60 이 안 나올 만큼 짧으면 null. */
export function marketTrend(bars: ReadonlyArray<{ date: string; close: number }>, fast = 5, slow = 60): MarketTrendResult | null {
  const closes = bars.map((b) => b.close);
  const f = calcEMA(closes, fast);
  const s = calcEMA(closes, slow);
  const last = bars.length - 1;
  if (last < 0 || f[last] === null || s[last] === null) return null;
  const up = (i: number) => (f[i] as number) > (s[i] as number);
  const state = up(last);
  let i = last;
  while (i > 0 && s[i - 1] !== null && up(i - 1) === state) i--;
  return { asOf: bars[last].date, state: state ? "up" : "down", since: bars[i].date };
}

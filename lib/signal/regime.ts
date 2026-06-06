/**
 * 장기추세 레짐 — 120일선 기울기 + 현재가 위치로 "이 종목이 큰 추세상 위/아래인가" 판정.
 *
 * 4축 종합점수는 단기 국면(국지 반등)에 BUY 를 낼 수 있다. 하락 종목의 반등에 롱 진입했다가
 * 깨지는 패턴(247540 백테스트)을 막기 위해, 약세 레짐에서 BUY 를, 강세 레짐에서 SELL 을 veto.
 *
 * 데이터 부족(SMA120 룩백 미확보) 시 0(중립) → 필터 미적용(안전).
 */

import type { RuleDirection } from "@/lib/types/signal";
import type { FactorContext } from "./context";
import { REGIME_SLOPE_LOOKBACK } from "./weights";

export function computeRegime(
  ctx: FactorContext,
  lookback = REGIME_SLOPE_LOOKBACK,
): RuleDirection {
  const { i, sma, closes } = ctx;
  const cur = sma.base[i];
  const prev = sma.base[i - lookback];
  if (cur === null || prev === null) return 0;

  const slope = cur - prev;
  const close = closes[i];

  if (slope < 0 && close < cur) return -1; // 120선 우하향 + 가격 아래 = 약세
  if (slope > 0 && close > cur) return 1; // 120선 우상향 + 가격 위 = 강세
  return 0;
}

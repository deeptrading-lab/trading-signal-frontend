/**
 * 모멘텀 축 — MACD(교차·히스토그램·0선) + RSI(과매수/과매도·중심선).
 *
 * 레짐 게이트: 추세(trendDirection)와 **반대** 방향의 매수/매도 신호는 가중을 감쇠(REGIME_DAMPEN)
 *   → 역추세 거짓 신호 억제(웹 리서치: trend filter 로 win rate 개선).
 */

import type { RuleHit, RuleDirection } from "@/lib/types/signal";
import { crossover, crossunder } from "@/lib/utils/technicalIndicators";
import type { FactorContext } from "../context";
import {
  RULE_WEIGHTS,
  RSI_OVERSOLD,
  RSI_OVERBOUGHT,
  REGIME_DAMPEN,
  MACD_CONVERGE_LOOKBACK,
} from "../weights";

export function evaluateMomentum(
  ctx: FactorContext,
  trendDirection: RuleDirection,
): RuleHit[] {
  const { i, macd, rsi } = ctx;
  const raw: RuleHit[] = [];

  // MACD 라인/시그널 시리즈 추출(교차 헬퍼 입력).
  const macdLine = macd.map((p) => p.macd);
  const signalLine = macd.map((p) => p.signal);

  // 1) MACD 시그널 교차.
  if (crossover(macdLine, signalLine, i)) {
    raw.push({ key: "MACD_CROSS_UP", axis: "momentum", direction: 1, weight: RULE_WEIGHTS.macdCross });
  } else if (crossunder(macdLine, signalLine, i)) {
    raw.push({ key: "MACD_CROSS_DOWN", axis: "momentum", direction: -1, weight: RULE_WEIGHTS.macdCross });
  }

  // 2) 히스토그램 부호.
  const hist = macd[i].histogram;
  if (hist !== null && hist > 0) {
    raw.push({ key: "MACD_HIST_POS", axis: "momentum", direction: 1, weight: RULE_WEIGHTS.macdHist });
  } else if (hist !== null && hist < 0) {
    raw.push({ key: "MACD_HIST_NEG", axis: "momentum", direction: -1, weight: RULE_WEIGHTS.macdHist });
  }

  // 3) MACD 0선 위(추세 모멘텀 확인) — 위일 때만 가점.
  const macdVal = macd[i].macd;
  if (macdVal !== null && macdVal > 0) {
    raw.push({ key: "MACD_ABOVE_ZERO", axis: "momentum", direction: 1, weight: RULE_WEIGHTS.macdZero });
  }

  // 4) MACD 히스토그램 수렴(반전 임박) — 최근 MACD_CONVERGE_LOOKBACK봉의 |histogram|이
  //    strict 단조 감소(0에 가까워짐)면 반전 전조로 본다. null(웜업 미확보) 봉이 섞이면 미발화.
  const convergeStart = i - MACD_CONVERGE_LOOKBACK + 1;
  if (convergeStart >= 0) {
    const window: (number | null)[] = [];
    for (let k = convergeStart; k <= i; k++) {
      window.push(macd[k].histogram);
    }
    if (window.every((h): h is number => h !== null)) {
      const values = window as number[];
      const abs = values.map((h) => Math.abs(h));
      let narrowing = true;
      for (let k = 1; k < abs.length; k++) {
        if (!(abs[k] < abs[k - 1])) {
          narrowing = false;
          break;
        }
      }
      if (narrowing) {
        const first = values[0];
        const last = values[values.length - 1];
        const detail = `${MACD_CONVERGE_LOOKBACK}봉 연속 축소(${first.toFixed(0)}→${last.toFixed(0)})`;
        if (last < 0) {
          raw.push({ key: "MACD_CONVERGE_UP", axis: "momentum", direction: 1, weight: RULE_WEIGHTS.macdConverge, detail });
        } else if (last > 0) {
          raw.push({ key: "MACD_CONVERGE_DOWN", axis: "momentum", direction: -1, weight: RULE_WEIGHTS.macdConverge, detail });
        }
      }
    }
  }

  // 5) RSI — 과매도/과매수(극단) 우선, 아니면 중심선(50) 위/아래.
  const r = rsi[i];
  if (r !== null) {
    const detail = `RSI ${r.toFixed(1)}`;
    if (r <= RSI_OVERSOLD) {
      raw.push({ key: "RSI_OVERSOLD", axis: "momentum", direction: 1, weight: RULE_WEIGHTS.rsiExtreme, detail });
    } else if (r >= RSI_OVERBOUGHT) {
      raw.push({ key: "RSI_OVERBOUGHT", axis: "momentum", direction: -1, weight: RULE_WEIGHTS.rsiExtreme, detail });
    } else if (r > 50) {
      raw.push({ key: "RSI_ABOVE_50", axis: "momentum", direction: 1, weight: RULE_WEIGHTS.rsiMid, detail });
    } else if (r < 50) {
      raw.push({ key: "RSI_BELOW_50", axis: "momentum", direction: -1, weight: RULE_WEIGHTS.rsiMid, detail });
    }
  }

  // 레짐 게이트 — 추세와 반대 방향 신호 가중 감쇠.
  if (trendDirection !== 0) {
    return raw.map((h) =>
      h.direction !== 0 && h.direction !== trendDirection
        ? { ...h, weight: h.weight * REGIME_DAMPEN }
        : h,
    );
  }
  return raw;
}

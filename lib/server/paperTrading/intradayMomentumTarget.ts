/**
 * 오토파일럿 모멘텀 목표형 정책.
 *
 * 종목 선정은 오토파일럿 스크리너가 담당하고, 이 모듈은 진입 뒤 가격 정책만 순수 함수로 고정한다.
 * 목표/손절은 판단 시점 현재가가 아니라 실제 평단을 기준으로 잡아 틱마다 위로 밀리는 이동 목표를
 * 막는다. 수동 단타 세션은 `adaptive`를 써 기존 구조 TP/SL 판단을 그대로 유지한다.
 */

import {
  PAPER_TRADING_INTRADAY_STOP_LOSS_PCT,
  PAPER_TRADING_INTRADAY_TAKE_PROFIT_PCT,
  PAPER_TRADING_INTRADAY_THESIS_EXIT_CONVICTION_MAX,
} from "@/lib/server/paperTrading/constants";
import { roundToKrxTick } from "@/lib/utils/krxTick";
import type {
  IntradayDecisionLlm,
  IntradayStrategyMode,
} from "@/lib/types/intraday/intradayDecision";
import type { DecisionSignal } from "@/lib/types/stock/aiAnalysis";

export function intradayMomentumTargetPrice(avgEntryPrice: number): number {
  return roundToKrxTick(avgEntryPrice * (1 + PAPER_TRADING_INTRADAY_TAKE_PROFIT_PCT / 100));
}

export function intradayMomentumStopPrice(avgEntryPrice: number): number {
  return roundToKrxTick(avgEntryPrice * (1 + PAPER_TRADING_INTRADAY_STOP_LOSS_PCT / 100));
}

export type MomentumTargetPolicyInput = {
  decision: IntradayDecisionLlm;
  signal: Pick<DecisionSignal, "action">;
  strategyMode: IntradayStrategyMode;
  referencePrice: number;
  position: {
    avgEntryPrice: number;
    quantity: number;
  } | null;
  maxPositionPct: number;
};

/**
 * +2% 목표 전 조기청산은 결정론 시그널 SELL 또는 매우 강한 AI 훼손 점수만 통과시킨다.
 * 일반적인 SELL 컷(기본 40) 진동은 HOLD로 바꿔 +0.2% 같은 조기 익절을 줄인다. 손절은 아래에서
 * 실제 평단 −1%로 별도 고정되므로, 조기청산 억제가 손실 한도를 완화하지는 않는다.
 */
export function applyMomentumTargetPolicy(
  input: MomentumTargetPolicyInput,
): { decision: IntradayDecisionLlm; adjustments: string[] } {
  if (input.strategyMode !== "momentum-target") {
    return { decision: input.decision, adjustments: [] };
  }

  const decision: IntradayDecisionLlm = { ...input.decision };
  const adjustments: string[] = [];
  const hasPosition = input.position != null && input.position.quantity > 0;
  const basePrice = hasPosition ? input.position!.avgEntryPrice : input.referencePrice;

  if (decision.action === "SELL" && hasPosition) {
    const conviction = decision.convictionScore;
    const thesisBroken =
      input.signal.action === "SELL" ||
      (conviction != null && conviction <= PAPER_TRADING_INTRADAY_THESIS_EXIT_CONVICTION_MAX);
    if (!thesisBroken) {
      decision.action = "HOLD";
      decision.sellRatioPct = null;
      decision.entryZone = null;
      decision.entryPositionPct = null;
      decision.rationale =
        `모멘텀 목표형 유지 — +${PAPER_TRADING_INTRADAY_TAKE_PROFIT_PCT}% 목표 전 조기청산 신호가 ` +
        "추세 훼손 기준에 미달해 보유.";
      adjustments.push(
        `목표 전 조기청산 보류(추세 SELL 또는 확신 ≤${PAPER_TRADING_INTRADAY_THESIS_EXIT_CONVICTION_MAX}만 허용)`,
      );
    }
  }

  if (decision.action === "BUY") {
    decision.entryPositionPct = input.maxPositionPct;
    adjustments.push(`모멘텀 목표형 진입 비중 ${input.maxPositionPct}% 적용`);
  }

  if (
    basePrice > 0 &&
    (decision.action === "BUY" || (decision.action === "HOLD" && hasPosition))
  ) {
    decision.targetPrice = intradayMomentumTargetPrice(basePrice);
    decision.stopPrice = intradayMomentumStopPrice(basePrice);
    decision.invalidationPrice = decision.stopPrice;
    adjustments.push(
      `실제 평단 기준 +${PAPER_TRADING_INTRADAY_TAKE_PROFIT_PCT}% 익절/` +
        `${PAPER_TRADING_INTRADAY_STOP_LOSS_PCT}% 손절 고정`,
    );
  }

  return { decision, adjustments };
}

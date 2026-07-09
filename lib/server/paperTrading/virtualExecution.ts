import {
  PAPER_TRADING_DEFAULT_CASH_BUFFER_PCT,
  PAPER_TRADING_DEFAULT_MAX_POSITION_PCT,
  PAPER_TRADING_MAX_STALE_PRICE_SECONDS,
} from "@/lib/server/paperTrading/constants";
import type {
  PaperTradingCostModel,
  PaperTradingDecision,
  PaperTradingOrder,
  PaperTradingPosition,
  PaperTradingPriceSnapshot,
} from "@/lib/types/paperTrading/paperTrading";

export type VirtualExecutionInput = {
  cash: number;
  positions: PaperTradingPosition[];
  decision: PaperTradingDecision;
  priceSnapshot: PaperTradingPriceSnapshot[];
  maxPositionPct?: number;
  cashBufferPct?: number;
  /**
   * 거래 비용 모델(bp) — 슬리피지는 체결가에, 수수료·제세금은 현금에 반영.
   * 미지정이면 비용 0 = 기존 동작 그대로(mock 경로 무회귀).
   */
  costs?: PaperTradingCostModel;
  /**
   * 단타 청산 트리거 — 보유 포지션이 도달 시 결정을 무시하고 강제 EXIT(리스크 룰 우선).
   * `executeVirtualTrade` 가 마크투마켓 후 사전 판정한다. mock/일봉 경로는 미지정(무영향).
   */
  forcedExit?: {
    /** 익절 목표가(절대 원) — lastPrice ≥ 시 청산. */
    targetPrice?: number | null;
    /** 손절가(절대 원) — lastPrice ≤ 시 청산. */
    stopPrice?: number | null;
    /** 장 막판 전량 청산(15:20). */
    flattenAll?: boolean;
    /**
     * 포지션 손실 하드스톱(%, 음수) — 보유 포지션의 `unrealizedPnlPct ≤ 값` 이면 EXIT
     * (intraday-stop-slippage B). `null`/미지정 = 미적용. cli-agent 만 주입(mock 무영향).
     */
    positionHardStopPct?: number | null;
    /** 세션 손실 하드스톱(%, 음수) — `sessionReturnPct ≤ 값` 이면 전량 flatten. `null`/미지정=미적용. */
    sessionHardStopPct?: number | null;
    /** 판정용 세션 수익률(신선 마크 기준, %) — 호출측(runTick/리스크 스윕)이 주입. 세션 하드스톱 입력. */
    sessionReturnPct?: number;
  };
};

export type VirtualExecutionResult = {
  cash: number;
  positions: PaperTradingPosition[];
  orders: PaperTradingOrder[];
  portfolioValue: number;
  returnPct: number;
  guardAdjustments: string[];
  skippedReason: string | null;
};

export function executeVirtualTrade(input: VirtualExecutionInput): VirtualExecutionResult {
  const maxPositionPct = input.maxPositionPct ?? PAPER_TRADING_DEFAULT_MAX_POSITION_PCT;
  const cashBufferPct = input.cashBufferPct ?? PAPER_TRADING_DEFAULT_CASH_BUFFER_PCT;
  const guardAdjustments: string[] = [];
  const price = input.priceSnapshot[0];

  if (!price || price.freshnessSeconds > PAPER_TRADING_MAX_STALE_PRICE_SECONDS) {
    return markOnly(input.cash, input.positions, input.priceSnapshot, guardAdjustments, "가격 정보가 오래되어 가상 주문을 건너뜁니다.");
  }

  const markedPositions = markPositions(input.positions, input.priceSnapshot);

  // 단타 청산 트리거(리스크 룰 우선) — 익절/손절/하드스톱/장막판 도달 시 결정을 EXIT 로 덮어쓴다.
  const forced = resolveForcedExit(input.forcedExit, markedPositions, price);
  const decision = forced?.decision ?? input.decision;
  if (forced) guardAdjustments.push(forced.decision.rationale);

  const portfolioBefore = input.cash + sumMarketValue(markedPositions);
  if (portfolioBefore <= 0) {
    return {
      cash: input.cash,
      positions: markedPositions,
      orders: [],
      portfolioValue: 0,
      returnPct: 0,
      guardAdjustments,
      skippedReason: "평가금액이 0이라 가상 체결을 계산할 수 없어요.",
    };
  }

  const minimumCash = portfolioBefore * (cashBufferPct / 100);
  const maxInvestableValue = Math.max(0, portfolioBefore - minimumCash);

  // 거래 비용율 — costs 미주입 시 전부 0 = 기존 동작 그대로.
  const slipRate = (input.costs?.slippageBp ?? 0) / 10_000;
  const feeRate = (input.costs?.feeBpPerSide ?? 0) / 10_000;
  const sellTaxRate = (input.costs?.sellTaxBp ?? 0) / 10_000;

  const targets = normalizeTargets(decision, input.priceSnapshot, maxPositionPct);
  if (targets.adjustedForMax) {
    guardAdjustments.push("종목별 최대 비중에 맞춰 주문 크기를 줄였어요.");
  }

  const totalTargetValue = targets.items.reduce(
    (sum, item) => sum + portfolioBefore * (item.targetAllocationPct / 100),
    0,
  );
  const scale = totalTargetValue > maxInvestableValue && totalTargetValue > 0
    ? maxInvestableValue / totalTargetValue
    : 1;
  if (scale < 1) {
    guardAdjustments.push("최소 현금 보유 비중을 남기도록 전체 주문 크기를 줄였어요.");
  }

  let nextCash = input.cash;
  let nextPositions = markedPositions;
  const orders: PaperTradingOrder[] = [];

  for (const target of targets.items) {
    const snapshot = input.priceSnapshot.find((item) => item.ticker === target.ticker);
    if (!snapshot) continue;
    if (snapshot.price <= 0) {
      guardAdjustments.push(`${target.ticker} 현재가가 0원이라 가상 주문을 건너뛰었어요.`);
      continue;
    }
    const position = nextPositions.find((item) => item.ticker === target.ticker);
    const currentQuantity = position?.quantity ?? 0;
    const targetValue = portfolioBefore * (target.targetAllocationPct / 100) * scale;
    const targetQuantity = Math.floor(targetValue / snapshot.price);
    const deltaQuantity = targetQuantity - Math.floor(currentQuantity);

    if (deltaQuantity === 0) {
      if (targetValue > 0 && targetQuantity === 0) {
        guardAdjustments.push(`${snapshot.name} 목표 비중은 있으나 현금이 부족해 1주도 체결하지 않았어요.`);
      }
      continue;
    }

    const side: PaperTradingOrder["side"] = deltaQuantity > 0 ? "BUY" : "SELL";
    // 체결가 — 시장가 체결 가정, 슬리피지만큼 불리한 방향으로(매수 위, 매도 아래).
    const fillPrice =
      side === "BUY"
        ? Math.round(snapshot.price * (1 + slipRate))
        : Math.round(snapshot.price * (1 - slipRate));
    const availableCash = Math.max(0, nextCash - minimumCash);
    const executableQuantity =
      side === "BUY"
        ? Math.min(deltaQuantity, Math.floor(availableCash / (fillPrice * (1 + feeRate))))
        : Math.min(Math.abs(deltaQuantity), Math.floor(currentQuantity));

    if (executableQuantity <= 0) {
      guardAdjustments.push(
        side === "BUY"
          ? `${snapshot.name} 매수는 현금이 부족해 체결하지 않았어요.`
          : `${snapshot.name} 매도 가능 수량이 없어 체결하지 않았어요.`,
      );
      continue;
    }

    if (side === "BUY" && executableQuantity < deltaQuantity) {
      guardAdjustments.push(`${snapshot.name} 매수 수량을 주문 가능 현금에 맞춰 줄였어요.`);
    }

    const signedQuantity = side === "BUY" ? executableQuantity : -executableQuantity;
    const notional = executableQuantity * fillPrice;
    // 수수료(양편) + 매도 제세금 — 체결과 별도로 현금에서 차감.
    const costKrw = Math.round(
      notional * feeRate + (side === "SELL" ? notional * sellTaxRate : 0),
    );
    // 매도 실현손익 — (체결가 − 평단) × 수량 − 비용. 거래별 +/− 결과 표시용.
    const realizedPnl =
      side === "SELL" && position
        ? Math.round((fillPrice - position.avgEntryPrice) * executableQuantity - costKrw)
        : undefined;
    nextCash = side === "BUY" ? nextCash - notional - costKrw : nextCash + notional - costKrw;
    const nextQuantity = Math.max(0, Math.floor(currentQuantity) + signedQuantity);
    const nextAvgEntryPrice =
      side === "BUY" && position
        ? weightedAverage(position.avgEntryPrice, Math.floor(currentQuantity), fillPrice, executableQuantity)
        : side === "BUY"
          ? fillPrice
          : position?.avgEntryPrice ?? snapshot.price;

    const nextPosition: PaperTradingPosition = {
      ticker: snapshot.ticker,
      name: snapshot.name,
      quantity: nextQuantity,
      avgEntryPrice: nextAvgEntryPrice,
      lastPrice: snapshot.price,
      marketValue: nextQuantity * snapshot.price,
      unrealizedPnl: (snapshot.price - nextAvgEntryPrice) * nextQuantity,
      unrealizedPnlPct: nextAvgEntryPrice === 0 ? 0 : ((snapshot.price - nextAvgEntryPrice) / nextAvgEntryPrice) * 100,
      allocationPct: 0,
      updatedAt: snapshot.asOf,
    };

    nextPositions = replacePosition(nextPositions, nextPosition).filter(
      (item) => item.quantity >= 1,
    );
    orders.push({
      ticker: snapshot.ticker,
      name: snapshot.name,
      side,
      quantity: executableQuantity,
      price: fillPrice,
      notional,
      costKrw,
      realizedPnl,
      reason: target.rationale,
    });
  }

  // 관측성(AC-7) — 손절/포지션 하드스톱 청산 시, 설정 손절선 대비 실체결가 갭(슬리피지)을 기록.
  // 다스코류(손절선을 건너뛴 장대음봉)의 실현 슬리피지를 데이터로 추적하기 위함.
  if (forced?.stopReference != null) {
    const exitOrder = orders.find((order) => order.side === "SELL");
    if (exitOrder) {
      const ref = forced.stopReference;
      const gapPct = ref > 0 ? ((exitOrder.price - ref) / ref) * 100 : 0;
      guardAdjustments.push(
        `손절선 ${ref.toLocaleString("ko-KR")}원 대비 실체결 ${exitOrder.price.toLocaleString("ko-KR")}원 ` +
          `(${gapPct >= 0 ? "+" : ""}${gapPct.toFixed(1)}%)`,
      );
    }
  }

  const portfolioAfter = nextCash + sumMarketValue(nextPositions);
  const allocatedPositions = withAllocations(nextPositions, portfolioAfter);

  return buildResult(nextCash, allocatedPositions, orders, portfolioAfter, guardAdjustments, null);
}

/** forced-exit 판정 결과 — EXIT 결정 + 관측용 손절 기준선(슬리피지 노트). */
type ForcedExitResolution = {
  decision: PaperTradingDecision;
  /**
   * 손절 관측 기준선(절대 원) — 동적 손절선/포지션 하드스톱 청산일 때만 채운다(익절·장막판·세션
   * 하드스톱은 null). `executeVirtualTrade` 가 실체결가와 비교해 슬리피지 갭을 guardAdjustments 에 남긴다.
   */
  stopReference: number | null;
};

/**
 * 단타 청산 트리거 판정 — 보유 포지션이 아래 조건에 도달하면 전량 EXIT 결정을 만든다(우선순위 순):
 *  ① 장막판 flatten → ② 세션 하드스톱(포트폴리오 손실) → ③ 동적 손절선(intended stop) →
 *  ④ 포지션 하드스톱(백스톱) → ⑤ 익절 목표가.
 * ③ 을 ④ 보다 먼저 보는 이유: 사용자가 설정한 손절선이 슬리피지 관측의 기준(다스코 5,420원)이고,
 * 하드스톱은 동적 손절선이 없거나 더 느슨할 때의 백스톱이기 때문. 트리거 없으면 null(원 결정 유지).
 * 단타(cli-agent) 외 경로는 forcedExit 미지정 → 항상 null. positionHardStopPct/sessionHardStopPct
 * 가 null/미지정이면 해당 하드스톱만 건너뛴다(동적 손절선은 유지 — "끄기" 안전 규약).
 */
function resolveForcedExit(
  forcedExit: VirtualExecutionInput["forcedExit"],
  positions: PaperTradingPosition[],
  price: PaperTradingPriceSnapshot | undefined,
): ForcedExitResolution | null {
  if (!forcedExit || !price) return null;
  const held = positions.find((p) => p.quantity >= 1);
  if (!held) return null;

  const last = price.price;
  const posHard = forcedExit.positionHardStopPct;
  const sesHard = forcedExit.sessionHardStopPct;
  let reason: string | null = null;
  let stopReference: number | null = null;

  if (forcedExit.flattenAll) {
    reason = "장 막판 강제 청산(오버나잇 보유 없음).";
  } else if (
    sesHard != null &&
    forcedExit.sessionReturnPct != null &&
    forcedExit.sessionReturnPct <= sesHard
  ) {
    reason = `세션 손실 한도(${sesHard}%) 도달로 전량 청산합니다.`;
  } else if (forcedExit.stopPrice != null && last <= forcedExit.stopPrice) {
    reason = `손절선(${Math.round(forcedExit.stopPrice).toLocaleString("ko-KR")}원) 이탈로 가상 청산합니다.`;
    stopReference = Math.round(forcedExit.stopPrice);
  } else if (posHard != null && held.unrealizedPnlPct <= posHard) {
    reason = `포지션 손실 한도(${posHard}%) 도달로 가상 청산합니다.`;
    // 하드스톱 기준선 = 평단 × (1 + 하드스톱%/100) — 손절선 미설정 청산의 관측 기준.
    stopReference = Math.round(held.avgEntryPrice * (1 + posHard / 100));
  } else if (forcedExit.targetPrice != null && last >= forcedExit.targetPrice) {
    reason = `익절 목표가(${Math.round(forcedExit.targetPrice).toLocaleString("ko-KR")}원) 도달로 가상 청산합니다.`;
  }
  if (!reason) return null;

  return {
    decision: {
      action: "EXIT",
      targetAllocationPct: 0,
      targetAllocations: [
        { ticker: held.ticker, name: held.name, targetAllocationPct: 0, rationale: reason },
      ],
      confidence: "HIGH",
      rationale: reason,
      riskNotes: [],
      source: "cli-agent",
    },
    stopReference,
  };
}

function normalizeTargets(
  decision: PaperTradingDecision,
  prices: PaperTradingPriceSnapshot[],
  maxPositionPct: number,
): {
  items: Array<{ ticker: string; targetAllocationPct: number; rationale: string }>;
  adjustedForMax: boolean;
} {
  // 빈 targetAllocations = "리밸런싱 주문 없음" 계약(EXIT 제외 — 청산은 항상 실행).
  // 단타(cli-agent) HOLD·여력 없는 BUY 가 여기로 온다: 목표 비중 %→floor(주수) 재계산이
  // 가격 미세 상승마다 1주 매도를 만들어내는 드리프트를 원천 차단(리뷰 #1).
  // mock·forced-exit 은 항상 명시 allocations 를 넣으므로 무영향.
  if (decision.targetAllocations.length === 0 && decision.action !== "EXIT") {
    return { items: [], adjustedForMax: false };
  }
  const source =
    decision.targetAllocations.length > 0
      ? decision.targetAllocations
      : prices.map((price) => ({
          ticker: price.ticker,
          name: price.name,
          targetAllocationPct: decision.action === "EXIT" ? 0 : decision.targetAllocationPct,
          rationale: decision.rationale,
        }));
  let adjustedForMax = false;
  const items = source.map((target) => {
    const normalized = Math.min(
      maxPositionPct,
      Math.max(0, decision.action === "EXIT" ? 0 : target.targetAllocationPct),
    );
    if (normalized !== target.targetAllocationPct) adjustedForMax = true;
    return {
      ticker: target.ticker,
      targetAllocationPct: normalized,
      rationale: target.rationale,
    };
  });
  return { items, adjustedForMax };
}

function markOnly(
  cash: number,
  positions: PaperTradingPosition[],
  prices: PaperTradingPriceSnapshot[],
  guardAdjustments: string[],
  skippedReason: string,
): VirtualExecutionResult {
  const marked = markPositions(positions, prices);
  const portfolioValue = cash + sumMarketValue(marked);
  return buildResult(cash, withAllocations(marked, portfolioValue), [], portfolioValue, guardAdjustments, skippedReason);
}

export function markPositions(
  positions: PaperTradingPosition[],
  prices: PaperTradingPriceSnapshot[],
): PaperTradingPosition[] {
  return positions.map((position) => {
    const price = prices.find((item) => item.ticker === position.ticker);
    if (!price) return position;
    const marketValue = position.quantity * price.price;
    const unrealizedPnl = (price.price - position.avgEntryPrice) * position.quantity;
    return {
      ...position,
      lastPrice: price.price,
      marketValue,
      unrealizedPnl,
      unrealizedPnlPct:
        position.avgEntryPrice === 0
          ? 0
          : ((price.price - position.avgEntryPrice) / position.avgEntryPrice) * 100,
      updatedAt: price.asOf,
    };
  });
}

function replacePosition(
  positions: PaperTradingPosition[],
  next: PaperTradingPosition,
): PaperTradingPosition[] {
  const exists = positions.some((item) => item.ticker === next.ticker);
  if (!exists) return [...positions, next];
  return positions.map((item) => (item.ticker === next.ticker ? next : item));
}

function withAllocations(
  positions: PaperTradingPosition[],
  portfolioValue: number,
): PaperTradingPosition[] {
  return positions.map((position) => ({
    ...position,
    allocationPct: portfolioValue === 0 ? 0 : (position.marketValue / portfolioValue) * 100,
  }));
}

function weightedAverage(
  oldPrice: number,
  oldQuantity: number,
  buyPrice: number,
  buyQuantity: number,
): number {
  const totalQuantity = oldQuantity + Math.max(0, buyQuantity);
  if (totalQuantity <= 0) return buyPrice;
  return (oldPrice * oldQuantity + buyPrice * Math.max(0, buyQuantity)) / totalQuantity;
}

function buildResult(
  cash: number,
  positions: PaperTradingPosition[],
  orders: PaperTradingOrder[],
  portfolioValue: number,
  guardAdjustments: string[],
  skippedReason: string | null,
): VirtualExecutionResult {
  return {
    cash: round(cash),
    positions: positions.map(roundPosition),
    orders: orders.map(roundOrder),
    portfolioValue: round(portfolioValue),
    returnPct: 0,
    guardAdjustments,
    skippedReason,
  };
}

function sumMarketValue(positions: PaperTradingPosition[]): number {
  return positions.reduce((sum, item) => sum + item.marketValue, 0);
}

function roundPosition(position: PaperTradingPosition): PaperTradingPosition {
  return {
    ...position,
    quantity: round(position.quantity),
    avgEntryPrice: round(position.avgEntryPrice),
    lastPrice: round(position.lastPrice),
    marketValue: round(position.marketValue),
    unrealizedPnl: round(position.unrealizedPnl),
    unrealizedPnlPct: round(position.unrealizedPnlPct),
    allocationPct: round(position.allocationPct),
  };
}

function roundOrder(order: PaperTradingOrder): PaperTradingOrder {
  return {
    ...order,
    quantity: round(order.quantity),
    price: round(order.price),
    notional: round(order.notional),
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

import type {
  AutopilotGuideResponse,
  AutopilotRun,
} from "@/lib/types/paperTrading/autopilot";
import type { PaperTradingSessionDetail } from "@/lib/types/paperTrading/paperTrading";

export type IntradayGuideItem = {
  id: string;
  sessionId: string;
  tickId: string;
  orderIndex: number;
  ticker: string;
  name: string;
  side: "BUY" | "SELL";
  price: number;
  quantity: number;
  notional: number;
  at: string;
  rationale: string;
  invalidationPrice: number | null;
  targetPrice: number | null;
  status: "pending" | "performed" | "passed";
  response: AutopilotGuideResponse | null;
};

export type IntradayGuideHolding = {
  ticker: string;
  name: string;
  quantity: number;
  averagePrice: number;
};

export function intradayGuideId(
  sessionId: string,
  tickId: string,
  orderIndex: number,
): string {
  return `${sessionId}:${tickId}:${orderIndex}`;
}

export function buildGuideHoldings(
  responses: Record<string, AutopilotGuideResponse> | undefined,
): IntradayGuideHolding[] {
  const holdings = new Map<string, { name: string; quantity: number; cost: number }>();
  const ordered = Object.values(responses ?? {})
    .filter((item) => item.response === "performed")
    .sort((a, b) => a.recommendedAt.localeCompare(b.recommendedAt));

  for (const item of ordered) {
    const current = holdings.get(item.ticker) ?? { name: item.name, quantity: 0, cost: 0 };
    if (item.side === "BUY") {
      current.quantity += item.executedQuantity;
      current.cost += item.executedQuantity * item.recommendedPrice;
    } else {
      const sold = Math.min(current.quantity, item.executedQuantity);
      const averagePrice = current.quantity > 0 ? current.cost / current.quantity : 0;
      current.quantity -= sold;
      current.cost = Math.max(0, current.cost - sold * averagePrice);
    }
    holdings.set(item.ticker, current);
  }

  return [...holdings.entries()]
    .filter(([, item]) => item.quantity > 0)
    .map(([ticker, item]) => ({
      ticker,
      name: item.name,
      quantity: item.quantity,
      averagePrice: item.quantity > 0 ? item.cost / item.quantity : 0,
    }));
}

export function buildIntradayGuideItems(
  run: AutopilotRun | null,
  details: PaperTradingSessionDetail[],
): IntradayGuideItem[] {
  if (!run) return [];
  const responses = run.guideResponses ?? {};
  const holdingByTicker = new Map(
    buildGuideHoldings(responses).map((holding) => [holding.ticker, holding]),
  );
  const items: IntradayGuideItem[] = [];
  const latestOriginalByTicker = new Map<string, { id: string; at: string }>();

  for (const detail of details) {
    if (detail.session.autopilotRunId !== run.id) continue;
    for (const tick of detail.ticks) {
      tick.orders.forEach((order, orderIndex) => {
        const id = intradayGuideId(detail.session.id, tick.id, orderIndex);
        const latest = latestOriginalByTicker.get(order.ticker);
        if (!latest || tick.createdAt >= latest.at) {
          latestOriginalByTicker.set(order.ticker, { id, at: tick.createdAt });
        }
        const response = responses[id] ?? null;
        const holding = holdingByTicker.get(order.ticker);
        // 가상 엔진의 SELL은 사용자 수행 BUY가 없으면 행동 알림이 아니다. 이미 응답된 레거시 항목은
        // 감사 내역을 위해 유지하고, 미응답 SELL만 사용자 원장 보유량으로 게이트한다.
        if (order.side === "SELL" && !response && !holding) return;
        const quantity = order.side === "SELL" && holding
          ? Math.min(order.quantity, holding.quantity)
          : order.quantity;
        if (quantity < 1) return;
        items.push({
          id,
          sessionId: detail.session.id,
          tickId: tick.id,
          orderIndex,
          ticker: order.ticker,
          name: order.name,
          side: order.side,
          price: order.price,
          quantity,
          notional: order.price * quantity,
          at: tick.createdAt,
          rationale: order.reason || tick.rationale,
          invalidationPrice: tick.decision.invalidationPrice ?? null,
          targetPrice: tick.decision.targetPrice ?? null,
          status: response?.response ?? "pending",
          response,
        });
      });
    }
  }

  return items
    .filter(
      (item) =>
        item.status !== "pending" || latestOriginalByTicker.get(item.ticker)?.id === item.id,
    )
    .sort((a, b) => b.at.localeCompare(a.at));
}

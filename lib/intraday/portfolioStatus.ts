import type {
  PaperTradingOrder,
  PaperTradingPosition,
  PaperTradingSession,
  PaperTradingSessionDetail,
} from "@/lib/types/paperTrading/paperTrading";

export type IntradayPortfolioStockStatus = {
  session: PaperTradingSession;
  position: PaperTradingPosition | null;
  latestOrder: (PaperTradingOrder & { at: string }) | null;
};

function groupPortfolios(sessions: PaperTradingSession[]): PaperTradingSession[][] {
  const grouped = new Map<string, PaperTradingSession[]>();
  for (const session of sessions) {
    if (!session.portfolioId) continue;
    grouped.set(session.portfolioId, [...(grouped.get(session.portfolioId) ?? []), session]);
  }
  return [...grouped.values()];
}

function newestFirst(a: PaperTradingSession[], b: PaperTradingSession[]): number {
  const newest = (group: PaperTradingSession[]) =>
    group.reduce((value, session) => (session.createdAt > value ? session.createdAt : value), "");
  return newest(b).localeCompare(newest(a));
}

/** 실행 중 묶음을 우선 복원하고, 없으면 가장 최근 종료 묶음을 현황으로 보여준다. */
export function latestIntradayPortfolio(sessions: PaperTradingSession[]): PaperTradingSession[] {
  const groups = groupPortfolios(sessions);
  const running = groups
    .filter((group) => group.some((session) => session.status !== "completed"))
    .sort(newestFirst)[0];
  return running ?? groups.sort(newestFirst)[0] ?? [];
}

export function buildIntradayPortfolioStockStatuses(
  sessions: PaperTradingSession[],
  details: PaperTradingSessionDetail[],
): IntradayPortfolioStockStatus[] {
  const detailById = new Map(details.map((detail) => [detail.session.id, detail]));
  return sessions.map((session) => {
    const detail = detailById.get(session.id);
    const latestTickWithOrder = detail ? [...detail.ticks].reverse().find((tick) => tick.orders.length) : null;
    const latestOrder = latestTickWithOrder
      ? {
          ...latestTickWithOrder.orders[latestTickWithOrder.orders.length - 1],
          at: latestTickWithOrder.tickWindowStart,
        }
      : null;
    return {
      session,
      position: detail?.positions.find((position) => position.quantity > 0) ?? null,
      latestOrder,
    };
  });
}

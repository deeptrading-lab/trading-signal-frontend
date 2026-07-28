import type { PaperTradingTick } from "../../../lib/types/paperTrading/paperTrading";
import type {
  CollectedDay,
  DailyMistakeSource,
  RuleCandidate,
} from "./types";

const CAUTION_PATTERN =
  /(돌파.*(전|필요|확인)|거래량.*(낮|부족|미동반)|확신 제한|저항.*(앞|부딪|반복)|하락 스윙)/;

function round(value: number, digits = 2): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? round(numerator / denominator, 4) : null;
}

function orders(ticks: PaperTradingTick[]) {
  return ticks.flatMap((tick) => tick.orders.map((order) => ({ tick, order })));
}

function buildCandidates(
  day: CollectedDay,
  actual: DailyMistakeSource["actual"],
  counterfactual: DailyMistakeSource["counterfactualBuy"],
): RuleCandidate[] {
  const allOrders = orders(day.ticks);
  const buys = allOrders.filter((item) => item.order.side === "BUY");
  const cautionBuys = buys.filter((item) => CAUTION_PATTERN.test(item.order.reason));
  const buySessions = new Set(buys.map((item) => item.tick.sessionId));
  const buysByTicker = new Map<string, number>();
  for (const { order } of buys) {
    buysByTicker.set(order.ticker, (buysByTicker.get(order.ticker) ?? 0) + 1);
  }
  const repeatedTickers = [...buysByTicker.entries()].filter(([, count]) => count > 1);
  const sellOrders = allOrders.filter((item) => item.order.side === "SELL");
  const proactive = sellOrders.filter((item) =>
    ["SELL", "REDUCE", "EXIT"].includes(item.tick.decision.action),
  );

  return [
    {
      key: "entry-confirmation-before-cut",
      scope: "ENTRY",
      condition: "저항근접+돌파확인전/거래량부족+확신 애매",
      action: "돌파안착·거래량동반 재확인, 그전에는 매수 확신을 낮게 유지",
      avoid: "확인필요를 적고 즉시진입",
      keywords: ["저항", "거래량", "돌파확인", "확신애매"],
      supports:
        cautionBuys.length >= 2 && actual.closedTrades >= 2 && actual.losses > actual.wins,
      independentSamples: buySessions.size,
      closedTrades: actual.closedTrades,
      netPnlKrw: actual.netPnlKrw,
      wins: actual.wins,
      losses: actual.losses,
      note: `주의문구 진입 ${cautionBuys.length}/${buys.length}건`,
    },
    {
      key: "same-ticker-stop-reentry",
      scope: "REENTRY",
      condition: "동일종목 손절후 재진입",
      action: "새 구조이벤트+거래량 확인 전 재진입 보류",
      avoid: "확신 점수만 재충족한 반복진입",
      keywords: ["재진입", "손절후", "구조변화", "종목집중"],
      supports: repeatedTickers.length > 0 && actual.losses > actual.wins,
      independentSamples: repeatedTickers.length,
      closedTrades: actual.closedTrades,
      netPnlKrw: actual.netPnlKrw,
      wins: actual.wins,
      losses: actual.losses,
      note: repeatedTickers.map(([ticker, count]) => `${ticker}:${count}회`).join(",") || "없음",
    },
    {
      key: "proactive-exit-before-stop",
      scope: "EXIT",
      condition: "보유중 저항/흐름둔화인데 SELL판단없음",
      action: "목표여력축소·논거훼손 시 선제청산 점수 재평가",
      avoid: "모든 청산을 스톱에 의존",
      keywords: ["선제청산", "스톱의존", "논거훼손", "목표여력"],
      supports: sellOrders.length >= 2 && proactive.length === 0,
      independentSamples: new Set(sellOrders.map((item) => item.tick.sessionId)).size,
      closedTrades: actual.closedTrades,
      netPnlKrw: actual.netPnlKrw,
      wins: actual.wins,
      losses: actual.losses,
      note: `선제청산 ${proactive.length}/${sellOrders.length}건`,
    },
    {
      key: "conviction-buy-calibration",
      scope: "CALIBRATION",
      condition: "높은 매수 확신 구간",
      action: "고확신=강화 금지, 실제체결·OOS로 방향성 재검증",
      avoid: "반복틱 승률을 독립표본으로 해석",
      keywords: ["conviction", "OOS", "독립표본", "반사실"],
      supports: counterfactual.losses > counterfactual.wins,
      independentSamples: buySessions.size,
      closedTrades: actual.closedTrades,
      netPnlKrw: actual.netPnlKrw,
      wins: counterfactual.wins,
      losses: counterfactual.losses,
      note: "반사실은 원인탐색 전용·실제손익과 분리",
    },
  ];
}

export function deriveDailySource(
  day: CollectedDay,
  inputHash: string,
  namespace = "ai-daily",
): DailyMistakeSource {
  const completed = day.sessions.filter((session) => session.status === "completed");
  const completedIds = new Set(completed.map((session) => session.id));
  const ticks = day.ticks.filter((tick) => completedIds.has(tick.sessionId));
  const allOrders = orders(ticks);
  const sells = allOrders.filter((item) => item.order.side === "SELL");
  const wins = sells.filter((item) => (item.order.realizedPnl ?? 0) > 0).length;
  const losses = sells.filter((item) => (item.order.realizedPnl ?? 0) < 0).length;
  const proactiveExitTrades = sells.filter((item) =>
    ["SELL", "REDUCE", "EXIT"].includes(item.tick.decision.action),
  ).length;
  const costsKrw = allOrders.reduce((sum, item) => sum + (item.order.costKrw ?? 0), 0);
  const netPnlKrw = completed.reduce(
    (sum, session) => sum + (session.portfolioValue - session.initialCash),
    0,
  );

  const runCapital = day.runs.reduce((sum, run) => sum + run.totalCapital, 0);
  const linkedRunIds = new Set(day.runs.map((run) => run.id));
  const unlinkedCapital = completed
    .filter((session) => !session.autopilotRunId || !linkedRunIds.has(session.autopilotRunId))
    .reduce((sum, session) => sum + session.initialCash, 0);
  const capital = runCapital + unlinkedCapital;
  const drawdowns = ticks.map((tick) => tick.returnPctAfter).filter(Number.isFinite);
  const actual: DailyMistakeSource["actual"] = {
    closedTrades: sells.length,
    wins,
    losses,
    winRate: ratio(wins, wins + losses),
    netPnlKrw: Math.round(netPnlKrw),
    costsKrw: Math.round(costsKrw),
    portfolioReturnPct: capital > 0 ? round((netPnlKrw / capital) * 100, 3) : null,
    maxSessionDrawdownPct: drawdowns.length ? round(Math.min(...drawdowns), 3) : null,
    forcedExitTrades: sells.length - proactiveExitTrades,
    proactiveExitTrades,
  };

  const labels = day.labels.filter((label) => completedIds.has(label.sessionId));
  const buyLabels = labels.filter((label) => label.action === "BUY");
  const labelCounts = (value: StoredLabel) => buyLabels.filter((label) => label.label === value).length;
  type StoredLabel = (typeof buyLabels)[number]["label"];
  const resolvedReturns = buyLabels
    .filter((label) => label.label !== "UNRESOLVED" && label.returnPct !== null)
    .map((label) => label.returnPct as number);
  const counterfactualBuy: DailyMistakeSource["counterfactualBuy"] = {
    wins: labelCounts("WIN"),
    losses: labelCounts("LOSS"),
    neutral: labelCounts("NEUTRAL"),
    unresolved: labelCounts("UNRESOLVED"),
    winRate: ratio(labelCounts("WIN"), labelCounts("WIN") + labelCounts("LOSS")),
    avgGrossReturnPct: resolvedReturns.length
      ? round(resolvedReturns.reduce((sum, value) => sum + value, 0) / resolvedReturns.length, 3)
      : null,
  };

  const unresolved = labels.filter((label) => label.label === "UNRESOLVED").length;
  const fallback = ticks.filter((tick) => !tick.decision.judgeModel).length;
  const owners = [...new Set(day.sessions.map((session) => session.owner ?? "(미지정)"))];
  const labelCoverageRate = ratio(labels.length, ticks.length) ?? 0;
  const unresolvedLabelRate = ratio(unresolved, labels.length) ?? 0;
  const skipReasons: string[] = [];
  if (day.sessions.length === 0) skipReasons.push("세션 없음/휴장");
  if (completed.length !== day.sessions.length) skipReasons.push("미완료 세션 존재");
  if (owners.length > 1 || owners.includes("(미지정)")) skipReasons.push("owner 오염");
  if (labels.length > 0 && unresolvedLabelRate > 0.2) skipReasons.push("UNRESOLVED 라벨 20% 초과");
  if (ticks.length > 0 && labelCoverageRate < 0.8) skipReasons.push("라벨 커버리지 80% 미만");

  const source: DailyMistakeSource = {
    schemaVersion: 1,
    namespace,
    date: day.date,
    operator: day.operator,
    inputHash,
    status: skipReasons.length ? "SKIPPED" : "READY",
    skipReasons,
    quality: {
      completedSessions: completed.length,
      totalSessions: day.sessions.length,
      ticks: ticks.length,
      labelCoverageRate,
      unresolvedLabelRate,
      fallbackRate: ratio(fallback, ticks.length) ?? 0,
      owners,
    },
    actual,
    counterfactualBuy,
    selection: {
      snapshots: day.screenerSnapshots.length,
      evaluable: false,
      note:
        day.screenerSnapshots.length > 0
          ? "선정 당시 랭킹은 있음; 미선정 후보의 동일 horizon 미래성과가 없어 승격 근거로는 보류"
          : "스크리너 스냅샷 없음",
    },
    candidates: [],
    generatedAt: new Date().toISOString(),
  };
  source.candidates = buildCandidates(day, actual, counterfactualBuy);
  return source;
}

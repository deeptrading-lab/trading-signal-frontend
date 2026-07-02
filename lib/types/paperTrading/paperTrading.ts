export type PaperTradingDecisionProvider = "mock" | "existing-ai" | "cli-agent";

export type PaperTradingDecisionAction =
  | "BUY"
  | "SELL"
  | "HOLD"
  | "INCREASE"
  | "REDUCE"
  | "EXIT";

export type PaperTradingConfidence = "HIGH" | "MEDIUM" | "LOW";
export type PaperTradingRiskMode = "conservative" | "balanced" | "aggressive";
export type PaperTradingSessionStatus = "running" | "paused" | "completed" | "failed";
export type PaperTradingTickStatus =
  | "pending"
  | "priced"
  | "decided"
  | "executed"
  | "skipped"
  | "failed";
export type PaperTradingTriggeredBy = "user" | "auto" | "cli";
export type PaperTradingMode = "sandbox" | "live-paper" | "replay";

export type PaperTradingSelectedStock = {
  ticker: string;
  name: string;
  market?: string;
};

export type PaperTradingAllocation = {
  ticker: string;
  name: string;
  targetAllocationPct: number;
  rationale: string;
};

export type PaperTradingDecision = {
  action: PaperTradingDecisionAction;
  targetAllocationPct: number;
  targetAllocations: PaperTradingAllocation[];
  confidence: PaperTradingConfidence;
  rationale: string;
  riskNotes: string[];
  expectedHoldingMinutes?: number;
  invalidationPrice?: number | null;
  /**
   * 익절 목표가(절대 원) — 단타 cli-agent provider 가 설정. `executeVirtualTrade` 의 forced-exit
   * 가 `lastPrice ≥ targetPrice` 시 청산한다. mock/existing-ai 는 미설정(undefined).
   */
  targetPrice?: number | null;
  source: PaperTradingDecisionProvider;
};

export type PaperTradingOrder = {
  ticker: string;
  name: string;
  side: "BUY" | "SELL";
  quantity: number;
  /** 체결가(원) — 비용 모델 주입 시 슬리피지가 반영된 가격. */
  price: number;
  notional: number;
  /** 수수료+제세금(원) — 비용 모델 미주입 시 0. 슬리피지는 price 에 반영. */
  costKrw?: number;
  reason: string;
};

/**
 * 가상 체결 거래 비용 모델(bp, 1bp=0.01%) — 단타(cli-agent) 세션에서 주입한다.
 * 미주입(undefined)이면 비용 0 = 기존 동작 무변경. 수익률 낙관 편향 방지용.
 */
export type PaperTradingCostModel = {
  /** 위탁수수료 bp/편도 — 매수·매도 각각 부과. */
  feeBpPerSide: number;
  /** 매도 제세금 bp — 증권거래세+농특세(매도에만). */
  sellTaxBp: number;
  /** 슬리피지 bp/편도 — 시장가 체결 가정, 체결가를 불리한 쪽으로 조정. */
  slippageBp: number;
};

export type PaperTradingPosition = {
  ticker: string;
  name: string;
  quantity: number;
  avgEntryPrice: number;
  lastPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  allocationPct: number;
  updatedAt: string;
};

export type PaperTradingSession = {
  id: string;
  name: string;
  status: PaperTradingSessionStatus;
  tickers: string[];
  stocks: PaperTradingSelectedStock[];
  initialCash: number;
  targetReturnPct: number;
  cash: number;
  portfolioValue: number;
  returnPct: number;
  riskMode: PaperTradingRiskMode;
  maxPositionPct: number;
  cashBufferPct: number;
  tickIntervalMinutes: number;
  decisionProvider: PaperTradingDecisionProvider;
  mode: PaperTradingMode;
  lastTickWindowStart: string | null;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaperTradingTick = {
  id: string;
  sessionId: string;
  tickIndex: number;
  status: PaperTradingTickStatus;
  triggeredBy: PaperTradingTriggeredBy;
  tickWindowStart: string;
  pricedAt: string;
  priceFreshnessSeconds: number;
  portfolioValueBefore: number;
  portfolioValueAfter: number;
  cashBefore: number;
  cashAfter: number;
  returnPctAfter: number;
  decision: PaperTradingDecision;
  priceSnapshot: PaperTradingPriceSnapshot[];
  orders: PaperTradingOrder[];
  rationale: string;
  guardAdjustments: string[];
  errorMessage: string | null;
  createdAt: string;
};

export type PaperTradingPriceSnapshot = {
  ticker: string;
  name: string;
  price: number;
  changePct: number;
  asOf: string;
  freshnessSeconds: number;
};

export type PaperTradingEquityPoint = {
  tickIndex: number;
  value: number;
  returnPct: number;
  at: string;
};

export type PaperTradingSessionDetail = {
  session: PaperTradingSession;
  positions: PaperTradingPosition[];
  ticks: PaperTradingTick[];
  equityCurve: PaperTradingEquityPoint[];
  latestDecision: PaperTradingDecision | null;
};

export type CreatePaperTradingSessionRequest = {
  name: string;
  tickers: string[];
  stocks?: PaperTradingSelectedStock[];
  initialCash: number;
  targetReturnPct: number;
  riskMode: PaperTradingRiskMode;
  decisionProvider: PaperTradingDecisionProvider;
};

export type PaperTradingSessionsResponse = {
  sessions: PaperTradingSession[];
  generatedAt: string;
};

export type PaperTradingSessionResponse = PaperTradingSessionDetail;

export type CreatePaperTradingSessionResponse = PaperTradingSessionDetail;

export type RunPaperTradingTickRequest = {
  triggeredBy?: PaperTradingTriggeredBy;
  tickWindowStart?: string;
};

export type PatchPaperTradingSessionRequest = {
  status: Extract<PaperTradingSessionStatus, "running" | "paused" | "completed">;
};

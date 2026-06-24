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
  source: PaperTradingDecisionProvider;
};

export type PaperTradingOrder = {
  ticker: string;
  name: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  notional: number;
  reason: string;
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

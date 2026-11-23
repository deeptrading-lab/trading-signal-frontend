export type Command = "start" | "pause" | "flatten";
export type ProgramTradingAction = Command | "new-session";
export type Reason = "breakout" | "stop" | "target" | "close" | "kill" | "manual" | "timeout" | "trail" | "time-exit" | "session-target" | "loss-streak" | "trade-limit" | "data-gap";
export type EntrySignal = { closedAt: number; open: number; high: number; low: number; close: number; previousHigh: number; volumeRatio: number };
export type Quote = { bid?: number; ask?: number; bidQty?: number; askQty?: number; signal?: EntrySignal; receivedAt?: number; ticker: string; name: string; price: number; previousHigh: number; volumeRatio: number; spreadBps: number; ageMs: number; halted: boolean };
export type Position = { enteredAt?: number; lastFreshAt?: number; bidMark?: number; peakNet?: number; ticker: string; name?: string; quantity: number; entry: number; mark: number };
export type TradeEvidence = { quote: Quote; candidate?: ProgramCandidate; candidateCheckedAt: string; rules: Record<string, number>; observedAt: number; entryAt?: number; peakNet?: number };
export type Trade = { evidence?: TradeEvidence; feeEstimated?: boolean; id: string; minute: number; ticker: string; name?: string; side: "buy" | "sell"; quantity: number; price: number; fee: number; reason: Reason; net: number | null };
export type TradingState = { policyVersion?: string; lastStepAt?: number; entryCount?: number; lossStreak?: number; blockedTickers?: string[]; signalTimes?: Record<string, number>; executionMode?: "toss-paper"; startBlockReason?: string; lifecycle?: TradingLifecycle; version: 1; candidates: CandidateSnapshot; running: boolean; killed: boolean; tick: number; minute: number; cash: number; initial: number; equity: number; realized: number; positions: Position[]; trades: Trade[]; quotes: Quote[]; cooldown: Record<string, number>; updatedAt: string; lastError: string | null };

export type CandidateSource = "volume" | "foreign" | "institution" | "watchlist";
export type ProgramCandidate = { ticker: string; name: string; price: number; changePercent: number; previousClose: number; sources: CandidateSource[] };
export type CandidateSnapshot = {
  status: "ready" | "empty" | "unavailable";
  rows: ProgramCandidate[];
  checkedAt: string;
  expiresAt: string;
};

export type TradingLifecycle = {
  status: "idle" | "running" | "stopping" | "completed";
  startedAt: string | null;
  finishedAt: string | null;
  stopRequestedAt?: string;
  stopCause?: "manual" | "close" | "kill" | "session-target" | "loss-streak" | "trade-limit" | "data-gap";
  forcedAt?: string;
  beforeBalance: number;
  afterBalance: number | null;
  returnPct: number | null;
  targetReturnPct: number;
  reviewDecision: "pending" | "keep" | "review";
};

export type PaperSessionReview = {
  lifecycle: TradingLifecycle;
  balanceChange: number;
  ledgerNet: number;
  realized: number;
  closedTrades: number;
  decision: TradingLifecycle["reviewDecision"];
  proposals: string[];
  audit?: PaperReviewAudit;
};

export type PaperPerformancePoint = {
  id: string;
  finishedAt: string;
  returnPct: number;
  balanceChange: number;
};

export type PaperReviewFinding = { title: string; evidence: string };

export type PaperReviewAudit = {
  codeReference: string;
  verified: PaperReviewFinding[];
  issues: PaperReviewFinding[];
  unverified: PaperReviewFinding[];
  hypotheses: PaperReviewFinding[];
};

export type PaperReviewEvent = { id: string; created_at: string } & (
  | { kind: "evaluation"; score: number; details: { summary: string; limitations: string[]; proposals: string[] } }
  | { kind: "applied"; score: null; details: PaperAppliedChange }
);


export type PaperAppliedChange = { description: string } & (
  | { revision: string; patchId?: never }
  | { patchId: string; evaluationId: string; files: string[]; revision?: never }
);

export type PaperImprovementJob = {
  sessionId: string;
  evaluationId: string;
  stage: "preparing" | "verifying" | "completed" | "failed" | "history-pending";
  message?: string;
};

import type {
  PaperTradingSession,
  PaperTradingTick,
} from "../../../lib/types/paperTrading/paperTrading";
import type {
  AutopilotRun,
  AutopilotScreenerSnapshot,
} from "../../../lib/types/paperTrading/autopilot";
import type {
  IntradayTickLabelPayload,
  IntradayTickLabelSource,
  IntradayTickLabelValue,
} from "../../../lib/types/intraday/tickLabels";

export type StoredTickLabel = {
  tickId: string;
  sessionId: string;
  ticker: string;
  action: string;
  source: IntradayTickLabelSource;
  label: IntradayTickLabelValue;
  returnPct: number | null;
  payload: IntradayTickLabelPayload | null;
};

export type CollectedDay = {
  date: string;
  operator: string;
  sessions: PaperTradingSession[];
  ticks: PaperTradingTick[];
  labels: StoredTickLabel[];
  runs: AutopilotRun[];
  screenerSnapshots: AutopilotScreenerSnapshot[];
};

export type RuleScope = "ENTRY" | "REENTRY" | "EXIT" | "CALIBRATION" | "RISK";

export type RuleCandidate = {
  key: string;
  scope: RuleScope;
  condition: string;
  action: string;
  avoid: string;
  keywords: string[];
  supports: boolean;
  independentSamples: number;
  closedTrades: number;
  netPnlKrw: number | null;
  wins: number;
  losses: number;
  note: string;
};

export type DailyMistakeSource = {
  schemaVersion: 1;
  namespace: string;
  date: string;
  operator: string;
  inputHash: string;
  status: "READY" | "SKIPPED";
  skipReasons: string[];
  quality: {
    completedSessions: number;
    totalSessions: number;
    ticks: number;
    labelCoverageRate: number;
    unresolvedLabelRate: number;
    fallbackRate: number;
    owners: string[];
  };
  actual: {
    closedTrades: number;
    wins: number;
    losses: number;
    winRate: number | null;
    netPnlKrw: number;
    costsKrw: number;
    portfolioReturnPct: number | null;
    maxSessionDrawdownPct: number | null;
    forcedExitTrades: number;
    proactiveExitTrades: number;
  };
  counterfactualBuy: {
    wins: number;
    losses: number;
    neutral: number;
    unresolved: number;
    winRate: number | null;
    avgGrossReturnPct: number | null;
  };
  selection: {
    snapshots: number;
    evaluable: boolean;
    note: string;
  };
  candidates: RuleCandidate[];
  generatedAt: string;
};

export type MemoryRuleStatus = "SHADOW" | "ACTIVE";

export type MemoryRule = {
  id: string;
  key: string;
  status: MemoryRuleStatus;
  scope: RuleScope;
  condition: string;
  action: string;
  avoid: string;
  evidence: string;
  until: string;
  keywords: string[];
};

export type MemoryBuildResult = {
  markdown: string;
  rules: MemoryRule[];
  conflicts: string[];
  retired: Array<{ key: string; retiredAt: string; reason: string }>;
};

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
export type PaperTradingAiProvider = import("@/lib/types/stock/aiAnalysis").AIAnalysisProvider;

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
  /** ① 흐름·세력 분석가 진단 원문 — 단타 cli-agent 만. "왜 이런 판단"의 배경 메모. */
  analystNote?: string;
  /** 사후 룰 게이트가 LLM 결정을 조정한 내역(과욕 캡·레짐 veto 등) — 단타 cli-agent 만. */
  gateAdjustments?: string[];
  /** 이 판단을 내린 모델 — 모델별 판단 품질 비교(A/B)용. 결정론 폴백이면 미기록. */
  analystModel?: string;
  judgeModel?: string;
  /**
   * 이 판단의 CLI 토큰 사용량(에이전트별) — 세션 누적 토큰·환산 비용 집계용.
   * 구독(CLI) 기반이라 실제 과금이 아닌 API 환산 추정치. 결정론 폴백/미호출이면 미기록.
   */
  analystUsage?: import("@/lib/types/stock/aiAnalysis").AgentUsage;
  judgeUsage?: import("@/lib/types/stock/aiAnalysis").AgentUsage;
  /**
   * 판단 시점 정량 스냅샷(시그널·구조 레벨·기준가·구조 이벤트) — 단타 cli-agent 만.
   * 결정론 폴백 포함 모든 단타 틱에 기록. 사후 미스 분석·진입 게이트 A/B 의 숫자 근거이며
   * payload(jsonb)로 함께 영속된다(무마이그레이션). mock/existing-ai 는 미설정.
   */
  intradaySnapshot?: import("@/lib/types/intraday/intradayDecision").IntradaySnapshot;
  /**
   * 에이전트 CLI 호출 진단 — 단타 cli-agent 만, **실패/재시도가 있었던 틱에만** 기록.
   * 실패 원문(rawTextHead)·종류(failureKind)·시도 횟수를 payload(jsonb)로 영속해
   * "어떤 응답이 왜 실패했나"를 사후 데이터로 답한다(PRD intraday-decision-overhaul PR-0).
   * 전부 성공한 틱은 미기록 — 행동·payload 무변경.
   */
  agentDiagnostics?: import("@/lib/types/intraday/intradayDecision").IntradayTickAgentDiagnostics;
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
  /** 매도 실현손익(원, 비용 차감 후) — SELL 주문에만. 거래별 +/− 결과 표시용. */
  realizedPnl?: number;
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
  /** 단타 cli-agent 실행에 사용할 로컬 AI CLI. 기존 세션은 미기록일 수 있어 optional. */
  aiProvider?: PaperTradingAiProvider;
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

/** 단타(cli-agent) 판단 주기 선택지(분) — UI 드랍다운·서버 검증 공용. 15분 초과는 단타 아님. */
export const PAPER_TRADING_INTRADAY_INTERVAL_OPTIONS = [1, 2, 3, 5, 10, 15] as const;

/**
 * 판단 주기 → 분봉 단위 자동 파생(UI 라벨·서버 공용).
 * 원칙: 분봉 ≤ 주기(주기마다 최소 1봉이 마감돼 "이전 봉 꼬리" 판단이 성립), 초단타로 갈수록 세분.
 * 2·10분은 표준 분봉이 아니라 한 단계 아래 프로파일(1·5분봉)을 쓴다(주기당 2봉 마감).
 */
export const INTRADAY_TIMEFRAME_BY_INTERVAL: Record<number, number> = {
  1: 1,
  2: 1,
  3: 3,
  5: 5,
  10: 5,
  15: 15,
};

export type CreatePaperTradingSessionRequest = {
  name: string;
  tickers: string[];
  stocks?: PaperTradingSelectedStock[];
  initialCash: number;
  targetReturnPct: number;
  riskMode: PaperTradingRiskMode;
  decisionProvider: PaperTradingDecisionProvider;
  /** 서버가 감지한 로컬 AI CLI provider. 클라이언트 미지정 시 서버 게이트가 채운다. */
  aiProvider?: PaperTradingAiProvider;
  /** 단타(cli-agent) 판단 주기(분) — 미지정 시 서버 기본(env). mock 세션에선 무시. */
  tickIntervalMinutes?: number;
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

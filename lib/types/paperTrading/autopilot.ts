/**
 * 단타 오토파일럿(자동 포트폴리오) 도메인 타입 — intraday-autopilot.
 *
 * 오토파일럿 "런(run)"은 기존 단일 종목 cli-agent 세션을 자식으로 생성/회수하는 오케스트레이션
 * 레이어다. 판단·체결·자가채점은 전부 자식 세션(기존 경로)이 담당하고, 런은 **종목 선정(스크리너)과
 * 슬롯 로테이션**만 소유한다. 런 상태는 Supabase `paper_trading_autopilot_runs` 에 payload(jsonb)로
 * 영속된다(세션 영속과 동일한 무마이그레이션 패턴).
 */

import type {
  PaperTradingRiskMode,
  PaperTradingSession,
} from "@/lib/types/paperTrading/paperTrading";

/**
 * 런 상태 — `active`(스윕 대상) / `stopped`(사용자 중지 — 자식 세션은 건드리지 않음) /
 * `completed`(마감·크로스데이 자동 확정).
 */
export type AutopilotRunStatus = "active" | "stopped" | "completed";
/** guide=사용자 상품 경험, research=판단·가상체결 데이터 수집. 레거시 런은 research로 해석한다. */
export type AutopilotRunPurpose = "guide" | "research";

/** 사용자가 AI 가이드 한 건에 남긴 최종 응답. 추천 원본(tick.orders)은 수정하지 않는다. */
export type AutopilotGuideResponseKind = "performed" | "passed";

/**
 * 가이드 응답 원장 — 서버가 source tick/order를 다시 조회해 스냅샷을 채운다.
 * 클라이언트가 보낸 가격·수량을 신뢰하지 않아 가상 주문과 사용자 수행 기록이 뒤섞이지 않는다.
 */
export type AutopilotGuideResponse = {
  guideId: string;
  sessionId: string;
  tickId: string;
  orderIndex: number;
  ticker: string;
  name: string;
  side: "BUY" | "SELL";
  recommendedPrice: number;
  recommendedQuantity: number;
  recommendedAt: string;
  /** 수행 시 가이드 원장에 반영한 수량. 패스는 0, 매도는 당시 가이드 보유 수량이 상한이다. */
  executedQuantity: number;
  response: AutopilotGuideResponseKind;
  respondedAt: string;
};

/** 포트폴리오 슬롯 — 자식 세션 1개 자리. sessionId=null 이면 빈 슬롯(다음 스윕에서 fill 후보). */
export type AutopilotSlot = {
  slotIndex: number;
  sessionId: string | null;
  ticker: string | null;
  /** 이 슬롯에 현재 세션을 채운 시각(ISO). 빈 슬롯이면 null. */
  filledAt: string | null;
};

/** 스크리너 후보 출처 — 어떤 랭킹에서 등장했는지(다중 등장은 가점). */
export type AutopilotCandidateSource =
  | "volume"
  | "fluctuation"
  | "flow-frgn"
  | "flow-orgn";

/**
 * 2차(당일 분봉) 결정론 피처 — shortlist 종목에 대해 추출. 스코어링 반사실 튜닝(선정 품질 평가)을
 * 위해 스냅샷에 함께 영속한다(원재료가 있어야 "ATR 가중을 바꾸면 더 나은가"를 소급 재점수 가능).
 */
export type AutopilotStage2Features = {
  /** 최근 마감봉 ATR% (TR 평균/현재가×100). 봉 부족 시 null. */
  atrPct: number | null;
  /** 마지막 마감봉 log-거래량 z-score(gradedVolumeAxis 산식 공유). */
  volumeZ: number | null;
  /** 당일 VWAP 이격%(+ = 위). null = 미산출. */
  vwapGapPct: number | null;
  aboveVwap: boolean;
  orBreakout: boolean;
  vwapReclaim: boolean;
  volumeZSurge: boolean;
  /** 스윙 시퀀스가 상승 구조(HH·HL)인가. */
  swingUptrend: boolean;
  /** 당일 체결대금 합(원) — 유동성 재검증(1차에서 거래대금 미상이던 후보). */
  todayTradingValueKrw: number;
};

/** 스크리너 후보 1종목 — 1차(랭킹 필드) → 2차(당일 분봉) 점수를 누적한다. */
export type AutopilotCandidate = {
  ticker: string;
  name: string;
  sources: AutopilotCandidateSource[];
  price: number;
  changePercent: number;
  /** 누적 거래대금(원) — volume-rank(by=value) 행에만 존재. 미상은 하드필터 통과 후 2차에서 재검증. */
  tradingValue?: number;
  /** ⚠️ 수급 순매수 거래대금(백만원, KIS 단위 그대로) — flow 소스 행에만 존재. */
  netBuyAmount?: number;
  /** 단기과열(OVERHEATED) 경보 보유 — 하드 제외 아닌 감점 마커. */
  overheated?: boolean;
  /** 1차 점수(0~1) — 랭킹 필드만으로 산출. */
  score1: number;
  /** 2차 점수(0~1) — shortlist 한정, 당일 분봉 피처 기반. 미산출이면 undefined. */
  score2?: number;
  /** 최종 점수 = 0.4×score1 + 0.6×score2. score2 미산출이면 undefined(=fill 후보 아님). */
  finalScore?: number;
  /** 2차 점수 원재료(shortlist 만) — 스냅샷 영속으로 스코어링 반사실 튜닝의 근거. 미산출이면 undefined. */
  stage2?: AutopilotStage2Features;
  /** 하드필터 탈락 사유(관측용) — 통과 후보는 undefined. */
  rejectedBy?: string;
};

/** 로테이션 이벤트 종류 — fill(빈 슬롯 채움)/replace(교체 회수)/reconcile(외부 종료 감지)/skip(스윕 무행동 사유). */
export type AutopilotRotationEventKind = "fill" | "replace" | "reconcile" | "skip";

/** 로테이션 로그 1건 — 런 payload 에 누적(상한 절단). "왜 이 종목을 넣고 뺐나"의 사후 근거. */
export type AutopilotRotationEvent = {
  at: string;
  kind: AutopilotRotationEventKind;
  /** 슬롯 무관 이벤트(skip)는 null. */
  slotIndex: number | null;
  outgoing?: { sessionId: string; ticker: string; reason: string };
  incoming?: { sessionId: string; ticker: string; score: number };
  note?: string;
};

/** 스윕 1회의 스크리너 요약(관측용) — 후보가 왜 없었는지/무엇이 상위였는지 UI·사후 분석 근거. */
export type AutopilotScreenerSummary = {
  at: string;
  /** 랭킹 union 원본 크기(dedupe 후). */
  universeSize: number;
  /** 하드필터 통과 수. */
  passed: number;
  /** 1차 점수 상위 종목(티커·점수만, 최대 8) — payload 비대화 방지 축약. */
  top: Array<{ ticker: string; name: string; score1: number; finalScore?: number }>;
  /** 스크리너 미가용 사유(KIS 미설정 등). 정상이면 undefined. */
  unavailableReason?: string;
};

/**
 * 스윕 1회의 스크리너 전수 스냅샷 — **종목 선정 품질 사후 검증용** append-only 관측 데이터.
 * 매 스윕의 전체 랭킹(점수·스냅샷 시점 가격 포함)·탈락 후보(사유)·실제 편입/교체를
 * `paper_trading_autopilot_screener_snapshots` 에 남긴다. 가격이 함께 저장되므로 나중에
 * "뽑은 종목 vs 안 뽑은 종목 vs 탈락 종목"의 사후 수익률(forward return) 비교 평가가 가능하다
 * (daily.mts 캘리브레이션과 같은 관측-먼저 접근 — 평가 스크립트는 후속).
 */
export type AutopilotScreenerSnapshot = {
  /** `${runId}:${sweepWindowStart}` — 창당 1행 멱등(재시도 중복 방지). */
  id: string;
  runId: string;
  owner: string;
  at: string;
  sweepWindowStart: string;
  status: "ok" | "unavailable";
  unavailableReason?: string;
  universeSize: number;
  /** 스크리너에서 사전 제외된 티커(쿨다운·타 세션 진행 중). */
  excludedTickers: string[];
  /** 하드필터 통과 전 종목(1차 점수순, shortlist 는 2차·최종 점수 병합). */
  ranking: AutopilotCandidate[];
  /** 하드필터·2차 재검증 탈락 후보(rejectedBy 포함). */
  rejected: AutopilotCandidate[];
  /** 이 스윕에서 실제 편입한 종목(세션 생성 성공분). */
  picks: Array<{ ticker: string; slotIndex: number; sessionId: string; score: number }>;
  /** 이 스윕에서 교체 회수한 종목(완료 patch 성공분). */
  replaced: Array<{ ticker: string; sessionId: string; reason: string }>;
};

/** 오토파일럿 런 — 인메모리 1차 진실 + Supabase write-through(세션 스토어 패턴 미러). */
export type AutopilotRun = {
  id: string;
  status: AutopilotRunStatus;
  /** 실행 진입점의 목적. 미기록 레거시 런은 research다. */
  purpose?: AutopilotRunPurpose;
  /**
   * 이 런을 만든 서버 운영자 — 공유 Supabase 다중 서버 격리 키. 세션 게이트(own-or-unowned)와
   * 달리 런은 신규 개념이라 레거시 미지정 호환이 없다: **엄격히 owner === operator 만** 스윕/마감.
   */
  owner: string;
  /** 총자본(원) — 슬롯당 고정 배분의 원천. */
  totalCapital: number;
  /** 슬롯 수(1~5). 기본 3 — INTRADAY_TICK_CONCURRENCY 기본과 정합. */
  slotCount: number;
  /** 슬롯당 자식 세션 initialCash = floor(totalCapital / slotCount). 로테이션 승계 없음(고정 배분). */
  perSlotCash: number;
  riskMode: PaperTradingRiskMode;
  /** 자식 세션 판단 주기(분) — 미지정이면 세션 기본(env). */
  tickIntervalMinutes?: number;
  slots: AutopilotSlot[];
  /** 교체 회수된 티커의 재진입 금지 시각(ISO) 맵 — 지나면 다시 후보 가능. */
  cooldownUntilByTicker: Record<string, string>;
  rotationLog: AutopilotRotationEvent[];
  /** 마지막 스윕의 창 시작(ISO) — 재시작 후에도 같은 창 이중 스윕 방지(영속 dedup 키). */
  lastSweepWindowStart: string | null;
  lastScreenerSummary?: AutopilotScreenerSummary;
  /**
   * `${sessionId}:${tickId}:${orderIndex}` → 사용자 응답. 레거시 런은 미기록일 수 있어 optional.
   * 같은 guideId는 단 한 번만 확정하며 기존 AI 가상 체결 원본과 별도로 영속한다.
   */
  guideResponses?: Record<string, AutopilotGuideResponse>;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** 런 시작 요청 — 전부 optional(서버 기본값 채움). */
export type StartAutopilotRunRequest = {
  purpose?: AutopilotRunPurpose;
  totalCapital?: number;
  slotCount?: number;
  riskMode?: PaperTradingRiskMode;
  tickIntervalMinutes?: number;
};

/** GET/POST /api/paper-trading/autopilot 응답. */
export type AutopilotRunResponse = {
  run: AutopilotRun | null;
  /** 이 서버의 운영자 — 클라 "내 런" 판정용(세션 응답 currentOperator 관례). */
  currentOperator: string;
  /** 스크리너 가용 여부(KIS prod 설정) — false 면 UI 가 "종목 선정 불가" 경고. 시작 자체는 허용. */
  kisReady: boolean;
  generatedAt: string;
};

/** PATCH /api/paper-trading/autopilot/[runId] 요청 — 중지만 허용. */
export type PatchAutopilotRunRequest = {
  /** 런 중지 명령. guideResponse와 동시에 보낼 수 없다. */
  status?: Extract<AutopilotRunStatus, "stopped">;
  /** research 수동 중지 시 해당 런의 진행 중 자식 모의세션도 청산·완료한다. */
  completeChildSessions?: boolean;
  /** 가이드 응답 명령. 서버는 guideId의 원본 주문을 재조회한다. */
  guideResponse?: {
    guideId: string;
    response: AutopilotGuideResponseKind;
  };
};

/** 런 손익 집계에 쓰는 자식 세션 뷰(클라 계산용 헬퍼 타입). */
export type AutopilotChildSession = Pick<
  PaperTradingSession,
  "id" | "status" | "initialCash" | "portfolioValue" | "returnPct" | "stocks"
>;

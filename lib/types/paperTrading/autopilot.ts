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

/** 오토파일럿 런 — 인메모리 1차 진실 + Supabase write-through(세션 스토어 패턴 미러). */
export type AutopilotRun = {
  id: string;
  status: AutopilotRunStatus;
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
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** 런 시작 요청 — 전부 optional(서버 기본값 채움). */
export type StartAutopilotRunRequest = {
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
  status: Extract<AutopilotRunStatus, "stopped">;
};

/** 런 손익 집계에 쓰는 자식 세션 뷰(클라 계산용 헬퍼 타입). */
export type AutopilotChildSession = Pick<
  PaperTradingSession,
  "id" | "status" | "initialCash" | "portfolioValue" | "returnPct" | "stocks"
>;

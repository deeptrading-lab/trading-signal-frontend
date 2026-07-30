/**
 * AI 멀티에이전트 분석 타입.
 * - AgentKey: 12개 에이전트 식별자 (TradingAgents 아키텍처 정합)
 * - AIAnalysisEvent: SSE 이벤트 유니온
 * - FinalDecision: Portfolio Manager 최종 결정 구조체
 */

import type { SignalAction, RuleDirection, AxisKey } from "@/lib/types/signal";

export type AgentKey =
  | "market"
  | "news"
  | "fundamentals"
  | "social"
  | "bull"
  | "bear"
  | "research_manager"
  | "trader"
  | "risk_risky"
  | "risk_neutral"
  | "risk_safe"
  | "portfolio_manager";

export type AIAnalysisProvider = "claude" | "codex";

/**
 * 에이전트 1회 호출의 토큰 사용량.
 * claude CLI는 result 이벤트(stream-json --verbose)에서 전 필드를 채운다.
 * usage 누락·파싱 실패 경로는 토큰 null + measured:false 로 남겨 평균 집계에서 구분한다.
 */
export interface AgentUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  cacheCreationInputTokens: number | null;
  cacheReadInputTokens: number | null;
  costUsd: number | null;
  model: string | null;
  /** false = 토큰 미측정(codex 미지원). null 토큰과 0 사용을 구분 */
  measured: boolean;
}

/** 토큰 미측정 폴백(codex·비정상 종료 등). */
export const UNMEASURED_USAGE: AgentUsage = {
  inputTokens: null,
  outputTokens: null,
  cacheCreationInputTokens: null,
  cacheReadInputTokens: null,
  costUsd: null,
  model: null,
  measured: false,
};

// ─── 구조화 감성 (SNS 분석가 정형 출력) ───────────────────────────────────────

/**
 * 7단계 감성 밴드 (코드값). 한글 라벨↔코드 매핑은 `lib/copy/stock/aiAnalysis.ts`.
 * score 0~10(5=중립) 중앙정렬: 0=매우 부정 … 5=중립 … 10=매우 긍정.
 */
export type SentimentBand =
  | "VERY_NEGATIVE"
  | "NEGATIVE"
  | "SLIGHTLY_NEGATIVE"
  | "NEUTRAL"
  | "SLIGHTLY_POSITIVE"
  | "POSITIVE"
  | "VERY_POSITIVE";

/** 감성 신뢰도 — 검색 표본의 양·일관성. */
export type SentimentConfidence = "low" | "medium" | "high";

/**
 * SNS 분석가가 자유서술 리포트 말미에 동봉하는 정형 감성 요약.
 * - band: 7단계 밴드(군중 심리 방향·강도, 주가 전망 아님)
 * - score: 0~10 정수(현재 군중심리 긍정/부정 강도)
 * - confidence: 표본 양·일관성 기반 신뢰도
 * - summary: 한 줄 요약(80자 이내)
 */
export interface SentimentReport {
  band: SentimentBand;
  score: number;
  confidence: SentimentConfidence;
  summary: string;
}

/**
 * 로컬 AI CLI 가용성 — `/api/stock/ai-analysis/providers` 응답.
 * - `providers` — 공급자별 설치 여부.
 * - `available` — 그중 설치된 공급자 키 배열(진입 화면이 선택지로 사용).
 * - `vercel` — Vercel 환경이면 true(항상 0개, 로컬 전용 안내 표면).
 */
export interface AIProviderAvailability {
  providers: Record<AIAnalysisProvider, boolean>;
  available: AIAnalysisProvider[];
  vercel: boolean;
}

/**
 * 분석 시점 결정론 시그널 엔진(`lib/signal`) 산출물의 압축본 — 카드/모달 표시·재현용.
 * `SignalResult` 전체(특히 `axes[].hits`)는 표시에 불필요해 경량 필드만 보존한다.
 */
export interface DecisionSignal {
  /** 0~100 종합 점수 (축 가중평균). 카드 칩 1차 메트릭 — 연속값이라 종목마다 변별된다. */
  score: number;
  /** "BUY" | "HOLD" | "SELL". */
  action: SignalAction;
  /** 0~1 4축 동의도. 모달 보조. */
  confidence: number;
  /** +1 강세 / 0 중립 / -1 약세. */
  regime: RuleDirection;
  /** 4축 점수 분해 (모달 노출용) — hits 제외 경량화. */
  axes: { axis: AxisKey; score: number; direction: RuleDirection }[];
  /** 평가 기준 봉 날짜 (YYYY-MM-DD). */
  asOf: string;
}

/**
 * 종목별 공유 AI 분석 결론 스냅샷.
 * Supabase `ai_analysis_decisions` 테이블의 ticker PK row 를 BFF가 camelCase로 변환해 반환한다.
 */
export interface AIAnalysisDecisionSnapshot {
  ticker: string;
  /** 분석 시점 종목명(KIS hts_kor_isnm). legacy(이 컬럼 추가 이전) 행은 null → 읽기 시 KIS 폴백. */
  name: string | null;
  provider: AIAnalysisProvider;
  decision: FinalDecision;
  sentiment: SentimentReport | null;
  /** 분석 시점 결정론 시그널 — legacy(이 컬럼 추가 이전) 행은 null. */
  signal: DecisionSignal | null;
  updatedAt: string;
}

export type AgentStatus = "pending" | "running" | "done" | "error";

/**
 * 에이전트 실패 사유 — 모니터링/UI 공용 분류.
 * route.ts failAgent · aiAnalysis.ts logDebateFail 가 로그(`reason=…`)와 SSE 이벤트에 동일 값으로 싣는다.
 */
export type AgentFailReason = "timeout" | "cli-error" | "json-parse" | "verdict-invalid";

export interface AgentMeta {
  key: AgentKey;
  label: string;
  description: string;
}

export const AGENT_META: AgentMeta[] = [
  { key: "market",            label: "기술 분석가",      description: "기술적 지표·차트 패턴 분석" },
  { key: "news",              label: "뉴스 분석가",       description: "최신 뉴스·공시 수집 및 정리" },
  { key: "fundamentals",      label: "기본 분석가",       description: "재무제표·실적·밸류에이션 조사" },
  { key: "social",            label: "SNS 분석가",        description: "Reddit·커뮤니티 투자 심리 분석" },
  { key: "bull",              label: "강세 연구원",       description: "매수 논거 작성" },
  { key: "bear",              label: "약세 연구원",       description: "매도 논거 작성" },
  { key: "research_manager",  label: "리서치 매니저",     description: "토론 종합 후 투자 계획 수립" },
  { key: "trader",            label: "트레이더",          description: "투자 계획 기반 구체적 매매 제안" },
  { key: "risk_risky",        label: "공격적 리스크",     description: "고수익 기회 옹호, 보수적 가정 반박" },
  { key: "risk_neutral",      label: "중립적 리스크",     description: "성장 vs 리스크 균형 분석" },
  { key: "risk_safe",         label: "보수적 리스크",     description: "자산 보호, 하방 리스크 집중" },
  { key: "portfolio_manager", label: "최종 판정", description: "최종 매매 결정" },
];

// ─── SSE 이벤트 ───────────────────────────────────────────────────────────────

export type AIAnalysisEvent =
  /**
   * 대기 안내(봇 SSE 통로 전용) — 전역 동시성이 꽉 차 이 요청이 큐에 적재됐을 때 발행.
   * 슬롯이 나면 같은 연결로 곧바로 progress/… 라이브 스트림이 이어진다. position=대기 순번, etaMinutes=대략 소요.
   * 브라우저 로컬 라이브 경로는 이 이벤트를 받지 않는다(봇 요청만 대기 경로).
   */
  | { type: "queued";        position: number; etaMinutes: number }
  /** 에이전트 상태 변경 (running 시작 / done 완료 / error 실패). reason 은 error 일 때만 의미. */
  | { type: "progress";      agent: AgentKey; status: "running" | "done" | "error"; reason?: AgentFailReason }
  /** 에이전트가 생성 중인 토큰 청크 (실시간 스트리밍) */
  | { type: "stream";        agent: AgentKey; chunk: string }
  /** 에이전트 완료 후 최종 전체 텍스트 */
  | { type: "report";        agent: AgentKey; content: string }
  /** Bull/Bear 토론 중 토큰 청크 (실시간) — round는 1-based */
  | { type: "debate_stream"; speaker: "bull" | "bear"; chunk: string; round: number }
  /** 토론 1회 발화 완료 텍스트 */
  | { type: "debate";        speaker: "bull" | "bear"; content: string; round: number }
  /** SNS 분석가 정형 감성 — social 완료 후 파싱 성공 시 1회 발행 */
  | { type: "sentiment";     report: SentimentReport }
  /** Portfolio Manager 최종 결정 */
  | { type: "final";         data: FinalDecision }
  /** 전체 오류 */
  | { type: "error";         message: string }
  /** 분석 완료 */
  | { type: "done" };

// ─── 최종 결정 ───────────────────────────────────────────────────────────────

// 강세→약세 6단계: 적극 매수 · 분할 매수 · 중립 · 신규 진입 주의 · 분할 매도 · 매도/회피
export type FinalVerdict = "BUY" | "OVERWEIGHT" | "HOLD" | "UNDERWEIGHT" | "REDUCE" | "SELL";

export interface FinalDecision {
  verdict: FinalVerdict;
  reasoning: string;
  key_strengths: string[];
  key_risks: string[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  time_horizon: "단기" | "중기" | "장기";
  /** 신규 진입자용 가이드 — 현재가 기준 진입/관망 조건·트리거 (1~2문장) */
  new_entry_strategy: string;
  /** 기존 보유자용 가이드 — 포지션 비율·가격 레벨 기준 (수익률 표현 금지, 1~2문장) */
  holder_strategy: string;
  /** 목표 수익률 또는 재진입 구간 % (현재가 대비). BUY/OVERWEIGHT/HOLD=양수 목표, UNDERWEIGHT/REDUCE=음수 재진입 구간, SELL=null */
  target_pct: number | null;
  /**
   * 서버가 약세 재진입가를 **무효화한 사유**(있으면 `target_pct` 는 null 로 강제된 것).
   *
   * PM 이 낸 재진입가가 매물대 공백에 찍히면 `checkReentryAnchor` 가 무효화한다 — 그 자리는 지지가
   * 아니라 낙폭이 확대되는 구간이라 "다시 볼 자리"가 될 수 없기 때문. 이 필드는 **프롬프트 준수율
   * 계측기**이기도 하다(발동률이 높으면 프롬프트 문구를 손봐야 한다는 신호).
   * 정상 통과·강세·legacy 행은 undefined.
   */
  target_pct_voided_reason?: string | null;
  /**
   * 테제(논거) 무효화 라인 % (현재가 대비). 방향은 verdict 로 갈림:
   * 강세(BUY/OVERWEIGHT/HOLD)=하방 손절(음수, 예 -5), 약세(UNDERWEIGHT/REDUCE/SELL)=상방 무효화(양수, 예 +6).
   * ⚠️ 이 시맨틱 도입(2026-07) 이전 legacy 약세 행은 stop 이 음수(하방)일 수 있음 — 소비처는 부호로 방향 판단.
   */
  stop_loss_pct: number;
  /** 손익비 (예: 3.0 = 3:1). target_pct null이면 null */
  risk_reward_ratio: number | null;
  /** 분석 시점 현재가(원) — target_pct·stop_loss_pct(%) 의 기준가. 절대가격 표기용. 이 필드 추가 이전 legacy 행은 undefined → %만 표기. */
  base_price?: number | null;
  /**
   * 분석 엔진 모델(예: `claude-sonnet-5`) — 저장 시 provider 별 base env(`CLAUDE_CLI_MODEL`/`CODEX_CLI_MODEL`)
   * 를 캡처해 decision JSONB 에 실는다(무마이그레이션). 이 필드 추가 이전 legacy 행·env 미설정은 undefined/null.
   * **관리자에게만** 노출(user-login-auth Phase 2) — 일반 사용자에겐 "AI 분석"으로 총칭한다.
   */
  model?: string | null;
  /** 1~2주 단기 전망 1~2문장 */
  short_term_outlook: string;
  /** 1~3개월 중기 전망 1~2문장 */
  mid_term_outlook: string;
  /** 데이터 제한 여부 — 거래일 봉 수 < 130봉이라 장기추세(120일선·레짐) 미확보 시 true. 시그널 엔진 evaluateSignal 결과를 그대로 실어 카드 배지에 사용 */
  limitedData: boolean;
  /** 시그널 평가에 사용된 거래일 봉 수 */
  bars: number;
}

// ─── 훅 내부 상태 ────────────────────────────────────────────────────────────

export interface AgentState {
  key: AgentKey;
  status: AgentStatus;
  /** 현재 스트리밍 중인 누적 텍스트 (running 중에만 채워짐, done 시 '' 로 초기화) */
  streamingChunk: string;
  /** status==="error" 일 때 실패 사유(SSE progress.reason). 재시도 카드에 표시. */
  failReason?: AgentFailReason;
}

export interface DebateMessage {
  speaker: "bull" | "bear";
  content: string;
  /** 아직 스트리밍 중인 발화 여부 */
  isStreaming: boolean;
  /** 토론 라운드 번호 (1-based) */
  round: number;
}

export const INITIAL_AGENT_STATES: AgentState[] = AGENT_META.map((m) => ({
  key: m.key,
  status: "pending",
  streamingChunk: "",
}));

/**
 * 강세↔약세 토론 라운드 수 (서버·클라이언트 공용).
 * bull+bear 교대 1쌍 = 1라운드. DEBATE_ROUNDS=2는 bull R1→bear R1→bull R2→bear R2의 4발화를 의미한다.
 */
export const DEBATE_ROUNDS = 2;

/** 에이전트 실행 순서 (서버·클라이언트 공용) */
export const AGENT_ORDER: AgentKey[] = [
  "market", "news", "fundamentals", "social",
  "bull", "bear",
  "research_manager", "trader",
  "risk_risky", "risk_neutral", "risk_safe",
  "portfolio_manager",
];

/**
 * 에러가 발생한 에이전트의 재개 기점을 반환한다.
 * - bear → bull (토론은 항상 bull부터 재개)
 * - risk_neutral | risk_safe → risk_risky (3개 병렬 중 첫 번째)
 */
export function getResumeKey(agent: AgentKey): AgentKey {
  if (agent === "bear") return "bull";
  if (agent === "risk_neutral" || agent === "risk_safe") return "risk_risky";
  return agent;
}

/**
 * 이전 실행에서 완료된 에이전트 결과를 재개 시 서버에 전달하는 구조체.
 * 각 필드는 해당 에이전트가 완료된 경우에만 채워진다.
 */
export interface ResumeState {
  marketReport?: string;
  newsReport?: string;
  fundamentalsReport?: string;
  socialReport?: string;
  bullArgument?: string;
  bearArgument?: string;
  researchPlan?: string;
  traderProposal?: string;
  riskRisky?: string;
  riskNeutral?: string;
  riskSafe?: string;
}

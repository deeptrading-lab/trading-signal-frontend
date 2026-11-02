/**
 * AI CLI 공용 타입 — 단타 AI 판단·시황 분석·스윙 AI 노트가 쓴다.
 * (옛 12에이전트 AI 종합분석 타입 — AgentKey·SSE 이벤트·FinalDecision 등 — 은 그 파이프라인과 함께 삭제,
 *  swing-judgment PR-5.)
 */

import type { SignalAction, RuleDirection, AxisKey } from "@/lib/types/signal";

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

/**
 * 로컬 AI CLI 가용성 — `/api/stock/ai-analysis/providers` 응답.
 * - `providers` — 공급자별 설치 여부.
 * - `available` — 그중 설치된 공급자 키 배열.
 * - `vercel` — Vercel 환경이면 true(항상 0개, 로컬 전용 안내 표면).
 */
export interface AIProviderAvailability {
  providers: Record<AIAnalysisProvider, boolean>;
  available: AIAnalysisProvider[];
  vercel: boolean;
}

/**
 * 결정론 시그널 엔진(`lib/signal`) 산출물의 압축본 — 표시·재현용.
 * `SignalResult` 전체(특히 `axes[].hits`)는 표시에 불필요해 경량 필드만 보존한다.
 */
export interface DecisionSignal {
  /** 0~100 종합 점수 (축 가중평균). */
  score: number;
  /** "BUY" | "HOLD" | "SELL". */
  action: SignalAction;
  /** 0~1 4축 동의도. */
  confidence: number;
  /** +1 강세 / 0 중립 / -1 약세. */
  regime: RuleDirection;
  /** 4축 점수 분해 — hits 제외 경량화. */
  axes: { axis: AxisKey; score: number; direction: RuleDirection }[];
  /** 평가 기준 봉 날짜 (YYYY-MM-DD). */
  asOf: string;
}

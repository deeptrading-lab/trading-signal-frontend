/**
 * AI 종목분석 런타임 config — 토큰 최적화 A/B 하니스가 토글하는 레버 모음.
 *
 * 설계 원칙(무회귀 생명선): override 가 없으면 `DEFAULT_ANALYSIS_CONFIG` 가 쓰이고,
 * 그 값은 **현재 코드에 하드코딩된 값과 바이트 동일**하다. 즉 일반 분석(override 미주입)은
 * 프롬프트가 한 글자도 바뀌지 않아 캐시·결정 결과가 그대로다. 하니스만 override 를 넘긴다.
 */

import { DEBATE_ROUNDS, type AgentKey } from "@/lib/types/stock/aiAnalysis";

export type AgentEffort = "low" | "medium" | "high" | "xhigh" | "max";

/** 후단 프롬프트가 앞 단계 리포트를 끼울 때의 글자수 상한(slice). 키 = 사용 지점. */
export interface AnalysisSliceConfig {
  /** trader 프롬프트의 강세 논거 slice */
  traderBull: number;
  /** trader 프롬프트의 약세 논거 slice */
  traderBear: number;
  /** trader 프롬프트의 기술 분석 요약 slice */
  traderMarket: number;
  /** risk 3종 프롬프트의 리서치 플랜 slice */
  riskResearch: number;
  /** risk 3종 프롬프트의 시그널 요약 slice */
  riskSignal: number;
  /** PM 프롬프트의 강세 논거 slice */
  pmBull: number;
  /** PM 프롬프트의 약세 논거 slice */
  pmBear: number;
  /** 토론 R2 프롬프트가 직전 라운드 논거를 끼울 때의 slice */
  debateR2Prev: number;
}

export interface AnalysisConfig {
  /** 토론 라운드 수(bull↔bear 교대 1쌍 = 1라운드). 기본 = DEBATE_ROUNDS(2). */
  debateRounds: number;
  /**
   * 종합 단계(RM·트레이더·PM) 프롬프트에서 강세/약세 논거 블록 제시 순서.
   * 기본 "bull-first"(현행). "bear-first"=순서만 뒤집어 위치/recency 편향 격리 진단용(A/B).
   */
  debateOrder: "bull-first" | "bear-first";
  /** 입력 누적 slice 상한들. */
  slices: AnalysisSliceConfig;
  /** 에이전트별 reasoning effort 오버라이드(미지정 = AGENT_PROMPTS 기본). */
  effortByAgent?: Partial<Record<AgentKey, AgentEffort>>;
  /** 에이전트별 모델 id 오버라이드(미지정 = AGENT_PROMPTS/env 기본). */
  modelByAgent?: Partial<Record<AgentKey, string>>;
}

/**
 * 현 하드코딩값과 바이트 동일한 기본 config.
 * slice 값은 lib/prompts/stock/aiAnalysis.ts 의 현재 `.slice(0, N)` 리터럴과 1:1 일치해야 한다.
 */
export const DEFAULT_ANALYSIS_CONFIG: AnalysisConfig = {
  debateRounds: DEBATE_ROUNDS,
  debateOrder: "bull-first",
  slices: {
    traderBull: 1500,
    traderBear: 1500,
    traderMarket: 800,
    riskResearch: 800,
    riskSignal: 500,
    pmBull: 2000,
    pmBear: 2000,
    debateR2Prev: 1500,
  },
};

/** 하니스가 보내는 부분 override(slice 도 일부만 토글 가능). */
export type AnalysisConfigOverride = {
  debateRounds?: number;
  debateOrder?: "bull-first" | "bear-first";
  slices?: Partial<AnalysisSliceConfig>;
  effortByAgent?: Partial<Record<AgentKey, AgentEffort>>;
  modelByAgent?: Partial<Record<AgentKey, string>>;
};

/**
 * override(부분)를 기본값 위에 병합해 완전한 config 를 만든다.
 * override 가 없으면 기본값을 그대로 반환(무회귀).
 */
export function resolveAnalysisConfig(
  override?: AnalysisConfigOverride | null,
): AnalysisConfig {
  if (!override) return DEFAULT_ANALYSIS_CONFIG;
  return {
    debateRounds: override.debateRounds ?? DEFAULT_ANALYSIS_CONFIG.debateRounds,
    debateOrder: override.debateOrder ?? DEFAULT_ANALYSIS_CONFIG.debateOrder,
    slices: { ...DEFAULT_ANALYSIS_CONFIG.slices, ...(override.slices ?? {}) },
    effortByAgent: override.effortByAgent,
    modelByAgent: override.modelByAgent,
  };
}

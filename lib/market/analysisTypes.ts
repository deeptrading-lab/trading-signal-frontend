/**
 * 시황 레이어 Phase 2 — `MarketAnalysis` 타입 (CLI 국면 합성 산출물).
 *
 * PRD `market-analysis` §3.1. Phase 1 `MarketSnapshot`(수치)을 입력으로 Claude CLI 가
 * 합성한 **국면 해석**. 사용자 핵심 질문(반도체 의존·동반하락·조정장 생존)에 답하는 레이어.
 *
 * CLI 는 아래 "합성 필드"만 JSON 으로 내고, orchestrator(`analysis.ts`)가
 * `asOf`·`snapshotAsOf`·`provider`·`warnings` 로 래핑한다.
 */

import type { AIAnalysisProvider } from "@/lib/types/stock/aiAnalysis";

/**
 * 시장 국면 — 강세→약세 사이클 위치. "강세집중(narrow)"은 소수 주도주 의존 국면으로,
 * 사용자가 지목한 "반도체 2종목 의존" 상황을 정확히 가리킨다.
 */
export type MarketPhase =
  | "risk_on_broad" // 강세 확산 — 다수 섹터 동반 상승(건강한 강세).
  | "risk_on_narrow" // 강세 집중 — 소수 주도주 의존(겉은 강세, 속은 취약).
  | "late_cycle" // 고점 경계 — 주도섹터 과열·확산 둔화.
  | "correction" // 조정 — 주도섹터 꺾임·동반 하락 진행.
  | "risk_off" // 약세 — 추세적 하락.
  | "bottoming" // 바닥 확인 — 낙폭 둔화·반등 시도.
  | "neutral"; // 중립/혼조 — 방향 불명확.

/** 주도 섹터 성숙도 — 시세 사이클 위치(초기일수록 상방 여지, 과열·쇠퇴는 동반하락 위험). */
export type SectorMaturity =
  | "emerging" // 초기 — 시세 발화.
  | "growth" // 성장 — 상승 본류.
  | "mature" // 성숙 — 상승 지속이나 신규 모멘텀 둔화.
  | "overheated" // 과열 — 단기 급등·되돌림 위험.
  | "declining"; // 쇠퇴 — 시세 종료·하락 전환.

export type SystemRiskLevel = "low" | "elevated" | "high";
export type MarketAnalysisConfidence = "HIGH" | "MEDIUM" | "LOW";

/** 국면 진단 — 시장 전체가 어느 사이클 위치에 있나. */
export type RegimeDiagnosis = {
  phase: MarketPhase;
  /** 한 줄 요약(헤드라인). */
  headline: string;
  /** 2~4문장 근거(지수·시장폭·국면·집중도 종합). */
  rationale: string;
};

/** 주도 섹터 1종 + 성숙도. key 는 스냅샷 `sectors[].key` 와 연결. */
export type LeadingSector = {
  key: string;
  label: string;
  maturity: SectorMaturity;
  /** 성숙도 판단 근거 1~2문장. */
  note: string;
};

/**
 * 시스템 리스크 — **핵심 차별점**. "코스피 상승이 소수 대형주 의존인가(concentrationRisk)",
 * "주도섹터가 꺾이면 어떻게 동반하락하나(triggers·contagion)" 를 합성한다.
 */
export type SystemRisk = {
  level: SystemRiskLevel;
  /** 집중도(스냅샷 concentration) 기반 위험 서술 — 1~3문장. */
  concentrationRisk: string;
  /** 동반하락을 촉발할 수 있는 트리거 2~4(예: 반도체 실적 피크아웃·환율·미국 금리). */
  triggers: string[];
  /** 주도섹터 꺾임이 시장 전체로 전이되는 양상 1~3문장. */
  contagion: string;
};

/** 단기 전망 — 기본/상방/하방 시나리오. */
export type MarketOutlook = {
  /** 전망 기간(예: "1~2주"). */
  horizon: string;
  base: string;
  bull: string;
  bear: string;
};

/** `GET /api/market/analysis` 산출물. */
export type MarketAnalysis = {
  /** 분석 생성 시각(ISO). */
  asOf: string;
  /** 입력 스냅샷 `asOf`(추적성). */
  snapshotAsOf: string;
  provider: AIAnalysisProvider;
  regimeDiagnosis: RegimeDiagnosis;
  leadingSectors: LeadingSector[];
  systemRisk: SystemRisk;
  outlook: MarketOutlook;
  /** 종목분석 주입용 함의(조정장 생존 관점·포지션 시사) — Phase 3 `marketContext` 원천. */
  stockImplication: string;
  confidence: MarketAnalysisConfidence;
  /** 데이터 제한·합성 한계·degrade 경고(스냅샷 warnings 승계 + 분석 단계 경고). */
  warnings: string[];
};

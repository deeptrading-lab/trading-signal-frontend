/**
 * AI 분석 결과 카드 목록 타입 — `/api/stock/ai-analysis/decisions` 응답.
 *
 * 종목당 최신 결론 1건(ai_analysis_decisions upsert)에, 그 종목의 최신 실행(run)에 들어간
 * 토큰/비용 합계(ai_agent_usage 집계)를 붙인 형태. 결론 전체(decision·sentiment)를 포함하므로
 * 카드 클릭 시 상세는 추가 페치 없이 즉시 렌더한다.
 */

import type { AIAnalysisDecisionSnapshot } from "@/lib/types/stock/aiAnalysis";
import type { AnalysisJobSource } from "@/lib/types/stock/analysisQueue";

/**
 * 진행중 작업 표시(unified-analysis-jobs) — queue active 행을 카드용으로 압축.
 * pending(대기)·processing(분석 중) + 출처(prod/local/bot).
 */
export interface AnalysisInflight {
  status: "pending" | "processing";
  source: AnalysisJobSource;
}

/**
 * 카드별 토큰 합계 — 해당 종목의 최신 run_id 행들 합산.
 * codex 등 미측정 실행은 measured=false + 토큰/비용 null.
 */
export interface AIDecisionTokens {
  runId: string;
  /** 입력 토큰 합(신규 + 캐시 읽기 + 캐시 생성). measured=false 면 null. */
  totalInputTokens: number | null;
  /** 출력 토큰 합. measured=false 면 null. */
  totalOutputTokens: number | null;
  /** 비용(USD) 합. measured=false 면 null. */
  totalCostUsd: number | null;
  /** run 의 모든 에이전트 행이 측정됐는지. false 면 토큰/비용을 "측정 안 됨"으로 표기. */
  measured: boolean;
}

/** 결론 스냅샷 + 토큰 합계(없으면 null) + (재분석 진행중이면) 인플라이트 표시. */
export interface AIDecisionListItem extends AIAnalysisDecisionSnapshot {
  tokens: AIDecisionTokens | null;
  /** 이 종목을 지금 재분석 중이면 표시(완료 결과는 그대로 유지). 없으면 null. */
  reanalysis?: AnalysisInflight | null;
}

/**
 * 완료 결과가 아직 없는 진행중 종목(첫 분석) — /analyze 플레이스홀더 카드.
 * decisions snapshot 이 없으므로(verdict 미존재) 결과 카드와 분리해 별도 렌더한다.
 */
export interface AIInflightItem {
  ticker: string;
  status: "pending" | "processing";
  source: AnalysisJobSource;
  /** 요청/시작 시각(최신순 정렬용). */
  createdAt: string;
}

export interface AIDecisionListResponse {
  /** Supabase 연결 여부 — false 면 빈 목록 + 안내 표면. */
  configured: boolean;
  items: AIDecisionListItem[];
  /** 완료 결과 없이 진행중인 종목(첫 분석 플레이스홀더). 없으면 빈 배열. */
  inflight: AIInflightItem[];
  generatedAt: string;
}

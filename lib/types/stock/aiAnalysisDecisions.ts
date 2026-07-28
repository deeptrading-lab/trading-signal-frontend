/**
 * AI 분석 결과 카드 목록 타입 — `/api/stock/ai-analysis/decisions` 응답.
 *
 * 종목당 최신 결론 1건(ai_analysis_decisions upsert)에, 그 종목의 최신 실행(run)에 들어간
 * 토큰/비용 합계(ai_agent_usage DB 내부 집계)를 붙인 카드 전용 요약이다.
 * 상세 결론은 카드 선택 시 기존 단건 API(`/decision?ticker=...`)로 지연 조회한다.
 */

import type {
  AIAnalysisProvider,
  DecisionSignal,
  FinalDecision,
} from "@/lib/types/stock/aiAnalysis";
import type { AnalysisJobSource } from "@/lib/types/stock/analysisQueue";
import type { ThesisBreach } from "@/lib/stock/thesisBreach";

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

/** 목록 카드가 실제로 쓰는 최소 결론 필드. reasoning·전략·감성은 상세 조회에서만 받는다. */
export type AIDecisionCardDecision = Pick<
  FinalDecision,
  "verdict" | "time_horizon" | "limitedData" | "bars"
>;

/** 목록 카드가 실제로 쓰는 최소 시그널 필드. */
export type AIDecisionCardSignal = Pick<DecisionSignal, "score">;

/** 카드 전용 요약 + 토큰 합계(없으면 null) + (재분석 진행중이면) 인플라이트 표시. */
export interface AIDecisionListItem {
  ticker: string;
  name: string | null;
  provider: AIAnalysisProvider;
  decision: AIDecisionCardDecision;
  signal: AIDecisionCardSignal | null;
  updatedAt: string;
  tokens: AIDecisionTokens | null;
  /** 이 종목을 지금 재분석 중이면 표시(완료 결과는 그대로 유지). 없으면 null. */
  reanalysis?: AnalysisInflight | null;
  /**
   * 현재가가 테제 무효화/손절 라인을 넘었으면 표시 — 목록에서 "깨진 판정"을 한눈에 보기 위함.
   * 라이브 시세 조회 실패·legacy(base_price 없음)·미돌파면 null(배지 없음, fail-soft).
   */
  thesisBreach?: ThesisBreach | null;
}

/**
 * 완료 결과가 아직 없는 진행중 종목(첫 분석) — /analyze 플레이스홀더 카드.
 * decisions snapshot 이 없으므로(verdict 미존재) 결과 카드와 분리해 별도 렌더한다.
 */
export interface AIInflightItem {
  ticker: string;
  /** 분석 시점 종목명(decision-stock-name). 큐에 기록됐으면 채워짐 — 없으면 null → 읽기 시 KIS 폴백. */
  name: string | null;
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

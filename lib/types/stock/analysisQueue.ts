/**
 * prod 분석 요청 큐(ai_analysis_queue) 공유 타입 — BFF·워커·테스트 공용.
 *
 * PRD analysis-request-queue §3-3. 큐 store(`lib/server/ai/queueStore.ts`)와
 * enqueue/worker-status BFF, 로컬 워커(`scripts/analysisWorker.ts`)가 함께 참조한다.
 */

/** 큐 row 상태 머신. pending→processing→(done|failed). recoverStuck 시 processing→pending 복구. */
export type AnalysisQueueStatus = "pending" | "processing" | "done" | "failed";

/** Supabase ai_analysis_queue row 를 camelCase 로 변환한 조회 결과. */
export interface AnalysisQueueRow {
  id: number;
  ticker: string;
  status: AnalysisQueueStatus;
  force: boolean;
  workerId: string | null;
  error: string | null;
  requestedBy: string | null;
  createdAt: string;
  claimedAt: string | null;
  finishedAt: string | null;
}

/** enqueueAnalysis 결과 — INSERT 했으면 queued, 이미 활성이면 already(중복 가드). */
export type EnqueueResult =
  | { status: "queued"; id: number | null }
  | { status: "already"; id: number | null }
  | { status: "not_configured" }
  | { status: "error"; error: string };

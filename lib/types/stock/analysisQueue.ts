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

// ── 클라이언트(prod 카드)가 BFF 에서 받는 HTTP 응답 타입 ──────────────────────
// 위 store 내부 타입과 달리, 브라우저가 enqueue route handler 응답을 그대로 받는 형태.
// prod 큐 UX(상태 카드)가 소비한다. (PRD §3-1)

/**
 * `POST /api/stock/ai-analysis/enqueue` 성공 응답.
 * - queued: 새 pending 적재 / already: 같은 ticker 가 이미 활성(중복 가드).
 * - workerOffline: 로컬 워커 하트비트 부재 → "지금 분석 서버가 꺼져 있어요" 경고(S5)용.
 */
export interface EnqueueAnalysisResponse {
  status: "queued" | "already";
  id: number | null;
  workerOffline: boolean;
}

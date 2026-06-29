/**
 * prod 분석 요청 큐 BFF 클라이언트 — enqueue.
 *
 * 브라우저는 Supabase·KV 를 직접 만지지 않고 route handler(`/api/stock/ai-analysis/enqueue`)만
 * 호출한다. 공용 axios 인스턴스(`httpClient`, baseURL `/api`) 경유. (PRD §3-1)
 *
 * 실제 분석 SSE 스트림(`aiAnalysis.ts fetchAIAnalysisStream`)과 별개 — prod 큐 카드 전용.
 *
 * - `enqueueAIAnalysis` : 분석 요청 적재(S2~S6). 응답의 `workerOffline` 으로 오프라인 1차 판정(S5).
 * - `fetchWorkerStatus` : 워커 온라인/처리 상태 폴링(S7 처리 중 뱃지). `WorkerActivityBadge` 가 소비.
 */

import { httpClient } from "@/lib/api/client";
import type {
  EnqueueAnalysisResponse,
  WorkerStatusResponse,
} from "@/lib/types/stock/analysisQueue";

/**
 * prod 분석 요청 적재. 성공 시 queued|already + workerOffline 플래그.
 * 400/503/500 은 axios 인터셉터가 ApiError 로 reject → 호출 측 도메인 훅이 실패 카피로 처리.
 */
export async function enqueueAIAnalysis(
  ticker: string,
  force?: boolean,
  signal?: AbortSignal,
): Promise<EnqueueAnalysisResponse> {
  const res = await httpClient.post<EnqueueAnalysisResponse>(
    "/stock/ai-analysis/enqueue",
    { ticker, force },
    { signal },
  );
  return res.data;
}

/**
 * 로컬 분석 워커 상태 조회(S7). 하트비트 부재면 `{ online:false }`, 신선하면 상태·큐 깊이 동반.
 * 폴링으로 호출되며, 실패(네트워크/미설정)는 호출 측 query 훅이 흡수해 뱃지를 숨긴다(fail-soft).
 */
export async function fetchWorkerStatus(
  signal?: AbortSignal,
): Promise<WorkerStatusResponse> {
  const res = await httpClient.get<WorkerStatusResponse>(
    "/stock/ai-analysis/worker-status",
    { signal },
  );
  return res.data;
}

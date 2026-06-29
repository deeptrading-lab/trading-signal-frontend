/**
 * prod 분석 요청 큐 BFF 클라이언트 — enqueue.
 *
 * 브라우저는 Supabase·KV 를 직접 만지지 않고 route handler(`/api/stock/ai-analysis/enqueue`)만
 * 호출한다. 공용 axios 인스턴스(`httpClient`, baseURL `/api`) 경유. (PRD §3-1)
 *
 * 실제 분석 SSE 스트림(`aiAnalysis.ts fetchAIAnalysisStream`)과 별개 — prod 큐 카드 전용.
 *
 * v1 은 워커 온라인 여부를 enqueue 응답의 `workerOffline` 으로만 판정한다(S5). worker-status GET
 * 폴링(S7 처리 중 뱃지)은 후속 — 백엔드 route handler 는 이미 있으니 그때 클라이언트 훅만 더한다.
 */

import { httpClient } from "@/lib/api/client";
import type { EnqueueAnalysisResponse } from "@/lib/types/stock/analysisQueue";

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

/**
 * 로컬 AI CLI(claude·codex) 가용성 조회 — 단타 AI 판단이 쓴다.
 * (옛 AI 종합분석 SSE·저장 결론 조회는 그 파이프라인과 함께 삭제 — swing-judgment PR-5.)
 */

import { httpClient } from "@/lib/api/client";
import type { AIProviderAvailability } from "@/lib/types/stock/aiAnalysis";

/** 단순 GET 이라 공용 axios 인스턴스(`httpClient`, baseURL `/api`)를 사용한다. */
export async function fetchAIProviderAvailability(
  signal?: AbortSignal,
): Promise<AIProviderAvailability> {
  const res = await httpClient.get<AIProviderAvailability>(
    "/stock/ai-analysis/providers",
    { signal },
  );
  return res.data;
}

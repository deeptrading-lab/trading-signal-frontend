/**
 * AI 최종 판단 클라이언트 — `/api/stock/ai-signal` BFF 호출.
 */

import { httpClient } from "@/lib/api/client";
import type { AISignalRequest, AISignalResponse } from "@/lib/types/stock/aiSignal";

export async function fetchAISignal(req: AISignalRequest): Promise<AISignalResponse> {
  const res = await httpClient.post<AISignalResponse>("/stock/ai-signal", req);
  return res.data;
}

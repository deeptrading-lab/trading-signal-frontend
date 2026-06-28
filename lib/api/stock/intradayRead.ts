/**
 * `/api/stock/intraday-read` 클라이언트 — 브라우저 → BFF route handler 단방향.
 *
 * 장중 단타 판단(참고) on-demand 생성. 로컬 CLI(구독) 기반이라 분봉 페치 + 2-에이전트로 ~수십 초 →
 * 넉넉한 per-request timeout. hooks/stock/useMutationIntradayRead 안에서만 호출.
 */

import { httpClient } from "@/lib/api/client";
import type { AIAnalysisProvider } from "@/lib/types/stock/aiAnalysis";
import type { IntradayReadResponse } from "@/lib/types/intraday/intradayDecision";

const READ_TIMEOUT_MS = 120_000;

export async function fetchIntradayRead(
  ticker: string,
  provider: AIAnalysisProvider,
  signal?: AbortSignal,
): Promise<IntradayReadResponse> {
  const response = await httpClient.post<IntradayReadResponse>(
    "/stock/intraday-read",
    { ticker, provider },
    { signal, timeout: READ_TIMEOUT_MS },
  );
  return response.data;
}

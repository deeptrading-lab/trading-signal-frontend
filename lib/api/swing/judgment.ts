/**
 * Swing 도메인 어댑터 — 종목 스윙 체크 상세 조회.
 *
 * 브라우저 → 본 어댑터 → BFF `/api/swing/judgment/[ticker]` → (KIS·DART 로 즉시 계산 + KV 캐시).
 * BFF 의 한글 오류 문구는 axios 인터셉터가 `ApiError.message` 로 그대로 넘긴다.
 */

import { httpClient } from "@/lib/api/client";
import type { SwingJudgmentResponse } from "@/lib/types/swing/api";

export async function fetchSwingJudgment(ticker: string): Promise<SwingJudgmentResponse> {
  const response = await httpClient.get<SwingJudgmentResponse>(`/swing/judgment/${encodeURIComponent(ticker)}`);
  return response.data;
}

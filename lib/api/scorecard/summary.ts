/**
 * Scorecard 도메인 어댑터 — 적중률 집계 조회.
 *
 * 브라우저 → 본 어댑터(httpClient, same-origin `/api`) → BFF `/api/scorecard/summary`
 * → Supabase(signal_scorecard) 단방향(읽기 전용).
 */

import { httpClient } from "@/lib/api/client";
import type { ScorecardSummaryResponse } from "@/lib/types/scorecard/scorecard";

export async function fetchScorecardSummary(): Promise<ScorecardSummaryResponse> {
  const response = await httpClient.get<ScorecardSummaryResponse>("/scorecard/summary");
  return response.data;
}

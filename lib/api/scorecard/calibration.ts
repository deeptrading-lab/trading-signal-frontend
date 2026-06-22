/**
 * Scorecard 도메인 어댑터 — confidence 버킷별 실측 보정값 조회.
 *
 * 브라우저 → 본 어댑터(httpClient, same-origin `/api`) → BFF `/api/scorecard/calibration`
 * → Supabase(signal_scorecard) 단방향(읽기 전용). PRD `scorecard-feedback` §(가).
 */

import { httpClient } from "@/lib/api/client";
import type { ScorecardCalibrationResponse } from "@/lib/types/scorecard/scorecard";

export async function fetchScorecardCalibration(): Promise<ScorecardCalibrationResponse> {
  const response = await httpClient.get<ScorecardCalibrationResponse>("/scorecard/calibration");
  return response.data;
}

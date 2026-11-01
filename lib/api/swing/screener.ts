/**
 * Swing 도메인 어댑터 — 스윙 체크 스크리너 목록 조회.
 *
 * 브라우저 → 본 어댑터(httpClient, same-origin `/api`) → BFF `/api/swing/screener` → Supabase(swing_judgments).
 */

import { httpClient } from "@/lib/api/client";
import type { SwingScreenerFilter, SwingScreenerResponse } from "@/lib/types/swing/api";

export async function fetchSwingScreener(
  filter: SwingScreenerFilter,
  market: "KOSPI" | "KOSDAQ" | null,
): Promise<SwingScreenerResponse> {
  const response = await httpClient.get<SwingScreenerResponse>("/swing/screener", {
    params: { filter, ...(market ? { market } : {}) },
  });
  return response.data;
}

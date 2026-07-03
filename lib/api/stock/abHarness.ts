/**
 * Stock 도메인 어댑터 — A/B 토큰 최적화 리포트 조회.
 *
 * 브라우저 → httpClient(same-origin `/api`) → BFF `/api/ab-harness/report`
 * → Supabase(ab_run_config + ai_agent_usage + signal_scorecard) 단방향.
 */

import { httpClient } from "@/lib/api/client";
import type { AbComparison } from "@/lib/types/stock/abHarness";

export type { AbComparison } from "@/lib/types/stock/abHarness";

export async function fetchAbHarnessReport(session: string): Promise<AbComparison> {
  const response = await httpClient.get<AbComparison>("/ab-harness/report", {
    params: { session },
  });
  return response.data;
}

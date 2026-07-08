/**
 * 틱 자가채점 라벨 BFF 클라이언트 — intraday-decision-overhaul PR-2.
 * 브라우저는 Supabase/KIS 를 직접 부르지 않고 `/api/intraday/labels/*` BFF 만 경유한다.
 */

import { httpClient } from "@/lib/api/client";
import type {
  IntradayTickLabelSummaryResponse,
  RunIntradayTickLabelsRequest,
  RunIntradayTickLabelsResponse,
} from "@/lib/types/intraday/tickLabels";

export async function fetchIntradayTickLabelSummary(): Promise<IntradayTickLabelSummaryResponse> {
  const response = await httpClient.get<IntradayTickLabelSummaryResponse>(
    "/intraday/labels/summary",
  );
  return response.data;
}

export async function runIntradayTickLabels(
  payload: RunIntradayTickLabelsRequest = {},
): Promise<RunIntradayTickLabelsResponse> {
  const response = await httpClient.post<RunIntradayTickLabelsResponse>(
    "/intraday/labels/run",
    payload,
    // 세션당 분봉 페치가 KIS 역방향 페이징(하루 ~13콜 × 150ms 지연)이라 공용 30초를 넘길 수 있다.
    { timeout: 120_000 },
  );
  return response.data;
}

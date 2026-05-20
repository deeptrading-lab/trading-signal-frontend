/**
 * Workbench 분석 클라이언트.
 *
 * Next.js route handler `/api/workbench/analyze` 를 거쳐 FastAPI 와 통신한다.
 */

import { httpClient } from "@/lib/api/client";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
} from "@/lib/types/workbench/analyze";

/**
 * 분석 요청을 전송하고 BE 응답을 그대로 돌려준다.
 *
 * 응답 구조는 `{ analysis: { brief, feasibility, horizons, risk_plan, action, warnings, ... } }`.
 */
export async function analyzeWorkbench(
  payload: AnalyzeRequest,
): Promise<AnalyzeResponse> {
  const response = await httpClient.post<AnalyzeResponse>(
    "/workbench/analyze",
    payload,
  );
  return response.data;
}

/**
 * `/api/auth/me` 클라이언트 어댑터 — 현재 세션 role 조회(표시용).
 *
 * PRD `market-status-aware-home` §3-5. axios 인스턴스(same-origin `/api`) 경유. `hooks/query/useQueryAuthMe`
 * 안에서만 호출한다. 라우트가 항상 200(미인증도 `role: null`)이라 401 리다이렉트 인터셉터를 건드리지 않는다.
 */

import { httpClient } from "@/lib/api/client";
import type { AuthMeResponse } from "@/lib/types/auth/me";

export async function getAuthMe(): Promise<AuthMeResponse> {
  const response = await httpClient.get<AuthMeResponse>("/auth/me");
  return response.data;
}

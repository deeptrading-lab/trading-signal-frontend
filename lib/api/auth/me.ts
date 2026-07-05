/**
 * 현재 세션 신원 조회 BFF 클라이언트 — `GET /api/auth/me`.
 *
 * 공용 axios(`httpClient`, baseURL `/api`) 경유. role-aware UI(관리자 전용 표시 등)가
 * 도메인 훅(`hooks/auth/useMe`)을 통해 소비한다. (user-login-auth Phase 2)
 */

import { httpClient } from "@/lib/api/client";
import type { ProfileRole } from "@/lib/types/auth/profile";

/** `GET /api/auth/me` 응답 — 비밀번호(v=1) 세션은 role/email null. */
export interface MeResponse {
  authenticated: boolean;
  role: ProfileRole | null;
  email: string | null;
}

export async function fetchMe(signal?: AbortSignal): Promise<MeResponse> {
  const res = await httpClient.get<MeResponse>("/auth/me", { signal });
  return res.data;
}

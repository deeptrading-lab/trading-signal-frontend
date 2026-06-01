/**
 * 로그아웃 API 어댑터 — `POST /api/auth/logout` 호출.
 *
 * PRD `app-password-gate` §3.3 / AC-7:
 *   - same-origin axios(`baseURL: /api`) 경유. 서버가 세션 쿠키를 `Max-Age=0` 으로 삭제.
 *   - 성공 응답 본문은 `{ ok: true }`. 이후 보호 경로 접근 시 proxy 게이트가 다시 `/login` 으로 보낸다.
 */

import { httpClient } from "@/lib/api/client";

export type LogoutResponse = { ok: true };

/** 세션 쿠키를 삭제한다(서버가 Set-Cookie Max-Age=0). 실패 시 `ApiError` throw. */
export async function logout(): Promise<LogoutResponse> {
  const response = await httpClient.post<LogoutResponse>("/auth/logout");
  return response.data;
}

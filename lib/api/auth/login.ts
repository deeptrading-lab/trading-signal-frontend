/**
 * 로그인 API 어댑터 — `POST /api/auth/login` 호출.
 *
 * PRD `app-password-gate` §3.4:
 *   - same-origin axios(`baseURL: /api`) 경유. 비밀번호는 body 로만 전송(쿼리·로그 0).
 *   - 성공 시 서버가 `Set-Cookie` 로 세션 쿠키를 발급(브라우저가 자동 저장).
 *   - 실패(401 invalid_password 등)는 axios 가 reject → 호출 측(도메인 훅)이 분류.
 */

import { httpClient } from "@/lib/api/client";

export type LoginResponse = { ok: true };

/**
 * 공유 비밀번호로 로그인한다. 성공 시 세션 쿠키가 발급된다(응답 본문은 `{ ok: true }`).
 * 실패 시 `lib/api/client` 인터셉터가 매핑한 `ApiError` 가 throw 된다.
 */
export async function login(password: string): Promise<LoginResponse> {
  const response = await httpClient.post<LoginResponse>("/auth/login", {
    password,
  });
  return response.data;
}

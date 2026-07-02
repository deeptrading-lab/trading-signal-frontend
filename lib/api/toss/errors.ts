/**
 * 토스증권 응답 에러를 통합 `ApiError` 골격으로 매핑 — `lib/api/kis/errors.ts` 와 대칭.
 *
 * 토스는 KIS(`rt_cd`)와 달리 HTTP status 로 성패가 갈리고, 에러 본문이
 * `{ error: { requestId, code, message } }` 형식이다. `message` 가 한글이라 그대로 통과시키고
 * `code`/`requestId` 는 detail 에 보존한다(CS 문의 시 requestId 첨부 권장 — 공식 문서).
 */

import { makeApiError, type ApiError } from "@/lib/api/errors";
import type { TossErrorBody } from "./types";

const TOSS_SERVER_FALLBACK = "토스증권 서버 일시 오류. 잠시 후 다시 시도해주세요.";

/** HTTP 4xx(비즈니스) 에러 본문 → ApiError. 한글 message 통과, code/requestId 보존. */
export function makeTossBusinessError(
  status: number,
  body: TossErrorBody | undefined,
): ApiError {
  const err = body?.error;
  return makeApiError("server", {
    status,
    message: err?.message?.trim() ? err.message : TOSS_SERVER_FALLBACK,
    detail: err?.code
      ? { code: err.code, requestId: err.requestId }
      : undefined,
  });
}

/** HTTP 5xx / 네트워크 / 타임아웃 → ApiError. */
export function makeTossTransportError(options?: {
  status?: number;
  message?: string;
  detail?: unknown;
}): ApiError {
  const kind = options?.status && options.status >= 500 ? "server" : "network";
  return makeApiError(kind, {
    status: options?.status,
    message: options?.message ?? TOSS_SERVER_FALLBACK,
    detail: options?.detail,
  });
}

/** 토큰 발급 실패(`POST /oauth2/token`) → ApiError. */
export function makeTossTokenError(options?: {
  status?: number;
  message?: string;
  detail?: unknown;
}): ApiError {
  return makeApiError("server", {
    status: options?.status,
    message:
      options?.message ??
      "토스증권 토큰 발급에 실패했어요. 환경변수 (TOSS_CLIENT_ID/TOSS_CLIENT_SECRET) 를 확인해 주세요.",
    detail: options?.detail,
  });
}

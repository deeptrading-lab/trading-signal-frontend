/**
 * KIS 응답 에러를 통합 `ApiError` 골격으로 매핑.
 *
 * PRD `stock-api-integration` §3.1, §6.4 — KIS `rt_cd != "0"` 일 때 `msg1` (한글) 을 그대로 통과.
 * HTTP 4xx 도 통과. 5xx 는 한글 fallback ("KIS 서버 일시 오류. 잠시 후 다시 시도해주세요.").
 *
 * `lib/api/errors.ts` 의 `ApiError` / `ApiErrorKind` 골격을 재사용하되, KIS 특화 메시지·상세 정보를 detail 에 보존.
 */

import { makeApiError, type ApiError } from "@/lib/api/errors";

const KIS_SERVER_FALLBACK = "KIS 서버 일시 오류. 잠시 후 다시 시도해주세요.";

/**
 * KIS REST 응답 envelope (`{ rt_cd, msg_cd, msg1, output }`) 의 `rt_cd != "0"` 케이스를 ApiError 로 변환.
 *
 * 한글 메시지를 그대로 노출 — KIS 가 사용자 친화 한글을 제공하므로 fallback 사용 X.
 */
export function makeKisBusinessError(
  msg1: string | undefined,
  msgCd: string | undefined,
): ApiError {
  return makeApiError("server", {
    status: 200, // HTTP 자체는 200 인데 KIS rt_cd 가 에러인 케이스.
    message: msg1?.trim() ? msg1 : KIS_SERVER_FALLBACK,
    detail: msgCd ? { msg_cd: msgCd } : undefined,
  });
}

/**
 * KIS 호출의 HTTP 5xx / 네트워크 / 토큰 발급 실패를 ApiError 로 변환.
 */
export function makeKisTransportError(options?: {
  status?: number;
  message?: string;
  detail?: unknown;
}): ApiError {
  const kind = options?.status && options.status >= 500 ? "server" : "network";
  return makeApiError(kind, {
    status: options?.status,
    message: options?.message ?? KIS_SERVER_FALLBACK,
    detail: options?.detail,
  });
}

/**
 * KIS 토큰 발급 실패 (`POST /oauth2/tokenP`) 를 ApiError 로 변환.
 *
 * 발급 응답 은 envelope 가 아니라 `{ error_code, error_description }` 형식.
 */
export function makeKisTokenError(options?: {
  errorCode?: string;
  errorDescription?: string;
  status?: number;
}): ApiError {
  return makeApiError("server", {
    status: options?.status,
    message: options?.errorDescription ?? "KIS 토큰 발급에 실패했어요. 환경변수 (KIS_APP_KEY/KIS_APP_SECRET) 를 확인해 주세요.",
    detail: options?.errorCode ? { error_code: options.errorCode } : undefined,
  });
}

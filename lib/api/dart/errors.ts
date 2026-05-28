/**
 * OpenDART 응답 에러를 통합 `ApiError` 골격으로 매핑.
 *
 * PRD `stock-api-integration` §3.2 — DART 응답의 `status != "000"` 일 때 `message` (한글) 통과.
 * HTTP 5xx 는 한글 fallback ("OpenDART 서버 일시 오류. 잠시 후 다시 시도해주세요.").
 */

import { makeApiError, type ApiError } from "@/lib/api/errors";

const DART_SERVER_FALLBACK = "OpenDART 서버 일시 오류. 잠시 후 다시 시도해주세요.";

/**
 * DART status 코드 → "조회 데이터 없음" 여부.
 *
 * "013" 은 정식 에러보다는 빈 결과에 가까움. BFF 가 별도 처리 가능.
 */
export function isDartEmptyStatus(status: string): boolean {
  return status === "013";
}

/**
 * DART status 코드 → "사용한도 초과" 여부.
 *
 * "020" 도달 시 BFF route 가 mock fallback + X-Data-Source: mock-quota-exceeded.
 */
export function isDartQuotaExceededStatus(status: string): boolean {
  return status === "020";
}

/**
 * DART 비즈니스 에러 (status != "000") 를 ApiError 로 변환.
 */
export function makeDartBusinessError(
  status: string,
  message: string | undefined,
): ApiError {
  return makeApiError("server", {
    status: 200, // HTTP 자체는 200, DART status 가 비정상.
    message: message?.trim() ? message : DART_SERVER_FALLBACK,
    detail: { dart_status: status },
  });
}

/**
 * DART 호출의 HTTP 5xx / 네트워크 / 토큰 오류를 ApiError 로 변환.
 */
export function makeDartTransportError(options?: {
  status?: number;
  message?: string;
  detail?: unknown;
}): ApiError {
  const kind = options?.status && options.status >= 500 ? "server" : "network";
  return makeApiError(kind, {
    status: options?.status,
    message: options?.message ?? DART_SERVER_FALLBACK,
    detail: options?.detail,
  });
}

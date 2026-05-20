/**
 * 통합 API 에러 골격.
 *
 * PRD §9 OPEN QUESTION 3 — PM 권고에 따라 본 PRD 는 `kind` enum 골격만 정의하고,
 * 사용자 노출 메시지의 한글 톤·UX 카피는 후속 PRD `workbench-analyze-rebuild` 가 결정한다.
 *
 * - validation       : BE 422 (Pydantic 검증 실패) 또는 FE 사전 검증 실패
 * - whitelist_miss   : BE 400 "화이트리스트에 없습니다"
 * - network          : 네트워크 단절·타임아웃 (axios `ECONNABORTED`, no-response)
 * - server           : 그 외 5xx, 또는 알 수 없는 4xx
 */

export type ApiErrorKind =
  | "validation"
  | "whitelist_miss"
  | "network"
  | "server";

export type ApiError = {
  kind: ApiErrorKind;
  /** 사용자 노출 가능한 한글 메시지 (후속 PRD 가 톤 정정). */
  message: string;
  /** 원본 HTTP status. 네트워크 단절 시 undefined. */
  status?: number;
  /** BE 가 돌려준 원본 detail (구조화된 422 등). 필요 시 narrowing 해서 사용. */
  detail?: unknown;
};

export function isApiError(value: unknown): value is ApiError {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { kind?: unknown; message?: unknown };
  return (
    typeof candidate.kind === "string" &&
    typeof candidate.message === "string"
  );
}

const FALLBACK_MESSAGES: Record<ApiErrorKind, string> = {
  validation: "입력 값이 올바르지 않아요. 다시 확인해 주세요.",
  whitelist_miss: "지원 종목이 아니에요. AAPL 또는 BTC-USD 중 선택해 주세요.",
  network: "엔진 통신에 실패했어요. 잠시 후 다시 시도해 주세요.",
  server: "엔진 응답 처리에 실패했어요. 잠시 후 다시 시도해 주세요.",
};

export function makeApiError(
  kind: ApiErrorKind,
  options?: { message?: string; status?: number; detail?: unknown },
): ApiError {
  return {
    kind,
    message: options?.message ?? FALLBACK_MESSAGES[kind],
    status: options?.status,
    detail: options?.detail,
  };
}

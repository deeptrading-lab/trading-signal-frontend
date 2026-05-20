/**
 * ApiError.kind → 한글 카피.
 *
 * BE 가 한글 detail 을 내려주면 그대로 사용하고, 영문/공백/숫자 디테일이면 fallback 사용.
 * DESIGN.md "에러·실패 영역" 톤 (사용자 잘못 아닌 "지원 종목"/"엔진 일시적 문제" 프레이밍).
 */

import type { ApiError } from "@/lib/api/errors";

const KOREAN_HANGUL_RE = /[가-힣]/;

const FALLBACK: Record<ApiError["kind"], string> = {
  validation: "입력 값을 다시 확인해 주세요.",
  whitelist_miss:
    "지원 종목이 아니에요. 현재는 AAPL 또는 BTC-USD 만 분석할 수 있어요.",
  network: "엔진에 일시적인 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
  server: "엔진에 일시적인 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
};

export function getErrorMessage(error: ApiError): string {
  const raw = error.message?.trim() ?? "";
  if (raw !== "" && KOREAN_HANGUL_RE.test(raw)) {
    return raw;
  }
  return FALLBACK[error.kind] ?? FALLBACK.server;
}

export function isRetryable(error: ApiError): boolean {
  return error.kind === "network" || error.kind === "server";
}

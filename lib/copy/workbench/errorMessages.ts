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
  // 게이트 401 — axios 인터셉터가 `/login` 으로 유도(PRD app-password-gate §3.6).
  // 리다이렉트 직전 잠깐 노출될 수 있는 폴백.
  unauthorized: "로그인이 필요해요. 로그인 화면으로 이동할게요.",
  network: "엔진에 일시적인 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
  server: "엔진에 일시적인 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
};

/**
 * claude CLI 모드 (PRD claude-cli-analysis) 관련 한글 카피 카탈로그.
 * 실제로는 BFF adapter (`app/api/workbench/_adapters/claudeCli.ts`) 가 한글 메시지를 직접
 * `{ error: "..." }` body 로 내려주므로 axios interceptor 의 `extractMessage` 가 본문을 그대로 사용한다.
 * 본 상수는 카피 일관성 검증용 reference. UI 컴포넌트는 수정하지 않는다.
 *
 * v6 (polish-followups §3.3 A3) 확장 — 6블록 누락 케이스 메시지 분리.
 * 누락된 블록이 어디인지 사용자가 식별할 수 있도록 블록별 메시지를 별도 키로 둔다.
 * normalize 단계에서 첫 누락 블록을 감지하면 해당 키 메시지를 그대로 `{ error }` body 로 흘려보낸다.
 */
export const CLAUDE_CLI_FALLBACKS = {
  cli_missing: "claude CLI 가 설치되어 있지 않거나 경로가 올바르지 않아요.",
  cli_error: "분석 도구 호출에 실패했어요. 잠시 후 다시 시도해 주세요.",
  cli_timeout: "분석이 너무 오래 걸려요. 잠시 후 다시 시도해 주세요.",
  cli_malformed: "분석 결과 형식이 올바르지 않아요. 잠시 후 다시 시도해 주세요.",
  cli_unsupported:
    "Vercel 환경에서는 claude CLI 모드를 사용할 수 없습니다. 로컬 환경에서 실행해 주세요.",
  // v6 — 6블록 누락 케이스. 한 PR 안에서 다시 분석 누름으로 회복 유도.
  missing_action:
    "분석 결과의 권고 액션 항목이 비어 있어요. 잠시 후 다시 시도해 주세요.",
  missing_brief:
    "분석 결과의 요약(근거) 항목이 비어 있어요. 잠시 후 다시 시도해 주세요.",
  missing_feasibility:
    "분석 결과의 실현 가능성 항목이 비어 있어요. 잠시 후 다시 시도해 주세요.",
  missing_horizons:
    "분석 결과의 기간별 시나리오 항목이 비어 있어요. 잠시 후 다시 시도해 주세요.",
  missing_risk_plan:
    "분석 결과의 리스크 계획 항목이 비어 있어요. 잠시 후 다시 시도해 주세요.",
  missing_warnings:
    "분석 결과의 경고 항목이 비어 있어요. 잠시 후 다시 시도해 주세요.",
  // v6 — position nested shape narrowing 실패. 정상 nested shape 가 아닐 때.
  malformed_position:
    "분석 결과의 포지션 정보 형식이 올바르지 않아요. 잠시 후 다시 시도해 주세요.",
} as const;

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

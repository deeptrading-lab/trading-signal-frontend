/**
 * 분석 요청 입력의 사전 차단 (순수 함수).
 *
 * PRD AC-6:
 *  - capital_amount ≤ 0 또는 NaN
 *  - target_return_pct < 0 또는 NaN
 *  - target_period_days ≤ 0 또는 정수 아님
 *  - max_loss_pct ≤ 0 또는 > 5 또는 NaN
 *  - ticker 빈 문자열 또는 화이트리스트 외
 *
 * UI 바인딩은 후속 PRD `workbench-analyze-rebuild` 가 담당.
 * 화이트리스트 멤버십 체크는 BE 호출 없이 동기 검사가 가능하도록 인자로 받는다.
 */

import type { AnalyzeRequest } from "@/lib/types/workbench/analyze";
import type { WhitelistItem } from "@/lib/types/workbench/whitelist";

export type AnalyzeFieldKey =
  | "ticker"
  | "capital_amount"
  | "target_return_pct"
  | "target_period_days"
  | "max_loss_pct";

export type AnalyzeValidationErrors = Partial<Record<AnalyzeFieldKey, string>>;

export type AnalyzeValidationResult =
  | { ok: true; payload: AnalyzeRequest }
  | { ok: false; errors: AnalyzeValidationErrors };

/**
 * 검증을 위해 받아들이는 느슨한 입력 — 폼에서 빈 문자열·null 이 흘러올 수 있다.
 */
export type AnalyzeFormInput = {
  ticker?: string | null;
  capital_amount?: number | string | null;
  target_return_pct?: number | string | null;
  target_period_days?: number | string | null;
  max_loss_pct?: number | string | null;
  offline?: boolean;
};

const MESSAGES: Record<string, string> = {
  ticker_empty: "종목을 선택해 주세요.",
  ticker_not_whitelisted:
    "지원 종목이 아니에요. AAPL 또는 BTC-USD 중 선택해 주세요.",
  capital_invalid: "투자 가능 금액은 0보다 큰 숫자여야 해요.",
  target_return_invalid: "목표 수익률은 0 이상의 숫자여야 해요.",
  target_period_invalid: "목표 기간은 1 이상의 정수(일) 여야 해요.",
  max_loss_invalid: "최대 손실률은 0보다 크고 5 이하의 숫자여야 해요.",
};

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return Number.NaN;
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return parsed;
}

export function validateAnalyzePayload(
  input: AnalyzeFormInput,
  whitelist: WhitelistItem[],
): AnalyzeValidationResult {
  const errors: AnalyzeValidationErrors = {};

  // ticker
  const ticker = (input.ticker ?? "").trim();
  if (ticker === "") {
    errors.ticker = MESSAGES.ticker_empty;
  } else if (!whitelist.some((item) => item.ticker === ticker)) {
    errors.ticker = MESSAGES.ticker_not_whitelisted;
  }

  // capital_amount
  const capital = toNumber(input.capital_amount);
  if (!Number.isFinite(capital) || capital <= 0) {
    errors.capital_amount = MESSAGES.capital_invalid;
  }

  // target_return_pct
  const ret = toNumber(input.target_return_pct);
  if (!Number.isFinite(ret) || ret < 0) {
    errors.target_return_pct = MESSAGES.target_return_invalid;
  }

  // target_period_days (정수 + > 0)
  const period = toNumber(input.target_period_days);
  if (!Number.isFinite(period) || period <= 0 || !Number.isInteger(period)) {
    errors.target_period_days = MESSAGES.target_period_invalid;
  }

  // max_loss_pct (0 < x <= 5) — 입력 자체가 비어 있으면 BE 기본값(2.0) 사용을 허용한다.
  const hasMaxLoss =
    input.max_loss_pct !== undefined &&
    input.max_loss_pct !== null &&
    input.max_loss_pct !== "";
  let maxLoss: number | undefined;
  if (hasMaxLoss) {
    maxLoss = toNumber(input.max_loss_pct);
    if (!Number.isFinite(maxLoss) || maxLoss <= 0 || maxLoss > 5) {
      errors.max_loss_pct = MESSAGES.max_loss_invalid;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const payload: AnalyzeRequest = {
    ticker,
    capital_amount: capital,
    target_return_pct: ret,
    target_period_days: period,
    ...(maxLoss !== undefined ? { max_loss_pct: maxLoss } : {}),
    ...(input.offline !== undefined ? { offline: input.offline } : {}),
  };
  return { ok: true, payload };
}

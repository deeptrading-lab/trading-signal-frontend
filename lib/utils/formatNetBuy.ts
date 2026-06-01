/**
 * 수급(순매수) 표시 포맷터 — `investor-flow` 표면 A·B 공용.
 *
 * KIS 순매수 거래대금(`*_ntby_tr_pbmn`)은 **백만원** 단위(`lib/types/*` 모델 주석 참조).
 * 화면은 한국 투자자 관습대로 "억원"으로 환산해 보여준다(1억원 = 100백만원).
 * 음수(순매도)는 부호를 보존한다 — 색 결정은 부호로 한다(DESIGN.md 부호→색 규칙).
 *
 * - 환산: `백만원 / 100 = 억원`.
 * - 1억원 미만(절대값)은 소수 1자리, 이상은 정수(콤마)로 표기해 과밀을 줄인다.
 * - 단위 접미 "억원"을 붙여 반환한다(예: `+1,234억원`, `-56.7억원`, `0억원`).
 */

import { formatNumber } from "@/lib/utils/formatMoney";

/** 백만원 → "OO억원" 표기(부호 보존). */
export function formatNetBuyAmount(amountInMillionWon: number): string {
  if (!Number.isFinite(amountInMillionWon)) return "-";
  const eok = amountInMillionWon / 100;
  const digits = Math.abs(eok) >= 1 ? 0 : 1;
  const sign = eok > 0 ? "+" : "";
  return `${sign}${formatNumber(eok, { digits })}억원`;
}

/** 순매수 수량 → "N주" 표기(부호 보존, 천단위 콤마). */
export function formatNetBuyQty(qty: number): string {
  if (!Number.isFinite(qty)) return "-";
  const sign = qty > 0 ? "+" : "";
  return `${sign}${formatNumber(qty, { digits: 0 })}주`;
}

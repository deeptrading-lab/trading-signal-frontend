/**
 * Header 데스크탑 글로벌 마켓 티커 타입.
 *
 * PR6 fix (finsight-redesign) 신규. 시안 `Stock and Coin Analysis App/src/app/components/Header.tsx`
 * 의 KOSPI / NASDAQ / BTC 3 건 정합.
 *
 * `isUp` 은 한국식 등락 의미 — 상승 true → signal-up (red), 하락 false → signal-down (blue).
 * `value` 는 사전 포매팅된 표시용 문자열 (천단위 구분자 포함).
 */
export interface MarketTicker {
  /** 마켓 코드 — KOSPI / NASDAQ / BTC 등. */
  code: string;
  /** 표시용 값 (이미 포매팅 — 예: "2,750.23", "89,240,000"). */
  value: string;
  /** ± 변동률 (소수점, 부호 그대로 — 화면에서는 절댓값을 사용). */
  changePct: number;
  /** 한국식 등락 — true 상승 (red), false 하락 (blue). */
  isUp: boolean;
}

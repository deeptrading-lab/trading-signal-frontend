/**
 * Header 데스크탑 글로벌 마켓 티커 mock.
 *
 * PR6 fix (finsight-redesign) 신규. 시안 `Stock and Coin Analysis App/src/app/components/Header.tsx`
 * 의 3 건 (KOSPI 2,750.23 ▲1.2% / NASDAQ 16,400.12 ▲0.8% / BTC 89,240,000 ▼0.5%) 정합.
 *
 * `isUp` 은 한국식 등락 의미 — 상승 true (signal-up red), 하락 false (signal-down blue).
 * 실제 시세 API 연동은 본 PR 범위 밖 — UX 정합 위한 mock.
 */
import type { MarketTicker } from "@/lib/types/layout/marketTicker";

export const HEADER_MARKET_TICKERS: MarketTicker[] = [
  { code: "KOSPI", value: "2,750.23", changePct: 1.2, isUp: true },
  { code: "NASDAQ", value: "16,400.12", changePct: 0.8, isUp: true },
  { code: "BTC", value: "89,240,000", changePct: -0.5, isUp: false },
];

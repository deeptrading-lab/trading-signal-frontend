/**
 * Header 데스크탑 글로벌 마켓 티커 mock.
 *
 * PRD `header-market-ticker` §3.6 — 3건 → **5건**(코스피·코스닥·S&P500·NASDAQ·BTC).
 * BFF(`/api/market/ticker`) 가 이중 게이트 미통과·전체 실패·타임아웃 시 graceful degrade 로 반환.
 *
 * `isUp` 은 한국식 등락 의미 — 상승 true (signal-up red), 하락 false (signal-down blue).
 * BTC 는 24h 등락 부호 기반(`krw_24h_change >= 0` → isUp). `value` 는 사전 포매팅된 표시 문자열.
 *
 * mock 안에 사용자 노출 한글 카피는 0건 — 마켓 코드·라벨 같은 식별자만 (frontend.md §3).
 */
import type { MarketTicker } from "@/lib/types/layout/marketTicker";

export const HEADER_MARKET_TICKERS: MarketTicker[] = [
  { code: "KOSPI", value: "2,750.23", changePct: 1.2, isUp: true },
  { code: "KOSDAQ", value: "862.14", changePct: 0.45, isUp: true },
  { code: "S&P 500", value: "7,580.06", changePct: 0.62, isUp: true },
  { code: "NASDAQ", value: "26,972.62", changePct: -0.34, isUp: false },
  { code: "BTC", value: "89,240,000", changePct: -0.5, isUp: false },
];

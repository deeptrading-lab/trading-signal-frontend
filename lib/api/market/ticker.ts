/**
 * Market 도메인 어댑터 — 헤더 글로벌 마켓 티커 5종 조회.
 *
 * PRD `header-market-ticker` §3.4 — same-origin `/api/market/ticker` 단일 호출.
 *
 * 인터페이스:
 *   `getMarketTicker(): Promise<MarketTicker[]>` — 항상 합성 5종(부분 성공 시 누락분 제외).
 *
 * 브라우저 → 본 어댑터(httpClient, same-origin `/api`) → BFF route →
 * KIS + CoinGecko 단방향. KIS/CoinGecko 직접 호출(`fetchIndexPrice`/`fetchOverseasIndex`/
 * `fetchBtcKrw`/client)은 본 어댑터에서 절대 import 하지 않는다(AC-4). 응답은 이미 `MarketTicker[]`
 * (BFF 가 표시 문자열·한국식 isUp 으로 합성 완료).
 */

import { httpClient } from "@/lib/api/client";
import type { MarketTicker } from "@/lib/types/layout/marketTicker";

export type { MarketTicker } from "@/lib/types/layout/marketTicker";

export async function getMarketTicker(): Promise<MarketTicker[]> {
  const response = await httpClient.get<MarketTicker[]>("/market/ticker");
  return response.data;
}

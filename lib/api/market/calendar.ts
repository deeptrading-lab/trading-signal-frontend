/**
 * Market 도메인 어댑터 — 국내 장 상태(캘린더) 조회.
 *
 * PRD `toss-market-calendar` §3-6 — same-origin `/api/market/calendar` 단일 호출.
 * 브라우저 → 본 어댑터(httpClient, `/api`) → BFF route → 토스 REST 단방향. 토스 클라이언트
 * (`tossGet`)·`marketClock` 서버 파생은 본 어댑터에서 import 하지 않는다(BFF 경계).
 */

import { httpClient } from "@/lib/api/client";
import type { MarketCalendarResponse } from "@/lib/types/market/marketStatus";

export async function getMarketCalendar(): Promise<MarketCalendarResponse> {
  const response = await httpClient.get<MarketCalendarResponse>("/market/calendar");
  return response.data;
}

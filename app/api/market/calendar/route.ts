/**
 * `/api/market/calendar` BFF route — 국내 장 상태(영업일·세션 경계·다음 개장).
 *
 * PRD `toss-market-calendar` §3-5. 브라우저 → 본 route handler → 토스 REST 단방향(BFF 원칙).
 *
 * 토스 전용(KIS 폴백 없음). 키 미설정이면 200 + phase="unknown" + `X-Data-Source: none`
 * (동료 로컬 무영향, AC-1). `fetchMarketCalendar` 가 never-throw 라 조회 실패도 200 + unknown
 * (fail-soft) — 장 상태는 부가 정보라 실패가 화면을 막지 않는다.
 *
 * 현재시각은 **서버에서 주입**(`deriveMarketStatus(calendar, Date.now())`)해 phase 판정 기준시각을
 * 서버로 고정한다(클라 시계 오차 회피). 클라 재평가(세션 경계 경과)는 응답에 동봉한 `calendar`
 * 원본으로 `useMarketStatus` 훅이 담당한다.
 */

import { NextRequest } from "next/server";
import { fetchMarketCalendar } from "@/lib/api/toss/marketCalendar";
import { isTossConfigured } from "@/lib/api/toss/client";
import { deriveMarketStatus } from "@/lib/market/marketClock";
import type { MarketCalendarResponse } from "@/lib/types/market/marketStatus";
import { withTimeout, jsonWithDataSource } from "@/lib/server/bffUtils";

/** route 자체 타임아웃 가드 — 초과 시 unknown 디그레이드(에러 아님). */
const BFF_TIMEOUT_MS = 5_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const rawDate = (request.nextUrl.searchParams.get("date") ?? "").trim();
  const date = DATE_RE.test(rawDate) ? rawDate : undefined;

  if (!isTossConfigured()) {
    const status = deriveMarketStatus(null, Date.now());
    return jsonWithDataSource(
      { status, calendar: null } satisfies MarketCalendarResponse,
      "none",
    );
  }

  try {
    const calendar = await withTimeout(fetchMarketCalendar(date), BFF_TIMEOUT_MS);
    const status = deriveMarketStatus(calendar, Date.now());
    return jsonWithDataSource(
      { status, calendar } satisfies MarketCalendarResponse,
      "toss",
    );
  } catch {
    // withTimeout 초과가 유일한 경로(로더는 never-throw) — unknown fail-soft.
    const status = deriveMarketStatus(null, Date.now());
    return jsonWithDataSource(
      { status, calendar: null } satisfies MarketCalendarResponse,
      "toss-timeout",
    );
  }
}

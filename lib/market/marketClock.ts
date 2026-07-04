/**
 * 순수 장시계 — 토스 캘린더 + 기준시각(epoch ms) → 앱 표준 `MarketStatus`.
 *
 * PRD `toss-market-calendar` §3-4. **순수 함수**(부작용·`Date.now()` 내부 호출 없음, 시각 주입).
 * 서버 BFF(`Date.now()` 주입)·클라 훅(세션 경계 재평가) 이 **모두 import** 하므로 `lib/server`
 * 가 아니라 `lib/market` 에 둔다(서버 전용 격리 불필요).
 *
 * phase 판정은 세션 경계 ISO(+09:00)를 그대로 `Date.parse` 해 얻은 epoch 와 `nowMs`(epoch)의
 * 직접 비교로 한다 — ISO 오프셋이 절대시각을 포함하므로 타임존 산술 중복이 불필요하다(§9 q5).
 * 표시용 "HH:mm" 포맷만 `lib/api/toss/kst.ts`(Asia/Seoul) 를 재사용한다.
 */

import type {
  TossCalendarDay,
  TossMarketCalendar,
  TossMarketSession,
} from "@/lib/api/toss/types";
import {
  UNKNOWN_MARKET_STATUS,
  type MarketPhase,
  type MarketStatus,
  type SessionTimes,
} from "@/lib/types/market/marketStatus";
import { isoToKstHm } from "@/lib/api/toss/kst";

/** ISO(+09:00) → epoch ms. 파싱 실패 시 null(구간 판정에서 제외). */
function epoch(iso: string | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/** ISO → "HH:mm"(KST), 실패 시 "". */
function hm(iso: string | undefined): string {
  return isoToKstHm(iso) ?? "";
}

/** now 가 [start, end) 구간에 드는지. 경계값 결측이면 false. */
function inSession(session: TossMarketSession | undefined, nowMs: number): boolean {
  const start = epoch(session?.startTime);
  const end = epoch(session?.endTime);
  if (start == null || end == null) return false;
  return nowMs >= start && nowMs < end;
}

/** 영업일의 세션 3종 → 표시용 `SessionTimes`. */
function toSessionTimes(day: TossCalendarDay): SessionTimes {
  const s = day.integrated ?? {};
  return {
    pre: {
      start: hm(s.preMarket?.startTime),
      auction: hm(s.preMarket?.singlePriceAuctionStartTime),
      end: hm(s.preMarket?.endTime),
    },
    regular: {
      start: hm(s.regularMarket?.startTime),
      auction: hm(s.regularMarket?.singlePriceAuctionStartTime),
      end: hm(s.regularMarket?.endTime),
    },
    after: {
      start: hm(s.afterMarket?.startTime),
      auctionEnd: hm(s.afterMarket?.singlePriceAuctionEndTime),
      end: hm(s.afterMarket?.endTime),
    },
  };
}

/** 영업일의 정규장 개장(date + "HH:mm"). 세션 결측이면 null. */
function regularOpenOf(day: TossCalendarDay | undefined): {
  date: string;
  time: string;
} | null {
  const date = day?.date;
  const time = hm(day?.integrated?.regularMarket?.startTime);
  if (!date || !time) return null;
  return { date, time };
}

/**
 * 캘린더 + 기준시각 → `MarketStatus`.
 *   - calendar 없음 → phase="unknown"(fail-soft, isRegularOpen fail-open true).
 *   - today.integrated === null → phase="closed"·휴장(nextOpen = 다음 영업일 정규장 개장).
 *   - 영업일 → nowMs 가 어느 세션 [start,end) 인지로 pre/regular/after, 어디에도 안 들면 closed
 *     (개장 전이면 오늘 정규장, 마감 후면 다음 영업일을 nextOpen 으로).
 */
export function deriveMarketStatus(
  calendar: TossMarketCalendar | null | undefined,
  nowMs: number,
): MarketStatus {
  if (!calendar || !calendar.today) return UNKNOWN_MARKET_STATUS;

  const today = calendar.today;
  const todayDate = today.date ?? "";

  // 휴장(주말·공휴일): integrated === null.
  if (today.integrated == null) {
    return {
      phase: "closed",
      isRegularOpen: false,
      todayIsBusinessDay: false,
      todayDate,
      nextOpen: regularOpenOf(calendar.nextBusinessDay),
      sessionTimes: null,
    };
  }

  const sessionTimes = toSessionTimes(today);
  const sessions = today.integrated;

  let phase: MarketPhase;
  if (inSession(sessions.regularMarket, nowMs)) phase = "regular";
  else if (inSession(sessions.preMarket, nowMs)) phase = "pre";
  else if (inSession(sessions.afterMarket, nowMs)) phase = "after";
  else phase = "closed";

  let nextOpen: MarketStatus["nextOpen"] = null;
  if (phase === "closed") {
    const regularStart = epoch(sessions.regularMarket?.startTime);
    // 개장 전(오늘 정규장 아직) vs 마감 후(다음 영업일).
    nextOpen =
      regularStart != null && nowMs < regularStart
        ? regularOpenOf(today)
        : regularOpenOf(calendar.nextBusinessDay);
  }

  return {
    phase,
    // fail-open 규약(§marketStatus 주석): 영업일 정규장만 true, 그 외 phase 는 false.
    isRegularOpen: phase === "regular",
    todayIsBusinessDay: true,
    todayDate,
    nextOpen,
    sessionTimes,
  };
}

/** 영업일의 세션 경계 epoch(오름차순) — 클라 phase 재평가 setTimeout 예약용. 휴장/불명이면 빈 배열. */
export function sessionBoundaries(
  calendar: TossMarketCalendar | null | undefined,
): number[] {
  const s = calendar?.today?.integrated;
  if (!s) return [];
  const raw = [
    s.preMarket?.startTime,
    s.preMarket?.endTime,
    s.regularMarket?.startTime,
    s.regularMarket?.endTime,
    s.afterMarket?.startTime,
    s.afterMarket?.endTime,
  ];
  const bounds = raw
    .map((iso) => epoch(iso))
    .filter((ms): ms is number => ms != null);
  return [...new Set(bounds)].sort((a, b) => a - b);
}

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
  type MarketPhase,
  type MarketStatus,
  type SessionTimes,
} from "@/lib/types/market/marketStatus";
import { isoToKstHm } from "@/lib/api/toss/kst";
import { isKstMarketHours, isKstWeekend } from "@/lib/utils/kstMarketHours";

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
 * 캘린더 미가용(키 없음/조회 실패) 시 **KST 시각 휴리스틱 폴백** — 공휴일 미인지(주말·시간만).
 *
 * 원천은 토스 캘린더(공휴일 인지)이지만, prod(TOSS 키 미설정)·토스 장애에선 캘린더가 null 로
 * 떨어져 예전엔 `unknown → isRegularOpen=true`(fail-open)로만 흡수돼 **마감 게이팅이 아예 발동하지
 * 않았다**. 이 폴백이 최소한 주말·야간 마감은 잡아 준다(사용자 확정 결정).
 *
 * fail-open 정신 유지: "확실히 마감"(주말·정규장 시간 밖)일 때만 closed, 장중이면 regular.
 * 평일 공휴일은 KST 로 구분 불가 → 장중 시간엔 regular(장중 취급, fail-open) 로 남는다.
 * grace: `isRegularOpen` 은 캘린더 경로와 동일하게 엄격 정규장(09:00~15:30) — 15:30~15:40 유예
 * 손실은 수용(PRD §8/§3-3, 두 경로 일관). nextOpen 은 캘린더 없이는 정확 산출 불가라 null.
 */
function deriveMarketStatusFromKst(nowMs: number): MarketStatus {
  const now = new Date(nowMs);
  if (isKstMarketHours(now)) {
    return {
      phase: "regular",
      isRegularOpen: true,
      todayIsBusinessDay: true,
      todayDate: "",
      nextOpen: null,
      sessionTimes: null,
    };
  }
  // 주말·장전·시간외·야간 — closed 취급. 주말이면 휴장, 평일이면 장 마감(라벨 분기용).
  return {
    phase: "closed",
    isRegularOpen: false,
    todayIsBusinessDay: !isKstWeekend(now),
    todayDate: "",
    nextOpen: null,
    sessionTimes: null,
  };
}

/**
 * 캘린더 + 기준시각 → `MarketStatus`.
 *   - calendar 없음 → **KST 휴리스틱 폴백**(`deriveMarketStatusFromKst`, 공휴일 미인지·주말/야간 마감).
 *   - today.integrated === null → phase="closed"·휴장(nextOpen = 다음 영업일 정규장 개장).
 *   - 영업일 → nowMs 가 어느 세션 [start,end) 인지로 pre/regular/after, 어디에도 안 들면 closed
 *     (개장 전이면 오늘 정규장, 마감 후면 다음 영업일을 nextOpen 으로).
 */
export function deriveMarketStatus(
  calendar: TossMarketCalendar | null | undefined,
  nowMs: number,
): MarketStatus {
  if (!calendar || !calendar.today) return deriveMarketStatusFromKst(nowMs);

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

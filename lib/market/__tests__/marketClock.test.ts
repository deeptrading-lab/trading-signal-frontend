/**
 * `lib/market/marketClock.ts` 단위 테스트 — 순수 장시계 phase 판정.
 *
 * PRD `toss-market-calendar` AC-2~AC-7 회귀 차단: 6 상태(pre/regular/after/closed/휴장/unknown) +
 * 경계값(09:00·15:30·20:00) 결정 고정 + isRegularOpen fail-open + nextOpen 파생.
 */

import { describe, it, expect } from "vitest";
import { deriveMarketStatus, sessionBoundaries } from "../marketClock";
import type { TossMarketCalendar } from "@/lib/api/toss/types";

/** 2026-07-06(월) KST "HH:mm" → epoch ms. */
function at(hhmm: string): number {
  return Date.parse(`2026-07-06T${hhmm}:00+09:00`);
}

/** 영업일(2026-07-06 월) 캘린더 — 다음 영업일 2026-07-07(화). */
const businessDay: TossMarketCalendar = {
  today: {
    date: "2026-07-06",
    integrated: {
      preMarket: {
        startTime: "2026-07-06T08:00:00+09:00",
        singlePriceAuctionStartTime: "2026-07-06T08:50:00+09:00",
        endTime: "2026-07-06T09:00:00+09:00",
      },
      regularMarket: {
        startTime: "2026-07-06T09:00:00+09:00",
        singlePriceAuctionStartTime: "2026-07-06T15:20:00+09:00",
        endTime: "2026-07-06T15:30:00+09:00",
      },
      afterMarket: {
        startTime: "2026-07-06T15:30:00+09:00",
        singlePriceAuctionEndTime: "2026-07-06T18:00:00+09:00",
        endTime: "2026-07-06T20:00:00+09:00",
      },
    },
  },
  previousBusinessDay: { date: "2026-07-03", integrated: {} },
  nextBusinessDay: {
    date: "2026-07-07",
    integrated: {
      regularMarket: {
        startTime: "2026-07-07T09:00:00+09:00",
        endTime: "2026-07-07T15:30:00+09:00",
      },
    },
  },
};

/** 휴장(2026-07-04 토) 캘린더 — 다음 영업일 2026-07-06(월). */
const holiday: TossMarketCalendar = {
  today: { date: "2026-07-04", integrated: null },
  previousBusinessDay: { date: "2026-07-03", integrated: {} },
  nextBusinessDay: {
    date: "2026-07-06",
    integrated: {
      regularMarket: {
        startTime: "2026-07-06T09:00:00+09:00",
        endTime: "2026-07-06T15:30:00+09:00",
      },
    },
  },
};

describe("deriveMarketStatus — unknown (fail-soft/fail-open)", () => {
  it("calendar null 이면 unknown 이고 isRegularOpen 은 fail-open(true) (AC-1)", () => {
    const s = deriveMarketStatus(null, at("10:00"));
    expect(s.phase).toBe("unknown");
    expect(s.isRegularOpen).toBe(true); // fail-open: 후속 폴링 게이트 오정지 방지.
    expect(s.todayIsBusinessDay).toBe(false);
    expect(s.nextOpen).toBeNull();
    expect(s.sessionTimes).toBeNull();
  });
});

describe("deriveMarketStatus — 영업일 phase", () => {
  it("정규장(10:00) → regular · isRegularOpen true (AC-2)", () => {
    const s = deriveMarketStatus(businessDay, at("10:00"));
    expect(s.phase).toBe("regular");
    expect(s.isRegularOpen).toBe(true);
    expect(s.todayIsBusinessDay).toBe(true);
    expect(s.todayDate).toBe("2026-07-06");
    expect(s.sessionTimes?.regular.auction).toBe("15:20");
    expect(s.nextOpen).toBeNull();
  });

  it("장전(08:30) → pre · 동시호가 08:50 (AC-3)", () => {
    const s = deriveMarketStatus(businessDay, at("08:30"));
    expect(s.phase).toBe("pre");
    expect(s.isRegularOpen).toBe(false);
    expect(s.sessionTimes?.pre.auction).toBe("08:50");
  });

  it("시간외(16:00) → after · 종료 20:00 (AC-4)", () => {
    const s = deriveMarketStatus(businessDay, at("16:00"));
    expect(s.phase).toBe("after");
    expect(s.isRegularOpen).toBe(false);
    expect(s.sessionTimes?.after.end).toBe("20:00");
  });

  it("개장 전(07:00) → closed · nextOpen = 오늘 정규장 09:00 (AC-5)", () => {
    const s = deriveMarketStatus(businessDay, at("07:00"));
    expect(s.phase).toBe("closed");
    expect(s.todayIsBusinessDay).toBe(true);
    expect(s.nextOpen).toEqual({ date: "2026-07-06", time: "09:00" });
  });

  it("마감 후(20:30) → closed · nextOpen = 다음 영업일 09:00 (AC-5)", () => {
    const s = deriveMarketStatus(businessDay, at("20:30"));
    expect(s.phase).toBe("closed");
    expect(s.nextOpen).toEqual({ date: "2026-07-07", time: "09:00" });
  });
});

describe("deriveMarketStatus — 휴장 (AC-6)", () => {
  it("today.integrated null → closed · 휴장 · nextOpen = 다음 영업일", () => {
    const s = deriveMarketStatus(holiday, at("10:00"));
    expect(s.phase).toBe("closed");
    expect(s.todayIsBusinessDay).toBe(false);
    expect(s.isRegularOpen).toBe(false);
    expect(s.sessionTimes).toBeNull();
    expect(s.nextOpen).toEqual({ date: "2026-07-06", time: "09:00" });
  });
});

describe("deriveMarketStatus — 경계값 결정 고정 (AC-7)", () => {
  it("09:00 정각 = regular(정규장 시작 inclusive, 장전 끝 exclusive)", () => {
    expect(deriveMarketStatus(businessDay, at("09:00")).phase).toBe("regular");
  });

  it("15:30 정각 = after(정규장 끝 exclusive, 시간외 시작 inclusive)", () => {
    expect(deriveMarketStatus(businessDay, at("15:30")).phase).toBe("after");
  });

  it("20:00 정각 = closed(시간외 끝 exclusive)", () => {
    const s = deriveMarketStatus(businessDay, at("20:00"));
    expect(s.phase).toBe("closed");
    expect(s.nextOpen).toEqual({ date: "2026-07-07", time: "09:00" });
  });

  it("08:00 정각 = pre(장전 시작 inclusive)", () => {
    expect(deriveMarketStatus(businessDay, at("08:00")).phase).toBe("pre");
  });
});

describe("sessionBoundaries", () => {
  it("영업일 세션 경계를 오름차순 중복제거로 반환한다", () => {
    expect(sessionBoundaries(businessDay)).toEqual([
      at("08:00"),
      at("09:00"),
      at("15:30"),
      at("20:00"),
    ]);
  });

  it("휴장/불명이면 빈 배열", () => {
    expect(sessionBoundaries(holiday)).toEqual([]);
    expect(sessionBoundaries(null)).toEqual([]);
  });
});

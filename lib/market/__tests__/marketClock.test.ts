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

describe("deriveMarketStatus — 캘린더 없음 KST 휴리스틱 폴백 (market-status-aware-home)", () => {
  // 캘린더 null(키 없음/실패) → 공휴일 미인지 KST 폴백. 주말/야간 마감은 잡되 장중은 regular.
  it("null + 평일 장중(월 10:00) → regular · isRegularOpen fail-open true", () => {
    const s = deriveMarketStatus(null, at("10:00")); // 2026-07-06 월요일 10:00 KST.
    expect(s.phase).toBe("regular");
    expect(s.isRegularOpen).toBe(true); // 장중 취급(공휴일이어도 fail-open).
    expect(s.todayIsBusinessDay).toBe(true);
    expect(s.nextOpen).toBeNull(); // 캘린더 없이 다음 개장 산출 불가.
    expect(s.sessionTimes).toBeNull();
  });

  it("null + 평일 09:00 정각 → regular(엄격 정규장 시작 inclusive)", () => {
    const s = deriveMarketStatus(null, at("09:00"));
    expect(s.phase).toBe("regular");
    expect(s.isRegularOpen).toBe(true);
  });

  it("null + 평일 15:31(마감 직후) → closed · isRegularOpen false(엄격 15:30, grace 손실 수용)", () => {
    const s = deriveMarketStatus(null, at("15:31"));
    expect(s.phase).toBe("closed");
    expect(s.isRegularOpen).toBe(false);
    expect(s.todayIsBusinessDay).toBe(true); // 평일 → 장 마감.
  });

  it("null + 평일 야간(월 20:30) → closed · 장 마감(평일)", () => {
    const s = deriveMarketStatus(null, at("20:30"));
    expect(s.phase).toBe("closed");
    expect(s.isRegularOpen).toBe(false);
    expect(s.todayIsBusinessDay).toBe(true);
    expect(s.nextOpen).toBeNull();
  });

  it("null + 주말(토 10:00) → closed · 휴장(주말)", () => {
    // 2026-07-04 는 토요일.
    const sat = Date.parse("2026-07-04T10:00:00+09:00");
    const s = deriveMarketStatus(null, sat);
    expect(s.phase).toBe("closed");
    expect(s.isRegularOpen).toBe(false);
    expect(s.todayIsBusinessDay).toBe(false); // 주말 → 휴장 라벨.
    expect(s.nextOpen).toBeNull();
  });

  it("null + 주말 장중 시각(일 11:00) → closed(주말은 시간 무관 휴장)", () => {
    const sun = Date.parse("2026-07-05T11:00:00+09:00"); // 일요일.
    const s = deriveMarketStatus(null, sun);
    expect(s.phase).toBe("closed");
    expect(s.isRegularOpen).toBe(false);
    expect(s.todayIsBusinessDay).toBe(false);
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

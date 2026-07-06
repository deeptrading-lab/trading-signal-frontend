import { describe, it, expect } from "vitest";
import { isPaperSessionStalled } from "@/lib/utils/paperTradingStale";

// 2026-07-06 은 월요일. 05:00Z = 14:00 KST(장중), 12:00Z = 21:00 KST(마감).
const marketNow = new Date("2026-07-06T05:00:00.000Z");
const closedNow = new Date("2026-07-06T12:00:00.000Z");
const base = {
  status: "running",
  tickIntervalMinutes: 2, // 임계 = 2*2 + 2(여유) = 6분
  startedAt: "2026-07-06T04:00:00.000Z",
} as const;

describe("isPaperSessionStalled", () => {
  it("장중 + 마지막 틱이 임계 초과로 끊김 → 멈춤", () => {
    // last 04:50Z, now 05:00Z = 10분 끊김 > 6분
    expect(
      isPaperSessionStalled({ ...base, lastTickWindowStart: "2026-07-06T04:50:00.000Z" }, marketNow),
    ).toBe(true);
  });

  it("장중 + 최근 틱 → 정상(멈춤 아님)", () => {
    // last 04:59Z = 1분 전
    expect(
      isPaperSessionStalled({ ...base, lastTickWindowStart: "2026-07-06T04:59:00.000Z" }, marketNow),
    ).toBe(false);
  });

  it("일시정지 세션 → 멈춤 아님(의도된 정지)", () => {
    expect(
      isPaperSessionStalled(
        { ...base, status: "paused", lastTickWindowStart: "2026-07-06T04:50:00.000Z" },
        marketNow,
      ),
    ).toBe(false);
  });

  it("장 마감 → 멈춤 아님(예외 — 안 도는 게 정상)", () => {
    expect(
      isPaperSessionStalled({ ...base, lastTickWindowStart: "2026-07-06T04:50:00.000Z" }, closedNow),
    ).toBe(false);
  });

  it("lastTickWindowStart 없으면 startedAt 기준", () => {
    // startedAt 04:00Z, now 05:00Z = 60분 → 멈춤
    expect(isPaperSessionStalled({ ...base, lastTickWindowStart: null }, marketNow)).toBe(true);
  });
});

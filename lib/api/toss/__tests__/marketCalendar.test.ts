/**
 * `lib/api/toss/marketCalendar.ts` 단위 테스트 — never-throw 로더 + 캐시/single-flight.
 *
 * PRD `toss-market-calendar` AC-1·AC-8 회귀 차단:
 *   - 키 미설정 = null + 토스 무호출
 *   - 성공 캐시(TTL 내 1콜) · single-flight(동시요청 1콜) · 실패 = null + 실패 캐시
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchMarketCalendar,
  resetMarketCalendarForTest,
} from "../marketCalendar";
import { isTossConfigured, tossGet } from "../client";
import type { TossMarketCalendar } from "../types";

vi.mock("../client", () => ({
  isTossConfigured: vi.fn(),
  tossGet: vi.fn(),
}));

const mockConfigured = vi.mocked(isTossConfigured);
const mockTossGet = vi.mocked(tossGet);

const sample: TossMarketCalendar = {
  today: { date: "2026-07-06", integrated: null },
  previousBusinessDay: { date: "2026-07-03", integrated: {} },
  nextBusinessDay: { date: "2026-07-06", integrated: {} },
};

beforeEach(() => {
  vi.clearAllMocks();
  resetMarketCalendarForTest();
  mockConfigured.mockReturnValue(true);
});

describe("fetchMarketCalendar", () => {
  it("키 미설정이면 null 이고 토스를 호출하지 않는다 (AC-1)", async () => {
    mockConfigured.mockReturnValue(false);
    const result = await fetchMarketCalendar();
    expect(result).toBeNull();
    expect(mockTossGet).not.toHaveBeenCalled();
  });

  it("성공 응답을 반환하고 TTL 내 재요청은 캐시 히트(1콜) (AC-8)", async () => {
    mockTossGet.mockResolvedValue(sample);
    const a = await fetchMarketCalendar();
    const b = await fetchMarketCalendar();
    expect(a).toEqual(sample);
    expect(b).toEqual(sample);
    expect(mockTossGet).toHaveBeenCalledTimes(1);
  });

  it("동시 요청은 single-flight 로 1콜에 수렴 (AC-8)", async () => {
    mockTossGet.mockResolvedValue(sample);
    const [a, b] = await Promise.all([
      fetchMarketCalendar(),
      fetchMarketCalendar(),
    ]);
    expect(a).toEqual(sample);
    expect(b).toEqual(sample);
    expect(mockTossGet).toHaveBeenCalledTimes(1);
  });

  it("조회 실패는 null 로 수렴하고 실패 캐시로 재시도를 억제한다", async () => {
    mockTossGet.mockRejectedValue(new Error("5xx"));
    const a = await fetchMarketCalendar();
    const b = await fetchMarketCalendar();
    expect(a).toBeNull();
    expect(b).toBeNull();
    expect(mockTossGet).toHaveBeenCalledTimes(1); // 실패 캐시(30s) 히트.
  });

  it("today 필드 없는 비정형 응답은 null 로 방어한다", async () => {
    mockTossGet.mockResolvedValue({ foo: "bar" } as unknown as TossMarketCalendar);
    expect(await fetchMarketCalendar()).toBeNull();
  });
});

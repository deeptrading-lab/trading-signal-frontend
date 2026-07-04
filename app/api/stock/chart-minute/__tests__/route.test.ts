/**
 * `app/api/stock/chart-minute/route.ts` 단위 테스트 — 분봉 간격/기간 분리(minute-chart-interval-period).
 *
 * 검증:
 *   - ticker 누락 → 400.
 *   - KIS 미설정 → mock 본문 + X-Data-Source: mock (당일/멀티데이 both).
 *   - priorDays 로 소스 분기: 0(또는 없음)=`fetchTodayMinuteCandles`, >0=`fetchMinuteHistory`.
 *   - priorDays 상한 20(1개월) 클램프.
 *   - timeframe 허용 집합(1/3/5/10/15) — 10 유효, 그 외는 기본 5.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  isKisConfigured: vi.fn(),
  resolveKisEnv: vi.fn(),
  fetchTodayMinuteCandles: vi.fn(),
  fetchMinuteHistory: vi.fn(),
}));

vi.mock("@/lib/api/kis", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/kis")>("@/lib/api/kis");
  return { ...actual, isKisConfigured: mocks.isKisConfigured, resolveKisEnv: mocks.resolveKisEnv };
});

vi.mock("@/lib/api/kis/minuteChartChunked", () => ({
  fetchTodayMinuteCandles: mocks.fetchTodayMinuteCandles,
  fetchMinuteHistory: mocks.fetchMinuteHistory,
}));

// 소스 추적 래퍼 — 테스트에선 fn 만 실행하고 kis 로 고정.
vi.mock("@/lib/api/marketdata/source", () => ({
  trackMarketDataSource: async <T>(fn: () => Promise<T>) => ({
    result: await fn(),
    servedSource: "kis",
  }),
}));

import { GET } from "../route";
import type { StockMinuteCandle } from "@/lib/api/kis/types";

function makeRequest(query = ""): NextRequest {
  return new NextRequest(`http://localhost/api/stock/chart-minute${query}`);
}

const sample: StockMinuteCandle[] = [
  { date: "2026-07-03T09:00", open: 100, high: 101, low: 99, close: 100, volume: 10 },
  { date: "2026-07-03T09:05", open: 100, high: 102, low: 100, close: 101, volume: 12 },
];

describe("GET /api/stock/chart-minute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveKisEnv.mockReturnValue("prod");
    mocks.fetchTodayMinuteCandles.mockResolvedValue(sample);
    mocks.fetchMinuteHistory.mockResolvedValue(sample);
  });

  it("ticker 누락 → 400", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
  });

  it("KIS 미설정 → mock 본문 + X-Data-Source: mock (당일)", async () => {
    mocks.isKisConfigured.mockReturnValue(false);
    const res = await GET(makeRequest("?ticker=005930"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Data-Source")).toBe("mock");
    expect(mocks.fetchTodayMinuteCandles).not.toHaveBeenCalled();
    expect(mocks.fetchMinuteHistory).not.toHaveBeenCalled();
    const body = (await res.json()) as StockMinuteCandle[];
    // 당일 mock 은 한 거래일.
    expect(new Set(body.map((c) => c.date.slice(0, 10))).size).toBe(1);
  });

  it("KIS 미설정 + priorDays=5 → 멀티데이 mock(여러 거래일)", async () => {
    mocks.isKisConfigured.mockReturnValue(false);
    const res = await GET(makeRequest("?ticker=005930&priorDays=5"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Data-Source")).toBe("mock");
    const body = (await res.json()) as StockMinuteCandle[];
    // priorDays 5 → 과거 5거래일 + 당일 = 6 거래일치 세션.
    expect(new Set(body.map((c) => c.date.slice(0, 10))).size).toBe(6);
  });

  it("priorDays 없음(당일) → fetchTodayMinuteCandles, fetchMinuteHistory 미호출", async () => {
    mocks.isKisConfigured.mockReturnValue(true);
    const res = await GET(makeRequest("?ticker=005930&timeframe=5"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Data-Source")).toBe("kis");
    expect(mocks.fetchTodayMinuteCandles).toHaveBeenCalledTimes(1);
    expect(mocks.fetchMinuteHistory).not.toHaveBeenCalled();
  });

  it("priorDays>0 → fetchMinuteHistory(priorDays, includeToday:true), 당일 페치 미호출", async () => {
    mocks.isKisConfigured.mockReturnValue(true);
    const res = await GET(makeRequest("?ticker=005930&timeframe=5&priorDays=5"));
    expect(res.status).toBe(200);
    expect(mocks.fetchMinuteHistory).toHaveBeenCalledWith("005930", {
      timeframe: 5,
      priorDays: 5,
      includeToday: true,
    });
    expect(mocks.fetchTodayMinuteCandles).not.toHaveBeenCalled();
  });

  it("priorDays 상한 20(1개월) 클램프 — priorDays=999 → 20", async () => {
    mocks.isKisConfigured.mockReturnValue(true);
    await GET(makeRequest("?ticker=005930&priorDays=999"));
    expect(mocks.fetchMinuteHistory).toHaveBeenCalledWith(
      "005930",
      expect.objectContaining({ priorDays: 20 }),
    );
  });

  it("timeframe=10 유효 — 그대로 전달(당일 경로)", async () => {
    mocks.isKisConfigured.mockReturnValue(true);
    await GET(makeRequest("?ticker=005930&timeframe=10"));
    expect(mocks.fetchTodayMinuteCandles).toHaveBeenCalledWith("005930", 10, expect.any(Number));
  });

  it("timeframe=10 유효 — 멀티데이 경로에도 전달", async () => {
    mocks.isKisConfigured.mockReturnValue(true);
    await GET(makeRequest("?ticker=005930&timeframe=10&priorDays=5"));
    expect(mocks.fetchMinuteHistory).toHaveBeenCalledWith(
      "005930",
      expect.objectContaining({ timeframe: 10 }),
    );
  });

  it("허용 외 timeframe(7) → 기본 5 로 강제", async () => {
    mocks.isKisConfigured.mockReturnValue(true);
    await GET(makeRequest("?ticker=005930&timeframe=7&priorDays=5"));
    expect(mocks.fetchMinuteHistory).toHaveBeenCalledWith(
      "005930",
      expect.objectContaining({ timeframe: 5 }),
    );
  });
});

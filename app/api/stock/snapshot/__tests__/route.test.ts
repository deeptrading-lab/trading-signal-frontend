/**
 * `app/api/stock/snapshot/route.ts` 단위 테스트.
 *
 * PRD `value-picks-validated`:
 *   - AC-1: 최상위 필드 전부 포함, 산출불가 null.
 *   - AC-2: tradeAmountKRW = current×volume, 수급 집계·연속 순매도.
 *   - AC-3: 미설정 → mock + X-Data-Source: mock, ticker 미지정 400, 부분 실패 200+null+kis-partial.
 *
 * KIS 호출(fetchStockPriceWithShares/fetchDailyChunked/fetchInvestorTrend/fetchStockInfo)은 모두 mock.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { makeApiError } from "@/lib/api/errors";
import type { StockPriceWithShares } from "@/lib/api/kis/price";
import type { StockDailyCandle, StockInfo } from "@/lib/api/kis/types";
import type { StockInvestorTrend } from "@/lib/types/stock/investors";

const mocks = vi.hoisted(() => ({
  isKisConfigured: vi.fn(),
  resolveKisEnv: vi.fn(),
  getSymbolName: vi.fn(),
  fetchStockPriceWithShares: vi.fn(),
  fetchStockInfo: vi.fn(),
  fetchDailyChunked: vi.fn(),
  fetchInvestorTrend: vi.fn(),
}));

vi.mock("@/lib/api/kis", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/kis")>(
    "@/lib/api/kis",
  );
  return {
    ...actual,
    isKisConfigured: mocks.isKisConfigured,
    resolveKisEnv: mocks.resolveKisEnv,
    getSymbolName: mocks.getSymbolName,
    fetchStockPriceWithShares: mocks.fetchStockPriceWithShares,
    fetchStockInfo: mocks.fetchStockInfo,
  };
});

vi.mock("@/lib/api/kis/chartChunked", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/api/kis/chartChunked")
  >("@/lib/api/kis/chartChunked");
  return { ...actual, fetchDailyChunked: mocks.fetchDailyChunked };
});

vi.mock("@/lib/api/kis/investor-flow", () => ({
  fetchInvestorTrend: mocks.fetchInvestorTrend,
}));

import { GET } from "../route";

function req(ticker?: string): NextRequest {
  const url = ticker
    ? `http://localhost/api/stock/snapshot?ticker=${ticker}`
    : "http://localhost/api/stock/snapshot";
  return new NextRequest(url);
}

function priceWithShares(): StockPriceWithShares {
  return {
    price: {
      ticker: "092130",
      name: "이크레더블",
      price: 12_450,
      change: -150,
      changePercent: -1.23,
      direction: "down",
      volume: 5_230,
      foreignRatio: 8.4,
    },
    listedShares: 6_763_000,
  };
}

function candles(): StockDailyCandle[] {
  return Array.from({ length: 150 }, (_, i) => {
    const close = 12_000 + i;
    return {
      date: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
      open: close,
      high: Math.round(close * 1.02),
      low: Math.round(close * 0.98),
      close,
      volume: 100_000,
    };
  });
}

function investorTrend(): StockInvestorTrend {
  // 기관 최신 5일 연속 순매도(음수), 외국인은 혼합.
  return {
    days: [
      day(-100, 30),
      day(-200, -10),
      day(-50, 5),
      day(-10, 5),
      day(-20, 5),
    ],
  };
}

function day(org: number, foreign: number) {
  return {
    date: "2026-06-18",
    close: 12_450,
    changeSign: "5",
    personNetBuyAmount: 0,
    personNetBuyQty: 0,
    foreignNetBuyAmount: foreign,
    foreignNetBuyQty: 0,
    orgNetBuyAmount: org,
    orgNetBuyQty: 0,
  };
}

const stockInfo: StockInfo = {
  ticker: "092130",
  name: "이크레더블",
  market: "KOSDAQ",
  isTradeStopped: false,
  isAdminItem: false,
};

describe("GET /api/stock/snapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isKisConfigured.mockReturnValue(true);
    mocks.resolveKisEnv.mockReturnValue("prod");
    mocks.getSymbolName.mockReturnValue(null);
    mocks.fetchStockPriceWithShares.mockResolvedValue(priceWithShares());
    mocks.fetchDailyChunked.mockResolvedValue(candles());
    mocks.fetchInvestorTrend.mockResolvedValue(investorTrend());
    mocks.fetchStockInfo.mockResolvedValue(stockInfo);
  });

  it("[AC-3] ticker 미지정 → 400", async () => {
    const res = await GET(req());
    expect(res.status).toBe(400);
  });

  it("[AC-3] 6자리 아님 → 400", async () => {
    const res = await GET(req("12ab"));
    expect(res.status).toBe(400);
  });

  it("[AC-3] KIS 미설정 → mock + X-Data-Source: mock", async () => {
    mocks.isKisConfigured.mockReturnValue(false);
    const res = await GET(req("005930"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Data-Source")).toBe("mock");
    const body = await res.json();
    // mock 도 최상위 계약 충족(AC-1).
    expect(body).toHaveProperty("price");
    expect(body).toHaveProperty("technical");
    expect(body).toHaveProperty("investorTrend");
    expect(mocks.fetchStockPriceWithShares).not.toHaveBeenCalled();
  });

  it("[AC-1] 정상 — 최상위 필드 전부 + X-Data-Source: kis + X-KIS-Env", async () => {
    const res = await GET(req("092130"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Data-Source")).toBe("kis");
    expect(res.headers.get("X-KIS-Env")).toBe("prod");
    const body = await res.json();
    for (const key of [
      "ticker",
      "name",
      "market",
      "asOf",
      "price",
      "valuation52w",
      "marketCapKRW",
      "foreignRatioPct",
      "technical",
      "investorTrend",
    ]) {
      expect(body).toHaveProperty(key);
    }
    expect(body.market).toBe("KOSDAQ");
  });

  it("[AC-2] tradeAmountKRW = current×volume + 수급 집계·연속 순매도", async () => {
    const res = await GET(req("092130"));
    const body = await res.json();
    expect(body.price.tradeAmountKRW).toBe(12_450 * 5_230);
    expect(body.marketCapKRW).toBe(12_450 * 6_763_000);
    // 기관 5일 합 = -380 백만원 → -380,000,000원.
    expect(body.investorTrend.orgNetBuyAmountKRW).toBe(-380 * 1_000_000);
    // 기관 5일 연속 순매도 → 5.
    expect(body.investorTrend.orgConsecutiveSellDays).toBe(5);
  });

  it("[AC-3] 일봉 실패(부분) → 200 + 일봉 필드 null + X-Data-Source: kis-partial", async () => {
    mocks.fetchDailyChunked.mockRejectedValue(
      makeApiError("network", { message: "EGW00201" }),
    );
    const res = await GET(req("092130"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Data-Source")).toBe("kis-partial");
    const body = await res.json();
    // 일봉 의존 필드 null.
    expect(body.valuation52w.high).toBeNull();
    expect(body.technical.sma5).toBeNull();
    expect(body.technical.trendRegime).toBeNull();
    // 가격·수급은 살아있음.
    expect(body.price.tradeAmountKRW).toBe(12_450 * 5_230);
    expect(body.investorTrend.orgConsecutiveSellDays).toBe(5);
  });

  it("[AC-3] 수급 실패(부분) → 200 + 수급 필드 null + kis-partial", async () => {
    mocks.fetchInvestorTrend.mockRejectedValue(
      makeApiError("server", { status: 502, message: "fail" }),
    );
    const res = await GET(req("092130"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Data-Source")).toBe("kis-partial");
    const body = await res.json();
    expect(body.investorTrend.orgNetBuyAmountKRW).toBeNull();
    expect(body.investorTrend.orgConsecutiveSellDays).toBeNull();
    // 일봉(technical)은 살아있음.
    expect(body.technical.sma5).not.toBeNull();
  });

  it("[AC-3] vts 환경 → 시장 구분 생략(null) + search-stock-info 미호출, kis-partial 아님", async () => {
    mocks.resolveKisEnv.mockReturnValue("vts");
    const res = await GET(req("092130"));
    expect(res.status).toBe(200);
    // info 그룹은 prod 한정이라 vts 에선 시도조차 안 함 → 성공(null)으로 취급, 부분 신호 아님.
    expect(mocks.fetchStockInfo).not.toHaveBeenCalled();
    expect(res.headers.get("X-Data-Source")).toBe("kis");
    const body = await res.json();
    expect(body.market).toBeNull();
  });

  it("[AC-3] 가격 그룹 전체 실패 → 502(산출 불가)", async () => {
    mocks.fetchStockPriceWithShares.mockRejectedValue(
      makeApiError("server", { status: 502, message: "현재가 조회 실패" }),
    );
    const res = await GET(req("092130"));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toContain("현재가");
  });
});

/**
 * `app/api/watchlist/route.ts` 단위 테스트.
 *
 * PRD `watchlist-real-data` AC-3 / AC-8 — 게이트 비대칭 + 부분 성공 + soft cap 회귀 차단:
 *   1. 빈 tickers → 200 + 빈 배열 (KIS 호출 X).
 *   2. 키 미설정 → X-Data-Source: mock + WatchlistQuote[] 본문 (시세도 호출 X).
 *   3. 키 설정 + env != prod → 시세는 KIS, 메타는 fallback name (search-stock-info 호출 X).
 *   4. prod + 부분 실패(한 종목 시세 실패) → 성공분만, kis, 200.
 *   5. prod + 전부 시세 실패 → 502 + 한글 fallback.
 *   6. soft cap 30 초과 → truncate + X-Watchlist-Truncated 헤더.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  isKisConfigured: vi.fn(),
  resolveKisEnv: vi.fn(),
  fetchStockPrice: vi.fn(),
  fetchStockInfo: vi.fn(),
  searchSymbols: vi.fn(),
}));

vi.mock("@/lib/api/kis", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/kis")>(
    "@/lib/api/kis",
  );
  return {
    ...actual,
    isKisConfigured: mocks.isKisConfigured,
    resolveKisEnv: mocks.resolveKisEnv,
    fetchStockPrice: mocks.fetchStockPrice,
    fetchStockInfo: mocks.fetchStockInfo,
    searchSymbols: mocks.searchSymbols,
  };
});

import { GET } from "../route";

function makeRequest(query = ""): NextRequest {
  return new NextRequest(`http://localhost/api/watchlist${query}`);
}

const price = (ticker: string) => ({
  ticker,
  name: "",
  price: 1_000,
  change: 10,
  changePercent: 1,
  direction: "up" as const,
  volume: 100,
});

describe("GET /api/watchlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveKisEnv.mockReturnValue("prod");
    mocks.searchSymbols.mockReturnValue([]);
  });

  it("[#1] 빈 tickers → 200 + 빈 배열 (KIS 호출 안 함)", async () => {
    mocks.isKisConfigured.mockReturnValue(true);
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(mocks.fetchStockPrice).not.toHaveBeenCalled();
    expect(await res.json()).toEqual([]);
  });

  it("[#2 AC-8] 키 미설정 → mock 본문 + X-Data-Source: mock (시세 호출 안 함)", async () => {
    mocks.isKisConfigured.mockReturnValue(false);
    const res = await GET(makeRequest("?tickers=005930"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Data-Source")).toBe("mock");
    expect(mocks.fetchStockPrice).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body[0].ticker).toBe("005930");
    expect(body[0].name).toBe("삼성전자");
  });

  it("[#3 AC-8] env != prod → 시세는 KIS, 메타는 fallback name (search-stock-info 호출 안 함)", async () => {
    mocks.isKisConfigured.mockReturnValue(true);
    mocks.resolveKisEnv.mockReturnValue("vts");
    mocks.fetchStockPrice.mockImplementation((t: string) =>
      Promise.resolve(price(t)),
    );
    mocks.searchSymbols.mockReturnValue([
      { ticker: "005930", name: "삼성전자", market: "KOSPI" },
    ]);

    const res = await GET(makeRequest("?tickers=005930"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Data-Source")).toBe("kis");
    expect(res.headers.get("X-KIS-Env")).toBe("vts");
    expect(mocks.fetchStockInfo).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body[0].name).toBe("삼성전자"); // 시드 name fallback
    expect(body[0].market).toBeUndefined(); // 메타 미동봉
  });

  it("[#4] prod + 한 종목 시세 실패 → 성공분만, kis, 200", async () => {
    mocks.isKisConfigured.mockReturnValue(true);
    mocks.resolveKisEnv.mockReturnValue("prod");
    mocks.fetchStockPrice.mockImplementation((t: string) =>
      t === "000660" ? Promise.reject(new Error("일시 오류")) : Promise.resolve(price(t)),
    );
    mocks.fetchStockInfo.mockImplementation((t: string) =>
      Promise.resolve({
        ticker: t,
        name: t === "005930" ? "삼성전자" : t,
        market: "KOSPI",
        isTradeStopped: false,
        isAdminItem: false,
      }),
    );

    const res = await GET(makeRequest("?tickers=005930,000660"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Data-Source")).toBe("kis");
    const body = await res.json();
    expect(body.map((q: { ticker: string }) => q.ticker)).toEqual(["005930"]);
    expect(body[0].name).toBe("삼성전자");
  });

  it("[#5] prod + 전부 시세 실패 → 502 + 한글 fallback", async () => {
    mocks.isKisConfigured.mockReturnValue(true);
    mocks.resolveKisEnv.mockReturnValue("prod");
    mocks.fetchStockPrice.mockRejectedValue(new Error("일시 오류"));
    mocks.fetchStockInfo.mockRejectedValue(new Error("일시 오류"));

    const res = await GET(makeRequest("?tickers=005930,000660"));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toContain("관심종목");
  });

  it("[#6] soft cap 30 초과 → truncate + X-Watchlist-Truncated 헤더", async () => {
    mocks.isKisConfigured.mockReturnValue(false);
    const many = Array.from({ length: 35 }, (_, i) =>
      String(i).padStart(6, "0"),
    ).join(",");
    const res = await GET(makeRequest(`?tickers=${many}`));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Watchlist-Truncated")).toBe("soft-cap-30");
    const body = await res.json();
    expect(body).toHaveLength(30);
  });

  it("[#4] prod + 시세 성공 + 메타 실패 → fallback name 으로 디그레이드", async () => {
    mocks.isKisConfigured.mockReturnValue(true);
    mocks.resolveKisEnv.mockReturnValue("prod");
    mocks.fetchStockPrice.mockImplementation((t: string) =>
      Promise.resolve(price(t)),
    );
    mocks.fetchStockInfo.mockRejectedValue(new Error("메타 일시 오류"));
    mocks.searchSymbols.mockReturnValue([
      { ticker: "005930", name: "삼성전자", market: "KOSPI" },
    ]);

    const res = await GET(makeRequest("?tickers=005930"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].name).toBe("삼성전자");
    expect(body[0].price).toBe(1_000);
  });
});

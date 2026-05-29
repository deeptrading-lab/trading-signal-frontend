/**
 * `app/api/watchlist/route.ts` 단위 테스트 — `intstock_multprice` 일괄조회 전환.
 *
 * PRD `watchlist-batch-quotes` AC-10 / AC-11 — 이중 게이트 + mock fallback + 누락 헤더 + 전체실패:
 *   1. 빈 tickers → 200 + 빈 배열 (KIS 호출 X).
 *   2. 키 미설정 → X-Data-Source: mock + WatchlistQuote[] 본문 (일괄 호출 X).
 *   3. env != prod → 이중 게이트 미통과 → mock (일괄 호출 X).
 *   4. prod + 일괄 1콜 성공 → kis, 200. 종목당 fetchStockPrice 반복 호출 0(일괄 1콜).
 *   5. prod + 일부 ticker 누락 → 성공분만 + X-Watchlist-Failed 헤더.
 *   6. prod + 전체 실패(throw) → 502 + 한글 fallback.
 *   7. prod + 빈 응답(0종) → 502 + 한글 fallback.
 *   8. soft cap 30 초과 → truncate + X-Watchlist-Truncated 헤더.
 *   9. 종목명 fallback — BFF name 은 시드 getSymbolName → ticker.
 *  10. transient(rate-limit) 단일콜 실패 → 1회 재시도 후 성공.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { makeApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  isKisConfigured: vi.fn(),
  resolveKisEnv: vi.fn(),
  fetchIntstockMultprice: vi.fn(),
  getSymbolName: vi.fn(),
}));

vi.mock("@/lib/api/kis", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/kis")>(
    "@/lib/api/kis",
  );
  return {
    ...actual,
    isKisConfigured: mocks.isKisConfigured,
    resolveKisEnv: mocks.resolveKisEnv,
    fetchIntstockMultprice: mocks.fetchIntstockMultprice,
    getSymbolName: mocks.getSymbolName,
  };
});

import { GET } from "../route";

function makeRequest(query = ""): NextRequest {
  return new NextRequest(`http://localhost/api/watchlist${query}`);
}

const quote = (ticker: string) => ({
  ticker,
  name: ticker,
  price: 1_000,
  change: 10,
  changePercent: 1,
  direction: "up" as const,
  volume: 100,
});

describe("GET /api/watchlist (일괄조회)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveKisEnv.mockReturnValue("prod");
    mocks.getSymbolName.mockReturnValue(null);
  });

  it("[#1] 빈 tickers → 200 + 빈 배열 (KIS 호출 안 함)", async () => {
    mocks.isKisConfigured.mockReturnValue(true);
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(mocks.fetchIntstockMultprice).not.toHaveBeenCalled();
    expect(await res.json()).toEqual([]);
  });

  it("[#2] 키 미설정 → mock 본문 + X-Data-Source: mock (일괄 호출 안 함)", async () => {
    mocks.isKisConfigured.mockReturnValue(false);
    const res = await GET(makeRequest("?tickers=005930"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Data-Source")).toBe("mock");
    expect(mocks.fetchIntstockMultprice).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body[0].ticker).toBe("005930");
    expect(body[0].name).toBe("삼성전자");
  });

  it("[#3] 이중 게이트 — env != prod → mock (일괄 호출 안 함)", async () => {
    mocks.isKisConfigured.mockReturnValue(true);
    mocks.resolveKisEnv.mockReturnValue("vts");
    const res = await GET(makeRequest("?tickers=005930"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Data-Source")).toBe("mock");
    expect(res.headers.get("X-KIS-Env")).toBe("vts");
    expect(mocks.fetchIntstockMultprice).not.toHaveBeenCalled();
  });

  it("[#4] prod + 일괄 1콜 성공 → kis, 200 (일괄 1회 호출)", async () => {
    mocks.isKisConfigured.mockReturnValue(true);
    mocks.fetchIntstockMultprice.mockResolvedValue([
      quote("005930"),
      quote("000660"),
      quote("035420"),
    ]);

    const res = await GET(makeRequest("?tickers=005930,000660,035420"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Data-Source")).toBe("kis");
    expect(mocks.fetchIntstockMultprice).toHaveBeenCalledTimes(1); // 3종 = 1콜.
    expect(mocks.fetchIntstockMultprice).toHaveBeenCalledWith([
      "005930",
      "000660",
      "035420",
    ]);
    const body = await res.json();
    expect(body.map((q: { ticker: string }) => q.ticker)).toEqual([
      "005930",
      "000660",
      "035420",
    ]);
  });

  it("[#5] prod + 일부 ticker 누락 → 성공분만 + X-Watchlist-Failed", async () => {
    mocks.isKisConfigured.mockReturnValue(true);
    mocks.fetchIntstockMultprice.mockResolvedValue([
      quote("005930"),
      quote("035420"),
    ]);

    const res = await GET(makeRequest("?tickers=005930,000660,035420"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Data-Source")).toBe("kis");
    expect(res.headers.get("X-Watchlist-Failed")).toBe("000660");
    const body = await res.json();
    expect(body.map((q: { ticker: string }) => q.ticker)).toEqual([
      "005930",
      "035420",
    ]);
  });

  it("[#6] prod + 전체 실패(throw) → 502 + 한글 fallback", async () => {
    mocks.isKisConfigured.mockReturnValue(true);
    mocks.fetchIntstockMultprice.mockRejectedValue(new Error("일시 오류"));

    const res = await GET(makeRequest("?tickers=005930,000660"));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toContain("관심종목");
  });

  it("[#7] prod + 빈 응답(0종) → 502 + 한글 fallback", async () => {
    mocks.isKisConfigured.mockReturnValue(true);
    mocks.fetchIntstockMultprice.mockResolvedValue([]);

    const res = await GET(makeRequest("?tickers=005930,000660"));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toContain("관심종목");
  });

  it("[#8] soft cap 30 초과 → truncate + X-Watchlist-Truncated 헤더", async () => {
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

  it("[#9] 종목명 fallback — BFF name 은 시드 getSymbolName → ticker", async () => {
    mocks.isKisConfigured.mockReturnValue(true);
    // 일괄 매퍼는 name 을 ticker 로 두고 → BFF 가 시드 fallback 적용.
    mocks.fetchIntstockMultprice.mockResolvedValue([quote("005930")]);
    mocks.getSymbolName.mockImplementation((t: string) =>
      t === "005930" ? "삼성전자" : null,
    );

    const res = await GET(makeRequest("?tickers=005930"));
    const body = await res.json();
    expect(body[0].name).toBe("삼성전자"); // 시드 name.

    // 시드에 없으면 ticker.
    mocks.fetchIntstockMultprice.mockResolvedValue([quote("999999")]);
    mocks.getSymbolName.mockReturnValue(null);
    const res2 = await GET(makeRequest("?tickers=999999"));
    const body2 = await res2.json();
    expect(body2[0].name).toBe("999999");
  });

  it("[#10] transient(rate-limit) 단일콜 실패 → 1회 재시도 후 성공", async () => {
    mocks.isKisConfigured.mockReturnValue(true);
    let calls = 0;
    mocks.fetchIntstockMultprice.mockImplementation(() => {
      calls += 1;
      if (calls === 1) {
        return Promise.reject(
          makeApiError("server", {
            status: 200,
            message: "초당 거래건수를 초과하였습니다.",
            detail: { msg_cd: "EGW00201" },
          }),
        );
      }
      return Promise.resolve([quote("005930"), quote("000660")]);
    });

    const res = await GET(makeRequest("?tickers=005930,000660"));
    expect(res.status).toBe(200);
    expect(calls).toBe(2); // 1차 rate-limit + 1회 재시도.
    const body = await res.json();
    expect(body).toHaveLength(2);
  });

  it("[#11] 비즈니스 에러(rate-limit 아님) → 재시도 안 함(1콜)", async () => {
    mocks.isKisConfigured.mockReturnValue(true);
    let calls = 0;
    mocks.fetchIntstockMultprice.mockImplementation(() => {
      calls += 1;
      return Promise.reject(
        makeApiError("server", {
          status: 200,
          message: "조회할 수 없는 종목코드입니다.",
          detail: { msg_cd: "EGW00123" },
        }),
      );
    });

    const res = await GET(makeRequest("?tickers=999999"));
    expect(res.status).toBe(502);
    expect(calls).toBe(1); // 비즈니스 에러는 재시도 없음.
  });
});

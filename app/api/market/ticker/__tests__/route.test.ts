/**
 * `app/api/market/ticker/route.ts` 단위 테스트.
 *
 * PRD `header-market-ticker` AC-3 / AC-7 / AC-8 / AC-9 — 합성 BFF 회귀 차단:
 *   - 순서 고정 [코스피, 코스닥, S&P 500, NASDAQ, BTC].
 *   - 게이트 미통과(env != prod) → 지수 KIS 실호출 0, BTC 는 시도.
 *   - 부분 성공(BTC 실패해도 지수, 일부 지수 실패해도 나머지).
 *   - 전체 실패 → mock degrade(X-Data-Source: mock).
 *   - KIS 4콜 동시 난사 없음(2개씩 청크).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  isKisConfigured: vi.fn(),
  resolveKisEnv: vi.fn(),
  // 국내(0001/1001)는 fetchIndexPriceShared(L2 store 경유, kis-token-store §3.3)로 호출된다.
  fetchIndexPrice: vi.fn(),
  fetchOverseasIndex: vi.fn(),
  fetchBtcKrw: vi.fn(),
}));

vi.mock("@/lib/api/kis", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/kis")>(
    "@/lib/api/kis",
  );
  return {
    ...actual,
    isKisConfigured: mocks.isKisConfigured,
    resolveKisEnv: mocks.resolveKisEnv,
    // 국내 실호출 진입점 = fetchIndexPriceShared. 기존 fetchIndexPrice 단언과 호환되게 같은 mock.
    fetchIndexPriceShared: mocks.fetchIndexPrice,
    fetchOverseasIndex: mocks.fetchOverseasIndex,
  };
});

vi.mock("@/lib/api/coingecko/btc", () => ({
  fetchBtcKrw: mocks.fetchBtcKrw,
}));

import { GET, resetTickerCacheForTest } from "../route";
import type { MarketIndexQuote } from "@/lib/api/kis";
import type { BtcQuote } from "@/lib/api/coingecko/types";

function makeIndexQuote(
  code: string,
  value: number,
  direction: "up" | "down" | "flat" = "up",
): MarketIndexQuote {
  return {
    code,
    name: code,
    value,
    change: 1,
    changePercent: 1.1,
    direction,
    volume: 0,
  };
}

const btcQuote: BtcQuote = { value: 89_240_000, changePct: -0.5, isUp: false };

function indexImpl(): (code: string) => Promise<MarketIndexQuote> {
  return (code: string) => {
    const valueByCode: Record<string, number> = {
      "0001": 2_750.23,
      "1001": 862.14,
      SPX: 7_580.06,
      COMP: 26_972.62,
    };
    return Promise.resolve(makeIndexQuote(code, valueByCode[code] ?? 0));
  };
}

describe("GET /api/market/ticker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTickerCacheForTest();
    mocks.resolveKisEnv.mockReturnValue("prod");
    mocks.isKisConfigured.mockReturnValue(true);
    mocks.fetchIndexPrice.mockImplementation(indexImpl());
    mocks.fetchOverseasIndex.mockImplementation(indexImpl());
    mocks.fetchBtcKrw.mockResolvedValue(btcQuote);
  });

  it("[AC-3] 5건 + 고정 순서 [KOSPI, KOSDAQ, S&P 500, NASDAQ, BTC]", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Data-Source")).toBe("kis");
    expect(res.headers.get("X-KIS-Env")).toBe("prod");
    const body = await res.json();
    expect(body.map((t: { code: string }) => t.code)).toEqual([
      "KOSPI",
      "KOSDAQ",
      "S&P 500",
      "NASDAQ",
      "BTC",
    ]);
    // value 는 표시 문자열(천단위 콤마).
    expect(body[0].value).toBe("2,750.23");
    expect(body[4].value).toBe("89,240,000");
    expect(body[4].isUp).toBe(false);
  });

  it("[AC-8] 게이트 미통과(env != prod) → 지수 KIS 실호출 0, BTC 는 시도", async () => {
    mocks.resolveKisEnv.mockReturnValue("vts");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(mocks.fetchIndexPrice).not.toHaveBeenCalled();
    expect(mocks.fetchOverseasIndex).not.toHaveBeenCalled();
    expect(mocks.fetchBtcKrw).toHaveBeenCalled();
    // 지수는 mock, BTC 는 라이브 → 일부 라이브.
    expect(res.headers.get("X-Data-Source")).toBe("mixed");
  });

  it("[AC-8] 키 미설정 → 지수 mock, BTC 시도", async () => {
    mocks.isKisConfigured.mockReturnValue(false);
    const res = await GET();
    expect(mocks.fetchIndexPrice).not.toHaveBeenCalled();
    expect(mocks.fetchOverseasIndex).not.toHaveBeenCalled();
    const body = await res.json();
    // 게이트 미통과여도 BTC 라이브가 합성되므로 BTC 가 포함.
    expect(body.some((t: { code: string }) => t.code === "BTC")).toBe(true);
  });

  it("[AC-8] 부분 성공 — BTC 실패해도 지수 4건", async () => {
    mocks.fetchBtcKrw.mockRejectedValue(new Error("429"));
    const res = await GET();
    const body = await res.json();
    expect(body.map((t: { code: string }) => t.code)).toEqual([
      "KOSPI",
      "KOSDAQ",
      "S&P 500",
      "NASDAQ",
    ]);
    expect(res.headers.get("X-Data-Source")).toBe("mixed");
  });

  it("[AC-8] 부분 성공 — 일부 지수 실패해도 나머지 + 순서 유지", async () => {
    mocks.fetchOverseasIndex.mockImplementation((code: string) => {
      if (code === "SPX") return Promise.reject(new Error("EGW00201"));
      return Promise.resolve(makeIndexQuote(code, 26_972.62));
    });
    const res = await GET();
    const body = await res.json();
    // SPX 누락, 나머지 상대 순서 유지.
    expect(body.map((t: { code: string }) => t.code)).toEqual([
      "KOSPI",
      "KOSDAQ",
      "NASDAQ",
      "BTC",
    ]);
  });

  it("[AC-7] 전체 실패(지수 전부 + BTC 실패) → mock degrade(X-Data-Source: mock)", async () => {
    mocks.fetchIndexPrice.mockRejectedValue(new Error("fail"));
    mocks.fetchOverseasIndex.mockRejectedValue(new Error("fail"));
    mocks.fetchBtcKrw.mockRejectedValue(new Error("fail"));
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Data-Source")).toBe("mock");
    const body = await res.json();
    // mock 5건 그대로.
    expect(body).toHaveLength(5);
    expect(body.map((t: { code: string }) => t.code)).toEqual([
      "KOSPI",
      "KOSDAQ",
      "S&P 500",
      "NASDAQ",
      "BTC",
    ]);
  });

  it("[AC-9] KIS 4콜 동시 난사 없음 — 2개씩 청크(동시 in-flight <= 2)", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const slow = (code: string) =>
      new Promise<MarketIndexQuote>((resolve) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        setTimeout(() => {
          inFlight -= 1;
          resolve(makeIndexQuote(code, 1));
        }, 5);
      });
    mocks.fetchIndexPrice.mockImplementation(slow);
    mocks.fetchOverseasIndex.mockImplementation(slow);
    await GET();
    // 2개씩 청크라 동시 in-flight 가 청크 크기(2)를 넘지 않는다.
    expect(maxInFlight).toBeLessThanOrEqual(2);
  });

  it("[AC-10] 캐시 — 연속 호출 시 KIS 실호출 1회(같은 소스 재호출 0)", async () => {
    await GET();
    const firstCalls =
      mocks.fetchIndexPrice.mock.calls.length +
      mocks.fetchOverseasIndex.mock.calls.length;
    await GET();
    const secondCalls =
      mocks.fetchIndexPrice.mock.calls.length +
      mocks.fetchOverseasIndex.mock.calls.length;
    // 두 번째 호출은 캐시 적중 → 추가 KIS 실호출 0.
    expect(secondCalls).toBe(firstCalls);
  });
});

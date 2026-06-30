/**
 * `app/api/market/indices/route.ts` 단위 테스트.
 *
 * PRD `market-real-data` AC-6 / AC-12 — 이중 게이트 + 부분 성공 회귀 차단:
 *   1. 키 미설정 → X-Data-Source: mock + MarketIndexQuote[] 본문.
 *   2. 키 설정 + env != prod → 무조건 mock (KIS 실호출 안 함).
 *   3. 두 게이트 통과 + 부분 실패 → 성공분만 반환, X-Data-Source: kis, 200 유지.
 *   4. 두 게이트 통과 + 전부 실패 → 502 + 한글 fallback.
 *
 * PRD `market-indices-consolidation` AC-3 / AC-4 / AC-7 — 라우트 하드닝:
 *   - 청크(2개씩) — codes 다수 시 동시 in-flight <= 2.
 *   - 서버 TTL 캐시 — 동일 codes 재요청 시 TTL 내 fetchIndexPrice 추가 호출 0.
 *   - resetIndicesCacheForTest 로 테스트 간 캐시 격리.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  isKisConfigured: vi.fn(),
  resolveKisEnv: vi.fn(),
  // 라우트는 L1 miss 시 fetchIndexPriceShared(L2 store 경유) 를 호출한다(kis-token-store §3.3).
  fetchIndexPrice: vi.fn(),
}));

vi.mock("@/lib/api/kis", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/kis")>(
    "@/lib/api/kis",
  );
  return {
    ...actual,
    isKisConfigured: mocks.isKisConfigured,
    resolveKisEnv: mocks.resolveKisEnv,
    // fetchIndexPriceShared 가 라우트의 실호출 진입점 — 기존 fetchIndexPrice 단언과 호환되도록
    // 같은 mock 으로 매핑(국내 0001/1001 외 코드도 본 mock 이 받는다 — store 미경유는 구현 내부).
    fetchIndexPriceShared: mocks.fetchIndexPrice,
  };
});

import { GET } from "../route";
import { resetIndicesCacheForTest } from "../cache";
import { makeApiError } from "@/lib/api/errors";
import type { MarketIndexQuote } from "@/lib/api/kis";

function makeRequest(query = ""): NextRequest {
  return new NextRequest(`http://localhost/api/market/indices${query}`);
}

function makeQuote(code: string): MarketIndexQuote {
  return {
    code,
    name: code,
    value: 1,
    change: 0,
    changePercent: 0,
    direction: "flat",
    volume: 0,
  };
}

describe("GET /api/market/indices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetIndicesCacheForTest();
    mocks.resolveKisEnv.mockReturnValue("prod");
  });

  it("[AC-6] 키 미설정 → mock 본문 + X-Data-Source: mock", async () => {
    mocks.isKisConfigured.mockReturnValue(false);
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Data-Source")).toBe("mock");
    expect(mocks.fetchIndexPrice).not.toHaveBeenCalled();
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.map((q: { code: string }) => q.code)).toEqual([
      "0001",
      "1001",
      "SPX",
      "COMP",
    ]);
  });

  it("[AC-12] 키 설정 + env != prod → mock (KIS 실호출 안 함)", async () => {
    mocks.isKisConfigured.mockReturnValue(true);
    mocks.resolveKisEnv.mockReturnValue("vts");
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Data-Source")).toBe("mock");
    expect(res.headers.get("X-KIS-Env")).toBe("vts");
    expect(mocks.fetchIndexPrice).not.toHaveBeenCalled();
  });

  it("[AC-12] 이중 게이트 통과 + 부분 실패 → 성공분만, kis, 200", async () => {
    mocks.isKisConfigured.mockReturnValue(true);
    mocks.resolveKisEnv.mockReturnValue("prod");
    mocks.fetchIndexPrice.mockImplementation((code: string) => {
      if (code === "1001") return Promise.reject(new Error("일시 오류"));
      return Promise.resolve(makeQuote(code));
    });
    const res = await GET(makeRequest("?codes=0001,1001,2001"));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Data-Source")).toBe("kis");
    expect(res.headers.get("X-KIS-Env")).toBe("prod");
    const body = await res.json();
    expect(body.map((q: { code: string }) => q.code)).toEqual(["0001", "2001"]);
  });

  it("이중 게이트 통과 + 전부 실패 → 502 + 한글 fallback", async () => {
    mocks.isKisConfigured.mockReturnValue(true);
    mocks.resolveKisEnv.mockReturnValue("prod");
    mocks.fetchIndexPrice.mockRejectedValue(
      makeApiError("server", { message: "전부 실패" }),
    );
    // 국내 코드만 요청해 '전부 실패'를 실제로 재현한다. 기본값(SPX/COMP 포함)으로 호출하면
    // 해외지수 경로(fetchOverseasIndexShared)는 mock 대상이 아니라 실네트워크로 성공해 200 이 돼버린다.
    const res = await GET(makeRequest("?codes=0001,1001"));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(typeof body.error).toBe("string");
    expect(body.error).toMatch(/불러오지 못했어요/);
  });

  it("[indices-consolidation AC-5] codes 순서를 응답에 보존(부분 성공)", async () => {
    mocks.isKisConfigured.mockReturnValue(true);
    mocks.resolveKisEnv.mockReturnValue("prod");
    // 호출 완료 순서를 codes 와 어긋나게(2001 먼저 resolve) 해도 응답 순서는 codes 기준.
    mocks.fetchIndexPrice.mockImplementation((code: string) => {
      const delayMs = code === "2001" ? 1 : 10;
      return new Promise<MarketIndexQuote>((resolve) =>
        setTimeout(() => resolve(makeQuote(code)), delayMs),
      );
    });
    const res = await GET(makeRequest("?codes=0001,1001,2001"));
    const body = await res.json();
    expect(body.map((q: { code: string }) => q.code)).toEqual([
      "0001",
      "1001",
      "2001",
    ]);
  });

  it("[indices-consolidation AC-3] 동시 in-flight 가 청크 크기(2)를 넘지 않는다", async () => {
    mocks.isKisConfigured.mockReturnValue(true);
    mocks.resolveKisEnv.mockReturnValue("prod");
    let inFlight = 0;
    let maxInFlight = 0;
    mocks.fetchIndexPrice.mockImplementation(
      (code: string) =>
        new Promise<MarketIndexQuote>((resolve) => {
          inFlight += 1;
          maxInFlight = Math.max(maxInFlight, inFlight);
          setTimeout(() => {
            inFlight -= 1;
            resolve(makeQuote(code));
          }, 5);
        }),
    );
    // codes 4개 → 2개씩 청크 → 동시 in-flight 최대 2.
    await GET(makeRequest("?codes=0001,1001,2001,2002"));
    expect(maxInFlight).toBeLessThanOrEqual(2);
    expect(mocks.fetchIndexPrice).toHaveBeenCalledTimes(4);
  });

  it("[indices-consolidation AC-4] 동일 codes 재요청 시 TTL 내 추가 KIS 호출 0(서버캐시)", async () => {
    mocks.isKisConfigured.mockReturnValue(true);
    mocks.resolveKisEnv.mockReturnValue("prod");
    mocks.fetchIndexPrice.mockImplementation((code: string) =>
      Promise.resolve(makeQuote(code)),
    );

    const first = await GET(makeRequest("?codes=0001,1001,2001"));
    expect(first.headers.get("X-Cache")).toBe("miss");
    const firstCalls = mocks.fetchIndexPrice.mock.calls.length;
    expect(firstCalls).toBe(3);

    const second = await GET(makeRequest("?codes=0001,1001,2001"));
    expect(second.status).toBe(200);
    expect(second.headers.get("X-Data-Source")).toBe("kis");
    expect(second.headers.get("X-Cache")).toBe("hit");
    // 두 번째 호출은 캐시 적중 → 추가 KIS 실호출 0.
    expect(mocks.fetchIndexPrice.mock.calls.length).toBe(firstCalls);
    const body = await second.json();
    expect(body.map((q: { code: string }) => q.code)).toEqual([
      "0001",
      "1001",
      "2001",
    ]);
  });

  it("[indices-consolidation AC-4] resetIndicesCacheForTest 후 다시 실호출(캐시 격리)", async () => {
    mocks.isKisConfigured.mockReturnValue(true);
    mocks.resolveKisEnv.mockReturnValue("prod");
    mocks.fetchIndexPrice.mockImplementation((code: string) =>
      Promise.resolve(makeQuote(code)),
    );

    await GET(makeRequest("?codes=0001"));
    expect(mocks.fetchIndexPrice.mock.calls.length).toBe(1);
    resetIndicesCacheForTest();
    await GET(makeRequest("?codes=0001"));
    // 캐시 비운 뒤라 다시 실호출.
    expect(mocks.fetchIndexPrice.mock.calls.length).toBe(2);
  });
});

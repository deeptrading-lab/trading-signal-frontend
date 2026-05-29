/**
 * `app/api/market/indices/route.ts` 단위 테스트.
 *
 * PRD `market-real-data` AC-6 / AC-12 — 이중 게이트 + 부분 성공 회귀 차단:
 *   1. 키 미설정 → X-Data-Source: mock + MarketIndexQuote[] 본문.
 *   2. 키 설정 + env != prod → 무조건 mock (KIS 실호출 안 함).
 *   3. 두 게이트 통과 + 부분 실패 → 성공분만 반환, X-Data-Source: kis, 200 유지.
 *   4. 두 게이트 통과 + 전부 실패 → 502 + 한글 fallback.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  isKisConfigured: vi.fn(),
  resolveKisEnv: vi.fn(),
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
    fetchIndexPrice: mocks.fetchIndexPrice,
  };
});

import { GET } from "../route";
import { makeApiError } from "@/lib/api/errors";

function makeRequest(query = ""): NextRequest {
  return new NextRequest(`http://localhost/api/market/indices${query}`);
}

describe("GET /api/market/indices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      "2001",
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
      return Promise.resolve({
        code,
        name: code,
        value: 1,
        change: 0,
        changePercent: 0,
        direction: "flat",
        volume: 0,
      });
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
    const res = await GET(makeRequest());
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(typeof body.error).toBe("string");
    expect(body.error).toMatch(/불러오지 못했어요/);
  });
});

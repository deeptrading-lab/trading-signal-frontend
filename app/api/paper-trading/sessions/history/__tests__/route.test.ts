/**
 * `/api/paper-trading/sessions/history` 라우트 테스트 — intraday-history-pagination.
 *
 * - limit+1 오버페치로 hasMore 판정(별도 count 쿼리 없음), 응답은 limit 건까지만.
 * - cli-agent 필터를 서버가 건다(클라 재필터 불필요).
 * - limit/offset clamp — 상한·하한·비수치 입력.
 * - Supabase 미설정 → 200 + configured:false(장애 아님) / 로드 실패 → 502.
 * - 모든 응답 no-store.
 *
 * persistence 는 mock. 로컬(비 Vercel)은 requireProdAdminApi 가 세션 없이 통과한다.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";
import { loadPersistedPaperTradingSessionSummaries } from "@/lib/server/paperTrading/persistence";
import { kstDateStartIso, todayKstDate } from "@/lib/api/toss/kst";
import type { PaperTradingSession } from "@/lib/types/paperTrading/paperTrading";

vi.mock("@/lib/server/paperTrading/persistence", () => ({
  loadPersistedPaperTradingSessionSummaries: vi.fn(),
}));

const mockLoad = vi.mocked(loadPersistedPaperTradingSessionSummaries);

function session(id: string): PaperTradingSession {
  return { id, status: "completed" } as unknown as PaperTradingSession;
}

function summaries(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    session: session(`s${i}`),
    positions: [],
  }));
}

function request(query = ""): NextRequest {
  return new NextRequest(`http://localhost:3000/api/paper-trading/sessions/history${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/paper-trading/sessions/history", () => {
  it("기본 페이지는 limit+1 을 cli-agent 로 조회하고 41건이면 40건 + hasMore 로 응답한다", async () => {
    mockLoad.mockResolvedValue({ status: "ok", sessions: summaries(41) });

    const res = await GET(request());
    const body = await res.json();

    expect(mockLoad).toHaveBeenCalledWith({
      limit: 41,
      offset: 0,
      decisionProvider: "cli-agent",
      // 오늘(KST) 00:00 경계 — 오늘 세션이 페이지 예산을 먹지 않게 서버가 잘라준다.
      startedBefore: kstDateStartIso(todayKstDate()),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(body.sessions).toHaveLength(40);
    expect(body.hasMore).toBe(true);
    expect(body.nextOffset).toBe(40);
    expect(body.configured).toBe(true);
    expect(Object.keys(body.positionsBySessionId)).toHaveLength(40);
  });

  it("마지막 페이지는 hasMore:false 이고 nextOffset 이 실제 건수만큼만 전진한다", async () => {
    mockLoad.mockResolvedValue({ status: "ok", sessions: summaries(7) });

    const body = await (await GET(request("?offset=40"))).json();

    expect(body.hasMore).toBe(false);
    expect(body.sessions).toHaveLength(7);
    expect(body.nextOffset).toBe(47);
  });

  it("limit·offset 을 상한/하한으로 clamp 한다", async () => {
    mockLoad.mockResolvedValue({ status: "ok", sessions: [] });

    await GET(request("?limit=999&offset=99999"));
    expect(mockLoad).toHaveBeenLastCalledWith(
      expect.objectContaining({ limit: 101, offset: 5_000 }),
    );

    await GET(request("?limit=-1&offset=-5"));
    expect(mockLoad).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 2, offset: 0 }));

    await GET(request("?limit=abc&offset=abc"));
    expect(mockLoad).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 41, offset: 0 }));
  });

  it("Supabase 미설정이면 장애가 아니라 configured:false 빈 페이지로 응답한다", async () => {
    mockLoad.mockResolvedValue({ status: "disabled" });

    const res = await GET(request("?offset=20"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      sessions: [],
      hasMore: false,
      nextOffset: 20,
      configured: false,
    });
  });

  it("로드 실패는 빈 내역으로 위장하지 않고 502 로 알린다", async () => {
    mockLoad.mockResolvedValue({ status: "error" });

    const res = await GET(request());

    expect(res.status).toBe(502);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect((await res.json()).error).toContain("불러오지 못했어요");
  });
});

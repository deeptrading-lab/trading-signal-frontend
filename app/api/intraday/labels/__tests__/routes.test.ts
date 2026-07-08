/**
 * `/api/intraday/labels/run`·`/summary` 라우트 테스트 — intraday-decision-overhaul PR-2.
 *
 * - role 게이트(requireProdAdminApi): prod(Vercel) 시뮬레이션에서 쿠키 없음/user → 403,
 *   admin → 통과. 로컬(비 Vercel)은 세션 없이 통과(/intraday 페이지 규칙 정합).
 * - run: 완료 cli-agent 세션만 대상, 기존 라벨 tick_id dedupe(라벨된 틱 제외), limit 초과분은
 *   remaining 으로 보고, 미설정 configured:false.
 * - summary: summarizeLabels 성공 200 / 예외 500.
 *
 * 엔진(tickLabels)·세션스토어는 mock, 세션 서명/검증은 실제(위조 role 차단 경로 포함).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as runPost } from "../run/route";
import { GET as summaryGet } from "../summary/route";
import {
  fetchLabeledTickIds,
  isTickLabelStoreConfigured,
  labelSessionTicks,
  summarizeLabels,
} from "@/lib/server/intraday/tickLabels";
import {
  getPaperTradingSessionDetail,
  listPaperTradingSessions,
} from "@/lib/server/paperTrading/sessionStore";
import { signIdentitySession } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import type {
  PaperTradingSession,
  PaperTradingSessionDetail,
  PaperTradingTick,
} from "@/lib/types/paperTrading/paperTrading";

vi.mock("@/lib/server/intraday/tickLabels", () => ({
  fetchLabeledTickIds: vi.fn(),
  isTickLabelStoreConfigured: vi.fn(() => true),
  labelSessionTicks: vi.fn(),
  summarizeLabels: vi.fn(),
}));
vi.mock("@/lib/server/paperTrading/sessionStore", () => ({
  getPaperTradingSessionDetail: vi.fn(),
  listPaperTradingSessions: vi.fn(),
}));

const mockConfigured = vi.mocked(isTickLabelStoreConfigured);
const mockLabeledIds = vi.mocked(fetchLabeledTickIds);
const mockLabelSession = vi.mocked(labelSessionTicks);
const mockSummarize = vi.mocked(summarizeLabels);
const mockList = vi.mocked(listPaperTradingSessions);
const mockDetail = vi.mocked(getPaperTradingSessionDetail);

const ORIGINAL_SECRET = process.env.APP_AUTH_SECRET;
const ORIGINAL_VERCEL = process.env.VERCEL;

beforeEach(() => {
  process.env.APP_AUTH_SECRET = "labels-secret-0123456789abcdef";
  mockConfigured.mockReturnValue(true);
  mockLabeledIds.mockResolvedValue(new Set());
  mockList.mockResolvedValue([]);
});

afterEach(() => {
  vi.clearAllMocks();
  if (ORIGINAL_SECRET === undefined) delete process.env.APP_AUTH_SECRET;
  else process.env.APP_AUTH_SECRET = ORIGINAL_SECRET;
  if (ORIGINAL_VERCEL === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = ORIGINAL_VERCEL;
});

function makeRequest(
  path: "run" | "summary",
  options?: { cookie?: string; body?: unknown },
): NextRequest {
  const headers = new Headers();
  if (options?.cookie) headers.set("cookie", `${SESSION_COOKIE_NAME}=${options.cookie}`);
  const init: { method: string; headers: Headers; body?: string } = {
    method: path === "run" ? "POST" : "GET",
    headers,
  };
  if (options?.body !== undefined) {
    headers.set("Content-Type", "application/json");
    init.body = JSON.stringify(options.body);
  }
  return new NextRequest(`http://localhost/api/intraday/labels/${path}`, init);
}

function makeSession(over: Partial<PaperTradingSession>): PaperTradingSession {
  return {
    id: "s1",
    status: "completed",
    decisionProvider: "cli-agent",
    tickers: ["005930"],
    stocks: [{ ticker: "005930", name: "삼성전자" }],
    tickIntervalMinutes: 5,
    ...over,
  } as PaperTradingSession;
}

function makeDetail(ticks: Array<{ id: string }>): PaperTradingSessionDetail {
  return { ticks: ticks as PaperTradingTick[] } as PaperTradingSessionDetail;
}

describe("role 게이트 — prod(Vercel) 시뮬레이션", () => {
  beforeEach(() => {
    process.env.VERCEL = "1";
  });

  it("쿠키 없음 → 403(run·summary)", async () => {
    expect((await runPost(makeRequest("run"))).status).toBe(403);
    expect((await summaryGet(makeRequest("summary"))).status).toBe(403);
    expect(mockList).not.toHaveBeenCalled();
    expect(mockSummarize).not.toHaveBeenCalled();
  });

  it("user role 세션 → 403", async () => {
    const token = (await signIdentitySession({
      sub: "u",
      email: "u@example.com",
      role: "user",
    })) as string;
    expect((await runPost(makeRequest("run", { cookie: token }))).status).toBe(403);
    expect((await summaryGet(makeRequest("summary", { cookie: token }))).status).toBe(403);
  });

  it("admin 세션 → 통과", async () => {
    const token = (await signIdentitySession({
      sub: "a",
      email: "a@example.com",
      role: "admin",
    })) as string;
    mockSummarize.mockResolvedValue({
      configured: true,
      total: 0,
      buckets: [],
      scoreBands: [],
      generatedAt: "2026-07-09T00:00:00.000Z",
    });
    expect((await runPost(makeRequest("run", { cookie: token }))).status).toBe(200);
    expect((await summaryGet(makeRequest("summary", { cookie: token }))).status).toBe(200);
  });
});

describe("POST /api/intraday/labels/run — 로컬(비 Vercel)은 세션 없이 통과", () => {
  it("Supabase 미설정 → configured:false + 0 집계(fail-soft)", async () => {
    mockConfigured.mockReturnValue(false);
    const res = await runPost(makeRequest("run"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      configured: false,
      labeled: 0,
      unresolved: 0,
      sessions: 0,
      remaining: 0,
    });
    expect(mockList).not.toHaveBeenCalled();
  });

  it("완료 cli-agent 세션만 대상 + 이미 라벨된 틱은 dedupe 로 제외", async () => {
    mockList.mockResolvedValue([
      makeSession({ id: "s1" }), // 대상 — t1 은 라벨됨, t2 만 채점
      makeSession({ id: "s2", status: "running" }), // running 제외
      makeSession({ id: "s3", decisionProvider: "mock" }), // provider 제외
      makeSession({ id: "s4" }), // 대상이지만 전량 라벨됨 → 건너뜀
    ]);
    mockLabeledIds.mockResolvedValue(new Set(["t1", "t4"]));
    mockDetail.mockImplementation(async (sessionId: string) =>
      sessionId === "s1" ? makeDetail([{ id: "t1" }, { id: "t2" }]) : makeDetail([{ id: "t4" }]),
    );
    mockLabelSession.mockResolvedValue({ labeled: 1, unresolved: 0, skipped: false });

    const res = await runPost(makeRequest("run"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      configured: true,
      labeled: 1,
      unresolved: 0,
      sessions: 1,
      remaining: 0,
    });
    // dedupe 쿼리는 완료 cli-agent 세션 id 만 대상으로 한다.
    expect(mockLabeledIds).toHaveBeenCalledWith(["s1", "s4"]);
    // 라벨링은 미라벨 틱(t2)만 넘긴다 — 두 번째 실행이 라벨된 틱을 건너뛰는 멱등 백필의 핵심.
    expect(mockLabelSession).toHaveBeenCalledTimes(1);
    const [sessionArg, ticksArg] = mockLabelSession.mock.calls[0];
    expect(sessionArg.id).toBe("s1");
    expect(ticksArg.map((t) => t.id)).toEqual(["t2"]);
  });

  it("limit 초과 세션은 remaining 으로 보고(반복 클릭 백필)", async () => {
    mockList.mockResolvedValue([
      makeSession({ id: "s1" }),
      makeSession({ id: "s2" }),
      makeSession({ id: "s3" }),
    ]);
    mockDetail.mockImplementation(async (sessionId: string) =>
      makeDetail([{ id: `${sessionId}-tick` }]),
    );
    mockLabelSession.mockResolvedValue({ labeled: 3, unresolved: 1, skipped: false });

    const res = await runPost(makeRequest("run", { body: { limit: 2 } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      labeled: 6,
      unresolved: 2,
      sessions: 2,
      remaining: 1,
    });
    expect(mockLabelSession).toHaveBeenCalledTimes(2);
  });

  it("엔진 skip(KIS 미설정 등 전역 조건) → 남은 세션 계상 후 중단", async () => {
    mockList.mockResolvedValue([makeSession({ id: "s1" }), makeSession({ id: "s2" })]);
    mockDetail.mockImplementation(async (sessionId: string) =>
      makeDetail([{ id: `${sessionId}-tick` }]),
    );
    mockLabelSession.mockResolvedValue({ labeled: 0, unresolved: 0, skipped: true });

    const res = await runPost(makeRequest("run"));
    expect(await res.json()).toMatchObject({ labeled: 0, sessions: 0, remaining: 1 });
    expect(mockLabelSession).toHaveBeenCalledTimes(1);
  });

  it("스토어 예외 → 500 + 한글 에러", async () => {
    mockList.mockRejectedValue(new Error("hydrate 실패"));
    const res = await runPost(makeRequest("run"));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain("라벨링 실행에 실패했어요");
  });
});

describe("GET /api/intraday/labels/summary", () => {
  it("summarizeLabels 결과를 그대로 반환", async () => {
    mockSummarize.mockResolvedValue({
      configured: true,
      total: 2,
      buckets: [
        {
          source: "intraday-cli",
          action: "HOLD",
          counts: { WIN: 1, LOSS: 1, NEUTRAL: 0, UNRESOLVED: 0 },
          total: 2,
          avgReturnPct: 0.75,
        },
      ],
      scoreBands: [],
      generatedAt: "2026-07-09T00:00:00.000Z",
    });
    const res = await summaryGet(makeRequest("summary"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(2);
    expect(body.buckets[0].avgReturnPct).toBeCloseTo(0.75, 6);
  });

  it("집계 예외 → 500 + 한글 에러", async () => {
    mockSummarize.mockRejectedValue(new Error("HTTP 500"));
    const res = await summaryGet(makeRequest("summary"));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain("라벨 집계를 불러오지 못했어요");
  });
});

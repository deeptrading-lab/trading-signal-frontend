/**
 * `/api/stock/ai-analysis/enqueue` 라우트 테스트 — analyze-owner-cards.
 *
 * - 미로그인 차단(requireProdSessionApi): prod(Vercel) 시뮬레이션에서 쿠키 없으면 401,
 *   로그인 세션이면 통과. 로컬(비 Vercel)은 세션 없이 통과(로컬 dev·워커 무마찰).
 * - 소유자 귀속: 세션 이메일이 requestedBy 로 큐에 실린다.
 *
 * 큐 스토어·KIS 는 mock, 세션 서명/검증은 실제.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";
import { enqueueAnalysis } from "@/lib/server/ai/queueStore";
import { readHeartbeat } from "@/lib/server/ai/workerHeartbeat";
import { signIdentitySession } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

vi.mock("@/lib/server/ai/queueStore", () => ({
  enqueueAnalysis: vi.fn(async () => ({ status: "queued", id: 1 })),
}));
vi.mock("@/lib/server/ai/workerHeartbeat", () => ({
  readHeartbeat: vi.fn(async () => null),
}));
vi.mock("@/lib/api/kis", () => ({ getSymbolName: vi.fn(async () => null) }));

const ORIGINAL_SECRET = process.env.APP_AUTH_SECRET;
const ORIGINAL_VERCEL = process.env.VERCEL;

beforeEach(() => {
  process.env.APP_AUTH_SECRET = "enqueue-secret-0123456789abcdef";
  delete process.env.VERCEL;
  vi.mocked(enqueueAnalysis).mockClear();
  vi.mocked(readHeartbeat).mockClear();
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.APP_AUTH_SECRET;
  else process.env.APP_AUTH_SECRET = ORIGINAL_SECRET;
  if (ORIGINAL_VERCEL === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = ORIGINAL_VERCEL;
});

function req(cookie?: string): NextRequest {
  return new NextRequest("http://localhost/api/stock/ai-analysis/enqueue", {
    method: "POST",
    headers: cookie ? { cookie } : undefined,
    body: JSON.stringify({ ticker: "005930" }),
  });
}

describe("enqueue — 미로그인 분석 실행 차단", () => {
  it("prod + 쿠키 없음 → 401, 큐에 적재하지 않는다", async () => {
    process.env.VERCEL = "1";
    const res = await POST(req());
    expect(res.status).toBe(401);
    expect(enqueueAnalysis).not.toHaveBeenCalled();
  });

  it("prod + 로그인 세션 → 통과하고 requestedBy 로 소유자를 실는다", async () => {
    process.env.VERCEL = "1";
    const token = await signIdentitySession({
      sub: "g-1",
      email: "me@x.com",
      role: "user",
    });
    const res = await POST(req(`${SESSION_COOKIE_NAME}=${token}`));
    expect(res.status).toBe(200);
    expect(enqueueAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ ticker: "005930", requestedBy: "me@x.com" }),
    );
  });

  it("로컬(비 Vercel)은 세션 없이 통과 — 로컬 dev·워커 무마찰", async () => {
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(enqueueAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ requestedBy: null }),
    );
  });
});

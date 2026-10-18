/**
 * `app/api/cron/score-decisions/route.ts` 단위 테스트.
 *
 * QA `scorecard-schedule-restore` (#390) — 예약 실행 복구 시 회귀 차단:
 *   1. CRON_SECRET 미일치/미설정 → 401, 채점·터치 미호출.
 *   2. KIS 미설정·비-prod → skip 200(`kis-not-prod`), 채점·터치 미호출.
 *   3. 채점 성공 → `{ok:true, backfill, result, touch}` + 터치 스캔 호출.
 *   4. 채점 실패 → `{ok:false, reason:"scoring-error", touch}` + 터치 스캔 호출.
 *   5. 터치 스캔 예외 → touch=null, 200 유지(성공·실패 두 경로).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  isKisConfigured: vi.fn(),
  resolveKisEnv: vi.fn(),
  relativeRunScoring: vi.fn(),
  runBackfillDecisions: vi.fn(),
  runTouchScan: vi.fn(),
  saveScorecardCronMeta: vi.fn(),
}));

vi.mock("@/lib/api/kis", () => ({
  isKisConfigured: mocks.isKisConfigured,
  resolveKisEnv: mocks.resolveKisEnv,
}));
vi.mock("@/lib/server/scorecard/relativeRunScoring", () => ({
  relativeRunScoring: mocks.relativeRunScoring,
}));
vi.mock("@/lib/server/scorecard/runBackfillDecisions", () => ({
  runBackfillDecisions: mocks.runBackfillDecisions,
}));
vi.mock("@/lib/server/scorecard/runTouchScan", () => ({
  runTouchScan: mocks.runTouchScan,
}));
vi.mock("@/lib/server/scorecard/scorecardCronMeta", () => ({
  saveScorecardCronMeta: mocks.saveScorecardCronMeta,
}));

import { GET } from "../route";

const SECRET = "test-secret";
const BACKFILL = {
  candidates: 0,
  inserted: 0,
  skippedNoAsOf: 0,
  skippedExists: 0,
  skippedNoEntry: 0,
  errors: 0,
};
const RESULT = { pending: 1, scored: 1, skipped: 0, backfilled: 0, errors: 0 };
const TOUCH = { candidates: 1, scanned: 1, targetHits: 0, stopHits: 0, completed: 0, errors: 0 };

function req(auth?: string): NextRequest {
  return new NextRequest("http://localhost/api/cron/score-decisions", {
    headers: auth ? { authorization: auth } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = SECRET;
  mocks.isKisConfigured.mockReturnValue(true);
  mocks.resolveKisEnv.mockReturnValue("prod");
  mocks.runBackfillDecisions.mockResolvedValue(BACKFILL);
  mocks.relativeRunScoring.mockResolvedValue(RESULT);
  mocks.runTouchScan.mockResolvedValue(TOUCH);
  mocks.saveScorecardCronMeta.mockResolvedValue(undefined);
});

describe("GET /api/cron/score-decisions", () => {
  it.each([[undefined], ["Bearer wrong"], [SECRET]])("인증 미일치(%s) → 401", async (auth) => {
    const res = await GET(req(auth));
    expect(res.status).toBe(401);
    expect(mocks.relativeRunScoring).not.toHaveBeenCalled();
    expect(mocks.runTouchScan).not.toHaveBeenCalled();
  });

  it("CRON_SECRET 미설정 → 401", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req("Bearer undefined"));
    expect(res.status).toBe(401);
  });

  it.each([
    [false, "prod"],
    [true, "mock"],
  ])("KIS configured=%s env=%s → skip 200", async (configured, env) => {
    mocks.isKisConfigured.mockReturnValue(configured);
    mocks.resolveKisEnv.mockReturnValue(env);
    const res = await GET(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: false, reason: "kis-not-prod", env });
    expect(mocks.relativeRunScoring).not.toHaveBeenCalled();
    expect(mocks.runTouchScan).not.toHaveBeenCalled();
  });

  it("채점 성공 → ok:true + backfill/result/touch", async () => {
    const res = await GET(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, backfill: BACKFILL, result: RESULT, touch: TOUCH });
    expect(mocks.runTouchScan).toHaveBeenCalledTimes(1);
  });

  it("채점 실패 → scoring-error + 터치 스캔은 실행", async () => {
    mocks.relativeRunScoring.mockRejectedValue(new Error("boom"));
    const res = await GET(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: false, reason: "scoring-error", touch: TOUCH });
    expect(mocks.runTouchScan).toHaveBeenCalledTimes(1);
  });

  it("backfill 실패 → backfill=null, 채점·터치 계속", async () => {
    mocks.runBackfillDecisions.mockRejectedValue(new Error("boom"));
    const body = await (await GET(req(`Bearer ${SECRET}`))).json();
    expect(body).toEqual({ ok: true, backfill: null, result: RESULT, touch: TOUCH });
  });

  it.each([
    ["성공", false],
    ["실패", true],
  ])("채점 %s 경로에서 터치 스캔 예외 → touch=null, 200 유지", async (_label, scoringFails) => {
    if (scoringFails) mocks.relativeRunScoring.mockRejectedValue(new Error("boom"));
    mocks.runTouchScan.mockRejectedValue(new Error("touch boom"));
    const res = await GET(req(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.touch).toBeNull();
    expect(body.ok).toBe(!scoringFails);
  });
});

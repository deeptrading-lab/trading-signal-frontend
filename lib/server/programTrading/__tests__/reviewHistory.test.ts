import { afterEach, expect, it, vi } from "vitest";
import type { PaperSessionReview } from "@/lib/types/programTrading/programTrading";
import { readPaperResult, savePaperResult, savePaperReviewEvent } from "../reviewHistory";

const report: PaperSessionReview = {
  lifecycle: {
    status: "completed", startedAt: "2026-11-10T00:10:00Z", finishedAt: "2026-11-10T06:20:00Z",
    beforeBalance: 10_000_000, afterBalance: 10_000_000, returnPct: 0, targetReturnPct: 1, reviewDecision: "review",
  },
  balanceChange: 0, ledgerNet: 0, realized: 0, closedTrades: 0, decision: "review", proposals: [],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("syncs idempotently and keeps evaluations and applied improvements separate", async () => {
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "fixture");
  vi.stubEnv("SUPABASE_EGRESS_DISABLED", "0");
  const send = vi.fn<typeof fetch>()
    .mockImplementation(async (_url, options) => options?.method === "POST"
      ? new Response(null, { status: 201 })
      : Response.json([{ result: report }]));
  vi.stubGlobal("fetch", send);

  const id = await savePaperResult(report);
  expect(await savePaperResult(report)).toBe(id);
  expect(await readPaperResult(id)).toEqual(report);
  await savePaperReviewEvent(id, { kind: "evaluation", score: 64, details: { proposals: ["시세 실패 원인 기록"] } });
  await savePaperReviewEvent(id, { kind: "applied", details: { revision: "a1b2c3d", description: "진단 로그 추가" } });

  const [[firstUrl, first], [secondUrl, second], , [evaluationUrl, evaluation], [appliedUrl, applied]] = send.mock.calls;
  expect(firstUrl).toEqual(secondUrl);
  expect(first).toMatchObject({ headers: { Prefer: "resolution=ignore-duplicates,return=minimal" } });
  expect(first?.body).toBe(second?.body);
  expect(evaluationUrl).toEqual(appliedUrl);
  expect(JSON.parse(String(evaluation?.body))).toMatchObject({ session_id: id, kind: "evaluation", score: 64 });
  expect(JSON.parse(String(applied?.body))).toMatchObject({ session_id: id, kind: "applied" });
});

it("keeps a non-completed session off the network", async () => {
  const send = vi.fn();
  vi.stubGlobal("fetch", send);
  await expect(savePaperResult({ ...report, lifecycle: { ...report.lifecycle, status: "stopping" } }))
    .rejects.toThrow("종료한 세션만");
  expect(send).not.toHaveBeenCalled();
});

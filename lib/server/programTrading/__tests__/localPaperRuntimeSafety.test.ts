import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { TradingState } from "@/lib/types/programTrading/programTrading";
import { initialState } from "../engine";

const mocks = vi.hoisted(() => ({
  saved: "", record: vi.fn(), report: vi.fn(), reconcile: vi.fn(), writeFile: vi.fn(),
  loadCandidates: vi.fn(), step: vi.fn(), calendar: vi.fn(),
}));
vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  rename: vi.fn().mockResolvedValue(undefined),
  writeFile: mocks.writeFile,
  readFile: vi.fn().mockImplementation(() => Promise.resolve(mocks.saved)),
}));
vi.mock("../journal", () => ({ openJournal: vi.fn().mockImplementation(async () => ({ record: mocks.record, report: mocks.report, reconcile: mocks.reconcile })) }));
vi.mock("../reviewHistory", () => ({ savePaperResult: vi.fn() }));
vi.mock("../sessionStorage", () => ({ paperArchiveDirectory: "mock-archive", paperSessionDirectory: "mock-paper", trimPaperReviews: vi.fn().mockResolvedValue(undefined) }));
vi.mock("../recommendationCandidates", () => ({ loadRecommendationCandidates: mocks.loadCandidates }));
vi.mock("../tossPaper", () => ({
  requireTossPaperConfig: vi.fn(), stepTossPaper: mocks.step, tossPaperSession: mocks.calendar,
  minuteInKorea: () => 600,
}));

const registry = globalThis as typeof globalThis & { localTossPaperRuntime?: unknown };
const now = Date.parse("2026-11-19T01:00:00Z");
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  delete registry.localTossPaperRuntime;
  vi.clearAllMocks();
  const state = initialState();
  state.executionMode = "toss-paper";
  state.running = true;
  state.updatedAt = new Date(now).toISOString();
  state.lastStepAt = now;
  state.lifecycle = { status: "running", startedAt: state.updatedAt, finishedAt: null, beforeBalance: state.initial, afterBalance: null, returnPct: null, targetReturnPct: 1, reviewDecision: "pending" };
  state.positions = [{ ticker: "005930", quantity: 10, entry: 10_000, mark: 10_000, bidMark: 10_000, enteredAt: now, lastFreshAt: now }];
  state.cash -= 100_015;
  mocks.saved = JSON.stringify(state);
  mocks.writeFile.mockResolvedValue(undefined);
  mocks.record.mockResolvedValue(undefined);
  mocks.report.mockResolvedValue(undefined);
  mocks.loadCandidates.mockImplementation(async () => ({ status: "ready", rows: [{ ticker: "005930", name: "삼성전자", price: 10_000, changePercent: 1, previousClose: 9_900, sources: ["volume"] }], checkedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 120_000).toISOString() }));
  mocks.calendar.mockResolvedValue({ date: "2026-11-19", start: now - 3_600_000, end: now + 20_000_000, close: now + 19_000_000, minute: 600, canStart: true, open: true, holiday: false });
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  delete registry.localTossPaperRuntime;
});

it("외부 시세 IO가 멈추고 후보가 갱신돼도 live 공백 종료를 보존한다", async () => {
  let resolveDraft!: (changed: boolean) => void;
  mocks.step.mockImplementationOnce((draft: TradingState) => {
    // A late result attempts to restore the running state; its revision is obsolete.
    draft.running = true;
    if (draft.lifecycle) draft.lifecycle.status = "running";
    return new Promise<boolean>(resolve => { resolveDraft = resolve; });
  });
  mocks.step.mockResolvedValue(false);
  const { getLocalPaperRuntime } = await import("../localPaperRuntime");
  const runtime = await getLocalPaperRuntime();
  await vi.advanceTimersByTimeAsync(1);
  expect(mocks.step).toHaveBeenCalledTimes(1);

  await vi.advanceTimersByTimeAsync(29_998);
  let snapshot = await runtime.snapshot();
  expect(snapshot.lifecycle?.status).toBe("running");

  await vi.advanceTimersByTimeAsync(1);
  snapshot = await runtime.snapshot();
  expect(snapshot).toMatchObject({ running: false, killed: true, lifecycle: { status: "stopping", stopCause: "data-gap" } });
  expect(snapshot.positions).toHaveLength(1);
  expect(mocks.record).toHaveBeenCalled();

  // The real 60-second ranking refresh/apply path mutates the revision too.
  await vi.advanceTimersByTimeAsync(30_000);
  expect(mocks.loadCandidates).toHaveBeenCalled();
  resolveDraft(true);
  await vi.advanceTimersByTimeAsync(1);
  snapshot = await runtime.snapshot();
  expect(snapshot.lifecycle?.status).toBe("completed");
  expect(snapshot.lifecycle?.stopCause).toBe("data-gap");
  expect(snapshot.positions).toHaveLength(0);
  expect(snapshot.trades.at(-1)?.reason).toBe("timeout");
  expect(snapshot.running).toBe(false);
  expect(snapshot.lifecycle?.forcedAt).toBeDefined();
});

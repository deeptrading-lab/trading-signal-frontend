import { describe, it, expect } from "vitest";
import { mergeActiveJobs } from "@/lib/server/ai/inflightMerge";
import type { AnalysisJobSource, AnalysisQueueRow, AnalysisQueueStatus } from "@/lib/types/stock/analysisQueue";
import type { AIDecisionListItem } from "@/lib/types/stock/aiAnalysisDecisions";

/** 합성은 item.ticker 만 읽고 나머지는 spread — decision 본체는 최소 스텁으로 충분. */
function decided(ticker: string): AIDecisionListItem {
  return {
    ticker,
    provider: "claude",
    decision: {},
    sentiment: null,
    signal: null,
    updatedAt: "2026-06-29T00:00:00Z",
    tokens: null,
  } as unknown as AIDecisionListItem;
}

function job(
  ticker: string,
  status: AnalysisQueueStatus,
  source: AnalysisJobSource = "local",
  createdAt = "2026-06-29T01:00:00Z",
): AnalysisQueueRow {
  return {
    id: Math.floor(createdAt.length),
    ticker,
    status,
    force: false,
    source,
    workerId: null,
    error: null,
    requestedBy: null,
    createdAt,
    claimedAt: null,
    finishedAt: null,
  };
}

describe("mergeActiveJobs", () => {
  it("결과 없음 + 활성 작업 없음 → 빈 합성", () => {
    const out = mergeActiveJobs([], []);
    expect(out.items).toEqual([]);
    expect(out.inflight).toEqual([]);
  });

  it("완료 결과 있고 활성 작업 없음 → reanalysis null, inflight 없음", () => {
    const out = mergeActiveJobs([decided("005930")], []);
    expect(out.items).toHaveLength(1);
    expect(out.items[0].reanalysis).toBeNull();
    expect(out.inflight).toEqual([]);
  });

  it("재분석 중(완료 결과 있는 ticker 가 활성) → item.reanalysis 표시, 플레이스홀더 제외", () => {
    const out = mergeActiveJobs(
      [decided("005930")],
      [job("005930", "processing", "prod")],
    );
    expect(out.items[0].reanalysis).toEqual({ status: "processing", source: "prod" });
    expect(out.inflight).toEqual([]); // 완료 결과에 흡수
  });

  it("첫 분석(완료 결과 없는 활성) → inflight 플레이스홀더", () => {
    const out = mergeActiveJobs(
      [],
      [job("000660", "pending", "local", "2026-06-29T02:00:00Z")],
    );
    expect(out.items).toEqual([]);
    expect(out.inflight).toEqual([
      { ticker: "000660", status: "pending", source: "local", createdAt: "2026-06-29T02:00:00Z" },
    ]);
  });

  it("같은 ticker 활성 2건 → ticker 당 1건(최신순 첫 등장)으로 축약", () => {
    const out = mergeActiveJobs(
      [],
      [
        job("000660", "processing", "local", "2026-06-29T03:00:00Z"), // 최신(첫 등장)
        job("000660", "pending", "bot", "2026-06-29T01:00:00Z"),
      ],
    );
    expect(out.inflight).toHaveLength(1);
    expect(out.inflight[0]).toMatchObject({ ticker: "000660", status: "processing", source: "local" });
  });

  it("혼합 — 재분석 중 1 + 안정 1 + 첫 분석 1", () => {
    const out = mergeActiveJobs(
      [decided("005930"), decided("035720")],
      [job("005930", "processing", "prod"), job("000660", "pending", "bot")],
    );
    const byTicker = Object.fromEntries(out.items.map((it) => [it.ticker, it.reanalysis]));
    expect(byTicker["005930"]).toEqual({ status: "processing", source: "prod" });
    expect(byTicker["035720"]).toBeNull();
    expect(out.inflight).toHaveLength(1);
    expect(out.inflight[0].ticker).toBe("000660");
  });
});

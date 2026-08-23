/**
 * 결정 원장 → 채점 원장 backfill 로직 단위 테스트 — PRD `scorecard-backfill-decisions`.
 *
 * 주입 deps + fixture 로 검증:
 *  - asOf 없는 결정 skip(복원 불가, insert 안 함).
 *  - 이미 (ticker, entry_date) 존재 → 멱등 skip.
 *  - entry 복원 성공 시 insert payload 정확성(verdict/confidence/signal/target/stop/entry/decided/bench).
 *  - asOf 봉 부재/fetch 실패 → insert 안 함(다음 패스 재시도).
 *  - 재실행 멱등(2회차 insert 0).
 *  - 같은 패스 안 중복 후보 1회만 insert.
 *  - 결정 단위 fail-soft(한 건 throw 가 나머지를 막지 않음).
 */

import { describe, it, expect } from "vitest";
import {
  backfillScorecardFromDecisions,
  existsKey,
  type BackfillDecisionsDeps,
} from "@/lib/server/scorecard/backfillDecisions";
import type { StockDailyCandle } from "@/lib/api/kis/types";
import type {
  AIAnalysisDecisionSnapshot,
  DecisionSignal,
  FinalDecision,
} from "@/lib/types/stock/aiAnalysis";
import type { ScorecardInsert, ScorecardWriteResult } from "@/lib/types/scorecard/scorecard";

function candle(date: string, close: number): StockDailyCandle {
  return { date, open: close, high: close, low: close, close, volume: 1000 };
}

function makeDecision(
  overrides: {
    ticker?: string;
    asOf?: string | null;
    verdict?: FinalDecision["verdict"];
    confidence?: FinalDecision["confidence"];
    targetPct?: number | null;
    stopLossPct?: number;
    score?: number;
    action?: DecisionSignal["action"];
    updatedAt?: string;
  } = {},
): AIAnalysisDecisionSnapshot {
  const decision: FinalDecision = {
    verdict: overrides.verdict ?? "BUY",
    reasoning: "r",
    key_strengths: [],
    key_risks: [],
    confidence: overrides.confidence ?? "HIGH",
    time_horizon: "중기",
    new_entry_strategy: "",
    holder_strategy: "",
    target_pct: overrides.targetPct ?? 10,
    stop_loss_pct: overrides.stopLossPct ?? -5,
    risk_reward_ratio: 2,
    short_term_outlook: "",
    mid_term_outlook: "",
    limitedData: false,
    bars: 200,
  };
  const signal: DecisionSignal | null =
    overrides.asOf === null
      ? null
      : {
          score: overrides.score ?? 70,
          action: overrides.action ?? "BUY",
          confidence: 0.8,
          regime: 1,
          axes: [],
          asOf: overrides.asOf ?? "2026-06-19",
        };
  return {
    ticker: overrides.ticker ?? "017670",
    name: null,
    provider: "claude",
    decision,
    sentiment: null,
    signal,
    requestedBy: "",
  updatedAt: overrides.updatedAt ?? "2026-06-19T07:00:00.000Z",
  };
}

function buildDeps(opts: {
  decisions: AIAnalysisDecisionSnapshot[];
  existingKeys?: Set<string>;
  stockByTicker?: Record<string, StockDailyCandle[]>;
  benchByTicker?: Record<string, string>;
  throwStockTickers?: Set<string>;
  insertResult?: (input: ScorecardInsert) => ScorecardWriteResult;
}): { deps: BackfillDecisionsDeps; inserts: ScorecardInsert[] } {
  const inserts: ScorecardInsert[] = [];
  const deps: BackfillDecisionsDeps = {
    getDecisions: async () => opts.decisions.map((d) => structuredClone(d)),
    getExistingKeys: async () => new Set(opts.existingKeys ?? []),
    fetchStockDaily: async (ticker) => {
      if (opts.throwStockTickers?.has(ticker)) throw new Error("종목 조회 실패(mock)");
      return opts.stockByTicker?.[ticker] ?? [];
    },
    resolveBench: (ticker) => opts.benchByTicker?.[ticker] ?? "0001",
    insertRow: async (input) => {
      inserts.push(structuredClone(input));
      return opts.insertResult ? opts.insertResult(input) : { ok: true, skipped: false };
    },
  };
  return { deps, inserts };
}

describe("backfillScorecardFromDecisions", () => {
  it("asOf 있는 결정의 봉 종가로 entry 복원해 멱등 append (payload 정확)", async () => {
    const { deps, inserts } = buildDeps({
      decisions: [
        makeDecision({
          ticker: "017670",
          asOf: "2026-06-19",
          verdict: "OVERWEIGHT",
          confidence: "MEDIUM",
          targetPct: 8,
          stopLossPct: -4,
          score: 62,
          action: "BUY",
          updatedAt: "2026-06-19T06:30:00.000Z",
        }),
      ],
      stockByTicker: {
        "017670": [candle("2026-06-18", 50000), candle("2026-06-19", 51000)],
      },
      benchByTicker: { "017670": "0001" },
    });

    const res = await backfillScorecardFromDecisions(deps);

    expect(res.inserted).toBe(1);
    expect(res.candidates).toBe(1);
    expect(res.skippedNoAsOf).toBe(0);
    expect(res.skippedExists).toBe(0);
    expect(res.skippedNoEntry).toBe(0);
    expect(res.errors).toBe(0);

    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({
      ticker: "017670",
      provider: "claude",
      verdict: "OVERWEIGHT",
      decisionConfidence: "MEDIUM",
      signalScore: 62,
      signalAction: "BUY",
      targetPct: 8,
      stopLossPct: -4,
      entryClose: 51000, // asOf(6/19) 봉 종가
      entryDate: "2026-06-19",
      livePrice: null,
      decidedAt: "2026-06-19T06:30:00.000Z", // updated_at
      runId: null,
      benchKey: "0001",
    });
  });

  it("asOf 없는 결정은 skip — insert 안 함(복원 불가)", async () => {
    const { deps, inserts } = buildDeps({
      decisions: [makeDecision({ ticker: "005930", asOf: null })],
      stockByTicker: { "005930": [candle("2026-06-19", 70000)] },
    });

    const res = await backfillScorecardFromDecisions(deps);

    expect(res.skippedNoAsOf).toBe(1);
    expect(res.candidates).toBe(0);
    expect(res.inserted).toBe(0);
    expect(inserts).toHaveLength(0);
  });

  it("이미 (ticker, entry_date) 존재 → 멱등 skip(중복 insert 0)", async () => {
    const { deps, inserts } = buildDeps({
      decisions: [makeDecision({ ticker: "042700", asOf: "2026-06-19" })],
      existingKeys: new Set([existsKey("042700", "2026-06-19")]),
      stockByTicker: { "042700": [candle("2026-06-19", 30000)] },
    });

    const res = await backfillScorecardFromDecisions(deps);

    expect(res.skippedExists).toBe(1);
    expect(res.candidates).toBe(0);
    expect(res.inserted).toBe(0);
    expect(inserts).toHaveLength(0);
  });

  it("asOf 봉 부재 → insert 안 함(다음 패스 재시도)", async () => {
    const { deps, inserts } = buildDeps({
      decisions: [makeDecision({ ticker: "329180", asOf: "2026-06-19" })],
      // 6/19 봉이 없음(다른 날짜만).
      stockByTicker: { "329180": [candle("2026-06-17", 12000), candle("2026-06-18", 12100)] },
    });

    const res = await backfillScorecardFromDecisions(deps);

    expect(res.skippedNoEntry).toBe(1);
    expect(res.candidates).toBe(1);
    expect(res.inserted).toBe(0);
    expect(inserts).toHaveLength(0);
  });

  it("entry 종가 0/음수 → insert 안 함(잘못된 entry 오염 방지)", async () => {
    const { deps, inserts } = buildDeps({
      decisions: [makeDecision({ ticker: "194370", asOf: "2026-06-19" })],
      stockByTicker: { "194370": [candle("2026-06-19", 0)] },
    });

    const res = await backfillScorecardFromDecisions(deps);

    expect(res.skippedNoEntry).toBe(1);
    expect(res.inserted).toBe(0);
    expect(inserts).toHaveLength(0);
  });

  it("종목 일봉 fetch 실패 → insert 안 함(결정 단위 fail-soft, 나머지는 계속)", async () => {
    const { deps, inserts } = buildDeps({
      decisions: [
        makeDecision({ ticker: "010120", asOf: "2026-06-19" }), // 실패
        makeDecision({ ticker: "017670", asOf: "2026-06-19" }), // 성공
      ],
      stockByTicker: { "017670": [candle("2026-06-19", 51000)] },
      throwStockTickers: new Set(["010120"]),
    });

    const res = await backfillScorecardFromDecisions(deps);

    expect(res.errors).toBe(1); // 010120 catch
    expect(res.inserted).toBe(1); // 017670 성공
    expect(inserts).toHaveLength(1);
    expect(inserts[0].ticker).toBe("017670");
  });

  it("재실행 멱등 — 1회차 insert 후 2회차는 insert 0", async () => {
    const decisions = [makeDecision({ ticker: "017670", asOf: "2026-06-19" })];
    const stockByTicker = { "017670": [candle("2026-06-19", 51000)] };

    // 1회차: 기존 키 없음 → insert.
    const first = buildDeps({ decisions, stockByTicker });
    const res1 = await backfillScorecardFromDecisions(first.deps);
    expect(res1.inserted).toBe(1);

    // 2회차: 1회차에서 들어간 키를 기존 키로 전달 → 멱등 skip.
    const second = buildDeps({
      decisions,
      stockByTicker,
      existingKeys: new Set([existsKey("017670", "2026-06-19")]),
    });
    const res2 = await backfillScorecardFromDecisions(second.deps);
    expect(res2.inserted).toBe(0);
    expect(res2.skippedExists).toBe(1);
    expect(second.inserts).toHaveLength(0);
  });

  it("같은 패스 내 동일 (ticker, asOf) 중복 후보는 1회만 insert", async () => {
    const { deps, inserts } = buildDeps({
      decisions: [
        makeDecision({ ticker: "017670", asOf: "2026-06-19" }),
        makeDecision({ ticker: "017670", asOf: "2026-06-19" }), // 중복
      ],
      stockByTicker: { "017670": [candle("2026-06-19", 51000)] },
    });

    const res = await backfillScorecardFromDecisions(deps);

    expect(res.inserted).toBe(1);
    expect(res.skippedExists).toBe(1); // 2번째는 같은 패스 중복으로 skip
    expect(inserts).toHaveLength(1);
  });

  it("Supabase 미설정(insert skipped) → inserted 아님(errors 카운트, 멱등키 미마킹)", async () => {
    const { deps, inserts } = buildDeps({
      decisions: [makeDecision({ ticker: "017670", asOf: "2026-06-19" })],
      stockByTicker: { "017670": [candle("2026-06-19", 51000)] },
      insertResult: () => ({ ok: true, skipped: true, reason: "not_configured" }),
    });

    const res = await backfillScorecardFromDecisions(deps);

    expect(res.inserted).toBe(0);
    expect(res.errors).toBe(1);
    expect(inserts).toHaveLength(1); // insert 시도는 됨
  });

  it("결정 0건 → 빈 결과(early return)", async () => {
    const { deps, inserts } = buildDeps({ decisions: [] });
    const res = await backfillScorecardFromDecisions(deps);
    expect(res.candidates).toBe(0);
    expect(res.inserted).toBe(0);
    expect(inserts).toHaveLength(0);
  });
});

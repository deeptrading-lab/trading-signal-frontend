/**
 * 채점 cron 로직 단위 테스트 — PRD `signal-scorecard` AC-4 / AC-5 / AC-6 / AC-10.
 *
 * 고정 캔들 fixture + 주입 deps 로 적중 판정·결정론(재실행 안전)·미도래 pending·fail-soft 검증.
 * 외부 의존(일봉 조회·행 조회·갱신·now)을 모두 주입해 순수하게 돌린다.
 */

import { describe, it, expect } from "vitest";
import { scoreDecisions } from "@/lib/server/scorecard/scoreDecisions";
import type {
  HorizonScoreUpdate,
  ScorecardHorizon,
  ScorecardRow,
} from "@/lib/types/scorecard/scorecard";
import type { StockDailyCandle } from "@/lib/api/kis/types";

// ── fixture 헬퍼 ───────────────────────────────────────────────────────────────

function candle(date: string, close: number): StockDailyCandle {
  return { date, open: close, high: close, low: close, close, volume: 1000 };
}

/** entry_date 2026-06-01(월) 기준 행. 모든 horizon pending. */
function makeRow(overrides: Partial<ScorecardRow> = {}): ScorecardRow {
  return {
    id: "row-1",
    ticker: "005930",
    provider: "claude",
    verdict: "BUY",
    decisionConfidence: "HIGH",
    signalScore: 70,
    signalAction: "BUY",
    targetPct: 10,
    stopLossPct: -5,
    entryClose: 100,
    entryDate: "2026-06-01",
    livePrice: 100,
    decidedAt: "2026-06-01T07:00:00.000Z",
    runId: "run-1",
    d1Status: "pending",
    d1Close: null,
    d1ReturnPct: null,
    d1ScoredAt: null,
    d1BenchReturnPct: null,
    d1ExcessReturnPct: null,
    d1Beta: null,
    d1AlphaResidualPct: null,
    d1Regime: null,
    w1Status: "pending",
    w1Close: null,
    w1ReturnPct: null,
    w1ScoredAt: null,
    w1BenchReturnPct: null,
    w1ExcessReturnPct: null,
    w1Beta: null,
    w1AlphaResidualPct: null,
    w1Regime: null,
    m1Status: "pending",
    m1Close: null,
    m1ReturnPct: null,
    m1ScoredAt: null,
    m1BenchReturnPct: null,
    m1ExcessReturnPct: null,
    m1Beta: null,
    m1AlphaResidualPct: null,
    m1Regime: null,
    benchKey: null,
    createdAt: "2026-06-01T07:00:00.000Z",
    ...overrides,
  };
}

type Update = { id: string; horizon: ScorecardHorizon; update: HorizonScoreUpdate };

/** 갱신을 메모리에 적용하면서 기록하는 deps 빌더. now 고정. */
function buildDeps(opts: {
  rows: ScorecardRow[];
  candlesByTicker: Record<string, StockDailyCandle[]>;
  nowIso: string;
  throwTickers?: Set<string>;
}) {
  const updates: Update[] = [];
  // 행을 복제해 in-place 갱신(재실행 결정론 검증용).
  const rowMap = new Map(opts.rows.map((r) => [r.id, structuredClone(r)]));

  const deps = {
    getPendingRows: async () =>
      [...rowMap.values()].filter(
        (r) =>
          r.d1Status === "pending" || r.w1Status === "pending" || r.m1Status === "pending",
      ),
    fetchDaily: async (ticker: string) => {
      if (opts.throwTickers?.has(ticker)) throw new Error("KIS 조회 실패(mock)");
      return opts.candlesByTicker[ticker] ?? [];
    },
    updateHorizon: async (
      id: string,
      horizon: ScorecardHorizon,
      update: HorizonScoreUpdate,
    ) => {
      updates.push({ id, horizon, update });
      const row = rowMap.get(id);
      if (row) {
        if (horizon === "d1") {
          row.d1Status = update.status;
          row.d1Close = update.close;
          row.d1ReturnPct = update.returnPct;
          row.d1ScoredAt = update.scoredAt;
        } else if (horizon === "w1") {
          row.w1Status = update.status;
          row.w1Close = update.close;
          row.w1ReturnPct = update.returnPct;
          row.w1ScoredAt = update.scoredAt;
        } else {
          row.m1Status = update.status;
          row.m1Close = update.close;
          row.m1ReturnPct = update.returnPct;
          row.m1ScoredAt = update.scoredAt;
        }
      }
      return { ok: true };
    },
    now: () => new Date(opts.nowIso),
    delay: async () => {},
  };

  return { deps, updates, rowMap };
}

// 2026-06-01(월) entry. d1=+1영업일(06-02 화), w1=+5영업일(06-08 월), m1=+21영업일(06-30 화).
// 모든 horizon 도래하도록 now 를 충분히 뒤(2026-08-01)로 둔다.
const FAR_FUTURE = "2026-08-01T08:00:00.000Z";

describe("scoreDecisions — AC-4 적중 판정 정확성", () => {
  it("BUY, +1d 종가 103(+3%, T=2) → d1 hit, return≈3, close=103, scored_at 기록", async () => {
    const row = makeRow();
    const { deps, rowMap } = buildDeps({
      rows: [row],
      candlesByTicker: {
        "005930": [
          candle("2026-06-01", 100),
          candle("2026-06-02", 103), // +1d
          candle("2026-06-08", 100), // +1w
          candle("2026-06-30", 100), // +1m
        ],
      },
      nowIso: FAR_FUTURE,
    });

    const res = await scoreDecisions(deps);
    const updated = rowMap.get("row-1")!;
    expect(updated.d1Status).toBe("hit");
    expect(updated.d1Close).toBe(103);
    expect(updated.d1ReturnPct).toBeCloseTo(3, 6);
    expect(updated.d1ScoredAt).toBeTruthy();
    expect(res.hit).toBeGreaterThanOrEqual(1);
  });

  it("BUY, +1d 종가 98(-2%) → d1 miss", async () => {
    const row = makeRow();
    const { deps, rowMap } = buildDeps({
      rows: [row],
      candlesByTicker: {
        "005930": [candle("2026-06-01", 100), candle("2026-06-02", 98)],
      },
      nowIso: FAR_FUTURE,
    });
    await scoreDecisions(deps);
    expect(rowMap.get("row-1")!.d1Status).toBe("miss");
  });

  it("SELL, +1d 종가 97(-3%) → d1 hit (부호 반대)", async () => {
    const row = makeRow({ verdict: "SELL" });
    const { deps, rowMap } = buildDeps({
      rows: [row],
      candlesByTicker: {
        "005930": [candle("2026-06-01", 100), candle("2026-06-02", 97)],
      },
      nowIso: FAR_FUTURE,
    });
    await scoreDecisions(deps);
    expect(rowMap.get("row-1")!.d1Status).toBe("hit");
  });

  it("BUY, +1d 종가 101(+1%, 밴드 내) → d1 flat", async () => {
    const row = makeRow();
    const { deps, rowMap } = buildDeps({
      rows: [row],
      candlesByTicker: {
        "005930": [candle("2026-06-01", 100), candle("2026-06-02", 101)],
      },
      nowIso: FAR_FUTURE,
    });
    await scoreDecisions(deps);
    expect(rowMap.get("row-1")!.d1Status).toBe("flat");
  });

  it("평가일이 휴장이면 직후 가장 가까운 영업봉 종가 사용", async () => {
    // 06-02(화) 봉 부재, 06-03(수) 봉 존재 → d1 은 06-03 종가로 채점.
    const row = makeRow();
    const { deps, rowMap } = buildDeps({
      rows: [row],
      candlesByTicker: {
        "005930": [candle("2026-06-01", 100), candle("2026-06-03", 104)],
      },
      nowIso: FAR_FUTURE,
    });
    await scoreDecisions(deps);
    expect(rowMap.get("row-1")!.d1Status).toBe("hit");
    expect(rowMap.get("row-1")!.d1Close).toBe(104);
  });
});

describe("scoreDecisions — AC-5 결정론·재실행·미도래 pending", () => {
  it("이미 hit 인 horizon 은 재채점하지 않는다(결정론)", async () => {
    const row = makeRow();
    const candles = {
      "005930": [candle("2026-06-01", 100), candle("2026-06-02", 103)],
    };
    const { deps, rowMap, updates } = buildDeps({
      rows: [row],
      candlesByTicker: candles,
      nowIso: FAR_FUTURE,
    });

    await scoreDecisions(deps); // 1회차
    const d1AfterFirst = rowMap.get("row-1")!.d1Status;
    const updateCountAfterFirst = updates.filter((u) => u.horizon === "d1").length;

    await scoreDecisions(deps); // 2회차 — d1 은 더 이상 pending 아님 → 재채점 없음
    const d1AfterSecond = rowMap.get("row-1")!.d1Status;
    const updateCountAfterSecond = updates.filter((u) => u.horizon === "d1").length;

    expect(d1AfterFirst).toBe("hit");
    expect(d1AfterSecond).toBe("hit");
    expect(updateCountAfterSecond).toBe(updateCountAfterFirst); // d1 추가 갱신 0
  });

  it("평가 시점 미도래 horizon 은 pending 유지(now=entry 다음날)", async () => {
    const row = makeRow();
    // now = 06-02(화) — d1(1영업일) 만 도래, w1(5)·m1(21) 미도래.
    const { deps, rowMap } = buildDeps({
      rows: [row],
      candlesByTicker: {
        "005930": [candle("2026-06-01", 100), candle("2026-06-02", 103)],
      },
      nowIso: "2026-06-02T08:00:00.000Z",
    });
    await scoreDecisions(deps);
    const updated = rowMap.get("row-1")!;
    expect(updated.d1Status).toBe("hit");
    expect(updated.w1Status).toBe("pending");
    expect(updated.m1Status).toBe("pending");
  });

  it("entry 직후(경과 0영업일) → 어떤 horizon 도 채점 안 함, 전부 pending", async () => {
    const row = makeRow();
    const { deps, rowMap, updates } = buildDeps({
      rows: [row],
      candlesByTicker: { "005930": [candle("2026-06-01", 100)] },
      nowIso: "2026-06-01T08:00:00.000Z",
    });
    await scoreDecisions(deps);
    const updated = rowMap.get("row-1")!;
    expect(updated.d1Status).toBe("pending");
    expect(updated.w1Status).toBe("pending");
    expect(updated.m1Status).toBe("pending");
    expect(updates.length).toBe(0);
  });
});

describe("scoreDecisions — AC-6 fail-soft", () => {
  it("도래했지만 평가봉 부재(연속 휴장/상폐) → skipped", async () => {
    // entry 06-01, m1 평가일 06-30 근방인데 캔들이 06-02 까지만 → d1 만 채점, w1/m1 봉 부재.
    // 충분히 먼 미래라 도래는 했으나 평가일 직후 봉이 LOOKAHEAD 넘게 없음 → skipped.
    const row = makeRow();
    const { deps, rowMap } = buildDeps({
      rows: [row],
      candlesByTicker: {
        "005930": [candle("2026-06-01", 100), candle("2026-06-02", 103)],
      },
      nowIso: FAR_FUTURE,
    });
    await scoreDecisions(deps);
    const updated = rowMap.get("row-1")!;
    expect(updated.d1Status).toBe("hit");
    expect(updated.w1Status).toBe("skipped");
    expect(updated.m1Status).toBe("skipped");
  });

  it("빈 캔들(상폐) → 도래한 horizon 전부 skipped", async () => {
    const row = makeRow();
    const { deps, rowMap } = buildDeps({
      rows: [row],
      candlesByTicker: { "005930": [] },
      nowIso: FAR_FUTURE,
    });
    await scoreDecisions(deps);
    const updated = rowMap.get("row-1")!;
    expect(updated.d1Status).toBe("skipped");
    expect(updated.w1Status).toBe("skipped");
    expect(updated.m1Status).toBe("skipped");
  });

  it("한 ticker KIS throw 가 다른 ticker 채점을 막지 않는다", async () => {
    const bad = makeRow({ id: "bad", ticker: "BADTICK" });
    const good = makeRow({ id: "good", ticker: "GOODTICK" });
    const { deps, rowMap, updates } = buildDeps({
      rows: [bad, good],
      candlesByTicker: {
        GOODTICK: [candle("2026-06-01", 100), candle("2026-06-02", 103)],
      },
      throwTickers: new Set(["BADTICK"]),
      nowIso: "2026-06-02T08:00:00.000Z",
    });
    const res = await scoreDecisions(deps);
    expect(rowMap.get("good")!.d1Status).toBe("hit"); // good 정상 채점
    expect(rowMap.get("bad")!.d1Status).toBe("pending"); // bad 는 다음 실행 재시도
    expect(res.errors).toBe(1);
    expect(updates.some((u) => u.id === "good")).toBe(true);
    expect(updates.some((u) => u.id === "bad")).toBe(false);
  });

  it("AC-10 pending 행이 없으면 채점 0건, 에러 없음", async () => {
    const { deps } = buildDeps({
      rows: [],
      candlesByTicker: {},
      nowIso: FAR_FUTURE,
    });
    const res = await scoreDecisions(deps);
    expect(res.candidates).toBe(0);
    expect(res.scored).toBe(0);
    expect(res.errors).toBe(0);
  });
});

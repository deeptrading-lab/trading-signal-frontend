/**
 * v2 채점 cron 로직 단위 테스트 — PRD `scorecard-relative-scoring`.
 *
 * 고정 종목/지수 캔들 fixture + 주입 deps 로 상대 측정·결정론·미도래 pending·backfill 멱등·
 * 지수 fetch 실패 시 fail-soft(pending 유지) 검증. 외부 의존 전부 주입.
 */

import { describe, it, expect } from "vitest";
import { relativeScoreDecisions } from "@/lib/server/scorecard/relativeScoreDecisions";
import type {
  HorizonScoreUpdate,
  ScorecardHorizon,
  ScorecardRow,
} from "@/lib/types/scorecard/scorecard";
import type { StockDailyCandle, IndexDailyClose } from "@/lib/api/kis/types";

function candle(date: string, close: number): StockDailyCandle {
  return { date, open: close, high: close, low: close, close, volume: 1000 };
}
function idx(date: string, close: number): IndexDailyClose {
  return { date, close };
}

/** entry_date 2026-06-01(월) 기준 행. 기본 모든 horizon pending, 상대값 비어있음. */
function makeRow(overrides: Partial<ScorecardRow> = {}): ScorecardRow {
  const rel = {
    BenchReturnPct: null,
    ExcessReturnPct: null,
    Beta: null,
    AlphaResidualPct: null,
    Regime: null,
  };
  const horizon = (h: "d1" | "w1" | "w2" | "m1") => ({
    [`${h}Status`]: "pending" as const,
    [`${h}Close`]: null,
    [`${h}ReturnPct`]: null,
    [`${h}ScoredAt`]: null,
    [`${h}BenchReturnPct`]: rel.BenchReturnPct,
    [`${h}ExcessReturnPct`]: rel.ExcessReturnPct,
    [`${h}Beta`]: rel.Beta,
    [`${h}AlphaResidualPct`]: rel.AlphaResidualPct,
    [`${h}Regime`]: rel.Regime,
  });
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
    benchKey: null,
    ...horizon("d1"),
    ...horizon("w1"),
    ...horizon("w2"),
    ...horizon("m1"),
    createdAt: "2026-06-01T07:00:00.000Z",
    ...overrides,
  } as ScorecardRow;
}

type Update = { id: string; horizon: ScorecardHorizon; update: HorizonScoreUpdate };

function buildDeps(opts: {
  rows: ScorecardRow[];
  stockByTicker: Record<string, StockDailyCandle[]>;
  indexByCode: Record<string, IndexDailyClose[]>;
  benchByTicker: Record<string, string>;
  nowIso: string;
  throwIndexCodes?: Set<string>;
  throwStockTickers?: Set<string>;
}) {
  const updates: Update[] = [];
  const rowMap = new Map(opts.rows.map((r) => [r.id, structuredClone(r)]));

  const applyToRow = (id: string, h: ScorecardHorizon, u: HorizonScoreUpdate) => {
    const target = rowMap.get(id);
    if (!target) return;
    const r = target as unknown as Record<string, unknown>;
    r[`${h}Status`] = u.status;
    r[`${h}Close`] = u.close;
    r[`${h}ReturnPct`] = u.returnPct;
    r[`${h}ScoredAt`] = u.scoredAt;
    if (u.benchReturnPct !== undefined) r[`${h}BenchReturnPct`] = u.benchReturnPct;
    if (u.excessReturnPct !== undefined) r[`${h}ExcessReturnPct`] = u.excessReturnPct;
    if (u.beta !== undefined) r[`${h}Beta`] = u.beta;
    if (u.alphaResidualPct !== undefined) r[`${h}AlphaResidualPct`] = u.alphaResidualPct;
    if (u.regime !== undefined) r[`${h}Regime`] = u.regime;
    if (u.benchKey !== undefined) r.benchKey = u.benchKey;
  };

  const deps = {
    getRows: async () =>
      [...rowMap.values()].map((r) => structuredClone(r)),
    fetchStockDaily: async (ticker: string) => {
      if (opts.throwStockTickers?.has(ticker)) throw new Error("종목 조회 실패(mock)");
      return opts.stockByTicker[ticker] ?? [];
    },
    fetchIndexDaily: async (code: string) => {
      if (opts.throwIndexCodes?.has(code)) throw new Error("지수 조회 실패(mock)");
      return opts.indexByCode[code] ?? [];
    },
    resolveBench: (ticker: string) => opts.benchByTicker[ticker] ?? "0001",
    updateHorizon: async (id: string, horizon: ScorecardHorizon, update: HorizonScoreUpdate) => {
      updates.push({ id, horizon, update });
      applyToRow(id, horizon, update);
      return { ok: true };
    },
    now: () => new Date(opts.nowIso),
    delay: async () => {},
  };
  return { deps, updates, rowMap };
}

describe("relativeScoreDecisions — 상대 측정 + status", () => {
  it("d1 BUY: 종목 +3%, 시장 +0.5% → excess +2.5% → hit (시장 베타 제거)", async () => {
    // entry 6/1 close 100, d1 평가 6/2.
    const stock: StockDailyCandle[] = [
      candle("2026-06-01", 100),
      candle("2026-06-02", 103), // +3%
    ];
    const index: IndexDailyClose[] = [
      idx("2026-06-01", 2000),
      idx("2026-06-02", 2010), // +0.5%
    ];
    const { deps, rowMap } = buildDeps({
      rows: [makeRow()],
      stockByTicker: { "005930": stock },
      indexByCode: { "0001": index },
      benchByTicker: { "005930": "0001" },
      nowIso: "2026-06-10T08:00:00.000Z",
    });
    const res = await relativeScoreDecisions(deps, { batchLimit: 10 });
    expect(res.hit).toBe(1);
    const r = rowMap.get("row-1")!;
    expect(r.d1Status).toBe("hit");
    expect(r.d1ReturnPct).toBeCloseTo(3, 4);
    expect(r.d1BenchReturnPct).toBeCloseTo(0.5, 4);
    expect(r.d1ExcessReturnPct).toBeCloseTo(2.5, 4);
    expect(r.benchKey).toBe("0001");
  });

  it("시장 베타 함정 차단: 시장 -5%, 종목 -1%, OVERWEIGHT — 절대 -1(flat) 이지만 excess +4 → hit", async () => {
    const stock: StockDailyCandle[] = [candle("2026-06-01", 100), candle("2026-06-02", 99)];
    const index: IndexDailyClose[] = [idx("2026-06-01", 2000), idx("2026-06-02", 1900)]; // -5%
    const { deps, rowMap } = buildDeps({
      rows: [makeRow({ verdict: "OVERWEIGHT" })],
      stockByTicker: { "005930": stock },
      indexByCode: { "0001": index },
      benchByTicker: { "005930": "0001" },
      nowIso: "2026-06-10T08:00:00.000Z",
    });
    const res = await relativeScoreDecisions(deps, { batchLimit: 10 });
    expect(res.hit).toBe(1);
    const r = rowMap.get("row-1")!;
    expect(r.d1ExcessReturnPct).toBeCloseTo(4, 4);
    expect(r.d1Regime).toBe("down");
  });

  it("미도래 horizon 은 pending 유지(평가 시점 전)", async () => {
    const stock: StockDailyCandle[] = [candle("2026-06-01", 100), candle("2026-06-02", 103)];
    const index: IndexDailyClose[] = [idx("2026-06-01", 2000), idx("2026-06-02", 2010)];
    // now = 6/2 → d1 도래(1영업일), w1(5)·m1(21) 미도래.
    const { deps, rowMap } = buildDeps({
      rows: [makeRow()],
      stockByTicker: { "005930": stock },
      indexByCode: { "0001": index },
      benchByTicker: { "005930": "0001" },
      nowIso: "2026-06-02T08:00:00.000Z",
    });
    const res = await relativeScoreDecisions(deps, { batchLimit: 10 });
    expect(res.hit).toBe(1);
    const r = rowMap.get("row-1")!;
    expect(r.d1Status).toBe("hit");
    expect(r.w1Status).toBe("pending");
    expect(r.m1Status).toBe("pending");
  });

  it("결정론: 같은 입력 2회 실행 → 같은 결과(재실행 안전)", async () => {
    const stock: StockDailyCandle[] = [candle("2026-06-01", 100), candle("2026-06-02", 103)];
    const index: IndexDailyClose[] = [idx("2026-06-01", 2000), idx("2026-06-02", 2010)];
    const make = () =>
      buildDeps({
        rows: [makeRow()],
        stockByTicker: { "005930": stock },
        indexByCode: { "0001": index },
        benchByTicker: { "005930": "0001" },
        nowIso: "2026-06-10T08:00:00.000Z",
      });
    const a = make();
    const r1 = await relativeScoreDecisions(a.deps, { batchLimit: 10 });
    // 재실행: 같은 행을 다시(이미 hit·bench 채워짐 → backfill 대상 아님 → 손대지 않음).
    const r2 = await relativeScoreDecisions(a.deps, { batchLimit: 10 });
    expect(r1.hit).toBe(1);
    // 두번째엔 d1 이미 bench 채워졌으니 재채점 0(w1/m1 미도래라 pending kept).
    expect(r2.scored).toBe(0);
    expect(a.rowMap.get("row-1")!.d1Status).toBe("hit");
  });
});

describe("relativeScoreDecisions — backfill 멱등", () => {
  it("이미 hit 인데 bench 비어있는 horizon → 재계산해 채움(backfilled)", async () => {
    // d1 이미 hit(abs +3) + bench null(미보정). w1/m1 도 채점완료 + bench null 로 만들어 backfill만.
    const scoredRow = makeRow({
      d1Status: "hit",
      d1Close: 103,
      d1ReturnPct: 3,
      d1ScoredAt: "2026-06-02T08:00:00.000Z",
      w1Status: "hit",
      w1Close: 103,
      w1ReturnPct: 3,
      w1ScoredAt: "2026-06-08T08:00:00.000Z",
      m1Status: "skipped",
    });
    const { deps, rowMap } = buildDeps({
      rows: [scoredRow],
      stockByTicker: {
        "005930": [
          candle("2026-06-01", 100),
          candle("2026-06-02", 103),
          candle("2026-06-08", 103),
        ],
      },
      indexByCode: {
        "0001": [
          idx("2026-06-01", 2000),
          idx("2026-06-02", 2010),
          idx("2026-06-08", 2010),
        ],
      },
      benchByTicker: { "005930": "0001" },
      nowIso: "2026-07-10T08:00:00.000Z",
    });
    const res = await relativeScoreDecisions(deps, { batchLimit: 10 });
    expect(res.backfilled).toBeGreaterThanOrEqual(1);
    const r = rowMap.get("row-1")!;
    expect(r.d1BenchReturnPct).toBeCloseTo(0.5, 4);
    expect(r.d1ExcessReturnPct).toBeCloseTo(2.5, 4);
    expect(r.d1Status).toBe("hit"); // excess +2.5 ≥ T 라 여전히 hit
    // skipped 는 backfill 대상 아님 — 그대로.
    expect(r.m1Status).toBe("skipped");
    expect(r.m1BenchReturnPct).toBeNull();
  });
});

describe("relativeScoreDecisions — fail-soft", () => {
  it("지수 fetch 실패 → 해당 ticker pending 유지(skip 으로 오확정 금지)", async () => {
    const stock: StockDailyCandle[] = [candle("2026-06-01", 100), candle("2026-06-02", 103)];
    const { deps, rowMap } = buildDeps({
      rows: [makeRow()],
      stockByTicker: { "005930": stock },
      indexByCode: {}, // 비어있으나 throw 로 막힘
      benchByTicker: { "005930": "0001" },
      nowIso: "2026-06-10T08:00:00.000Z",
      throwIndexCodes: new Set(["0001"]),
    });
    const res = await relativeScoreDecisions(deps, { batchLimit: 10 });
    expect(res.errors).toBe(1);
    expect(res.scored).toBe(0);
    const r = rowMap.get("row-1")!;
    expect(r.d1Status).toBe("pending"); // 절대 skip 으로 굳지 않음
  });

  it("종목 fetch 실패 → pending 유지", async () => {
    const { deps, rowMap } = buildDeps({
      rows: [makeRow()],
      stockByTicker: {},
      indexByCode: { "0001": [idx("2026-06-01", 2000)] },
      benchByTicker: { "005930": "0001" },
      nowIso: "2026-06-10T08:00:00.000Z",
      throwStockTickers: new Set(["005930"]),
    });
    const res = await relativeScoreDecisions(deps, { batchLimit: 10 });
    expect(res.errors).toBe(1);
    expect(rowMap.get("row-1")!.d1Status).toBe("pending");
  });

  it("지수 종가가 성공적으로 빈 배열(상폐) → bench null → excess 측정 불가 → pending 유지(보류)", async () => {
    const stock: StockDailyCandle[] = [candle("2026-06-01", 100), candle("2026-06-02", 103)];
    const { deps, rowMap } = buildDeps({
      rows: [makeRow()],
      stockByTicker: { "005930": stock },
      indexByCode: { "0001": [] }, // 성공했으나 빈 — entry 지수 부재
      benchByTicker: { "005930": "0001" },
      nowIso: "2026-06-10T08:00:00.000Z",
    });
    const res = await relativeScoreDecisions(deps, { batchLimit: 10 });
    // 종목 종가는 나오지만 bench 측정 불가 → 주 지표(excess) null → status null → pending 보류.
    expect(res.scored).toBe(0);
    expect(rowMap.get("row-1")!.d1Status).toBe("pending");
  });
});

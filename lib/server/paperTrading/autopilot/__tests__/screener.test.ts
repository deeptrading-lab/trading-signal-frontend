import { describe, expect, it } from "vitest";
import {
  applyHardFilters,
  buildUniverse,
  computeAtrPct,
  extractStage2Features,
  runAutopilotScreener,
  scoreStage1,
  scoreStage2,
  triangularScore,
} from "@/lib/server/paperTrading/autopilot/screener";
import type { StockMinuteCandle } from "@/lib/api/kis/types";
import type { AutopilotCandidate } from "@/lib/types/paperTrading/autopilot";
import type { StockWarningItem } from "@/lib/types/stock/warnings";

function candidate(ticker: string, over: Partial<AutopilotCandidate> = {}): AutopilotCandidate {
  return {
    ticker,
    name: `종목${ticker}`,
    sources: ["volume"],
    price: 10_000,
    changePercent: 3,
    tradingValue: 50_000_000_000,
    score1: 0,
    ...over,
  };
}

function warning(warningType: string): StockWarningItem {
  return { warningType, exchange: "KRX", startDate: null, endDate: null };
}

/** 당일 5분봉 합성 — 09:00부터. ATR 용 ±0.5% 지그재그, 거래대금 = price×volume 누적. */
function makeCandles(opts: { bars?: number; price?: number; volume?: number } = {}): StockMinuteCandle[] {
  const bars = opts.bars ?? 40;
  const price = opts.price ?? 10_000;
  const volume = opts.volume ?? 1_000_000;
  return Array.from({ length: bars }, (_, i) => {
    const hh = String(9 + Math.floor((i * 5) / 60)).padStart(2, "0");
    const mm = String((i * 5) % 60).padStart(2, "0");
    const wiggle = i % 2 === 0 ? 1 : -1;
    const close = price * (1 + 0.005 * wiggle);
    return {
      date: `2026-07-13T${hh}:${mm}`,
      open: price,
      high: Math.max(price, close) * 1.002,
      low: Math.min(price, close) * 0.998,
      close,
      volume,
    };
  });
}

describe("triangularScore", () => {
  it("best 에서 1, min/max 밖에서 0, 사이 선형", () => {
    expect(triangularScore(0.8, 0.25, 0.8, 2.0)).toBe(1);
    expect(triangularScore(0.25, 0.25, 0.8, 2.0)).toBe(0);
    expect(triangularScore(2.5, 0.25, 0.8, 2.0)).toBe(0);
    const rising = triangularScore(0.5, 0.25, 0.8, 2.0);
    const falling = triangularScore(1.5, 0.25, 0.8, 2.0);
    expect(rising).toBeGreaterThan(0);
    expect(rising).toBeLessThan(1);
    expect(falling).toBeGreaterThan(0);
    expect(falling).toBeLessThan(1);
  });
});

describe("applyHardFilters", () => {
  it("정리매매·투자위험·투자경고는 하드 제외, 단기과열은 통과+감점 마커", () => {
    const { passed, rejected } = applyHardFilters(
      [candidate("100001"), candidate("100002"), candidate("100003")],
      {
        "100001": [warning("LIQUIDATION_TRADING")],
        "100002": [warning("OVERHEATED")],
      },
    );
    expect(rejected.map((c) => c.ticker)).toEqual(["100001"]);
    expect(rejected[0].rejectedBy).toContain("시장경보");
    expect(passed.find((c) => c.ticker === "100002")?.overheated).toBe(true);
    expect(passed.find((c) => c.ticker === "100003")?.overheated).toBeUndefined();
  });

  it("가격·거래대금·등락률 경계 — 하한/상한 탈락, 거래대금 미상은 통과", () => {
    const { passed, rejected } = applyHardFilters(
      [
        candidate("100001", { price: 900 }), // 가격 하한(1,000).
        candidate("100002", { price: 400_000 }), // 가격 상한(30만).
        candidate("100003", { tradingValue: 5_000_000_000 }), // 거래대금 하한(100억).
        candidate("100004", { tradingValue: undefined }), // 미상 → 통과(2차 재검증).
        candidate("100005", { changePercent: 0.5 }), // 등락률 하한(+1%).
        candidate("100006", { changePercent: 28 }), // 등락률 상한(+25%).
        candidate("100007"), // 전부 통과.
      ],
      {},
    );
    expect(rejected.map((c) => c.rejectedBy)).toEqual([
      "가격 하한",
      "가격 상한",
      "거래대금 하한",
      "등락률 하한",
      "등락률 상한",
    ]);
    expect(passed.map((c) => c.ticker).sort()).toEqual(["100004", "100007"]);
  });
});

describe("scoreStage1", () => {
  const context = {
    tradingValuesSorted: [10_000_000_000, 50_000_000_000, 100_000_000_000],
    netBuySorted: [100, 500, 1_000],
  };

  it("모멘텀 단조성 — 등락률 높을수록 점수 상승(동일 조건)", () => {
    const low = scoreStage1(candidate("1", { changePercent: 2 }), context);
    const high = scoreStage1(candidate("2", { changePercent: 8 }), context);
    expect(high).toBeGreaterThan(low);
  });

  it("단기과열 감점·다중 소스 가점", () => {
    const base = scoreStage1(candidate("1"), context);
    const overheated = scoreStage1(candidate("2", { overheated: true }), context);
    const multi = scoreStage1(candidate("3", { sources: ["volume", "flow-frgn"] }), context);
    expect(overheated).toBeLessThan(base);
    expect(multi).toBeGreaterThan(base);
  });

  it("거래대금 미상은 중립(0.5 percentile 상당) — 최상위·최하위 사이", () => {
    const unknown = scoreStage1(candidate("1", { tradingValue: undefined }), context);
    const top = scoreStage1(candidate("2", { tradingValue: 100_000_000_000 }), context);
    const bottom = scoreStage1(candidate("3", { tradingValue: 10_000_000_000 }), context);
    expect(unknown).toBeLessThan(top);
    expect(unknown).toBeGreaterThan(bottom);
  });
});

describe("buildUniverse", () => {
  it("티커 dedupe + 소스 태깅 병합 + 필드 보완", () => {
    const universe = buildUniverse([
      { ticker: "100001", name: "가", price: 10_000, changePercent: 3, source: "volume", tradingValue: 1e10 },
      { ticker: "100001", name: "가", price: 10_000, changePercent: 3, source: "flow-frgn", netBuyAmount: 500 },
      { ticker: "100002", name: "나", price: 5_000, changePercent: 5, source: "fluctuation" },
    ]);
    expect(universe).toHaveLength(2);
    const merged = universe.find((c) => c.ticker === "100001")!;
    expect(merged.sources.sort()).toEqual(["flow-frgn", "volume"]);
    expect(merged.tradingValue).toBe(1e10);
    expect(merged.netBuyAmount).toBe(500);
  });

  it("ETP(ETF·ETN·레버리지 등)·비정형 티커는 제외", () => {
    const universe = buildUniverse([
      { ticker: "100001", name: "KODEX 200", price: 10_000, changePercent: 3, source: "volume" },
      { ticker: "Q500001", name: "정상이름", price: 10_000, changePercent: 3, source: "volume" },
      { ticker: "100002", name: "정상종목", price: 10_000, changePercent: 3, source: "volume" },
    ]);
    expect(universe.map((c) => c.ticker)).toEqual(["100002"]);
  });
});

describe("2차 피처·점수", () => {
  it("computeAtrPct — 지그재그 봉에서 양수 ATR%", () => {
    const atr = computeAtrPct(makeCandles());
    expect(atr).not.toBeNull();
    expect(atr!).toBeGreaterThan(0);
    expect(atr!).toBeLessThan(5);
  });

  it("extractStage2Features — 당일 체결대금 합산·봉 부족 시 null", () => {
    const features = extractStage2Features(makeCandles({ bars: 40, volume: 1_000 }));
    expect(features).not.toBeNull();
    // 40봉 × close(±0.5% 지그재그) × 1,000주 ≈ 4억.
    expect(features!.todayTradingValueKrw).toBeGreaterThan(3e8);
    expect(extractStage2Features(makeCandles({ bars: 3 }))).toBeNull();
  });

  it("scoreStage2 — VWAP 위(적정 이격)가 아래보다 높다", () => {
    const base = {
      atrPct: 0.8,
      volumeZ: 1,
      orBreakout: false,
      vwapReclaim: false,
      volumeZSurge: false,
      swingUptrend: false,
    };
    const above = scoreStage2({ ...base, vwapGapPct: 0.5, aboveVwap: true, todayTradingValueKrw: 0 });
    const below = scoreStage2({ ...base, vwapGapPct: -1, aboveVwap: false, todayTradingValueKrw: 0 });
    const chasing = scoreStage2({ ...base, vwapGapPct: 4, aboveVwap: true, todayTradingValueKrw: 0 });
    expect(above).toBeGreaterThan(below);
    expect(above).toBeGreaterThan(chasing);
  });
});

describe("runAutopilotScreener (deps 주입 e2e)", () => {
  const bigCandles = makeCandles(); // 거래대금 충분(≈4,000억).

  function deps(over: Record<string, unknown> = {}) {
    return {
      kisReady: true,
      fetchVolumeRank: async () => [
        { ticker: "100001", name: "가", price: 10_000, changePercent: 4, direction: "up" as const, volume: 1, tradingValue: 50_000_000_000 },
        { ticker: "100002", name: "나", price: 20_000, changePercent: 6, direction: "up" as const, volume: 1, tradingValue: 30_000_000_000 },
      ],
      fetchFluctuation: async () => [
        { ticker: "100003", name: "다", price: 5_000, changePercent: 9, direction: "up" as const },
      ],
      fetchForeignInstitutionTotal: async () => [],
      fetchWarningsBatch: async () => ({}) as Record<string, StockWarningItem[]>,
      fetchMinuteCandles: async () => bigCandles,
      ...over,
    };
  }

  it("KIS 미가용이면 unavailable(mock 폴백 없음)", async () => {
    const result = await runAutopilotScreener({ deps: deps({ kisReady: false }) });
    expect(result.status).toBe("unavailable");
  });

  it("union→하드필터→1차·2차 점수 — 정상 경로", async () => {
    const result = await runAutopilotScreener({ deps: deps() });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.universeSize).toBe(3);
    expect(result.stage1Ranking).toHaveLength(3);
    expect(result.fillRanking.length).toBeGreaterThan(0);
    for (const c of result.fillRanking) {
      expect(c.finalScore).toBeGreaterThan(0);
      expect(c.score2).toBeDefined();
    }
  });

  it("excludeTickers 는 유니버스에서 제외, 경보 종목은 하드필터 탈락", async () => {
    const result = await runAutopilotScreener({
      excludeTickers: new Set(["100002"]),
      deps: deps({
        fetchWarningsBatch: async () => ({ "100001": [warning("INVESTMENT_RISK")] }),
      }),
    });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.stage1Ranking.map((c) => c.ticker)).toEqual(["100003"]);
    expect(result.rejected.map((c) => c.ticker)).toEqual(["100001"]);
  });

  it("shortlist 분봉 실패 종목은 fillRanking 에서만 빠진다(stage1 유지)", async () => {
    const result = await runAutopilotScreener({
      deps: deps({
        fetchMinuteCandles: async (ticker: string) => {
          if (ticker === "100003") throw new Error("분봉 실패");
          return bigCandles;
        },
      }),
    });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.stage1Ranking.map((c) => c.ticker)).toContain("100003");
    expect(result.fillRanking.map((c) => c.ticker)).not.toContain("100003");
  });

  it("거래대금 미상 후보는 2차에서 당일 체결대금으로 재검증해 탈락시킨다", async () => {
    const result = await runAutopilotScreener({
      deps: deps({
        // 100003(fluctuation — tradingValue 미상)만 얇은 거래(≈4억 < 100억).
        fetchMinuteCandles: async (ticker: string) =>
          ticker === "100003" ? makeCandles({ volume: 1_000 }) : bigCandles,
      }),
    });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.fillRanking.map((c) => c.ticker)).not.toContain("100003");
    expect(result.rejected.some((c) => c.ticker === "100003" && c.rejectedBy?.includes("2차"))).toBe(
      true,
    );
  });

  it("전 소스 실패(빈 유니버스)면 unavailable", async () => {
    const result = await runAutopilotScreener({
      deps: deps({
        fetchVolumeRank: async () => [],
        fetchFluctuation: async () => [],
      }),
    });
    expect(result.status).toBe("unavailable");
  });
});

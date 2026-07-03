/**
 * `formatIntradayContext` 의 매수 유의 줄 — PRD `intraday-warnings` §3-2 (AC-2·3).
 *
 * warnings 가 있을 때만 `[매수 유의]` 줄이 헤더 바로 아래 주입되고, 없으면 무주입(무회귀).
 * VI 3종 라벨 중복은 1개로 접힌다.
 */

import { describe, it, expect } from "vitest";
import { formatIntradayContext } from "../agents";
import type { IntradayContext } from "@/lib/types/intraday/intradayDecision";

function baseContext(overrides: Partial<IntradayContext> = {}): IntradayContext {
  return {
    ticker: "111710",
    name: "한화큐셀",
    asOf: "2026-07-03",
    price: 12_000,
    timeframe: 2,
    intervalMinutes: 2,
    signal: {
      score: 55,
      action: "HOLD",
      confidence: 0.5,
      regime: 0,
      axes: [],
      asOf: "2026-07-03",
    },
    levels: {
      lastClose: 12_000,
      boxHigh: 12_500,
      boxLow: 11_500,
      tpPrice: null,
      slPrice: null,
      tpSource: null,
      slSource: null,
      rrr: null,
      tpPct: null,
      slPct: null,
    },
    recentBars: [],
    position: null,
    previousDecision: null,
    nowHhmm: "10:30",
    ...overrides,
  };
}

describe("formatIntradayContext — 매수 유의", () => {
  it("warnings 없으면 [매수 유의] 줄이 없다 (AC-2 무회귀)", () => {
    const text = formatIntradayContext(baseContext());
    expect(text).not.toContain("[매수 유의]");
  });

  it("빈 배열도 무주입", () => {
    const text = formatIntradayContext(baseContext({ warnings: [] }));
    expect(text).not.toContain("[매수 유의]");
  });

  it("활성 경보가 있으면 한글 라벨로 줄을 주입한다 (AC-3)", () => {
    const text = formatIntradayContext(
      baseContext({
        warnings: [
          { warningType: "OVERHEATED", exchange: null, startDate: null, endDate: null },
        ],
      }),
    );
    expect(text).toContain("[매수 유의]");
    expect(text).toContain("단기과열");
  });

  it("VI 3종은 중복 라벨을 1개로 접는다", () => {
    const text = formatIntradayContext(
      baseContext({
        warnings: [
          { warningType: "VI_STATIC", exchange: null, startDate: null, endDate: null },
          { warningType: "VI_DYNAMIC", exchange: null, startDate: null, endDate: null },
        ],
      }),
    );
    const viCount = (text.match(/VI 발동/g) ?? []).length;
    expect(viCount).toBe(1);
  });
});

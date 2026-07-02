import { describe, expect, it } from "vitest";
import { validateCreateSessionRequest } from "@/lib/server/paperTrading/validateCreateSession";
import { deriveIntradayTimeframe } from "@/lib/server/paperTrading/constants";
import type { CreatePaperTradingSessionRequest } from "@/lib/types/paperTrading/paperTrading";

const base: Partial<CreatePaperTradingSessionRequest> = {
  name: "테스트",
  tickers: ["005930"],
  stocks: [{ ticker: "005930", name: "삼성전자", market: "KOSPI" }],
  initialCash: 1_000_000,
  targetReturnPct: 5,
  riskMode: "balanced",
};

describe("validateCreateSessionRequest", () => {
  it("mock 은 통과", () => {
    expect(validateCreateSessionRequest({ ...base, decisionProvider: "mock" })).toBeNull();
  });

  it("cli-agent 는 통과 — 단타워치 모의 단타 진입점", () => {
    expect(validateCreateSessionRequest({ ...base, decisionProvider: "cli-agent" })).toBeNull();
  });

  it("existing-ai 는 거절 — runTick 미구현(무단 mock 폴백 방지)", () => {
    expect(
      validateCreateSessionRequest({ ...base, decisionProvider: "existing-ai" }),
    ).toContain("판단 방식");
  });

  it("종목 6개 이상은 거절", () => {
    const stocks = Array.from({ length: 6 }, (_, i) => ({
      ticker: `00000${i}`,
      name: `종목${i}`,
    }));
    expect(validateCreateSessionRequest({ ...base, stocks })).toContain("최대 5개");
  });

  it("시작 투자금 0 이하는 거절", () => {
    expect(validateCreateSessionRequest({ ...base, initialCash: 0 })).toContain("투자금");
  });

  it("판단 주기 — 허용 목록(1·2·3·5·10·15)은 통과, 그 외 거절", () => {
    expect(
      validateCreateSessionRequest({ ...base, decisionProvider: "cli-agent", tickIntervalMinutes: 2 }),
    ).toBeNull();
    expect(
      validateCreateSessionRequest({ ...base, decisionProvider: "cli-agent", tickIntervalMinutes: 7 }),
    ).toContain("판단 주기");
  });
});

describe("deriveIntradayTimeframe (주기 → 분봉 파생)", () => {
  it("주기별 매핑 — 분봉 ≤ 주기, 주기마다 최소 1봉 마감", () => {
    const prev = process.env.INTRADAY_TIMEFRAME;
    delete process.env.INTRADAY_TIMEFRAME;
    try {
      expect(deriveIntradayTimeframe(1)).toBe(1);
      expect(deriveIntradayTimeframe(2)).toBe(1);
      expect(deriveIntradayTimeframe(3)).toBe(3);
      expect(deriveIntradayTimeframe(5)).toBe(5);
      expect(deriveIntradayTimeframe(10)).toBe(5);
      expect(deriveIntradayTimeframe(15)).toBe(15);
      expect(deriveIntradayTimeframe(999)).toBe(5); // 미지정 주기 폴백.
    } finally {
      if (prev !== undefined) process.env.INTRADAY_TIMEFRAME = prev;
    }
  });

  it("INTRADAY_TIMEFRAME env 는 실험용 강제 오버라이드", () => {
    const prev = process.env.INTRADAY_TIMEFRAME;
    process.env.INTRADAY_TIMEFRAME = "3";
    try {
      expect(deriveIntradayTimeframe(15)).toBe(3);
    } finally {
      if (prev !== undefined) process.env.INTRADAY_TIMEFRAME = prev;
      else delete process.env.INTRADAY_TIMEFRAME;
    }
  });
});

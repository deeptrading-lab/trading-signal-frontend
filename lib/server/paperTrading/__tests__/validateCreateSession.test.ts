import { describe, expect, it } from "vitest";
import { validateCreateSessionRequest } from "@/lib/server/paperTrading/validateCreateSession";
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

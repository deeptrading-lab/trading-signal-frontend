import { describe, expect, it } from "vitest";
import { buildIntradayPortfolioPlan } from "@/lib/intraday/portfolioPlan";

const candidates = [
  { ticker: "A", name: "A", price: 10_000, flowRank: 1, volumeRank: 2 },
  { ticker: "B", name: "B", price: 20_000, flowRank: 2 },
  { ticker: "C", name: "C", price: 30_000, volumeRank: 1 },
  { ticker: "D", name: "D", price: 40_000, flowRank: 4, volumeRank: 4 },
  { ticker: "E", name: "E", price: 50_000, volumeRank: 5 },
];

describe("buildIntradayPortfolioPlan", () => {
  it("수급·거래량 중복 후보를 우대하고 10% 현금을 남긴다", () => {
    const plan = buildIntradayPortfolioPlan(10_000_000, candidates);
    expect(plan.allocations).toHaveLength(4);
    expect(plan.allocations[0].ticker).toBe("A");
    expect(plan.cashBuffer).toBe(1_000_000);
    expect(plan.investedAmount + plan.cashBuffer).toBe(10_000_000);
    expect(plan.allocations.reduce((sum, item) => sum + item.amount, 0)).toBe(10_000_000);
    expect(plan.allocations.every((item) => item.amount % 10_000 === 0)).toBe(true);
  });

  it("같은 ticker의 두 소스를 합쳐 중복 종목을 만들지 않는다", () => {
    const plan = buildIntradayPortfolioPlan(3_000_000, [
      { ticker: "A", name: "A", price: 10_000, flowRank: 1 },
      { ticker: "A", name: "A", price: 10_000, volumeRank: 1 },
      ...candidates.slice(1),
    ]);
    expect(plan.allocations.filter((item) => item.ticker === "A")).toHaveLength(1);
    expect(plan.allocations.find((item) => item.ticker === "A")?.reasons).toHaveLength(2);
  });

  it("100만원 미만은 거절한다", () => {
    expect(() => buildIntradayPortfolioPlan(990_000, candidates)).toThrow("100만원");
  });
});

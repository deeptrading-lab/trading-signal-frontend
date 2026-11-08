import { expect, it, vi } from "vitest";
import { hasIntradayRecommendationFeed, loadIntradayFlowRankings, loadIntradayVolumeRankings } from "@/lib/server/intraday/recommendationRankings";
import { loadRecommendationCandidates } from "../recommendationCandidates";

vi.mock("@/lib/server/intraday/recommendationRankings", () => ({
  hasIntradayRecommendationFeed: vi.fn(),
  loadIntradayFlowRankings: vi.fn(),
  loadIntradayVolumeRankings: vi.fn(),
}));

const row = (ticker: string) => ({
  ticker, name: ticker, price: 10_000, changePercent: 0, direction: "flat" as const,
  netBuyAmount: 1, netBuyQty: 1, volume: 100,
});

it("deduplicates the two displayed recommendation lists and preserves all sources", async () => {
  vi.mocked(hasIntradayRecommendationFeed).mockReturnValue(true);
  vi.mocked(loadIntradayFlowRankings).mockResolvedValue({
    foreign: [row("005930")], institution: [row("005930"), row("000660")],
  });
  vi.mocked(loadIntradayVolumeRankings).mockResolvedValue([row("005930"), row("035420")]);
  const result = await loadRecommendationCandidates();
  expect(result.status).toBe("ready");
  expect(result.rows.map(({ ticker, sources }) => [ticker, sources])).toEqual([
    ["005930", ["foreign", "institution", "volume"]],
    ["000660", ["institution"]],
    ["035420", ["volume"]],
  ]);
});

it("leaves candidates unavailable when one real recommendation list is missing", async () => {
  vi.mocked(hasIntradayRecommendationFeed).mockReturnValue(true);
  vi.mocked(loadIntradayFlowRankings).mockResolvedValue({ foreign: [], institution: [] });
  vi.mocked(loadIntradayVolumeRankings).mockResolvedValue([row("005930")]);
  expect(await loadRecommendationCandidates()).toMatchObject({ status: "unavailable", rows: [] });
});

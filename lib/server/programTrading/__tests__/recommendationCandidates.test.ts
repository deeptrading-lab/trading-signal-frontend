import { beforeEach, expect, it, vi } from "vitest";
import { hasIntradayRecommendationFeed, loadIntradayFlowRankings, loadIntradayVolumeRankings } from "@/lib/server/intraday/recommendationRankings";
import { loadRecommendationCandidates } from "../recommendationCandidates";

vi.mock("@/lib/server/intraday/recommendationRankings", () => ({
  hasIntradayRecommendationFeed: vi.fn(),
  loadIntradayFlowRankings: vi.fn(),
  loadIntradayVolumeRankings: vi.fn(),
}));
const row = (ticker: string, changePercent = 1) => ({
  ticker, name: ticker, price: 10_000, changePercent, direction: "up" as const, volume: 100,
});
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(hasIntradayRecommendationFeed).mockReturnValue(true);
});
it("keeps only rising volume ranks in ranking order, deduplicates and never requests flow", async () => {
  vi.mocked(loadIntradayVolumeRankings).mockResolvedValue([
    row("005930"), row("000660", -1), row("035420", 0), row("005930", 2), row("035720", 3),
  ]);
  const result = await loadRecommendationCandidates();
  expect(result.status).toBe("ready");
  expect(result.rows.map(({ ticker, sources }) => [ticker, sources])).toEqual([
    ["005930", ["volume"]], ["035720", ["volume"]],
  ]);
  expect(result.rows[0].previousClose).toBeCloseTo(10_000 / 1.01);
  expect(Date.parse(result.expiresAt) - Date.parse(result.checkedAt)).toBe(120_000);
  expect(loadIntradayVolumeRankings).toHaveBeenCalledWith("volume");
  expect(loadIntradayFlowRankings).not.toHaveBeenCalled();
});
it("distinguishes successful rankings with no eligible candidates from feed failure", async () => {
  vi.mocked(loadIntradayVolumeRankings).mockResolvedValue([row("005930", 0), row("000660", -1)]);
  expect(await loadRecommendationCandidates()).toMatchObject({ status: "empty", rows: [] });
  vi.mocked(loadIntradayVolumeRankings).mockRejectedValue(new Error("ranking unavailable"));
  expect(await loadRecommendationCandidates()).toMatchObject({ status: "unavailable", rows: [] });
});
it("rejects nonfinite change, invalid symbols, prices and volume", async () => {
  vi.mocked(loadIntradayVolumeRankings).mockResolvedValue([
    row("005930", NaN), row("000660", Infinity), row("bad"),
    { ...row("035420"), price: 0 }, { ...row("035720"), price: Infinity },
    { ...row("005380"), volume: 0 }, { ...row("000270"), volume: NaN },
  ]);
  expect(await loadRecommendationCandidates()).toMatchObject({ status: "empty", rows: [] });
});
it("does not query a missing or non-production feed", async () => {
  vi.mocked(hasIntradayRecommendationFeed).mockReturnValue(false);
  expect(await loadRecommendationCandidates()).toMatchObject({ status: "unavailable", rows: [] });
  expect(loadIntradayVolumeRankings).not.toHaveBeenCalled();
});

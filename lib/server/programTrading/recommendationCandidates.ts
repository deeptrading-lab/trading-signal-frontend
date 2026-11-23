import { withTimeout } from "@/lib/server/bffUtils";
import { hasIntradayRecommendationFeed, loadIntradayVolumeRankings } from "@/lib/server/intraday/recommendationRankings";
import type { CandidateSnapshot, ProgramCandidate } from "@/lib/types/programTrading/programTrading";
import { emptyCandidateSnapshot, isRisingVolumeCandidate } from "@/lib/validation/programTrading/candidateGate";

/** Rank first, then filter: never backfill from flow rankings or lower volume ranks. */
export async function loadRecommendationCandidates(): Promise<CandidateSnapshot> {
  if (!hasIntradayRecommendationFeed()) return emptyCandidateSnapshot();
  try {
    const volume = await withTimeout(loadIntradayVolumeRankings("volume"), 16_000);
    const candidates = new Map<string, ProgramCandidate>();
    for (const row of volume) {
      const candidate: ProgramCandidate = {
        ticker: row.ticker, name: row.name, price: row.price, sources: ["volume"],
        changePercent: row.changePercent,
        // Ranking provides price and signed, rounded daily change, not previous close.
        previousClose: row.price / (1 + row.changePercent / 100),
      };
      if (isRisingVolumeCandidate(candidate) && Number.isFinite(row.volume) && row.volume > 0 && !candidates.has(row.ticker)) {
        candidates.set(row.ticker, candidate);
      }
    }
    const rows = [...candidates.values()];
    const now = Date.now();
    return { status: rows.length ? "ready" : "empty", rows, checkedAt: new Date(now).toISOString(), expiresAt: new Date(now + 120_000).toISOString() };
  } catch {
    return emptyCandidateSnapshot();
  }
}

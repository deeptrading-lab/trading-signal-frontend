import { delay, withTimeout } from "@/lib/server/bffUtils";
import { hasIntradayRecommendationFeed, loadIntradayFlowRankings, loadIntradayVolumeRankings } from "@/lib/server/intraday/recommendationRankings";
import type { CandidateSnapshot, CandidateSource, ProgramCandidate } from "@/lib/types/programTrading/programTrading";
import { selectIntradayFlowCandidates } from "@/lib/validation/intraday/recommendations";
import { emptyCandidateSnapshot } from "@/lib/validation/programTrading/candidateGate";

export async function loadRecommendationCandidates(): Promise<CandidateSnapshot> {
  if (!hasIntradayRecommendationFeed()) return emptyCandidateSnapshot();
  try {
    const { flow, volume } = await withTimeout(loadRankings(), 16_000);
    const flowCandidates = selectIntradayFlowCandidates([...flow.foreign, ...flow.institution]);
    const candidates = new Map<string, ProgramCandidate>();
    function add(row: { ticker: string; name: string; price: number }, source: CandidateSource) {
      if (!/^[0-9][A-Z0-9]{5}$/.test(row.ticker) || !Number.isFinite(row.price) || row.price <= 0) return;
      const existing = candidates.get(row.ticker);
      if (existing) {
        if (!existing.sources.includes(source)) existing.sources.push(source);
      } else {
        candidates.set(row.ticker, { ticker: row.ticker, name: row.name, price: row.price, sources: [source] });
      }
    }
    const foreign = new Set(flow.foreign.map(row => row.ticker));
    const institution = new Set(flow.institution.map(row => row.ticker));
    for (const row of flowCandidates) {
      if (foreign.has(row.ticker)) add(row, "foreign");
      if (institution.has(row.ticker)) add(row, "institution");
    }
    if (!candidates.size) return emptyCandidateSnapshot();
    for (const row of volume) add(row, "volume");
    const rows = [...candidates.values()];
    if (!rows.some(row => row.sources.includes("volume"))) return emptyCandidateSnapshot();

    const now = Date.now();
    return { status: "ready", rows, checkedAt: new Date(now).toISOString(), expiresAt: new Date(now + 120_000).toISOString() };
  } catch {
    return emptyCandidateSnapshot();
  }
}

async function loadRankings() {
  const flow = await loadIntradayFlowRankings();
  await delay(150);
  const volume = await loadIntradayVolumeRankings();
  return { flow, volume };
}

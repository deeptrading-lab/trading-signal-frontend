import type { CandidateSnapshot, ProgramCandidate } from "@/lib/types/programTrading/programTrading";
export function hasCandidates(snapshot: CandidateSnapshot, now = Date.now()): boolean {
  const checked = Date.parse(snapshot.checkedAt);
  const expires = Date.parse(snapshot.expiresAt);
  return snapshot.status === "ready" && snapshot.rows.some(isRisingVolumeCandidate) && Number.isFinite(checked) && Number.isFinite(expires) && checked <= now && expires > now && expires - checked <= 120_000;
}
export function emptyCandidateSnapshot(): CandidateSnapshot {
  return {status:"unavailable",rows:[],checkedAt:new Date(0).toISOString(),expiresAt:new Date(0).toISOString()};
}

/** Reject legacy union snapshots and invalid/flat/falling ranking data. */
export function isRisingVolumeCandidate(row: ProgramCandidate): boolean {
  return /^[0-9][A-Z0-9]{5}$/.test(row.ticker)
    && row.sources.length === 1 && row.sources[0] === "volume"
    && [row.price, row.changePercent, row.previousClose].every(Number.isFinite)
    && row.price > 0 && row.changePercent > 0 && row.previousClose > 0
    && row.price > row.previousClose;
}

import type { CandidateSnapshot } from "@/lib/types/programTrading/programTrading";
export function hasCandidates(snapshot: CandidateSnapshot, now = Date.now()): boolean {
  const checked = Date.parse(snapshot.checkedAt);
  const expires = Date.parse(snapshot.expiresAt);
  return snapshot.status === "ready" && snapshot.rows.length > 0 && Number.isFinite(checked) && Number.isFinite(expires) && checked <= now && expires > now && expires - checked <= 120_000;
}
export function emptyCandidateSnapshot(): CandidateSnapshot {
  return {status:"unavailable",rows:[],checkedAt:new Date(0).toISOString(),expiresAt:new Date(0).toISOString()};
}

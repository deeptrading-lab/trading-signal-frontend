import { isKisConfigured, resolveKisEnv } from "@/lib/api/kis/client";
import { fetchVolumeRank } from "@/lib/api/kis/volume-rank";
import { fetchForeignInstitutionTotal } from "@/lib/api/kis/investor-flow";
import { isRegularStock } from "@/lib/server/rankingFilter";
import { delay } from "@/lib/server/bffUtils";
import type { CandidateSnapshot, CandidateSource, ProgramCandidate } from "@/lib/types/programTrading/programTrading";

type Row = { ticker: string; name: string; price: number };
export const CANDIDATE_TTL_MS = 120_000;
export function unavailableCandidates(now = Date.now()): CandidateSnapshot {
  return { status: "unavailable", rows: [], checkedAt: new Date(now).toISOString(), expiresAt: new Date(now).toISOString() };
}
// Same ranking providers/limits as the guide's volume/foreign/institution lists.
// Unlike the display BFF, never substitute demo or timeout fallback candidates.
export function mergeCandidates(volume: Row[], foreign: Row[], institution: Row[]): ProgramCandidate[] {
  const result = new Map<string, ProgramCandidate>();
  const groups: [CandidateSource, Row[]][] = [["volume",volume.filter(isRegularStock).slice(0,14)],["foreign",foreign.slice(0,10)],["institution",institution.slice(0,10)]];
  for(const [source, rows] of groups) for(const row of rows) {
    if(!/^\d{6}$/.test(row.ticker) || !Number.isFinite(row.price) || row.price<=0) continue;
    const existing=result.get(row.ticker);
    if(existing) { if(!existing.sources.includes(source)) existing.sources.push(source); }
    else result.set(row.ticker,{ticker:row.ticker,name:row.name,price:row.price,sources:[source]});
  }
  return [...result.values()];
}
export type CandidateDeps = {
  ready?: () => boolean;
  volume?: () => Promise<Row[]>;
  flow?: (subject: "frgn" | "orgn") => Promise<Row[]>;
  wait?: () => Promise<void>;
  now?: () => number;
};
export async function loadCandidates(deps: CandidateDeps = {}): Promise<CandidateSnapshot> {
  const now=deps.now??Date.now;
  const ready=deps.ready??(()=>isKisConfigured()&&resolveKisEnv()==="prod");
  if(!ready()) return unavailableCandidates(now());
  try {
    const volume=await (deps.volume??(()=>fetchVolumeRank("volume")))();
    await (deps.wait??(()=>delay(150)))();
    const foreign=await (deps.flow??fetchForeignInstitutionTotal)("frgn");
    await (deps.wait??(()=>delay(150)))();
    const institution=await (deps.flow??fetchForeignInstitutionTotal)("orgn");
    const rows=mergeCandidates(volume,foreign,institution);
    const timestamp=now();
    return {status:rows.length?"ready":"empty",rows,checkedAt:new Date(timestamp).toISOString(),expiresAt:new Date(timestamp+CANDIDATE_TTL_MS).toISOString()};
  } catch { return unavailableCandidates(now()); }
}

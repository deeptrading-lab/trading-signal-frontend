import { fetchForeignInstitutionTotal, isKisConfigured, resolveKisEnv } from "@/lib/api/kis";
import { fetchVolumeRank } from "@/lib/api/kis/volume-rank";
import type { InvestorFlowTop10 } from "@/lib/types/flow/top10";
import type { VolumeRankBy } from "@/lib/types/market/volumeRank";
import { INTRADAY_RECOMMENDATION_LIMIT } from "@/lib/validation/intraday/recommendations";
import { delay, fetchWithTransientRetry, fetchWithTransientRetryOrThrow } from "@/lib/server/bffUtils";
import { isRegularStock } from "@/lib/server/rankingFilter";

export function hasIntradayRecommendationFeed() {
  return isKisConfigured() && resolveKisEnv() === "prod";
}

export async function loadIntradayFlowRankings(): Promise<InvestorFlowTop10> {
  const foreign = await fetchWithTransientRetry(() => fetchForeignInstitutionTotal("frgn"), [], 250);
  await delay(150);
  const institution = await fetchWithTransientRetry(() => fetchForeignInstitutionTotal("orgn"), [], 250);
  return { foreign: foreign.slice(0, 10), institution: institution.slice(0, 10), asOf: new Date().toISOString() };
}

export async function loadIntradayVolumeRankings(by: VolumeRankBy = "volume") {
  const rows = await fetchWithTransientRetryOrThrow(() => fetchVolumeRank(by), 250);
  return rows.filter(isRegularStock).slice(0, INTRADAY_RECOMMENDATION_LIMIT);
}

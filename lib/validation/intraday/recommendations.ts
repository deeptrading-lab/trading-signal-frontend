import type { InvestorFlowRow } from "@/lib/types/flow/top10";

export const INTRADAY_RECOMMENDATION_LIMIT = 14;

export function selectIntradayFlowCandidates(rows: InvestorFlowRow[]): InvestorFlowRow[] {
  const selected = new Map<string, InvestorFlowRow>();
  for (const row of rows) {
    if (!selected.has(row.ticker)) selected.set(row.ticker, row);
    if (selected.size >= INTRADAY_RECOMMENDATION_LIMIT) break;
  }
  return [...selected.values()];
}

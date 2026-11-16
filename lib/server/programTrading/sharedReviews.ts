import { listPaperResults, paperResultPageSize, readPaperResult } from "./reviewHistory";
import type { PaperPerformancePoint } from "@/lib/types/programTrading/programTrading";

export async function loadSharedPaperReviews(requestedId: string | undefined, offset: number) {
  const rows = await listPaperResults(offset, true);
  const page = rows.slice(0, paperResultPageSize);
  const selectedId = requestedId && /^[a-f0-9]{32}$/.test(requestedId)
    ? requestedId
    : requestedId === undefined ? page[0]?.id : undefined;
  const review = selectedId ? await readPaperResult(selectedId).catch(() => null) : null;
  const performance = page.flatMap<PaperPerformancePoint>(({ id, finished_at, return_pct, balance_change }) =>
    return_pct != null && Number.isFinite(return_pct) && balance_change != null &&
      Number.isFinite(balance_change) && Number.isFinite(Date.parse(finished_at))
      ? [{ id, finishedAt: finished_at, returnPct: return_pct, balanceChange: balance_change }]
      : []).reverse();

  return {
    sessions: page.map(({ id, finished_at }) => ({ id, archivedAt: finished_at })),
    selectedId,
    review,
    performance,
    hasNext: rows.length > paperResultPageSize,
  };
}

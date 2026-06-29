/**
 * /analyze 두 테이블 합성 — 완료 결과(items) + 활성 작업(queue)을 종목별 카드로 병합. (unified-analysis-jobs §3-5)
 *
 * 순수 함수(네트워크 없음) — BFF(`decisions/route.ts`)가 조회한 두 소스를 받아 합성만 한다(단위테스트 대상).
 * - 같은 ticker 활성 작업이 있으면 그 완료 결과 item 에 `reanalysis` 표시(결과는 그대로 유지 = 재분석 중).
 * - 완료 결과가 없는 활성 작업은 `inflight` 플레이스홀더(첫 분석)로.
 * - `activeJobs` 는 최신순(created_at desc) 가정 — ticker 당 첫 등장만 채택(중복가드로 보통 1건).
 */

import type { AnalysisQueueRow } from "@/lib/types/stock/analysisQueue";
import type {
  AIDecisionListItem,
  AIInflightItem,
} from "@/lib/types/stock/aiAnalysisDecisions";

/** active 작업(pending/processing)만 들어온다는 전제 — 카드 표시용 상태로 좁힌다. */
function activeStatus(row: AnalysisQueueRow): "pending" | "processing" {
  return row.status === "pending" ? "pending" : "processing";
}

export function mergeActiveJobs(
  items: AIDecisionListItem[],
  activeJobs: AnalysisQueueRow[],
): { items: AIDecisionListItem[]; inflight: AIInflightItem[] } {
  // ticker 당 1건(최신순 첫 등장 = 최신).
  const activeByTicker = new Map<string, AnalysisQueueRow>();
  for (const job of activeJobs) {
    if (!activeByTicker.has(job.ticker)) activeByTicker.set(job.ticker, job);
  }

  // 완료 결과 카드 — 같은 ticker 가 재분석 중이면 reanalysis 표시(결과 유지). 흡수한 건 플레이스홀더에서 제외.
  const mergedItems = items.map((item): AIDecisionListItem => {
    const job = activeByTicker.get(item.ticker);
    if (job) activeByTicker.delete(item.ticker);
    return {
      ...item,
      reanalysis: job ? { status: activeStatus(job), source: job.source } : null,
    };
  });

  // 완료 결과 없는 활성 작업 → 첫 분석 플레이스홀더(최신순 유지).
  const inflight: AIInflightItem[] = [...activeByTicker.values()].map((job) => ({
    ticker: job.ticker,
    status: activeStatus(job),
    source: job.source,
    createdAt: job.createdAt,
  }));

  return { items: mergedItems, inflight };
}

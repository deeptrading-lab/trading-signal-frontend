/**
 * 시장/베타 보정 채점 실행 진입점(서버, v2) — 실제 Supabase store + KIS 종목/지수 일봉 +
 * 오프라인 벤치마크 해석을 주입해 relativeScoreDecisions 를 돌린다.
 *
 * PRD `scorecard-relative-scoring`. phase-1 `runScoring.ts` 의 비파괴 후속(같은 디스패처·라우트가
 * 이 함수로 교체 호출). KIS 게이트는 호출부에서 검사한다 — 본 함수는 채점 작업 자체만 담당.
 *
 * fail-soft: 종목/지수 조회 실패는 `fetchWithTransientRetryOrThrow` 로 transient 1회 재시도 후
 * 그대로 throw 전파 → relativeScoreDecisions 의 ticker 단위 catch 가 해당 행을 건드리지 않고 넘어가
 * horizon 을 pending/현상 유지(다음 cron 재시도). 절대 잘못된 0/skip 으로 채점 오염 금지.
 */

import { fetchDailyChunked } from "@/lib/api/kis/chartChunked";
import { fetchIndexDailyChunked } from "@/lib/api/kis/indexChartChunked";
import { getMarketByTicker } from "@/lib/api/kis/search";
import { fetchWithTransientRetryOrThrow } from "@/lib/server/bffUtils";
import {
  getRowsNeedingRelativeScoring,
  updateHorizonScore,
} from "@/lib/server/scorecard/scorecardStore";
import {
  relativeScoreDecisions,
  type RelativeScoreResult,
} from "@/lib/server/scorecard/relativeScoreDecisions";
import {
  SCORE_BATCH_LIMIT,
  SCORE_RETRY_BACKOFF_MS,
  BENCH_INDEX_CODE,
  BENCH_FALLBACK_CODE,
} from "@/lib/server/scorecard/constants";

/** 종목 → 벤치마크 지수 코드. 시드 미수록이면 폴백(KOSPI, PRD §6 한계 명시). */
export function resolveBenchCode(ticker: string): string {
  const market = getMarketByTicker(ticker);
  if (market === "KOSPI") return BENCH_INDEX_CODE.KOSPI;
  if (market === "KOSDAQ") return BENCH_INDEX_CODE.KOSDAQ;
  return BENCH_FALLBACK_CODE;
}

/** v2 채점 1회 실행. runScoring 과 동일하게 throw 하지 않는다(내부 ticker 격리 유지). */
export async function relativeRunScoring(): Promise<RelativeScoreResult> {
  return relativeScoreDecisions(
    {
      getRows: (limit) => getRowsNeedingRelativeScoring(limit),
      fetchStockDaily: (ticker, fromYmd, toYmd) =>
        fetchWithTransientRetryOrThrow(
          () => fetchDailyChunked(ticker, fromYmd, toYmd),
          SCORE_RETRY_BACKOFF_MS,
        ),
      fetchIndexDaily: (code, fromYmd, toYmd) =>
        fetchWithTransientRetryOrThrow(
          () => fetchIndexDailyChunked(code, fromYmd, toYmd),
          SCORE_RETRY_BACKOFF_MS,
        ),
      resolveBench: resolveBenchCode,
      updateHorizon: async (id, horizon, update) => {
        const r = await updateHorizonScore(id, horizon, update);
        return { ok: r.ok };
      },
    },
    { batchLimit: SCORE_BATCH_LIMIT },
  );
}

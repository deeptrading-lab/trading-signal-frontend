/**
 * 채점 실행 진입점(서버) — 실제 Supabase store + KIS 일봉을 주입해 scoreDecisions 를 돌린다.
 *
 * PRD `signal-scorecard` §3-2 / §9 D4. 단일 디스패처(flow-snapshot)와 독립 라우트
 * (`/api/cron/score-decisions`)가 공통으로 호출한다. KIS 게이트는 호출부에서 검사한다
 * (디스패처가 flow 와 게이트를 공유하므로 중복 호출 방지) — 본 함수는 채점 작업 자체만 담당.
 */

import { fetchDailyChunked } from "@/lib/api/kis/chartChunked";
import { fetchWithTransientRetryOrThrow } from "@/lib/server/bffUtils";
import {
  getPendingScorecardRows,
  updateHorizonScore,
} from "@/lib/server/scorecard/scorecardStore";
import {
  scoreDecisions,
  type ScoreDecisionsResult,
} from "@/lib/server/scorecard/scoreDecisions";
import {
  SCORE_BATCH_LIMIT,
  SCORE_RETRY_BACKOFF_MS,
} from "@/lib/server/scorecard/constants";

/**
 * 채점 1회 실행. KIS 조회 실패(transient 1회 재시도 후에도 실패·비-transient·타임아웃)는 **throw 로
 * 전파**되어 scoreDecisions 의 ticker 단위 catch 가 해당 행을 건드리지 않고 넘어가 horizon 을
 * `pending` 으로 남긴다(다음 cron 재시도 — 일시 장애가 영구 `skipped` 로 굳는 것을 방지). KIS 가
 * **성공적으로 빈 배열**을 반환한 경우(상폐·장기 거래정지)만 빈 캔들로 흘러 `skipped` 로 확정된다.
 * runScoring 자체는 throw 하지 않는다(상위 cron 의 fail-soft 는 scoreDecisions 내부 격리가 유지).
 */
export async function runScoring(): Promise<ScoreDecisionsResult> {
  return scoreDecisions({
    getPendingRows: (limit) => getPendingScorecardRows(limit),
    fetchDaily: (ticker, fromYmd, toYmd) =>
      // 폴백 없이 throw 전파 — 조회 실패와 "성공한 빈 캔들" 을 구분(영구 skip 오확정 방지).
      fetchWithTransientRetryOrThrow(
        () => fetchDailyChunked(ticker, fromYmd, toYmd),
        SCORE_RETRY_BACKOFF_MS,
      ),
    updateHorizon: async (id, horizon, update) => {
      const r = await updateHorizonScore(id, horizon, update);
      return { ok: r.ok };
    },
  }, SCORE_BATCH_LIMIT);
}

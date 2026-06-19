/**
 * 채점 실행 진입점(서버) — 실제 Supabase store + KIS 일봉을 주입해 scoreDecisions 를 돌린다.
 *
 * PRD `signal-scorecard` §3-2 / §9 D4. 단일 디스패처(flow-snapshot)와 독립 라우트
 * (`/api/cron/score-decisions`)가 공통으로 호출한다. KIS 게이트는 호출부에서 검사한다
 * (디스패처가 flow 와 게이트를 공유하므로 중복 호출 방지) — 본 함수는 채점 작업 자체만 담당.
 */

import { fetchDailyChunked } from "@/lib/api/kis/chartChunked";
import { fetchWithTransientRetry } from "@/lib/server/bffUtils";
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
 * 채점 1회 실행. KIS transient 실패는 ticker 단위로 1회 재시도 후 빈 배열 폴백(scoreDecisions 가
 * 빈 캔들을 도래 미달/skip 으로 처리). 전체는 throw 하지 않는다(상위 cron 의 fail-soft 유지).
 */
export async function runScoring(): Promise<ScoreDecisionsResult> {
  return scoreDecisions({
    getPendingRows: (limit) => getPendingScorecardRows(limit),
    fetchDaily: (ticker, fromYmd, toYmd) =>
      fetchWithTransientRetry(
        () => fetchDailyChunked(ticker, fromYmd, toYmd),
        [],
        SCORE_RETRY_BACKOFF_MS,
      ),
    updateHorizon: async (id, horizon, update) => {
      const r = await updateHorizonScore(id, horizon, update);
      return { ok: r.ok };
    },
  }, SCORE_BATCH_LIMIT);
}

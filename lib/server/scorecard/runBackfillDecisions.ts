/**
 * 결정 원장 → 채점 원장 backfill 실행 진입점(서버) — 실제 Supabase store + KIS 종목 일봉 +
 * 오프라인 벤치마크 해석을 주입해 `backfillScorecardFromDecisions` 를 돌린다.
 *
 * PRD `scorecard-backfill-decisions`. 디스패처 cron(`flow-snapshot`)이 flow 적립 후, 채점
 * (relativeRunScoring) **앞에** 호출한다 → backfill 로 새로 들어온 행이 같은 패스 채점에서 잡힌다.
 *
 * KIS 게이트는 호출부(cron)에서 검사한다 — 본 함수는 backfill 작업 자체만 담당.
 * fail-soft: 종목 일봉 조회 실패는 transient 1회 재시도 후 throw 전파 → backfillScorecardFromDecisions
 * 의 결정 단위 catch 가 해당 결정만 보류(다음 cron 재시도). 절대 null entry 로 insert 금지.
 */

import { fetchDailyChunked } from "@/lib/api/kis/chartChunked";
import { fetchWithTransientRetryOrThrow } from "@/lib/server/bffUtils";
import { getAllAIDecisions } from "@/lib/server/ai/decisionStore";
import {
  getScorecardKeys,
  insertScorecardRow,
} from "@/lib/server/scorecard/scorecardStore";
import { resolveBenchCode } from "@/lib/server/scorecard/relativeRunScoring";
import {
  backfillScorecardFromDecisions,
  type BackfillDecisionsResult,
} from "@/lib/server/scorecard/backfillDecisions";
import {
  SCORE_BATCH_LIMIT,
  SCORE_RETRY_BACKOFF_MS,
} from "@/lib/server/scorecard/constants";

/** 1회 패스에서 훑을 결정 원장 행 수. 결정 원장은 ticker PK 라 종목 수만큼만 존재(소규모). */
const DECISION_SCAN_LIMIT = 500;

/** backfill 1회 실행. relativeRunScoring 과 동일하게 throw 하지 않는다(결정 단위 격리 유지). */
export async function runBackfillDecisions(): Promise<BackfillDecisionsResult> {
  return backfillScorecardFromDecisions({
    getDecisions: (limit) => getAllAIDecisions(limit),
    getExistingKeys: () => getScorecardKeys(),
    fetchStockDaily: (ticker, fromYmd, toYmd) =>
      fetchWithTransientRetryOrThrow(
        () => fetchDailyChunked(ticker, fromYmd, toYmd),
        SCORE_RETRY_BACKOFF_MS,
      ),
    resolveBench: resolveBenchCode,
    insertRow: (input) => insertScorecardRow(input),
    limit: Math.max(SCORE_BATCH_LIMIT, DECISION_SCAN_LIMIT),
  });
}

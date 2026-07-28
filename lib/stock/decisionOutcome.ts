/**
 * 저장된 판정의 **채점 결과 요약** — /analyze 카드에 "이 판단이 맞았나"를 붙이기 위한 순수 로직.
 *
 * ## 배경
 * `signal_scorecard` 는 판정마다 d1/w1/w2/m1 네 시점의 적중(hit/miss/flat)을 쌓지만, 그 결과를 보려면
 * `/dashboard/scorecard` 집계로 가야 했다. 정작 **판정을 읽는 자리**(/analyze 카드)에는 피드백이 0이라
 * "지난 판단이 맞았는지"를 알 수 없었다. #347 로 채점이 복구돼 데이터가 매일 쌓이는 지금, 이 연결이 빠진
 * 고리다.
 *
 * ## 매칭 규칙
 * 카드는 종목당 **최신 결론 1건**(upsert)이고 채점 원장은 **실행마다 append** 라 같은 판정을 가리킬 키가 필요하다.
 *   1순위 **run_id 정확 일치** — 양쪽 모두 실행 단위로 갖고 있어 모호함이 없다.
 *   2순위 시각 근접 — run_id 가 없는 행(토큰 미기록 등) 폴백. 라이브는 같은 요청에서 upsert→insert 라
 *   초 단위, backfill 은 `decidedAt = updatedAt`(오차 0)이므로 창을 **분 단위로 좁게** 잡는다.
 *   창을 넓게 두면 최신 실행의 원장 insert 가 빠졌을 때 **어제 실행 결과가 오늘 카드에 붙는다**(오귀속).
 *
 * ## 표시 선택
 * 네 시점을 다 보여주면 카드가 시끄러워지므로 **가장 성숙한(먼) 채점 완료 시점 하나**만 고른다
 * (m1 > w2 > w1 > d1). 아직 하나도 채점 전이면 null → 카드에 아무것도 붙지 않는다.
 * `skipped`(봉 부재)는 표시 대상에서 제외한다 — 판정의 성패가 아니라 데이터 사정이다.
 */

import type { HorizonStatus, ScorecardHorizon } from "@/lib/types/scorecard/scorecard";

/** 카드에 붙일 채점 결과 — 어느 시점에 어떤 결과였는지 + 그때 초과수익. */
export interface DecisionOutcome {
  horizon: ScorecardHorizon;
  /** 표시 대상은 hit/miss/flat 뿐(pending·skipped 는 선택되지 않는다). */
  status: Extract<HorizonStatus, "hit" | "miss" | "flat">;
  /** 해당 시점 초과수익(%p, 벤치 대비). 없으면 null. */
  excessReturnPct: number | null;
}

/** 매칭·선택 입력 — 원장 1행에서 필요한 것만. */
export interface OutcomeCandidate {
  ticker: string;
  decidedAt: string;
  /** 실행 식별자(원장 run_id). 카드의 tokens.runId 와 정확 일치가 1순위 매칭 키. 없으면 null. */
  runId: string | null;
  statuses: Record<ScorecardHorizon, HorizonStatus>;
  excess: Record<ScorecardHorizon, number | null>;
}

/** 성숙도 내림차순 — 가장 먼 시점부터 고른다. */
const HORIZON_BY_MATURITY: ScorecardHorizon[] = ["m1", "w2", "w1", "d1"];

/**
 * run_id 폴백 시 같은 실행으로 볼 허용 오차(ms). 라이브 insert 는 초 단위·backfill 은 0 이라
 * 10분이면 충분하고, 이보다 넓히면 직전 실행 결과를 최신 카드에 잘못 붙일 위험이 커진다.
 */
export const OUTCOME_MATCH_WINDOW_MS = 10 * 60 * 1000;

function timeOf(iso: string): number | null {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * 같은 판정으로 볼 수 있는 원장 행 중 **시각이 가장 가까운** 것을 고른다. 없으면 null.
 * (재분석으로 같은 ticker 행이 여러 개 쌓여도 카드가 가리키는 실행에 붙는다.)
 */
export function pickOutcomeRow(
  candidates: OutcomeCandidate[],
  decisionUpdatedAt: string,
  runId?: string | null,
): OutcomeCandidate | null {
  // 1순위 — run_id 정확 일치(모호함 없음).
  if (runId) {
    const exact = candidates.find((row) => row.runId === runId);
    if (exact) return exact;
  }

  // 2순위 — 시각 근접(좁은 창).
  const target = timeOf(decisionUpdatedAt);
  if (target === null) return null;

  let best: { row: OutcomeCandidate; diff: number } | null = null;
  for (const row of candidates) {
    const t = timeOf(row.decidedAt);
    if (t === null) continue;
    const diff = Math.abs(t - target);
    if (diff > OUTCOME_MATCH_WINDOW_MS) continue;
    if (!best || diff < best.diff) best = { row, diff };
  }
  return best?.row ?? null;
}

/**
 * 가장 성숙한 채점 완료 시점 하나를 고른다. 전부 pending/skipped 면 null(카드에 표시 없음).
 */
export function selectDecisionOutcome(row: OutcomeCandidate | null): DecisionOutcome | null {
  if (!row) return null;
  for (const horizon of HORIZON_BY_MATURITY) {
    const status = row.statuses[horizon];
    if (status === "hit" || status === "miss" || status === "flat") {
      return { horizon, status, excessReturnPct: row.excess[horizon] ?? null };
    }
  }
  return null;
}

/** 매칭 + 선택을 한 번에. */
export function resolveDecisionOutcome(
  candidates: OutcomeCandidate[],
  decisionUpdatedAt: string,
  runId?: string | null,
): DecisionOutcome | null {
  return selectDecisionOutcome(pickOutcomeRow(candidates, decisionUpdatedAt, runId));
}

/**
 * 오픈베타 조건 — 판정 정직성 자동 항목 3개(순수 함수, `now` 주입으로 결정론).
 *
 * PRD `ai-direction-quality` §10-1. 방향 적중 게이트는 참고 지표로 강등됐고, 오픈베타 조건은
 * "판정이 정직한가" 를 본다. 수동 항목(2 가격 레벨 창작 0 · 5 적중·수익 주장 0)은 계산하지 않는다.
 *
 * 1. 무효화 라인 보유율 — 최근 28일(entry_date, KST) 진입한 강세·약세 판정 중 stopLossPct 보유 비율.
 * 3. 채점 연속성 — KV 헬스 마커(마지막 cron 실행)가 ok 이고 3영업일 이내. PRD 원문 "최근 4주
 *    워크플로 실패 0" 의 대리 지표(서버에서 GitHub API 를 부르지 않기 위해). 마커는 마지막 1회만
 *    남으므로 그 사이 실패가 있었다가 회복된 경우는 잡지 못한다.
 * 4. 채점 배지 부착률 — updated_at 이 16일 이상 지난 KR 카드 중 `resolveDecisionOutcome` 이 붙는 비율.
 */

import {
  OPEN_BETA_BADGE_MATURE_DAYS,
  OPEN_BETA_COVERAGE_MIN_RATE,
  OPEN_BETA_CRON_MAX_BUSINESS_DAYS,
  OPEN_BETA_STOP_LINE_WINDOW_DAYS,
} from "@/lib/server/scorecard/constants";
import type { ScorecardCronMeta } from "@/lib/server/scorecard/scorecardCronMeta";
import { businessDaysBetween } from "@/lib/utils/businessDays";
import {
  resolveDecisionOutcome,
  toOutcomeCandidate,
  type OutcomeCandidate,
} from "@/lib/stock/decisionOutcome";
import type {
  OpenBetaConditions,
  OpenBetaContinuityCheck,
  OpenBetaRatioCheck,
  ScorecardRow,
} from "@/lib/types/scorecard/scorecard";

/** 배지 부착률 대상 카드 — `ai_analysis_decisions` 의 경량 projection. */
export interface DecisionCardKey {
  ticker: string;
  updatedAt: string;
  runId: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const KR_TICKER_RE = /^\d{6}$/;
const DIRECTIONAL_VERDICTS = new Set<ScorecardRow["verdict"]>([
  "BUY",
  "OVERWEIGHT",
  "SELL",
  "REDUCE",
  "UNDERWEIGHT",
]);

/** 시각 → KST 날짜 "YYYY-MM-DD". */
function kstDate(ms: number): string {
  return new Date(ms + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" → 로컬 자정 Date(businessDaysBetween 이 로컬 요일로 센다 — TZ 무관하게 맞춘다). */
function localMidnight(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function ratio(n: number, count: number): OpenBetaRatioCheck {
  const rate = n > 0 ? count / n : null;
  return {
    status: rate === null ? "pending" : rate >= OPEN_BETA_COVERAGE_MIN_RATE ? "pass" : "fail",
    n,
    count,
    rate,
  };
}

/** 1. 최근 28일 진입 강세·약세 판정의 무효화 라인 보유율. */
export function summarizeStopLineCoverage(rows: ScorecardRow[], now: Date): OpenBetaRatioCheck {
  const since = kstDate(now.getTime() - OPEN_BETA_STOP_LINE_WINDOW_DAYS * DAY_MS);
  const target = rows.filter(
    (r) => DIRECTIONAL_VERDICTS.has(r.verdict) && r.entryDate >= since,
  );
  return ratio(target.length, target.filter((r) => r.stopLossPct != null).length);
}

/** 3. 채점 cron 연속성. `"unavailable"` = 마커 조회 자체가 실패. */
export function summarizeCronContinuity(
  meta: ScorecardCronMeta | null | "unavailable",
  now: Date,
): OpenBetaContinuityCheck {
  if (meta === "unavailable") {
    return { status: "unknown", reason: "unavailable", lastRunAt: null, businessDaysAgo: null };
  }
  const at = meta ? new Date(meta.at).getTime() : NaN;
  if (!meta || !Number.isFinite(at)) {
    return { status: "fail", reason: "no_marker", lastRunAt: null, businessDaysAgo: null };
  }
  const businessDaysAgo = businessDaysBetween(
    localMidnight(kstDate(at)),
    localMidnight(kstDate(now.getTime())),
  );
  const base = { lastRunAt: meta.at, businessDaysAgo };
  if (!meta.ok) return { status: "fail", reason: "not_ok", ...base };
  if (businessDaysAgo > OPEN_BETA_CRON_MAX_BUSINESS_DAYS) {
    return { status: "fail", reason: "stale", ...base };
  }
  return { status: "pass", reason: "ok", ...base };
}

/** 4. 채점 시점(16일)이 지난 KR 카드의 채점 배지 부착률. `null` = 카드 조회 실패. */
export function summarizeBadgeCoverage(
  cards: DecisionCardKey[] | null,
  rows: ScorecardRow[],
  now: Date,
): OpenBetaRatioCheck {
  if (cards === null) return { status: "unknown", n: 0, count: 0, rate: null };

  const cutoff = now.getTime() - OPEN_BETA_BADGE_MATURE_DAYS * DAY_MS;
  const mature = cards.filter((c) => {
    const t = new Date(c.updatedAt).getTime();
    return KR_TICKER_RE.test(c.ticker) && Number.isFinite(t) && t <= cutoff;
  });

  // /analyze 카드 부착(attachOutcome)과 같은 규칙 — 같은 ticker 후보 안에서만 매칭한다.
  const byTicker = new Map<string, OutcomeCandidate[]>();
  for (const row of rows) {
    const list = byTicker.get(row.ticker) ?? [];
    list.push(toOutcomeCandidate(row));
    byTicker.set(row.ticker, list);
  }
  // 원장 조회 실패는 빈 배열로 온다 — 성숙 카드가 있는데 원장이 비면 "0% 미달"이 아니라 확인 불가.
  if (rows.length === 0 && mature.length > 0) return { status: "unknown", n: 0, count: 0, rate: null };
  const withBadge = mature.filter(
    (c) => resolveDecisionOutcome(byTicker.get(c.ticker) ?? [], c.updatedAt, c.runId) !== null,
  ).length;
  return ratio(mature.length, withBadge);
}

export function summarizeOpenBetaConditions(input: {
  rows: ScorecardRow[];
  cards: DecisionCardKey[] | null;
  cronMeta: ScorecardCronMeta | null | "unavailable";
  now: Date;
}): OpenBetaConditions {
  return {
    stopLine: summarizeStopLineCoverage(input.rows, input.now),
    continuity: summarizeCronContinuity(input.cronMeta, input.now),
    badge: summarizeBadgeCoverage(input.cards, input.rows, input.now),
    minRate: OPEN_BETA_COVERAGE_MIN_RATE,
    windowDays: OPEN_BETA_STOP_LINE_WINDOW_DAYS,
    maxBusinessDays: OPEN_BETA_CRON_MAX_BUSINESS_DAYS,
    matureDays: OPEN_BETA_BADGE_MATURE_DAYS,
  };
}

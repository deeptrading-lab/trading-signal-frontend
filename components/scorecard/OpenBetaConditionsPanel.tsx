/**
 * OpenBetaConditionsPanel — 오픈베타 조건(판정 정직성) 운영자 표시. PRD `ai-direction-quality` §10-1.
 *
 * 자동 3항목(무효화 라인 보유율·채점 연속성·채점 배지 부착률)은 서버 집계 결과를, 수동 2항목(가격 레벨
 * 창작 0·적중률/수익 주장 0)은 점검 안내만 보인다. 판정 색은 채점 톤(통과=outcome-hit / 미달=warn /
 * 보류·확인 불가·수동=muted) — 등락색 미사용. 표 스타일·모바일 가로 스크롤은 DirectionGatePanel 정합.
 */

import { cn } from "@/lib/utils/cn";
import type {
  OpenBetaCheckStatus,
  OpenBetaConditions,
  OpenBetaContinuityCheck,
} from "@/lib/types/scorecard/scorecard";
import {
  OPEN_BETA_COL_CONDITION,
  OPEN_BETA_COL_RESULT,
  OPEN_BETA_COL_VALUE,
  OPEN_BETA_CONTINUITY_REASON,
  OPEN_BETA_ITEMS,
  OPEN_BETA_RESULT,
  OPEN_BETA_TITLE,
  OPEN_BETA_UNAVAILABLE,
  openBetaHeadline,
  openBetaRatioValue,
} from "@/lib/copy/scorecard/labels";

type RowResult = OpenBetaCheckStatus | "manual";

const RESULT_TONE: Record<RowResult, string> = {
  pass: "text-outcome-hit",
  fail: "text-warn",
  pending: "text-text-muted",
  unknown: "text-text-muted",
  manual: "text-text-muted",
};

function continuityValue(c: OpenBetaContinuityCheck): string {
  const days = c.businessDaysAgo ?? 0;
  if (c.reason === "ok") return OPEN_BETA_CONTINUITY_REASON.ok(days);
  if (c.reason === "stale") return OPEN_BETA_CONTINUITY_REASON.stale(days);
  return OPEN_BETA_CONTINUITY_REASON[c.reason];
}

export function OpenBetaConditionsPanel({ conditions: c }: { conditions: OpenBetaConditions }) {
  const ratioValue = (
    check: OpenBetaConditions["stopLine"],
    empty: string,
  ): string =>
    check.status === "unknown"
      ? OPEN_BETA_UNAVAILABLE
      : openBetaRatioValue(check.n, check.count, check.rate, empty);

  const rows: Array<{ key: string; label: string; criteria: string; value: string; result: RowResult }> = [
    {
      key: "stopLine",
      label: OPEN_BETA_ITEMS.stopLine.label,
      criteria: OPEN_BETA_ITEMS.stopLine.criteria(c.minRate, c.windowDays),
      value: ratioValue(c.stopLine, OPEN_BETA_ITEMS.stopLine.empty),
      result: c.stopLine.status,
    },
    {
      key: "levels",
      label: OPEN_BETA_ITEMS.levels.label,
      criteria: OPEN_BETA_ITEMS.levels.criteria,
      value: OPEN_BETA_ITEMS.levels.manual,
      result: "manual",
    },
    {
      key: "continuity",
      label: OPEN_BETA_ITEMS.continuity.label,
      criteria: OPEN_BETA_ITEMS.continuity.criteria(c.maxBusinessDays),
      value: continuityValue(c.continuity),
      result: c.continuity.status,
    },
    {
      key: "badge",
      label: OPEN_BETA_ITEMS.badge.label,
      criteria: OPEN_BETA_ITEMS.badge.criteria(c.minRate, c.matureDays),
      value: ratioValue(c.badge, OPEN_BETA_ITEMS.badge.empty),
      result: c.badge.status,
    },
    {
      key: "claims",
      label: OPEN_BETA_ITEMS.claims.label,
      criteria: OPEN_BETA_ITEMS.claims.criteria,
      value: OPEN_BETA_ITEMS.claims.manual,
      result: "manual",
    },
  ];

  const auto = [c.stopLine.status, c.continuity.status, c.badge.status];
  const failCount = auto.filter((s) => s === "fail").length;
  const pendingCount = auto.filter((s) => s === "pending" || s === "unknown").length;
  const overall: RowResult = failCount > 0 ? "fail" : pendingCount > 0 ? "pending" : "pass";

  return (
    <section className="flex flex-col gap-xs" aria-labelledby="open-beta-title">
      <div className="flex flex-wrap items-baseline gap-x-md gap-y-xs">
        <h2 id="open-beta-title" className="text-body-md font-bold text-text-strong">
          {OPEN_BETA_TITLE}
        </h2>
        <span className={cn("text-body-sm font-medium", RESULT_TONE[overall])}>
          {openBetaHeadline(failCount, pendingCount)}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border-line">
              <th scope="col" className="py-md pr-md text-left text-label-sm text-text-muted">
                {OPEN_BETA_COL_CONDITION}
              </th>
              <th scope="col" className="py-md pl-md text-right text-label-sm text-text-muted whitespace-nowrap">
                {OPEN_BETA_COL_VALUE}
              </th>
              <th scope="col" className="py-md pl-md text-right text-label-sm text-text-muted whitespace-nowrap">
                {OPEN_BETA_COL_RESULT}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.key} className="border-b border-border-line last:border-b-0">
                <th scope="row" className="py-md pr-md text-left font-normal">
                  <span className="block text-body-sm text-text-strong">
                    {i + 1}. {r.label}
                  </span>
                  <span className="block text-caption text-text-muted">{r.criteria}</span>
                </th>
                <td
                  className={cn(
                    "py-md pl-md text-right text-body-sm tabular-nums",
                    r.result === "manual" ? "text-text-muted" : "text-text-strong whitespace-nowrap",
                  )}
                >
                  {r.value}
                </td>
                <td
                  className={cn(
                    "py-md pl-md text-right text-body-sm font-medium whitespace-nowrap",
                    RESULT_TONE[r.result],
                  )}
                >
                  {OPEN_BETA_RESULT[r.result]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

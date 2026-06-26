/**
 * ScorecardTable — 적중률 집계 표(presentational).
 *
 * PRD `signal-scorecard` §3-3-B + `scorecard-relative-scoring`.
 * 컬럼: 구분 / 평가시점 / 적중 / 미적중 / 보합 / 표본수 / 적중률(초과) / 적중률(절대).
 * - **적중률(초과)** = hit/(hit+miss) — 주 지표(시장 대비 초과수익). 분모 0 이면 "—".
 * - **적중률(절대)** = absHit/(absHit+absMiss) — 시장 베타 포함 참고치(병기).
 * - 표본 N<5 행은 회색 처리 + 안내(작은 표본 오해 방지).
 * - 색·px 직타 금지 — 디자인 토큰(text-text-*, text-signal-*, table-row-h 등) + cn 사용.
 */

"use client";

import { cn } from "@/lib/utils/cn";
import { formatPct } from "@/lib/utils/formatPct";
import type {
  ScorecardDimension,
  ScorecardSummaryCell,
} from "@/lib/types/scorecard/scorecard";
import {
  COL_FLAT,
  COL_HIT,
  COL_HIT_RATE_ABS,
  COL_HIT_RATE_EXCESS,
  COL_HORIZON,
  COL_KEY,
  COL_MISS,
  COL_TOTAL,
  CONFIDENCE_LABEL,
  HIT_RATE_NA,
  HORIZON_LABEL,
  REGIME_LABEL,
  SMALL_SAMPLE_HINT,
  SMALL_SAMPLE_THRESHOLD,
  VERDICT_LABEL,
} from "@/lib/copy/scorecard/labels";

interface ScorecardTableProps {
  cells: ScorecardSummaryCell[];
}

/** 차원별 행 라벨 — verdict/confidence/regime 는 한글 매핑, 그 외는 키 그대로(신호 강도 구간 등). */
function rowLabel(dimension: ScorecardDimension, key: string): string {
  if (dimension === "verdict") return VERDICT_LABEL[key] ?? key;
  if (dimension === "confidence") return CONFIDENCE_LABEL[key] ?? key;
  if (dimension === "regime") return REGIME_LABEL[key] ?? key;
  if (dimension === "horizon") {
    return HORIZON_LABEL[key as keyof typeof HORIZON_LABEL] ?? key;
  }
  return key;
}

function horizonLabel(horizon: ScorecardSummaryCell["horizon"]): string {
  return HORIZON_LABEL[horizon as keyof typeof HORIZON_LABEL] ?? horizon;
}

function rateText(rate: number | null, denom: number): string {
  return denom > 0 && rate !== null
    ? formatPct(rate * 100, { digits: 0 })
    : HIT_RATE_NA;
}

export function ScorecardTable({ cells }: ScorecardTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-body-sm">
        <thead>
          <tr className="border-b border-border-line text-text-muted">
            <th className="py-sm pr-md text-left font-medium">{COL_KEY}</th>
            <th className="px-table-cell-px text-left font-medium">{COL_HORIZON}</th>
            <th className="px-table-cell-px text-right font-medium">{COL_HIT}</th>
            <th className="px-table-cell-px text-right font-medium">{COL_MISS}</th>
            <th className="px-table-cell-px text-right font-medium">{COL_FLAT}</th>
            <th className="px-table-cell-px text-right font-medium">{COL_TOTAL}</th>
            <th className="px-table-cell-px text-right font-medium text-text-strong">
              {COL_HIT_RATE_EXCESS}
            </th>
            <th className="pl-table-cell-px text-right font-medium">{COL_HIT_RATE_ABS}</th>
          </tr>
        </thead>
        <tbody>
          {cells.map((cell) => {
            const denom = cell.hit + cell.miss;
            const small = cell.total < SMALL_SAMPLE_THRESHOLD;
            return (
              <tr
                key={`${cell.dimension}-${cell.key}-${cell.horizon}`}
                className={cn(
                  "h-table-row-h border-b border-border-line/60",
                  small ? "text-text-muted" : "text-text-strong",
                )}
              >
                <td className="py-sm pr-md font-medium">
                  <span>{rowLabel(cell.dimension, cell.key)}</span>
                  {small && (
                    <span className="ml-sm text-caption text-text-muted">
                      {SMALL_SAMPLE_HINT}
                    </span>
                  )}
                </td>
                <td className="px-table-cell-px text-text-muted">
                  {horizonLabel(cell.horizon)}
                </td>
                <td className="px-table-cell-px text-right tabular-nums text-signal-up">
                  {cell.hit}
                </td>
                <td className="px-table-cell-px text-right tabular-nums text-signal-down">
                  {cell.miss}
                </td>
                <td className="px-table-cell-px text-right tabular-nums text-text-muted">
                  {cell.flat}
                </td>
                <td className="px-table-cell-px text-right tabular-nums">{cell.total}</td>
                <td className="px-table-cell-px text-right font-semibold tabular-nums text-text-strong">
                  {rateText(cell.hitRate, denom)}
                </td>
                <td className="pl-table-cell-px text-right tabular-nums text-text-muted">
                  {rateText(cell.absHitRate, cell.absSample)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

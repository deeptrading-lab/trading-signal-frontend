/**
 * ScorecardTable — 적중률 집계 표(presentational).
 *
 * PRD `signal-scorecard` §3-3-B + `scorecard-relative-scoring`.
 * 컬럼: 구분 / 평가시점 / 적중 / 미적중 / 보합 / 표본수 / 적중률(초과) / 적중률(절대).
 * - **적중률(초과)** = hit/(hit+miss) — 주 지표(시장 대비 초과수익). 분모 0 이면 "—".
 * - **적중률(절대)** = absHit/(absHit+absMiss) — 시장 베타 포함 참고치(병기).
 * - 표본 N<5 행은 회색 처리 + 안내(작은 표본 오해 방지).
 *
 * scorecard-reskin(카드리스/화이트포워드) — 카드 박스 없이 흰 바탕 위 헤어라인 표
 * (홈 `AgentUsageTable`·`ModelCostBreakdown` 표 언어: thead 하단 헤어라인 + `text-label-sm`
 * 라벨, tbody 행 헤어라인 + hover, 셀 `py-md` 리듬). 등락색(적중=signal-up 빨강 / 미적중=
 * signal-down 파랑)·표본 N<5 회색 처리는 무변경. 색·px 직타 금지 — 디자인 토큰 + cn.
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
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-border-line">
            <th scope="col" className="py-md pr-md text-left text-label-sm text-text-muted">
              {COL_KEY}
            </th>
            <th
              scope="col"
              className="py-md pr-md text-left text-label-sm text-text-muted whitespace-nowrap"
            >
              {COL_HORIZON}
            </th>
            <Th>{COL_HIT}</Th>
            <Th>{COL_MISS}</Th>
            <Th>{COL_FLAT}</Th>
            <Th>{COL_TOTAL}</Th>
            <th
              scope="col"
              className="py-md pl-md text-right text-label-sm text-text-strong whitespace-nowrap"
            >
              {COL_HIT_RATE_EXCESS}
            </th>
            <th
              scope="col"
              className="py-md pl-md text-right text-label-sm text-text-muted whitespace-nowrap"
            >
              {COL_HIT_RATE_ABS}
            </th>
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
                  "border-b border-border-line hover:bg-surface-muted",
                  small ? "text-text-muted" : "text-text-strong",
                )}
              >
                <td className="py-md pr-md text-body-sm-strong">
                  <span>{rowLabel(cell.dimension, cell.key)}</span>
                  {small && (
                    <span className="ml-sm text-caption text-text-muted">
                      {SMALL_SAMPLE_HINT}
                    </span>
                  )}
                </td>
                <td className="py-md pr-md text-body-sm text-text-muted whitespace-nowrap">
                  {horizonLabel(cell.horizon)}
                </td>
                <td className="py-md pl-md text-right text-body-sm tabular-nums text-signal-up">
                  {cell.hit}
                </td>
                <td className="py-md pl-md text-right text-body-sm tabular-nums text-signal-down">
                  {cell.miss}
                </td>
                <td className="py-md pl-md text-right text-body-sm tabular-nums text-text-muted">
                  {cell.flat}
                </td>
                <td className="py-md pl-md text-right text-body-sm tabular-nums">
                  {cell.total}
                </td>
                <td className="py-md pl-md text-right text-body-sm-strong tabular-nums text-text-strong">
                  {rateText(cell.hitRate, denom)}
                </td>
                <td className="py-md pl-md text-right text-body-sm tabular-nums text-text-muted">
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

/** 우측 정렬 숫자 컬럼 헤더(적중/미적중/보합/표본수) — 홈 표 헤더 언어. */
function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="py-md pl-md text-right text-label-sm text-text-muted whitespace-nowrap"
    >
      {children}
    </th>
  );
}

/**
 * 요약 지표 카드 — 분석 1회 평균 비용 / 평균 입력·출력 합 / 캐시 적중률 / 평균 소요(wall-clock).
 * 토큰·비용은 분석가별 평균을 합산해 "분석 1회" 단위 총량을 추정하고,
 * 소요시간은 run 단위 wall-clock(병렬 반영)을 별도로 받는다.
 */

"use client";

import type { AgentUsageRow } from "@/lib/types/stock/agentUsage";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { fmtCostRounded, fmtDuration, fmtRate, fmtTokens } from "./format";
import {
  CARD_AVG_COST,
  CARD_CACHE_HINT,
  CARD_CACHE_HIT,
  CARD_TOTAL_AVG_INPUT,
  CARD_TOTAL_AVG_OUTPUT,
  CARD_WALL_CLOCK,
  CARD_WALL_CLOCK_HINT,
} from "@/lib/copy/analyze/labels";

function sum(xs: (number | null)[]): number {
  return xs.reduce<number>((a, b) => a + (b ?? 0), 0);
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card flex flex-col gap-xs">
      <span className="flex items-center gap-xs text-caption text-text-muted">
        {label}
        {hint ? <InfoTooltip label={hint} /> : null}
      </span>
      <strong className="text-h2 text-text-strong tabular-nums">{value}</strong>
    </div>
  );
}

export function CacheCostCards({
  rows,
  wallClockMs,
}: {
  rows: AgentUsageRow[];
  wallClockMs: number | null;
}) {
  const totalInput = sum(rows.map((r) => r.avgInputTokens));
  const totalCacheRead = sum(rows.map((r) => r.avgCacheReadTokens));
  const totalOutput = sum(rows.map((r) => r.avgOutputTokens));
  const totalCost = sum(rows.map((r) => r.avgCostUsd));
  const denom = totalInput + totalCacheRead;
  const cacheHit = denom > 0 ? totalCacheRead / denom : null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-md">
      <MetricCard label={CARD_AVG_COST} value={fmtCostRounded(totalCost > 0 ? totalCost : null)} />
      <MetricCard
        label={CARD_WALL_CLOCK}
        value={fmtDuration(wallClockMs)}
        hint={CARD_WALL_CLOCK_HINT}
      />
      <MetricCard label={CARD_TOTAL_AVG_INPUT} value={fmtTokens(totalInput > 0 ? totalInput : null)} />
      <MetricCard label={CARD_TOTAL_AVG_OUTPUT} value={fmtTokens(totalOutput > 0 ? totalOutput : null)} />
      <MetricCard label={CARD_CACHE_HIT} value={fmtRate(cacheHit)} hint={CARD_CACHE_HINT} />
    </div>
  );
}

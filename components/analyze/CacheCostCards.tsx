/**
 * 요약 지표 카드 — 분석 1회 평균 비용 / 평균 입력·출력 합 / 캐시 적중률.
 * 분석가별 평균을 합산해 "분석 1회" 단위 총량을 추정한다.
 */

"use client";

import type { AgentUsageRow } from "@/lib/types/stock/agentUsage";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { fmtCostRounded, fmtRate, fmtTokens } from "./format";
import {
  CARD_AVG_COST,
  CARD_CACHE_HINT,
  CARD_CACHE_HIT,
  CARD_TOTAL_AVG_INPUT,
  CARD_TOTAL_AVG_OUTPUT,
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

export function CacheCostCards({ rows }: { rows: AgentUsageRow[] }) {
  const totalInput = sum(rows.map((r) => r.avgInputTokens));
  const totalCacheRead = sum(rows.map((r) => r.avgCacheReadTokens));
  const totalOutput = sum(rows.map((r) => r.avgOutputTokens));
  const totalCost = sum(rows.map((r) => r.avgCostUsd));
  const denom = totalInput + totalCacheRead;
  const cacheHit = denom > 0 ? totalCacheRead / denom : null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
      <MetricCard label={CARD_AVG_COST} value={fmtCostRounded(totalCost > 0 ? totalCost : null)} />
      <MetricCard label={CARD_TOTAL_AVG_INPUT} value={fmtTokens(totalInput > 0 ? totalInput : null)} />
      <MetricCard label={CARD_TOTAL_AVG_OUTPUT} value={fmtTokens(totalOutput > 0 ? totalOutput : null)} />
      <MetricCard label={CARD_CACHE_HIT} value={fmtRate(cacheHit)} hint={CARD_CACHE_HINT} />
    </div>
  );
}

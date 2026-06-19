/**
 * 분석가별 평균 토큰 — stacked bar.
 * 입력 막대(신규 입력 + 캐시 입력 = 총 입력) + 출력 막대를 분석가별로 나란히.
 * 막대가 길수록 절감 여지가 큰 분석가.
 */

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useChartTheme } from "@/hooks/utils/useChartTheme";
import type { AgentUsageRow } from "@/lib/types/stock/agentUsage";
import { agentLabel, fmtTokens } from "./format";
import {
  CHART_BAR_HINT,
  CHART_BAR_TITLE,
  LEGEND_CACHE_READ,
  LEGEND_FRESH_INPUT,
  LEGEND_OUTPUT,
} from "@/lib/copy/analyze/labels";

export function AgentTokenBarChart({ rows }: { rows: AgentUsageRow[] }) {
  const theme = useChartTheme();

  const data = rows.map((r) => ({
    name: agentLabel(r.agentKey),
    fresh: r.avgInputTokens ?? 0,
    cache: r.avgCacheReadTokens ?? 0,
    output: r.avgOutputTokens ?? 0,
  }));

  return (
    <section className="card">
      <header className="mb-md">
        <h2 className="text-h3 text-text-strong">{CHART_BAR_TITLE}</h2>
        <p className="text-caption text-text-muted mt-xs">{CHART_BAR_HINT}</p>
      </header>
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 48 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.C.grid} vertical={false} />
            <XAxis
              dataKey="name"
              {...theme.axisProps}
              angle={-35}
              textAnchor="end"
              interval={0}
              height={48}
            />
            <YAxis {...theme.axisProps} width={48} tickFormatter={(v: number) => fmtTokens(v)} />
            <Tooltip
              contentStyle={theme.tooltipStyle}
              labelStyle={theme.labelStyle}
              formatter={(v, name) => [fmtTokens(Number(v)), name]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="fresh" name={LEGEND_FRESH_INPUT} stackId="input" fill={theme.C.macdLine} radius={[0, 0, 0, 0]} />
            <Bar dataKey="cache" name={LEGEND_CACHE_READ} stackId="input" fill={theme.C.rsiLine} radius={[3, 3, 0, 0]} />
            <Bar dataKey="output" name={LEGEND_OUTPUT} fill={theme.C.signalLine} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

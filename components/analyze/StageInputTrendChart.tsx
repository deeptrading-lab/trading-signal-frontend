/**
 * 단계별 입력 토큰 추세 — ★최적화 핵심 뷰.
 * AGENT_ORDER 순서로 신규 입력(과금)과 캐시 입력(재사용)을 분리해 이어 그린다.
 * 봉우리는 뒤 단계 누적이 아니라 웹검색 분석가(뉴스·기본·SNS)의 tool-loop 에서
 * fetch 한 웹 컨텍스트가 캐시로 재사용된 것 — 신규(과금) 입력은 작고 평탄하다.
 */

"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useChartTheme } from "@/hooks/utils/useChartTheme";
import type { AgentUsageRow } from "@/lib/types/stock/agentUsage";
import { agentLabel, fmtTokens } from "./format";
import {
  CHART_TREND_HINT,
  CHART_TREND_TITLE,
  LEGEND_CACHE_READ,
  LEGEND_FRESH_INPUT,
} from "@/lib/copy/analyze/labels";

export function StageInputTrendChart({ rows }: { rows: AgentUsageRow[] }) {
  const theme = useChartTheme();

  // 신규 입력(과금)과 캐시 입력(재사용)을 분리 — 봉우리의 정체(캐시)를 그림으로 드러낸다.
  const data = rows.map((r) => ({
    name: agentLabel(r.agentKey),
    fresh: r.avgInputTokens ?? 0,
    cache: r.avgCacheReadTokens ?? 0,
  }));

  return (
    <section className="card">
      <header className="mb-md">
        <h2 className="text-h3 text-text-strong">{CHART_TREND_TITLE}</h2>
        <p className="text-caption text-text-muted mt-xs">{CHART_TREND_HINT}</p>
      </header>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 48 }}>
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
            <Line
              type="monotone"
              dataKey="cache"
              name={LEGEND_CACHE_READ}
              stroke={theme.C.rsiLine}
              strokeWidth={2}
              dot={{ r: 3, fill: theme.C.rsiLine }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="fresh"
              name={LEGEND_FRESH_INPUT}
              stroke={theme.C.macdLine}
              strokeWidth={2}
              dot={{ r: 3, fill: theme.C.macdLine }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

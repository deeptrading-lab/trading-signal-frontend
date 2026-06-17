/**
 * 단계별 입력 토큰 추세 — ★최적화 핵심 뷰.
 * AGENT_ORDER 순서로 평균 총 입력(신규+캐시)을 이어 그려, 뒤 단계(트레이더·PM)로 갈수록
 * 앞 리포트가 누적돼 입력이 커지는지 가시화한다. 가장 큰 지점이 1순위 절감 대상.
 */

"use client";

import {
  CartesianGrid,
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
import { CHART_TREND_HINT, CHART_TREND_TITLE } from "@/lib/copy/analyze/labels";

export function StageInputTrendChart({ rows }: { rows: AgentUsageRow[] }) {
  const theme = useChartTheme();

  // 총 입력 = 신규 입력 + 캐시 입력 (모델에 실제로 들어간 컨텍스트 크기).
  const data = rows.map((r) => ({
    name: agentLabel(r.agentKey),
    totalInput: (r.avgInputTokens ?? 0) + (r.avgCacheReadTokens ?? 0),
  }));

  return (
    <section className="card">
      <header className="mb-md">
        <h2 className="text-h3 text-text-strong">{CHART_TREND_TITLE}</h2>
        <p className="text-caption text-text-muted mt-xs">{CHART_TREND_HINT}</p>
      </header>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
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
              formatter={(v) => [fmtTokens(Number(v)), "총 입력"]}
            />
            <Line
              type="monotone"
              dataKey="totalInput"
              stroke={theme.C.stroke}
              strokeWidth={2}
              dot={{ r: 3, fill: theme.C.stroke }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

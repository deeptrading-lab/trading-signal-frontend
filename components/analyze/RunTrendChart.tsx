/**
 * 분석별 추세 + 회귀 감지 — run 시계열을 시간순 선차트로.
 * 평균 한 장면만 보여주는 카드와 달리, 중앙값(점선) 대비 임계(×1.3) 초과 run 을
 * 빨간 점으로 표시해 "프롬프트·모델 변경 후 비용/소요/토큰이 갑자기 늘었나"를 잡는다.
 */

"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils/cn";
import { useChartTheme } from "@/hooks/utils/useChartTheme";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import type { RunSeriesPoint } from "@/lib/types/stock/agentUsage";
import { fmtCostRounded, fmtDuration, fmtTokens } from "./format";
import { analyzeTrend, defaultMetric, type TrendMetric } from "./runTrend";
import {
  TREND_EMPTY,
  TREND_LATEST,
  TREND_MEDIAN,
  TREND_METRIC_NO_DATA,
  TREND_NO_ANOMALY,
  TREND_TITLE,
  TREND_HINT,
  trendAnomalyLabel,
  trendMetricLabel,
} from "@/lib/copy/analyze/labels";

/** 지표별 값 포맷(헤드라인·툴팁). */
function fmtMetric(v: number | null, m: TrendMetric): string {
  if (v == null) return "—";
  if (m === "cost") return fmtCostRounded(v);
  if (m === "duration") return fmtDuration(v);
  return fmtTokens(v);
}

/** Y축 compact 포맷(라벨 폭 절약). */
function fmtAxis(v: number, m: TrendMetric): string {
  if (m === "cost") return `$${v.toFixed(1)}`;
  if (m === "duration") return `${Math.round(v / 60000)}분`;
  return `${Math.round(v / 1000)}k`;
}

export function RunTrendChart({ series }: { series: RunSeriesPoint[] }) {
  const theme = useChartTheme();
  const [metric, setMetric] = useState<TrendMetric>(() => defaultMetric(series));

  if (series.length === 0) return null;

  const t = analyzeTrend(series, metric);

  const data = t.points.map((p, i) => ({
    idx: i,
    value: p.value,
    ticker: p.ticker,
    date: new Date(p.endedAt).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }),
    full: new Date(p.endedAt).toLocaleString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
    isAnomaly: p.isAnomaly,
  }));

  const tickInterval = Math.max(0, Math.floor(data.length / 6));
  const deltaPct =
    t.latestDeltaRatio != null ? Math.round(t.latestDeltaRatio * 100) : null;
  const deltaUp = deltaPct != null && deltaPct > 0;

  return (
    <section className="card" aria-label={TREND_TITLE}>
      <header className="mb-md flex flex-wrap items-start justify-between gap-md">
        <div>
          <h2 className="flex items-center gap-xs text-h3 text-text-strong">
            {TREND_TITLE}
            <InfoTooltip label={TREND_HINT} />
          </h2>
          <p className="mt-xs text-caption text-text-muted">
            {t.anomalyCount > 0
              ? trendAnomalyLabel(t.anomalyCount, t.measuredCount)
              : TREND_NO_ANOMALY}
          </p>
        </div>
        {/* 지표 토글 */}
        <div className="flex items-center gap-xs" role="tablist" aria-label="추세 지표">
          {(["cost", "duration", "tokens"] as TrendMetric[]).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={metric === m}
              onClick={() => setMetric(m)}
              className={cn(
                "cursor-pointer rounded-pill border px-md py-xs text-body-sm-strong transition-colors",
                metric === m
                  ? "border-accent-vivid bg-accent-vivid-soft text-accent-vivid"
                  : "border-border-line bg-surface text-text-muted hover:text-text-strong",
              )}
            >
              {trendMetricLabel(m)}
            </button>
          ))}
        </div>
      </header>

      {/* 최신 분석 헤드라인 */}
      <div className="mb-md flex items-baseline gap-sm">
        <span className="text-caption text-text-muted">{TREND_LATEST}</span>
        <strong className="text-h3 text-text-strong tabular-nums">
          {fmtMetric(t.latest, metric)}
        </strong>
        {deltaPct != null ? (
          <span
            className={cn(
              "text-body-sm-strong tabular-nums",
              deltaUp ? "text-critical" : "text-text-muted",
            )}
          >
            {deltaUp ? "+" : ""}
            {deltaPct}% · {TREND_MEDIAN} {fmtMetric(t.median, metric)}
          </span>
        ) : null}
      </div>

      {t.measuredCount < 2 ? (
        <p className="py-xl text-center text-body-sm text-text-muted">
          {t.measuredCount === 0 ? TREND_METRIC_NO_DATA : TREND_EMPTY}
        </p>
      ) : (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.C.grid} vertical={false} />
              <XAxis
                dataKey="idx"
                {...theme.axisProps}
                interval={tickInterval}
                tickFormatter={(v: number) => data[v]?.date ?? ""}
              />
              <YAxis
                {...theme.axisProps}
                width={44}
                tickFormatter={(v: number) => fmtAxis(v, metric)}
              />
              {t.median != null ? (
                <ReferenceLine
                  y={t.median}
                  stroke={theme.C.axisTick}
                  strokeDasharray="4 4"
                  label={{ value: TREND_MEDIAN, position: "right", fontSize: 11, fill: theme.C.axisTick }}
                />
              ) : null}
              <Tooltip
                contentStyle={theme.tooltipStyle}
                labelStyle={theme.labelStyle}
                content={<TrendTooltip metric={metric} />}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={theme.C.macdLine}
                strokeWidth={2}
                connectNulls
                dot={(props) => <AnomalyDot {...props} normal={theme.C.macdLine} alert={theme.C.stroke} />}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

/** 이상치 점은 빨강·크게, 평시는 작게. */
function AnomalyDot(props: {
  cx?: number;
  cy?: number;
  payload?: { isAnomaly?: boolean };
  normal: string;
  alert: string;
}) {
  const { cx, cy, payload, normal, alert } = props;
  if (cx == null || cy == null) return <g />;
  const anomaly = payload?.isAnomaly === true;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={anomaly ? 4 : 2}
      fill={anomaly ? alert : normal}
      stroke={anomaly ? alert : normal}
    />
  );
}

interface TooltipPayloadItem {
  payload: { value: number | null; ticker: string; full: string; isAnomaly: boolean };
}

function TrendTooltip({
  metric,
  active,
  payload,
}: {
  metric: TrendMetric;
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  const theme = useChartTheme();
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={theme.tooltipStyle} className="px-sm py-xs text-body-sm">
      <div className="text-caption text-text-muted">
        {p.full} · {p.ticker}
      </div>
      <div className="tabular-nums text-text-strong">
        {fmtMetric(p.value, metric)}
        {p.isAnomaly ? <span className="ml-xs text-critical">· 기준 초과</span> : null}
      </div>
    </div>
  );
}

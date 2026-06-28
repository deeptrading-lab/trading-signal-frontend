/**
 * run 시계열 추세·회귀 감지 — 순수 파생 로직.
 *
 * 평균 한 장면만 보여주는 카드와 달리, run별 값을 시간순으로 늘어놓고
 * 중앙값(robust baseline) 대비 임계 초과 run 을 이상치로 표시해 "회귀"를 잡는다.
 * 한쪽(증가)만 회귀로 본다 — 비용·소요·토큰은 늘어나는 게 나쁜 방향.
 */

import type { RunSeriesPoint } from "@/lib/types/stock/agentUsage";

export type TrendMetric = "cost" | "duration" | "tokens";

/** 회귀 판정 임계 — 중앙값의 1.3배 초과 = "기준 대비 30%↑". */
export const ANOMALY_THRESHOLD = 1.3;

export const TREND_METRICS: TrendMetric[] = ["cost", "duration", "tokens"];

/** 포인트에서 지표값 추출. 미측정이면 null. */
export function metricValue(p: RunSeriesPoint, m: TrendMetric): number | null {
  if (m === "cost") return p.totalCost;
  if (m === "duration") return p.wallClockMs;
  return p.totalInput + p.totalOutput;
}

export interface TrendPoint {
  runId: string;
  ticker: string;
  endedAt: string;
  value: number | null;
  /** 중앙값×임계 초과 = 회귀 의심 */
  isAnomaly: boolean;
}

export interface TrendAnalysis {
  metric: TrendMetric;
  points: TrendPoint[];
  /** 측정 포인트의 중앙값(robust baseline). 측정 0이면 null */
  median: number | null;
  /** 가장 최신(마지막) 측정 포인트 값 */
  latest: number | null;
  /** 최신/중앙값 - 1 (비율). 중앙값 0/null 이면 null */
  latestDeltaRatio: number | null;
  /** 임계 초과 run 수 */
  anomalyCount: number;
  /** 측정된 포인트 수 */
  measuredCount: number;
  /** 적용 임계(배수) */
  threshold: number;
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** 시계열을 한 지표로 분석 — 중앙값 baseline + 임계 초과 이상치 + 최신 delta. */
export function analyzeTrend(
  series: RunSeriesPoint[],
  metric: TrendMetric,
  threshold = ANOMALY_THRESHOLD,
): TrendAnalysis {
  const values = series.map((p) => metricValue(p, metric));
  const measured = values.filter((n): n is number => n != null);
  const med = median(measured);
  const limit = med != null ? med * threshold : null;

  const points: TrendPoint[] = series.map((p, i) => {
    const v = values[i];
    return {
      runId: p.runId,
      ticker: p.ticker,
      endedAt: p.endedAt,
      value: v,
      isAnomaly: v != null && limit != null && v > limit,
    };
  });

  let latest: number | null = null;
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] != null) {
      latest = values[i];
      break;
    }
  }

  return {
    metric,
    points,
    median: med,
    latest,
    latestDeltaRatio:
      med != null && med > 0 && latest != null ? latest / med - 1 : null,
    anomalyCount: points.filter((p) => p.isAnomaly).length,
    measuredCount: measured.length,
    threshold,
  };
}

/** 데이터가 있는 첫 지표 (codex 는 cost 미측정이라 소요/토큰으로 폴백). */
export function defaultMetric(series: RunSeriesPoint[]): TrendMetric {
  for (const m of TREND_METRICS) {
    if (series.some((p) => metricValue(p, m) != null)) return m;
  }
  return "cost";
}

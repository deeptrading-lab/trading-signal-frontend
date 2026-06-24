/**
 * 시황 레이어 — 시장 국면(regime) 계산 (순수함수).
 *
 * PRD `market-snapshot` §3.1 (5). 지수(ETF 프록시) 일봉 종가로 추세 국면을 판정한다.
 * 종목용 `lib/signal/regime.ts`(120선 기울기 + 가격 위치)의 알고리즘을 **지수 종가 배열용으로**
 * 차용·확장했다(종목용은 입력이 `FactorContext`라 그대로 못 씀). regime 은 추세 *방향* 신호라
 * ETF 추적오차가 무의미하다.
 */

import type { IndexTrend, RegimeBlock, RegimeRiskLevel } from "./types";

/** MA120 기울기 룩백(거래일). */
const SLOPE_LOOKBACK = 20;
/** 기울기 flat 판정 임계(상대%). */
const FLAT_SLOPE_PCT = 0.5;
/** riskLevel high 로 끌어올리는 d20 모멘텀 임계%. */
const RISK_HIGH_D20 = -8;

/**
 * 지수 종가 배열 → 국면 블록.
 *
 * @param closes      오름차순 일봉 종가(최신이 마지막). 130봉 이상 권장(부족 시 일부 null degrade).
 * @param opts.breadthPct 당일 시장 폭%(있으면 riskLevel 보정).
 */
export function computeIndexRegime(
  closes: number[],
  opts?: { breadthPct?: number },
): RegimeBlock {
  const n = closes.length;
  const last = n > 0 ? closes[n - 1] : null;

  const ma20 = sma(closes, 20);
  const ma60 = sma(closes, 60);
  const ma120 = sma(closes, 120);

  const aboveMA = {
    ma20: last != null && ma20 != null ? last > ma20 : null,
    ma60: last != null && ma60 != null ? last > ma60 : null,
    ma120: last != null && ma120 != null ? last > ma120 : null,
  };

  const maSlope120 = computeSlope120(closes);
  const momentum = {
    d5: pctChange(closes, 5),
    d20: pctChange(closes, 20),
  };

  const trend = classifyTrend(last, ma20, ma60, ma120, maSlope120);
  const riskLevel = classifyRisk(trend, momentum.d20, opts?.breadthPct);
  const rationale = buildRationale(trend, riskLevel, maSlope120, momentum.d20, opts?.breadthPct);

  return { trend, aboveMA, maSlope120, momentum, riskLevel, rationale, bars: n };
}

/** 마지막 시점 단순이동평균(period 봉 미확보 시 null). */
function sma(closes: number[], period: number): number | null {
  const n = closes.length;
  if (n < period) return null;
  let sum = 0;
  for (let i = n - period; i < n; i++) sum += closes[i];
  return sum / period;
}

/** d일 전 대비 등락률%(미확보 시 null). */
function pctChange(closes: number[], d: number): number | null {
  const n = closes.length;
  if (n <= d) return null;
  const base = closes[n - 1 - d];
  if (!Number.isFinite(base) || base === 0) return null;
  return round2(((closes[n - 1] - base) / base) * 100);
}

/** MA120 기울기 — 현재 SMA120 vs SLOPE_LOOKBACK 봉 전 SMA120. */
function computeSlope120(closes: number[]): "up" | "down" | "flat" | null {
  const n = closes.length;
  if (n < 120 + SLOPE_LOOKBACK) return null;
  const cur = sma(closes, 120);
  const prev = sma(closes.slice(0, n - SLOPE_LOOKBACK), 120);
  if (cur == null || prev == null || prev === 0) return null;
  const slopePct = ((cur - prev) / prev) * 100;
  if (Math.abs(slopePct) < FLAT_SLOPE_PCT) return "flat";
  return slopePct > 0 ? "up" : "down";
}

function classifyTrend(
  last: number | null,
  ma20: number | null,
  ma60: number | null,
  ma120: number | null,
  slope120: "up" | "down" | "flat" | null,
): IndexTrend {
  if (last == null || ma60 == null) return "neutral";

  const longUp = slope120 === "up" || (ma120 != null && last > ma120 && slope120 !== "down");
  const longDown = slope120 === "down" || (ma120 != null && last < ma120 && slope120 !== "up");
  const shortUp = ma20 != null && last > ma20;
  const shortDown = ma20 != null && last < ma20;

  if (longUp && shortUp && last > ma60) return "uptrend";
  if (longUp && shortDown) return "pullback"; // 장기 상승 + 단기 조정.
  if (longDown && (shortDown || last < ma60)) return "downtrend";
  return "neutral";
}

function classifyRisk(
  trend: IndexTrend,
  d20: number | null,
  breadthPct?: number,
): RegimeRiskLevel {
  let level: RegimeRiskLevel =
    trend === "downtrend" ? "high" : trend === "uptrend" ? "low" : "elevated";

  if (d20 != null && d20 <= RISK_HIGH_D20) level = "high";
  if (level === "low" && breadthPct != null && breadthPct < 40) level = "elevated";

  return level;
}

function buildRationale(
  trend: IndexTrend,
  risk: RegimeRiskLevel,
  slope120: "up" | "down" | "flat" | null,
  d20: number | null,
  breadthPct?: number,
): string {
  const trendKo: Record<IndexTrend, string> = {
    uptrend: "상승추세",
    pullback: "상승추세 내 조정",
    downtrend: "하락추세",
    neutral: "방향성 불명확",
  };
  const slopeKo =
    slope120 === "up" ? "120선 우상향" : slope120 === "down" ? "120선 우하향" : slope120 === "flat" ? "120선 횡보" : "장기추세 미확보";
  const mom = d20 != null ? `20일 ${d20 >= 0 ? "+" : ""}${d20}%` : "모멘텀 미확보";
  const bd = breadthPct != null ? `, 시장폭 ${Math.round(breadthPct)}%` : "";
  return `${trendKo[trend]}(${slopeKo}, ${mom}${bd}) · 리스크 ${risk}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

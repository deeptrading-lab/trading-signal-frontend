/**
 * 스윙 판정 피처 — 일봉·수급·공시 → 규칙서가 읽는 수치. 순수 함수(IO·시계·난수 없음).
 *
 * 입력 규약(PRD `swing-judgment` §3-1)
 * - `bars` 오름차순, 마지막 봉 = 판정 기준일 t. 정확히 마지막 `windowBars` 개만 읽는다.
 * - `flow` 는 t 까지의 수급(원본 단위 그대로: 순매수 백만원, 거래대금 원).
 * - `events` 는 DART 주요사항보고(접수일·보고서명). 미래 공시는 호출부가 넣지 않는다.
 */

import type { StockDailyCandle } from "@/lib/api/kis/types";
import type { InvestorTradeDay } from "@/lib/api/kis/investor-flow";
import { atrAt } from "@/lib/signal/levels/atr";
import {
  calcMACD,
  calcRSI,
  calcSMA,
  calcVWAP,
  crossover,
} from "@/lib/utils/technicalIndicators";
import type { Rulebook, SwingMarket } from "./rulebook";

export type SwingEvent = { date: string; reportName: string };

export type SwingInput = {
  ticker: string;
  name: string;
  market: SwingMarket;
  bars: StockDailyCandle[];
  flow: InvestorTradeDay[];
  events: SwingEvent[];
};

/** 국면 — 앞에서부터 먼저 걸리는 것. */
export type SwingStage =
  | "overheated"
  | "bottoming"
  | "downtrend"
  | "uptrend"
  | "range"
  | "mixed";

/** 수급 강도 S_g(N) — N일 순매수 합(원) ÷ 20일 평균 거래대금. */
export type FlowStrength = {
  person: number;
  foreign: number;
  institution: number;
  pension: number;
  privateEquity: number;
};

export type SwingFeatures = {
  asOf: string;
  close: number;
  /** 창 안 봉 수(최대 windowBars). */
  barCount: number;
  /** 1차 거르기용 종가×거래량 20일 평균(원). */
  closeVolAdv20: number | null;
  /** 확정 유동성 — 수급 거래대금 20일 평균(원). 수급 결측이면 null. */
  adv20: number | null;
  /** 최근 flowWindowDays 봉 모두 수급이 있나. */
  flowComplete: boolean;
  flow: FlowStrength | null;
  atr: number | null;
  atrPct: number | null;
  r20Pct: number | null;
  rsi: number | null;
  sma5: number | null;
  sma20: number | null;
  sma60: number | null;
  sma250: number | null;
  dev250Pct: number | null;
  slope250Pct: number | null;
  /** 1년(250봉) 거래량가중 평균가 = 매물 평균 단가 근사. 표시용. */
  vwap250: number | null;
  devVwap250Pct: number | null;
  box60Pct: number | null;
  barsSinceLow60: number | null;
  /** MACD 골든크로스가 몇 봉 전(0 = t)인지 — 최근 crossLookbackBars 안에 없으면 null. */
  macdCrossAgo: number | null;
  /** SMA5×SMA20 골든크로스가 몇 봉 전인지 — 없으면 null. */
  maCrossAgo: number | null;
  halted: boolean;
  /** 제외 대상 공시 보고서명(창 안, 정정 제외). */
  dartReports: string[];
  stage: SwingStage | null;
  /** MACD 라인 — 쌍바닥 다이버전스 판정이 재사용(창 기준 인덱스). */
  macdLine: (number | null)[];
};

const pct = (a: number, b: number) => (a / b - 1) * 100;

/**
 * KIS 일봉 정규화 — 거래정지일은 시·고·저가가 0 으로 올 수 있어 종가로 채운다(가격 이동 없음).
 * 오프라인 수집기(`scripts/swing/collect.mts`)와 같은 처리 — 라이브도 이 함수로 맞춘다.
 * 종가가 0 이하인 봉은 버린다(null).
 */
export function normalizeDailyBar(c: StockDailyCandle): StockDailyCandle | null {
  if (!(c.close > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(c.date)) return null;
  return {
    date: c.date,
    open: c.open > 0 ? c.open : c.close,
    high: c.high > 0 ? c.high : c.close,
    low: c.low > 0 ? c.low : c.close,
    close: c.close,
    volume: c.volume >= 0 ? c.volume : 0,
  };
}

/** 창 — 오름차순 보장 후 마지막 n 봉. 정렬돼 있으면 복사 없이 slice. */
export function windowOf(bars: StockDailyCandle[], n: number): StockDailyCandle[] {
  let sorted = true;
  for (let i = 1; i < bars.length; i++) {
    if (bars[i - 1].date >= bars[i].date) {
      sorted = false;
      break;
    }
  }
  const src = sorted ? bars : [...bars].sort((a, b) => a.date.localeCompare(b.date));
  return src.slice(-n);
}

/** 최근 lookback 봉 안의 마지막 상향 교차가 몇 봉 전인지. */
function crossAgo(
  a: (number | null)[],
  b: (number | null)[],
  t: number,
  lookback: number,
): number | null {
  for (let k = 0; k < lookback; k++) {
    if (crossover(a, b, t - k)) return k;
  }
  return null;
}

export function computeFeatures(input: SwingInput, rb: Rulebook): SwingFeatures {
  const w = windowOf(input.bars, rb.windowBars);
  if (w.length === 0) throw new Error(`일봉이 없어 판정할 수 없어요(${input.ticker}).`);
  const t = w.length - 1;
  const closes = w.map((c) => c.close);
  const close = closes[t];
  const at = (xs: (number | null)[], i: number) => (i >= 0 ? xs[i] : null);

  // ── 유동성 ──
  let closeVolAdv20: number | null = null;
  if (w.length >= rb.flowWindowDays) {
    let s = 0;
    for (let i = t - rb.flowWindowDays + 1; i <= t; i++) s += w[i].close * w[i].volume;
    closeVolAdv20 = s / rb.flowWindowDays;
  }

  // ── 수급 ── 최근 flowWindowDays 봉 날짜에 모두 수급이 있어야 한다.
  const flowByDate = new Map(input.flow.map((f) => [f.date, f]));
  const recentDates = w.slice(-rb.flowWindowDays).map((c) => c.date);
  const flowRows = recentDates.map((d) => flowByDate.get(d));
  const flowComplete =
    recentDates.length === rb.flowWindowDays && flowRows.every((r) => r !== undefined);
  let adv20: number | null = null;
  let flow: FlowStrength | null = null;
  if (flowComplete) {
    const rows = flowRows as InvestorTradeDay[];
    adv20 = rows.reduce((s, r) => s + r.tradingValue, 0) / rows.length;
    if (adv20 > 0) {
      const lastN = rows.slice(-rb.flow.days);
      const sum = (pick: (r: InvestorTradeDay) => number) =>
        (lastN.reduce((s, r) => s + pick(r), 0) * 1e6) / adv20!;
      flow = {
        person: sum((r) => r.person),
        foreign: sum((r) => r.foreign),
        institution: sum((r) => r.institution),
        pension: sum((r) => r.pension),
        privateEquity: sum((r) => r.privateEquity),
      };
    }
  }

  // ── 지표 ──
  const atr = atrAt(w, t, rb.atrPeriod);
  const rsiSeries = calcRSI(closes, 14);
  const rsi = rsiSeries[t];
  const sma5s = calcSMA(closes, 5);
  const sma20s = calcSMA(closes, 20);
  const sma60s = calcSMA(closes, 60);
  const sma250s = calcSMA(closes, 250);
  const sma250 = sma250s[t];
  const sma250Prev = at(sma250s, t - rb.stage.slopeBars);
  const macd = calcMACD(closes);
  const macdLine = macd.map((p) => p.macd);
  const signalLine = macd.map((p) => p.signal);

  const vwapWindow = w.slice(-250);
  const vwap250 = w.length >= 250 ? calcVWAP(vwapWindow).at(-1) ?? null : null;

  let box60Pct: number | null = null;
  let barsSinceLow60: number | null = null;
  if (w.length >= rb.stage.boxBars) {
    let lo = Infinity;
    let hi = -Infinity;
    let loIdx = -1;
    for (let i = t - rb.stage.boxBars + 1; i <= t; i++) {
      if (w[i].low <= lo) {
        lo = w[i].low;
        loIdx = i; // 같은 최저가면 가장 최근 봉
      }
      if (w[i].high > hi) hi = w[i].high;
    }
    box60Pct = lo > 0 ? pct(hi, lo) : null;
    barsSinceLow60 = t - loIdx;
  }

  const r20Pct = t >= 20 ? pct(close, closes[t - 20]) : null;
  const dev250Pct = sma250 !== null ? pct(close, sma250) : null;
  const slope250Pct =
    sma250 !== null && sma250Prev !== null ? pct(sma250, sma250Prev) : null;

  // ── 거래정지 ──
  let halted = false;
  for (let i = Math.max(0, t - rb.haltLookbackBars + 1); i <= t; i++) {
    if (w[i].volume === 0) halted = true;
  }

  // ── 공시 ── (D[t−lookback], D[t]] 안의 접수, 정정(`[`) 제외.
  const fromDate = w[Math.max(0, t - rb.dart.lookbackBars)].date;
  const pattern = new RegExp(rb.dart.reportPattern);
  const dartReports = input.events
    .filter((e) => e.date > fromDate && e.date <= w[t].date)
    .map((e) => e.reportName.replace(/\s/g, ""))
    .filter((n) => !n.startsWith("[") && pattern.test(n))
    .sort();

  const features: SwingFeatures = {
    asOf: w[t].date,
    close,
    barCount: w.length,
    closeVolAdv20,
    adv20,
    flowComplete,
    flow,
    atr,
    atrPct: atr !== null ? (atr / close) * 100 : null,
    r20Pct,
    rsi,
    sma5: sma5s[t],
    sma20: sma20s[t],
    sma60: sma60s[t],
    sma250,
    dev250Pct,
    slope250Pct,
    vwap250,
    devVwap250Pct: vwap250 ? pct(close, vwap250) : null,
    box60Pct,
    barsSinceLow60,
    macdCrossAgo: crossAgo(macdLine, signalLine, t, rb.momentum.crossLookbackBars),
    maCrossAgo: crossAgo(sma5s, sma20s, t, rb.momentum.crossLookbackBars),
    halted,
    dartReports,
    stage: null,
    macdLine,
  };
  features.stage = stageOf(features, rb);
  return features;
}

/** 국면 판정 — 앞에서부터 먼저 걸리는 것. 필요한 값이 없으면 null. */
export function stageOf(f: SwingFeatures, rb: Rulebook): SwingStage | null {
  if (
    (f.r20Pct !== null && f.r20Pct >= rb.overheat.r20Pct) ||
    (f.rsi !== null && f.rsi >= rb.overheat.rsi)
  ) {
    return "overheated";
  }
  if (
    f.dev250Pct === null ||
    f.slope250Pct === null ||
    f.sma20 === null ||
    f.sma60 === null ||
    f.sma250 === null ||
    f.barsSinceLow60 === null ||
    f.box60Pct === null
  ) {
    return null;
  }
  if (
    f.dev250Pct <= rb.stage.bottomDev250Pct &&
    f.barsSinceLow60 >= rb.stage.bottomMinBarsSinceLow &&
    f.close >= f.sma20
  ) {
    return "bottoming";
  }
  if (f.close < f.sma250 && f.slope250Pct < 0 && f.close < f.sma60) return "downtrend";
  if (f.close > f.sma250 && f.slope250Pct > 0 && f.close > f.sma60) return "uptrend";
  if (f.box60Pct <= rb.stage.boxMaxPct) return "range";
  return "mixed";
}

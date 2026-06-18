/**
 * 종목 스냅샷 조립 — KIS read 호출 결과를 `StockSnapshot` 으로 합성하는 순수/조립 로직.
 *
 * PRD `value-picks-validated` §3-A. route handler(`app/api/stock/snapshot/route.ts`)는 이 모듈의
 * `assembleSnapshot` 을 호출하고 헤더/HTTP 만 책임진다. 지표 계산 순수 함수(`computeTechnical`·
 * `computeValuation52w`·`aggregateInvestorTrend`)는 단위 테스트(AC-1/AC-2) 대상으로 분리한다.
 *
 * ## 단위·null 규약 (PRD §3-A-2)
 * - 금액은 원(KRW). KIS 수급 순매수는 백만원 → ×1,000,000 환산.
 * - 산출 불가 필드는 `null`(생략 아님). 부분 실패는 route 가 group 별로 처리.
 */

import type { StockDailyCandle, StockPrice } from "@/lib/api/kis/types";
import type { StockInvestorTrend } from "@/lib/types/stock/investors";
import type {
  SnapshotInvestorTrend,
  SnapshotMarket,
  SnapshotTechnical,
  SnapshotTrendRegime,
  SnapshotValuation52w,
  StockSnapshot,
} from "@/lib/types/stock/snapshot";
import { calcSMA, calcRSI, calcADX, crossunder } from "@/lib/utils/technicalIndicators";
import { buildContext } from "@/lib/signal/context";
import { computeRegime } from "@/lib/signal/regime";

/** SMA 기간(이평선) — 시그널 엔진(`MA_PERIODS`)과 정합. */
const SMA_SHORT = 5;
const SMA_MID = 20;
const SMA_LONG = 60;
/** RSI/ADX 표준 기간. */
const RSI_PERIOD = 14;
const ADX_PERIOD = 14;
/** 모멘텀 룩백(영업일) — PRD 기본값. */
export const MOMENTUM_LOOKBACK = 20;
/** 52주 ≒ 영업일 환산(주 5일 × 52주). */
const TRADING_DAYS_52W = 260;
/** 수급 집계 기간(영업일) — PRD 기본값. */
export const INVESTOR_LOOKBACK_DAYS = 5;
/** KIS 수급 순매수 단위(백만원) → 원 환산 계수. */
const MILLION = 1_000_000;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** SMA 시리즈 마지막 유효값 — 룩백 미확보 시 null. */
function lastSma(closes: number[], period: number): number | null {
  const series = calcSMA(closes, period);
  return series.length ? series[series.length - 1] : null;
}

/**
 * 52주 고저·위치 산출. 오름차순 캔들에서 최근 ~260영업봉 윈도우의 고가/저가를 본다.
 * 봉이 전혀 없으면 전 필드 null.
 */
export function computeValuation52w(
  candles: StockDailyCandle[],
  current: number,
): SnapshotValuation52w {
  if (candles.length === 0) {
    return { high: null, low: null, positionPct: null };
  }
  const window = candles.slice(-TRADING_DAYS_52W);
  let high = -Infinity;
  let low = Infinity;
  for (const c of window) {
    if (c.high > high) high = c.high;
    if (c.low < low) low = c.low;
  }
  if (!Number.isFinite(high) || !Number.isFinite(low)) {
    return { high: null, low: null, positionPct: null };
  }
  const span = high - low;
  const positionPct = span > 0 ? round2(((current - low) / span) * 100) : null;
  return { high, low, positionPct };
}

/** computeRegime 결과(1/0/-1) → 문자열. */
function regimeToString(value: number): SnapshotTrendRegime {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "side";
}

/**
 * 기술적 지표 산출(오름차순 캔들 + 현재가).
 *
 * - SMA(5/20/60)·RSI(14)·ADX(14) 는 `technicalIndicators` 순수 함수 재사용.
 * - momentumPct = (close[last]/close[last-N]-1)×100, N=MOMENTUM_LOOKBACK.
 * - deadCross = 마지막 봉에서 SMA5 가 SMA20 을 하향 돌파(`crossunder`).
 * - trendRegime = `lib/signal/regime.ts` computeRegime(SMA120 기울기+위치).
 * - 캔들이 비면 전 필드 null(봇이 판정 보류).
 */
export function computeTechnical(
  candles: StockDailyCandle[],
  current: number,
): SnapshotTechnical {
  if (candles.length === 0) {
    return {
      sma5: null,
      sma20: null,
      sma60: null,
      rsi14: null,
      adx14: null,
      momentumPct: null,
      aboveSma20: null,
      aboveSma60: null,
      deadCross: null,
      trendRegime: null,
    };
  }

  const closes = candles.map((c) => c.close);
  const n = closes.length;

  const sma5 = lastSma(closes, SMA_SHORT);
  const sma20 = lastSma(closes, SMA_MID);
  const sma60 = lastSma(closes, SMA_LONG);

  const rsiSeries = calcRSI(closes, RSI_PERIOD);
  const rsi14 = rsiSeries[n - 1];

  const adxSeries = calcADX(candles, ADX_PERIOD);
  const adx14 = adxSeries[n - 1]?.adx ?? null;

  let momentumPct: number | null = null;
  const fromIdx = n - 1 - MOMENTUM_LOOKBACK;
  if (fromIdx >= 0 && closes[fromIdx] > 0) {
    momentumPct = round2((closes[n - 1] / closes[fromIdx] - 1) * 100);
  }

  // deadCross — 마지막 봉에서 SMA5 가 SMA20 을 하향 돌파.
  const sma5Series = calcSMA(closes, SMA_SHORT);
  const sma20Series = calcSMA(closes, SMA_MID);
  const deadCross =
    sma5Series[n - 1] !== null && sma20Series[n - 1] !== null
      ? crossunder(sma5Series, sma20Series, n - 1)
      : null;

  // trendRegime — SMA120 기울기+위치. 룩백 미확보면 computeRegime 가 0(side)로 안전 폴백.
  const ctx = buildContext(candles);
  const trendRegime: SnapshotTrendRegime =
    ctx.sma.base[ctx.i] !== null ? regimeToString(computeRegime(ctx)) : null;

  return {
    sma5: sma5 !== null ? round2(sma5) : null,
    sma20: sma20 !== null ? round2(sma20) : null,
    sma60: sma60 !== null ? round2(sma60) : null,
    rsi14: rsi14 !== null && rsi14 !== undefined ? round2(rsi14) : null,
    adx14: adx14 !== null ? round2(adx14) : null,
    momentumPct,
    aboveSma20: sma20 !== null ? current >= sma20 : null,
    aboveSma60: sma60 !== null ? current >= sma60 : null,
    deadCross,
    trendRegime,
  };
}

/**
 * 수급 N일 집계 — 기관·외국인 합산 순매수(원)와 연속 순매도 일수.
 *
 * KIS 응답은 최신이 [0]. lookbackDays 만큼 앞에서 slice. 순매수 금액은 백만원 → ×1,000,000.
 * 연속 순매도 일수는 최신([0])부터 음수(순매도)가 끊기지 않고 이어진 일수.
 * days 가 비면 합산·연속일 모두 null.
 */
export function aggregateInvestorTrend(
  trend: StockInvestorTrend,
  lookbackDays = INVESTOR_LOOKBACK_DAYS,
): SnapshotInvestorTrend {
  const days = trend.days.slice(0, lookbackDays);
  if (days.length === 0) {
    return {
      lookbackDays,
      orgNetBuyAmountKRW: null,
      foreignNetBuyAmountKRW: null,
      orgConsecutiveSellDays: null,
      foreignConsecutiveSellDays: null,
    };
  }

  const orgSumMillion = days.reduce((s, d) => s + d.orgNetBuyAmount, 0);
  const foreignSumMillion = days.reduce((s, d) => s + d.foreignNetBuyAmount, 0);

  // 연속 순매도 — 최신([0])부터 순매도(음수)가 끊기지 않는 일수. 전체 응답(slice 전) 기준으로
  // 세면 lookback 밖까지 이어진 연속도 잡히지만, PRD 의도는 "최근 기준 연속" → 전체 days 로 카운트.
  const orgConsecutiveSellDays = countConsecutiveSell(
    trend.days.map((d) => d.orgNetBuyAmount),
  );
  const foreignConsecutiveSellDays = countConsecutiveSell(
    trend.days.map((d) => d.foreignNetBuyAmount),
  );

  return {
    lookbackDays,
    orgNetBuyAmountKRW: Math.round(orgSumMillion * MILLION),
    foreignNetBuyAmountKRW: Math.round(foreignSumMillion * MILLION),
    orgConsecutiveSellDays,
    foreignConsecutiveSellDays,
  };
}

/** 최신([0])부터 음수(순매도)가 끊기지 않은 일수. 첫 값이 0/양수면 0. */
function countConsecutiveSell(amounts: number[]): number {
  let count = 0;
  for (const amt of amounts) {
    if (amt < 0) count += 1;
    else break;
  }
  return count;
}

/** 외국인 지분율(%) — StockPrice.foreignRatio 계승(없으면 null). */
function foreignRatioPct(price: StockPrice | null): number | null {
  if (!price || price.foreignRatio === undefined) return null;
  return price.foreignRatio;
}

/** KST(+09:00) ISO8601 문자열. */
export function nowKstIso(now = new Date()): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = kst.getUTCFullYear();
  const mm = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(kst.getUTCDate()).padStart(2, "0");
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  const mi = String(kst.getUTCMinutes()).padStart(2, "0");
  const ss = String(kst.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}+09:00`;
}

/** assembleSnapshot 입력 — group 별 read 결과(부분 실패 시 null). */
export type SnapshotInputs = {
  ticker: string;
  /** inquire-price 결과(현재가·외국인지분). 실패 시 null. */
  price: StockPrice | null;
  /** 상장주수(시총용). 실패/미제공 시 null. */
  listedShares: number | null;
  /** 일봉(오름차순). 실패 시 null. */
  candles: StockDailyCandle[] | null;
  /** 종목별 수급 추이. 실패 시 null. */
  investors: StockInvestorTrend | null;
  /** 시장 구분(search-stock-info, prod 한정). 미해석 시 null. */
  market: SnapshotMarket;
  /** 표시용 종목명 폴백(시드/ticker). price.name 우선. */
  fallbackName?: string;
  /** asOf 기준 시각(테스트 주입용). */
  now?: Date;
};

/**
 * group 별 read 결과를 `StockSnapshot` 으로 합성한다.
 *
 * price 그룹이 null 이면 현재가가 없어 price 블록을 0/파생 불가 → 호출부(route)가 "전부 실패"로
 * 판단해 에러를 던질 책임. 본 함수는 price 가 있다고 가정하고 산출 가능 필드를 채운다(나머지 null).
 */
export function assembleSnapshot(inputs: SnapshotInputs): StockSnapshot {
  const { ticker, price, listedShares, candles, investors, market } = inputs;

  const current = price?.price ?? 0;
  const volume = price?.volume ?? 0;
  const name = price?.name || inputs.fallbackName || ticker;

  const candleList = candles ?? [];
  const valuation52w = computeValuation52w(candleList, current);
  const technical = computeTechnical(candleList, current);

  const investorTrend = investors
    ? aggregateInvestorTrend(investors)
    : {
        lookbackDays: INVESTOR_LOOKBACK_DAYS,
        orgNetBuyAmountKRW: null,
        foreignNetBuyAmountKRW: null,
        orgConsecutiveSellDays: null,
        foreignConsecutiveSellDays: null,
      };

  const marketCapKRW =
    listedShares !== null && current > 0
      ? Math.round(current * listedShares)
      : null;

  return {
    ticker,
    name,
    market,
    asOf: nowKstIso(inputs.now),
    price: {
      current,
      changePercent: price?.changePercent ?? 0,
      volume,
      tradeAmountKRW: Math.round(current * volume),
    },
    valuation52w,
    marketCapKRW,
    foreignRatioPct: foreignRatioPct(price),
    technical,
    investorTrend,
  };
}

/**
 * 기술적 보조지표 계산 유틸리티.
 *
 * 모두 순수 함수 — 외부 의존 없음. 입력 배열은 오름차순(오래된 날 먼저) 가정.
 *
 * ## 함수 목록
 * - `calcSMA(prices, period)` — 단순이동평균
 * - `calcEMA(prices, period)` — 지수이동평균 (SMA 시드)
 * - `calcMACD(prices, fast?, slow?, signal?)` — MACD 라인·시그널·히스토그램
 * - `calcRSI(prices, period?)` — RSI (Wilder's 평활화)
 * - `calcBollinger(prices, period?, mult?)` — 볼린저 밴드(상/중/하·밴드폭·%B)
 * - `calcVolumeMA(volumes, period?)` — 거래량 이동평균
 * - `calcADX(bars, period?)` — ADX 추세강도 + ±DI (Wilder's)
 * - `crossover(a, b, i)` / `crossunder(a, b, i)` — 시리즈 상향/하향 교차 판정
 */

/** SMA 계산 결과 — 룩백 전 구간은 null. */
export function calcSMA(
  prices: number[],
  period: number,
): (number | null)[] {
  const result: (number | null)[] = new Array(prices.length).fill(null);
  if (period <= 0 || prices.length < period) return result;

  let sum = 0;
  for (let i = 0; i < prices.length; i++) {
    sum += prices[i];
    if (i >= period) sum -= prices[i - period];
    if (i >= period - 1) result[i] = sum / period;
  }
  return result;
}

/** EMA 계산 결과 — 룩백 전 구간은 null. */
export function calcEMA(
  prices: number[],
  period: number,
): (number | null)[] {
  const result: (number | null)[] = new Array(prices.length).fill(null);
  if (prices.length < period) return result;

  // SMA 시드
  let ema =
    prices.slice(0, period).reduce((s, v) => s + v, 0) / period;
  result[period - 1] = ema;

  const k = 2 / (period + 1);
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
    result[i] = ema;
  }
  return result;
}

export type MACDPoint = {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
};

/**
 * MACD 계산.
 * @param fast  단기 EMA 기간 (기본 12)
 * @param slow  장기 EMA 기간 (기본 26)
 * @param sig   시그널 EMA 기간 (기본 9)
 */
export function calcMACD(
  prices: number[],
  fast = 12,
  slow = 26,
  sig = 9,
): MACDPoint[] {
  const ema12 = calcEMA(prices, fast);
  const ema26 = calcEMA(prices, slow);

  const macdLine: (number | null)[] = prices.map((_, i) => {
    const e12 = ema12[i];
    const e26 = ema26[i];
    return e12 !== null && e26 !== null ? e12 - e26 : null;
  });

  // 시그널 = MACD 라인의 EMA(sig) — null 구간 무시하고 유효값만 추출 후 재부착
  const validStart = macdLine.findIndex((v) => v !== null);
  const signalLine: (number | null)[] = new Array(prices.length).fill(null);

  if (validStart !== -1) {
    const macdValues = macdLine.slice(validStart) as (number | null)[];
    const macdNonNull = macdValues.map((v) => v ?? 0); // EMA 입력은 숫자만
    const sigEma = calcEMA(macdNonNull, sig);
    for (let i = 0; i < sigEma.length; i++) {
      if (sigEma[i] !== null && macdValues[i] !== null) {
        signalLine[validStart + i] = sigEma[i];
      }
    }
  }

  return prices.map((_, i) => {
    const macd = macdLine[i];
    const signal = signalLine[i];
    const histogram =
      macd !== null && signal !== null ? macd - signal : null;
    return { macd, signal, histogram };
  });
}

/**
 * RSI 계산 (Wilder's 평활화, 기본 14기간).
 * 입력 배열이 period+1 미만이면 전부 null 반환.
 */
export function calcRSI(
  prices: number[],
  period = 14,
): (number | null)[] {
  const result: (number | null)[] = new Array(prices.length).fill(null);
  if (prices.length <= period) return result;

  // 초기 평균 gain/loss (SMA 시드)
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss += -diff;
  }
  avgGain /= period;
  avgLoss /= period;

  const rsi = (ag: number, al: number) =>
    al === 0 ? 100 : 100 - 100 / (1 + ag / al);

  result[period] = rsi(avgGain, avgLoss);

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = rsi(avgGain, avgLoss);
  }
  return result;
}

export type BollingerPoint = {
  /** 상단 밴드 (mid + mult·σ). */
  upper: number | null;
  /** 중간선 (SMA). */
  mid: number | null;
  /** 하단 밴드 (mid - mult·σ). */
  lower: number | null;
  /** 밴드폭 (upper-lower)/mid — 스퀴즈 판정용 (작을수록 변동성 수축). */
  bandwidth: number | null;
  /** 밴드 내 위치 %B = (price-lower)/(upper-lower). 0=하단, 1=상단, >1 상단 돌파. */
  pctB: number | null;
};

/**
 * 볼린저 밴드 계산 (기본 20기간·2σ).
 * 표준편차는 모집단(population) 기준 — TradingView·대부분 차트 관례와 정합.
 */
export function calcBollinger(
  prices: number[],
  period = 20,
  mult = 2,
): BollingerPoint[] {
  const sma = calcSMA(prices, period);
  return prices.map((_, i) => {
    const mid = sma[i];
    if (mid === null) {
      return { upper: null, mid: null, lower: null, bandwidth: null, pctB: null };
    }
    // 직전 period 구간의 모집단 표준편차.
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const d = prices[j] - mid;
      variance += d * d;
    }
    const sd = Math.sqrt(variance / period);
    const upper = mid + mult * sd;
    const lower = mid - mult * sd;
    const span = upper - lower;
    return {
      upper,
      mid,
      lower,
      bandwidth: mid !== 0 ? span / mid : null,
      pctB: span !== 0 ? (prices[i] - lower) / span : null,
    };
  });
}

/** 거래량 이동평균 (기본 20기간). `calcSMA` 위임 — 거래량 급증 배수 판정 분모. */
export function calcVolumeMA(volumes: number[], period = 20): (number | null)[] {
  return calcSMA(volumes, period);
}

/** VWAP 한 봉 입력 — 대표가(HLC/3) × 거래량 누적. */
export type VwapBar = { high: number; low: number; close: number; volume: number };

/**
 * VWAP(거래량 가중 평균가) — 누적 Σ(대표가×거래량) / 누적 Σ거래량. 대표가 = (고+저+종)/3.
 *
 * 입력 첫 봉부터 누적하므로 **한 세션(예: 당일 분봉)** 을 넘겨주면 세션 기준 VWAP 이 된다.
 * 거래량이 0인 선행 구간은 분모가 0이라 null(미표시). 값 자체가 없을 순 없지만 방어적으로 null 처리.
 */
export function calcVWAP(bars: VwapBar[]): (number | null)[] {
  const out: (number | null)[] = new Array(bars.length).fill(null);
  let cumPV = 0;
  let cumVol = 0;
  for (let i = 0; i < bars.length; i++) {
    const typical = (bars[i].high + bars[i].low + bars[i].close) / 3;
    cumPV += typical * bars[i].volume;
    cumVol += bars[i].volume;
    out[i] = cumVol > 0 ? cumPV / cumVol : null;
  }
  return out;
}

/** OHLC 한 봉 — `calcADX` 입력 최소 형태. */
export type AdxBar = { high: number; low: number; close: number };

export type AdxPoint = {
  /** 추세강도 0~100 (통념: 25↑ 추세, 20↓ 횡보). 워밍업 전 null. */
  adx: number | null;
  /** +DI — 상승 방향 강도. */
  plusDI: number | null;
  /** -DI — 하락 방향 강도. */
  minusDI: number | null;
};

/**
 * ADX(평균방향지수) + ±DI 계산 (Wilder's 평활화, 기본 14기간).
 *
 * 레짐(추세강도) 필터용. ADX 는 방향이 아니라 "추세의 세기"만 — 방향은 +DI/-DI 비교로.
 * 첫 ADX 값은 약 2·period 봉 이후에 나온다(DX 평활화에 추가 period 필요).
 */
export function calcADX(bars: AdxBar[], period = 14): AdxPoint[] {
  const n = bars.length;
  const out: AdxPoint[] = new Array(n)
    .fill(null)
    .map(() => ({ adx: null, plusDI: null, minusDI: null }));
  if (n <= period) return out;

  const tr: number[] = new Array(n).fill(0);
  const plusDM: number[] = new Array(n).fill(0);
  const minusDM: number[] = new Array(n).fill(0);

  for (let i = 1; i < n; i++) {
    const upMove = bars[i].high - bars[i - 1].high;
    const downMove = bars[i - 1].low - bars[i].low;
    plusDM[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDM[i] = downMove > upMove && downMove > 0 ? downMove : 0;
    const hl = bars[i].high - bars[i].low;
    const hc = Math.abs(bars[i].high - bars[i - 1].close);
    const lc = Math.abs(bars[i].low - bars[i - 1].close);
    tr[i] = Math.max(hl, hc, lc);
  }

  // Wilder 평활화 시드 — 1..period 합.
  let smTR = 0;
  let smPlus = 0;
  let smMinus = 0;
  for (let i = 1; i <= period; i++) {
    smTR += tr[i];
    smPlus += plusDM[i];
    smMinus += minusDM[i];
  }

  const dx: (number | null)[] = new Array(n).fill(null);
  const setDIandDX = (i: number) => {
    const plusDI = smTR !== 0 ? (100 * smPlus) / smTR : 0;
    const minusDI = smTR !== 0 ? (100 * smMinus) / smTR : 0;
    out[i].plusDI = plusDI;
    out[i].minusDI = minusDI;
    const diSum = plusDI + minusDI;
    dx[i] = diSum !== 0 ? (100 * Math.abs(plusDI - minusDI)) / diSum : 0;
  };
  setDIandDX(period);

  for (let i = period + 1; i < n; i++) {
    smTR = smTR - smTR / period + tr[i];
    smPlus = smPlus - smPlus / period + plusDM[i];
    smMinus = smMinus - smMinus / period + minusDM[i];
    setDIandDX(i);
  }

  // ADX = DX 의 Wilder 평활화. 첫 값은 DX 가 period 개 모인 2·period 시점.
  const firstAdxIdx = 2 * period;
  if (firstAdxIdx < n) {
    let adxSeed = 0;
    for (let i = period; i < firstAdxIdx; i++) adxSeed += dx[i] ?? 0;
    let adx = adxSeed / period;
    out[firstAdxIdx - 1].adx = adx;
    for (let i = firstAdxIdx; i < n; i++) {
      adx = (adx * (period - 1) + (dx[i] ?? 0)) / period;
      out[i].adx = adx;
    }
  }
  return out;
}

/**
 * i 봉에서 시리즈 a 가 b 를 **상향** 교차했는지 (직전 a≤b → 현재 a>b).
 * null 구간은 교차 아님. 골든크로스·MACD 매수 교차 공용.
 */
export function crossover(
  a: (number | null)[],
  b: (number | null)[],
  i: number,
): boolean {
  if (i <= 0) return false;
  const a0 = a[i - 1];
  const b0 = b[i - 1];
  const a1 = a[i];
  const b1 = b[i];
  if (a0 === null || b0 === null || a1 === null || b1 === null) return false;
  return a0 <= b0 && a1 > b1;
}

/** i 봉에서 시리즈 a 가 b 를 **하향** 교차했는지 (데드크로스·MACD 매도 교차). */
export function crossunder(
  a: (number | null)[],
  b: (number | null)[],
  i: number,
): boolean {
  if (i <= 0) return false;
  const a0 = a[i - 1];
  const b0 = b[i - 1];
  const a1 = a[i];
  const b1 = b[i];
  if (a0 === null || b0 === null || a1 === null || b1 === null) return false;
  return a0 >= b0 && a1 < b1;
}

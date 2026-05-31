/**
 * 기술적 보조지표 계산 유틸리티.
 *
 * 모두 순수 함수 — 외부 의존 없음. 입력 배열은 오름차순(오래된 날 먼저) 가정.
 *
 * ## 함수 목록
 * - `calcEMA(prices, period)` — 지수이동평균 (SMA 시드)
 * - `calcMACD(prices, fast?, slow?, signal?)` — MACD 라인·시그널·히스토그램
 * - `calcRSI(prices, period?)` — RSI (Wilder's 평활화)
 */

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

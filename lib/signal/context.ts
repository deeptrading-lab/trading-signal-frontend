/**
 * FactorContext — 캔들 1회 입력으로 모든 보조지표를 계산해 팩터들이 공유.
 *
 * 엔진은 "주어진 캔들 배열의 **마지막 봉**"에서 신호를 평가한다(`i = n-1`).
 * 백테스트는 과거 시점 i 평가 시 `candles.slice(0, i+1)` 를 넘겨 같은 함수를 재사용 →
 * 미래 누설(look-ahead) 구조적 차단.
 */

import type { StockDailyCandle } from "@/lib/api/kis/types";
import type { IndicatorProfile } from "@/lib/types/signal";
import {
  calcSMA,
  calcMACD,
  calcRSI,
  calcBollinger,
  calcVolumeMA,
  calcADX,
  type MACDPoint,
  type BollingerPoint,
  type AdxPoint,
} from "@/lib/utils/technicalIndicators";
import { MA_PERIODS } from "./weights";

export type FactorContext = {
  /** 평가 기준 인덱스 (마지막 봉). */
  i: number;
  candles: StockDailyCandle[];
  closes: number[];
  volumes: number[];
  sma: {
    short: (number | null)[];
    mid: (number | null)[];
    long: (number | null)[];
    base: (number | null)[];
  };
  macd: MACDPoint[];
  rsi: (number | null)[];
  boll: BollingerPoint[];
  volMA: (number | null)[];
  adx: AdxPoint[];
};

/**
 * 캔들(오름차순) → 지표 일괄 계산.
 *
 * `profile` 미지정 시 일봉 표준 파라미터(MA 5/20/60/120, MACD 12/26/9, RSI 14, BB 20/2,
 * ADX 14, volMA 20) — 기존 동작과 **비트 동일**(무회귀). 분봉은 타임프레임 주기를 주입한다.
 */
export function buildContext(
  candles: StockDailyCandle[],
  profile?: IndicatorProfile,
): FactorContext {
  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);

  const ma = profile?.maPeriods ?? MA_PERIODS;
  const macd = profile?.macd ?? { fast: 12, slow: 26, signal: 9 };
  const rsiPeriod = profile?.rsiPeriod ?? 14;
  const boll = profile?.bollinger ?? { period: 20, mult: 2 };
  const adxPeriod = profile?.adxPeriod ?? 14;
  const volMaPeriod = profile?.volumeMaPeriod ?? 20;

  return {
    i: candles.length - 1,
    candles,
    closes,
    volumes,
    sma: {
      short: calcSMA(closes, ma.short),
      mid: calcSMA(closes, ma.mid),
      long: calcSMA(closes, ma.long),
      base: calcSMA(closes, ma.base),
    },
    macd: calcMACD(closes, macd.fast, macd.slow, macd.signal),
    rsi: calcRSI(closes, rsiPeriod),
    boll: calcBollinger(closes, boll.period, boll.mult),
    volMA: calcVolumeMA(volumes, volMaPeriod),
    adx: calcADX(candles, adxPeriod),
  };
}

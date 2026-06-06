/**
 * FactorContext — 캔들 1회 입력으로 모든 보조지표를 계산해 팩터들이 공유.
 *
 * 엔진은 "주어진 캔들 배열의 **마지막 봉**"에서 신호를 평가한다(`i = n-1`).
 * 백테스트는 과거 시점 i 평가 시 `candles.slice(0, i+1)` 를 넘겨 같은 함수를 재사용 →
 * 미래 누설(look-ahead) 구조적 차단.
 */

import type { StockDailyCandle } from "@/lib/api/kis/types";
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

/** 캔들(오름차순) → 지표 일괄 계산. 표준 파라미터(MACD 12/26/9, RSI 14, BB 20/2). */
export function buildContext(candles: StockDailyCandle[]): FactorContext {
  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);
  return {
    i: candles.length - 1,
    candles,
    closes,
    volumes,
    sma: {
      short: calcSMA(closes, MA_PERIODS.short),
      mid: calcSMA(closes, MA_PERIODS.mid),
      long: calcSMA(closes, MA_PERIODS.long),
      base: calcSMA(closes, MA_PERIODS.base),
    },
    macd: calcMACD(closes),
    rsi: calcRSI(closes),
    boll: calcBollinger(closes),
    volMA: calcVolumeMA(volumes),
    adx: calcADX(candles),
  };
}

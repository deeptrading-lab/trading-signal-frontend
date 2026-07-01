/**
 * useChartData — 종목 차트 데이터 페치 + 보조지표 계산 + 보기 구간 슬라이스.
 *
 * 워밍업 포함 fetch(보기 구간보다 더 과거까지)로 MACD(12/26/9)·RSI(14)를 끊김 없이
 * 계산한 뒤, 표시는 사용자가 고른 구간(days)으로 잘라낸다 → 짧은 구간에서도 지표가 항상 나온다.
 */

import { useMemo } from "react";
import {
  useQueryStockChart,
  type ChartPeriod,
} from "@/hooks/stock/useQueryStockChart";
import { calcMACD, calcRSI, calcBollinger } from "@/lib/utils/technicalIndicators";
import type { ApiError } from "@/lib/api/errors";

/**
 * 보조지표 워밍업(캘린더일) — 보기 구간보다 더 과거까지 받아 MACD(시그널 35봉)·RSI(15봉)를
 *   끊김 없이 계산. 봉당 대략: 일봉≈영업일, 주봉≈/7, 월봉≈/30. 35봉 확보분 + 여유.
 */
const WARMUP_DAYS: Record<ChartPeriod, number> = { D: 60, W: 280, M: 1100 };
const MAX_FETCH_DAYS = 3000; // 라우트 MAX_DAYS 와 정합(초과 클램프)

/**
 * 볼린저밴드(20/2) 오버레이 필드 — 가격 시리즈(캔들·라인)에 함께 실어 메인 차트에 그린다.
 *   `bbRange`=[하단, 상단] 은 recharts 범위 Area(음영 밴드)용(캔들 wickRange 와 동일 메커니즘).
 *   룩백(20봉) 전 봉은 null → 렌더에서 미표시.
 */
export type BollingerFields = {
  bbUpper: number | null;
  bbMid: number | null;
  bbLower: number | null;
  bbRange: [number, number] | null;
};

export type PriceDatum = { date: string; price: number } & BollingerFields;
export type CandleDatum = {
  date: string;
  wickRange: [number, number];
  open: number;
  close: number;
  high: number;
  low: number;
  isUp: boolean;
  change: number | null;
  changePct: number | null;
} & BollingerFields;
export type VolDatum = { date: string; volume: number; isUp: boolean };
export type MacdDatum = {
  date: string;
  macd: number | null;
  signal: number | null;
  histogram: number | null;
};
export type RsiDatum = { date: string; rsi: number | null };

export type UseChartDataResult = {
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  priceSeries: PriceDatum[];
  candleSeries: CandleDatum[];
  volSeries: VolDatum[];
  macdSeries: MacdDatum[];
  rsiSeries: RsiDatum[];
};

export function useChartData(
  ticker: string,
  period: ChartPeriod,
  days: number,
): UseChartDataResult {
  // 워밍업 포함 fetch — 보기 구간(days)보다 더 과거까지 받아 지표 계산용 데이터 확보.
  const fetchDays = Math.min(days + WARMUP_DAYS[period], MAX_FETCH_DAYS);
  const { data, isLoading, isError, error } = useQueryStockChart(ticker, {
    period,
    days: fetchDays,
  });

  const series = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        priceSeries: [] as PriceDatum[],
        candleSeries: [] as CandleDatum[],
        volSeries: [] as VolDatum[],
        macdSeries: [] as MacdDatum[],
        rsiSeries: [] as RsiDatum[],
      };
    }

    // 1) 전체(워밍업 포함) 데이터로 지표 계산 — 표준 파라미터(MACD 12/26/9, RSI 14) 유지.
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
    const closes = sorted.map((c) => c.close);
    const macd = calcMACD(closes);
    const rsi = calcRSI(closes);
    const bb = calcBollinger(closes); // 20기간·2σ(기본). 워밍업이 룩백 20봉 커버.

    // 볼린저 4필드 매핑 — 가격·캔들 시리즈 공통 주입(같은 인덱스). null 이면 렌더 미표시.
    const bbFields = (i: number): BollingerFields => ({
      bbUpper: bb[i].upper,
      bbMid: bb[i].mid,
      bbLower: bb[i].lower,
      bbRange:
        bb[i].lower !== null && bb[i].upper !== null
          ? [bb[i].lower as number, bb[i].upper as number]
          : null,
    });

    // 2) 보기 구간 컷오프 — 마지막 봉 날짜에서 days 캘린더일 이전. 워밍업 구간은 표시에서 잘라낸다.
    const lastDate = sorted[sorted.length - 1].date; // "YYYY-MM-DD"
    const [ly, lm, ld] = lastDate.split("-").map(Number);
    const cutoff = new Date(ly, lm - 1, ld);
    cutoff.setDate(cutoff.getDate() - days);
    const pad = (n: number) => String(n).padStart(2, "0");
    const cutoffStr = `${cutoff.getFullYear()}-${pad(cutoff.getMonth() + 1)}-${pad(cutoff.getDate())}`;
    let visibleStart = sorted.findIndex((c) => c.date >= cutoffStr);
    if (visibleStart < 0) visibleStart = 0;

    // 3) 전체 시리즈 빌드 후 보기 구간으로 슬라이스(지표는 워밍업 덕에 첫 봉부터 값이 있음).
    const fullPrice: PriceDatum[] = sorted.map((c, i) => ({
      date: c.date.slice(5),
      price: c.close,
      ...bbFields(i),
    }));
    const fullCandle: CandleDatum[] = sorted.map((c, i) => {
      // 등락률 — 직전 봉 종가 대비(일봉=전일/주봉=전주/월봉=전월). 워밍업 구간 덕에 첫 표시 봉도 직전값 존재.
      const prevClose = i > 0 ? sorted[i - 1].close : null;
      const change = prevClose !== null ? c.close - prevClose : null;
      const changePct =
        prevClose !== null && prevClose !== 0
          ? ((c.close - prevClose) / prevClose) * 100
          : null;
      return {
        date: c.date.slice(5),
        wickRange: [c.low, c.high] as [number, number],
        open: c.open,
        close: c.close,
        high: c.high,
        low: c.low,
        isUp: c.close >= c.open,
        change,
        changePct,
        ...bbFields(i),
      };
    });
    const fullVol: VolDatum[] = sorted.map((c) => ({
      date: c.date.slice(5),
      volume: c.volume,
      isUp: c.close >= c.open,
    }));
    const fullMacd: MacdDatum[] = sorted.map((c, i) => ({
      date: c.date.slice(5),
      macd: macd[i].macd,
      signal: macd[i].signal,
      histogram: macd[i].histogram,
    }));
    const fullRsi: RsiDatum[] = sorted.map((c, i) => ({
      date: c.date.slice(5),
      rsi: rsi[i],
    }));

    return {
      priceSeries: fullPrice.slice(visibleStart),
      candleSeries: fullCandle.slice(visibleStart),
      volSeries: fullVol.slice(visibleStart),
      macdSeries: fullMacd.slice(visibleStart),
      rsiSeries: fullRsi.slice(visibleStart),
    };
  }, [data, days]);

  return { isLoading, isError, error, ...series };
}

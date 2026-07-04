/**
 * useChartData — 종목 차트 데이터 페치 + 보조지표 계산 + 보기 구간 슬라이스.
 *
 * 봉 단위(interval)로 소스가 갈린다:
 *   - 일/주/월봉("D"|"W"|"M"): `/stock/chart`(일봉 라우트). 워밍업 포함 fetch(보기 구간보다 더
 *     과거까지)로 MACD(12/26/9)·RSI(14)를 끊김 없이 계산한 뒤 표시는 고른 구간(days)으로 잘라낸다.
 *   - 분봉("m"): `/stock/chart-minute`(당일 한 세션). 컷오프 없이 반환 봉 전체를 그린다.
 *
 * 두 쿼리 훅은 매 렌더 항상 호출하고(rules of hooks), 활성 봉만 `enabled` 로 켠다. 지표(MACD/RSI/BB)는
 *   종가 시리즈에서만 계산하므로 일봉·분봉 어느 쪽이든 동일 매핑을 탄다.
 */

import { useMemo } from "react";
import {
  useQueryStockChart,
  type ChartPeriod,
} from "@/hooks/stock/useQueryStockChart";
import { useQueryMinuteChart } from "@/hooks/stock/useQueryMinuteChart";
import {
  calcMACD,
  calcRSI,
  calcBollinger,
  calcSMA,
  calcVWAP,
} from "@/lib/utils/technicalIndicators";
import {
  DEFAULT_TIMEFRAME,
  VMA_PERIOD,
  type MainInterval,
} from "@/components/profile/stockChartConfig";
import type { ApiError } from "@/lib/api/errors";

/**
 * 보조지표 워밍업(캘린더일) — 보기 구간보다 더 과거까지 받아 지표를 끊김 없이 계산.
 *   가장 긴 룩백은 이동평균선 MA120(120봉) — 첫 표시 봉부터 MA120 이 뜨도록 120봉+여유로 잡는다
 *   (MACD 시그널 35봉·RSI 15봉은 자동 충족). 봉당 대략: 일봉≈영업일(×0.69), 주봉≈/7, 월봉≈/30.
 *   월봉 MA120(=120개월)은 MAX_FETCH_DAYS 클램프로 과거 초반이 자연히 null(HTS 장기선 동일 거동).
 */
const WARMUP_DAYS: Record<ChartPeriod, number> = { D: 190, W: 900, M: 2400 };
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

/**
 * 이동평균선(MA 5/20/60/120) + VWAP — 가격 시리즈(캔들·라인)에 함께 실어 메인 차트에 겹쳐 그린다.
 *   각 필드는 룩백 전 봉이 null(렌더 미표시). MA 기간은 `MA_PERIODS`(stockChartConfig)와 1:1.
 */
export type MovingAverageFields = {
  ma5: number | null;
  ma20: number | null;
  ma60: number | null;
  ma120: number | null;
  vwap: number | null;
};

export type PriceDatum = { date: string; price: number } & BollingerFields &
  MovingAverageFields;
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
} & BollingerFields &
  MovingAverageFields;
/** 거래량 봉 + 거래량 이동평균(VMA). vma 는 룩백 전 null. */
export type VolDatum = { date: string; volume: number; isUp: boolean; vma: number | null };
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
  interval: MainInterval,
  days: number,
  timeframe: number = DEFAULT_TIMEFRAME,
): UseChartDataResult {
  const isMinute = interval === "m";
  // 분봉일 때 일봉 훅에 넘길 안전한 ChartPeriod(비활성이라 값 자체는 무의미).
  const period: ChartPeriod = isMinute ? "D" : interval;

  // 두 훅 모두 항상 호출(rules of hooks) — 활성 봉만 enabled 로 켠다.
  //   워밍업 포함 fetch — 보기 구간(days)보다 더 과거까지 받아 지표 계산용 데이터 확보.
  //   ※ useSignalResult 의 `D`/200 요청과는 `days` 키가 달라 초기 1왕복 중복이 있으나, 기간 선택기가
  //     `days` 를 가변으로 두므로 안전한 단일 키 공유가 어렵다(사유·보류 근거는 useSignalResult 헤더 참고).
  const fetchDays = Math.min(days + WARMUP_DAYS[period], MAX_FETCH_DAYS);
  const daily = useQueryStockChart(ticker, {
    period,
    days: fetchDays,
    enabled: !isMinute,
  });
  const minute = useQueryMinuteChart(ticker, timeframe, { enabled: isMinute });

  // 활성 봉의 쿼리 결과만 소비(둘은 동일 OHLCV 스키마 — StockMinuteCandle = StockDailyCandle).
  const { data, isLoading, isError, error } = isMinute ? minute : daily;

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

    // 이동평균선(SMA) — 종가 시리즈에 5/20/60/120 겹침(HTS 표준). 필드명이 기간을 고정하므로 리터럴 사용
    //   (기간 집합 SSOT 는 `MA_PERIODS`, 렌더/범례가 공유). 워밍업이 MA120(120봉) 룩백을 커버.
    const ma5 = calcSMA(closes, 5);
    const ma20 = calcSMA(closes, 20);
    const ma60 = calcSMA(closes, 60);
    const ma120 = calcSMA(closes, 120);
    // VWAP — 대표가(HLC/3)×거래량 누적. 분봉은 당일 한 세션이라 자연히 세션 VWAP,
    //   일/주/월봉은 워밍업 포함 시리즈 첫 봉부터 누적(세션 개념이 없어 누적 기준선).
    const vwap = calcVWAP(
      sorted.map((c) => ({ high: c.high, low: c.low, close: c.close, volume: c.volume })),
    );
    // 거래량 이동평균(VMA) — 거래량 시리즈 SMA(20). 거래량 서브플롯 라인.
    const vma = calcSMA(
      sorted.map((c) => c.volume),
      VMA_PERIOD,
    );

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

    // MA·VWAP 5필드 매핑 — 가격·캔들 시리즈 공통 주입(같은 인덱스). null 이면 렌더 미표시.
    const maFields = (i: number): MovingAverageFields => ({
      ma5: ma5[i],
      ma20: ma20[i],
      ma60: ma60[i],
      ma120: ma120[i],
      vwap: vwap[i],
    });

    // x축 라벨 — 분봉은 "YYYY-MM-DDTHH:mm" → 뒤 5글자("HH:mm"), 일/주/월봉은 "YYYY-MM-DD" → 앞 5글자 제거("MM-DD").
    //   (IntradayMiniChart 와 동일한 분봉 라벨 규칙.)
    const label = (d: string) => (isMinute ? d.slice(-5) : d.slice(5));

    // 2) 보기 구간 컷오프 — 마지막 봉 날짜에서 days 캘린더일 이전. 워밍업 구간은 표시에서 잘라낸다.
    //   분봉은 당일 한 세션(라우트가 이미 하루치)이라 컷오프를 건너뛰고 반환 봉 전체를 그린다.
    //   ("…THH:mm" 은 split("-")·setDate 가 NaN/Invalid Date 를 만들어 일봉 컷오프 로직을 못 탄다.)
    let visibleStart = 0;
    if (!isMinute) {
      const lastDate = sorted[sorted.length - 1].date; // "YYYY-MM-DD"
      const [ly, lm, ld] = lastDate.split("-").map(Number);
      const cutoff = new Date(ly, lm - 1, ld);
      cutoff.setDate(cutoff.getDate() - days);
      const pad = (n: number) => String(n).padStart(2, "0");
      const cutoffStr = `${cutoff.getFullYear()}-${pad(cutoff.getMonth() + 1)}-${pad(cutoff.getDate())}`;
      const idx = sorted.findIndex((c) => c.date >= cutoffStr);
      visibleStart = idx < 0 ? 0 : idx;
    }

    // 3) 전체 시리즈 빌드 후 보기 구간으로 슬라이스(지표는 워밍업 덕에 첫 봉부터 값이 있음).
    const fullPrice: PriceDatum[] = sorted.map((c, i) => ({
      date: label(c.date),
      price: c.close,
      ...bbFields(i),
      ...maFields(i),
    }));
    const fullCandle: CandleDatum[] = sorted.map((c, i) => {
      // 등락률 — 직전 봉 종가 대비(일봉=전일/주봉=전주/월봉=전월/분봉=직전 분봉). 워밍업·직전봉 덕에 첫 표시 봉도 값 존재.
      const prevClose = i > 0 ? sorted[i - 1].close : null;
      const change = prevClose !== null ? c.close - prevClose : null;
      const changePct =
        prevClose !== null && prevClose !== 0
          ? ((c.close - prevClose) / prevClose) * 100
          : null;
      return {
        date: label(c.date),
        wickRange: [c.low, c.high] as [number, number],
        open: c.open,
        close: c.close,
        high: c.high,
        low: c.low,
        isUp: c.close >= c.open,
        change,
        changePct,
        ...bbFields(i),
        ...maFields(i),
      };
    });
    const fullVol: VolDatum[] = sorted.map((c, i) => ({
      date: label(c.date),
      volume: c.volume,
      isUp: c.close >= c.open,
      vma: vma[i],
    }));
    const fullMacd: MacdDatum[] = sorted.map((c, i) => ({
      date: label(c.date),
      macd: macd[i].macd,
      signal: macd[i].signal,
      histogram: macd[i].histogram,
    }));
    const fullRsi: RsiDatum[] = sorted.map((c, i) => ({
      date: label(c.date),
      rsi: rsi[i],
    }));

    return {
      priceSeries: fullPrice.slice(visibleStart),
      candleSeries: fullCandle.slice(visibleStart),
      volSeries: fullVol.slice(visibleStart),
      macdSeries: fullMacd.slice(visibleStart),
      rsiSeries: fullRsi.slice(visibleStart),
    };
  }, [data, days, isMinute]);

  return { isLoading, isError, error, ...series };
}

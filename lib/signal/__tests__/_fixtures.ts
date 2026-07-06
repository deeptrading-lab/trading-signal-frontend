/**
 * 테스트 픽스처 헬퍼 — 종가 배열로 합성 캔들 생성. (`.test.ts` 아님 → 테스트 수집 제외)
 */

import type { StockDailyCandle } from "@/lib/api/kis/types";

/** 1월 1일부터 하루씩 증가하는 더미 날짜(YYYY-MM-DD). 영업일 구분 없이 순서만 보장. */
function dateAt(i: number): string {
  const base = new Date(Date.UTC(2020, 0, 1));
  base.setUTCDate(base.getUTCDate() + i);
  return base.toISOString().slice(0, 10);
}

export type CandleOpts = {
  /** 봉별 거래량. 미지정 시 1000 고정. */
  volumes?: number[];
  /** 고가/저가 마진(절대값). 기본 close*0.01. */
  wick?: number;
  /** 봉별 저가 오버라이드 — 지정 인덱스는 이 값을 그대로 쓴다(스윙 피벗 테스트용). 미지정이면 기존 close±wick 파생. */
  lows?: number[];
};

/** 종가 배열 → 캔들. open=직전 종가(첫 봉은 자기 종가), high/low=close±wick(또는 opts.lows 오버라이드). */
export function makeCandles(closes: number[], opts: CandleOpts = {}): StockDailyCandle[] {
  return closes.map((close, i) => {
    const open = i > 0 ? closes[i - 1] : close;
    const wick = opts.wick ?? close * 0.01;
    const high = Math.max(open, close) + wick;
    const derivedLow = Math.min(open, close) - wick;
    const low = opts.lows?.[i] ?? derivedLow;
    return {
      date: dateAt(i),
      open,
      high,
      low,
      close,
      volume: opts.volumes?.[i] ?? 1000,
    };
  });
}

/** 선형 추세 종가 — start 에서 매봉 step 씩. */
export function linearCloses(start: number, step: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => start + step * i);
}

/**
 * 현실적 추세 종가 — 선형 추세 + 사인파 출렁임(amp). 단조선형은 RSI 가 0/100 에 박히고
 * MACD 히스토그램이 0 근처 부동소수 노이즈로 부호가 뒤집혀 비현실적이라, 방향성 테스트엔 이쪽을 쓴다.
 */
export function noisyCloses(start: number, step: number, count: number, amp = 5): number[] {
  return Array.from(
    { length: count },
    (_, i) => start + step * i + amp * Math.sin(i * 0.5),
  );
}

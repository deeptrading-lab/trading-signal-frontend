/**
 * 분봉 리샘플/정리 순수 함수 — `minuteChartChunked.ts` 에서 추출.
 *
 * KIS 페이징 로직과 분리한 이유: 토스 어댑터(`lib/api/toss/minute.ts`)가 같은 리샘플 규약을
 * 재사용해야 하는데, `minuteChartChunked.ts` 는 KIS 페처(`./price`)를 import 하므로 그대로
 * 가져다 쓰면 순환 import 가 된다. 소스 무관 순수 함수만 이 파일에 둔다.
 * (기존 import 경로 호환을 위해 `minuteChartChunked.ts` 가 re-export 한다.)
 */

import type { StockMinuteCandle } from "./types";

/** "YYYY-MM-DDTHH:mm" 타임스탬프 → 분(자정 기준). 파싱 실패 시 -1. */
export function minutesOfDay(stamp: string): number {
  const m = stamp.match(/T(\d{2}):(\d{2})$/);
  if (!m) return -1;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * 1분봉 → `tfMinutes`분봉 리샘플 (순수 함수, 오름차순 입력 가정).
 *
 * 버킷 = 자정 기준 분을 `tfMinutes` 로 내림(예: 5분봉이면 09:00~09:04 → 09:00 라벨).
 * 버킷 키에 날짜가 포함되므로 날짜 경계(오버나잇)는 절대 한 버킷으로 합쳐지지 않는다.
 * open=버킷 첫 봉 시가, high/low=구간 극값, close=마지막 봉 종가, volume=합산.
 * `tfMinutes<=1` 이면 입력을 그대로 반환.
 */
export function resampleMinuteCandles(
  oneMin: StockMinuteCandle[],
  tfMinutes: number,
): StockMinuteCandle[] {
  if (tfMinutes <= 1) return oneMin;

  const buckets = new Map<string, StockMinuteCandle>();
  const order: string[] = [];

  for (const c of oneMin) {
    const min = minutesOfDay(c.date);
    if (min < 0) continue;
    const bucketMin = Math.floor(min / tfMinutes) * tfMinutes;
    const hh = String(Math.floor(bucketMin / 60)).padStart(2, "0");
    const mm = String(bucketMin % 60).padStart(2, "0");
    const key = `${c.date.slice(0, 10)}T${hh}:${mm}`;

    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, { date: key, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume });
      order.push(key);
    } else {
      existing.high = Math.max(existing.high, c.high);
      existing.low = Math.min(existing.low, c.low);
      existing.close = c.close;
      existing.volume += c.volume;
    }
  }

  return order.map((k) => buckets.get(k)!);
}

/**
 * 무거래 채움봉 제거 — KIS 분봉은 **체결 없는 분을 직전가·거래량 0 으로 채워** 보낸다(점심 무렵·장 막판
 * 등). 이 flat 0거래량 봉은 거래량/변동성 축을 왜곡하므로 시그널 입력에서 제외한다.
 * 15:30 종가 동시호가처럼 실제 거래량이 있는 봉(volume>0)은 그대로 유지된다.
 */
export function dropFillerBars(candles: StockMinuteCandle[]): StockMinuteCandle[] {
  return candles.filter((c) => c.volume > 0);
}

/** dedup(date) + 오름차순 정렬. */
export function dedupeSortMinuteCandles(
  candles: StockMinuteCandle[],
): StockMinuteCandle[] {
  const seen = new Set<string>();
  return candles
    .filter((c) => {
      if (seen.has(c.date)) return false;
      seen.add(c.date);
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

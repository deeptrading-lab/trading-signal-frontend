/**
 * mock 분봉 시세 fixture — KIS 미설정/타임아웃 시 BFF route·검증이 사용.
 *
 * `priorDays` 0 = 당일 한 세션, >0 = 과거 거래일(주말 스킵) + 당일을 이어붙인 멀티데이.
 * 각 세션은 09:00 부터 `timeframe`분 간격으로 15:30 까지 채운다.
 * date 는 `StockMinuteCandle` 규약대로 "YYYY-MM-DDTHH:mm" 타임스탬프(오름차순).
 */

import type { StockMinuteCandle } from "@/lib/api/kis/types";

const SESSION_OPEN_MIN = 9 * 60; // 09:00
const SESSION_CLOSE_MIN = 15 * 60 + 30; // 15:30

function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 오늘로부터 `back` 거래일(주말 제외) 이전 날짜. back=0 은 오늘(주말이어도 그대로). */
function tradingDayYmd(back: number): string {
  const d = new Date();
  let remaining = back;
  while (remaining > 0) {
    d.setDate(d.getDate() - 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) remaining -= 1; // 토(6)·일(0) 스킵
  }
  return ymd(d);
}

/** 한 세션(09:00~15:30)의 N분봉을 생성. `seedShift` 로 날짜별 시작가를 살짝 어긋낸다. */
function mockSession(ticker: string, tf: number, dateYmd: string, seedShift: number): StockMinuteCandle[] {
  const offset = (Number.parseInt(ticker.slice(-1), 10) || 0) * 500;
  let close = 70_000 + offset + seedShift * 300;
  const floor = close * 0.9;

  const out: StockMinuteCandle[] = [];
  let minute = SESSION_OPEN_MIN;
  for (let i = 0; minute <= SESSION_CLOSE_MIN; i++) {
    const delta = (((i * 7 + 3) % 20) - 10) * 50;
    close = Math.max(close + delta, floor);
    const spread = Math.abs(delta) + 80;
    const hh = String(Math.floor(minute / 60)).padStart(2, "0");
    const mm = String(minute % 60).padStart(2, "0");
    out.push({
      date: `${dateYmd}T${hh}:${mm}`,
      open: close - delta / 2,
      high: close + spread,
      low: close - spread,
      close,
      volume: 200_000 + (i % 5) * 40_000,
    });
    minute += tf;
  }
  return out;
}

export function getMockStockMinuteChart(
  ticker: string,
  timeframe: number = 5,
  bars: number = 78,
  priorDays: number = 0,
): StockMinuteCandle[] {
  const tf = timeframe > 0 ? timeframe : 5;

  // 당일 단일 세션 — 기존 동작(bars 상한 유지).
  if (priorDays <= 0) {
    return mockSession(ticker, tf, tradingDayYmd(0), 0).slice(0, bars);
  }

  // 멀티데이 — 오래된 거래일 → 당일 순으로 이어붙여 오름차순 유지.
  const out: StockMinuteCandle[] = [];
  for (let back = priorDays; back >= 0; back--) {
    out.push(...mockSession(ticker, tf, tradingDayYmd(back), priorDays - back));
  }
  return out;
}

/**
 * mock 분봉 시세 fixture — KIS 미설정/타임아웃 시 BFF route·검증이 사용.
 *
 * 당일 09:00 부터 `timeframe`분 간격으로 `bars`봉을 생성한다.
 * date 는 `StockMinuteCandle` 규약대로 "YYYY-MM-DDTHH:mm" 타임스탬프.
 */

import type { StockMinuteCandle } from "@/lib/api/kis/types";

const SESSION_OPEN_MIN = 9 * 60; // 09:00
const SESSION_CLOSE_MIN = 15 * 60 + 30; // 15:30

function todayYmd(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function getMockStockMinuteChart(
  ticker: string,
  timeframe: number = 5,
  bars: number = 78,
): StockMinuteCandle[] {
  const offset = (Number.parseInt(ticker.slice(-1), 10) || 0) * 500;
  const seed = 70_000 + offset;
  const ymd = todayYmd();
  const tf = timeframe > 0 ? timeframe : 5;

  const out: StockMinuteCandle[] = [];
  let close = seed;
  let minute = SESSION_OPEN_MIN;

  for (let i = 0; i < bars && minute < SESSION_CLOSE_MIN; i++) {
    const delta = (((i * 7 + 3) % 20) - 10) * 50;
    close = Math.max(close + delta, seed * 0.9);
    const spread = Math.abs(delta) + 80;
    const hh = String(Math.floor(minute / 60)).padStart(2, "0");
    const mm = String(minute % 60).padStart(2, "0");
    out.push({
      date: `${ymd}T${hh}:${mm}`,
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

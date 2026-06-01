/**
 * StockDailyChart 축·툴팁 포맷터 — recharts tickFormatter / Tooltip formatter 용.
 *
 * 각 fmtTooltip* 는 [표시값, 라벨] 튜플을 돌려준다(recharts formatter 시그니처).
 */

import { formatNumber } from "@/lib/utils/formatMoney";

export function fmtYAxis(v: number): string {
  return `${formatNumber(v / 10_000, { digits: 0 })}만`;
}

export function fmtVolAxis(v: number): string {
  return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : `${v}`;
}

export function fmtTooltipPrice(value: unknown): [string, string] {
  const n = typeof value === "number" ? value : Number(value);
  return [`${formatNumber(Number.isFinite(n) ? n : 0)} 원`, "종가"];
}

export function fmtTooltipVol(value: unknown): [string, string] {
  const n = typeof value === "number" ? value : Number(value);
  return [Number.isFinite(n) ? n.toLocaleString() : "0", "거래량"];
}

export function fmtTooltipMACD(value: unknown, name: unknown): [string, string] {
  const n = typeof value === "number" ? value : Number(value);
  const display = Number.isFinite(n) ? n.toFixed(2) : "-";
  const label =
    name === "histogram" ? "히스토그램" : name === "macd" ? "MACD" : "시그널";
  return [display, label];
}

export function fmtTooltipRSI(value: unknown): [string, string] {
  const n = typeof value === "number" ? value : Number(value);
  return [Number.isFinite(n) ? n.toFixed(1) : "-", "RSI"];
}

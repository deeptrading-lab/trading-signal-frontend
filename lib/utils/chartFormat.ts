/**
 * StockDailyChart 축·툴팁 포맷터 — recharts tickFormatter / Tooltip formatter 용.
 *
 * 각 fmtTooltip* 는 [표시값, 라벨] 튜플을 돌려준다(recharts formatter 시그니처).
 */

import { formatNumber } from "@/lib/utils/formatMoney";

/**
 * 가격 y축 눈금 — 국내는 원화 만 단위 축약("3만"), 미국은 달러라 만 단위가 안 맞아($315→"0만")
 * 평문 숫자로(us-stock-support). isUs 는 호출부에서 티커로 판정해 주입.
 */
export function fmtYAxis(v: number, isUs = false): string {
  if (isUs) return formatNumber(v, { digits: 0 });
  return `${formatNumber(v / 10_000, { digits: 0 })}만`;
}

export function fmtVolAxis(v: number): string {
  return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : `${v}`;
}

export function fmtTooltipPrice(value: unknown, isUs = false): [string, string] {
  const n = typeof value === "number" ? value : Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  return [isUs ? `$${formatNumber(safe)}` : `${formatNumber(safe)} 원`, "종가"];
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

/**
 * 캔들 차트 커스텀 툴팁 — OHLC + 직전 봉 대비 등락.
 */

import { formatNumber } from "@/lib/utils/formatMoney";
import { formatPct } from "@/lib/utils/formatPct";
import { C, tooltipStyle } from "./chartTheme";

export function CandleTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { payload: {
    open: number; close: number; high: number; low: number;
    change: number | null; changePct: number | null;
  } }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const isUp = d.close >= d.open;
  const color = isUp ? C.stroke : C.down;
  // 등락률 색 — 한국식(상승 빨강 / 하락 파랑 / 보합 기본). 직전 봉 종가 대비.
  const chgColor = d.changePct == null || d.changePct === 0
    ? C.tooltipText
    : d.changePct > 0 ? C.stroke : C.down;
  return (
    <div style={{ ...tooltipStyle, padding: "8px 12px", minWidth: 130 }}>
      <p style={{ color: C.axisTick, marginBottom: 6, fontSize: 11 }}>{label}</p>
      {(["high", "open", "close", "low"] as const).map((k) => (
        <p key={k} style={{ color: k === "close" ? color : C.tooltipText, fontSize: 12, lineHeight: "1.6" }}>
          {k === "high" ? "고" : k === "open" ? "시" : k === "close" ? "종" : "저"}&nbsp;
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatNumber(d[k])} 원</span>
        </p>
      ))}
      {d.changePct != null && (
        <p style={{ color: chgColor, fontSize: 12, lineHeight: "1.6", marginTop: 4, paddingTop: 4, borderTop: "1px solid rgba(15,20,25,0.06)" }}>
          등락&nbsp;
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {formatPct(d.changePct, { digits: 2, sign: true })}
            {d.change != null && ` (${d.change > 0 ? "+" : ""}${formatNumber(d.change, { digits: 0 })})`}
          </span>
        </p>
      )}
    </div>
  );
}

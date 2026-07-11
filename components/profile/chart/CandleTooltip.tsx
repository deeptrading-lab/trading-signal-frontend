/**
 * 캔들 차트 커스텀 툴팁 — OHLC + 직전 봉 대비 등락 + (옵션) 이동평균선·VWAP 값.
 *
 * `showMA`/`showVWAP` 는 상위(StockDailyChart)가 `content={<CandleTooltip showMA … />}` 로 주입한다.
 *   recharts 가 content 를 cloneElement 로 렌더하며 active/payload/label 만 덮어쓰고 이 플래그는 보존한다.
 *   MA·VWAP 값은 payload[0].payload(=캔들 datum) 에 이미 실려 있어 별도 시리즈 구독 없이 읽는다.
 */

import { formatNumber } from "@/lib/utils/formatMoney";
import { formatPct } from "@/lib/utils/formatPct";
import { useChartThemeContext } from "./ChartThemeContext";

type CandlePayload = {
  open: number;
  close: number;
  high: number;
  low: number;
  change: number | null;
  changePct: number | null;
  ma5: number | null;
  ma20: number | null;
  ma60: number | null;
  ma120: number | null;
  vwap: number | null;
};

export function CandleTooltip({ active, payload, label, showMA, showVWAP, isUs = false }: {
  active?: boolean;
  payload?: { payload: CandlePayload }[];
  label?: string;
  showMA?: boolean;
  showVWAP?: boolean;
  /** 미국 종목(달러) — 가격을 "원" 대신 "$"로(us-stock-support). */
  isUs?: boolean;
}) {
  const { C, tooltipStyle, tooltipDivider } = useChartThemeContext();
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const isUp = d.close >= d.open;
  const color = isUp ? C.stroke : C.down;
  // 등락률 색 — 한국식(상승 빨강 / 하락 파랑 / 보합 기본). 직전 봉 종가 대비.
  const chgColor = d.changePct == null || d.changePct === 0
    ? C.tooltipText
    : d.changePct > 0 ? C.stroke : C.down;

  // 이동평균선 — 켜져 있고 값이 있는 기간만. 라벨 색은 라인 색과 일치(범례 겸용).
  const maRows = showMA
    ? ([
        { label: "MA5", value: d.ma5, color: C.ma5 },
        { label: "MA20", value: d.ma20, color: C.ma20 },
        { label: "MA60", value: d.ma60, color: C.ma60 },
        { label: "MA120", value: d.ma120, color: C.ma120 },
      ] as const).filter((r) => r.value != null)
    : [];
  const showVwapRow = showVWAP && d.vwap != null;

  return (
    <div style={{ ...tooltipStyle, padding: "8px 12px", minWidth: 130 }}>
      <p style={{ color: C.axisTick, marginBottom: 6, fontSize: 11 }}>{label}</p>
      {(["high", "open", "close", "low"] as const).map((k) => (
        <p key={k} style={{ color: k === "close" ? color : C.tooltipText, fontSize: 12, lineHeight: "1.6" }}>
          {k === "high" ? "고" : k === "open" ? "시" : k === "close" ? "종" : "저"}&nbsp;
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            {isUs ? `$${formatNumber(d[k])}` : `${formatNumber(d[k])} 원`}
          </span>
        </p>
      ))}
      {(maRows.length > 0 || showVwapRow) && (
        <div style={{ marginTop: 4, paddingTop: 4, borderTop: tooltipDivider }}>
          {maRows.map((r) => (
            <p key={r.label} style={{ color: C.tooltipText, fontSize: 12, lineHeight: "1.55" }}>
              <span style={{ color: r.color, fontWeight: 700 }}>{r.label}</span>&nbsp;
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatNumber(r.value, { digits: 0 })}</span>
            </p>
          ))}
          {showVwapRow && (
            <p style={{ color: C.tooltipText, fontSize: 12, lineHeight: "1.55" }}>
              <span style={{ color: C.vwap, fontWeight: 700 }}>VWAP</span>&nbsp;
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatNumber(d.vwap, { digits: 0 })}</span>
            </p>
          )}
        </div>
      )}
      {d.changePct != null && (
        <p style={{ color: chgColor, fontSize: 12, lineHeight: "1.6", marginTop: 4, paddingTop: 4, borderTop: tooltipDivider }}>
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

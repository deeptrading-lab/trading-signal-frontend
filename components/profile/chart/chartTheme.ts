/**
 * 차트 색·스타일 상수 — StockDailyChart 및 하위 차트 조각 공용.
 *
 * 색은 DESIGN.md(`docs/design/finsight-redesign.md`) → `design:sync` → `tailwind.theme.json`
 * 단일 출처를 참조한다(hex 직타 0). recharts 는 색 "문자열"을 요구하므로 Tailwind 클래스가 아닌
 * 토큰의 hex 값을 JSON 에서 끌어와 쓴다.
 *   - 상승/축/그리드/툴팁텍스트는 의미가 일치하는 기존 토큰 재사용(signal-up·text-muted·border-line·text-strong).
 *   - 차트 전용 색은 `chart-*` 토큰(W2, 값 보존 등록). 동일 hex라도 역할별 별도 토큰(chart-macd/ref-os/down 등).
 *   - 툴팁 배경만 rgba 투명 오버레이라 토큰화 제외(코드 리터럴 유지).
 */

import themeJson from "@/tailwind.theme.json";

const t = themeJson.theme.extend.colors;

/** 서브플롯 호버 연동용 syncId. */
export const SYNC_ID = "stock-chart";

export const C = {
  stroke: t["signal-up"], // 상승 캔들/라인 (한국식 빨강)
  fill: t["signal-up"],
  axisTick: t["text-muted"],
  grid: t["border-line"],
  tooltipBg: "rgba(255,255,255,0.82)", // 반투명 오버레이 — rgba라 토큰화 제외, 코드 리터럴 유지
  tooltipText: t["text-strong"],
  macdLine: t["chart-macd"], // MACD 라인 (파랑)
  signalLine: t["chart-signal"], // MACD 시그널 라인 (앰버)
  histUp: t["chart-hist-up"], // MACD 히스토그램 양수 (초록)
  histDown: t["chart-hist-down"], // MACD 히스토그램 음수 (빨강)
  rsiLine: t["chart-rsi"], // RSI 라인 (보라)
  refOB: t["chart-ref-ob"], // RSI 과매수 70
  refOS: t["chart-ref-os"], // RSI 과매도 30
  refMid: t["chart-ref-mid"], // RSI 중립 50
  volUp: t["chart-vol-up"], // 거래량 상승 봉
  volDown: t["chart-vol-down"], // 거래량 하락 봉
  down: t["chart-down"], // 하락 캔들/라인 (파랑) — macd 라인색과 hex는 같으나 역할 분리
} as const;

export const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid rgba(15,20,25,0.08)", // 반투명 배경 경계 보강
  boxShadow: "0 4px 12px rgba(23,32,42,0.1)",
  backgroundColor: C.tooltipBg,
  backdropFilter: "blur(3px)",
  WebkitBackdropFilter: "blur(3px)",
  color: C.tooltipText,
  fontSize: 12,
};

export const labelStyle = { color: C.axisTick, marginBottom: 4 };

export const axisProps = {
  axisLine: false,
  tickLine: false,
  tick: { fontSize: 11, fill: C.axisTick },
} as const;

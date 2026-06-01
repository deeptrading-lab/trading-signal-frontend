/**
 * 차트 색·스타일 상수 — StockDailyChart 및 하위 차트 조각 공용.
 *
 * hex/rgba 직타는 W2(차트 토큰화)에서 `chart-*` 디자인 토큰으로 이관 예정.
 * 본 모듈은 구조 분리(Wave 3a) 단계로, 값은 기존과 동일하게 유지한다.
 */

/** 서브플롯 호버 연동용 syncId. */
export const SYNC_ID = "stock-chart";

export const C = {
  stroke: "#c81e1e", // signal-up (빨강)
  fill: "#c81e1e",
  axisTick: "#5b6470",
  grid: "#eceff3",
  tooltipBg: "rgba(255,255,255,0.82)", // 반투명 — 뒤 그래프가 어느 정도 비치도록
  tooltipText: "#0f1419",
  macdLine: "#2563eb", // 파랑
  signalLine: "#f59e0b", // 앰버
  histUp: "#16a34a", // 초록
  histDown: "#dc2626", // 빨강
  rsiLine: "#7c3aed", // 보라
  refOB: "#dc2626", // 과매수
  refOS: "#2563eb", // 과매도
  refMid: "#9ca3af", // 중립
  volUp: "#fca5a5",
  volDown: "#93c5fd",
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

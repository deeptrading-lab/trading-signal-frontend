/**
 * 매수 유의사항(거래소 시장경보·VI) 한글 라벨·심각도 — PRD `stock-warnings` §6.
 *
 * 서버(AI 분석 프롬프트 "매수 유의" 1줄)와 클라이언트(종목 헤더 경고 칩)가 같은 라벨을
 * 쓰도록 단일 위치. warningType 은 unknown code 허용이 스펙 의무 — enum 밖 값은
 * `WARNING_FALLBACK_LABEL` 로 폴백(throw·누락 없음).
 */

export type StockWarningSeverity = "critical" | "warn" | "info";

/** unknown warningType 폴백 라벨 — 토스가 새 경보 코드를 추가해도 안전하게 노출. */
export const WARNING_FALLBACK_LABEL = "거래소 경보";

const WARNING_LABELS: Record<string, string> = {
  LIQUIDATION_TRADING: "정리매매",
  OVERHEATED: "단기과열",
  INVESTMENT_WARNING: "투자경고",
  INVESTMENT_RISK: "투자위험",
  VI_STATIC: "VI 발동",
  VI_DYNAMIC: "VI 발동",
  VI_STATIC_AND_DYNAMIC: "VI 발동",
  STOCK_WARRANTS: "신주인수권",
};

/** 심각도 — 정리매매·투자위험(상폐/최고 경보) > 투자경고·단기과열 > VI·신주인수권·unknown. */
const WARNING_SEVERITIES: Record<string, StockWarningSeverity> = {
  LIQUIDATION_TRADING: "critical",
  INVESTMENT_RISK: "critical",
  INVESTMENT_WARNING: "warn",
  OVERHEATED: "warn",
  VI_STATIC: "info",
  VI_DYNAMIC: "info",
  VI_STATIC_AND_DYNAMIC: "info",
  STOCK_WARRANTS: "info",
};

export function warningLabel(warningType: string): string {
  return WARNING_LABELS[warningType] ?? WARNING_FALLBACK_LABEL;
}

export function warningSeverity(warningType: string): StockWarningSeverity {
  return WARNING_SEVERITIES[warningType] ?? "info";
}

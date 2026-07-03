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

/**
 * 신규 진입을 룰로 차단해야 하는 경보 판정 — critical 심각도(정리매매·투자위험).
 * 단타 결정론 게이트(PRD intraday-warning-gate)가 사용한다. 심각도 분류를 재사용하므로
 * UI 빨간 배지(critical)와 트레이딩 진입 차단이 구조적으로 일치한다(단일 진실 원천).
 * 단기과열·투자경고·VI(warn/info)는 차단 대상이 아니다 — 프롬프트 참고로만(#205).
 */
export function isEntryBlockingWarning(warningType: string): boolean {
  return warningSeverity(warningType) === "critical";
}

const SEVERITY_ORDER: Record<StockWarningSeverity, number> = {
  critical: 0,
  warn: 1,
  info: 2,
};

export type StockWarningChip = {
  label: string;
  severity: StockWarningSeverity;
};

/**
 * 경보 → 칩 뷰모델 — 라벨 기준 중복 제거(VI 3종이 같은 "VI 발동" 라벨) 후 심각도 순 정렬.
 * 같은 라벨이 서로 다른 심각도로 오는 방어 케이스는 더 높은 심각도를 유지.
 * 종목 헤더 칩이 사용하고, 후속 지면(관심종목 행·단타 후보표)도 재사용한다.
 */
export function toWarningChips(
  items: readonly { warningType: string }[],
): StockWarningChip[] {
  const byLabel = new Map<string, StockWarningSeverity>();
  for (const item of items) {
    const label = warningLabel(item.warningType);
    const severity = warningSeverity(item.warningType);
    const existing = byLabel.get(label);
    if (existing == null || SEVERITY_ORDER[severity] < SEVERITY_ORDER[existing]) {
      byLabel.set(label, severity);
    }
  }
  return [...byLabel.entries()]
    .map(([label, severity]) => ({ label, severity }))
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

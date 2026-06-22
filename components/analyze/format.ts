/** 토큰 대시보드 공용 포맷터 + 분석가 라벨 조회. */

import { AGENT_META, type AgentKey } from "@/lib/types/stock/aiAnalysis";

const AGENT_LABEL = new Map<AgentKey, string>(AGENT_META.map((m) => [m.key, m.label]));

export function agentLabel(key: AgentKey): string {
  return AGENT_LABEL.get(key) ?? key;
}

/** 정수 토큰 — 천단위 콤마, 소수 없음. null = "—". */
export function fmtTokens(n: number | null): string {
  if (n == null) return "—";
  return Math.round(n).toLocaleString("ko-KR");
}

/** USD 비용 — 소액이라 소수 4자리. null = "—". */
export function fmtCost(n: number | null): string {
  if (n == null) return "—";
  return `$${n.toFixed(4)}`;
}

/** USD 비용(분석 1회 총합) — 소수 2자리 반올림. null = "—". */
export function fmtCostRounded(n: number | null): string {
  if (n == null) return "—";
  return `$${n.toFixed(2)}`;
}

/** 토큰 근사 표기(카드 chip 용) — "약 76만"(1만 이상) / 1만 미만은 콤마. null = "—". */
export function fmtTokensApprox(n: number | null): string {
  if (n == null) return "—";
  if (n < 10000) return fmtTokens(n);
  const man = n / 10000;
  const rounded = man >= 10 ? Math.round(man) : Math.round(man * 10) / 10;
  return `약 ${rounded}만`;
}

/** USD 비용 근사 표기(카드 chip 용) — $1 이상 소수1자리 / 미만 소수2자리. null = "—". */
export function fmtCostApprox(n: number | null): string {
  if (n == null) return "—";
  return n >= 1 ? `$${n.toFixed(1)}` : `$${n.toFixed(2)}`;
}

/** 0~1 비율 → 백분율 1자리. null = "—". */
export function fmtRate(n: number | null): string {
  if (n == null) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

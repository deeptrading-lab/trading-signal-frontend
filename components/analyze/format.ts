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

/** 0~1 비율 → 백분율 1자리. null = "—". */
export function fmtRate(n: number | null): string {
  if (n == null) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

/**
 * AI 종합분석 4-페이즈 모델 — 12 에이전트를 실제 의존 순서로 묶는 순수 로직.
 *
 * 라이브 패널이 회색 12-칩 스트립 대신 **4 페이즈 타임라인**(분석가 → 토론 → 종합 → 최종 판정)으로
 * 렌더하기 위한 그룹핑·상태 파생·재개 기점 계산을 한 곳에 둔다. `AGENT_ORDER`·`getResumeKey` 와 정합하며
 * React·DOM 의존이 전혀 없어 단위 테스트로 회귀를 고정한다(`__tests__/aiPhases.test.ts`).
 *
 * 페이즈 상태(대기/진행/완료/오류)는 멤버 에이전트의 `AgentStatus` 에서 파생한다 —
 * 상태 노드(빈 링/맥박/체크/경고)와 자동 펼침이 이 값을 소비한다.
 */

import {
  AGENT_ORDER,
  getResumeKey,
  type AgentKey,
  type AgentState,
  type AgentStatus,
} from "@/lib/types/stock/aiAnalysis";

/** 4 페이즈 키 — 분석 → 토론 → 종합 → 판정. */
export type PhaseKey = "analysts" | "debate" | "synthesis" | "verdict";

/** 페이즈 상태 — 대기/진행/완료/오류. 멤버 에이전트 상태에서 파생. */
export type PhaseStatus = "pending" | "running" | "done" | "error";

export interface PhaseDef {
  key: PhaseKey;
  /** 이 페이즈에 속한 에이전트(실행 순서 = AGENT_ORDER 부분열). */
  agents: AgentKey[];
}

/**
 * 페이즈 → 에이전트 매핑(AGENT_ORDER 정합, 12개를 정확히 1회씩 분할).
 *   ① analysts  — market·news·fundamentals·social (병렬 4)
 *   ② debate    — bull·bear (bull R1→bear R1→bull R2→bear R2)
 *   ③ synthesis — research_manager→trader→(risk_risky·risk_neutral·risk_safe 병렬 3)
 *   ④ verdict   — portfolio_manager (UI 라벨 "최종 판정" — "PM" 미노출)
 */
export const PHASES: PhaseDef[] = [
  { key: "analysts", agents: ["market", "news", "fundamentals", "social"] },
  { key: "debate", agents: ["bull", "bear"] },
  {
    key: "synthesis",
    agents: ["research_manager", "trader", "risk_risky", "risk_neutral", "risk_safe"],
  },
  { key: "verdict", agents: ["portfolio_manager"] },
];

/** agents 배열에서 key→status 조회(없으면 pending). */
function statusOf(agents: AgentState[], key: AgentKey): AgentStatus {
  return agents.find((a) => a.key === key)?.status ?? "pending";
}

/**
 * 멤버 에이전트 상태 → 페이즈 상태.
 *   - 전부 pending           → pending
 *   - 전부 done              → done
 *   - 하나라도 running       → running (진행 표시 우선 — 병렬 중 일부 완료여도 맥박 유지)
 *   - running 없고 error 있음 → error
 *   - 그 외(done+pending 혼재) → running (진행 중 — 다음 에이전트 대기 사이 공백)
 */
export function derivePhaseStatus(agents: AgentState[], phase: PhaseDef): PhaseStatus {
  const statuses = phase.agents.map((k) => statusOf(agents, k));
  if (statuses.every((s) => s === "pending")) return "pending";
  if (statuses.every((s) => s === "done")) return "done";
  if (statuses.some((s) => s === "running")) return "running";
  if (statuses.some((s) => s === "error")) return "error";
  return "running";
}

/** 페이즈 완료 에이전트 수 / 전체 수(진행 카운터 "N/M"). */
export function phaseProgress(
  agents: AgentState[],
  phase: PhaseDef,
): { done: number; total: number } {
  const done = phase.agents.filter((k) => statusOf(agents, k) === "done").length;
  return { done, total: phase.agents.length };
}

/**
 * 페이즈 재개 기점 — 칩 스트립 제거로 페이즈 행에 옮겨온 **에러 재개 어포던스**가 부를 resume 키.
 * AGENT_ORDER 순서로 첫 error(없으면 첫 pending) 에이전트의 `getResumeKey` 를 반환한다.
 *   - bear 오류 → bull(토론은 항상 bull 부터)
 *   - risk_neutral·risk_safe 오류 → risk_risky(3 병렬 중 첫 번째)
 * error·pending 이 없으면(완료·전부 진행) null.
 */
export function phaseResumeKey(agents: AgentState[], phase: PhaseDef): AgentKey | null {
  const ordered = [...phase.agents].sort(
    (a, b) => AGENT_ORDER.indexOf(a) - AGENT_ORDER.indexOf(b),
  );
  const firstError = ordered.find((k) => statusOf(agents, k) === "error");
  if (firstError) return getResumeKey(firstError);
  const firstPending = ordered.find((k) => statusOf(agents, k) === "pending");
  if (firstPending) return getResumeKey(firstPending);
  return null;
}

/** 페이즈 내 첫 error 에이전트의 실패 사유(있으면) — 행 요약 오류 라벨용. */
export function phaseFailReason(
  agents: AgentState[],
  phase: PhaseDef,
): AgentState["failReason"] | undefined {
  const errored = phase.agents
    .map((k) => agents.find((a) => a.key === k))
    .find((a) => a?.status === "error");
  return errored?.failReason;
}

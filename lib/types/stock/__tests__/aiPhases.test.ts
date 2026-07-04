/**
 * aiPhases 회귀 — 12 에이전트의 4-페이즈 그룹핑, 멤버 상태 → 페이즈 상태 파생,
 * 페이즈 재개 기점(에러 재개 어포던스의 resume 키) 계약을 고정한다.
 *
 * 순수 로직(React/DOM 무관)이라 node 환경 vitest 로 직접 검증한다.
 */

import { describe, it, expect } from "vitest";
import {
  AGENT_ORDER,
  INITIAL_AGENT_STATES,
  type AgentKey,
  type AgentState,
  type AgentStatus,
} from "@/lib/types/stock/aiAnalysis";
import {
  PHASES,
  derivePhaseStatus,
  phaseProgress,
  phaseResumeKey,
  phaseFailReason,
  type PhaseKey,
} from "@/lib/types/stock/aiPhases";

/** 상태 오버라이드로 12 에이전트 배열을 만든다(미지정은 pending). */
function agentsWith(overrides: Partial<Record<AgentKey, AgentState>>): AgentState[] {
  return INITIAL_AGENT_STATES.map((a) => overrides[a.key] ?? a);
}

function agent(key: AgentKey, status: AgentStatus, failReason?: AgentState["failReason"]): AgentState {
  return { key, status, streamingChunk: "", failReason };
}

const phaseByKey = (key: PhaseKey) => PHASES.find((p) => p.key === key)!;

describe("PHASES 그룹핑", () => {
  it("4 페이즈(분석가·토론·종합·최종 판정) 순서", () => {
    expect(PHASES.map((p) => p.key)).toEqual([
      "analysts",
      "debate",
      "synthesis",
      "verdict",
    ]);
  });

  it("12 에이전트를 정확히 1회씩 분할한다", () => {
    const flat = PHASES.flatMap((p) => p.agents);
    expect(flat).toHaveLength(AGENT_ORDER.length);
    expect(new Set(flat).size).toBe(AGENT_ORDER.length);
    expect(new Set(flat)).toEqual(new Set(AGENT_ORDER));
  });

  it("각 페이즈 내 에이전트는 AGENT_ORDER 오름차순(부분열)", () => {
    for (const phase of PHASES) {
      const idx = phase.agents.map((k) => AGENT_ORDER.indexOf(k));
      expect(idx).toEqual([...idx].sort((a, b) => a - b));
    }
    // 페이즈 경계도 전역 순서 보존 — 앞 페이즈 마지막 < 뒤 페이즈 첫.
    const firstIdx = PHASES.map((p) => AGENT_ORDER.indexOf(p.agents[0]));
    expect(firstIdx).toEqual([...firstIdx].sort((a, b) => a - b));
  });

  it("페이즈 멤버 구성 스냅샷", () => {
    expect(phaseByKey("analysts").agents).toEqual(["market", "news", "fundamentals", "social"]);
    expect(phaseByKey("debate").agents).toEqual(["bull", "bear"]);
    expect(phaseByKey("synthesis").agents).toEqual([
      "research_manager",
      "trader",
      "risk_risky",
      "risk_neutral",
      "risk_safe",
    ]);
    expect(phaseByKey("verdict").agents).toEqual(["portfolio_manager"]);
  });
});

describe("derivePhaseStatus", () => {
  const analysts = phaseByKey("analysts");

  it("전부 pending → pending", () => {
    expect(derivePhaseStatus(INITIAL_AGENT_STATES, analysts)).toBe("pending");
  });

  it("전부 done → done", () => {
    const agents = agentsWith({
      market: agent("market", "done"),
      news: agent("news", "done"),
      fundamentals: agent("fundamentals", "done"),
      social: agent("social", "done"),
    });
    expect(derivePhaseStatus(agents, analysts)).toBe("done");
  });

  it("하나라도 running → running(일부 done·pending 이어도)", () => {
    const agents = agentsWith({
      market: agent("market", "done"),
      news: agent("news", "running"),
    });
    expect(derivePhaseStatus(agents, analysts)).toBe("running");
  });

  it("running 우선 — error 와 공존해도 running", () => {
    const agents = agentsWith({
      market: agent("market", "error", "timeout"),
      news: agent("news", "running"),
    });
    expect(derivePhaseStatus(agents, analysts)).toBe("running");
  });

  it("running 없고 error 있음 → error(중지·실패)", () => {
    const agents = agentsWith({
      market: agent("market", "done"),
      news: agent("news", "error", "cli-error"),
      // fundamentals·social 은 pending
    });
    expect(derivePhaseStatus(agents, analysts)).toBe("error");
  });

  it("done+pending 혼재(진행 중 공백) → running", () => {
    const agents = agentsWith({
      market: agent("market", "done"),
      news: agent("news", "done"),
      // fundamentals·social pending, running/error 없음
    });
    expect(derivePhaseStatus(agents, analysts)).toBe("running");
  });

  it("단일 에이전트 페이즈(verdict) — PM 상태를 그대로 승계", () => {
    const verdict = phaseByKey("verdict");
    expect(derivePhaseStatus(INITIAL_AGENT_STATES, verdict)).toBe("pending");
    expect(derivePhaseStatus(agentsWith({ portfolio_manager: agent("portfolio_manager", "running") }), verdict)).toBe("running");
    expect(derivePhaseStatus(agentsWith({ portfolio_manager: agent("portfolio_manager", "done") }), verdict)).toBe("done");
    expect(derivePhaseStatus(agentsWith({ portfolio_manager: agent("portfolio_manager", "error", "verdict-invalid") }), verdict)).toBe("error");
  });
});

describe("phaseProgress", () => {
  it("완료 수 / 전체 수", () => {
    const agents = agentsWith({
      market: agent("market", "done"),
      news: agent("news", "done"),
      fundamentals: agent("fundamentals", "running"),
    });
    expect(phaseProgress(agents, phaseByKey("analysts"))).toEqual({ done: 2, total: 4 });
    expect(phaseProgress(INITIAL_AGENT_STATES, phaseByKey("synthesis"))).toEqual({ done: 0, total: 5 });
    expect(phaseProgress(INITIAL_AGENT_STATES, phaseByKey("verdict"))).toEqual({ done: 0, total: 1 });
  });
});

describe("phaseResumeKey", () => {
  it("분석가 — 첫 error 에이전트 그대로(fundamentals)", () => {
    const agents = agentsWith({
      market: agent("market", "done"),
      news: agent("news", "done"),
      fundamentals: agent("fundamentals", "error", "timeout"),
    });
    expect(phaseResumeKey(agents, phaseByKey("analysts"))).toBe("fundamentals");
  });

  it("토론 — bear 오류는 bull 부터 재개", () => {
    const agents = agentsWith({
      bull: agent("bull", "done"),
      bear: agent("bear", "error", "cli-error"),
    });
    expect(phaseResumeKey(agents, phaseByKey("debate"))).toBe("bull");
  });

  it("종합 — risk_neutral 오류는 risk_risky 부터(병렬 3 첫 번째)", () => {
    const agents = agentsWith({
      research_manager: agent("research_manager", "done"),
      trader: agent("trader", "done"),
      risk_risky: agent("risk_risky", "done"),
      risk_neutral: agent("risk_neutral", "error", "timeout"),
    });
    expect(phaseResumeKey(agents, phaseByKey("synthesis"))).toBe("risk_risky");
  });

  it("최종 판정 — PM 오류는 portfolio_manager 부터", () => {
    const agents = agentsWith({
      portfolio_manager: agent("portfolio_manager", "error", "json-parse"),
    });
    expect(phaseResumeKey(agents, phaseByKey("verdict"))).toBe("portfolio_manager");
  });

  it("error 없고 pending 있으면 첫 pending 의 resume 키", () => {
    const agents = agentsWith({
      market: agent("market", "done"),
      // news·fundamentals·social pending → 첫 pending = news
    });
    expect(phaseResumeKey(agents, phaseByKey("analysts"))).toBe("news");
  });

  it("전부 done 이면 null(재개 불필요)", () => {
    const agents = agentsWith({
      bull: agent("bull", "done"),
      bear: agent("bear", "done"),
    });
    expect(phaseResumeKey(agents, phaseByKey("debate"))).toBeNull();
  });
});

describe("phaseFailReason", () => {
  it("첫 error 에이전트의 실패 사유", () => {
    const agents = agentsWith({
      market: agent("market", "done"),
      news: agent("news", "error", "cli-error"),
      fundamentals: agent("fundamentals", "error", "timeout"),
    });
    expect(phaseFailReason(agents, phaseByKey("analysts"))).toBe("cli-error");
  });

  it("error 없으면 undefined", () => {
    expect(phaseFailReason(INITIAL_AGENT_STATES, phaseByKey("analysts"))).toBeUndefined();
  });
});

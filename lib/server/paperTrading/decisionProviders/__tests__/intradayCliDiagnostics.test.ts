/**
 * 에이전트 호출 진단(agentDiagnostics) 캡처 테스트 (PRD intraday-decision-overhaul PR-0, AC-1~4).
 *
 * `decideIntradayWithCli` 를 CLI 스텁으로 구동 — 실패 원문(rawTextHead)·종류(failureKind)·시도
 * 횟수가 결정에 실려 payload 로 영속되는지, 전부 성공한 틱은 미기록(행동·payload 무변경)인지 검증.
 * 2,199틱 감사에서 실패 125틱의 원문이 전량 유실돼 소급 진단이 불가했던 갭을 막는 안전망.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AgentUsage } from "@/lib/types/stock/aiAnalysis";
import type { StockMinuteCandle } from "@/lib/api/kis/types";

vi.mock("@/lib/server/ai/agentCli", () => ({
  invokeAgentCliStream: vi.fn(),
}));
vi.mock("@/lib/api/toss/warnings", () => ({
  fetchActiveWarnings: vi.fn(async () => []),
}));

import { decideIntradayWithCli } from "../intradayCli";
import { invokeAgentCliStream } from "@/lib/server/ai/agentCli";

const mockInvoke = vi.mocked(invokeAgentCliStream);

function usage(over: Partial<AgentUsage> = {}): AgentUsage {
  return {
    inputTokens: 100,
    outputTokens: 50,
    cacheCreationInputTokens: null,
    cacheReadInputTokens: null,
    costUsd: null,
    model: "stub-model",
    measured: true,
    ...over,
  };
}

// v1 레거시 스키마(action 직접 출력) — PR-3a 듀얼 normalize 의 전환기 호환 경로를 함께 검증한다.
const VALID_JUDGE_JSON = JSON.stringify({
  action: "HOLD",
  confidence: "MEDIUM",
  entryZone: null,
  entryPositionPct: null,
  sellRatioPct: null,
  targetPrice: null,
  stopPrice: null,
  invalidationPrice: null,
  expectedHoldingMinutes: null,
  rationale: "테스트 홀드",
  riskNotes: [],
});

/** 워밍업 미달(softMinBars 미만) 평탄 분봉 — 신호는 HOLD, 레벨 산출은 안전하게 동작. */
function candles(n: number): StockMinuteCandle[] {
  return Array.from({ length: n }, (_, i) => ({
    date: `2026-07-09T${String(9 + Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}`,
    open: 10_000,
    high: 10_050,
    low: 9_950,
    close: 10_000,
    volume: 1_000,
  }));
}

/** 포지션 보유 입력 — preGate 의 "무포지션·HOLD 지속" 스킵을 피해 LLM 경로로 들어간다. */
function input() {
  return {
    ticker: "005930",
    name: "삼성전자",
    minuteCandles: candles(10),
    timeframe: 5,
    tickIntervalMinutes: 5,
    dailyRegime: 0 as const,
    price: 10_000,
    nowHhmm: "10:00",
    position: {
      avgEntryPrice: 9_900,
      quantity: 10,
      unrealizedPnlPct: 1,
      heldMinutes: 10,
      allocationPct: 20,
    },
    previousDecision: null,
    dailyLossKill: false,
    riskMode: "balanced" as const,
    maxPositionPct: 50,
    provider: "claude" as const,
    abortSignal: new AbortController().signal,
  };
}

beforeEach(() => {
  mockInvoke.mockReset();
});

describe("agentDiagnostics — 실패 관측성 (PR-0)", () => {
  it("AC-1: 양 에이전트 빈 응답 → 폴백 + empty 진단(judge 2회 시도·usage 보존·원문 없음)", async () => {
    mockInvoke.mockResolvedValue({ text: "", usage: usage() });

    const { decision, intraday } = await decideIntradayWithCli(input());

    expect(intraday.source).toBe("intraday-fallback");
    // PR-3a: judge 실패 폴백은 신규 진입 금지(보유 관리만) — 사유 문구도 함께 교체.
    expect(decision.gateAdjustments).toContain("AI 판단 응답 실패 — 신규 진입 금지(보유 관리만)");
    expect(decision.agentDiagnostics?.analyst).toMatchObject({ failureKind: "empty", attempts: 1 });
    expect(decision.agentDiagnostics?.judge).toMatchObject({ failureKind: "empty", attempts: 2 });
    // 실패 시도의 usage 유실 수정 — 진단에 남는다.
    expect(decision.agentDiagnostics?.judge?.usage?.measured).toBe(true);
    expect(decision.agentDiagnostics?.judge?.rawTextHead).toBeUndefined();
    // judgeModel 은 "판단을 내린 모델" 의미 유지 — 실패 틱엔 미기록.
    expect(decision.judgeModel).toBeUndefined();
  });

  it("판단가 타임아웃 예외 → timeout 진단 + errorMessage 기록", async () => {
    const timeoutErr = Object.assign(new Error("에이전트 타임아웃 (25초 초과)"), {
      name: "TimeoutError",
    });
    mockInvoke
      .mockResolvedValueOnce({ text: "분석 노트", usage: usage() }) // ① 분석가 성공
      .mockRejectedValueOnce(timeoutErr)
      .mockRejectedValueOnce(timeoutErr);

    const { decision, intraday } = await decideIntradayWithCli(input());

    expect(intraday.source).toBe("intraday-fallback");
    expect(decision.agentDiagnostics?.analyst).toBeUndefined(); // 분석가는 성공 — 진단 없음
    expect(decision.agentDiagnostics?.judge).toMatchObject({ failureKind: "timeout", attempts: 2 });
    expect(decision.agentDiagnostics?.judge?.errorMessage).toContain("TimeoutError");
  });

  it("AC-2: 비-JSON 응답 → parse 진단 + 원문 앞 2KB 보존(초과분 절단)", async () => {
    const garbage = `판단은요, 지금은 관망이 맞습니다. ${"상세근거 ".repeat(600)}`; // > 2048자, JSON 아님
    mockInvoke
      .mockResolvedValueOnce({ text: "분석 노트", usage: usage() })
      .mockResolvedValueOnce({ text: garbage, usage: usage() })
      .mockResolvedValueOnce({ text: garbage, usage: usage() });

    const { decision } = await decideIntradayWithCli(input());

    const judge = decision.agentDiagnostics?.judge;
    expect(judge?.failureKind).toBe("parse");
    expect(judge?.rawTextHead?.length).toBe(2048);
    expect(judge?.rawTextHead?.startsWith("판단은요")).toBe(true);
  });

  it("AC-3: 1차 파싱 실패 → 2차 성공 = 정상 결정 + recovered 진단 + 원문 보존 + judgeModel 기록", async () => {
    mockInvoke
      .mockResolvedValueOnce({ text: "분석 노트", usage: usage() })
      .mockResolvedValueOnce({ text: "이건 JSON 아님 (깨진 응답)", usage: usage() })
      .mockResolvedValueOnce({ text: VALID_JUDGE_JSON, usage: usage() });

    const { decision, intraday } = await decideIntradayWithCli(input());

    expect(intraday.source).toBe("intraday-cli");
    expect(intraday.rationale).toBe("테스트 홀드");
    expect(decision.judgeModel).toBeDefined(); // 성공했으니 기록
    expect(decision.agentDiagnostics?.judge).toMatchObject({
      failureKind: "parse",
      attempts: 2,
      recovered: true,
    });
    expect(decision.agentDiagnostics?.judge?.rawTextHead).toContain("깨진 응답");
  });

  it("재시도 병합 — parse(원문) 후 empty 실패여도 앞선 원문이 이월 보존된다", async () => {
    mockInvoke
      .mockResolvedValueOnce({ text: "", usage: usage() }) // ① 분석가 빈 응답
      .mockResolvedValueOnce({ text: "not-json 원문입니다", usage: usage() }) // judge 1차 parse
      .mockResolvedValueOnce({ text: "", usage: usage() }); // judge 2차 empty

    const { decision, intraday } = await decideIntradayWithCli(input());

    expect(intraday.source).toBe("intraday-fallback");
    const judge = decision.agentDiagnostics?.judge;
    expect(judge?.failureKind).toBe("empty"); // 마지막 실패 기준
    expect(judge?.attempts).toBe(2);
    expect(judge?.rawTextHead).toContain("not-json"); // 이월 보존
  });

  it("AC-4: 전부 성공 → agentDiagnostics 미기록(행동·payload 무변경)", async () => {
    mockInvoke
      .mockResolvedValueOnce({ text: "분석 노트", usage: usage() })
      .mockResolvedValueOnce({ text: VALID_JUDGE_JSON, usage: usage() });

    const { decision, intraday } = await decideIntradayWithCli(input());

    expect(intraday.source).toBe("intraday-cli");
    expect(decision.agentDiagnostics).toBeUndefined();
    expect(decision.judgeUsage?.measured).toBe(true);
    expect(decision.analystNote).toBe("분석 노트");
    // v1 레거시 응답 — 근사 합성 확신(HOLD→50) + 스키마 마커가 payload 에 영속(PR-3a).
    expect(decision.judgeSchema).toBe("v1");
    expect(decision.convictionScore).toBe(50);
  });
});

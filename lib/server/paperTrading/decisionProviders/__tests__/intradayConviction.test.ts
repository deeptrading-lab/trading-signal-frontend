/**
 * PR-3a 플로우 테스트 — 확신 점수(convictionScore) 컷이 실제 판단 파이프라인에서 거래를
 * 만들고, judge 실패 폴백은 신규 진입을 못 하는지(AC-11) CLI 스텁으로 end-to-end 검증.
 *
 * 배경: judge LLM 942회 실행 실질 100% HOLD + 실제 체결 8건 전부 폴백 발생(전수 감사).
 * 점수화 후엔 "AI 확신 → 결정론 컷 → 체결", "AI 실패 → 보유 관리만"으로 뒤집혀야 한다.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { StockMinuteCandle } from "@/lib/api/kis/types";
import type { SignalResult } from "@/lib/types/signal";
import type { PaperTradingTick } from "@/lib/types/paperTrading/paperTrading";

vi.mock("@/lib/server/ai/agentCli", () => ({
  invokeAgentCliStream: vi.fn(),
}));
vi.mock("@/lib/api/toss/warnings", () => ({
  fetchActiveWarnings: vi.fn(async () => []),
}));
// 시그널만 스텁(레벨·컨텍스트·프로파일은 실물) — "신호 BUY 인데 judge 실패" 시나리오 구성용.
vi.mock("@/lib/signal/intradayProfile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/signal/intradayProfile")>();
  return { ...actual, evaluateIntradaySignal: vi.fn() };
});

import { decideIntradayWithCli, buildIntradayLevels, toPaperTradingDecision } from "../intradayCli";
import {
  buildPreviousEcho,
  ticksSinceLastExit,
} from "@/lib/server/paperTrading/intradayTickDecision";
import { invokeAgentCliStream } from "@/lib/server/ai/agentCli";
import { evaluateIntradaySignal } from "@/lib/signal/intradayProfile";

const mockInvoke = vi.mocked(invokeAgentCliStream);
const mockSignal = vi.mocked(evaluateIntradaySignal);

function sig(over: Partial<SignalResult> = {}): SignalResult {
  return {
    action: "BUY",
    score: 70,
    confidence: 0.7,
    axes: [],
    asOf: "2026-07-09T10:00",
    warmupOk: true,
    limitedData: false,
    bars: 100,
    regime: 0,
    ...over,
  };
}

/**
 * 평탄 분봉 30개 — 구조 barrier 미확보 → ATR 폴백(TR=100 → TP +3%/SL −1.5%, 손익비 정확히 2.0).
 * 폴백 BUY 가 가능한(rrr≥1.5) 컨텍스트를 결정론으로 보장한다(테스트 전제 가드로 재확인).
 */
function candles(n = 30): StockMinuteCandle[] {
  return Array.from({ length: n }, (_, i) => ({
    date: `2026-07-09T${String(9 + Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}`,
    open: 10_000,
    high: 10_050,
    low: 9_950,
    close: 10_000,
    volume: 1_000,
  }));
}

const POSITION = {
  avgEntryPrice: 9_900,
  quantity: 10,
  unrealizedPnlPct: 1,
  heldMinutes: 10,
  allocationPct: 20,
};

function input(over: Partial<Parameters<typeof decideIntradayWithCli>[0]> = {}) {
  return {
    ticker: "005930",
    name: "삼성전자",
    minuteCandles: candles(),
    timeframe: 5,
    tickIntervalMinutes: 5,
    dailyRegime: 0 as const,
    price: 10_000,
    nowHhmm: "10:00",
    position: null,
    previousDecision: null,
    dailyLossKill: false,
    riskMode: "balanced" as const,
    maxPositionPct: 50,
    provider: "claude" as const,
    abortSignal: new AbortController().signal,
    ...over,
  };
}

const usage = {
  inputTokens: 100,
  outputTokens: 50,
  cacheCreationInputTokens: null,
  cacheReadInputTokens: null,
  costUsd: null,
  model: "stub-model",
  measured: true,
};

/** analyst 1회 + judge 1회(v2 점수 응답) 성공 시퀀스. */
function stubJudgeV2(convictionScore: number) {
  mockInvoke
    .mockResolvedValueOnce({ text: "분석 노트", usage })
    .mockResolvedValueOnce({
      text: JSON.stringify({
        convictionScore,
        targetPrice: 10_300,
        stopPrice: 9_850,
        invalidationPrice: 9_850,
        expectedHoldingMinutes: 30,
        rationale: "점수 플로우 테스트.",
        riskNotes: [],
      }),
      usage,
    });
}

beforeEach(() => {
  mockInvoke.mockReset();
  mockSignal.mockReset();
  mockSignal.mockReturnValue(sig());
});

describe("전제 가드 — 평탄 분봉 픽스처는 ATR 폴백 손익비 2.0", () => {
  it("buildIntradayLevels: tpSource=atr, rrr=2.0 (폴백 BUY 가능 컨텍스트)", () => {
    const lv = buildIntradayLevels(candles(), 10_000, 5);
    expect(lv.tpSource).toBe("atr");
    expect(lv.rrr).toBeCloseTo(2.0, 5);
  });
});

describe("AC-11 — judge 실패 폴백은 신규 진입 금지", () => {
  it("신호 BUY + 손익비 2.0 이어도 judge 빈 응답 ×2 → 최종 HOLD(매수 0) + 사유 기록", async () => {
    mockInvoke.mockResolvedValue({ text: "", usage }); // analyst·judge 전부 빈 응답

    const { decision, intraday } = await decideIntradayWithCli(input());

    expect(intraday.source).toBe("intraday-fallback");
    expect(intraday.action).toBe("HOLD"); // 종전엔 이 조합에서 폴백 BUY 가 체결됐다.
    expect(decision.action).toBe("HOLD");
    expect(decision.targetAllocations).toHaveLength(0);
    expect(decision.gateAdjustments).toContain("AI 판단 응답 실패 — 신규 진입 금지(보유 관리만)");
    // 전제 재확인 — 진입이 게이트(레짐·손익비) 때문이 아니라 "실패 금지" 때문임을 스냅샷으로 증명.
    expect(decision.intradaySnapshot?.levels.rrr).toBeCloseTo(2.0, 5);
    expect(decision.intradaySnapshot?.signal.action).toBe("BUY");
  });

  it("보유 중 + 신호 SELL + judge 실패 → 보호 청산(SELL)은 유지된다", async () => {
    mockSignal.mockReturnValue(sig({ action: "SELL", score: 30 }));
    mockInvoke.mockResolvedValue({ text: "", usage });

    const { decision, intraday } = await decideIntradayWithCli(input({ position: POSITION }));

    expect(intraday.action).toBe("SELL");
    expect(decision.action).toBe("EXIT"); // 전량 정리
  });
});

describe("확신 컷 플로우 — v2 점수가 실제 BUY 를 만든다 (AC-10·AC-12)", () => {
  it("80점 → BUY 체결 경로(사이징 50%·enum 파생·컷 통과)", async () => {
    stubJudgeV2(80);

    const { decision, intraday } = await decideIntradayWithCli(input());

    expect(intraday.source).toBe("intraday-cli");
    expect(intraday.action).toBe("BUY");
    expect(intraday.convictionScore).toBe(80);
    expect(intraday.judgeSchema).toBe("v2");
    expect(intraday.confidence).toBe("HIGH"); // 표시 enum 파생 — 카피·Slack·ReadCard 호환
    expect(decision.action).toBe("BUY");
    expect(decision.targetAllocationPct).toBe(50); // 20+(80−65)×2=50, maxPositionPct 50 캡 내
    expect(decision.convictionScore).toBe(80); // payload 영속(다음 틱 에코 원장)
  });

  it("60점(컷 미달) → HOLD — 주문 없음", async () => {
    stubJudgeV2(60);

    const { decision, intraday } = await decideIntradayWithCli(input());

    expect(intraday.action).toBe("HOLD");
    expect(decision.targetAllocations).toHaveLength(0);
    expect(decision.convictionScore).toBe(60); // HOLD 여도 점수는 영속(58점 노이즈 방지)
  });

  it("80점 BUY 인데 LLM 이 TP/SL 을 비우면 구조/ATR 레벨로 백필(무방비 포지션 차단, 리뷰 F-1)", async () => {
    mockInvoke
      .mockResolvedValueOnce({ text: "분석 노트", usage })
      .mockResolvedValueOnce({
        text: JSON.stringify({
          convictionScore: 80,
          targetPrice: null,
          stopPrice: null,
          invalidationPrice: null,
          expectedHoldingMinutes: 30,
          rationale: "레벨 누락 응답.",
          riskNotes: [],
        }),
        usage,
      });

    const { decision, intraday } = await decideIntradayWithCli(input());

    // 평탄 픽스처의 ATR 폴백 레벨(TP 10,300 / SL 9,850)로 백필 — forced-exit 트리거 확보.
    expect(intraday.action).toBe("BUY");
    expect(intraday.targetPrice).toBe(10_300);
    expect(intraday.stopPrice).toBe(9_850);
    expect(decision.invalidationPrice).toBe(9_850);
    expect(decision.targetPrice).toBe(10_300);
  });
});

describe("재진입 쿨다운 플로우 (PRD §9 q2)", () => {
  it("청산 1틱 뒤(기본 컷 2틱 미만) 80점 BUY → HOLD 강등 + 쿨다운 사유", async () => {
    stubJudgeV2(80);

    const { decision, intraday } = await decideIntradayWithCli(input({ ticksSinceLastExit: 1 }));

    expect(intraday.action).toBe("HOLD");
    expect(decision.gateAdjustments?.join()).toContain("재진입 쿨다운");
  });

  it("청산 2틱 경과(쿨다운 충족) → BUY 허용", async () => {
    stubJudgeV2(80);

    const { intraday } = await decideIntradayWithCli(input({ ticksSinceLastExit: 2 }));

    expect(intraday.action).toBe("BUY");
  });

  it("청산 이력 없음(null) → 쿨다운 미적용", async () => {
    stubJudgeV2(80);

    const { intraday } = await decideIntradayWithCli(input({ ticksSinceLastExit: null }));

    expect(intraday.action).toBe("BUY");
  });
});

// ─── 에코·쿨다운 입력 헬퍼 (intradayTickDecision, 순수) ──────────────────────

function tick(over: Partial<PaperTradingTick>): PaperTradingTick {
  return { orders: [], ...over } as PaperTradingTick;
}

function sellOrder(ticker: string) {
  return { ticker, name: ticker, side: "SELL" as const, quantity: 1, price: 10_000, notional: 10_000, reason: "" };
}

describe("conviction 에코 라운드트립 — toPaperTradingDecision → buildPreviousEcho", () => {
  it("58점 HOLD 가 payload 를 거쳐 다음 틱 에코에 점수로 살아온다", () => {
    const decision = toPaperTradingDecision(
      {
        action: "HOLD",
        confidence: "LOW",
        entryZone: null,
        entryPositionPct: null,
        sellRatioPct: null,
        targetPrice: 10_300,
        stopPrice: null,
        invalidationPrice: null,
        expectedHoldingMinutes: null,
        rationale: "거의 매수.",
        riskNotes: [],
        convictionScore: 58,
        judgeSchema: "v2",
        basePrice: 10_000,
        rrr: 2,
        signal: { score: 55, action: "HOLD", confidence: 0.5, regime: 0, asOf: "2026-07-09T10:00", axes: [] },
        source: "intraday-cli",
        gateAdjustments: [],
      },
      { ticker: "005930", name: "삼성전자", position: null, riskMode: "balanced", maxPositionPct: 50 },
    );
    expect(decision.convictionScore).toBe(58);

    const echo = buildPreviousEcho([tick({ decision })]);
    expect(echo?.convictionScore).toBe(58);
    expect(echo?.action).toBe("HOLD");
  });

  it("구 틱(점수 미기록) → 에코 convictionScore=null (프롬프트 무주입 폴백)", () => {
    const decision = toPaperTradingDecision(
      {
        action: "HOLD",
        confidence: "LOW",
        entryZone: null,
        entryPositionPct: null,
        sellRatioPct: null,
        targetPrice: null,
        stopPrice: null,
        invalidationPrice: null,
        expectedHoldingMinutes: null,
        rationale: "구 틱.",
        riskNotes: [],
        basePrice: 10_000,
        rrr: null,
        signal: { score: 50, action: "HOLD", confidence: 0.5, regime: 0, asOf: "2026-07-09T10:00", axes: [] },
        source: "intraday-fallback",
        gateAdjustments: [],
      },
      { ticker: "005930", name: "삼성전자", position: null, riskMode: "balanced", maxPositionPct: 50 },
    );
    const echo = buildPreviousEcho([tick({ decision })]);
    expect(echo?.convictionScore).toBeNull();
  });
});

describe("ticksSinceLastExit — 재진입 쿨다운 입력", () => {
  const t = (orders: ReturnType<typeof sellOrder>[]) => tick({ orders } as Partial<PaperTradingTick>);

  it("직전 틱에 SELL 체결 → 0", () => {
    expect(ticksSinceLastExit([t([]), t([sellOrder("005930")])], "005930")).toBe(0);
  });
  it("2틱 전 SELL → 1", () => {
    expect(ticksSinceLastExit([t([sellOrder("005930")]), t([])], "005930")).toBe(1);
  });
  it("청산 이력 없음/타 종목 SELL → null", () => {
    expect(ticksSinceLastExit([t([]), t([])], "005930")).toBeNull();
    expect(ticksSinceLastExit([t([sellOrder("000660")])], "005930")).toBeNull();
    expect(ticksSinceLastExit([], "005930")).toBeNull();
  });
});

// ─── env 컷 오버라이드 (PR-4 무코드 튜닝 경로) ────────────────────────────────

describe("확신 컷 env 오버라이드", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("INTRADAY_BUY_CONVICTION_MIN=70 → 65 는 HOLD, 70 부터 BUY", async () => {
    vi.stubEnv("INTRADAY_BUY_CONVICTION_MIN", "70");
    vi.resetModules();
    const fresh = await import("../intradayCli");
    expect(fresh.deriveActionFromConviction(65, false)).toBe("HOLD");
    expect(fresh.deriveActionFromConviction(70, false)).toBe("BUY");
    // 사이징 기준점도 env 컷을 따라 이동(70→20%).
    expect(fresh.convictionEntryPositionPct(70)).toBe(20);
  });

  it("범위 밖 env 는 안전 범위로 clamp(40 → 하한 50)", async () => {
    vi.stubEnv("INTRADAY_BUY_CONVICTION_MIN", "40");
    vi.resetModules();
    const fresh = await import("../intradayCli");
    expect(fresh.deriveActionFromConviction(50, false)).toBe("BUY"); // clamp 후 컷 50
    expect(fresh.deriveActionFromConviction(49, false)).toBe("HOLD");
  });
});

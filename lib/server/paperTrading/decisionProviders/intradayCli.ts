/**
 * 단타 경량 에이전트 그룹 decision provider (intraday-scalping-agent §3-4).
 *
 * 흐름: 결정론 시그널·레벨 계산 → 룰 사전게이트 → ①흐름·세력 분석가(CLI) → ②진입·청산 판단가(CLI,
 * JSON) → 룰 사후게이트(clamp/demote) → IntradayDecision → PaperTradingDecision 어댑터.
 * 전부 로컬 CLI(구독, API 토큰 미사용). 실패/타임아웃·Vercel 은 결정론 폴백(fail-soft).
 */

import { invokeAgentCliStream } from "@/lib/server/ai/agentCli";
import { parseLooseJson } from "@/lib/server/ai/parseLooseJson";
import { evaluateIntradaySignal, resolveIntradayProfile } from "@/lib/signal/intradayProfile";
import { structureBarrierAt } from "@/lib/signal/levels/structureBarrier";
import {
  FLOW_ANALYST_SYSTEM,
  JUDGE_SYSTEM,
  buildFlowAnalystUser,
  buildJudgeUser,
} from "@/lib/prompts/intraday/agents";
import type { StockMinuteCandle } from "@/lib/api/kis/types";
import type { RuleDirection, SignalResult } from "@/lib/types/signal";
import type { AIAnalysisProvider, DecisionSignal } from "@/lib/types/stock/aiAnalysis";
import type {
  PaperTradingDecision,
  PaperTradingRiskMode,
} from "@/lib/types/paperTrading/paperTrading";
import type {
  IntradayContext,
  IntradayDecision,
  IntradayDecisionEcho,
  IntradayDecisionLlm,
  IntradayLevels,
  IntradayPositionView,
} from "@/lib/types/intraday/intradayDecision";

const AGENT_TIMEOUT_MS = 25_000;
const MIN_RRR = 1.5;
const NO_NEW_ENTRY_AFTER = "15:00"; // 이후 신규 진입 금지
const MAX_TARGET_PCT = 5; // 단타 과욕 캡

/**
 * 분봉 에이전트 effort — **Haiku 4.5·Sonnet 4.5 는 effort 파라미터 미지원**(API 거부)이라 생략한다.
 * 그 외(Opus 4.5+ / Sonnet 4.6 / Fable)는 빠른 판정을 위해 "low". 모델 미상이면 안전하게 생략한다.
 * model 미지정 시 invokeAgentCliStream 이 CLAUDE_CLI_MODEL 로 폴백하므로 그 값으로 판정.
 */
export function intradayEffort(model: string | undefined): "low" | undefined {
  const effective = (model ?? process.env.CLAUDE_CLI_MODEL ?? "").toLowerCase();
  if (!effective) return undefined;
  if (effective.includes("haiku")) return undefined;
  if (effective.includes("sonnet-4-5")) return undefined;
  return "low";
}

export interface IntradayCliInput {
  ticker: string;
  name: string;
  /** 오름차순 분봉(date="YYYY-MM-DDTHH:mm"). */
  minuteCandles: StockMinuteCandle[];
  timeframe: number;
  /** 일봉 레짐(-1/0/1) — 분봉 평가 regimeOverride. */
  dailyRegime: RuleDirection;
  /** 현재가(원). */
  price: number;
  /** 장중 시각 "HH:mm"(KST). */
  nowHhmm: string;
  position: IntradayPositionView | null;
  previousDecision: IntradayDecisionEcho | null;
  /** 일일 손실 한도 도달(스케줄러/세션) — 신규 진입 차단. */
  dailyLossKill: boolean;
  riskMode: PaperTradingRiskMode;
  maxPositionPct: number;
  provider?: AIAnalysisProvider;
  abortSignal: AbortSignal;
  /**
   * 사전 게이트의 "변화 없음 → LLM 스킵" 최적화를 무시하고 항상 에이전트를 호출한다.
   * on-demand 판단 카드(사람이 직접 요청)는 HOLD 라도 분석가 서사가 필요하므로 true.
   * 주기 틱 루프는 false(비용 절감 유지).
   */
  forceAgents?: boolean;
}

export interface IntradayProviderResult {
  /** tick.decision 용 — mock 호환 PaperTradingDecision. */
  decision: PaperTradingDecision;
  /** 절대가 단타 결정 — 청산(익절/손절) + 표시용. */
  intraday: IntradayDecision;
}

// ─── 결정론 보조 ──────────────────────────────────────────────────────────────

/** SignalResult → 표시·재현용 압축본. */
function toDecisionSignal(s: SignalResult): DecisionSignal {
  return {
    score: s.score,
    action: s.action,
    confidence: s.confidence,
    regime: s.regime,
    asOf: s.asOf,
    axes: s.axes.map((a) => ({ axis: a.axis, score: a.score, direction: a.direction })),
  };
}

/** 구조 barrier + 최근 룩백 박스로 정량 레벨 산출. */
export function buildIntradayLevels(
  minuteCandles: StockMinuteCandle[],
  lastClose: number,
  timeframe: number,
): IntradayLevels {
  const profile = resolveIntradayProfile(timeframe);
  const window = minuteCandles.slice(-profile.structureLookback);
  const boxHigh = window.length ? Math.max(...window.map((c) => c.high)) : null;
  const boxLow = window.length ? Math.min(...window.map((c) => c.low)) : null;

  const barrier = structureBarrierAt(minuteCandles, lastClose, 1, {
    lookbackBars: profile.structureLookback,
    maStopPeriod: 20,
    minRRR: MIN_RRR,
  });

  const tpPrice = barrier?.tpPrice ?? null;
  const slPrice = barrier?.slPrice ?? null;
  const rrr =
    tpPrice != null && slPrice != null && lastClose - slPrice > 0
      ? (tpPrice - lastClose) / (lastClose - slPrice)
      : null;

  return {
    lastClose,
    boxHigh,
    boxLow,
    tpPrice,
    slPrice,
    tpSource: barrier?.tpSource ?? null,
    slSource: barrier?.slSource ?? null,
    rrr,
    tpPct: tpPrice != null ? ((tpPrice - lastClose) / lastClose) * 100 : null,
    slPct: slPrice != null ? ((slPrice - lastClose) / lastClose) * 100 : null,
  };
}

function buildRecentBars(minuteCandles: StockMinuteCandle[], n = 5) {
  const tail = minuteCandles.slice(-n);
  return tail.map((c, i) => {
    const prev = i > 0 ? tail[i - 1].close : c.close;
    return { t: c.date, close: c.close, changePct: prev > 0 ? ((c.close - prev) / prev) * 100 : 0 };
  });
}

function buildContext(
  input: IntradayCliInput,
  signal: DecisionSignal,
  levels: IntradayLevels,
): IntradayContext {
  return {
    ticker: input.ticker,
    name: input.name,
    asOf: signal.asOf,
    price: input.price,
    timeframe: input.timeframe,
    signal,
    levels,
    recentBars: buildRecentBars(input.minuteCandles),
    position: input.position,
    previousDecision: input.previousDecision,
    nowHhmm: input.nowHhmm,
  };
}

// ─── 룰 게이트 (순수, 테스트 대상) ────────────────────────────────────────────

export interface PreGate {
  callLlm: boolean;
  noNewEntry: boolean;
  reason?: string;
}

/** 사전 게이트 — LLM 호출 전 룰. 15:00+·일일손실=신규진입 금지, 변화없음=LLM 스킵. */
export function evaluatePreGate(ctx: IntradayContext, dailyLossKill: boolean): PreGate {
  const noNewEntry = ctx.nowHhmm >= NO_NEW_ENTRY_AFTER || dailyLossKill;
  const flat = !ctx.position;

  // 무포지션 + 분봉 HOLD + 직전도 HOLD → 변화 없음, LLM 호출 생략(비용 절감).
  if (flat && ctx.signal.action === "HOLD" && (ctx.previousDecision?.action ?? "HOLD") === "HOLD") {
    return { callLlm: false, noNewEntry, reason: "변화 없음(무포지션·HOLD 지속)" };
  }
  return { callLlm: true, noNewEntry };
}

/** 사후 게이트 — LLM 결정을 룰로 clamp/demote(환각 진입·과욕·역추세·손실확대 차단). */
export function applyPostGate(
  llm: IntradayDecisionLlm,
  ctx: IntradayContext,
  noNewEntry: boolean,
): { decision: IntradayDecisionLlm; adjustments: string[] } {
  const adj: string[] = [];
  const d: IntradayDecisionLlm = { ...llm };
  const lv = ctx.levels;

  const demoteToHold = (reason: string) => {
    if (d.action === "BUY") {
      d.action = "HOLD";
      d.entryZone = null;
      adj.push(reason);
    }
  };

  // 1. 15:00+/일일손실: 신규 BUY 차단.
  if (noNewEntry) demoteToHold("장막판/일일손실: 신규 진입 차단 → HOLD");
  // 2. 약세 일봉 레짐 veto.
  if (ctx.signal.regime === -1) demoteToHold("약세 레짐 veto: BUY → HOLD");
  // 3. RRR<1.5: 진입 보류.
  if (d.action === "BUY" && (lv.rrr == null || lv.rrr < MIN_RRR)) demoteToHold("RRR<1.5: 진입 보류 → HOLD");

  // 4. TP/SL 을 구조 barrier 밖으로 못 넓힘 + 과욕(+5%) 캡.
  if (d.action === "BUY") {
    if (lv.tpPrice != null && d.targetPrice != null && d.targetPrice > lv.tpPrice) {
      d.targetPrice = lv.tpPrice;
      adj.push("목표가 구조 TP 로 제한(과욕 차단)");
    }
    if (lv.slPrice != null && d.stopPrice != null && d.stopPrice < lv.slPrice) {
      d.stopPrice = lv.slPrice;
      adj.push("손절가 구조 SL 로 제한(손실 확대 차단)");
    }
    const cap = ctx.price * (1 + MAX_TARGET_PCT / 100);
    if (d.targetPrice != null && d.targetPrice > cap) {
      d.targetPrice = Math.round(cap);
      adj.push(`목표가 +${MAX_TARGET_PCT}% 캡`);
    }
  }
  return { decision: d, adjustments: adj };
}

/** 결정론 폴백 — CLI 실패·게이트 스킵 시 시그널에서 보수적 결정 파생. */
export function deriveFromSignal(ctx: IntradayContext, noNewEntry: boolean): IntradayDecisionLlm {
  const lv = ctx.levels;
  const canBuy =
    ctx.signal.action === "BUY" &&
    !noNewEntry &&
    ctx.signal.regime !== -1 &&
    lv.rrr != null &&
    lv.rrr >= MIN_RRR;

  if (canBuy) {
    return {
      action: "BUY",
      confidence: "LOW",
      entryZone: { low: Math.round(ctx.price * 0.999), high: Math.round(ctx.price * 1.002) },
      targetPrice: lv.tpPrice,
      stopPrice: lv.slPrice,
      invalidationPrice: lv.slPrice,
      expectedHoldingMinutes: 60,
      rationale: "결정론 폴백 — 분봉 BUY 시그널 + 구조 TP/SL(RRR 충족) 기준 진입.",
      riskNotes: ["에이전트 미응답으로 결정론 신호 사용."],
    };
  }

  // 포지션이 있고 시그널 SELL 이면 청산.
  if (ctx.position && ctx.signal.action === "SELL") {
    return {
      action: "SELL",
      confidence: "LOW",
      entryZone: null,
      targetPrice: null,
      stopPrice: null,
      invalidationPrice: null,
      expectedHoldingMinutes: 0,
      rationale: "결정론 폴백 — 분봉 SELL 시그널로 보유분 정리.",
      riskNotes: [],
    };
  }

  return {
    action: "HOLD",
    confidence: "LOW",
    entryZone: null,
    targetPrice: ctx.previousDecision?.targetPrice ?? null,
    stopPrice: ctx.previousDecision?.stopPrice ?? null,
    invalidationPrice: ctx.previousDecision?.invalidationPrice ?? null,
    expectedHoldingMinutes: null,
    rationale: "결정론 폴백 — 명확한 셋업 없음, 관망.",
    riskNotes: [],
  };
}

// ─── LLM 응답 정규화 ──────────────────────────────────────────────────────────

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function normalizeLlm(parsed: unknown): IntradayDecisionLlm | null {
  if (!parsed || typeof parsed !== "object") return null;
  const d = parsed as Record<string, unknown>;
  const action = d.action;
  if (action !== "BUY" && action !== "HOLD" && action !== "SELL") return null;

  const zone = d.entryZone as Record<string, unknown> | null | undefined;
  const entryZone =
    zone && num(zone.low) != null && num(zone.high) != null
      ? { low: num(zone.low)!, high: num(zone.high)! }
      : null;

  return {
    action,
    confidence: (["HIGH", "MEDIUM", "LOW"].includes(d.confidence as string)
      ? d.confidence
      : "MEDIUM") as IntradayDecisionLlm["confidence"],
    entryZone,
    targetPrice: num(d.targetPrice),
    stopPrice: num(d.stopPrice),
    invalidationPrice: num(d.invalidationPrice),
    expectedHoldingMinutes: num(d.expectedHoldingMinutes),
    rationale: typeof d.rationale === "string" ? d.rationale : "",
    riskNotes: Array.isArray(d.riskNotes)
      ? d.riskNotes.filter((x): x is string => typeof x === "string").slice(0, 3)
      : [],
  };
}

// ─── PaperTradingDecision 어댑터 ──────────────────────────────────────────────

function riskTargetPct(riskMode: PaperTradingRiskMode): number {
  if (riskMode === "conservative") return 40;
  if (riskMode === "aggressive") return 80;
  return 60;
}

function toPaperTradingDecision(
  intraday: IntradayDecision,
  input: IntradayCliInput,
): PaperTradingDecision {
  const { action } = intraday;
  // 단타 단일 종목: BUY→목표비중 진입, SELL→전량 청산, HOLD→유지.
  const targetPct =
    action === "BUY"
      ? Math.min(input.maxPositionPct, riskTargetPct(input.riskMode))
      : action === "SELL"
        ? 0
        : input.position
          ? input.position.quantity > 0
            ? Math.min(input.maxPositionPct, riskTargetPct(input.riskMode))
            : 0
          : 0;

  const ptAction = action === "SELL" ? (input.position ? "EXIT" : "SELL") : action;

  return {
    action: ptAction,
    targetAllocationPct: targetPct,
    targetAllocations: [
      {
        ticker: input.ticker,
        name: input.name,
        targetAllocationPct: targetPct,
        rationale: intraday.rationale,
      },
    ],
    confidence: intraday.confidence,
    rationale: intraday.rationale,
    riskNotes: intraday.riskNotes,
    expectedHoldingMinutes: intraday.expectedHoldingMinutes ?? undefined,
    // 청산 트리거(virtualExecution forced-exit): 손절가 우선, 없으면 무효화가.
    invalidationPrice: intraday.stopPrice ?? intraday.invalidationPrice ?? null,
    targetPrice: intraday.targetPrice ?? null,
    source: "cli-agent",
  };
}

// ─── 공개 진입점 ──────────────────────────────────────────────────────────────

export async function decideIntradayWithCli(
  input: IntradayCliInput,
): Promise<IntradayProviderResult> {
  const sig = evaluateIntradaySignal(input.minuteCandles, input.timeframe, input.dailyRegime);
  const decisionSignal = toDecisionSignal(sig);
  const lastClose = input.minuteCandles.at(-1)?.close ?? input.price;
  const levels = buildIntradayLevels(input.minuteCandles, lastClose, input.timeframe);
  const ctx = buildContext(input, decisionSignal, levels);

  const finalize = (
    llm: IntradayDecisionLlm,
    source: IntradayDecision["source"],
    analystNote: string | undefined,
    gateAdjustments: string[],
  ): IntradayProviderResult => {
    const intraday: IntradayDecision = {
      ...llm,
      basePrice: lastClose,
      rrr: levels.rrr,
      signal: decisionSignal,
      source,
      analystNote,
      gateAdjustments,
    };
    return { decision: toPaperTradingDecision(intraday, input), intraday };
  };

  // 사전 게이트. (forceAgents=on-demand 판단 카드는 변화없음 스킵을 무시하고 항상 에이전트 호출)
  const pre = evaluatePreGate(ctx, input.dailyLossKill);
  if (!pre.callLlm && !input.forceAgents) {
    return finalize(deriveFromSignal(ctx, pre.noNewEntry), "intraday-fallback", undefined, [
      pre.reason ?? "사전 게이트 스킵",
    ]);
  }

  const provider: AIAnalysisProvider = input.provider ?? "claude";
  // 에이전트별 모델 분리 — 분석가(요약, 싸고 빠르게)와 판단가(필요 시 더 무겁게)를 따로 둔다.
  // 미설정 시 INTRADAY_MODEL, 그래도 없으면 invokeAgentCliStream 이 CLAUDE_CLI_MODEL 로 폴백.
  const analystModel = process.env.INTRADAY_ANALYST_MODEL ?? process.env.INTRADAY_MODEL;
  const judgeModel = process.env.INTRADAY_JUDGE_MODEL ?? process.env.INTRADAY_MODEL;

  // ① 흐름·세력 분석가 — 실패해도 진단 없이 ②로 진행(분석가는 보조).
  let analystNote = "";
  try {
    const r1 = await invokeAgentCliStream(
      provider,
      {
        systemPrompt: FLOW_ANALYST_SYSTEM,
        userPrompt: buildFlowAnalystUser(ctx),
        tools: [],
        timeoutMs: AGENT_TIMEOUT_MS,
        effort: intradayEffort(analystModel),
        model: analystModel,
      },
      input.abortSignal,
      () => {},
    );
    analystNote = r1.text.trim();
  } catch {
    analystNote = "";
  }

  // ② 진입·청산 판단가 — 실패/파싱불가 시 결정론 폴백.
  let llm: IntradayDecisionLlm | null = null;
  try {
    const r2 = await invokeAgentCliStream(
      provider,
      {
        systemPrompt: JUDGE_SYSTEM,
        userPrompt: buildJudgeUser(ctx, analystNote),
        tools: [],
        timeoutMs: AGENT_TIMEOUT_MS,
        effort: intradayEffort(judgeModel),
        model: judgeModel,
      },
      input.abortSignal,
      () => {},
    );
    llm = normalizeLlm(parseLooseJson(r2.text));
  } catch {
    llm = null;
  }

  if (!llm) {
    return finalize(deriveFromSignal(ctx, pre.noNewEntry), "intraday-fallback", analystNote, [
      "판단가 응답 실패 — 결정론 폴백",
    ]);
  }

  const gated = applyPostGate(llm, ctx, pre.noNewEntry);
  return finalize(gated.decision, "intraday-cli", analystNote, gated.adjustments);
}

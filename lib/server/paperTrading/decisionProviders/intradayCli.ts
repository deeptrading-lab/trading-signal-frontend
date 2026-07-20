/**
 * 단타 경량 에이전트 그룹 decision provider (intraday-scalping-agent §3-4).
 *
 * 흐름: 결정론 시그널·레벨 계산 → 룰 사전게이트 → ①흐름·세력 분석가(CLI) → ②판단가(CLI,
 * convictionScore 0~100 JSON) → 결정론 컷·사이징(action/비중 파생, PR-3a) → 룰 사후게이트
 * (clamp/demote) → IntradayDecision → PaperTradingDecision 어댑터.
 * 전부 로컬 CLI(구독, API 토큰 미사용). 실패/타임아웃·Vercel 은 결정론 폴백(fail-soft) —
 * 단, judge 실패 폴백은 신규 진입 불가(보유 관리만, AC-11).
 */

import { invokeAgentCliStream } from "@/lib/server/ai/agentCli";
import { parseLooseJson } from "@/lib/server/ai/parseLooseJson";
import { fetchActiveWarnings } from "@/lib/api/toss/warnings";
import { buildOrderFlowText } from "@/lib/server/paperTrading/orderFlowContext";
import { isEntryBlockingWarning } from "@/lib/copy/stock/warnings";
import { evaluateIntradaySignal, resolveIntradayProfile } from "@/lib/signal/intradayProfile";
import {
  extractIntradayFeatures,
  formatIntradayFeatures,
  type IntradayFeatureRead,
} from "@/lib/signal/intradayFeatures";
import { structureBarrierAt } from "@/lib/signal/levels/structureBarrier";
import { atrAt, ATR_FALLBACK_TP_MULT, ATR_FALLBACK_SL_MULT } from "@/lib/signal/levels/atr";
import {
  PAPER_TRADING_INTRADAY_BUY_CONVICTION_MIN,
  PAPER_TRADING_INTRADAY_SELL_CONVICTION_MAX,
  PAPER_TRADING_INTRADAY_REENTRY_COOLDOWN_TICKS,
} from "@/lib/server/paperTrading/constants";
import {
  FLOW_ANALYST_SYSTEM,
  JUDGE_SYSTEM,
  buildFlowAnalystUser,
  buildJudgeUser,
} from "@/lib/prompts/intraday/agents";
import type { StockMinuteCandle } from "@/lib/api/kis/types";
import type { RuleDirection, SignalResult } from "@/lib/types/signal";
import type { AgentUsage, AIAnalysisProvider, DecisionSignal } from "@/lib/types/stock/aiAnalysis";
import type {
  PaperTradingDecision,
  PaperTradingRiskMode,
} from "@/lib/types/paperTrading/paperTrading";
import type {
  IntradayAction,
  IntradayAgentDiagnostics,
  IntradayAgentFailureKind,
  IntradayConfidence,
  IntradayContext,
  IntradayDecision,
  IntradayDecisionEcho,
  IntradayDecisionLlm,
  IntradayLevels,
  IntradayPositionView,
  IntradaySnapshot,
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
  /** 판단 주기(분) — 세션 tickIntervalMinutes. 프롬프트 horizon 인지용. */
  tickIntervalMinutes: number;
  /** 일봉 레짐(-1/0/1) — 분봉 평가 regimeOverride. */
  dailyRegime: RuleDirection;
  /** 일봉 흐름 요약 텍스트(I1) — MACD/RSI/이평/위치. 프롬프트 주입용, 미주입 시 빈 문자열. */
  dailyContextText?: string;
  /** 현재가(원). */
  price: number;
  /** 장중 시각 "HH:mm"(KST). */
  nowHhmm: string;
  position: IntradayPositionView | null;
  previousDecision: IntradayDecisionEcho | null;
  /** 일일 손실 한도 도달(스케줄러/세션) — 신규 진입 차단. */
  dailyLossKill: boolean;
  /**
   * 마지막 청산(SELL 체결) 틱 이후 경과 틱 수 — 재진입 쿨다운 판정 입력(PR-3a).
   * `INTRADAY_REENTRY_COOLDOWN_TICKS` 미만이면 신규 BUY 를 차단한다(청산 직후 컷 경계
   * 진동으로 왕복비용 0.28% 를 반복 지불하는 churn 방지). null/미지정 = 청산 이력 없음
   * (on-demand read 등 세션 밖 호출 포함) → 쿨다운 미적용.
   */
  ticksSinceLastExit?: number | null;
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

/** 구조 barrier(+미확보 시 ATR 폴백) + 최근 룩백 박스로 정량 레벨 산출. */
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

  let tpPrice = barrier?.tpPrice ?? null;
  let slPrice = barrier?.slPrice ?? null;
  let tpSource: string | null = barrier?.tpSource ?? null;
  let slSource: string | null = barrier?.slSource ?? null;

  // 구조 barrier 미확보(매물대·스윙 부재 or RRR<1.5) → ATR 비대칭 폴백.
  // 전수 감사(2,199틱)에서 RRR null 77% 가 사후 게이트·폴백의 매수를 자동 봉쇄하던 갭
  // (PRD intraday-decision-overhaul PR-1a). 배수는 백테스트 best 파라미터를 label.ts 와
  // 공유(lib/signal/levels/atr.ts) — TP 3×ATR / SL 1.5×ATR = 손익비 정확히 2.0.
  if (!barrier && lastClose > 0) {
    const atr = atrAt(minuteCandles, minuteCandles.length - 1);
    if (atr != null && atr > 0) {
      tpPrice = lastClose + atr * ATR_FALLBACK_TP_MULT;
      slPrice = lastClose - atr * ATR_FALLBACK_SL_MULT;
      tpSource = "atr";
      slSource = "atr";
    }
  }

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
    tpSource,
    slSource,
    rrr,
    tpPct: tpPrice != null && lastClose > 0 ? ((tpPrice - lastClose) / lastClose) * 100 : null,
    slPct: slPrice != null && lastClose > 0 ? ((slPrice - lastClose) / lastClose) * 100 : null,
  };
}

function buildRecentBars(minuteCandles: StockMinuteCandle[], n = 5) {
  const tail = minuteCandles.slice(-n);
  return tail.map((c, i) => {
    const prev = i > 0 ? tail[i - 1].close : c.close;
    return { t: c.date, close: c.close, changePct: prev > 0 ? ((c.close - prev) / prev) * 100 : 0 };
  });
}

/**
 * 매수 관심 구조 이벤트 — 결정론 시그널(4축)이 늦게 반응해도 셋업 순간엔 AI 에 묻는다
 * (쌍바닥→돌파를 사전 게이트가 걸러버리던 커버리지 갭, 사용자 관찰 사례). 전고 돌파(기존)에
 * PR-3b 교차 이벤트 3종(VWAP 재탈환·오프닝 레인지 상단 돌파·거래량 z≥2)을 추가 — 전부 교차
 * 시맨틱(직전 마감봉에선 아니었고 이번 마감봉에서 처음 성립)이라 상태 지속 중 재발화하지
 * 않는다(AC-13). 동시 성립 시 " · " 로 결합해 스냅샷·프롬프트에 전부 남긴다.
 *
 * 약세 레짐이면 어차피 사후 게이트가 매수를 차단하므로 트리거로 치지 않는다. 이 이벤트는
 * evaluatePreGate 의 callLlm 스킵만 뚫는다 — noNewEntry(15:00+·손실킬·재진입 쿨다운)와
 * 시장경보·사후 게이트는 그대로다(경보 우회 금지).
 */
export function deriveStructureEvent(
  features: IntradayFeatureRead | null,
  regime: RuleDirection,
): string | null {
  if (!features || regime === -1) return null;
  const events: string[] = [];
  if (features.swing.highBroken) events.push("전고 돌파 진행");
  if (features.vwapReclaim) events.push("VWAP 재탈환");
  if (features.orBreakout) events.push("오프닝 레인지 상단 돌파");
  if (features.volumeZSurge) events.push("거래량 급증(z≥2)");
  return events.length > 0 ? events.join(" · ") : null;
}

function buildContext(
  input: IntradayCliInput,
  signal: DecisionSignal,
  levels: IntradayLevels,
): IntradayContext {
  // 캔들 미시구조(마감봉 꼬리·스윙·피보나치·박스) — 결정론 산출, 봉 부족 시 빈 문자열.
  const profile = resolveIntradayProfile(input.timeframe);
  const features = extractIntradayFeatures(
    input.minuteCandles,
    input.timeframe,
    profile.structureLookback,
  );
  const featuresText = formatIntradayFeatures(features);
  const structureEvent = deriveStructureEvent(features, signal.regime);
  return {
    ticker: input.ticker,
    name: input.name,
    asOf: signal.asOf,
    price: input.price,
    timeframe: input.timeframe,
    intervalMinutes: input.tickIntervalMinutes,
    signal,
    levels,
    recentBars: buildRecentBars(input.minuteCandles),
    position: input.position,
    previousDecision: input.previousDecision,
    nowHhmm: input.nowHhmm,
    featuresText,
    dailyContextText: input.dailyContextText,
    structureEvent,
  };
}

/**
 * 신규 진입을 차단할 거래소 시장경보(정리매매·투자위험)가 활성인가 — PRD intraday-warning-gate.
 * ctx.warnings 는 #205 에서 LLM 호출 시에만 채워진다(없으면 빈 배열 → false). 결정론 게이트와
 * 폴백이 공유해 두 경로 모두 차단한다.
 */
function hasEntryBlockingWarning(ctx: IntradayContext): boolean {
  return (ctx.warnings ?? []).some((w) => isEntryBlockingWarning(w.warningType));
}

// ─── 룰 게이트 (순수, 테스트 대상) ────────────────────────────────────────────

export interface PreGate {
  callLlm: boolean;
  noNewEntry: boolean;
  reason?: string;
}

/** 사전 게이트 — LLM 호출 전 룰. 15:00+·일일손실·재진입 쿨다운=신규진입 금지, 변화없음=LLM 스킵. */
export function evaluatePreGate(
  ctx: IntradayContext,
  dailyLossKill: boolean,
  reentryCooldown = false,
): PreGate {
  const noNewEntry = ctx.nowHhmm >= NO_NEW_ENTRY_AFTER || dailyLossKill || reentryCooldown;
  const flat = !ctx.position;

  // 무포지션 + 분봉 HOLD + 직전도 HOLD → 변화 없음, LLM 호출 생략(비용 절감).
  // 단, 구조 이벤트(전고 돌파 등)가 잡히면 신규 진입 가능 상태에 한해 AI 에 묻는다 —
  // 4축 점수가 아직 HOLD 여도 돌파 셋업은 다음 주기까지 기다리면 늦는다.
  // ⚠️ 스킵 조건에 `signal.action === "HOLD"` 를 유지하라 — 스킵 경로는 ctx.warnings 를 조회하지
  //    않으므로(비용 절감), deriveFromSignal 이 여기서 BUY 를 낼 수 있게 바뀌면 시장경보 게이트가
  //    우회된다(정리매매 종목 자동 진입). BUY 신호에서 스킵하려면 먼저 warnings 를 채워야 한다.
  if (flat && ctx.signal.action === "HOLD" && (ctx.previousDecision?.action ?? "HOLD") === "HOLD") {
    if (ctx.structureEvent && !noNewEntry) {
      return { callLlm: true, noNewEntry };
    }
    return { callLlm: false, noNewEntry, reason: "상황 변화 없음 — AI 호출 생략(포지션·신호 그대로)" };
  }
  return { callLlm: true, noNewEntry };
}

/** 사후 게이트 — LLM 결정을 룰로 clamp/demote(환각 진입·과욕·역추세·손실확대 차단). */
export function applyPostGate(
  llm: IntradayDecisionLlm,
  ctx: IntradayContext,
  noNewEntry: boolean,
  reentryCooldown = false,
): { decision: IntradayDecisionLlm; adjustments: string[] } {
  const adj: string[] = [];
  const d: IntradayDecisionLlm = { ...llm };
  const lv = ctx.levels;

  const demoteToHold = (reason: string) => {
    if (d.action === "BUY") {
      d.action = "HOLD";
      d.entryZone = null;
      d.entryPositionPct = null;
      adj.push(reason);
    }
  };

  // 0. 거래소 시장경보(정리매매·투자위험) — 신규 진입 하드 차단(가장 우선하는 안전핀).
  //    LLM 이 #205 프롬프트 주입을 무시하고 BUY 를 내도 자동 체결 루프가 진입하지 못하게 막는다.
  if (hasEntryBlockingWarning(ctx))
    demoteToHold("거래소 시장경보(정리매매·투자위험) 발효 — 신규 진입 차단 → 관망");
  // 1. 재진입 쿨다운 — 쿨다운도 noNewEntry 에 합산되지만, generic 문구(장 막판/일일손실)가
  //    실제 원인을 가리지 않도록 먼저 검사해 사유를 구분 기록한다(PR-3a).
  if (reentryCooldown)
    demoteToHold(
      `재진입 쿨다운 — 청산 후 ${PAPER_TRADING_INTRADAY_REENTRY_COOLDOWN_TICKS}틱 대기`,
    );
  // 2. 15:00+/일일손실: 신규 BUY 차단.
  if (noNewEntry) demoteToHold("장 막판(15:00 이후)이거나 일일 손실 한도 도달 — 신규 진입 차단 → 관망");
  // 3. 약세 일봉 레짐 veto.
  if (ctx.signal.regime === -1)
    demoteToHold("일봉 큰 흐름이 약세 — 하락 국면 역행 매수 차단 → 관망");
  // 4. 손익비(RRR)<1.5: 진입 보류.
  if (d.action === "BUY" && (lv.rrr == null || lv.rrr < MIN_RRR))
    demoteToHold("손익비 1.5 미만 — 먹을 공간 대비 손절 폭이 커서 진입 보류 → 관망");

  // 5. TP/SL 을 구조 barrier 밖으로 못 넓힘 + 과욕(+5%) 캡.
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
    // 거래소 시장경보(정리매매·투자위험) 발효 종목은 폴백에서도 신규 진입 금지(applyPostGate 우회 방지).
    !hasEntryBlockingWarning(ctx) &&
    lv.rrr != null &&
    lv.rrr >= MIN_RRR;

  if (canBuy) {
    return {
      action: "BUY",
      confidence: "LOW",
      entryZone: { low: Math.round(ctx.price * 0.999), high: Math.round(ctx.price * 1.002) },
      entryPositionPct: null, // 리스크모드 기본 비중으로 진입.
      sellRatioPct: null,
      targetPrice: lv.tpPrice,
      stopPrice: lv.slPrice,
      invalidationPrice: lv.slPrice,
      expectedHoldingMinutes: 60,
      rationale: "지표가 매수 신호 — 구조상 목표·손절 구간이 손익비 기준을 충족해 규칙대로 진입.",
      riskNotes: ["AI 응답이 없어 지표 계산만으로 결정했어요."],
    };
  }

  // 포지션이 있고 시그널 SELL 이면 청산.
  if (ctx.position && ctx.signal.action === "SELL") {
    return {
      action: "SELL",
      confidence: "LOW",
      entryZone: null,
      entryPositionPct: null,
      sellRatioPct: 100, // 폴백은 전량 정리(보수적).
      targetPrice: null,
      stopPrice: null,
      invalidationPrice: null,
      expectedHoldingMinutes: 0,
      rationale: "지표가 매도 신호로 돌아서 보유분을 정리.",
      riskNotes: ["AI 응답이 없어 지표 계산만으로 결정했어요."],
    };
  }

  return {
    action: "HOLD",
    confidence: "LOW",
    entryZone: null,
    entryPositionPct: null,
    sellRatioPct: null,
    targetPrice: ctx.previousDecision?.targetPrice ?? null,
    stopPrice: ctx.previousDecision?.stopPrice ?? null,
    invalidationPrice: ctx.previousDecision?.invalidationPrice ?? null,
    expectedHoldingMinutes: null,
    rationale: "지표에 뚜렷한 매수·매도 신호가 없어 관망.",
    riskNotes: [],
  };
}

// ─── 확신 점수 → 결정론 컷·사이징 (순수, 테스트 대상 — PR-3a) ─────────────────

/**
 * 결정론 컷 — 확신 점수(0~100) → 액션. "LLM 의 언어적 신중함을 체결 경로에서 제거"의 핵심:
 * judge 는 점수만 내고 사자/팔자 판정은 여기서 한다. 컷 임계는 env(PR-4 에서 무코드 튜닝).
 * SELL 은 보유 중일 때만(무포지션 공매도 없음) — 전량 청산으로 매핑된다.
 */
export function deriveActionFromConviction(
  conviction: number,
  hasPosition: boolean,
): IntradayAction {
  if (conviction >= PAPER_TRADING_INTRADAY_BUY_CONVICTION_MIN) return "BUY";
  if (hasPosition && conviction <= PAPER_TRADING_INTRADAY_SELL_CONVICTION_MAX) return "SELL";
  return "HOLD";
}

/**
 * 결정론 사이징 — BUY 진입 목표 비중(%). 컷 기준점에서 20%로 시작해 확신 1점당 +2%p,
 * 20~80 clamp(서버 maxPositionPct 상한 캡은 toPaperTradingDecision 이 추가 적용).
 * 기본 컷 65 기준: 65→20 / 80→50 / 95이상→80.
 */
export function convictionEntryPositionPct(conviction: number): number {
  const raw = 20 + (conviction - PAPER_TRADING_INTRADAY_BUY_CONVICTION_MIN) * 2;
  return Math.min(80, Math.max(20, raw));
}

/**
 * 표시용 신뢰도 파생 — |확신−50| 를 기존 3단계 enum 으로 접어 카피맵·Slack·ReadCard·틱 시트를
 * 무파괴 유지한다(AC-12). ≥25→HIGH / ≥10→MEDIUM / 그 외 LOW.
 */
export function convictionToConfidence(conviction: number): IntradayConfidence {
  const dist = Math.abs(conviction - 50);
  if (dist >= 25) return "HIGH";
  if (dist >= 10) return "MEDIUM";
  return "LOW";
}

// ─── LLM 응답 정규화 ──────────────────────────────────────────────────────────

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** null 통과 clamp — LLM 이 범위 밖 값을 내면 안전 범위로 자른다. */
function clampOrNull(v: number | null, min: number, max: number): number | null {
  if (v == null) return null;
  return Math.min(max, Math.max(min, v));
}

function normalizeRiskNotes(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 3) : [];
}

/**
 * v2(convictionScore) 응답 → 판단 필드 파생 — action/confidence/진입 구간/사이징을 전부
 * 결정론(컷·사이징·|Δ50| 매핑)으로 채운다. LLM 산은 점수·가격 레벨·서사뿐.
 */
function fromConvictionSchema(
  d: Record<string, unknown>,
  ctx: IntradayContext,
): IntradayDecisionLlm {
  const conviction = Math.round(clampOrNull(num(d.convictionScore), 0, 100)!);
  const hasPosition = ctx.position != null && ctx.position.quantity > 0;
  const action = deriveActionFromConviction(conviction, hasPosition);
  return {
    action,
    confidence: convictionToConfidence(conviction),
    // 진입 구간 — 폴백(deriveFromSignal)과 동일한 현재가 근방 파생(-0.1%~+0.2%).
    entryZone:
      action === "BUY"
        ? { low: Math.round(ctx.price * 0.999), high: Math.round(ctx.price * 1.002) }
        : null,
    entryPositionPct: action === "BUY" ? convictionEntryPositionPct(conviction) : null,
    sellRatioPct: action === "SELL" ? 100 : null, // 확신 컷 청산은 전량(보수적).
    // BUY 인데 LLM 이 가격 레벨을 비우면 구조/ATR 레벨로 백필 — TP/SL 없는 포지션 개시 방지
    // (cli-agent 경로엔 포지션 하드스톱이 없어 forced-exit 트리거가 유일한 자동 청산선, 리뷰 F-1).
    targetPrice: num(d.targetPrice) ?? (action === "BUY" ? ctx.levels.tpPrice : null),
    stopPrice: num(d.stopPrice) ?? (action === "BUY" ? ctx.levels.slPrice : null),
    invalidationPrice: num(d.invalidationPrice) ?? (action === "BUY" ? ctx.levels.slPrice : null),
    expectedHoldingMinutes: num(d.expectedHoldingMinutes),
    rationale: typeof d.rationale === "string" ? d.rationale : "",
    riskNotes: normalizeRiskNotes(d.riskNotes),
    convictionScore: conviction,
    judgeSchema: "v2",
  };
}

/**
 * judge 응답 정규화 — 듀얼 스키마(PR-3a 전환기 호환).
 * `convictionScore` 가 유한 숫자면 v2(점수화) 경로, 아니면 v1 레거시(action 직접 출력) 경로.
 * v1 은 기존 파싱 그대로 두되 근사 확신(BUY→70/SELL→30/HOLD→50)을 합성해 에코·집계
 * 일관성을 유지한다(점수 의미가 약한 추정치 — judgeSchema:"v1" 마커로 구분).
 * 테스트를 위해 export (CLI 없이 순수 파싱·파생 검증).
 */
export function normalizeLlm(parsed: unknown, ctx: IntradayContext): IntradayDecisionLlm | null {
  if (!parsed || typeof parsed !== "object") return null;
  const d = parsed as Record<string, unknown>;

  if (num(d.convictionScore) != null) return fromConvictionSchema(d, ctx);

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
    // AI 분할 비율 — 진입 비중 5~100%, 청산 비율 10~100% 로 clamp(범위 밖 환각 차단).
    entryPositionPct: action === "BUY" ? clampOrNull(num(d.entryPositionPct), 5, 100) : null,
    sellRatioPct: action === "SELL" ? clampOrNull(num(d.sellRatioPct), 10, 100) : null,
    targetPrice: num(d.targetPrice),
    stopPrice: num(d.stopPrice),
    invalidationPrice: num(d.invalidationPrice),
    expectedHoldingMinutes: num(d.expectedHoldingMinutes),
    rationale: typeof d.rationale === "string" ? d.rationale : "",
    riskNotes: normalizeRiskNotes(d.riskNotes),
    convictionScore: action === "BUY" ? 70 : action === "SELL" ? 30 : 50,
    judgeSchema: "v1",
  };
}

// ─── 에이전트 호출 진단 (PRD intraday-decision-overhaul PR-0) ─────────────────

/** 실패 원문 보존 상한(2KB) — payload jsonb 비대 방지. */
const RAW_TEXT_HEAD_MAX = 2048;
const ERROR_MESSAGE_MAX = 300;

/** 예외 → 실패 종류. invokeAgentCliStream 은 타임아웃/중단에 error.name 을 채운다. */
function classifyAgentFailure(error: unknown): IntradayAgentFailureKind {
  const name = (error as { name?: string } | null)?.name;
  if (name === "TimeoutError") return "timeout";
  if (name === "AbortError") return "abort";
  return "error";
}

function describeAgentError(error: unknown): string {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return text.slice(0, ERROR_MESSAGE_MAX);
}

/**
 * 재시도 진단 병합 — 최신 실패가 기준이되, 앞선 실패의 원문(rawTextHead)·usage 는 뒤 실패에
 * 없으면 이월 보존한다. parse 실패 원문이 가장 귀한 진단이라 empty/예외 재시도로 덮여
 * 사라지지 않게 하는 장치.
 */
function mergeAgentDiagnostics(
  prev: IntradayAgentDiagnostics | undefined,
  next: IntradayAgentDiagnostics,
): IntradayAgentDiagnostics {
  return {
    ...next,
    ...(next.rawTextHead == null && prev?.rawTextHead != null
      ? { rawTextHead: prev.rawTextHead }
      : {}),
    ...(next.usage == null && prev?.usage != null ? { usage: prev.usage } : {}),
  };
}

// ─── PaperTradingDecision 어댑터 ──────────────────────────────────────────────

function riskTargetPct(riskMode: PaperTradingRiskMode): number {
  if (riskMode === "conservative") return 40;
  if (riskMode === "aggressive") return 80;
  return 60;
}

/**
 * IntradayDecision → PaperTradingDecision 목표 비중 매핑 — AI 분할 매수·분할 매도.
 *
 * - BUY: AI 가 정한 목표 비중(entryPositionPct, 없으면 리스크모드 기본)으로 진입/추가 매수.
 *   maxPositionPct 로 상한 캡. **기존 비중보다 낮춰 잡진 않는다**(BUY 액션이 매도를 유발하는
 *   역전 방지 — 수익으로 비중이 캡을 넘어도 유지).
 * - SELL: sellRatioPct(없으면 100=전량). 100 미만 + 보유 중이면 분할 청산(REDUCE) —
 *   목표 비중 = 현재 비중 × (1 − 비율).
 * - HOLD: **현재 비중 그대로**(리밸런싱 트레이드 금지 — 이전엔 리스크모드 기본 비중으로
 *   재조정 주문이 발생할 수 있었다).
 *
 * 테스트를 위해 export (CLI 없이 순수 매핑 검증).
 */
export function toPaperTradingDecision(
  intraday: IntradayDecision,
  input: Pick<IntradayCliInput, "ticker" | "name" | "position" | "riskMode" | "maxPositionPct">,
  /** 판단 시점 정량 스냅샷 — 있으면 저장 틱에 실어 영속(사후 미스 분석·A/B). 없으면 미기록. */
  snapshot?: IntradaySnapshot,
): PaperTradingDecision {
  const { action } = intraday;
  const currentPct = input.position?.allocationPct ?? 0;

  let targetPct: number;
  let ptAction: PaperTradingDecision["action"];
  /** false = 리밸런싱 주문 금지(targetAllocations 비움 — virtualExecution 계약, 리뷰 #1). */
  let trade = true;

  if (action === "BUY") {
    const desired = intraday.entryPositionPct ?? riskTargetPct(input.riskMode);
    targetPct = Math.max(currentPct, Math.min(input.maxPositionPct, desired));
    ptAction = "BUY";
    // 캡에 걸려 현 비중 이하가 되면 살 여력이 없음 — %→floor(주수) 재계산 드리프트로
    // BUY 액션이 1주 매도를 만드는 역전을 막기 위해 주문을 내지 않는다.
    trade = targetPct > currentPct;
  } else if (action === "SELL") {
    const ratio = intraday.sellRatioPct ?? 100;
    if (input.position && ratio < 100) {
      targetPct = round2(currentPct * (1 - ratio / 100));
      ptAction = "REDUCE";
    } else {
      targetPct = 0;
      ptAction = input.position ? "EXIT" : "SELL";
    }
  } else {
    // HOLD = 현 포지션 그대로 — stale allocationPct 를 목표로 되먹이면 가격 미세 변동마다
    // floor 재계산 매도가 새므로(리뷰 #1) 주문 자체를 내지 않는다(익절/손절은 forcedExit 담당).
    targetPct = input.position && input.position.quantity > 0 ? currentPct : 0;
    ptAction = "HOLD";
    trade = false;
  }

  return {
    action: ptAction,
    targetAllocationPct: targetPct,
    targetAllocations: trade
      ? [
          {
            ticker: input.ticker,
            name: input.name,
            targetAllocationPct: targetPct,
            rationale: intraday.rationale,
          },
        ]
      : [],
    confidence: intraday.confidence,
    rationale: intraday.rationale,
    riskNotes: intraday.riskNotes,
    // "왜 이런 판단" 메모 — 분석가 진단·룰 조정 내역을 틱 로그(체결 내역 시트)까지 보존.
    analystNote: intraday.analystNote,
    gateAdjustments: intraday.gateAdjustments,
    expectedHoldingMinutes: intraday.expectedHoldingMinutes ?? undefined,
    // 청산 트리거(virtualExecution forced-exit): 손절가 우선, 없으면 무효화가.
    invalidationPrice: intraday.stopPrice ?? intraday.invalidationPrice ?? null,
    targetPrice: intraday.targetPrice ?? null,
    // 확신 점수 영속 — 다음 틱 에코(buildPreviousEcho)·버킷 캘리브레이션 원장. 폴백 틱은 미기록.
    ...(intraday.convictionScore != null ? { convictionScore: intraday.convictionScore } : {}),
    ...(intraday.judgeSchema ? { judgeSchema: intraday.judgeSchema } : {}),
    intradaySnapshot: snapshot,
    source: "cli-agent",
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
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
    // 판단 근거 정량 스냅샷 — LLM·폴백 공통 choke point 라 모든 틱이 기록된다.
    const snapshot: IntradaySnapshot = {
      basePrice: lastClose,
      signal: decisionSignal,
      levels,
      structureEvent: ctx.structureEvent ?? null,
    };
    return { decision: toPaperTradingDecision(intraday, input, snapshot), intraday };
  };

  // 재진입 쿨다운 — 청산 후 N틱 미경과면 신규 BUY 차단(사전·사후 게이트 공유, PR-3a).
  const reentryCooldown =
    input.ticksSinceLastExit != null &&
    input.ticksSinceLastExit < PAPER_TRADING_INTRADAY_REENTRY_COOLDOWN_TICKS;

  // 사전 게이트. (forceAgents=on-demand 판단 카드는 변화없음 스킵을 무시하고 항상 에이전트 호출)
  const pre = evaluatePreGate(ctx, input.dailyLossKill, reentryCooldown);
  if (!pre.callLlm && !input.forceAgents) {
    return finalize(deriveFromSignal(ctx, pre.noNewEntry), "intraday-fallback", undefined, [
      pre.reason ?? "규칙 사전 점검으로 AI 호출 생략",
    ]);
  }

  // LLM 을 실제로 호출하는 경로에서만 매수 유의(경보·VI)를 fail-soft 로 조회해 컨텍스트에 얹는다
  // (스킵 틱은 미조회 — 낭비 방지, PRD §3-2). 토스 키 없으면 빈 배열이라 프롬프트 무변경.
  // 이미 중단된 틱이면 조회 자체를 생략(리뷰 F-1 — abort 경로 불필요 대기 제거). 조회 중 중단은
  // fetchActiveWarnings 가 바운드(≤5s)·never-throw 라 판단을 깨지 않는다.
  if (!input.abortSignal.aborted) {
    // 매수 유의(경보·VI) + 수급 선행(체결강도·호가, I3)을 병렬 fail-soft 조회. 둘 다 never-throw·
    // 바운드라 판단을 깨지 않고, 토스 미설정이면 빈 값(프롬프트 무변경).
    const [warnings, orderFlowText] = await Promise.all([
      fetchActiveWarnings(input.ticker),
      buildOrderFlowText(input.ticker),
    ]);
    ctx.warnings = warnings;
    ctx.orderFlowText = orderFlowText;
  }

  const provider: AIAnalysisProvider = input.provider ?? "claude";
  // 에이전트별 모델 분리 — 분석가(요약, 싸고 빠르게)와 판단가(필요 시 더 무겁게)를 따로 둔다.
  // 미설정 시 INTRADAY_MODEL, 그래도 없으면 invokeAgentCliStream 이 CLAUDE_CLI_MODEL 로 폴백.
  const analystModel = process.env.INTRADAY_ANALYST_MODEL ?? process.env.INTRADAY_MODEL;
  const judgeModel = process.env.INTRADAY_JUDGE_MODEL ?? process.env.INTRADAY_MODEL;
  // 판단을 내린 모델·토큰 사용량을 틱에 기록 — 모델 A/B·세션 누적 비용 집계의 원장 근거.
  const providerDefaultModel =
    provider === "codex" ? process.env.CODEX_CLI_MODEL : process.env.CLAUDE_CLI_MODEL;
  const effectiveModel = (model?: string) =>
    model ?? providerDefaultModel ?? "cli-default";
  let analystUsage: AgentUsage | undefined;
  let judgeUsage: AgentUsage | undefined;
  const withModels = (
    result: IntradayProviderResult,
    used: { analyst: boolean; judge: boolean },
  ): IntradayProviderResult => {
    if (used.analyst) {
      result.decision.analystModel = effectiveModel(analystModel);
      result.decision.analystUsage = analystUsage;
    }
    if (used.judge) {
      result.decision.judgeModel = effectiveModel(judgeModel);
      result.decision.judgeUsage = judgeUsage;
    }
    return result;
  };

  // ① 흐름·세력 분석가 — 실패해도 진단 없이 ②로 진행(분석가는 보조). 실패는 agentDiagnostics 기록.
  let analystNote = "";
  let analystDiag: IntradayAgentDiagnostics | undefined;
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
    analystUsage = r1.usage;
    // CLI 가 정상 종료했지만 빈 텍스트 — 관측된 실패의 94%가 이 유형(형식불량 아님).
    if (!analystNote) analystDiag = { failureKind: "empty", attempts: 1, usage: r1.usage };
  } catch (error) {
    analystNote = "";
    analystDiag = {
      failureKind: classifyAgentFailure(error),
      attempts: 1,
      errorMessage: describeAgentError(error),
    };
  }

  // ② 진입·청산 판단가 — JSON 파싱이 가끔 실패(~1/3 관측)하므로 1회 재시도 후 결정론 폴백.
  //    실패 시 원문(rawTextHead)·종류(failureKind)를 남긴다 — "어떤 응답이 왜 실패했나"의 사후 근거.
  let llm: IntradayDecisionLlm | null = null;
  let judgeDiag: IntradayAgentDiagnostics | undefined;
  let judgeAttempts = 0;
  for (let attempt = 0; attempt < 2 && !llm; attempt++) {
    judgeAttempts++;
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
      llm = normalizeLlm(parseLooseJson(r2.text), ctx);
      judgeUsage = r2.usage;
      if (!llm) {
        const trimmed = r2.text.trim();
        judgeDiag = mergeAgentDiagnostics(judgeDiag, {
          failureKind: trimmed ? "parse" : "empty",
          attempts: judgeAttempts,
          ...(trimmed ? { rawTextHead: r2.text.slice(0, RAW_TEXT_HEAD_MAX) } : {}),
          // 실패 시도의 usage — 성공 시도의 usage 는 기존 judgeUsage 로 간다(유실 수정).
          usage: r2.usage,
        });
      }
    } catch (error) {
      llm = null;
      judgeDiag = mergeAgentDiagnostics(judgeDiag, {
        failureKind: classifyAgentFailure(error),
        attempts: judgeAttempts,
        errorMessage: describeAgentError(error),
      });
    }
  }
  // 재시도 끝 성공 — 결정은 LLM 산(judgeModel 기록 유지). 실패 시도 기록은 회복 표시와 함께 보존.
  if (llm && judgeDiag) judgeDiag = { ...judgeDiag, attempts: judgeAttempts, recovered: true };

  // 실패/재시도가 있었던 틱에만 진단 부착 — 전부 성공 틱은 미기록(행동·payload 무변경).
  const withDiagnostics = (result: IntradayProviderResult): IntradayProviderResult => {
    if (analystDiag || judgeDiag) {
      result.decision.agentDiagnostics = {
        ...(analystDiag ? { analyst: analystDiag } : {}),
        ...(judgeDiag ? { judge: judgeDiag } : {}),
      };
    }
    return result;
  };

  if (!llm) {
    // judge 실패 = 폴백 신규 진입 금지(AC-11 — "judge 실패 ≠ 의도 밖 체결"). noNewEntry 를 강제해
    // 폴백이 새 포지션을 열지 못하게 한다 — 보유 관리(보호 SELL·직전 목표/손절 유지·forced-exit)만.
    // 감사에서 실체결 8건 전부가 이 폴백 경로에서 발생했던 사고 구조를 차단한다.
    return withDiagnostics(
      withModels(
        finalize(deriveFromSignal(ctx, true), "intraday-fallback", analystNote, [
          "AI 판단 응답 실패 — 신규 진입 금지(보유 관리만)",
        ]),
        { analyst: analystNote !== "", judge: false },
      ),
    );
  }

  const gated = applyPostGate(llm, ctx, pre.noNewEntry, reentryCooldown);
  return withDiagnostics(
    withModels(
      finalize(gated.decision, "intraday-cli", analystNote, gated.adjustments),
      { analyst: analystNote !== "", judge: true },
    ),
  );
}

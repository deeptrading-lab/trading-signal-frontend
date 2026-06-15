/**
 * `/api/stock/ai-analysis` — 12-에이전트 멀티에이전트 AI 분석 SSE 스트림.
 *
 * POST { ticker: "005930", provider: "claude" | "codex" }
 *
 * SSE 이벤트:
 *   { type:'progress',      agent, status:'running'|'done'|'error' }
 *   { type:'stream',        agent, chunk }          ← 에이전트 완료 시 전체 텍스트 1회
 *   { type:'report',        agent, content }        ← 에이전트 완료 전문
 *   { type:'debate_stream', speaker:'bull'|'bear', chunk }
 *   { type:'debate',        speaker:'bull'|'bear', content }
 *   { type:'final',         data: FinalDecision }
 *   { type:'error',         message }
 *   { type:'done' }
 *
 * ⚠️ 로컬 전용(next dev) — Vercel 환경 감지 시 503.
 * ⚠️ KIS 미설정 시 400.
 * ⚠️ 전체 타임아웃 300s.
 */

import { NextRequest, NextResponse } from "next/server";
import { isKisConfigured, fetchStockPrice, fetchInvestorTrend } from "@/lib/api/kis";
import { fetchDailyChunked } from "@/lib/api/kis/chartChunked";
import { evaluateSignal } from "@/lib/signal/engine";
import { AXIS_LABEL } from "@/lib/copy/signal/labels";
import type { AxisScore, SignalResult } from "@/lib/types/signal";
import type { StockPrice, StockDailyCandle } from "@/lib/api/kis/types";
import type { StockInvestorTrend } from "@/lib/types/stock/investors";
import type {
  AgentKey,
  AIAnalysisEvent,
  AIAnalysisProvider,
  FinalDecision,
  ResumeState,
  SentimentBand,
  SentimentConfidence,
  SentimentReport,
} from "@/lib/types/stock/aiAnalysis";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import { AGENT_ORDER, DEBATE_ROUNDS } from "@/lib/types/stock/aiAnalysis";
import type { AIDecisionEntry } from "@/lib/api/stock/aiDecisionStore";
import { invokeAgentCliStream } from "@/lib/server/ai/agentCli";
import { isVercelEnv } from "@/lib/server/env";
import { AGENT_PROMPTS, runDebateLoop } from "@/lib/prompts/stock/aiAnalysis";
import type { AnalysisState } from "@/lib/prompts/stock/aiAnalysis";

const CHART_DAYS = 200;
// 12-에이전트 파이프라인 최대 허용 시간 (50분)
// Phase A(6m) + Phase B(20m) + research_manager(5m) + trader/effort:high(6m)
//   + risk×3 병렬(5m) + PM/effort:high(5m) ≈ 47m + 안전마진
const TIMEOUT_TOTAL_MS = 3_000_000;


// ─── SSE 헬퍼 ─────────────────────────────────────────────────────────────────

const encoder = new TextEncoder();

function sseEvent(data: AIAnalysisEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}


// ─── JSON 파싱 헬퍼 (Portfolio Manager 응답) ─────────────────────────────────

function parseLooseJson(raw: string): unknown | null {
  const text = raw.trim();
  if (!text) return null;
  const candidates = [text];
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence?.[1]) candidates.push(fence[1].trim());
  const i = text.indexOf("{"), j = text.lastIndexOf("}");
  if (i !== -1 && j > i) candidates.push(text.slice(i, j + 1));
  for (const c of candidates) {
    try { return JSON.parse(c); } catch { /* next */ }
  }
  return null;
}

// ─── 구조화 감성 파싱 헬퍼 (SNS 분석가 응답 말미 블록) ────────────────────────

/** 한글 밴드 라벨 → 코드값 역매핑(프롬프트 노출 라벨과 동일 화이트리스트). */
const BAND_LABEL_TO_CODE: Record<string, SentimentBand> = Object.fromEntries(
  (Object.entries(COPY.sentiment.bandLabel) as [SentimentBand, string][])
    .map(([code, label]) => [label, code]),
);

const SENTIMENT_BLOCK_RE = /<!--\s*SENTIMENT\b([\s\S]*?)-->/i;

/** 감성 블록 마커를 제거한 깨끗한 텍스트(카드 미리보기·전체보기에 raw 주석 노출 방지). */
function stripSentimentBlock(raw: string): string {
  return raw.replace(SENTIMENT_BLOCK_RE, "").trimEnd();
}

/**
 * social 응답 말미의 `<!-- SENTIMENT ... -->` 블록을 파싱한다.
 * band(한글 라벨 화이트리스트)·score(0~10 clamp)가 둘 다 유효해야 반환, 아니면 null(graceful 폴백).
 */
function parseSentimentBlock(raw: string): SentimentReport | null {
  const m = raw.match(SENTIMENT_BLOCK_RE);
  if (!m) return null;
  const body = m[1];

  const field = (key: string): string | null => {
    const fm = body.match(new RegExp(`^\\s*${key}\\s*:\\s*(.+)$`, "im"));
    return fm ? fm[1].trim() : null;
  };

  const bandRaw = field("band");
  const band = bandRaw ? BAND_LABEL_TO_CODE[bandRaw] : undefined;
  if (!band) return null;

  const scoreRaw = field("score");
  const scoreNum = scoreRaw != null ? Number(scoreRaw.match(/-?\d+(?:\.\d+)?/)?.[0]) : NaN;
  if (!Number.isFinite(scoreNum)) return null;
  const score = Math.max(0, Math.min(10, Math.round(scoreNum)));

  const confRaw = (field("confidence") ?? "").toLowerCase();
  const confidence: SentimentConfidence =
    confRaw === "low" || confRaw === "high" ? confRaw : "medium";

  const summary = field("summary") ?? "";

  return { band, score, confidence, summary };
}

// ─── 프롬프트 빌더 ────────────────────────────────────────────────────────────

function formatSignalForPrompt(
  ticker: string,
  axes: AxisScore[],
  score: number,
  action: string,
  confidence: number,
  regime: number,
  asOf: string,
): string {
  const regimeLabel = regime === 1 ? "강세(120선 우상향·가격 위)" : regime === -1 ? "약세(120선 우하향·가격 아래)" : "중립";
  const axesText = axes.map((a) => {
    const topHits = [...a.hits]
      .filter((h) => h.direction !== 0)
      .sort((x, y) => y.weight - x.weight)
      .slice(0, 3)
      .map((h) => h.detail ? `${h.key}(${h.detail})` : h.key)
      .join(", ");
    return `  ${AXIS_LABEL[a.axis]}: ${a.score.toFixed(0)}/100${topHits ? ` — ${topHits}` : ""}`;
  }).join("\n");

  return [
    `종목 코드: ${ticker}`,
    `기준일: ${asOf}`,
    "",
    `종합 신호: ${action} | 점수: ${score.toFixed(0)}/100 | 동의도: ${Math.round(confidence * 100)}%`,
    `장기추세 레짐: ${regimeLabel}`,
    "",
    "축별 점수:",
    axesText,
  ].join("\n");
}
// ─── 가격·수급 컨텍스트 포매터 ────────────────────────────────────────────────

function formatPriceContextForPrompt(
  candles: StockDailyCandle[],
  signal: SignalResult,
  price: StockPrice | null,
  investor: StockInvestorTrend | null,
): string {
  const n = candles.length;
  if (n === 0) return "";

  const last = candles[n - 1];
  const cur = price?.price ?? last.close;
  const lines: string[] = [];

  // ── 현재가 ──────────────────────────────────────────────────────────────────
  const priceStr = `${cur.toLocaleString("ko-KR")}원`;
  const changeStr = price
    ? ` (${price.changePercent >= 0 ? "+" : ""}${price.changePercent.toFixed(2)}%, ${price.change >= 0 ? "+" : ""}${price.change.toLocaleString("ko-KR")}원)`
    : "";
  lines.push(`현재가: ${priceStr}${changeStr}`);

  // 업종 / 외국인 지분율
  const meta: string[] = [];
  if (price?.sector) meta.push(`업종: ${price.sector}`);
  if (price?.foreignRatio != null) meta.push(`외국인 지분율: ${price.foreignRatio.toFixed(1)}%`);
  if (meta.length) lines.push(meta.join(" | "));

  lines.push("");

  // ── 주가 성과 ────────────────────────────────────────────────────────────────
  const ret = (daysBack: number): string => {
    if (n <= daysBack) return "N/A";
    const base = candles[n - 1 - daysBack].close;
    const pct = ((cur - base) / base) * 100;
    return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
  };
  lines.push(`주가 성과 (영업일 기준): 5일 ${ret(5)} | 20일 ${ret(20)} | 60일 ${ret(60)}`);

  // 52주 고저
  const year = candles.slice(-252);
  const hi52 = Math.max(...year.map(c => c.high));
  const lo52 = Math.min(...year.map(c => c.low));
  const fromHi = ((cur - hi52) / hi52) * 100;
  const fromLo = ((cur - lo52) / lo52) * 100;
  lines.push(`52주 고가: ${hi52.toLocaleString("ko-KR")}원 (현재가 대비 ${fromHi.toFixed(1)}%) | 52주 저가: ${lo52.toLocaleString("ko-KR")}원 (+${fromLo.toFixed(1)}%)`);

  // 평균 거래량
  const vol20 = candles.slice(-21, -1).reduce((s, c) => s + c.volume, 0) / 20;
  const volRatio = vol20 > 0 ? ((last.volume / vol20 - 1) * 100) : 0;
  lines.push(`평균 거래량(20일): ${Math.round(vol20).toLocaleString("ko-KR")}주 | 최근 거래량: ${last.volume.toLocaleString("ko-KR")}주 (${volRatio >= 0 ? "+" : ""}${volRatio.toFixed(0)}%)`);

  // 시그널 요약 1줄 (중복 피해 짧게)
  lines.push(`기술 시그널: ${signal.action} | 점수 ${signal.score.toFixed(0)}/100 | 동의도 ${Math.round(signal.confidence * 100)}%`);

  lines.push("");

  // ── 주체별 수급 ──────────────────────────────────────────────────────────────
  if (investor && investor.days.length > 0) {
    const days = investor.days.slice(0, 10);
    const sumFgn = days.reduce((s, d) => s + d.foreignNetBuyAmount, 0);
    const sumOrg = days.reduce((s, d) => s + d.orgNetBuyAmount, 0);
    const sumPer = days.reduce((s, d) => s + d.personNetBuyAmount, 0);

    const fmt = (v: number) => {
      const abs = Math.abs(v) / 100; // 백만원 → 억원
      return `${v >= 0 ? "+" : "−"}${abs.toFixed(0)}억`;
    };

    // 연속 매수/매도 방향
    const streak = (field: "foreignNetBuyAmount" | "orgNetBuyAmount" | "personNetBuyAmount"): string => {
      let cnt = 0;
      for (const d of days) {
        if (cnt === 0) { cnt = d[field] >= 0 ? 1 : -1; continue; }
        if (cnt > 0 && d[field] >= 0) cnt++;
        else if (cnt < 0 && d[field] < 0) cnt--;
        else break;
      }
      if (Math.abs(cnt) < 2) return "";
      return cnt > 0 ? ` (${cnt}일 연속 순매수)` : ` (${Math.abs(cnt)}일 연속 순매도)`;
    };

    lines.push(`주체별 수급 (최근 ${days.length}일 합산, 단위: 억원):`);
    lines.push(`  외국인: ${fmt(sumFgn)}${streak("foreignNetBuyAmount")}`);
    lines.push(`  기관:   ${fmt(sumOrg)}${streak("orgNetBuyAmount")}`);
    lines.push(`  개인:   ${fmt(sumPer)}${streak("personNetBuyAmount")}`);
  }

  return lines.join("\n");
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<Response> {
  if (isVercelEnv()) {
    return NextResponse.json(
      { error: "AI 멀티에이전트 분석은 로컬 환경(next dev)에서만 사용할 수 있어요." },
      { status: 503 },
    );
  }

  // Body: { ticker, provider?, startFrom?, state?, prevDecisions? }
  const body = await req.json().catch(() => null) as {
    ticker?: unknown;
    provider?: unknown;
    startFrom?: unknown;
    state?: unknown;
    prevDecisions?: unknown;
  } | null;

  if (!body || typeof body.ticker !== "string") {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }

  const ticker = body.ticker.trim().replace(/[^A-Za-z0-9_-]/g, "");
  if (!ticker) {
    return NextResponse.json({ error: "ticker가 필요합니다." }, { status: 400 });
  }

  const rawProvider = body.provider ?? "claude";
  if (rawProvider !== "claude" && rawProvider !== "codex") {
    return NextResponse.json(
      { error: "지원하지 않는 AI 공급자입니다." },
      { status: 400 },
    );
  }
  const provider: AIAnalysisProvider = rawProvider;

  // startFrom 검증 + 정규화 (bear → bull: 토론은 항상 bull부터 재실행)
  const rawStartFrom: AgentKey | undefined =
    typeof body.startFrom === "string" && (AGENT_ORDER as string[]).includes(body.startFrom)
      ? (body.startFrom as AgentKey)
      : undefined;
  const startFrom: AgentKey | undefined = rawStartFrom === "bear" ? "bull" : rawStartFrom;

  // 이전 실행 결과 (재개 시)
  const preState: ResumeState = (body.state && typeof body.state === "object")
    ? body.state as ResumeState
    : {};

  // 과거 결정 이력 (Decision Memory — PM 프롬프트 주입용)
  const prevDecisions: AIDecisionEntry[] = Array.isArray(body.prevDecisions)
    ? (body.prevDecisions as AIDecisionEntry[]).slice(0, 3)
    : [];

  const pastDecisionContext = prevDecisions.length > 0
    ? `\n\n**과거 결정 참고** (같은 종목 이전 AI 분석 결과 — 패턴 학습용):\n${
        prevDecisions.map(d =>
          `- ${d.date.slice(0, 10)}: ${d.verdict} (확신도: ${d.confidence}) / 목표: ${d.target_pct != null ? `${d.target_pct > 0 ? "+" : ""}${d.target_pct}%` : "없음"} / 손절: ${d.stop_loss_pct}%`
        ).join("\n")
      }\n과거 결정의 논리를 반복하지 말고, 현재 데이터에 기반해 독립적으로 판단하세요.`
    : "";

  if (!isKisConfigured()) {
    return NextResponse.json({ error: "KIS API가 설정되지 않아 시그널을 계산할 수 없어요." }, { status: 400 });
  }

  // 클라이언트 disconnect + 서버 타임아웃 통합 signal
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), TIMEOUT_TOTAL_MS);
  const combinedSignal = AbortSignal.any
    ? AbortSignal.any([req.signal, timeoutController.signal])
    : timeoutController.signal;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: AIAnalysisEvent) => {
        try { controller.enqueue(sseEvent(event)); } catch { /* closed */ }
      };

      const state: AnalysisState = {
        ticker,
        signalSummary: "",
        priceContext: "",
        // 이전 실행 결과로 초기화 (startFrom 이전 에이전트들은 재실행 안 함)
        marketReport:        preState.marketReport        ?? "",
        newsReport:          preState.newsReport          ?? "",
        fundamentalsReport:  preState.fundamentalsReport  ?? "",
        socialReport:        preState.socialReport        ?? "",
        bullArgument:        preState.bullArgument        ?? "",
        bearArgument:        preState.bearArgument        ?? "",
        researchPlan:        preState.researchPlan        ?? "",
        traderProposal:      preState.traderProposal      ?? "",
        riskRisky:           preState.riskRisky           ?? "",
        riskNeutral:         preState.riskNeutral         ?? "",
        riskSafe:            preState.riskSafe            ?? "",
      };

      // 재개 시 social이 이미 완료됐다면 감성을 재파싱해 PM 주입용으로 복원.
      // (재개 페이로드는 마커 strip 된 clean 텍스트일 수 있어 둘 다 안전하게 시도.)
      if (preState.socialReport) {
        const restored = parseSentimentBlock(preState.socialReport);
        if (restored) state.sentiment = restored;
      }

      const runStart = Date.now();
      try {
        // 1. 시세 & 시그널 계산 (재개 시에도 항상 최신 데이터 사용) ──────────
        const today = new Date();
        const from = new Date(today);
        from.setDate(from.getDate() - CHART_DAYS);
        const fmt = (d: Date) =>
          `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

        let candles;
        try {
          candles = await fetchDailyChunked(ticker, fmt(from), fmt(today));
        } catch {
          send({ type: "error", message: "시세 데이터를 불러오는 데 실패했어요." });
          controller.close();
          return;
        }

        const sorted = [...candles].sort((a, b) => a.date.localeCompare(b.date));
        const signalResult = evaluateSignal(sorted);

        if (!signalResult.warmupOk) {
          send({ type: "error", message: "데이터가 부족해 시그널을 계산할 수 없어요. (최소 130봉 필요)" });
          controller.close();
          return;
        }

        state.signalSummary = formatSignalForPrompt(
          ticker,
          signalResult.axes,
          signalResult.score,
          signalResult.action,
          signalResult.confidence,
          signalResult.regime,
          signalResult.asOf,
        );

        // 2. 가격·수급 컨텍스트 — 병렬 페치 (실패해도 분석 계속) ──────────────
        const [priceSettled, investorSettled] = await Promise.allSettled([
          fetchStockPrice(ticker),
          fetchInvestorTrend(ticker),
        ]);
        const priceData = priceSettled.status === "fulfilled" ? priceSettled.value : null;
        const investorData = investorSettled.status === "fulfilled" ? investorSettled.value : null;
        state.priceContext = formatPriceContextForPrompt(sorted, signalResult, priceData, investorData);

        // 3. 에이전트 실행 — 3-phase ──────────────────────────────────────────
        const startIndex = startFrom ? AGENT_ORDER.indexOf(startFrom) : 0;
        if (startFrom) {
          console.log(`[ai-analysis] ↩ 재개: ${startFrom}(index=${startIndex})부터`);
        }

        // ── 공통 헬퍼: 일반 에이전트 1개 실행 ─────────────────────────────
        async function runOneAgent(agentKey: AgentKey): Promise<"ok" | "aborted" | "error"> {
          if (combinedSignal.aborted) return "aborted";

          const prompts = AGENT_PROMPTS[agentKey];
          console.log(`[ai-analysis] ▶ ${agentKey} 시작`);
          send({ type: "progress", agent: agentKey, status: "running" });

          const agentT0 = Date.now();
          let text: string;
          try {
            text = await invokeAgentCliStream(provider, {
              systemPrompt: agentKey === "portfolio_manager"
                ? prompts.system + pastDecisionContext
                : prompts.system,
              userPrompt: prompts.user(state),
              tools: prompts.tools,
              timeoutMs: prompts.timeoutMs,
              effort: prompts.effort,
              model: prompts.model,
            }, combinedSignal, (token) => {
              send({ type: "stream", agent: agentKey, chunk: token });
            });
          } catch (err) {
            const errName = (err as { name?: string }).name;
            if (errName === "AbortError") {
              console.log(`[ai-analysis] 중지 — ${agentKey}`);
              return "aborted";
            }
            if (errName === "TimeoutError") {
              console.warn(`[ai-analysis] ⏱ ${agentKey} 타임아웃 elapsed=${((Date.now()-agentT0)/1000).toFixed(1)}s`);
            } else {
              console.error(`[ai-analysis] ✗ ${agentKey}`, err);
            }
            send({ type: "progress", agent: agentKey, status: "error" });
            return "error";
          }

          console.log(`[ai-analysis] ✓ ${agentKey} 완료 len=${text.length} elapsed=${((Date.now()-agentT0)/1000).toFixed(1)}s`);

          // 포트폴리오 매니저: JSON 파싱
          if (agentKey === "portfolio_manager") {
            const parsed = parseLooseJson(text);
            if (parsed && typeof parsed === "object") {
              const d = parsed as Record<string, unknown>;
              const VERDICTS = new Set(["BUY", "OVERWEIGHT", "HOLD", "UNDERWEIGHT", "REDUCE", "SELL"]);
              if (VERDICTS.has(d.verdict as string)) {
                const rawTarget = typeof d.target_pct === "number" ? d.target_pct : null;
                const rawStop = typeof d.stop_loss_pct === "number" ? d.stop_loss_pct : -5;
                const finalDecision: FinalDecision = {
                  verdict: d.verdict as FinalDecision["verdict"],
                  reasoning: typeof d.reasoning === "string" ? d.reasoning : "",
                  key_strengths: Array.isArray(d.key_strengths)
                    ? d.key_strengths.filter((x): x is string => typeof x === "string")
                    : [],
                  key_risks: Array.isArray(d.key_risks)
                    ? d.key_risks.filter((x): x is string => typeof x === "string")
                    : [],
                  confidence: (["HIGH", "MEDIUM", "LOW"].includes(d.confidence as string)
                    ? d.confidence : "MEDIUM") as FinalDecision["confidence"],
                  time_horizon: (["단기", "중기", "장기"].includes(d.time_horizon as string)
                    ? d.time_horizon : "중기") as FinalDecision["time_horizon"],
                  new_entry_strategy: typeof d.new_entry_strategy === "string" ? d.new_entry_strategy : "",
                  holder_strategy: typeof d.holder_strategy === "string" ? d.holder_strategy : "",
                  target_pct: rawTarget,
                  stop_loss_pct: rawStop > 0 ? -rawStop : rawStop,
                  risk_reward_ratio: typeof d.risk_reward_ratio === "number" ? d.risk_reward_ratio : null,
                  short_term_outlook: typeof d.short_term_outlook === "string" ? d.short_term_outlook : "",
                  mid_term_outlook: typeof d.mid_term_outlook === "string" ? d.mid_term_outlook : "",
                };
                send({ type: "final", data: finalDecision });
              } else {
                send({ type: "report", agent: agentKey, content: text });
              }
            } else {
              send({ type: "report", agent: agentKey, content: text });
            }
          } else if (agentKey === "social") {
            // SNS 분석가: 감성 블록 파싱 + 마커 제거한 깨끗한 텍스트로 report 발행.
            const sentiment = parseSentimentBlock(text);
            const cleanText = stripSentimentBlock(text);
            send({ type: "report", agent: agentKey, content: cleanText });
            if (sentiment) {
              state.sentiment = sentiment;
              send({ type: "sentiment", report: sentiment });
            } else {
              console.log("[ai-analysis] social 감성 블록 파싱 실패 — 배지 미표시, 분석 계속");
            }
            // 마커 제거된 텍스트를 state에 저장(PM·재개 재파싱은 sentiment를 직접 사용).
            state.socialReport = cleanText;
            send({ type: "progress", agent: agentKey, status: "done" });
            return "ok";
          } else {
            send({ type: "report", agent: agentKey, content: text });
          }

          // state 업데이트
          switch (agentKey) {
            case "market":           state.marketReport    = text; break;
            case "news":             state.newsReport      = text; break;
            case "fundamentals":     state.fundamentalsReport = text; break;
            // social: 위 social 분기에서 마커 strip 후 state·이벤트 처리하고 early return.
            case "research_manager": state.researchPlan    = text; break;
            case "trader":           state.traderProposal  = text; break;
            case "risk_risky":       state.riskRisky       = text; break;
            case "risk_neutral":     state.riskNeutral     = text; break;
            case "risk_safe":        state.riskSafe        = text; break;
          }

          send({ type: "progress", agent: agentKey, status: "done" });
          return "ok";
        }

        // ── Phase A: 분석가 4개 병렬 ────────────────────────────────────────
        // market·news·fundamentals·social은 서로 독립적 → Promise.allSettled로 동시 실행
        {
          const ANALYST: AgentKey[] = ["market", "news", "fundamentals", "social"];
          const toRun = ANALYST.filter(k => AGENT_ORDER.indexOf(k) >= startIndex);
          if (toRun.length > 0 && !combinedSignal.aborted) {
            console.log(`[ai-analysis] ▶ 분석가 ${toRun.join("+")} 병렬 시작`);
            await Promise.allSettled(toRun.map(k => runOneAgent(k)));
          }
        }

        // ── Phase B: 토론 (bull → bear × DEBATE_ROUNDS) ─────────────────────
        if (!combinedSignal.aborted && AGENT_ORDER.indexOf("bull") >= startIndex) {
          console.log(`[ai-analysis] ▶ 토론 시작 (${DEBATE_ROUNDS}라운드)`);
          const result = await runDebateLoop(state, send, combinedSignal, provider);
          if (result === "aborted") {
            console.log("[ai-analysis] 토론 중단 (abort)");
          }
        }

        // ── Phase C: 매니저 체인 ─────────────────────────────────────────────
        // C-1: research_manager
        if (!combinedSignal.aborted && AGENT_ORDER.indexOf("research_manager") >= startIndex) {
          const r = await runOneAgent("research_manager");
          if (r === "aborted") {
            send({ type: "done" }); controller.close(); clearTimeout(timeoutId); return;
          }
        }

        // C-2: trader (effort: high)
        if (!combinedSignal.aborted && AGENT_ORDER.indexOf("trader") >= startIndex) {
          const r = await runOneAgent("trader");
          if (r === "aborted") {
            send({ type: "done" }); controller.close(); clearTimeout(timeoutId); return;
          }
        }

        // C-3: risk 3개 병렬 (TradingAgents Risk Management — Risky/Neutral/Safe)
        if (!combinedSignal.aborted && AGENT_ORDER.indexOf("risk_risky") >= startIndex) {
          console.log("[ai-analysis] ▶ risk 3개 병렬 시작");
          await Promise.allSettled([
            runOneAgent("risk_risky"),
            runOneAgent("risk_neutral"),
            runOneAgent("risk_safe"),
          ]);
        }

        // C-4: portfolio_manager (effort: high)
        if (!combinedSignal.aborted && AGENT_ORDER.indexOf("portfolio_manager") >= startIndex) {
          await runOneAgent("portfolio_manager");
        }

        console.log(`[ai-analysis] 전체 완료 total=${((Date.now()-runStart)/1000).toFixed(1)}s`);
        send({ type: "done" });
        controller.close();
      } catch (err) {
        console.error("[ai-analysis] 예상치 못한 예외", err);
        send({ type: "error", message: "분석 중 예상치 못한 오류가 발생했어요." });
        controller.close();
      } finally {
        clearTimeout(timeoutId);
      }
    },
    cancel() {
      timeoutController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

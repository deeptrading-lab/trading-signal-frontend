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
 * ⚠️ 전체 타임아웃 50분.
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
  AgentUsage,
  AIAnalysisEvent,
  AIAnalysisProvider,
  DecisionSignal,
  FinalDecision,
  ResumeState,
  SentimentBand,
  SentimentConfidence,
  SentimentReport,
} from "@/lib/types/stock/aiAnalysis";
import { COPY } from "@/lib/copy/stock/aiAnalysis";
import { AGENT_ORDER, DEBATE_ROUNDS } from "@/lib/types/stock/aiAnalysis";
import { invokeAgentCliStream } from "@/lib/server/ai/agentCli";
import {
  getLatestAIDecision,
  upsertAIDecision,
} from "@/lib/server/ai/decisionStore";
import { insertScorecardRow } from "@/lib/server/scorecard/scorecardStore";
import { recordAgentUsage } from "@/lib/server/ai/agentUsageStore";
import { isVercelEnv } from "@/lib/server/env";
import { createLogger } from "@/lib/server/logTag";
import { AGENT_PROMPTS, runDebateLoop } from "@/lib/prompts/stock/aiAnalysis";
import type { AnalysisState } from "@/lib/prompts/stock/aiAnalysis";
import { businessDaysBetween } from "@/lib/utils/businessDays";

/** 토큰 사용량 집계용 단계 분류: A=분석가, B=토론, C=매니저 체인. */
const STAGE_BY_AGENT: Record<AgentKey, "A" | "B" | "C"> = {
  market: "A", news: "A", fundamentals: "A", social: "A",
  bull: "B", bear: "B",
  research_manager: "C", trader: "C",
  risk_risky: "C", risk_neutral: "C", risk_safe: "C",
  portfolio_manager: "C",
};

const CHART_DAYS = 200;
/**
 * 최신 일봉이 기준일로부터 이 **영업일(평일)** 수를 초과해 노후하면 분석 조기 중단
 * (콜드스타트·휴장 옛 가격 방지). 주말은 카운트에서 제외되고, 긴 연휴의 소수 공휴일은
 * 이 마진(7)이 흡수한다 — 설·추석 연휴(공휴일 ~3평일)에도 임계 미만이라 오탐 없음.
 */
const STALE_MAX_BUSINESS_DAYS = 7;
// 12-에이전트 파이프라인 최대 허용 시간 (50분)
// Phase A(6m) + Phase B(20m) + research_manager(5m) + trader/effort:high(6m)
//   + risk×3 병렬(5m) + PM/effort:high(5m) ≈ 47m + 안전마진
const TIMEOUT_TOTAL_MS = 3_000_000;


// ─── SSE 헬퍼 ─────────────────────────────────────────────────────────────────

const encoder = new TextEncoder();

/** `[ai-analysis]` 콘솔 로그 — 앞에 `HH:MM:SS.mmm(KST)` 시각 프리픽스 부착. */
const aiLog = createLogger("ai-analysis");

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

// ─── 이전 PM 결론 컨텍스트 (Portfolio Manager 전용) ───────────────────────────

/** 이전 결론 시점으로부터의 경과 시간 — 사람이 읽는 라벨 + 경과 일수(불명 시 null). */
function formatElapsedSince(updatedAt: string): { label: string; days: number | null } {
  const then = new Date(updatedAt).getTime();
  if (!Number.isFinite(then)) return { label: "시점 불명", days: null };
  const diffMs = Date.now() - then;
  if (diffMs < 0) return { label: "방금", days: 0 };
  const days = Math.floor(diffMs / 86_400_000);
  if (days >= 1) return { label: `약 ${days}일 전`, days };
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours >= 1) return { label: `약 ${hours}시간 전`, days: 0 };
  return { label: "1시간 이내", days: 0 };
}

/** 경과 일수에 따른 시점 가중 가이드 — 오래될수록 약한 참고로 내린다. */
function recencyGuide(days: number | null): string {
  if (days == null) {
    return "경과 시점을 알 수 없으니 이전 결론은 약한 참고로만 두고 이번 분석가 데이터를 우선하세요.";
  }
  if (days <= 1) {
    return "1일 이내의 최신 결론이라 현재 시장 상황과 거의 동일합니다. 비교 기준으로 유효하되 그대로 답습하지 말고 이번 데이터로 재검증하세요.";
  }
  if (days <= 7) {
    return `${days}일 경과했습니다. 그 사이 가격·뉴스·수급이 달라졌을 수 있으니 이전 결론은 비교용으로만 쓰고 이번 분석가 데이터로 반드시 재검증하세요.`;
  }
  return `${days}일 경과해 시점이 오래됐습니다. 시장 상황이 크게 바뀌었을 수 있으므로 이전 결론은 약한 참고로만 두고, 이번 분석가 데이터를 결정의 1차 근거로 삼으세요.`;
}

function formatPreviousDecisionContext(
  previous: Awaited<ReturnType<typeof getLatestAIDecision>>,
): string {
  if (!previous) return "";
  const { decision, sentiment, provider, updatedAt } = previous;
  const target = decision.target_pct == null
    ? "없음"
    : `${decision.target_pct > 0 ? "+" : ""}${decision.target_pct}%`;
  const sentimentText = sentiment
    ? `\n- 당시 SNS 감성: ${COPY.sentiment.bandLabel[sentiment.band]} / ${sentiment.score}/10 / 신뢰도 ${sentiment.confidence}`
    : "";

  const elapsed = formatElapsedSince(updatedAt);

  return `\n\n[이전 Portfolio Manager 결론 — 보조 참고·비교 자료]
- 분석 시각: ${updatedAt} (${elapsed.label})
- 사용 AI: ${COPY.provider[provider]}
- verdict: ${decision.verdict}
- confidence: ${decision.confidence}
- target_pct: ${target}
- stop_loss_pct: ${decision.stop_loss_pct}%
- 단기 전망: ${decision.short_term_outlook}
- 중기 전망: ${decision.mid_term_outlook}
- 기존 판단 근거: ${decision.reasoning}${sentimentText}

위 이전 결론 활용 원칙 (Portfolio Manager 전용):
1) 시점 가중 — ${recencyGuide(elapsed.days)}
2) 편향 방지 — 이전 결론은 보조 신호일 뿐입니다. 이번 분석의 기술·뉴스·펀더멘털·심리 분석가 데이터와 강세/약세 토론·리스크 3팀 평가를 1차 근거로 종합해 독립적으로 판단하고, 이전 verdict에 앵커링(고정·답습)하지 마세요.
3) 객관 평가 — 데이터가 방향을 명확히 가리키면 확실한 결론을 내리되, 신호가 상충하거나 근거가 약하면 무리한 방향성 대신 관망(HOLD/UNDERWEIGHT)도 정당한 결론입니다.
4) 변화 설명 — 이전과 결론이 유지·강화·약화·변경됐는지 reasoning에 명시하고, 달라졌다면 어떤 새 데이터 때문인지 이유를 분명히 쓰세요.`;
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

/** 결정론 시그널 엔진 결과를 저장·표시용 압축본으로 변환 (axes[].hits 등 무거운 필드 제거). */
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

  // Body: { ticker, provider?, startFrom?, state? }
  const body = await req.json().catch(() => null) as {
    ticker?: unknown;
    provider?: unknown;
    startFrom?: unknown;
    state?: unknown;
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

  // 토큰 사용량 이력에서 이 분석 1회(12 agent)를 묶는 키. 재개 시에도 새 run 으로 집계.
  const runId = crypto.randomUUID();

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

  if (!isKisConfigured()) {
    return NextResponse.json({ error: "KIS API가 설정되지 않아 시그널을 계산할 수 없어요." }, { status: 400 });
  }

  const previousDecision = await getLatestAIDecision(ticker);
  const previousDecisionContext = formatPreviousDecisionContext(previousDecision);

  // 클라이언트 disconnect + 서버 타임아웃 통합 signal
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), TIMEOUT_TOTAL_MS);
  const combinedSignal = AbortSignal.any
    ? AbortSignal.any([req.signal, timeoutController.signal])
    : timeoutController.signal;

  // 스트림이 cancel(클라이언트 disconnect)·정상 종료로 닫혔는지 추적.
  // 클라이언트가 분석 도중 페이지를 떠나면 cancel()이 먼저 컨트롤러를 닫는데,
  // start() 비동기 본문은 Promise.allSettled 단계를 빠져나오며 계속 흐르다 controller.close()를
  // 다시 호출해 ERR_INVALID_STATE를 던졌다 → 닫힘 여부를 플래그로 가드한다.
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: AIAnalysisEvent) => {
        if (closed) return;
        try { controller.enqueue(sseEvent(event)); } catch { /* closed */ }
      };
      const safeClose = () => {
        if (closed) return;
        closed = true;
        try { controller.close(); } catch { /* 이미 cancel로 닫힘 */ }
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
          safeClose();
          return;
        }

        const sorted = [...candles].sort((a, b) => a.date.localeCompare(b.date));
        const signalResult = evaluateSignal(sorted);

        if (!signalResult.warmupOk) {
          send({ type: "error", message: "데이터가 부족해 분석할 수 없어요. (최소 90봉 필요)" });
          safeClose();
          return;
        }

        // 신선도 가드 — 최신 봉이 STALE_MAX_BUSINESS_DAYS(영업일) 초과 노후면 옛 가격 분석 방지
        // (콜드스타트·휴장). 영업일 기준이라 주말·연휴 직후 정상 데이터를 오탐하지 않는다.
        const latestCandleDate = sorted[sorted.length - 1]?.date; // "YYYY-MM-DD"
        if (latestCandleDate) {
          const latest = new Date(`${latestCandleDate}T00:00:00`);
          if (!Number.isNaN(latest.getTime())) {
            const staleBusinessDays = businessDaysBetween(latest, today);
            if (staleBusinessDays > STALE_MAX_BUSINESS_DAYS) {
              aiLog.warn(`시세 노후 — 최신봉 ${latestCandleDate} (${staleBusinessDays}영업일 경과)`);
              send({ type: "error", message: "최신 시세를 불러오지 못해 분석을 중단했어요. 잠시 후 다시 시도해 주세요." });
              safeClose();
              return;
            }
          }
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

        // 데이터 제한(90~130봉) — 장기추세 미확보 경고를 시그널 요약 머리에 주입하고
        // PM 에 직접 전달(reasoning 불확실성 명시 + verdict confidence ≤ MEDIUM 캡 지시).
        if (signalResult.limitedData) {
          const warning =
            `⚠️ 데이터 제한: 거래일 ${signalResult.bars}봉(< 130봉)으로 장기추세(120일선·정배열·레짐)가 미확보되었습니다. ` +
            `단기·중기 지표 기반이므로 결론의 불확실성이 큽니다. ` +
            `confidence 는 LOW/MEDIUM 로 제한하고 reasoning 에 데이터 부족을 명시하세요.`;
          state.signalSummary = `${warning}\n\n${state.signalSummary}`;
          state.dataWarning = warning;
          aiLog.warn(`데이터 제한 분석 — ${ticker} ${signalResult.bars}봉(limitedData)`);
        }

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
          aiLog(`↩ 재개: ${startFrom}(index=${startIndex})부터`);
        }

        // ── 공통 헬퍼: 일반 에이전트 1개 실행 ─────────────────────────────
        async function runOneAgent(agentKey: AgentKey): Promise<"ok" | "aborted" | "error"> {
          if (combinedSignal.aborted) return "aborted";

          const prompts = AGENT_PROMPTS[agentKey];
          aiLog(`▶ ${agentKey} 시작`);
          send({ type: "progress", agent: agentKey, status: "running" });

          const agentT0 = Date.now();
          let text: string;
          let usage: AgentUsage;
          try {
            const result = await invokeAgentCliStream(provider, {
              systemPrompt: agentKey === "portfolio_manager"
                ? prompts.system + previousDecisionContext
                : prompts.system,
              userPrompt: prompts.user(state),
              tools: prompts.tools,
              timeoutMs: prompts.timeoutMs,
              effort: prompts.effort,
              model: prompts.model,
            }, combinedSignal, (token) => {
              send({ type: "stream", agent: agentKey, chunk: token });
            });
            text = result.text;
            usage = result.usage;
          } catch (err) {
            const errName = (err as { name?: string }).name;
            if (errName === "AbortError") {
              aiLog(`중지 — ${agentKey}`);
              return "aborted";
            }
            if (errName === "TimeoutError") {
              aiLog.warn(`⏱ ${agentKey} 타임아웃 elapsed=${((Date.now()-agentT0)/1000).toFixed(1)}s`);
            } else {
              aiLog.error(`✗ ${agentKey}`, err);
            }
            send({ type: "progress", agent: agentKey, status: "error" });
            return "error";
          }

          aiLog(`✓ ${agentKey} 완료 len=${text.length} elapsed=${((Date.now()-agentT0)/1000).toFixed(1)}s`);

          // 토큰 사용량 이력 append (fail-soft — 분석 스트림을 막지 않음)
          recordAgentUsage({
            runId,
            ticker,
            agentKey,
            stage: STAGE_BY_AGENT[agentKey],
            round: null,
            provider,
            usage,
            model: usage.model ?? prompts.model ?? null,
            durationMs: Date.now() - agentT0,
          });

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
                const saveResult = await upsertAIDecision({
                  ticker,
                  provider,
                  decision: finalDecision,
                  sentiment: state.sentiment ?? null,
                  signal: toDecisionSignal(signalResult),
                });
                if (saveResult.skipped) {
                  aiLog("PM 결론 저장 skip — Supabase 미설정");
                } else if (!saveResult.ok) {
                  aiLog.warn(`PM 결론 저장 실패 — ${saveResult.error}`);
                }

                // 채점 원장 append (PRD signal-scorecard §3-1 / §8.2) — 결정시점 가격 캡처.
                // entry = signal.asOf 봉의 종가(D2). asOf 봉을 못 찾으면 마지막 봉 종가로 폴백.
                // fail-soft — 실패해도 SSE 분석 스트림을 막지 않는다(upsertAIDecision 패턴 동일).
                const asOfBar = sorted.find((c) => c.date === signalResult.asOf);
                const entryClose = asOfBar?.close ?? sorted[sorted.length - 1]?.close ?? 0;
                if (entryClose > 0) {
                  const scoreResult = await insertScorecardRow({
                    ticker,
                    provider,
                    verdict: finalDecision.verdict,
                    decisionConfidence: finalDecision.confidence,
                    signalScore: signalResult.score,
                    signalAction: signalResult.action,
                    targetPct: finalDecision.target_pct,
                    stopLossPct: finalDecision.stop_loss_pct,
                    entryClose,
                    entryDate: signalResult.asOf,
                    livePrice: priceData?.price ?? null,
                    decidedAt: new Date().toISOString(),
                    runId,
                  });
                  if (scoreResult.skipped) {
                    aiLog("채점 원장 append skip — Supabase 미설정");
                  } else if (!scoreResult.ok) {
                    aiLog.warn(`채점 원장 append 실패 — ${scoreResult.error}`);
                  }
                } else {
                  aiLog.warn("채점 원장 append skip — entry 종가 캡처 실패");
                }
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
              aiLog("social 감성 블록 파싱 실패 — 배지 미표시, 분석 계속");
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
            aiLog(`▶ 분석가 ${toRun.join("+")} 병렬 시작`);
            await Promise.allSettled(toRun.map(k => runOneAgent(k)));
          }
        }

        // ── Phase B: 토론 (bull → bear × DEBATE_ROUNDS) ─────────────────────
        if (!combinedSignal.aborted && AGENT_ORDER.indexOf("bull") >= startIndex) {
          aiLog(`▶ 토론 시작 (${DEBATE_ROUNDS}라운드)`);
          const result = await runDebateLoop(state, send, combinedSignal, provider, runId, ticker);
          if (result === "aborted") {
            aiLog("토론 중단 (abort)");
          }
        }

        // ── Phase C: 매니저 체인 ─────────────────────────────────────────────
        // C-1: research_manager
        if (!combinedSignal.aborted && AGENT_ORDER.indexOf("research_manager") >= startIndex) {
          const r = await runOneAgent("research_manager");
          if (r === "aborted") {
            send({ type: "done" }); safeClose(); clearTimeout(timeoutId); return;
          }
        }

        // C-2: trader (effort: high)
        if (!combinedSignal.aborted && AGENT_ORDER.indexOf("trader") >= startIndex) {
          const r = await runOneAgent("trader");
          if (r === "aborted") {
            send({ type: "done" }); safeClose(); clearTimeout(timeoutId); return;
          }
        }

        // C-3: risk 3개 병렬 (TradingAgents Risk Management — Risky/Neutral/Safe)
        if (!combinedSignal.aborted && AGENT_ORDER.indexOf("risk_risky") >= startIndex) {
          aiLog("▶ risk 3개 병렬 시작");
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

        aiLog(`전체 완료 total=${((Date.now()-runStart)/1000).toFixed(1)}s`);
        send({ type: "done" });
        safeClose();
      } catch (err) {
        // 클라이언트 disconnect(closed)·abort로 인한 예외는 정상 종료로 간주 — 에러 노이즈 억제.
        if (closed || combinedSignal.aborted || (err as { name?: string })?.name === "AbortError") {
          aiLog("스트림 종료 (disconnect/abort)");
        } else {
          aiLog.error("예상치 못한 예외", err);
          send({ type: "error", message: "분석 중 예상치 못한 오류가 발생했어요." });
        }
        safeClose();
      } finally {
        clearTimeout(timeoutId);
      }
    },
    cancel() {
      // 클라이언트 disconnect → 컨트롤러는 이미 닫힘. 이후 start() 본문의 send/close가
      // ERR_INVALID_STATE를 던지지 않도록 플래그를 세우고 진행 중 작업을 중단한다.
      closed = true;
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

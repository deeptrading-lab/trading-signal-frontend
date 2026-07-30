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
import { isKisConfigured, fetchStockPrice, fetchInvestorTrend, getSymbolName } from "@/lib/api/kis";
import { fetchDailyChunked } from "@/lib/api/kis/chartChunked";
import { evaluateSignal } from "@/lib/signal/engine";
import { AXIS_LABEL, ruleLabel } from "@/lib/copy/signal/labels";
import type { AxisScore, SignalResult } from "@/lib/types/signal";
import type { StockPrice, StockDailyCandle } from "@/lib/api/kis/types";
import type { StockInvestorTrend } from "@/lib/types/stock/investors";
import { fetchActiveWarnings } from "@/lib/api/toss/warnings";
import type { StockWarningItem } from "@/lib/types/stock/warnings";
import { warningLabel } from "@/lib/copy/stock/warnings";
import type {
  AgentKey,
  AgentFailReason,
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
import { AGENT_ORDER } from "@/lib/types/stock/aiAnalysis";
import { invokeAgentCliStream } from "@/lib/server/ai/agentCli";
import {
  getLatestAIDecision,
  upsertAIDecision,
} from "@/lib/server/ai/decisionStore";
import {
  insertScorecardRow,
  getAllScorecardRows,
} from "@/lib/server/scorecard/scorecardStore";
import { summarizeScorecard } from "@/lib/server/scorecard/summarize";
import { buildScorecardFeedbackSummary } from "@/lib/server/scorecard/calibration";
import { resolveBenchCode } from "@/lib/server/scorecard/relativeRunScoring";
import { isScorecardFeedbackPromptEnabled } from "@/lib/server/scorecard/constants";
import { getLatestMarketAnalysis } from "@/lib/server/marketAnalysisStore";
import {
  buildMarketContextBlock,
  isMarketAnalysisFresh,
} from "@/lib/market/analysisContext";
import { recordAgentUsage } from "@/lib/server/ai/agentUsageStore";
import { computePriceLevels } from "@/lib/signal/levels/priceLevels";
import type { PriceLevels } from "@/lib/signal/levels/priceLevels";
import { formatPriceLevelsForPrompt } from "@/lib/signal/levels/formatPriceLevels";
import { checkReentryAnchor } from "@/lib/signal/levels/validateReentry";
import {
  normalizeConfidence,
  normalizeTimeHorizon,
} from "@/lib/server/ai/normalizeDecisionEnums";
import { tryAcquire, release } from "@/lib/server/ai/concurrencyGate";
import {
  startProcessing,
  markDone,
  markFailed,
  setJobName,
  enqueueAnalysis,
  getQueueDepth,
} from "@/lib/server/ai/queueStore";
import type { AnalysisJobSource } from "@/lib/types/stock/analysisQueue";
import { pickStockName } from "@/lib/utils/resolveStockName";
import { isVercelEnv } from "@/lib/server/env";
import { createLogger } from "@/lib/server/logTag";
import { AGENT_PROMPTS, runDebateLoop, TIMEOUT_TOTAL_MS } from "@/lib/prompts/stock/aiAnalysis";
import type { AnalysisState } from "@/lib/prompts/stock/aiAnalysis";
import { resolveAnalysisConfig, type AnalysisConfigOverride } from "@/lib/server/ai/analysisConfig";
import { recordAbRunConfig } from "@/lib/server/ai/abRunConfigStore";
import { businessDaysBetween } from "@/lib/utils/businessDays";

/** 토큰 사용량 집계용 단계 분류: A=분석가, B=토론, C=매니저 체인. */
const STAGE_BY_AGENT: Record<AgentKey, "A" | "B" | "C"> = {
  market: "A", news: "A", fundamentals: "A", social: "A",
  bull: "B", bear: "B",
  research_manager: "C", trader: "C",
  risk_risky: "C", risk_neutral: "C", risk_safe: "C",
  portfolio_manager: "C",
};

/**
 * 분석용 일봉 조회 창(캘린더일). 200일(≈134봉)에서 **365일(≈245봉)** 로 확대.
 *
 * 200일 창의 문제(실측): ① 반년 전 형성된 매물대가 통째로 안 잡혀 "아래 매물대 공백"으로 오판
 * (두산에너빌리티 — 1년 창에선 현재가 자리에 비중 10%대 매물대가 잡히는데 200일 창에선 0건),
 * ② 현재가가 창 안 최저면 되돌릴 파동이 없어 피보나치가 아예 생성되지 않음,
 * ③ 120일선 신뢰도와 limitedData 임계(130봉)에 여유가 없음(실측 bars 131~134로 턱걸이).
 * ④ **레짐 veto 상시 무력화** — computeRegime 은 SMA120[i-20] 을 보므로 **최소 140봉**이 필요한데
 * 200일 창은 134봉이라 전 종목 regime=0(중립)으로 고정됐다(= 약세 레짐에서 BUY 를 막는 안전장치가
 * 죽어 있었다). 365일에서 실제로 살아난다(실측 두산에너빌리티 regime 0 → -1).
 * 원시 봉은 프롬프트에 실리지 않고 파생 지표로만 요약되므로 토큰 증가는 미미하다.
 * 부수 효과: 52주 고저(candles.slice(-252))도 200일 창에선 실질 6.5개월 고저였던 것이 제 이름값을 찾는다.
 */
const CHART_DAYS = 365;
/**
 * 최신 일봉이 기준일로부터 이 **영업일(평일)** 수를 초과해 노후하면 분석 조기 중단
 * (콜드스타트·휴장 옛 가격 방지). 주말은 카운트에서 제외되고, 긴 연휴의 소수 공휴일은
 * 이 마진(7)이 흡수한다 — 설·추석 연휴(공휴일 ~3평일)에도 임계 미만이라 오탐 없음.
 */
const STALE_MAX_BUSINESS_DAYS = 7;
// 전체 상한은 단계별 상한과 한곳에서 관리한다(둘의 대소가 불변식 — aiAnalysis.ts 참조).

/**
 * 봇 SSE 통로 대기 파라미터. 봇 요청이 꽉 찬 슬롯을 만나면 연결을 끊지 않고(429 대신) 큐에 적재한 뒤
 * 슬롯을 폴링하며 기다린다 — QUEUE_POLL_MS 마다 재점유 시도, QUEUED_REFRESH_MS 마다 순번(queued) 갱신.
 * ETA = 순번 × MINUTES_PER_ANALYSIS (러프 오버에스티메이트, 3동시라 실제론 더 빠를 수 있음).
 */
const QUEUE_POLL_MS = 2_000;
const QUEUED_REFRESH_MS = 15_000;
const MINUTES_PER_ANALYSIS = 10;


// ─── SSE 헬퍼 ─────────────────────────────────────────────────────────────────

const encoder = new TextEncoder();

/** `[ai-analysis]` 콘솔 로그 — 앞에 `HH:MM:SS.mmm(KST)` 시각 프리픽스 부착. */
const aiLog = createLogger("ai-analysis");

function sseEvent(data: AIAnalysisEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}


// ─── JSON 파싱 헬퍼 (Portfolio Manager 응답) ─────────────────────────────────

/** 문자열 리터럴 내부 brace 를 무시하고 첫 완결 `{...}` 객체를 추출(prose 가 앞뒤로 섞여도). */
function extractBalancedObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0, inStr = false, esc = false;
  for (let k = start; k < text.length; k++) {
    const ch = text[k];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return text.slice(start, k + 1);
  }
  return null;
}

/** LLM JSON 흔한 흠 — `}`·`]` 앞 trailing comma 제거. */
function stripTrailingCommas(s: string): string {
  return s.replace(/,(\s*[}\]])/g, "$1");
}

function parseLooseJson(raw: string): unknown | null {
  const text = raw.trim();
  if (!text) return null;
  const candidates: string[] = [text];
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence?.[1]) candidates.push(fence[1].trim());
  // 균형 중괄호 추출(문자열 내부 brace 무시) — prose 혼입·뒤따르는 stray brace 에 강하다.
  const balanced = extractBalancedObject(text);
  if (balanced) candidates.push(balanced);
  // 폴백: 첫 { ~ 마지막 }
  const i = text.indexOf("{"), j = text.lastIndexOf("}");
  if (i !== -1 && j > i) candidates.push(text.slice(i, j + 1));
  for (const c of candidates) {
    const stripped = stripTrailingCommas(c);
    const variants = stripped === c ? [c] : [c, stripped];
    for (const variant of variants) {
      try { return JSON.parse(variant); } catch { /* next */ }
    }
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
      .map((h) => h.detail ? `${ruleLabel(h.key)}(${h.detail})` : ruleLabel(h.key))
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
  warnings: StockWarningItem[],
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

  // 매수 유의(거래소 시장경보·VI, PRD stock-warnings §3-2) — 활성 항목이 있을 때만 1줄.
  //   빈 배열이면 줄 자체가 없어 기존 프롬프트와 동일(무회귀). 라벨 중복(VI 계열)은 Set 제거.
  if (warnings.length > 0) {
    const labels = [...new Set(warnings.map((w) => warningLabel(w.warningType)))];
    lines.push(
      `⚠️ 매수 유의(거래소 시장경보): ${labels.join(", ")} — 현재 지정/발동 중입니다. 결론(verdict)과 리스크 평가에 반드시 반영하세요.`,
    );
  }

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

  // acquire 성공당 정확히 1번만 release 되도록 멱등 래퍼로 감싼다(중복 호출 안전).
  // ⚠️ `acquired` 가 true 일 때만 반납한다 — 봇은 슬롯을 스트림 본문에서 뒤늦게 점유하므로,
  //    점유 전(대기 중 취소·검증 실패)에 release 를 부르면 남의 슬롯을 깎는 조기반납이 된다.
  let acquired = false;
  let slotReleased = false;
  const releaseSlot = (): void => {
    if (slotReleased || !acquired) return;
    slotReleased = true;
    release();
  };

  // Body: { ticker, provider?, startFrom?, state?, runId?, config?, jobId?, source?, name? }
  // runId·config 는 A/B 하니스 전용(일반 클라이언트는 안 보냄). 미주입 시 기존 동작.
  const body = await req.json().catch(() => null) as {
    ticker?: unknown;
    provider?: unknown;
    startFrom?: unknown;
    state?: unknown;
    runId?: unknown;
    config?: unknown;
    session?: unknown;
    configId?: unknown;
    configLabel?: unknown;
    jobId?: unknown;   // prod 워커가 claim 한 queue 행 id(있으면 핸들러는 종결 안 함 — owned=false)
    source?: unknown;  // 작업 출처(prod/local/bot). 미전달 시 local(직접 실행)
    name?: unknown;    // 봇이 넘기는 종목명 — 대기 카드가 종목번호 대신 종목명 즉시 표시(없으면 분석 시작 시 patch)
  } | null;

  if (!body || typeof body.ticker !== "string") {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }

  const ticker = body.ticker.trim().replace(/[^A-Za-z0-9_-]/g, "");
  if (!ticker) {
    return NextResponse.json({ error: "ticker가 필요합니다." }, { status: 400 });
  }

  // 작업 출처 — 봇만 "열린 SSE 통로 대기" 경로를 쓴다(꽉 차면 429 대신 큐 적재 + queued 이벤트 후 슬롯 대기).
  // 브라우저 로컬(local)·프로드 워커(prod)는 기존대로 즉시 점유하고, 꽉 차면 429 로 거절한다(무변경).
  const jobSource: AnalysisJobSource =
    body.source === "prod" || body.source === "bot" ? body.source : "local";
  const isBotWait = jobSource === "bot";
  const reqName =
    typeof body.name === "string" && body.name.trim() ? body.name.trim() : null;

  // 전역 동시성 세마포어(PRD §3-5) — 503 가드 다음, 분석 시작 전에 슬롯을 점유한다.
  // 비봇(브라우저·워커)은 여기서 즉시 점유하고, 꽉 차면 429/busy 로 거절한다.
  // 봇은 점유를 스트림 본문으로 미룬다 — 꽉 차 있어도 연결을 끊지 않고 대기(queued)한 뒤 슬롯이 나면 점유.
  // ⚠️ 세마포어는 순수 카운터(요청 데이터 0). 격리 원칙(AC-8)은 concurrencyGate 모듈이 보장.
  if (!isBotWait) {
    if (!tryAcquire()) {
      return NextResponse.json(
        {
          error: "busy",
          retryable: true,
          message: "지금 분석이 가득 찼어요. 잠시 후 다시 시도해 주세요.",
        },
        { status: 429 },
      );
    }
    acquired = true;
  }

  const rawProvider = body.provider ?? "claude";
  if (rawProvider !== "claude" && rawProvider !== "codex") {
    releaseSlot();
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

  // 토큰 사용량 이력에서 이 분석 1회(12 agent)를 묶는 키.
  // 하니스가 미리 생성한 runId 를 신규 실행에 한해 사용(재개 시엔 무시하고 새 UUID — 기존 정책 유지).
  const runId =
    !startFrom && typeof body.runId === "string" && body.runId.trim()
      ? body.runId.trim()
      : crypto.randomUUID();

  // 런타임 토큰 최적화 config(A/B 하니스 전용). override 없으면 DEFAULT = 현 동작 무변경.
  const configOverride: AnalysisConfigOverride | null =
    body.config && typeof body.config === "object"
      ? (body.config as AnalysisConfigOverride)
      : null;
  const analysisConfig = resolveAnalysisConfig(configOverride);

  // A/B 하니스 태깅(session 있을 때만). run_id ↔ config 매핑을 ab_run_config 에 1행 기록(fail-soft).
  const abSession =
    typeof body.session === "string" && body.session.trim() ? body.session.trim() : null;
  const abConfigId =
    typeof body.configId === "string" && body.configId.trim() ? body.configId.trim() : "default";
  const abConfigLabel = typeof body.configLabel === "string" ? body.configLabel : null;

  // 이전 실행 결과 (재개 시)
  const preState: ResumeState = (body.state && typeof body.state === "object")
    ? body.state as ResumeState
    : {};

  if (!isKisConfigured()) {
    releaseSlot();
    return NextResponse.json({ error: "KIS API가 설정되지 않아 시그널을 계산할 수 없어요." }, { status: 400 });
  }

  const previousDecision = await getLatestAIDecision(ticker);
  const previousDecisionContext = formatPreviousDecisionContext(previousDecision);

  // 과거 판정 성적 주입(scorecard-feedback (나)) — **플래그 OFF(기본)면 완전 skip**.
  // OFF 면 DB 조회·문자열 조립을 아예 하지 않아 프롬프트·비용 모두 무변경(무회귀).
  // ON 이라도 n≥MIN_SAMPLE_N 버킷이 없으면 빌더가 빈 문자열 반환 → 주입 안 함(graceful no-op).
  // 무거운 분석은 로컬 Claude CLI 라 토큰 과금 아님 → 주입 추가 비용 ~0.
  let scorecardFeedbackContext = "";
  if (isScorecardFeedbackPromptEnabled()) {
    try {
      const rows = await getAllScorecardRows();
      scorecardFeedbackContext = buildScorecardFeedbackSummary(summarizeScorecard(rows));
      if (scorecardFeedbackContext) {
        aiLog("PM 프롬프트에 과거 판정 성적 주입(scorecard-feedback ON)");
      }
    } catch (error) {
      // 성적 조회 실패는 분석을 막지 않는다(fail-soft) — 주입만 skip.
      aiLog.warn("과거 판정 성적 조회 실패 — 주입 skip", error);
    }
  }

  // 시황 컨텍스트 주입(market-context, Phase 3) — **항상 시도**(별도 토글 없음).
  // 주입 원천은 Phase 2 가 저장한 `?mode=latest` 본(읽기 1회·CLI 0콜) → 종목분석 latency 무증가.
  // 신선도 가드: 저장본이 MARKET_CONTEXT_MAX_AGE_HOURS 초과로 묵으면 주입 skip — 며칠 전 국면을
  // "현재 시장"으로 오판하는 걸 막는다(Phase 4 cron 도입 시 항상 신선해 사실상 항상 주입).
  // fail-soft: 미설정/조회실패/저장본없음/노후 → 빈 문자열 → 주입 skip(분석 안 막음).
  let marketContext = "";
  try {
    const latest = await getLatestMarketAnalysis();
    if (!latest) {
      aiLog("시황 컨텍스트 주입 skip — 저장된 시황 분석 없음");
    } else if (!isMarketAnalysisFresh(latest.analysis.asOf, new Date())) {
      aiLog(`시황 컨텍스트 주입 skip — 저장본 노후(asOf=${latest.analysis.asOf})`);
    } else {
      marketContext = buildMarketContextBlock(latest.analysis, { dataSource: latest.dataSource });
      if (marketContext) aiLog("시황 컨텍스트 주입(market-context)");
    }
  } catch (error) {
    aiLog.warn("시황 컨텍스트 조회 실패 — 주입 skip", error);
  }

  // 클라이언트 disconnect + 서버 타임아웃 통합 signal
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), TIMEOUT_TOTAL_MS);
  const combinedSignal = AbortSignal.any
    ? AbortSignal.any([req.signal, timeoutController.signal])
    : timeoutController.signal;

  // A/B 하니스: session 지정 시 이 run 을 config 로 태깅(fail-soft, 분석 비차단).
  if (abSession) {
    recordAbRunConfig({
      runId,
      session: abSession,
      configId: abConfigId,
      configLabel: abConfigLabel,
      ticker,
      params: configOverride,
    });
  }

  // unified-analysis-jobs: 이 실행을 queue 에 processing 으로 기록(/analyze 인플라이트 트래킹).
  // prod 워커가 jobId·source:'prod' 를 넘기면 그 행 재사용·종결은 워커(owned=false, 중복 행 방지 G4).
  // 로컬/봇 직접 실행은 핸들러가 행 insert·종결(owned=true). fail-soft — 미설정/컬럼 미적용 시 미기록.
  const callerJobId =
    typeof body.jobId === "number" && Number.isFinite(body.jobId) ? body.jobId : null;
  // 비봇: 슬롯을 이미 점유했으니 지금 processing 기록. 봇: 슬롯 대기 후 스트림 본문에서 기록(아래 prelude).
  let job: { jobId: number | null; owned: boolean } = { jobId: null, owned: false };
  if (!isBotWait) {
    job = await startProcessing({ ticker, source: jobSource, jobId: callerJobId });
  }
  // 봇 대기 경로가 적재한 pending 행 id — 대기 중 취소 시 정리(‘대기중’ 카드 제거)에 쓴다.
  let botWaitRowId: number | null = null;
  // owned 작업 종결 분기 — 실제 에러면 failed, 그 외(성공·사용자 중지)면 done(아래 finally).
  let jobFailed = false;

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

      // ── 봇 SSE 통로 대기 prelude ──────────────────────────────────────────────
      // 봇 요청은 슬롯이 꽉 차 있어도 429 로 끊지 않는다. 대신 이 열린 연결 위에서:
      //   ① pending 적재(/analyze '대기중' 카드) ② queued 이벤트로 순번 안내(주기 갱신)
      //   ③ 슬롯이 나면 점유 → processing 전이 → 아래 라이브 스트림이 같은 연결로 그대로 이어진다.
      // 프론트가 큐를 100% 소유하고, 봇은 이 이벤트들을 Slack 에 중계만 한다.
      if (isBotWait && !acquired) {
        if (tryAcquire()) {
          acquired = true; // 빈 슬롯 즉시 확보 — 대기 없이 바로 분석(start-now).
        } else {
          // 꽉 참 → 큐 적재(카드=대기중) + 순번 안내. 슬롯이 날 때까지 이 연결을 유지한다.
          const enq = await enqueueAnalysis({ ticker, name: reqName, source: "bot" });
          // 내가 새로 적재한(queued) 행일 때만 소유·정리 대상으로 잡는다. already(같은 ticker 를 다른 소스가
          // 이미 분석 중)면 그 행은 남의 것 — abort 시 markFailed 로 남의 라이브 분석 행을 오종결하면 안 되므로 null.
          botWaitRowId = enq.status === "queued" ? enq.id ?? null : null;
          const emitQueued = async (): Promise<void> => {
            const depth = await getQueueDepth().catch(() => 0);
            const position = Math.max(1, depth);
            send({ type: "queued", position, etaMinutes: position * MINUTES_PER_ANALYSIS });
          };
          await emitQueued();
          const posTimer = setInterval(() => { void emitQueued(); }, QUEUED_REFRESH_MS);
          try {
            // 슬롯 폴링 — 다른 분석이 끝나 releaseSlot 로 카운터가 내려가면 다음 폴에서 점유.
            while (!combinedSignal.aborted && !tryAcquire()) {
              await new Promise((r) => setTimeout(r, QUEUE_POLL_MS));
            }
          } finally {
            clearInterval(posTimer);
          }
          if (combinedSignal.aborted) {
            // 대기 중 봇 연결 종료(disconnect)·타임아웃 → 적재한 pending 행 정리('대기중' 카드 제거) 후 조용히 종료.
            // 아래 try/finally 를 타지 않는 early-return 이므로 타임아웃 타이머를 여기서 직접 정리한다(슬롯은 미점유라 반납 불요).
            if (botWaitRowId != null) await markFailed(botWaitRowId, "대기 중 연결 종료");
            clearTimeout(timeoutId);
            safeClose();
            return;
          }
          acquired = true;
        }
        // 슬롯 확보 — 봇 작업을 processing 으로 기록(적재해 둔 pending 행 재사용). owned=true → 아래 finally 가 종결.
        job = await startProcessing({ ticker, source: "bot" });
      }

      const state: AnalysisState = {
        ticker,
        signalSummary: "",
        priceContext: "",
        // 시황 컨텍스트(Phase 3) — 저장본 없음/노후(>24h)/조회실패 시 빈 문자열(무주입·무영향).
        marketContext,
        // 런타임 토큰 최적화 config(A/B 하니스). 미주입이면 DEFAULT = 현 동작 무변경.
        config: analysisConfig,
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
      // 가격 레벨 — 프롬프트 주입과 **재진입가 검증**이 같은 값을 써야 해서 바깥 스코프에 둔다.
      let priceLevels: PriceLevels | null = null;
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

        // 2. 가격·수급·시장경보 컨텍스트 — 병렬 페치 (실패해도 분석 계속) ──────────────
        //    warnings 는 토스 전용(키 없으면 빈 배열, never-throw) — PRD stock-warnings §3-2.
        const [priceSettled, investorSettled, warningsSettled] = await Promise.allSettled([
          fetchStockPrice(ticker),
          fetchInvestorTrend(ticker),
          fetchActiveWarnings(ticker),
        ]);
        const priceData = priceSettled.status === "fulfilled" ? priceSettled.value : null;
        const investorData = investorSettled.status === "fulfilled" ? investorSettled.value : null;
        const warningsData = warningsSettled.status === "fulfilled" ? warningsSettled.value : [];
        state.priceContext = formatPriceContextForPrompt(sorted, signalResult, priceData, investorData, warningsData);

        // 가격 레벨(이동평균·볼린저·피보나치·매물대 배치) **실측값** 주입 — 없으면 모델이 레벨을
        // 추정해 서술하는 문제가 있었다(실측: "233,000원(20일선)" vs 실제 20일선 276,350원).
        // 매물대는 현재가 위/아래로 나눠 줘야 "더 빠질 자리가 남았는지"를 근거로 말할 수 있다.
        // 계산 결과는 프롬프트 주입 후에도 살려둔다 — PM 이 낸 재진입가가 실제 지지에 앵커됐는지
        // 검증하는 데 **같은 레벨**을 써야 하기 때문(추가 조회 0건).
        try {
          const levelPrice = priceData?.price ?? sorted[sorted.length - 1]?.close ?? 0;
          priceLevels = computePriceLevels(sorted, levelPrice);
          const levelsBlock = formatPriceLevelsForPrompt(priceLevels, levelPrice);
          if (levelsBlock) state.priceContext = `${state.priceContext}\n\n${levelsBlock}`;
        } catch (error) {
          aiLog.warn("가격 레벨 컨텍스트 생성 실패 — 레벨 없이 진행", error);
        }
        if (warningsData.length > 0) {
          aiLog(`시장경보 컨텍스트 주입 — ${warningsData.map((w) => w.warningType).join(",")}`);
        }

        // 분석 시점 종목명(decision-stock-name) — KIS 현재가 응답명 → 시드(symbols.json) 폴백 순.
        //   ⚠️ KIS inquire-price 의 hts_kor_isnm 은 prod 에서도 자주 비어 mapStockPrice 가 ticker 로 폴백한다
        //      (reference_kis-api-conventions §1). 화면 BFF(/api/stock/price)와 동일하게 getSymbolName 시드로 보강.
        //   ① 진행중 큐 행에 즉시 patch → /analyze 진행중 카드가 종목번호 대신 종목명 표시(깜빡임 제거, fire-and-forget).
        //   ② 아래 PM 결론 저장(upsertAIDecision) 시 함께 기록 → 완료 카드도 DB 에서 바로 종목명.
        const resolvedName = pickStockName(ticker, [
          priceData?.name,
          getSymbolName(ticker),
        ]);
        if (job.jobId != null && resolvedName) void setJobName(job.jobId, resolvedName);

        // 3. 에이전트 실행 — 3-phase ──────────────────────────────────────────
        const startIndex = startFrom ? AGENT_ORDER.indexOf(startFrom) : 0;
        if (startFrom) {
          aiLog(`↩ 재개: ${startFrom}(index=${startIndex})부터`);
        }

        // ── 공통 헬퍼: 에이전트 실패 로그/이벤트 표준화 ────────────────────
        // 모든 실패를 단일 포맷으로 통일 → 모니터링 grep 용이.
        //   "✗ 실패" = 전체 실패 / "reason=<사유>" = 케이스별 필터(timeout·cli-error·json-parse·verdict-invalid).
        // 사용자 중지(AbortError)는 실패가 아니라 별도(info)로 둔다.
        // reason 은 로그뿐 아니라 SSE progress 이벤트에도 실어 재시도 카드가 사유를 표시한다.
        function failAgent(
          agentKey: AgentKey,
          reason: AgentFailReason,
          detail = "",
          err?: unknown,
        ): "error" {
          const line = `✗ 실패 agent=${agentKey} reason=${reason}${detail ? ` ${detail}` : ""}`;
          // cli-error(예상 밖)만 스택까지 error 레벨. 예상된 실패(타임아웃·파싱·verdict)는 warn.
          if (err !== undefined) aiLog.error(line, err);
          else aiLog.warn(line);
          send({ type: "progress", agent: agentKey, status: "error", reason });
          return "error";
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
                ? prompts.system + previousDecisionContext + scorecardFeedbackContext
                : prompts.system,
              userPrompt: prompts.user(state),
              tools: prompts.tools,
              timeoutMs: prompts.timeoutMs,
              // config 오버라이드(하니스) 우선, 없으면 AGENT_PROMPTS 기본.
              effort: analysisConfig.effortByAgent?.[agentKey] ?? prompts.effort,
              model: analysisConfig.modelByAgent?.[agentKey] ?? prompts.model,
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
            const elapsed = `elapsed=${((Date.now() - agentT0) / 1000).toFixed(1)}s`;
            return errName === "TimeoutError"
              ? failAgent(agentKey, "timeout", elapsed)
              : failAgent(agentKey, "cli-error", elapsed, err);
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
                // enum 해석 실패를 로그로 드러낸다 — 조용한 폴백이 신호를 죽이던 회귀 재발 방지.
                const reportEnumFallback = (field: string, raw: unknown) =>
                  aiLog.warn(
                    `PM ${field} 해석 실패 — 기본값 사용(raw=${JSON.stringify(raw)}). 프롬프트/스키마 불일치 의심.`,
                  );
                const rawTarget = typeof d.target_pct === "number" ? d.target_pct : null;
                const rawStop = typeof d.stop_loss_pct === "number" ? d.stop_loss_pct : -5;
                // stop_loss_pct = 테제 무효화 라인. 방향은 verdict 가 단일 기준(LLM 부호 오류 무관):
                // 강세(BUY/OVERWEIGHT/HOLD)=하방 손절(음수), 약세(UNDERWEIGHT/REDUCE/SELL)=상방 무효화(양수).
                const isBearishVerdict =
                  d.verdict === "UNDERWEIGHT" || d.verdict === "REDUCE" || d.verdict === "SELL";
                const normalizedStop = isBearishVerdict ? Math.abs(rawStop) : -Math.abs(rawStop);

                // 약세 재진입가(target_pct)가 **실측 지지에 앵커됐는지** 서버가 강제한다.
                // 프롬프트에도 같은 규칙이 있지만 강제가 아니라, 무시되면 매물대 공백의 위험한
                // 가격이 차트 오버레이·터치 채점을 구동한다(실측: 두산 -13% = 55,400원).
                const decisionBase = priceData?.price ?? sorted[sorted.length - 1]?.close ?? null;
                const anchorCheck = checkReentryAnchor(
                  d.verdict as FinalDecision["verdict"],
                  rawTarget,
                  decisionBase,
                  priceLevels,
                );
                if (anchorCheck.checked && !anchorCheck.anchored) {
                  aiLog.warn(
                    `재진입가 앵커 실패 — target_pct=${rawTarget}% 무효화(null). ${anchorCheck.reason}`,
                  );
                }
                const enforcedTarget = anchorCheck.anchored ? rawTarget : null;
                const finalDecision: FinalDecision = {
                  verdict: d.verdict as FinalDecision["verdict"],
                  reasoning: typeof d.reasoning === "string" ? d.reasoning : "",
                  key_strengths: Array.isArray(d.key_strengths)
                    ? d.key_strengths.filter((x): x is string => typeof x === "string")
                    : [],
                  key_risks: Array.isArray(d.key_risks)
                    ? d.key_risks.filter((x): x is string => typeof x === "string")
                    : [],
                  // enum 은 관대 정규화(대소문자·한글 동의어 흡수) + 해석 불가 시 warn.
                  // 과거 정확일치 폴백이 조용히 기본값으로 덮어 confidence 100% MEDIUM ·
                  // time_horizon 100% 중기 로 신호가 죽어 있었다(normalizeDecisionEnums 주석 참조).
                  confidence: normalizeConfidence(d.confidence, reportEnumFallback),
                  time_horizon: normalizeTimeHorizon(d.time_horizon, reportEnumFallback),
                  new_entry_strategy: typeof d.new_entry_strategy === "string" ? d.new_entry_strategy : "",
                  holder_strategy: typeof d.holder_strategy === "string" ? d.holder_strategy : "",
                  target_pct: enforcedTarget,
                  stop_loss_pct: normalizedStop,
                  // 서버가 재진입가를 무효화했으면 사유를 남긴다(JSONB — 마이그레이션 불필요).
                  // 프롬프트 준수율 계측기 역할: 발동률이 낮으면 규칙이 잘 듣는 것이고,
                  // 높으면 프롬프트 문구 자체를 손봐야 한다는 신호.
                  ...(anchorCheck.checked && !anchorCheck.anchored
                    ? { target_pct_voided_reason: anchorCheck.reason }
                    : {}),
                  risk_reward_ratio: typeof d.risk_reward_ratio === "number" ? d.risk_reward_ratio : null,
                  // % 기준가 = LLM 에 넘긴 "현재가"(priceData?.price ?? 마지막 봉 종가). 절대가격 표기·재현용.
                  base_price: priceData?.price ?? sorted[sorted.length - 1]?.close ?? null,
                  // 분석 엔진 모델 — provider 별 base env 를 대표값으로 캡처(관리자 표시용, decision JSONB 무마이그레이션).
                  model:
                    (provider === "codex"
                      ? process.env.CODEX_CLI_MODEL
                      : process.env.CLAUDE_CLI_MODEL
                    )?.trim() || null,
                  short_term_outlook: typeof d.short_term_outlook === "string" ? d.short_term_outlook : "",
                  mid_term_outlook: typeof d.mid_term_outlook === "string" ? d.mid_term_outlook : "",
                  limitedData: signalResult.limitedData,
                  bars: signalResult.bars,
                };
                send({ type: "final", data: finalDecision });
                const saveResult = await upsertAIDecision({
                  ticker,
                  name: resolvedName,
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
                    benchKey: resolveBenchCode(ticker),
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
                // verdict 값이 6단계 화이트리스트에 없음 — 무표시 대신 에러로 표면화(재시도 카드 노출).
                send({ type: "report", agent: agentKey, content: text });
                return failAgent(
                  agentKey,
                  "verdict-invalid",
                  `verdict=${String(d.verdict)} len=${text.length}`,
                );
              }
            } else {
              // 결론 JSON 파싱 실패 — 무표시(블랙홀) 대신 에러로 표면화(재시도 카드 노출).
              send({ type: "report", agent: agentKey, content: text });
              return failAgent(agentKey, "json-parse", `len=${text.length}`);
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
          aiLog(`▶ 토론 시작 (${analysisConfig.debateRounds}라운드)`);
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
          jobFailed = true; // 실제 에러만 failed 로 종결(disconnect/abort 는 done 취급).
          send({ type: "error", message: "분석 중 예상치 못한 오류가 발생했어요." });
        }
        safeClose();
      } finally {
        clearTimeout(timeoutId);
        // 세마포어 반납 — 분석 본문이 정상완료/에러/abort(cancel→abort) 어느 경로로 끝나든
        // 이 finally 단일 지점을 지난다. 여기서만 반납해 누수·조기반납(서브프로세스 종료 전 반납)을 막는다.
        releaseSlot();
        // unified-analysis-jobs: 직접 실행(owned) queue 작업 종결. 실제 에러=failed, 그 외(성공·중지)=done.
        // owned 행을 processing 에 안 남겨 recoverStuck 의 워커 재투입(로컬 작업 오실행)을 막는다.
        // prod 워커 경로(owned=false)는 워커가 markDone/markFailed — 여기서 손대지 않는다(이중 종결 방지).
        if (job.owned && job.jobId != null) {
          void (jobFailed
            ? markFailed(job.jobId, "분석 중 오류로 종료됨")
            : markDone(job.jobId));
        }
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

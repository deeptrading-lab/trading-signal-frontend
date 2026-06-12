/**
 * `/api/stock/ai-analysis` — 8-에이전트 멀티에이전트 AI 분석 SSE 스트림.
 *
 * GET ?ticker=005930
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

import { spawn } from "node:child_process";
import readline from "node:readline";
import { NextRequest, NextResponse } from "next/server";
import { isKisConfigured } from "@/lib/api/kis";
import { fetchDailyChunked } from "@/lib/api/kis/chartChunked";
import { evaluateSignal } from "@/lib/signal/engine";
import { AXIS_LABEL } from "@/lib/copy/signal/labels";
import type { AxisScore } from "@/lib/types/signal";
import type { AgentKey, AIAnalysisEvent, FinalDecision, ResumeState } from "@/lib/types/stock/aiAnalysis";
import { AGENT_ORDER, DEBATE_ROUNDS } from "@/lib/types/stock/aiAnalysis";

const CHART_DAYS = 200;
// 8에이전트 순차 실행 최대 허용 시간 (40분)
// market(5m)+news(6m)+fundamentals(6m)+bull(5m)×2+bear(5m)×2+manager(5m)+risk(5m)+pm(3m) ≈ 45m 이론상한
// 실제 Opus 기준 평균은 절반 수준 → 40분으로 여유
const TIMEOUT_TOTAL_MS = 2_400_000;

// ─── Vercel guard ─────────────────────────────────────────────────────────────

function isVercelEnv(): boolean {
  return (
    process.env.VERCEL === "1" ||
    typeof process.env.VERCEL_ENV === "string" ||
    typeof process.env.NEXT_PUBLIC_VERCEL_ENV === "string"
  );
}

// ─── SSE 헬퍼 ─────────────────────────────────────────────────────────────────

const encoder = new TextEncoder();

function sseEvent(data: AIAnalysisEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

// ─── Claude CLI 호출 (spawn + stream-json, 토큰 단위 스트리밍) ──────────────

interface AgentCallOpts {
  systemPrompt: string;
  userPrompt: string;
  tools: string[];
  timeoutMs: number;
}

/**
 * Claude CLI를 spawn으로 실행, --output-format stream-json NDJSON을 한 줄씩 파싱.
 * onToken 콜백은 각 assistant 이벤트 도착 시 새 텍스트 부분을 forward.
 *
 * ⚠️ CLI는 응답 완료 후 전체 텍스트를 1개 assistant 이벤트로 emit — API 직접 호출처럼
 *    토큰 단위 스트리밍이 아님. result 이벤트가 최종 권위 텍스트.
 *
 * stream-json 이벤트 포맷 (--verbose 필수):
 *   system       → init 메타 (무시)
 *   assistant    → message.content[0].text (누산 텍스트, diff로 새 부분 추출)
 *   result       → 최종 완성 텍스트
 */
function invokeClaudeAgentStream(
  bin: string,
  model: string | undefined,
  opts: AgentCallOpts,
  signal: AbortSignal,
  onToken: (token: string) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(Object.assign(new Error("AbortError"), { name: "AbortError" }));
      return;
    }

    const args = [
      "--print",
      "--output-format", "stream-json",
      "--verbose",
      "--system-prompt", opts.systemPrompt,
    ];
    if (opts.tools.length > 0) {
      args.push("--allowedTools", opts.tools.join(","));
    }
    if (model?.trim()) {
      args.push("--model", model.trim());
    }

    const child = spawn(bin, args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, NO_COLOR: "1" },
    });

    if (child.stdin) {
      child.stdin.on("error", () => {});
      child.stdin.end(opts.userPrompt, "utf-8");
    }

    let accumulated = "";
    let prevAssistantLen = 0;
    let settled = false;

    const settle = (fn: () => void) => {
      if (!settled) { settled = true; fn(); }
    };

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      settle(() => reject(Object.assign(
        new Error(`에이전트 타임아웃 (${opts.timeoutMs / 1000}초 초과)`),
        { name: "TimeoutError" },
      )));
    }, opts.timeoutMs);

    const onAbort = () => {
      child.kill("SIGTERM");
      settle(() => reject(Object.assign(new Error("AbortError"), { name: "AbortError" })));
    };
    signal.addEventListener("abort", onAbort, { once: true });

    const cleanup = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
    };

    const rl = readline.createInterface({ input: child.stdout!, crlfDelay: Infinity });

    rl.on("line", (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      let event: Record<string, unknown>;
      try { event = JSON.parse(trimmed) as Record<string, unknown>; }
      catch { return; }

      // ENOENT — CLI 실행 자체가 불가한 경우 system 이벤트에서 감지
      if (event.type === "system" && (event as Record<string,unknown>).subtype === "error") {
        cleanup();
        settle(() => reject(new Error("claude CLI를 찾을 수 없어요. 설치 후 재시도해 주세요.")));
        return;
      }

      // Format A: content_block_delta (델타 기반 스트리밍)
      const delta = event.delta as Record<string, unknown> | undefined;
      if (event.type === "content_block_delta" && delta?.type === "text_delta") {
        const token = String(delta.text ?? "");
        if (token) { accumulated += token; onToken(token); }
        return;
      }

      // Format B: assistant message (누산 텍스트 diff)
      if (event.type === "assistant") {
        const msg = event.message as Record<string, unknown> | undefined;
        const content = Array.isArray(msg?.content) ? msg!.content as Record<string,unknown>[] : [];
        const tb = content.find(b => b?.type === "text");
        if (tb && typeof tb.text === "string" && tb.text.length > prevAssistantLen) {
          const newPart = tb.text.slice(prevAssistantLen);
          prevAssistantLen = tb.text.length;
          accumulated = tb.text;
          onToken(newPart);
        }
        return;
      }

      // 최종 result 이벤트
      if (event.type === "result") {
        if (event.subtype === "success") {
          const finalText = typeof event.result === "string" ? event.result : accumulated;
          cleanup();
          settle(() => resolve(finalText));
        } else if (event.is_error) {
          const errMsg = typeof event.result === "string" ? event.result : "Claude CLI 오류";
          cleanup();
          settle(() => reject(new Error(errMsg)));
        }
      }
    });

    child.on("close", (code) => {
      cleanup();
      if (settled) return;
      // result 이벤트 없이 종료된 경우 — 누산 텍스트로 폴백
      if (accumulated) settle(() => resolve(accumulated));
      else settle(() => reject(new Error(`Claude CLI 비정상 종료 (code=${code})`)));
    });

    child.on("error", (err) => {
      cleanup();
      const e = err as NodeJS.ErrnoException;
      if (e.code === "ENOENT") {
        settle(() => reject(Object.assign(err, { message: "claude CLI를 찾을 수 없어요. 설치 후 재시도해 주세요." })));
      } else {
        settle(() => reject(err));
      }
    });
  });
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

// ─── 에이전트별 프롬프트 ──────────────────────────────────────────────────────

type AgentPrompts = {
  system: string;
  user: (state: AnalysisState) => string;
  tools: string[];
  timeoutMs: number;
};

interface AnalysisState {
  ticker: string;
  signalSummary: string;
  marketReport: string;
  newsReport: string;
  fundamentalsReport: string;
  socialReport: string;
  bullArgument: string;
  bearArgument: string;
  researchPlan: string;
  riskAssessment: string;
}

const LANG_INSTRUCTION = "\n\n모든 응답은 반드시 한국어로 작성하세요.";

// ─── 에이전트별 타임아웃 (execFile SIGTERM 기준) ──────────────────────────────
// CLI 기동·인증 오버헤드(~10s) + API 응답(~60-240s) + 출력 포맷(~5s) 고려
// Opus 4.x 기준 상세 리포트 생성에 최대 4분 소요 가능 → 5분으로 여유 확보
const T = {
  NO_TOOL:   300_000,  // 도구 없음 — 5분
  WEB_TOOL:  360_000,  // WebSearch/WebFetch — 6분
  PM:        180_000,  // Portfolio Manager (JSON만) — 3분
  DEBATE_R2: 300_000,  // 토론 2라운드 (R1 맥락 ~14K 추가) — 5분
};

const AGENT_PROMPTS: Record<AgentKey, AgentPrompts> = {
  // ── 1. 기술 분석가 ──────────────────────────────────────────────────────────
  // TradingAgents 원본: indicator selection + detailed nuanced report + markdown table
  market: {
    system: `당신은 한국 주식 시장을 분석하는 트레이딩 보조 시스템입니다.
주어진 기술적 시그널 데이터(규칙 엔진 자동 계산 결과)를 바탕으로 현재 시장 상황에 가장 적합한 기술 지표를 선별하고 상세한 분석 리포트를 작성하세요.

분석 시 다음 지표 카테고리를 고려하고, 중복 없이 보완적인 통찰을 제공하는 최대 8개의 지표를 선택하세요:
- 이동평균선 계열 (단순·지수·가중 이평선, 골든/데드 크로스)
- MACD 계열 (MACD, 시그널선, 히스토그램, MACD 크로스)
- 모멘텀 지표 (RSI, 스토캐스틱, CCI, 윌리엄스 %R)
- 변동성 지표 (볼린저밴드, ATR, 표준편차)
- 거래량 기반 지표 (OBV, 거래량 이평, VWAP)

분석 내용:
- 선택한 지표들이 현재 시장 상황에 적합한 이유 설명
- 현재 추세 방향·강도·지속성 평가
- 지지/저항 레벨과 가격 목표 설정
- 장기 추세 레짐이 단기 매매에 미치는 함의
- 구체적·실행 가능한 트레이딩 인사이트 (진입/청산 관점)

리포트 마지막에는 핵심 포인트를 정리한 마크다운 표를 반드시 포함하세요.

핵심 지표 최대 8개만 선별하고, 마크다운 표 1개를 포함해 총 2,500자 이내로 작성하세요.${LANG_INSTRUCTION}`,
    user: (s) => `다음 기술적 시그널 데이터를 분석해 상세한 기술 분석 리포트를 작성하세요:\n\n${s.signalSummary}`,
    tools: [],
    timeoutMs: T.NO_TOOL,
  },

  // ── 2. 뉴스 분석가 ──────────────────────────────────────────────────────────
  // TradingAgents 원본: comprehensive news + macro + markdown table
  news: {
    system: `당신은 트레이딩과 거시경제에 관련된 최근 뉴스와 동향을 분석하는 리서처입니다.
과거 1주일간의 최신 뉴스와 시장 동향을 조사해 트레이더의 의사결정에 도움이 되는 포괄적인 리포트를 작성하세요.

WebSearch 도구로 다음을 검색하고, WebFetch로 주요 기사 본문을 확인하세요:
1. 해당 종목 관련 최신 뉴스 (실적 발표, 공시, CEO 발언, 신제품/계약 등)
2. 업종·경쟁사 동향
3. 거시경제 환경 (금리, 환율, 글로벌 지수, 수급 동향)
4. 국내 정책·규제 변화

분석 내용:
- 종목 특화 뉴스: 주요 헤드라인·공시 요약, 주가에 미치는 영향 평가
- 업종 환경: 섹터 전반의 이슈와 경쟁 구도 변화
- 매크로 환경: 글로벌·국내 거시 요인이 해당 종목에 미치는 영향
- 시장 심리: 기관/외국인/개인 수급 흐름, 주목할 이벤트

리포트 마지막에는 핵심 뉴스를 날짜·헤드라인·영향도로 정리한 마크다운 표를 반드시 포함하세요.

주요 뉴스 최대 5개만 선별하고, 마크다운 표 1개를 포함해 총 3,000자 이내로 작성하세요.${LANG_INSTRUCTION}`,
    user: (s) => `종목 코드 ${s.ticker}에 대한 최신 뉴스·공시·업종 동향·거시경제 환경을 웹 검색으로 조사하고 포괄적인 리포트를 작성하세요.`,
    tools: ["WebSearch", "WebFetch"],
    timeoutMs: T.WEB_TOOL,
  },

  // ── 3. 기본 분석가 ──────────────────────────────────────────────────────────
  // TradingAgents 원본: balance sheet + cashflow + income + fundamentals + markdown table
  fundamentals: {
    system: `당신은 기업의 펀더멘털을 분석하는 리서처입니다.
주어진 종목에 대해 재무제표, 기업 개요, 핵심 재무 지표, 재무 히스토리를 종합적으로 조사하고 트레이더에게 유용한 리포트를 작성하세요.

WebSearch 도구로 다음을 검색하고, WebFetch로 세부 데이터를 확인하세요:
1. 기업 프로파일 (사업 개요, 주요 제품/서비스, 경쟁 우위)
2. 최근 손익계산서 (매출, 영업이익, 순이익 — 최근 4분기 또는 연간)
3. 재무상태표 (자산, 부채, 자본 구조)
4. 현금흐름표 (영업/투자/재무 현금흐름)
5. 밸류에이션 지표 (PER, PBR, PEG, EV/EBITDA, ROE, ROA, 배당수익률)
6. 컨센서스 추정 및 목표주가

분석 내용:
- 재무 건전성 평가 (부채비율, 유동성, 현금흐름)
- 수익성 추세 (매출성장률, 마진 변화)
- 밸류에이션 수준 (업종 대비, 히스토리 대비)
- 성장 동력과 리스크 요인
- 내재가치 대비 현 주가 수준 판단

리포트 마지막에는 핵심 재무 지표를 정리한 마크다운 표를 반드시 포함하세요.

핵심 재무지표와 마크다운 표 1개를 포함해 총 3,000자 이내로 작성하세요.${LANG_INSTRUCTION}`,
    user: (s) => `종목 코드 ${s.ticker}의 재무제표, 펀더멘털, 밸류에이션을 웹 검색으로 상세히 조사하고 포괄적인 기본 분석 리포트를 작성하세요.`,
    tools: ["WebSearch", "WebFetch"],
    timeoutMs: T.WEB_TOOL,
  },

  // ── 4. SNS 분석가 ───────────────────────────────────────────────────────────
  // TradingAgents 원본: Social Media Analyst — Reddit, Twitter/X, community sentiment
  social: {
    system: `당신은 SNS·온라인 커뮤니티의 투자 심리를 분석하는 리서처입니다.
Reddit, 네이버 종목 토론, 주요 투자 커뮤니티(클리앙, 에펨코리아, 주식갤러리 등) 및 X(트위터) 공개 게시물을 검색해 해당 종목에 대한 개인 투자자 심리와 시장 감성을 분석하고 리포트를 작성하세요.

WebSearch 도구로 다음을 검색하세요:
1. Reddit r/korea, r/stocks, r/investing 등에서 해당 종목 관련 게시물·댓글
2. 네이버 종목토론실 또는 다음 카페 등 국내 커뮤니티 최근 여론
3. X(트위터) 공개 포스트에서 종목 코드 또는 기업명 언급
4. 개인 투자자 심리 지표 (공매도 비율, 신용잔고, 외국인/기관 수급 등)

분석 내용:
- 감성 요약: 개인 투자자 전반적 심리 (강세/중립/약세 비율 추정)
- 주요 논점: 커뮤니티에서 반복되는 긍정·부정 테마
- 과열/공포 신호: 과도한 낙관 또는 공포가 감지되는지 여부
- 수급 심리: 개인·기관·외국인 수급 흐름에서 읽히는 심리

리포트 마지막에는 감성 지표를 정리한 마크다운 표를 반드시 포함하세요.

핵심 신호 최대 5개와 마크다운 표 1개를 포함해 총 2,500자 이내로 작성하세요.${LANG_INSTRUCTION}`,
    user: (s) => `종목 코드 ${s.ticker}에 대한 SNS·온라인 커뮤니티 투자 심리를 웹 검색으로 조사하고 감성 분석 리포트를 작성하세요.`,
    tools: ["WebSearch", "WebFetch"],
    timeoutMs: T.WEB_TOOL,
  },

  // ── 5. 강세 연구원 ──────────────────────────────────────────────────────────
  // TradingAgents 원본: advocate + engage/debate + counter bear arguments
  bull: {
    system: `당신은 ${"{target}"}에 투자할 것을 적극 주장하는 강세 연구원(Bull Analyst)입니다.
제공된 리서치 자료를 바탕으로 성장 잠재력, 경쟁 우위, 긍정적 시장 신호를 강조하며 강력한 매수 논거를 구축하세요.

집중해야 할 핵심 포인트:
- 성장 잠재력: 시장 기회, 매출 성장 전망, 사업 확장성
- 경쟁 우위: 고유한 제품/기술, 강력한 브랜드, 시장 지배력
- 긍정적 신호: 재무 건전성, 업종 성장 추세, 최근 긍정적 뉴스·공시
- 약세 측 반박: 약세 논거의 약점을 구체적 데이터로 반박하고, 왜 강세 관점이 더 타당한지 논리적으로 설명

단순히 사실을 나열하지 말고, 대화형 토론 방식으로 약세 측의 우려에 직접 응답하며 강세 포지션의 강점을 역동적으로 제시하세요.

핵심 논거 3개와 구체적 데이터를 포함해 총 2,000자 이내로 작성하세요.${LANG_INSTRUCTION}`,
    user: (s) => `아래 분석 자료를 바탕으로 ${s.ticker}에 대한 강세(매수) 논거를 작성하세요. 각 분석의 긍정적 측면을 부각하고, 예상되는 약세 반론을 선제적으로 반박하세요.

[기술 분석]
${s.marketReport}

[뉴스·공시]
${s.newsReport}

[펀더멘털]
${s.fundamentalsReport}

[SNS·커뮤니티 심리]
${s.socialReport}`,
    tools: [],
    timeoutMs: T.NO_TOOL,
  },

  // ── 6. 약세 연구원 ──────────────────────────────────────────────────────────
  // TradingAgents 원본: advocate against + engage/debate + counter bull arguments
  bear: {
    system: `당신은 ${"{target}"}에 투자하는 것을 반대하는 약세 연구원(Bear Analyst)입니다.
제공된 리서치 자료와 강세 논거를 검토한 뒤, 리스크, 도전 요인, 부정적 신호를 강조하며 강력한 매도/회피 논거를 구축하세요.

집중해야 할 핵심 포인트:
- 리스크와 도전: 시장 포화, 재무 불안정, 매크로 위협 등 주가 하락 요인
- 경쟁 취약점: 약한 시장 포지셔닝, 기술 혁신 부재, 경쟁사 위협
- 부정적 신호: 재무 데이터·시장 추세·최근 악재 뉴스로 뒷받침되는 하락 근거
- 강세 측 반박: 강세 논거의 과도하게 낙관적인 가정을 구체적 데이터로 지적하고 논리적으로 반박

단순히 사실을 나열하지 말고, 대화형 토론 방식으로 강세 측의 각 주장에 직접 응답하며 약세 포지션의 타당성을 역동적으로 제시하세요.

핵심 반박 논거 3개와 구체적 데이터를 포함해 총 2,000자 이내로 작성하세요.${LANG_INSTRUCTION}`,
    user: (s) => `아래 분석 자료와 강세 연구원의 논거를 검토한 뒤, ${s.ticker}에 대한 약세(매도/회피) 논거를 작성하세요. 강세 측의 각 주장을 항목별로 직접 반박하고, 그들이 간과하거나 과대평가한 부분을 지적하세요.

[기술 분석]
${s.marketReport}

[뉴스·공시]
${s.newsReport}

[펀더멘털]
${s.fundamentalsReport}

[SNS·커뮤니티 심리]
${s.socialReport}

[강세 측 논거 — 직접 반박 대상]
${s.bullArgument}`,
    tools: [],
    timeoutMs: T.NO_TOOL,
  },

  // ── 6. 리서치 매니저 ────────────────────────────────────────────────────────
  // TradingAgents 원본: debate facilitator + clear rating scale + commit to stance
  research_manager: {
    system: `당신은 리서치 매니저이자 토론 퍼실리테이터입니다. 이번 토론 라운드를 비판적으로 평가하고, 트레이더를 위한 명확하고 실행 가능한 투자 계획을 제시하세요.

평가 척도 (반드시 아래 다섯 단계 중 하나를 선택하세요):
- **매수(Buy)**: 강세 논거에 강한 확신 → 포지션 진입 또는 확대 권고
- **비중확대(Overweight)**: 건설적 관점 → 점진적 익스포저 확대 권고
- **보유(Hold)**: 균형적 관점 → 현 포지션 유지 권고
- **비중축소(Underweight)**: 신중한 관점 → 익스포저 축소 권고
- **매도(Sell)**: 약세 논거에 강한 확신 → 포지션 청산 또는 회피 권고

양측 논거 중 더 강력한 근거가 있을 때는 명확한 입장을 취하세요. 양측 증거가 진정으로 균형 잡혀 있는 경우에만 보유(Hold)를 선택하세요.

투자 계획에는 다음을 포함하세요:
- 이번 토론의 핵심 논점과 승패 분석
- 투자 등급 결정 근거 (구체적 데이터 인용)
- 실행 전략: 진입/청산 조건, 목표가 범위, 손절 기준
- 모니터링 포인트: 투자 논거를 무효화할 이벤트나 지표
마크다운 형식으로 작성하세요. 투자 계획 핵심만 담아 총 2,000자 이내로 작성하세요.${LANG_INSTRUCTION}`,
    user: (s) => `${s.ticker}에 대한 강세/약세 연구원의 토론을 평가하고, 명확한 투자 등급과 실행 가능한 투자 계획을 수립하세요.

[강세 연구원 논거]
${s.bullArgument}

[약세 연구원 논거]
${s.bearArgument}`,
    tools: [],
    timeoutMs: T.NO_TOOL,
  },

  // ── 7. 리스크 매니저 ────────────────────────────────────────────────────────
  // TradingAgents 원본: 3-perspective (aggressive/conservative/neutral) combined into 1
  risk: {
    system: `당신은 종합적 리스크 매니저입니다. 투자 계획을 세 가지 관점에서 평가하고 균형 잡힌 리스크 평가를 제공하세요.

**공격적 관점(Aggressive)**: 고수익·고위험 기회를 적극 옹호하세요. 성장 잠재력과 혁신적 이점에 집중하며, 지나치게 보수적인 가정이 핵심 기회를 놓칠 수 있음을 지적하세요.

**보수적 관점(Conservative)**: 자산 보호와 안정성을 최우선으로 하세요. 잠재적 손실, 경기 침체, 시장 변동성을 면밀히 검토하고, 투자 계획이 과도한 리스크에 노출되는 부분을 지적하세요.

**중립적 관점(Neutral)**: 두 관점의 균형을 제시하세요. 성장 잠재력과 리스크를 모두 고려하고, 분산투자 전략을 포함한 지속 가능한 접근법을 권고하세요.

리스크 평가에 포함할 내용:
- 주요 리스크 요인 (시장·종목·유동성·이벤트 리스크)
- 시나리오 분석 (최악/기본/최선 시나리오)
- 포지션 사이징 및 분할 매수 전략
- 리스크 완화 방안 (헤지, 손절 기준, 스톱로스 레벨)
- 리스크 대비 기대 수익률(Risk/Reward Ratio)
마크다운 형식으로 작성하세요. 3관점 각 500자씩, 리스크 요약 표 1개를 포함해 총 3,000자 이내로 작성하세요.${LANG_INSTRUCTION}`,
    user: (s) => `${s.ticker}에 대한 다음 투자 계획을 공격적·보수적·중립적 세 가지 리스크 관점에서 종합 평가하세요.

[투자 계획]
${s.researchPlan}

[기술적 시그널 요약]
${s.signalSummary}`,
    tools: [],
    timeoutMs: T.NO_TOOL,
  },

  // ── 8. 포트폴리오 매니저 ────────────────────────────────────────────────────
  // TradingAgents 원본: trader/final decision + JSON schema
  portfolio_manager: {
    system: `당신은 트레이더와 리스크 팀의 분석을 승인·조정하는 포트폴리오 매니저입니다.
모든 분석(기술·뉴스·펀더멘털·토론·투자 계획·리스크 평가)을 종합해 **즉시 실행 가능한 매매 결정**을 내리세요.

반드시 아래 JSON 스키마에 정확히 일치하는 단일 JSON 객체로만 응답하세요.
마크다운 코드펜스(\`\`\`)·추가 설명 텍스트·주석을 절대 포함하지 마세요.

{
  "verdict": "BUY" | "OVERWEIGHT" | "HOLD" | "UNDERWEIGHT" | "SELL",
  "reasoning": "모든 분석을 종합한 최종 결정 근거 (2~4문장, 밸류에이션·기술적 신호·리스크/보상 핵심 포함)",
  "entry_strategy": "진입 전략 — 언제·어떻게 매수/관망할지 구체적 조건 (1~2문장). SELL이면 보유 시 청산 조건.",
  "target_pct": 목표 수익률 또는 재진입 구간(숫자). BUY/OVERWEIGHT/HOLD = 상방 목표(양수, 예: 15). UNDERWEIGHT = 재진입 고려 구간(음수 필수, 예: -12 = 현재가 대비 -12% 하락 시 재진입). SELL = null,
  "stop_loss_pct": 손절선(음수 숫자, 예: -5 = -5%). 모든 verdict에 필수,
  "risk_reward_ratio": 손익비(숫자, 예: 3.0 = 3:1). BUY/OVERWEIGHT/HOLD에만 설정. UNDERWEIGHT/SELL = null,
  "short_term_outlook": "1~2주 단기 전망 (기술적 신호·수급·이벤트 중심 1~2문장)",
  "mid_term_outlook": "1~3개월 중기 전망 (실적·밸류에이션·섹터 흐름 중심 1~2문장)",
  "key_strengths": ["투자 근거가 되는 핵심 강점 2~3개"],
  "key_risks": ["반드시 모니터링해야 할 핵심 리스크 2~3개"],
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "time_horizon": "단기" | "중기" | "장기"
}

verdict 기준:
- BUY: 강한 매수 신호 — 즉각적 포지션 진입 (target_pct = 상방 목표, 양수 필수)
- OVERWEIGHT: 비중 확대 — 점진적·분할 매수 (target_pct = 상방 목표, 양수 필수)
- HOLD: 보유 유지 — 현 포지션 관망 (target_pct = 상방 목표, 양수)
- UNDERWEIGHT: 비중 축소 — 신규 진입 자제 (target_pct = 재진입 고려 구간, 음수 필수. 예: 현재 과매수 상태라 -12% 하락 후 재진입)
- SELL: 매도·회피 — 즉각적 청산 (target_pct = null)

stop_loss_pct 설정 기준:
- BUY/OVERWEIGHT: 기술적 지지선 또는 -5%~-8% 수준
- HOLD: -5%~-10% 수준
- UNDERWEIGHT/SELL: 보유 시 손절 기준 (없으면 -3%~-5%)

반드시 구체적인 숫자를 포함하세요. "추후 결정" 또는 모호한 표현 금지.`,
    user: (s) => `${s.ticker}에 대한 모든 분석을 종합해 최종 투자 결정을 JSON으로 출력하세요.

[기술 분석]
${s.marketReport}

[뉴스·공시]
${s.newsReport}

[펀더멘털]
${s.fundamentalsReport}

[투자 계획 (리서치 매니저)]
${s.researchPlan}

[리스크 평가]
${s.riskAssessment}`,
    tools: [],
    timeoutMs: T.PM,
  },
};

// ─── 2라운드 토론 프롬프트 빌더 ────────────────────────────────────────────────

function buildBullR2Prompt(state: AnalysisState): string {
  const prevBull = state.bullArgument.slice(0, 1500);
  const prevBear = state.bearArgument.slice(0, 1500);
  return `약세 연구원의 반론이 나왔습니다. 이에 맞서 강세 입장을 강화하세요.
이전 발화는 핵심 논점 파악에만 사용하고, 전문을 그대로 재인용하지 마세요.

[당신의 1라운드 강세 논거 — 핵심만]
${prevBull}

[약세 연구원의 반론 — 핵심만]
${prevBear}

약세 측의 각 핵심 주장을 항목별로 직접 반박하고, 새로운 데이터나 논거를 추가해 강세 포지션이 여전히 타당함을 더 강력하게 주장하세요. 단순 반복이 아닌 심화된 분석으로 응답하세요.`;
}

// latestBullText: bull R2에서 방금 생성된 텍스트만 수신 (R1 누적 포함 금지)
function buildBearR2Prompt(state: AnalysisState, latestBullText: string): string {
  const prevBear = state.bearArgument.slice(0, 1500);
  const bullR2 = latestBullText.slice(0, 1500);
  return `강세 연구원의 재반론이 나왔습니다. 최종 입장으로 마무리하세요.
이전 발화는 핵심 논점 파악에만 사용하고, 전문을 그대로 재인용하지 마세요.

[당신의 1라운드 약세 논거 — 핵심만]
${prevBear}

[강세 연구원의 재반론 (2라운드) — 핵심만]
${bullR2}

강세 측의 재반론을 항목별로 반박하고, 약세 포지션의 핵심 위험 요인이 여전히 상존함을 설득력 있게 강조하며 최종 입장을 제시하세요.`;
}

// ─── 멀티라운드 토론 실행 ──────────────────────────────────────────────────────

async function runDebateLoop(
  state: AnalysisState,
  send: (e: AIAnalysisEvent) => void,
  combinedSignal: AbortSignal,
  bin: string,
  model: string | undefined,
): Promise<"done" | "aborted" | "error"> {
  for (let round = 1; round <= DEBATE_ROUNDS; round++) {
    if (combinedSignal.aborted) return "aborted";
    console.log(`[ai-analysis] ── 토론 ${round}라운드 시작 ──`);

    // ── Bull turn ─────────────────────────────────────────────────────────────
    console.log(`[ai-analysis] ▶ bull R${round} 시작`);
    send({ type: "progress", agent: "bull", status: "running" });
    const bullPrompt = round === 1
      ? AGENT_PROMPTS.bull.user(state)
      : buildBullR2Prompt(state);

    let bullText: string;
    const bullT0 = Date.now();
    try {
      bullText = await invokeClaudeAgentStream(bin, model, {
        systemPrompt: AGENT_PROMPTS.bull.system,
        userPrompt: bullPrompt,
        tools: [],
        timeoutMs: round === 1 ? T.NO_TOOL : T.DEBATE_R2,
      }, combinedSignal, (token) => {
        send({ type: "debate_stream", speaker: "bull", chunk: token, round });
      });
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return "aborted";
      console.error(`[ai-analysis] ✗ bull R${round}`, err);
      send({ type: "progress", agent: "bull", status: "error" });
      return "error";
    }

    state.bullArgument = state.bullArgument
      ? `${state.bullArgument}\n\n---\n\n${bullText}`
      : bullText;
    send({ type: "debate", speaker: "bull", content: bullText, round });
    console.log(`[ai-analysis] ✓ bull R${round} len=${bullText.length} elapsed=${((Date.now()-bullT0)/1000).toFixed(1)}s`);
    if (round === DEBATE_ROUNDS) send({ type: "progress", agent: "bull", status: "done" });

    if (combinedSignal.aborted) return "aborted";

    // ── Bear turn ─────────────────────────────────────────────────────────────
    console.log(`[ai-analysis] ▶ bear R${round} 시작`);
    send({ type: "progress", agent: "bear", status: "running" });
    // R2는 bull의 최신 라운드 텍스트만 전달 (누적값 사용 금지)
    const bearPrompt = round === 1
      ? AGENT_PROMPTS.bear.user(state)
      : buildBearR2Prompt(state, bullText);

    let bearText: string;
    const bearT0 = Date.now();
    try {
      bearText = await invokeClaudeAgentStream(bin, model, {
        systemPrompt: AGENT_PROMPTS.bear.system,
        userPrompt: bearPrompt,
        tools: [],
        timeoutMs: round === 1 ? T.NO_TOOL : T.DEBATE_R2,
      }, combinedSignal, (token) => {
        send({ type: "debate_stream", speaker: "bear", chunk: token, round });
      });
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return "aborted";
      console.error(`[ai-analysis] ✗ bear R${round}`, err);
      send({ type: "progress", agent: "bear", status: "error" });
      return "error";
    }

    state.bearArgument = state.bearArgument
      ? `${state.bearArgument}\n\n---\n\n${bearText}`
      : bearText;
    send({ type: "debate", speaker: "bear", content: bearText, round });
    console.log(`[ai-analysis] ✓ bear R${round} len=${bearText.length} elapsed=${((Date.now()-bearT0)/1000).toFixed(1)}s`);
    if (round === DEBATE_ROUNDS) send({ type: "progress", agent: "bear", status: "done" });
  }

  return "done";
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<Response> {
  if (isVercelEnv()) {
    return NextResponse.json(
      { error: "AI 멀티에이전트 분석은 로컬 환경(next dev)에서만 사용할 수 있어요." },
      { status: 503 },
    );
  }

  // Body: { ticker, startFrom?, state? }
  const body = await req.json().catch(() => null) as {
    ticker?: unknown;
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

  const bin = process.env.CLAUDE_CLI_PATH ?? "claude";
  const model = process.env.CLAUDE_CLI_MODEL;

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
        // 이전 실행 결과로 초기화 (startFrom 이전 에이전트들은 재실행 안 함)
        marketReport:        preState.marketReport        ?? "",
        newsReport:          preState.newsReport          ?? "",
        fundamentalsReport:  preState.fundamentalsReport  ?? "",
        socialReport:        preState.socialReport        ?? "",
        bullArgument:        preState.bullArgument        ?? "",
        bearArgument:        preState.bearArgument        ?? "",
        researchPlan:        preState.researchPlan        ?? "",
        riskAssessment:      preState.riskAssessment      ?? "",
      };

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

        // 2. 에이전트 실행 — 3-phase ──────────────────────────────────────────
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
            text = await invokeClaudeAgentStream(bin, model, {
              systemPrompt: prompts.system,
              userPrompt: prompts.user(state),
              tools: prompts.tools,
              timeoutMs: prompts.timeoutMs,
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
              const VERDICTS = new Set(["BUY", "OVERWEIGHT", "HOLD", "UNDERWEIGHT", "SELL"]);
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
                  entry_strategy: typeof d.entry_strategy === "string" ? d.entry_strategy : "",
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
          } else {
            send({ type: "report", agent: agentKey, content: text });
          }

          // state 업데이트
          switch (agentKey) {
            case "market":           state.marketReport = text; break;
            case "news":             state.newsReport = text; break;
            case "fundamentals":     state.fundamentalsReport = text; break;
            case "social":           state.socialReport = text; break;
            case "research_manager": state.researchPlan = text; break;
            case "risk":             state.riskAssessment = text; break;
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
          const result = await runDebateLoop(state, send, combinedSignal, bin, model);
          if (result === "aborted") {
            console.log("[ai-analysis] 토론 중단 (abort)");
          }
        }

        // ── Phase C: 매니저 체인 (순차) ─────────────────────────────────────
        {
          const MANAGER: AgentKey[] = ["research_manager", "risk", "portfolio_manager"];
          for (const agentKey of MANAGER) {
            if (AGENT_ORDER.indexOf(agentKey) < startIndex) continue;
            if (combinedSignal.aborted) break;
            const result = await runOneAgent(agentKey);
            if (result === "aborted") break;
          }
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

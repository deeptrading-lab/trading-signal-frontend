/**
 * AI 멀티에이전트 분석 — 에이전트별 프롬프트 + 디베이트 실행 유틸.
 *
 * 서버 전용 (route handler에서만 import).
 * - `AGENT_PROMPTS`: 12개 에이전트의 system/user 프롬프트 정의
 * - `runDebateLoop`: bull ↔ bear DEBATE_ROUNDS 라운드 실행
 */

import { invokeAgentCliStream } from "@/lib/server/ai/agentCli";
import type {
  AgentKey,
  AIAnalysisEvent,
  AIAnalysisProvider,
} from "@/lib/types/stock/aiAnalysis";
import { DEBATE_ROUNDS } from "@/lib/types/stock/aiAnalysis";

// ─── 서버 전용 파이프라인 상태 ────────────────────────────────────────────────

export interface AnalysisState {
  ticker: string;
  signalSummary: string;
  /** 현재가·성과·52주·수급 등 정량 컨텍스트 — 에이전트 환각 방지용 그라운딩 데이터. */
  priceContext: string;
  marketReport: string;
  newsReport: string;
  fundamentalsReport: string;
  socialReport: string;
  bullArgument: string;
  bearArgument: string;
  researchPlan: string;
  traderProposal: string;
  riskRisky: string;
  riskNeutral: string;
  riskSafe: string;
}

// ─── 에이전트 프롬프트 정의 타입 ─────────────────────────────────────────────

export type AgentPrompts = {
  system: string;
  user: (state: AnalysisState) => string;
  tools: string[];
  timeoutMs: number;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  model?: string;
};

const LANG_INSTRUCTION = "\n\n모든 응답은 반드시 한국어로 작성하세요.";

// ─── 에이전트별 타임아웃 ─────────────────────────────────────────────────────

const T = {
  NO_TOOL:   300_000,
  WEB_TOOL:  360_000,
  PM:        300_000,
  TRADER:    360_000,
  DEBATE_R2: 300_000,
};

// ─── 에이전트별 프롬프트 ──────────────────────────────────────────────────────

export const AGENT_PROMPTS: Record<AgentKey, AgentPrompts> = {
  // ── 1. 기술 분석가 ──────────────────────────────────────────────────────────
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
    user: (s) => `다음 기술적 시그널 데이터와 시장 스냅샷을 분석해 상세한 기술 분석 리포트를 작성하세요:\n\n[기술적 시그널]\n${s.signalSummary}\n\n[시장 스냅샷 — 현재가·성과·수급]\n${s.priceContext}`,
    tools: [],
    timeoutMs: T.NO_TOOL,
  },

  // ── 2. 뉴스 분석가 ──────────────────────────────────────────────────────────
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
    user: (s) => `종목 코드 ${s.ticker}에 대한 최신 뉴스·공시·업종 동향·거시경제 환경을 웹 검색으로 조사하고 포괄적인 리포트를 작성하세요.\n\n[참고 — 현재 시장 스냅샷]\n${s.priceContext}`,
    tools: ["WebSearch", "WebFetch"],
    timeoutMs: T.WEB_TOOL,
  },

  // ── 3. 기본 분석가 ──────────────────────────────────────────────────────────
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
    user: (s) => `종목 코드 ${s.ticker}의 재무제표, 펀더멘털, 밸류에이션을 웹 검색으로 상세히 조사하고 포괄적인 기본 분석 리포트를 작성하세요.\n\n[참고 — 현재 시장 스냅샷]\n${s.priceContext}`,
    tools: ["WebSearch", "WebFetch"],
    timeoutMs: T.WEB_TOOL,
  },

  // ── 4. SNS 분석가 ───────────────────────────────────────────────────────────
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
    user: (s) => `종목 코드 ${s.ticker}에 대한 SNS·온라인 커뮤니티 투자 심리를 웹 검색으로 조사하고 감성 분석 리포트를 작성하세요.\n\n[참고 — 주체별 수급·가격 스냅샷 (정량 데이터, 웹 검색 없이 바로 활용 가능)]\n${s.priceContext}`,
    tools: ["WebSearch", "WebFetch"],
    timeoutMs: T.WEB_TOOL,
  },

  // ── 5. 강세 연구원 ──────────────────────────────────────────────────────────
  bull: {
    system: `당신은 \${"{target}"}에 투자할 것을 적극 주장하는 강세 연구원(Bull Analyst)입니다.
제공된 리서치 자료를 바탕으로 성장 잠재력, 경쟁 우위, 긍정적 시장 신호를 강조하며 강력한 매수 논거를 구축하세요.

집중해야 할 핵심 포인트:
- 성장 잠재력: 시장 기회, 매출 성장 전망, 사업 확장성
- 경쟁 우위: 고유한 제품/기술, 강력한 브랜드, 시장 지배력
- 긍정적 신호: 재무 건전성, 업종 성장 추세, 최근 긍정적 뉴스·공시
- 약세 측 반박: 약세 논거의 약점을 구체적 데이터로 반박하고, 왜 강세 관점이 더 타당한지 논리적으로 설명

단순히 사실을 나열하지 말고, 대화형 토론 방식으로 약세 측의 우려에 직접 응답하며 강세 포지션의 강점을 역동적으로 제시하세요.

핵심 논거 3개와 구체적 데이터를 포함해 총 2,000자 이내로 작성하세요.${LANG_INSTRUCTION}`,
    user: (s) => `아래 분석 자료를 바탕으로 ${s.ticker}에 대한 강세(매수) 논거를 작성하세요. 각 분석의 긍정적 측면을 부각하고, 예상되는 약세 반론을 선제적으로 반박하세요.

[시장 스냅샷 — 현재가·성과·수급]
${s.priceContext}

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
  bear: {
    system: `당신은 \${"{target}"}에 투자하는 것을 반대하는 약세 연구원(Bear Analyst)입니다.
제공된 리서치 자료와 강세 논거를 검토한 뒤, 리스크, 도전 요인, 부정적 신호를 강조하며 강력한 매도/회피 논거를 구축하세요.

집중해야 할 핵심 포인트:
- 리스크와 도전: 시장 포화, 재무 불안정, 매크로 위협 등 주가 하락 요인
- 경쟁 취약점: 약한 시장 포지셔닝, 기술 혁신 부재, 경쟁사 위협
- 부정적 신호: 재무 데이터·시장 추세·최근 악재 뉴스로 뒷받침되는 하락 근거
- 강세 측 반박: 강세 논거의 과도하게 낙관적인 가정을 구체적 데이터로 지적하고 논리적으로 반박

단순히 사실을 나열하지 말고, 대화형 토론 방식으로 강세 측의 각 주장에 직접 응답하며 약세 포지션의 타당성을 역동적으로 제시하세요.

핵심 반박 논거 3개와 구체적 데이터를 포함해 총 2,000자 이내로 작성하세요.${LANG_INSTRUCTION}`,
    user: (s) => `아래 분석 자료와 강세 연구원의 논거를 검토한 뒤, ${s.ticker}에 대한 약세(매도/회피) 논거를 작성하세요. 강세 측의 각 주장을 항목별로 직접 반박하고, 그들이 간과하거나 과대평가한 부분을 지적하세요.

[시장 스냅샷 — 현재가·성과·수급]
${s.priceContext}

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

  // ── 7. 리서치 매니저 ────────────────────────────────────────────────────────
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

[시장 스냅샷 — 현재가·성과·수급]
${s.priceContext}

[강세 연구원 논거]
${s.bullArgument}

[약세 연구원 논거]
${s.bearArgument}`,
    tools: [],
    timeoutMs: T.NO_TOOL,
  },

  // ── 8. 트레이더 ─────────────────────────────────────────────────────────────
  trader: {
    system: `당신은 트레이딩 전문가입니다. 리서치 팀의 토론과 투자 계획을 바탕으로 구체적이고 즉시 실행 가능한 매매 제안서(Transaction Proposal)를 작성하세요.

제안서에 반드시 포함할 내용:
- **매매 방향**: BUY / HOLD / SELL 중 하나
- **진입 전략**: 즉시 진입 또는 조건부 진입 (구체적 가격대·조건 명시)
- **포지션 규모**: 포트폴리오 대비 권고 비중 (예: 5~10%)
- **진입 시점**: 당장 진입 vs 조정 대기 (트리거 조건 명시)
- **목표 수익률 범위**: 단기(1~2주), 중기(1~3개월) 각각
- **손절 조건**: 기술적 지지선 또는 % 기준
- **핵심 전제 조건**: 이 제안이 유효하기 위해 유지되어야 할 조건 2~3가지

강세/약세 논거를 모두 검토했음을 반영해 균형 잡힌 제안을 만들되, 결론에서는 명확한 방향을 제시하세요. 모호한 표현("경우에 따라", "상황 봐서" 등) 금지.
총 1,500자 이내로 작성하세요.${LANG_INSTRUCTION}`,
    user: (s: AnalysisState) => `${s.ticker}에 대한 다음 분석 결과를 바탕으로 구체적인 매매 제안서를 작성하세요.

[시장 스냅샷 — 현재가·성과·수급]
${s.priceContext}

[투자 계획 (리서치 매니저 결론)]
${s.researchPlan}

[강세 연구원 최종 논거]
${s.bullArgument.slice(0, 1500)}

[약세 연구원 최종 논거]
${s.bearArgument.slice(0, 1500)}

[기술 분석 요약]
${s.marketReport.slice(0, 800)}`,
    tools: [],
    timeoutMs: T.TRADER,
    effort: "high" as const,
    model: process.env.TRADER_MODEL,
  },

  // ── 9a. 공격적 리스크 애널리스트 ────────────────────────────────────────────
  risk_risky: {
    system: `당신은 공격적 관점의 리스크 애널리스트입니다. 트레이더의 매매 제안을 고수익·고위험 투자 관점에서 평가하세요.
성장 잠재력과 혁신적 이점에 집중하고, 보수적 분석이 핵심 기회를 놓칠 수 있음을 강조하세요.
리스크-보상 비율이 유리하다면 대담한 포지션을 지지하세요.
주요 리스크 요인, 시나리오 분석(최선/기본/최악), 포지션 사이징 권고를 포함하세요.
1,000자 이내로 작성하세요.${LANG_INSTRUCTION}`,
    user: (s: AnalysisState) => `${s.ticker}에 대한 트레이더 제안을 공격적 관점에서 평가하세요.

[시장 스냅샷]
${s.priceContext}

[트레이더 제안]
${s.traderProposal}

[투자 계획 (리서치 매니저)]
${s.researchPlan.slice(0, 800)}

[기술적 시그널]
${s.signalSummary.slice(0, 500)}`,
    tools: [],
    timeoutMs: T.NO_TOOL,
  },

  // ── 9b. 중립적 리스크 애널리스트 ────────────────────────────────────────────
  risk_neutral: {
    system: `당신은 중립적 관점의 리스크 애널리스트입니다. 트레이더의 매매 제안을 성장 잠재력과 위험 요인 모두를 고려해 균형 잡힌 관점으로 평가하세요.
분산투자와 단계적 접근법을 고려하고, 공격적·보수적 관점 각각의 맹점을 지적하세요.
주요 리스크 요인, 시나리오 분석(최선/기본/최악), 포지션 사이징 권고를 포함하세요.
1,000자 이내로 작성하세요.${LANG_INSTRUCTION}`,
    user: (s: AnalysisState) => `${s.ticker}에 대한 트레이더 제안을 중립적 관점에서 평가하세요.

[시장 스냅샷]
${s.priceContext}

[트레이더 제안]
${s.traderProposal}

[투자 계획 (리서치 매니저)]
${s.researchPlan.slice(0, 800)}

[기술적 시그널]
${s.signalSummary.slice(0, 500)}`,
    tools: [],
    timeoutMs: T.NO_TOOL,
  },

  // ── 9c. 보수적 리스크 애널리스트 ────────────────────────────────────────────
  risk_safe: {
    system: `당신은 보수적 관점의 리스크 애널리스트입니다. 트레이더의 매매 제안을 자산 보호·안정성 최우선 관점에서 평가하세요.
잠재적 손실, 경기 침체, 시장 변동성을 면밀히 검토하고, 포지션이 과도한 리스크에 노출되는 부분을 지적하세요.
주요 리스크 요인, 시나리오 분석(최선/기본/최악), 손실 한도와 헤지 전략을 포함하세요.
1,000자 이내로 작성하세요.${LANG_INSTRUCTION}`,
    user: (s: AnalysisState) => `${s.ticker}에 대한 트레이더 제안을 보수적 관점에서 평가하세요.

[시장 스냅샷]
${s.priceContext}

[트레이더 제안]
${s.traderProposal}

[투자 계획 (리서치 매니저)]
${s.researchPlan.slice(0, 800)}

[기술적 시그널]
${s.signalSummary.slice(0, 500)}`,
    tools: [],
    timeoutMs: T.NO_TOOL,
  },

  // ── 10. 포트폴리오 매니저 ───────────────────────────────────────────────────
  portfolio_manager: {
    system: `당신은 트레이더의 매매 제안을 최종 승인·조정하는 포트폴리오 매니저입니다.
트레이더 제안서, 리스크 팀 3개의 평가(공격적·중립적·보수적), 모든 리서치 결과를 종합해 **즉시 실행 가능한 최종 매매 결정**을 내리세요.

**편향 방지 원칙**: 낙관적 신호와 비관적 신호에 동등한 가중치를 부여하세요. 데이터가 명확한 방향을 제시하면 BUY 또는 SELL을 포함한 확실한 결론을 내리세요. 불확실성을 과대평가하거나 HOLD를 기본값으로 사용하지 마세요. 강세 연구원의 논거가 더 구체적이고 설득력 있다면 BUY/OVERWEIGHT를, 약세 논거가 더 강하다면 SELL/UNDERWEIGHT를 선택하세요.

텍스트 필드(reasoning·entry_strategy·short_term_outlook·mid_term_outlook)에서 매수/매도 판단·목표 수익률·손절 조건·진입 가격 등 핵심 정보는 **굵게** 표기하세요(예: \`**BUY 판단**\`, \`**목표 +15%**\`, \`**손절 -5%**\`).

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

verdict 선택 기준 (리서치 매니저·트레이더 의견을 참고하되 독립적으로 판단하세요):
- BUY: 기술적·펀더멘털·심리 지표 중 2개 이상에서 강한 매수 신호. 즉각적 포지션 진입 (target_pct 양수 필수)
- OVERWEIGHT: 전반적으로 긍정적이나 일부 리스크 존재. 점진적 분할 매수 (target_pct 양수 필수)
- HOLD: 강세/약세 신호가 진정으로 균형 상태이거나, 단기 불확실성이 있어 방향 전환을 기다려야 할 때만 선택
- UNDERWEIGHT: 리스크가 명백히 우세하나 구조적 가치는 존재. 현재 진입 자제, 조정 후 재진입 고려 (target_pct 음수 필수)
- SELL: 복수의 지표에서 명확한 하락 신호, 펀더멘털 훼손 또는 기술적 붕괴. 즉각 청산 (target_pct null)

stop_loss_pct 설정 기준:
- BUY/OVERWEIGHT: 기술적 지지선 또는 -5%~-8% 수준
- HOLD: -5%~-10% 수준
- UNDERWEIGHT/SELL: 보유 시 손절 기준 (없으면 -3%~-5%)

반드시 구체적인 숫자를 포함하세요. "추후 결정" 또는 모호한 표현 금지.`,
    user: (s: AnalysisState) => `${s.ticker}에 대한 모든 분석을 종합해 최종 투자 결정을 JSON으로 출력하세요.

[시장 스냅샷 — 현재가·성과·수급 (목표가·손절가 산정 시 기준)]
${s.priceContext}

[기술 분석]
${s.marketReport}

[뉴스·공시]
${s.newsReport}

[펀더멘털]
${s.fundamentalsReport}

[SNS·커뮤니티 심리]
${s.socialReport}

[강세 연구원 최종 논거]
${s.bullArgument.slice(0, 2000)}

[약세 연구원 최종 논거]
${s.bearArgument.slice(0, 2000)}

[투자 계획 (리서치 매니저)]
${s.researchPlan}

[트레이더 제안서]
${s.traderProposal}

[공격적 리스크 평가]
${s.riskRisky}

[중립적 리스크 평가]
${s.riskNeutral}

[보수적 리스크 평가]
${s.riskSafe}`,
    tools: [],
    timeoutMs: T.PM,
    effort: "high" as const,
    model: process.env.PM_MODEL,
  },
};

// ─── 2라운드 토론 프롬프트 빌더 ──────────────────────────────────────────────

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

// ─── 멀티라운드 토론 실행 ────────────────────────────────────────────────────

export async function runDebateLoop(
  state: AnalysisState,
  send: (e: AIAnalysisEvent) => void,
  combinedSignal: AbortSignal,
  provider: AIAnalysisProvider,
): Promise<"done" | "aborted" | "error"> {
  for (let round = 1; round <= DEBATE_ROUNDS; round++) {
    if (combinedSignal.aborted) return "aborted";
    console.log(`[ai-analysis] ── 토론 ${round}라운드 시작 ──`);

    // ── Bull turn ───────────────────────────────────────────────────────────
    console.log(`[ai-analysis] ▶ bull R${round} 시작`);
    send({ type: "progress", agent: "bull", status: "running" });
    const bullPrompt = round === 1
      ? AGENT_PROMPTS.bull.user(state)
      : buildBullR2Prompt(state);

    let bullText: string;
    const bullT0 = Date.now();
    try {
      bullText = await invokeAgentCliStream(provider, {
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
    console.log(`[ai-analysis] ✓ bull R${round} len=${bullText.length} elapsed=${((Date.now() - bullT0) / 1000).toFixed(1)}s`);
    if (round === DEBATE_ROUNDS) send({ type: "progress", agent: "bull", status: "done" });

    if (combinedSignal.aborted) return "aborted";

    // ── Bear turn ───────────────────────────────────────────────────────────
    console.log(`[ai-analysis] ▶ bear R${round} 시작`);
    send({ type: "progress", agent: "bear", status: "running" });
    const bearPrompt = round === 1
      ? AGENT_PROMPTS.bear.user(state)
      : buildBearR2Prompt(state, bullText);

    let bearText: string;
    const bearT0 = Date.now();
    try {
      bearText = await invokeAgentCliStream(provider, {
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
    console.log(`[ai-analysis] ✓ bear R${round} len=${bearText.length} elapsed=${((Date.now() - bearT0) / 1000).toFixed(1)}s`);
    if (round === DEBATE_ROUNDS) send({ type: "progress", agent: "bear", status: "done" });
  }

  return "done";
}
